/*
`POST /challenge`

```json
{
  "username": "mattwyskiel",
  "password": "DA084F5C..."
}
```

Headers:
'x-whiskey-client-id': 'bgurwioawfna...'
'x-whiskey-client-secret': 'bgurwioawfna...'

*/

import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { APIGatewayJSONBodyEventHandler, json } from '../../lib/lambda-utils';
import clientVerify from '../../middleware/client-verify';
import { SessionsModel, UserModel, connectToDB, wrapped } from '@auth-service/core';
import { transpileSchema } from '@middy/validator/transpile';
import { sign } from 'jsonwebtoken';
import { Config } from 'sst/node/config';
import { pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { v4 } from 'uuid';
import responseMonitoring from '../../middleware/response-monitoring';

export const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
      required: ['username', 'password'],
    },
  },
} as const;

await connectToDB();

const authChallenge: APIGatewayJSONBodyEventHandler<
  typeof inputSchema.properties.body
> = async event => {
  const user = await UserModel.findOne({ username: event.body.username });

  if (!user) {
    return { statusCode: 401 };
  }

  const hasher = promisify(pbkdf2);
  var computed = await hasher(event.body.password, user.authInfo.salt, 1000, 64, `sha512`);

  if (!(user.authInfo.hash === computed.toString('hex'))) {
    return { statusCode: 401 };
  }

  const session = v4();

  const token = sign({ username: user.username, session }, Config.JWT_SECRET, {
    issuer: 'whiskey-user-service.mattwyskiel.com',
    subject: `${user.id}`,
    expiresIn: '1h',
  });

  const refresh = sign({ username: user.username, session }, Config.JWT_SECRET, {
    issuer: 'whiskey-user-service.mattwyskiel.com',
    subject: `${user.id}`,
    expiresIn: '90d',
  });

  await SessionsModel.findByIdAndUpdate(
    event.headers['x-session'] ?? session,
    {
      userId: user.id,
      clientId: event.headers['x-whiskey-client-id'],
      refreshToken: refresh,
    },
    { upsert: true }
  );

  await SessionsModel.findByIdAndUpdate();

  return json({
    token,
    refresh,
  });
};

export const handler = wrapped(authChallenge)
  .use(jsonBodyParser())
  .use(validator({ eventSchema: transpileSchema(inputSchema) }))
  .use(clientVerify<typeof inputSchema.properties.body>())
  .use(responseMonitoring());
