/*
`POST /token`

This request takes no body, and it will either throw a 401 error, or return a success boolean

```json
{
  "success": true
}
```
*/

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import clientVerify from '../../middleware/client-verify';
import { json } from '../../lib/lambda-utils';
import jwtVerify from '../../middleware/jwt-verify';
import { wrapped } from '@auth-service/core';
import responseMonitoring from '../../middleware/response-monitoring';

const validateToken: APIGatewayProxyHandlerV2 = async () => {
  // This should only run if JWT verification is successful.
  return json({
    success: true,
  });
};

export const handler = wrapped(validateToken)
  .use(clientVerify())
  .use(jwtVerify())
  .use(responseMonitoring());
