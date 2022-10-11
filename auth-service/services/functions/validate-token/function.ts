/*
`POST /token`

This request takes no body, and it will either throw a 401 error, or return a success boolean

```json
{
  "success": true
}
```
*/

import middy from '@middy/core';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { json } from '../../libs/lambda-utils';
import jwtVerify, { retrieveJWTSecret } from '../../libs/middleware/jwt-verify';
import requestMonitoring from '../../libs/middleware/request-monitoring';

const validateToken: APIGatewayProxyHandlerV2 = async () => {
  // This should only run if JWT verification is successful.
  return json({
    success: true,
  });
};

export const handler = middy(validateToken)
  .use(requestMonitoring())
  .use(retrieveJWTSecret(process.env.JWT_SECRET_PARAMETER ?? ''))
  .use(jwtVerify());
