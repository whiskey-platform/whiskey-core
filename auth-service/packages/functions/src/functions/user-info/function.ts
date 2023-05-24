/*

`POST /me`

No request body.

The authenticated user (as verified in the `Authorization` header) will have their non-sensitive information returned.

*/

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { db, wrapped } from '@auth-service/core';
import clientVerify from '../../middleware/client-verify';
import { json } from '../../lib/lambda-utils';
import jwtVerify from '../../middleware/jwt-verify';
import responseMonitoring from '../../middleware/response-monitoring';

const me: APIGatewayProxyHandlerV2 = async event => {
  const user = (
    await db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', event.headers['x-username']!)
      .execute()
  )[0];

  return json(user);
};

export const handler = wrapped(me).use(clientVerify()).use(jwtVerify()).use(responseMonitoring());
