import { StackContext, Api, use, Config } from 'sst/constructs';
import SecretsStack from './Secrets';

export function MyStack({ stack, app }: StackContext) {
  const Secrets = use(SecretsStack);
  const api = new Api(stack, 'api', {
    routes: {
      'POST /sign-up': 'packages/functions/src/functions/sign-up/function.handler',
      'POST /log-in': 'packages/functions/src/functions/log-in/function.handler',
      'POST /refresh': 'packages/functions/src/functions/refresh/function.handler',
      'POST /token': 'packages/functions/src/functions/validate-token/function.handler',
      'GET /me': 'packages/functions/src/functions/user-info/function.handler',
    },
    customDomain: !app.local
      ? {
          domainName: `api${app.stage !== 'prod' ? `.${app.stage}` : ''}.whiskey.mattwyskiel.com`,
          hostedZone: 'mattwyskiel.com',
          path: 'auth',
        }
      : undefined,
  });
  api.bind([
    Secrets.DB_HOST,
    Secrets.DB_NAME,
    Secrets.DB_USERNAME,
    Secrets.DB_PASSWORD,
    Secrets.JWT_SECRET,
  ]);

  const JWT_ISSUER = new Config.Parameter(stack, 'JWT_ISSUER', {
    value: 'whiskey-user-service.mattwyskiel.com',
  });
  api.bind([JWT_ISSUER]);

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
