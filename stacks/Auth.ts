import { StackContext } from '@serverless-stack/resources';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

export function AuthStack({ stack }: StackContext) {
  const userPool = new UserPool(stack, 'AuthUserPool', {
    signInAliases: {
      username: true,
      preferredUsername: true,
      phone: true,
      email: true,
    },
  });
  const hostedZone = HostedZone.fromLookup(stack, 'HostedZone', { domainName: 'mattwyskiel.com' });
  const upDomain = userPool.addDomain('UserPoolDomain', {
    customDomain:
      stack.environment === 'prod'
        ? {
            domainName: 'auth.whiskey.mattwyskiel.com',
            certificate: new DnsValidatedCertificate(stack, 'AuthDomainCertificate', {
              domainName: 'auth.whiskey.mattwyskiel.com',
              hostedZone,
              region: 'us-east-1',
            }),
          }
        : undefined,
    cognitoDomain:
      stack.environment !== 'prod'
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
