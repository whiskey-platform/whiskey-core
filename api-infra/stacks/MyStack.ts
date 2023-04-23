import { StackContext, Api } from 'sst/constructs';

export function Infra({ stack, app }: StackContext) {
  const api = new Api(stack, 'api', {
    routes: {
      'GET /': 'packages/functions/src/lambda.handler',
    },
    customDomain: !app.local
      ? {
          domainName: `api${
            app.stage !== 'prod' ? `.${app.stage}` : ''
          }.whiskey.mattwyskiel.com`,
          hostedZone: 'mattwyskiel.com',
        }
      : undefined,
  });
  stack.addOutputs({
    domainName: api.cdk.domainName?.name,
    regionalDomainName: api.cdk.domainName?.regionalDomainName,
    regionalHostedZoneId: api.cdk.domainName?.regionalHostedZoneId,
    certificateArn: api.cdk.certificate?.certificateArn,
  });
}
