/*

`POST /me`

No request body.

The authenticated user (as verified in the `Authorization` header) will have their non-sensitive information returned.
No salt nor verifier will be returned

*/

import middy from '@middy/core';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import Container from 'typedi';
import { json } from '../../libs/lambda-utils';
import jwtVerify, { retrieveJWTSecret } from '../../libs/middleware/jwt-verify';
import requestMonitoring from '../../libs/middleware/request-monitoring';
import { DynamoDBService } from '../../libs/services/DynamoDB.service';

const me: APIGatewayProxyHandlerV2 = async event => {
  const dynamoDB = Container.get(DynamoDBService);
  const rawUser = await dynamoDB.getUser(event.headers['x-username']!);

  return json({
    displayName: rawUser!.displayName,
    email: rawUser!.email,
    username: rawUser!.username,
  });
};

export const handler = middy(me)
  .use(requestMonitoring())
  .use(retrieveJWTSecret(process.env.JWT_SECRET_PARAMETER ?? ''))
  .use(jwtVerify());
