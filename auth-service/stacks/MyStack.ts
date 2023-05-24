import { StackContext, Api, use, Config } from 'sst/constructs';
import { DomainName } from '@aws-cdk/aws-apigatewayv2-alpha';
import SecretsStack from './Secrets';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';

export function MyStack({ stack, app }: StackContext) {
  const Secrets = use(SecretsStack);
  const powertools = LayerVersion.fromLayerVersionArn(
    stack,
    'PowertoolsLayer',
    `arn:aws:lambda:${stack.region}:094274105915:layer:AWSLambdaPowertoolsTypeScript:11`
  );
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
          path: 'auth',
          cdk: {
            domainName: DomainName.fromDomainNameAttributes(stack, 'ApiDomain', {
              name: StringParameter.valueFromLookup(
                stack,
                `/sst-outputs/${app.stage}-api-infra-Infra/domainName`
              ),
              regionalDomainName: StringParameter.valueFromLookup(
                stack,
                `/sst-outputs/${app.stage}-api-infra-Infra/regionalDomainName`
              ),
              regionalHostedZoneId: StringParameter.valueFromLookup(
                stack,
                `/sst-outputs/${app.stage}-api-infra-Infra/regionalHostedZoneId`
              ),
            }),
          },
        }
      : undefined,
    defaults: {
      function: {
        layers: [powertools],
      },
    },
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
}
