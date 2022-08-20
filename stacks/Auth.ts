import { StackContext } from '@serverless-stack/resources';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
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
    customDomain: !process.env.IS_LOCAL
      ? {
          domainName: 'auth.whiskey.mattwyskiel.com',
          certificate: Certificate.fromCertificateArn(
            stack,
            'Certificate',
            'arn:aws:acm:us-east-1:662292074719:certificate/7af85e3e-fe4a-46db-bada-cd4421ff7a6a'
          ),
        }
      : undefined,
    cognitoDomain: process.env.IS_LOCAL
      ? {
          domainPrefix: 'whiskey-apps-auth',
        }
      : undefined,
  });

  stack.addOutputs({
    UserPool: userPool.userPoolId,
    UserPoolDomain: upDomain.domainName,
  });
}
