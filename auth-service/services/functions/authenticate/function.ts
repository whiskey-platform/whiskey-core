/*
`POST /authenticate`

```json
{
  "username": "mattwyskiel", // to retrieve secret from db
  "proof": "92561B95..."
}
```

Headers:
'x-troupe-client-id': 'bgurwioawfna...'
'x-troupe-client-secret': 'bgurwioawfna...'

The server, with this input, then also derives a strong session key, and verifies that the client
also has the same key using the proof. The server also generates a JWT, that the client will then
retain or reject, if it can verify that the the server also generated the same key with _its_ proof

```json
{
  "proof": "92561B95...",
  "token": "1gtihfqlwfgthy..."
}
```
*/

import Container from 'typedi';
import { v4 } from 'uuid';
import { APIGatewayJSONBodyEventHandler, json } from '../../libs/lambda-utils';
import { DynamoDBService } from '../../libs/services/DynamoDB.service';
import { deriveSession } from 'secure-remote-password/server';
import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import requestMonitoring, { IError } from '../../libs/middleware/request-monitoring';
import { sign } from 'jsonwebtoken';
import { Logger } from '../../libs/logger';
import { retrieveJWTSecret, retrieveRefreshSecret } from '../../libs/middleware/jwt-verify';
import clientVerify from '../../libs/middleware/client-verify';
import { User } from '../../libs/models/User';

export const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        proof: { type: 'string' },
      },
      required: ['username', 'proof'],
    },
  },
} as const;

const authenticate: APIGatewayJSONBodyEventHandler<
  typeof inputSchema.properties.body
> = async event => {
  const dynamoDB = Container.get(DynamoDBService);

  try {
    const user = await dynamoDB.getUser(event.body.username);

    if (
      user === undefined ||
      user.signIn?.ephemeral === undefined ||
      user.signIn?.clientEph === undefined
    ) {
      Logger.error('User information not found', {
        username: event.body.username,
        foundInfo: user,
      });
      throw {
        status: 400,
        message: 'User information not found.',
      };
    }

    const { salt, verifier, signIn } = user;

    const serverSession = deriveSession(
      signIn.ephemeral!,
      signIn.clientEph!,
      salt,
      event.body.username,
      verifier,
      event.body.proof
    );

    const token = sign({ username: user.username }, event.headers['x-ssm-jwt-secret']!, {
      issuer: 'troupe-user-service.mattwyskiel.com',
      subject: user.id,
      expiresIn: '1h',
    });

    const refresh = sign({ username: user.username }, event.headers['x-ssm-refresh-secret']!, {
      issuer: 'troupe-user-service.mattwyskiel.com',
      subject: user.id,
      expiresIn: '90d',
    });

    const overwritten: Record<string, any> = { ...user, signIn: undefined };
    overwritten.clients[event.headers['x-troupe-client-id']!] = refresh;

    // overrite user, remove sign-in temporary properties
    await dynamoDB.overwriteUser(overwritten as unknown as User);

    return json({
      proof: serverSession.proof,
      token,
      refresh,
    });
  } catch (error) {
    if (error as IError) {
      const err = error as IError;
      Logger.error(err.message, err.details ? { details: err.details } : undefined);
    } else {
      const err = error as Error;
      Logger.error(err.message, { stack: err.stack });
    }
    return json({
      proof: v4(),
      token: v4(),
      refresh: v4(),
    });
  }
};

export const handler = middy(authenticate)
  .use(retrieveJWTSecret(process.env.JWT_SECRET_PARAMETER ?? ''))
  .use(retrieveRefreshSecret(process.env.REFRESH_SECRET_PARAMETER ?? ''))
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(requestMonitoring<typeof inputSchema.properties.body>())
  .use(clientVerify<typeof inputSchema.properties.body>());
