import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class BackendStack extends Stack {
  public readonly api: apigw.RestApi;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

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

    // Auth (Cognito)
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('UserPoolClient', {
      authFlows: {
        userPassword: true,
      },
      preventUserExistenceErrors: true,
    });

    const userAuthorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'UserAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // Per-user storage
    const userRecordsTable = new dynamodb.Table(this, 'UserRecordsTable', {
      partitionKey: { name: 'userSub', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'recordId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
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
          allowHeaders: ['Content-Type', 'Authorization', 'x-api-key']
      }
    });

    this.api = api;
    this.userPool = userPool;
    this.userPoolClient = userPoolClient;

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
    
    const parserFn = new lambdaNode.NodejsFunction(this, 'ParserFn', {
      entry: path.join(__dirname, '../../lambda/api/parser.ts'),
      handler: 'main',
      environment: {
        ...(process.env.LLM_ENDPOINT ? { LLM_ENDPOINT: process.env.LLM_ENDPOINT } : {}),
        ...(process.env.LLM_API_KEY ? { LLM_API_KEY: process.env.LLM_API_KEY } : {}),
        ...(process.env.LLM_MODEL ? { LLM_MODEL: process.env.LLM_MODEL } : {}),
        ...(process.env.OPENAI_API_KEY ? { OPENAI_API_KEY: process.env.OPENAI_API_KEY } : {}),
        ...(process.env.OPENAI_MODEL ? { OPENAI_MODEL: process.env.OPENAI_MODEL } : {}),
        ...(process.env.ENABLE_LLM_EXTRACTION ? { ENABLE_LLM_EXTRACTION: process.env.ENABLE_LLM_EXTRACTION } : {}),
        ...(process.env.REQUIRE_LLM ? { REQUIRE_LLM: process.env.REQUIRE_LLM } : {}),
      },
      memorySize: 512,
      timeout: Duration.seconds(30),
      bundling: { target: 'node20' }
    });

    const annexComposeFn = new lambdaNode.NodejsFunction(this, 'AnnexComposeFn', {
      entry: path.join(__dirname, '../../lambda/api/annexCompose.ts'),
      handler: 'main',
      timeout: Duration.seconds(10),
      bundling: { target: 'node20' }
    });

    const annexRenderFn = new lambdaNode.NodejsFunction(this, 'AnnexRenderFn', {
      entry: path.join(__dirname, '../../lambda/api/annexRender.ts'),
      handler: 'main',
      environment: env,
      memorySize: 512,
      timeout: Duration.seconds(20),
      bundling: {
        target: 'node20',
        nodeModules: ['pdfkit'],
        externalModules: ['aws-sdk']
      }
    });

    const userRecordsFn = new lambdaNode.NodejsFunction(this, 'UserRecordsFn', {
      entry: path.join(__dirname, '../../lambda/api/userRecords.ts'),
      handler: 'main',
      environment: {
        USER_TABLE_NAME: userRecordsTable.tableName,
      },
      timeout: Duration.seconds(10),
      bundling: { target: 'node20' }
    });

    // Permissions
bucket.grantReadWrite(submitFn);
    bucket.grantRead(verifyFn);
    bucket.grantRead(listFn);
  bucket.grantReadWrite(annexRenderFn);

    table.grantWriteData(submitFn);
    table.grantReadData(verifyFn);
    table.grantReadData(listFn);

    userRecordsTable.grantReadWriteData(userRecordsFn);

    // Routes
    const rClassify = api.root.addResource('classify');
    const rStatement = api.root.addResource('statement');
    const rSubmit = api.root.addResource('submit');
    const rVerify = api.root.addResource('verify');
    const rList = api.root.addResource('statements');
    const rParser = api.root.addResource('parser');
    const rUploadFolder = rParser.addResource('upload-folder');

    const rAnnex = api.root.addResource('annex');
    const rAnnexCompose = rAnnex.addResource('compose');
    const rAnnexRender = rAnnex.addResource('render');

    const rUser = api.root.addResource('user');
    const rUserRecords = rUser.addResource('records');

    rClassify.addMethod('POST', new apigw.LambdaIntegration(classifyFn), { apiKeyRequired: true });
    rStatement.addMethod('POST', new apigw.LambdaIntegration(statementFn), { apiKeyRequired: true });
    rSubmit.addMethod('POST', new apigw.LambdaIntegration(submitFn), { apiKeyRequired: true });
    rVerify.addMethod('GET', new apigw.LambdaIntegration(verifyFn), { apiKeyRequired: true }); // public
    rList.addMethod('GET', new apigw.LambdaIntegration(listFn), { apiKeyRequired: true });
    rUploadFolder.addMethod('POST', new apigw.LambdaIntegration(parserFn), { apiKeyRequired: false });

    rAnnexCompose.addMethod('POST', new apigw.LambdaIntegration(annexComposeFn), { apiKeyRequired: false });
    rAnnexRender.addMethod('POST', new apigw.LambdaIntegration(annexRenderFn), { apiKeyRequired: false });

    rUserRecords.addMethod('GET', new apigw.LambdaIntegration(userRecordsFn), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: userAuthorizer,
      apiKeyRequired: false,
    });
    rUserRecords.addMethod('POST', new apigw.LambdaIntegration(userRecordsFn), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: userAuthorizer,
      apiKeyRequired: false,
    });

    // API Key + plan
    const apiKeyValue = process.env.API_KEY_VALUE?.trim();
    const apiKey = new apigw.ApiKey(this, 'ClientApiKey', {
      apiKeyName: 'ai-act-key',
      ...(apiKeyValue ? { value: apiKeyValue } : {}),
    });
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
    new CfnOutput(this, 'UserRecordsTableName', { value: userRecordsTable.tableName });
    new CfnOutput(this, 'CognitoUserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'CognitoUserPoolClientId', { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, 'ApiKeyId', { value: apiKey.keyId });
  }
}
