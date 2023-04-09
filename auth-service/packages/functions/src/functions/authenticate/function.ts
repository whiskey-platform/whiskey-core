/*
`POST /authenticate`

```json
{
  "username": "mattwyskiel", // to retrieve secret from db
  "proof": "92561B95..."
}
```

Headers:
'x-whiskey-client-id': 'bgurwioawfna...'
'x-whiskey-client-secret': 'bgurwioawfna...'

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

import { v4 } from 'uuid';
import { APIGatewayJSONBodyEventHandler, json } from '../../lib/lambda-utils';
import { deriveSession } from 'secure-remote-password/server';
import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import requestMonitoring, { IError } from '../../middleware/request-monitoring';
import { sign } from 'jsonwebtoken';
import { logger as Logger } from '../../lib/logger';
import clientVerify from '../../middleware/client-verify';
import { db } from '@auth-service/core/db/db.connection';
import { Config } from 'sst/node/config';
import { transpileSchema } from '@middy/validator/transpile';

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
  try {
    const userIdResponse = await db
      .selectFrom('users')
      .select(['id', 'username'])
      .where('username', '=', event.body.username)
      .execute();

    if (userIdResponse[0] === undefined) {
      throw {
        status: 400,
        message: 'User information not found.',
      };
    }

    const auth_info = await db
      .selectFrom('auth_info')
      .select(['server_ephemeral', 'client_ephemeral', 'salt', 'verifier'])
      .where('user_id', '=', userIdResponse[0].id)
      .execute();

    if (
      auth_info[0] === undefined ||
      auth_info[0].server_ephemeral === undefined ||
      auth_info[0].client_ephemeral === undefined
    ) {
      Logger.error('User information not found', {
        username: event.body.username,
      });
      throw {
        status: 400,
        message: 'User information not found.',
      };
    }

    const { salt, verifier, server_ephemeral, client_ephemeral } = auth_info[0];

    const serverSession = deriveSession(
      server_ephemeral!,
      client_ephemeral!,
      salt,
      event.body.username,
      verifier,
      event.body.proof
    );

    const token = sign({ username: userIdResponse[0].username }, Config.JWT_SECRET, {
      issuer: 'whiskey-user-service.mattwyskiel.com',
      subject: `${userIdResponse[0].id}`,
      expiresIn: '1h',
    });

    const refresh = sign({ username: userIdResponse[0].username }, Config.JWT_SECRET, {
      issuer: 'whiskey-user-service.mattwyskiel.com',
      subject: `${userIdResponse[0].id}`,
      expiresIn: '90d',
    });

    await db
      .updateTable('auth_info')
      .set({
        server_ephemeral: null,
        client_ephemeral: null,
      })
      .where('user_id', '=', userIdResponse[0].id)
      .execute();

    await db
      .insertInto('users_clients_associations')
      .values({
        user_id: userIdResponse[0].id,
        client_id: event.headers['x-whiskey-client-id']!,
        refresh_token: refresh,
      })
      .onDuplicateKeyUpdate({ refresh_token: refresh })
      .execute();

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
  .use(jsonBodyParser())
  // .use(validator({ inputSchema }))
  .use(validator({ eventSchema: transpileSchema(inputSchema) }))
  .use(requestMonitoring<typeof inputSchema.properties.body>())
  .use(clientVerify<typeof inputSchema.properties.body>());
