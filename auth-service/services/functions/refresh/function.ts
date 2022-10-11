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
import Container from 'typedi';
import { APIGatewayJSONBodyEventHandler, json } from '../../libs/lambda-utils';
import { Logger } from '../../libs/logger';
import jwtVerify, {
  retrieveJWTSecret,
  retrieveRefreshSecret,
} from '../../libs/middleware/jwt-verify';
import requestMonitoring from '../../libs/middleware/request-monitoring';
import { DynamoDBService } from '../../libs/services/DynamoDB.service';

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

const refresh: APIGatewayJSONBodyEventHandler<typeof inputSchema.properties.body> = async event => {
  const username = event.headers['x-user-id']!;
  const dynamoDB = Container.get(DynamoDBService);
  const user = await dynamoDB.getUser(username);
  const clientId = event.headers['x-troupe-client-id']!;
  const clients = user?.clients;
  if (!user) {
    Logger.error(`User ${username} does not exist`);
    throw {
      status: 400,
      message: 'Bad Request',
    };
  }
  if (!clients || !clients[clientId]) {
    Logger.error(`Unregistered client: ${clientId}`);
    throw {
      status: 400,
      message: 'Bad Request',
    };
  }
  if (clients[clientId].includes(event.body.refresh)) {
    user.clients![clientId] = user.clients![clientId].filter(v => v !== event.body.refresh);

    const token = sign({ username: user.username }, event.headers['x-ssm-refresh-secret']!, {
      // had to switch around the headers
      issuer: 'troupe-user-service.mattwyskiel.com',
      subject: user.id,
      expiresIn: '1h',
    });

    const refresh = sign({ username: user.username }, event.headers['x-ssm-jwt-secret']!, {
      // had to switch around the headers
      issuer: 'troupe-user-service.mattwyskiel.com',
      subject: user.id,
      expiresIn: '90d',
    });

    user.clients![clientId].push(refresh);

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
  .use(retrieveJWTSecret(process.env.REFRESH_SECRET_PARAMETER ?? ''))
  .use(retrieveRefreshSecret(process.env.JWT_SECRET_PARAMETER ?? ''))
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(requestMonitoring<typeof inputSchema.properties.body>())
  .use(jwtVerify<typeof inputSchema.properties.body>());
