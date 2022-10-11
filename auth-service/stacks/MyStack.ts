import { StackContext, Api, use } from '@serverless-stack/resources';
import SecretsStack from './Secrets';

export function MyStack({ stack }: StackContext) {
  const Secrets = use(SecretsStack);
  const api = new Api(stack, 'api', {
    routes: {
      'GET /': 'functions/lambda.handler',
    },
    defaults: {
      function: {
        config: [
          Secrets.DB_HOST,
          Secrets.DB_NAME,
          Secrets.DB_USERNAME,
          Secrets.DB_PASSWORD,
        ],
      },
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
