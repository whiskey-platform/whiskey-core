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

A salt and verifier will be generated, and stored.

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
import { APIGatewayJSONBodyEventHandler, json } from '../../lib/lambda-utils';
import { deriveVerifier, generateSalt } from 'secure-remote-password/client';
import requestMonitoring from '../../lib/middleware/request-monitoring';
import { promisify } from 'util';
import { pbkdf2 } from 'crypto';
import clientVerify from 'lib/middleware/client-verify';

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

const signUp: APIGatewayJSONBodyEventHandler<
  typeof inputSchema.properties.body
> = async (event) => {
  // insert user demographic info into table
  await db
    .insertInto('users')
    .values({
      username: event.body.username,
      last_name: event.body.lastName,
      first_name: event.body.firstName,
    })
    .execute();

  const userId = (
    await db
      .selectFrom('users')
      .select('id')
      .where('username', '=', event.body.username)
      .execute()
  )[0].id;
  const roles = (
    await db
      .selectFrom('roles')
      .select('id')
      .where('name', 'in', event.body.roles)
      .execute()
  ).map((r) => r.id);

  for (const role of roles) {
    await db
      .insertInto('users_roles_associations')
      .values({ role_id: role, user_id: userId })
      .execute();
  }

  const salt = generateSalt();
  const deriveKey = promisify(pbkdf2);
  const derivedPrivateKey = (
    await deriveKey(event.body.password, salt, 1, 64, 'sha512')
  ).toString();

  await db
    .insertInto('auth_info')
    .values({
      user_id: userId,
      salt,
      verifier: deriveVerifier(derivedPrivateKey),
    })
    .execute();

  return json({
    success: true,
  });
};

export const handler = middy(signUp)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(requestMonitoring<typeof inputSchema.properties.body>())
  .use(clientVerify());
