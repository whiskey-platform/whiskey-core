import { Config, StackContext } from 'sst/constructs';

export default function SecretsStack({ stack }: StackContext) {
  const DB_NAME = new Config.Secret(stack, 'DB_NAME');
  const DB_USERNAME = new Config.Secret(stack, 'DB_USERNAME');
  const DB_HOST = new Config.Secret(stack, 'DB_HOST');
  const DB_PASSWORD = new Config.Secret(stack, 'DB_PASSWORD');

  return {
    DB_NAME,
    DB_USERNAME,
    DB_HOST,
    DB_PASSWORD,
  };
}
