/*

`POST /me`

No request body.

The authenticated user (as verified in the `Authorization` header) will have their non-sensitive information returned.
No salt nor verifier will be returned

*/

import middy from '@middy/core';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { db } from 'lib/db/db.connection';
import clientVerify from 'lib/middleware/client-verify';
import { json } from '../../lib/lambda-utils';
import jwtVerify from '../../lib/middleware/jwt-verify';
import requestMonitoring from '../../lib/middleware/request-monitoring';

const me: APIGatewayProxyHandlerV2 = async (event) => {
  const user = (
    await db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', event.headers['x-username']!)
      .execute()
  )[0];

  return json(user);
};

export const handler = middy(me)
  .use(requestMonitoring())
  .use(clientVerify())
  .use(jwtVerify());
