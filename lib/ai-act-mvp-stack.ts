import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class AiActMvpStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Access logs for API Gateway
    const logGroup = new logs.LogGroup(this, 'ApiLogs', {
      removalPolicy: RemovalPolicy.DESTROY
    });

    // REST API with CORS and API key header
    const api = new apigw.RestApi(this, 'AiActApi', {
      restApiName: 'AI Act MVP API',
      description: 'POST /classify and POST /statement protected by API key',
      deployOptions: {
        stageName: 'prod',
        accessLogDestination: new apigw.LogGroupLogDestination(logGroup),
        accessLogFormat: apigw.AccessLogFormat.clf()
      },
      // Ensure API Gateway treats application/pdf as binary so Lambdas can return base64 PDFs
      binaryMediaTypes: ['application/pdf'],
      apiKeySourceType: apigw.ApiKeySourceType.HEADER,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ['OPTIONS', 'POST', 'GET'],
        allowHeaders: ['Content-Type', 'x-api-key', 'Authorization']
      }
    });

    // Lambda: classify (unchanged)
    const classifyFn = new lambda.Function(this, 'ClassifyFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'classify.main',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: Duration.seconds(6)
    });

    const statementFn = new lambdaNode.NodejsFunction(this, 'StatementFn', {
  entry: path.join(__dirname, '..', 'lambda', 'statement.ts'),
      handler: 'main', // exported from statement.ts
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(29),
      memorySize: 512,
  // bundler helper paths
  // point to package-lock.json at repository root (one level up from lib)
  depsLockFilePath: path.join(__dirname, '..', 'package-lock.json'),
  projectRoot: path.join(__dirname, '..'),
      bundling: {
        nodeModules: ['pdf-lib','pdfkit','fontkit','stream-buffers','zod'], // bundle pdf/render libs + zod
        externalModules: [],
        minify: true,
        sourceMap: true,
        forceDockerBundling: false,
      },
    });

    // create a Secrets Manager secret for signing JWTs (used by TokenIssuer + Proxy)
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: '/ai-act-mvp/jwt-secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'secret',
        excludePunctuation: true,
      }
    });

    // TokenIssuer Lambda (not exposed via API) - signs short-lived JWTs
    const tokenIssuerFn = new lambdaNode.NodejsFunction(this, 'TokenIssuerFn', {
      entry: path.join(__dirname, '..', 'lambda', 'token-issuer.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      bundling: {
        nodeModules: ['@aws-sdk/client-secrets-manager','jsonwebtoken'],
        minify: true,
        sourceMap: true,
        forceDockerBundling: false,
      }
      ,
      environment: {
        JWT_SECRET_NAME: jwtSecret.secretName
      }
    });
    // grant TokenIssuer read access to secret
    jwtSecret.grantRead(tokenIssuerFn);

    // Proxy Lambda - validates JWT and invokes StatementFn
  const proxyFn = new lambdaNode.NodejsFunction(this, 'ProxyFn', {
      entry: path.join(__dirname, '..', 'lambda', 'proxy.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(29),
      memorySize: 512,
      bundling: {
        nodeModules: ['@aws-sdk/client-secrets-manager','@aws-sdk/client-lambda','jsonwebtoken'],
        minify: true,
        sourceMap: true,
        forceDockerBundling: false,
      }
      ,
      environment: {
        JWT_SECRET_NAME: jwtSecret.secretName,
        STATEMENT_FUNCTION_NAME: statementFn.functionName
      }
    });
    // grant Proxy read access to secret and permission to invoke StatementFn
    jwtSecret.grantRead(proxyFn);
    statementFn.grantInvoke(proxyFn);

    // Resources
    const classifyRes = api.root.addResource('classify');
    const statementRes = api.root.addResource('statement');

    // Integrations
    const classifyInt = new apigw.LambdaIntegration(classifyFn, { proxy: true });
    const statementInt = new apigw.LambdaIntegration(statementFn, { proxy: true });
  const proxyInt = new apigw.LambdaIntegration(proxyFn, { proxy: true });

    // Methods (require API key)
    const classifyPost = classifyRes.addMethod('POST', classifyInt, {
      apiKeyRequired: true,
      methodResponses: [{ statusCode: '200' }]
    });

    const statementPost = statementRes.addMethod('POST', statementInt, {
      apiKeyRequired: true,
      methodResponses: [{ statusCode: '200' }]
    });

    // add schema GET route (no api key)
    const statementSchemaFn = new lambdaNode.NodejsFunction(this, 'StatementSchemaFn', {
      entry: path.join(__dirname, '..', 'src', 'statement', 'schemaHandler.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(6),
      bundling: {
        nodeModules: ['zod'],
        minify: true,
        sourceMap: true,
        forceDockerBundling: false,
      }
    });
    const schemaInt = new apigw.LambdaIntegration(statementSchemaFn, { proxy: true });
    statementRes.addMethod('GET', schemaInt, { apiKeyRequired: false });

    // add proxy route for frontends to call with short-lived JWTs
    const proxyRes = api.root.addResource('proxy');
    const proxyStatementRes = proxyRes.addResource('statement');
    proxyStatementRes.addMethod('POST', proxyInt, {
      apiKeyRequired: false,
      methodResponses: [{ statusCode: '200' }]
    });

    // Add a simple root GET that returns a tiny HTML help page (no API key)
    const rootGet = api.root.addMethod('GET', new apigw.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'text/html': '<html><head><title>AI Act MVP</title></head><body><h1>AI Act MVP API</h1><p>POST /statement (x-api-key) to generate a PDF. Use /statement?format=pdf for PDF output.</p></body></html>'
        }
      }],
      // provide request templates for common content-types so API Gateway won't return 415
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
        'text/html': '{ "statusCode": 200 }'
      },
      passthroughBehavior: apigw.PassthroughBehavior.NEVER,
    }), {
      methodResponses: [{ statusCode: '200', responseParameters: { 'method.response.header.Content-Type': true }}],
    });

    // API Key + Usage Plan
    const apiKey = new apigw.ApiKey(this, 'ClientApiKey', {
      apiKeyName: 'ai-act-mvp-key'
    });
    const plan = new apigw.UsagePlan(this, 'UsagePlan', {
      name: 'basic-plan',
      throttle: { rateLimit: 10, burstLimit: 5 },
      quota: { limit: 10000, period: apigw.Period.MONTH }
    });
    plan.addApiKey(apiKey);
  plan.addApiStage({ stage: api.deploymentStage });

    new CfnOutput(this, 'ApiBaseUrl', { value: api.url });
    new CfnOutput(this, 'ApiKeyId', { value: apiKey.keyId });
  }
}
