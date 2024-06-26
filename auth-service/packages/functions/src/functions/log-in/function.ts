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
import { db, wrapped } from '@auth-service/core';
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

const authChallenge: APIGatewayJSONBodyEventHandler<
  typeof inputSchema.properties.body
> = async event => {
  const userIdResponse = await db
    .selectFrom('whiskey.users')
    .select(['id', 'username'])
    .where('username', '=', event.body.username)
    .execute();

  if (userIdResponse[0] === undefined) {
    return { statusCode: 401 };
  }

  const auth_info = await db
    .selectFrom('whiskey.auth_info')
    .select(['hash', 'salt'])
    .where('user_id', '=', userIdResponse[0].id)
    .execute();

  if (auth_info[0] === undefined) {
    return { statusCode: 401 };
  }

  const hasher = promisify(pbkdf2);
  var computed = await hasher(event.body.password, auth_info[0].salt, 1000, 64, `sha512`);

  if (!(auth_info[0].hash === computed.toString('hex'))) {
    return { statusCode: 401 };
  }

  const session = v4();

  const token = sign({ username: userIdResponse[0].username, session }, Config.JWT_SECRET, {
    issuer: 'whiskey-user-service.mattwyskiel.com',
    subject: `${userIdResponse[0].id}`,
    expiresIn: '1h',
  });

  const refresh = sign({ username: userIdResponse[0].username, session }, Config.JWT_SECRET, {
    issuer: 'whiskey-user-service.mattwyskiel.com',
    subject: `${userIdResponse[0].id}`,
    expiresIn: '90d',
  });

  await db
    .insertInto('whiskey.sessions')
    .values({
      session_id: session,
      user_id: userIdResponse[0].id,
      client_id: event.headers['x-whiskey-client-id']!,
      refresh_token: refresh,
    })
    .onDuplicateKeyUpdate({ refresh_token: refresh })
    .execute();

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
