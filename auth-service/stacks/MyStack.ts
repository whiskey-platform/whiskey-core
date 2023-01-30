import { StackContext, Api, use } from 'sst/constructs';
import SecretsStack from './Secrets';

export function MyStack({ stack }: StackContext) {
  const Secrets = use(SecretsStack);
  const api = new Api(stack, 'api', {
    routes: {
      'POST /sign-up': 'packages/functions/src/functions/sign-up/function.handler',
      'POST /challenge': 'packages/functions/src/functions/challenge/function.handler',
      'POST /authenticate': 'packages/functions/src/functions/authenticate/function.handler',
      'POST /refresh': 'packages/functions/src/functions/refresh/function.handler',
      'POST /token': 'packages/functions/src/functions/validate-token/function.handler',
      'GET /me': 'packages/functions/src/functions/user-info/function.handler',
    },
  });
  api.bind([Secrets.DB_HOST, Secrets.DB_NAME, Secrets.DB_USERNAME, Secrets.DB_PASSWORD]);
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
