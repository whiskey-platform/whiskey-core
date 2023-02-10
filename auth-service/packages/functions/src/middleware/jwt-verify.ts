import middy from '@middy/core';
import { Config } from 'sst/node/config';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { JwtPayload, verify, VerifyErrors } from 'jsonwebtoken';
import { APIGatewayJSONBodyEvent } from '../lib/lambda-utils';
import { logger as Logger } from '../lib/logger';
import { IError } from './request-monitoring';
type APIGatewayEvent<S> = APIGatewayProxyEventV2 | APIGatewayJSONBodyEvent<S>;

/** 
Usage:
```
middy(authenticatedFunction)
...
  .use(retrieveJWTSecret(process.env.JWT_SECRET_PARAMETER))
  .use(jwtVerify)
...
```
*/
export const jwtVerify = <S>(): middy.MiddlewareObj<
  APIGatewayEvent<S>,
  APIGatewayProxyResultV2
> => {
  const before: middy.MiddlewareFn<APIGatewayEvent<S>, APIGatewayProxyResultV2> = async request => {
    Logger.info('Verifying JWT token');
    const inputToken = request.event.headers['Authorization']?.split(' ')[1];
    try {
      if (!inputToken) {
        throw { status: 401, message: 'NoTokenError' };
      }
      const payload = verify(inputToken!, Config.JWT_SECRET, {
        issuer: Config.JWT_ISSUER,
      }) as JwtPayload;

      request.event.headers = {
        ...request.event.headers,
        'x-user-id': payload.sub,
        'x-username': payload.username,
      };
    } catch (error) {
      if (error as VerifyErrors) {
        const err = error as VerifyErrors;
        throw {
          status: 401,
          message: err.name,
          details: {
            problem: err.message,
          },
        };
      } else if (error as IError) {
        throw error;
      } else {
        const err = error as Error;
        Logger.error(err.message, { stack: err.stack });

        throw {
          status: 401,
          message: 'UnknownAuthError',
        };
      }
    }
  };

  return { before };
};

export default jwtVerify;
