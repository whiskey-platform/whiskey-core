/*
`POST /challenge`

```json
{
  "username": "mattwyskiel",
  "publicKey": "DA084F5C..."
}
```

Headers:
'x-whiskey-client-id': 'bgurwioawfna...'
'x-whiskey-client-secret': 'bgurwioawfna...'

- We retrieve the `salt` and `verifier` from the DB using the provided username
- We generate an ephemeral value pair using the verifier
- We temporarily store the secret key from the value pair in the database (likely further encrypted)
- We return the public key from that value pair, and the salt, to the client
  - If the user is not found, provide a bogus salt and public key to the client.

```json
{
  "salt": "FB95867E...",
  "publicKey": "DA084F5C..."
}
```
*/

import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { generateEphemeral as clientEphemeral, generateSalt } from 'secure-remote-password/client';
import { generateEphemeral } from 'secure-remote-password/server';
import { APIGatewayJSONBodyEventHandler, json } from '../../lib/lambda-utils';
import requestMonitoring from '../../middleware/request-monitoring';
import clientVerify from '../../middleware/client-verify';
import { db } from '@auth-service/core/db/db.connection';
import { transpileSchema } from '@middy/validator/transpile';

export const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        publicKey: { type: 'string' },
      },
      required: ['username', 'publicKey'],
    },
  },
} as const;

const authChallenge: APIGatewayJSONBodyEventHandler<
  typeof inputSchema.properties.body
> = async event => {
  const userIdResponse = await db
    .selectFrom('users')
    .select('id')
    .where('username', '=', event.body.username)
    .execute();

  if (userIdResponse[0] === undefined) {
    return json({
      salt: generateSalt(),
      publicKey: clientEphemeral().public,
    });
  }

  const auth_info = await db
    .selectFrom('auth_info')
    .select(['salt', 'verifier'])
    .where('user_id', '=', userIdResponse[0].id)
    .execute();

  if (auth_info[0] === undefined) {
    return json({
      salt: generateSalt(),
      publicKey: clientEphemeral().public,
    });
  }

  const { salt, verifier } = auth_info[0];
  const serverEphemeral = generateEphemeral(verifier);

  await db
    .updateTable('auth_info')
    .set({
      server_ephemeral: serverEphemeral.secret,
      client_ephemeral: event.body.publicKey,
    })
    .where('user_id', '=', userIdResponse[0].id)
    .execute();

  return json({
    salt,
    publicKey: serverEphemeral.public,
  });
};

export const handler = middy(authChallenge)
  .use(jsonBodyParser())
  .use(validator({ eventSchema: transpileSchema(inputSchema) }))
  .use(requestMonitoring<typeof inputSchema.properties.body>())
  .use(clientVerify<typeof inputSchema.properties.body>());
