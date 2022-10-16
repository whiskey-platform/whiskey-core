import { StackContext, Api, use } from '@serverless-stack/resources';
import SecretsStack from './Secrets';

export function MyStack({ stack }: StackContext) {
  const Secrets = use(SecretsStack);
  const api = new Api(stack, 'api', {
    routes: {
      'POST /sign-up': 'functions/sign-up/function.handler',
      'POST /challenge': 'functions/challenge/function.handler',
      'POST /authenticate': 'functions/authenticate/function.handler',
      'POST /token': 'functions/validate-token/function.handler',
      'GET /me': 'functions/user-info/function.handler',
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
