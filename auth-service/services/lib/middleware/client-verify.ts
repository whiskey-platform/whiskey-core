import middy from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Container from 'typedi';
import { APIGatewayJSONBodyEvent } from '../lambda-utils';
import { logger as Logger } from '../logger';
// import { DynamoDBService } from '../services/DynamoDB.service';
import { IError } from './request-monitoring';

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
export const clientVerify = <S>(): middy.MiddlewareObj<
  APIGatewayEvent<S>,
  APIGatewayProxyResultV2
> => {
  const before: middy.MiddlewareFn<
    APIGatewayEvent<S>,
    APIGatewayProxyResultV2
  > = async (request) => {
    Logger.info('Verifying Client credentials');
    const clientId = request.event.headers['x-troupe-client-id'];
    const clientSecret = request.event.headers['x-troupe-client-secret'];
    try {
      if (!clientId || !clientSecret) {
        Logger.error('Missing client credentials');
        throw {
          status: 401,
          message: 'ClientCredentialsError',
        };
      }

      // const dynamoDb = Container.get(DynamoDBService);
      const client: any = {}; // await dynamoDb.getClientInformation(clientId);

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
