/* eslint-disable @typescript-eslint/no-explicit-any */

import middy from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { APIGatewayJSONBodyEvent } from '../lambda-utils';
import { logger } from '../logger';

export interface IError {
  status: number;
  message: string;
  details?: any;
}

type APIGatewayEvent<S> = APIGatewayProxyEventV2 | APIGatewayJSONBodyEvent<S>;

const requestMonitoring = <S>(): middy.MiddlewareObj<
  APIGatewayEvent<S>,
  APIGatewayProxyResultV2
> => {
  const before: middy.MiddlewareFn<
    APIGatewayEvent<S>,
    APIGatewayProxyResultV2
  > = (request) => {
    logger.defaultMeta = { requestId: request.context.awsRequestId };
    if (!process.env.IS_LOCAL)
      logger.debug('Incoming API Gateway Request', { request: request.event });
  };

  const after: middy.MiddlewareFn<
    APIGatewayEvent<S>,
    APIGatewayProxyResultV2
  > = (request) => {
    if (!process.env.IS_LOCAL)
      logger.debug('API Gateway Response', { response: request.response });
  };

  const onError: middy.MiddlewareFn<
    APIGatewayEvent<S>,
    APIGatewayProxyResultV2,
    IError | Error
  > = (request) => {
    if (request.error as IError) {
      const error = request.error as IError;
      logger.error(
        error.message,
        error.details ? { details: error.details } : undefined
      );
      request.response = {
        statusCode: error.status,
        body: JSON.stringify({
          message: error.message,
          details: error.details,
          trackingId: request.context.awsRequestId,
        }),
      };
    } else {
      const error = request.error as Error;
      logger.error(error.message, { stack: error.stack });
    }
  };

  return {
    before,
    after,
    onError,
  };
};

export default requestMonitoring;
