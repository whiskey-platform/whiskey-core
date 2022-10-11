/*
`POST /challenge`

```json
{
  "username": "mattwyskiel",
  "publicKey": "DA084F5C..."
}
```

Headers:
'x-troupe-client-id': 'bgurwioawfna...'
'x-troupe-client-secret': 'bgurwioawfna...'

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
import Container from 'typedi';
import { generateEphemeral as clientEphemeral, generateSalt } from 'secure-remote-password/client';
import { generateEphemeral } from 'secure-remote-password/server';
import { APIGatewayJSONBodyEventHandler, json } from '../../libs/lambda-utils';
import requestMonitoring from '../../libs/middleware/request-monitoring';
import { DynamoDBService } from '../../libs/services/DynamoDB.service';
import clientVerify from '../../libs/middleware/client-verify';

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
  const dynamoDB = Container.get(DynamoDBService);
  const user = await dynamoDB.getUser(event.body.username);

  if (user === undefined) {
    return json({
      salt: generateSalt(),
      publicKey: clientEphemeral().public,
    });
  }

  const { salt, verifier } = user;
  const serverEphemeral = generateEphemeral(verifier);

  dynamoDB.overwriteUser({
    ...user,
    signIn: {
      ephemeral: serverEphemeral.secret,
      clientEph: event.body.publicKey,
    },
  });

  return json({
    salt,
    publicKey: serverEphemeral.public,
  });
};

export const handler = middy(authChallenge)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(requestMonitoring<typeof inputSchema.properties.body>())
  .use(clientVerify<typeof inputSchema.properties.body>());
