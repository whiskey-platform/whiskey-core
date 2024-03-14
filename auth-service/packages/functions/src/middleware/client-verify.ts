import middy from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AuthClientModel, connectToDB, logger as Logger } from '@auth-service/core';
import { APIGatewayJSONBodyEvent } from '../lib/lambda-utils';
// import { DynamoDBService } from '../services/DynamoDB.service';
import { IError } from '../lib/IError';

type APIGatewayEvent<S> = APIGatewayProxyEventV2 | APIGatewayJSONBodyEvent<S>;

/** 
Usage:
```
middy(authenticatedFunction)
...
  .use(clientVerify)
...
```
*/

await connectToDB();

export const clientVerify = <S>(): middy.MiddlewareObj<
  APIGatewayEvent<S>,
  APIGatewayProxyResultV2
> => {
  const before: middy.MiddlewareFn<APIGatewayEvent<S>, APIGatewayProxyResultV2> = async request => {
    Logger.info('Verifying Client credentials');
    const clientId = request.event.headers['x-whiskey-client-id'];
    const clientSecret = request.event.headers['x-whiskey-client-secret'];
    try {
      if (!clientId || !clientSecret) {
        Logger.error('Missing client credentials');
        throw {
          status: 401,
          message: 'ClientCredentialsError',
        };
      }

      const client = await AuthClientModel.findOne({ id: clientId });
      if (!client) {
        Logger.error('Invalid client ID');
        throw {
          status: 401,
          message: 'ClientCredentialsError',
        };
      }
      if (clientSecret !== client.secret) {
        Logger.error('Invalid client secret');
        throw {
          status: 401,
          message: 'ClientCredentialsError',
        };
      }
    } catch (error) {
      if (error as IError) {
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

export default clientVerify;
