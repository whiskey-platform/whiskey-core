/*
`POST /sign-up`

This will be a plain username/password signup flow using SRP

```json
{
  "displayName": "Matt Wyskiel",
  "email": "whiskey@mattwyskiel.com",
  "username": "mattwyskiel",
  "salt": "FB95867E...",
  "verifier": "9392093F..."
}
```

This will simply store the information in a DB and return a 'success' boolean:

```json
{
  "success": "true"
}
```
*/

import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { db } from 'lib/db/db.connection';
import Container from 'typedi';
import { APIGatewayJSONBodyEventHandler, json } from '../../lib/lambda-utils';
import requestMonitoring from '../../lib/middleware/request-monitoring';

export const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        username: { type: 'string' },
        salt: { type: 'string' },
        verifier: { type: 'string' },
      },
      required: ['email', 'username', 'salt', 'verifier'],
    },
  },
} as const;

const signUp: APIGatewayJSONBodyEventHandler<
  typeof inputSchema.properties.body
> = async (event) => {
  await db.insertInto('users').values({
    username: event.body.username,
    first_name: event.body.firstName,
    last_name: event.body.lastName,
  });

  return json({
    success: true,
  });
};

export const handler = middy(signUp)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(requestMonitoring<typeof inputSchema.properties.body>());
