/*
`POST /sign-up`

This will be a plain username/password signup flow from an administrative context (Postman, etc.).

```json
{
  "displayName": "Matt Wyskiel",
  "email": "whiskey@mattwyskiel.com",
  "username": "mattwyskiel",
  "password": "FB95867E...",
}
```

A password hash will be generated, and stored.

This will simply store the information in a DB and return a 'success' boolean:

```json
{
  "success": "true"
}
```
*/

import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import { UserModel, connectToDB, wrapped } from '@auth-service/core';
import { APIGatewayJSONBodyEventHandler, json } from '../../lib/lambda-utils';
import clientVerify from '../../middleware/client-verify';
import { pbkdf2, randomBytes } from 'crypto';
import { promisify } from 'util';
import responseMonitoring from '../../middleware/response-monitoring';

export const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        username: { type: 'string' },
        roles: { type: 'array', items: { type: 'string' } },
        password: { type: 'string' },
      },
      required: ['username', 'password', 'firstName', 'lastName', 'roles'],
    },
  },
} as const;

await connectToDB();

const signUp: APIGatewayJSONBodyEventHandler<typeof inputSchema.properties.body> = async event => {
  // insert user demographic info into table
  const salt = randomBytes(16).toString('hex');
  const hasher = promisify(pbkdf2);
  const hash = await hasher(event.body.password, salt, 1000, 64, 'sha512');

  const { _id: id } = await UserModel.create({
    username: event.body.username,
    firstName: event.body.firstName,
    lastName: event.body.lastName,
    roles: event.body.roles,
    authInfo: {
      hash: hash.toString('hex'),
      salt,
    },
  });

  return json({
    success: true,
  });
};

export const handler = wrapped(signUp)
  .use(jsonBodyParser())
  .use(validator({ eventSchema: transpileSchema(inputSchema) }))
  .use(clientVerify())
  .use(responseMonitoring());
