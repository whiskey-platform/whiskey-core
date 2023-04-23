import { StackContext, Api } from 'sst/constructs';

export function Infra({ stack }: StackContext) {
  const api = new Api(stack, 'api', {
    routes: {
      'GET /': 'packages/functions/src/lambda.handler',
    },
  });
  stack.addOutputs({
    domainName: api.cdk.domainName?.name,
    regionalDomainName: api.cdk.domainName?.regionalDomainName,
    regionalHostedZoneId: api.cdk.domainName?.regionalHostedZoneId,
    certificateArn: api.cdk.certificate?.certificateArn,
  });
}
