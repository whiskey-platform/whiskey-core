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

import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { APIGatewayJSONBodyEventHandler, json } from '../../lib/lambda-utils';
import requestMonitoring from '../../middleware/request-monitoring';
import clientVerify from '../../middleware/client-verify';
import { db } from '@auth-service/core/db/db.connection';
import { transpileSchema } from '@middy/validator/transpile';
import { sign, verify } from 'jsonwebtoken';
import { Config } from 'sst/node/config';
import { pbkdf2, pbkdf2Sync } from 'crypto';
import { promisify } from 'util';
import { v4 } from 'uuid';

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
    .selectFrom('users')
    .select(['id', 'username'])
    .where('username', '=', event.body.username)
    .execute();

  if (userIdResponse[0] === undefined) {
    return { statusCode: 401 };
  }

  const auth_info = await db
    .selectFrom('auth_info')
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
    .insertInto('sessions')
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

export const handler = middy(authChallenge)
  .use(jsonBodyParser())
  .use(validator({ eventSchema: transpileSchema(inputSchema) }))
  .use(requestMonitoring<typeof inputSchema.properties.body>())
  .use(clientVerify<typeof inputSchema.properties.body>());