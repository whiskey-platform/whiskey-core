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
      runtime: 'nodejs16.x',
      architecture: 'arm_64',
    });
    app.stack(SecretsStack).stack(MyStack);
  },
} satisfies SSTConfig;
