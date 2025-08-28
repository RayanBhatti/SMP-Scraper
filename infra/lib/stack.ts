import * as path from 'node:path';
import { Construct } from 'constructs';
import {
  Duration, RemovalPolicy, Stack, StackProps, CfnOutput,
  aws_s3 as s3,
  aws_dynamodb as dynamodb,
  aws_lambda as lambda,
  aws_events as events,
  aws_events_targets as targets,
  aws_apigatewayv2 as apigwv2,
  aws_apigatewayv2_integrations as apigwIntegrations,
  aws_logs as logs
} from 'aws-cdk-lib';

const FUNCTIONS_ROOT = path.resolve(process.cwd(), '../functions');

export class AsxScraperStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 for history (JSONL)
    const bucket = new s3.Bucket(this, 'HistoryBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    // DynamoDB for latest quote per symbol
    const table = new dynamodb.Table(this, 'LatestTable', {
      partitionKey: { name: 'symbol', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Shared env for both Lambdas
    const COMMON_ENV = {
      BUCKET_NAME: bucket.bucketName,
      TABLE_NAME: table.tableName,
      TICKERS: process.env.TICKERS ?? 'NVDA,MSFT,AAPL,AMZN,META,AVGO,GOOGL,GOOG,TSLA,BRK.B',
      ALPHAVANTAGE_API_KEY: process.env.ALPHAVANTAGE_API_KEY ?? '',
    };

    // Ingestion/transform Lambda
    const fetchFn = new lambda.Function(this, 'FetchTransformFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'app.handler',
      code: lambda.Code.fromAsset(path.join(FUNCTIONS_ROOT, 'fetch_transform')),
      memorySize: 256,
      timeout: Duration.seconds(120),
      environment: COMMON_ENV,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    bucket.grantPut(fetchFn);
    table.grantReadWriteData(fetchFn);

    // Schedule every 10 hours
    new events.Rule(this, 'IngestSchedule', {
      schedule: events.Schedule.rate(Duration.hours(10)),
      targets: [new targets.LambdaFunction(fetchFn)],
    });

    // Read API Lambda
    const apiFn = new lambda.Function(this, 'ApiReadFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'app.handler',
      code: lambda.Code.fromAsset(path.join(FUNCTIONS_ROOT, 'api_read')),
      memorySize: 256,
      timeout: Duration.seconds(15),
      environment: COMMON_ENV,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    bucket.grantRead(apiFn);
    table.grantReadData(apiFn);

    // HTTP API: /latest and /history
    const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'asx-scraper',
      corsPreflight: {
        allowOrigins: ALLOW_ORIGINS, // <= locked down
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['content-type', 'authorization'],
        // allowCredentials: true, // uncomment if you ever send cookies/auth
      },
    });

    httpApi.addRoutes({
      path: '/latest',
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwIntegrations.HttpLambdaIntegration('LatestIntegration', apiFn),
    });

    httpApi.addRoutes({
      path: '/history',
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwIntegrations.HttpLambdaIntegration('HistoryIntegration', apiFn),
    });


    new CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new CfnOutput(this, 'TableName', { value: table.tableName });
  }
}
