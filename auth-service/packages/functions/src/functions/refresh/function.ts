/*
`POST /refresh

No JSON body - only Authorization header

'Authorization': 'Bearer uhagip4rghtiueorwhp...'

Upon verifying the Refresh token, we generate a new access token and refresh token

```json
{
  "token": "patirwh3etgvnhajuiprng...",
}
```
*/

import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import { Config } from 'sst/node/config';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { sign } from 'jsonwebtoken';
import { db } from '@auth-service/core/db/db.connection';
import clientVerify from '../../middleware/client-verify';
import { json } from '../../lib/lambda-utils';
import { logger as Logger } from '../../lib/logger';
import jwtVerify from '../../middleware/jwt-verify';
import requestMonitoring from '../../middleware/request-monitoring';

const refresh: APIGatewayProxyHandlerV2 = async event => {
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
  const refreshToken = event.headers.authorization?.match('Bearer (.*)')![0]!;
  if (clients[0].refresh_token === refreshToken) {
    const token = sign({ username: username }, Config.JWT_SECRET, {
      issuer: 'whiskey-user-service.mattwyskiel.com',
      subject: `${userIdResponse[0].id}`,
      expiresIn: '1h',
    });

    return json({ token });
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
  .use(requestMonitoring())
  .use(clientVerify())
  .use(jwtVerify());
