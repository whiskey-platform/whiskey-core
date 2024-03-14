/*
`POST /refresh

No JSON body - only Authorization header

'Authorization': 'Bearer uhagip4rghtiueorwhp...'

Upon verifying the Refresh token, we generate a new access token

```json
{
  "token": "patirwh3etgvnhajuiprng...",
}
```
*/

import jsonBodyParser from '@middy/http-json-body-parser';
import { Config } from 'sst/node/config';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { sign } from 'jsonwebtoken';
import { connectToDB, logger as Logger, SessionsModel, wrapped } from '@auth-service/core';
import clientVerify from '../../middleware/client-verify';
import { json } from '../../lib/lambda-utils';
import jwtVerify from '../../middleware/jwt-verify';
import responseMonitoring from '../../middleware/response-monitoring';

await connectToDB();

const refresh: APIGatewayProxyHandlerV2 = async event => {
  const id = event.headers['x-user-id']!;
  const username = event.headers['x-username'];

  const clientId = event.headers['x-whiskey-client-id']!;

  const client = await SessionsModel.findById(event.headers['x-session']!);

  if (!client) {
    Logger.error(`Unregistered client: ${clientId}`);
    throw {
      status: 400,
      message: 'Bad Request',
    };
  }
  const refreshToken = event.headers.authorization?.match('Bearer (.*)')![1]!;
  if (client.refreshToken === refreshToken) {
    const token = sign({ username, session: event.headers['x-session']! }, Config.JWT_SECRET, {
      issuer: 'whiskey-user-service.mattwyskiel.com',
      subject: `${id}`,
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

export const handler = wrapped(refresh)
  .use(jsonBodyParser())
  .use(clientVerify())
  .use(jwtVerify())
  .use(responseMonitoring());
