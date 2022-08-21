import { StackContext } from '@serverless-stack/resources';
import { UserPool } from 'aws-cdk-lib/aws-cognito';

export function AuthStack({ stack }: StackContext) {
  const userPool = new UserPool(stack, 'AuthUserPool', {
    signInAliases: {
      username: true,
      preferredUsername: true,
      phone: true,
      email: true,
    },
  });
  const upDomain = userPool.addDomain('UserPoolDomain', {
    cognitoDomain: {
      domainPrefix: 'whiskey-apps-auth',
    },
  });

  const docsAppClient = userPool.addClient('WhiskeyDocsAppClient', {
    userPoolClientName: 'WhiskeyDocsApp',
  });

  stack.addOutputs({
    UserPool: userPool.userPoolId,
    UserPoolDomain: upDomain.domainName,
    WhiskeyDocsAuthClient: docsAppClient.userPoolClientId,
  });
}
