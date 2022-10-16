/*
`POST /refresh

No JSON body - only Authorization header

'Authorization': 'Bearer uhagip4rghtiueorwhp...'

Upon verifying the Refresh token, we generate a new access token and refresh token

```json
{
  "token": "patirwh3etgvnhajuiprng...",
  "refresh": "hgubirofbaoewfbehfiaweh..."
}
```
*/

import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { sign } from 'jsonwebtoken';
import { db } from 'lib/db/db.connection';
import clientVerify from 'lib/middleware/client-verify';
import { APIGatewayJSONBodyEventHandler, json } from '../../lib/lambda-utils';
import { logger as Logger } from '../../lib/logger';
import jwtVerify from '../../lib/middleware/jwt-verify';
import requestMonitoring from '../../lib/middleware/request-monitoring';

export const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        refresh: { type: 'string' },
      },
      required: ['token', 'refresh'],
    },
  },
} as const;

const refresh: APIGatewayJSONBodyEventHandler<
  typeof inputSchema.properties.body
> = async (event) => {
  const username = event.headers['x-user-id']!;
  const userIdResponse = await db
    .selectFrom('users')
    .select(['id', 'username'])
    .where('username', '=', username)
    .execute();

  if (userIdResponse[0] === undefined) {
    Logger.error(`User ${username} does not exist`);
    throw {
      status: 400,
      message: 'Bad Request',
    };
  }
  const clientId = event.headers['x-whiskey-client-id']!;
  const clients = await db
    .selectFrom('users_clients_associations')
    .select(['client_id', 'refresh_token'])
    .where('user_id', '=', userIdResponse[0].id)
    .where('client_id', '=', clientId)
    .execute();

  if (!clients[0]) {
    Logger.error(`Unregistered client: ${clientId}`);
    throw {
      status: 400,
      message: 'Bad Request',
    };
  }
  if (clients[0].refresh_token === event.body.refresh) {
    const token = sign(
      { username: username },
      event.headers['x-ssm-refresh-secret']!,
      {
        // had to switch around the headers
        issuer: 'whiskey-user-service.mattwyskiel.com',
        subject: `${userIdResponse[0].id}`,
        expiresIn: '1h',
      }
    );

    const refresh = sign(
      { username: username },
      event.headers['x-ssm-jwt-secret']!,
      {
        // had to switch around the headers
        issuer: 'whiskey-user-service.mattwyskiel.com',
        subject: `${userIdResponse[0].id}`,
        expiresIn: '90d',
      }
    );

    await db
      .updateTable('users_clients_associations')
      .set({ refresh_token: refresh })
      .where('user_id', '=', userIdResponse[0].id)
      .where('client_id', '=', clientId)
      .execute();

    return json({ token, refresh });
  } else {
    Logger.error('Refresh token not present for user record');
    throw {
      status: 401,
      message: 'Invalid refresh token',
    };
  }
};

export const handler = middy(refresh)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(requestMonitoring<typeof inputSchema.properties.body>())
  .use(clientVerify())
  .use(jwtVerify<typeof inputSchema.properties.body>());
