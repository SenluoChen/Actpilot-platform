import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Logging
    const logGroup = new logs.LogGroup(this, 'ApiLogs', { removalPolicy: RemovalPolicy.DESTROY });

    // Storage
    const bucket = new s3.Bucket(this, 'StatementsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const table = new dynamodb.Table(this, 'StatementsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'byCompany',
      partitionKey: { name: 'company', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    // API
    const api = new apigw.RestApi(this, 'Api', {
      restApiName: 'AI Act Layered API',
      description: 'classify, statement, submit, verify, statements',
      deployOptions: {
        stageName: 'prod',
        accessLogDestination: new apigw.LogGroupLogDestination(logGroup),
        accessLogFormat: apigw.AccessLogFormat.clf()
      },
      apiKeySourceType: apigw.ApiKeySourceType.HEADER,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ['OPTIONS', 'POST', 'GET'],
        allowHeaders: ['Content-Type', 'x-api-key']
      }
    });

    // NodejsFunction handlers (api layer)
    const env = { BUCKET_NAME: bucket.bucketName, TABLE_NAME: table.tableName };

    const classifyFn = new lambdaNode.NodejsFunction(this, 'ClassifyFn', {
      entry: path.join(__dirname, '../../lambda/api/classify.ts'),
      handler: 'main',
      timeout: Duration.seconds(6),
      bundling: { target: 'node20' }
    });

    const statementFn = new lambdaNode.NodejsFunction(this, 'StatementFn', {
      entry: path.join(__dirname, '../../lambda/api/statement.ts'),
      handler: 'main',
      timeout: Duration.seconds(10),
      bundling: { target: 'node20' }
    });

  const submitFn = new lambdaNode.NodejsFunction(this, 'SubmitFn', {
  entry: path.join(__dirname, '../../lambda/api/submit.ts'),
  handler: 'main',
  environment: env,
  memorySize: 512,
  timeout: Duration.seconds(20),
  bundling: {
    target: 'node20',
    nodeModules: ['pdfkit', 'qrcode'], // 把套件連同 data/*.afm 一起帶進 Lambda
    externalModules: ['aws-sdk']       // 用 Lambda 內建 AWS SDK
  }
});

    const verifyFn = new lambdaNode.NodejsFunction(this, 'VerifyFn', {
      entry: path.join(__dirname, '../../lambda/api/verify.ts'),
      handler: 'main',
      environment: env,
      timeout: Duration.seconds(10),
      bundling: { target: 'node20' }
    });

    const listFn = new lambdaNode.NodejsFunction(this, 'ListStatementsFn', {
      entry: path.join(__dirname, '../../lambda/api/statements.ts'),
      handler: 'main',
      environment: env,
      timeout: Duration.seconds(10),
      bundling: { target: 'node20' }
    });

    // Permissions
bucket.grantReadWrite(submitFn);
    bucket.grantRead(verifyFn);
    bucket.grantRead(listFn);

    table.grantWriteData(submitFn);
    table.grantReadData(verifyFn);
    table.grantReadData(listFn);

    // Routes
    const rClassify = api.root.addResource('classify');
    const rStatement = api.root.addResource('statement');
    const rSubmit = api.root.addResource('submit');
    const rVerify = api.root.addResource('verify');
    const rList = api.root.addResource('statements');

    rClassify.addMethod('POST', new apigw.LambdaIntegration(classifyFn), { apiKeyRequired: true });
    rStatement.addMethod('POST', new apigw.LambdaIntegration(statementFn), { apiKeyRequired: true });
    rSubmit.addMethod('POST', new apigw.LambdaIntegration(submitFn), { apiKeyRequired: true });
    rVerify.addMethod('GET', new apigw.LambdaIntegration(verifyFn), { apiKeyRequired: false }); // public
    rList.addMethod('GET', new apigw.LambdaIntegration(listFn), { apiKeyRequired: true });

    // API Key + plan
    const apiKey = new apigw.ApiKey(this, 'ClientApiKey', { apiKeyName: 'ai-act-key' });
    const plan = new apigw.UsagePlan(this, 'UsagePlan', {
      name: 'basic',
      throttle: { rateLimit: 10, burstLimit: 5 },
      quota: { limit: 10000, period: apigw.Period.MONTH }
    });
    plan.addApiStage({ stage: api.deploymentStage });
    plan.addApiKey(apiKey);
   
    new CfnOutput(this, 'ApiBaseUrl', { value: api.url });
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new CfnOutput(this, 'TableName', { value: table.tableName });
    new CfnOutput(this, 'ApiKeyId', { value: apiKey.keyId });
  }
}
