import { SSTConfig } from 'sst';
import { MyStack } from './stacks/MyStack';
import SecretsStack from './stacks/Secrets';

export default {
  config(_input) {
    return {
      name: 'auth-service',
      region: 'us-east-1',
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: 'nodejs18.x',
      nodejs: {
        esbuild: {
          external: !app.local ? ['@aws-sdk/*', '@aws-lambda-powertools/*'] : undefined,
        },
      },
      environment: {
        POWERTOOLS_SERVICE_NAME: 'whiskey_auth_service',
      },
    });
    app.stack(SecretsStack).stack(MyStack);
  },
} satisfies SSTConfig;
