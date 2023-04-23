import { SSTConfig } from 'sst';
import { Infra } from './stacks/MyStack';

export default {
  config(_input) {
    return {
      name: 'api-infra',
      region: 'us-east-1',
    };
  },
  stacks(app) {
    app.stack(Infra);
  },
} satisfies SSTConfig;
