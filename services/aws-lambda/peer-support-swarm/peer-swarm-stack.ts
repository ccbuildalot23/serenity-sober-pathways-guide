/**
 * CDK Stack for PeerSupport Swarm Microservice
 * Deploys Lambda functions, API Gateway, DynamoDB tables, and monitoring
 * Implements swarm patterns with auto-scaling and Byzantine fault tolerance
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface PeerSupportSwarmStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  vpcId?: string;
  enableWAF?: boolean;
  enableXRay?: boolean;
}

export class PeerSupportSwarmStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly queenLambda: NodejsFunction;
  public readonly workerLambdas: NodejsFunction[] = [];
  
  constructor(scope: Construct, id: string, props: PeerSupportSwarmStackProps) {
    super(scope, id, props);

    const isProd = props.environment === 'prod';

    // =================
    // VPC Configuration (for production)
    // =================
    let vpc: ec2.IVpc | undefined;
    if (isProd && props.vpcId) {
      vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId: props.vpcId });
    }

    // =================
    // Secrets Manager
    // =================
    const apiSecrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      'ApiSecrets',
      `/serenity/${props.environment}/api-keys`
    );

    // =================
    // DynamoDB Tables
    // =================
    
    // Rate Limiting Table
    const rateLimitTable = new dynamodb.Table(this, 'RateLimitTable', {
      tableName: `PeerSupportRateLimit-${props.environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'requestTime', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: isProd,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Activity Logging Table
    const activityTable = new dynamodb.Table(this, 'ActivityTable', {
      tableName: `PeerSupportActivity-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: isProd,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Add GSI for querying by userId
    activityTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Swarm State Table (for coordination)
    const swarmStateTable = new dynamodb.Table(this, 'SwarmStateTable', {
      tableName: `PeerSupportSwarmState-${props.environment}`,
      partitionKey: { name: 'swarmId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // =================
    // Lambda Layer (shared dependencies)
    // =================
    const dependenciesLayer = new lambda.LayerVersion(this, 'DependenciesLayer', {
      code: lambda.Code.fromAsset('layers/dependencies'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared dependencies for PeerSupport Swarm'
    });

    // =================
    // IAM Role for Lambda
    // =================
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    // Add permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:BatchWriteItem'
      ],
      resources: [
        rateLimitTable.tableArn,
        activityTable.tableArn,
        swarmStateTable.tableArn,
        `${activityTable.tableArn}/index/*`
      ]
    }));

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue'
      ],
      resources: [apiSecrets.secretArn]
    }));

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'lambda:InvokeFunction'
      ],
      resources: ['*'] // Will be restricted to worker functions
    }));

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));

    if (props.enableXRay) {
      lambdaRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords'
        ],
        resources: ['*']
      }));
    }

    // =================
    // Environment Variables
    // =================
    const environment = {
      NODE_ENV: props.environment,
      RATE_LIMIT_TABLE: rateLimitTable.tableName,
      ACTIVITY_TABLE: activityTable.tableName,
      SWARM_STATE_TABLE: swarmStateTable.tableName,
      SECRET_NAME: apiSecrets.secretName,
      ENABLE_XRAY: props.enableXRay ? 'true' : 'false',
      SWARM_MODE: 'hierarchical',
      ENABLE_MCP: 'true',
      ENABLE_NEURAL: 'true',
      ENABLE_BYZANTINE: 'true'
    };

    // =================
    // Queen Lambda (Coordinator)
    // =================
    this.queenLambda = new NodejsFunction(this, 'QueenLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'queen-handler.ts'),
      functionName: `PeerSupportQueen-${props.environment}`,
      description: 'Coordinator for PeerSupport Swarm',
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      reservedConcurrentExecutions: isProd ? 100 : 10,
      environment,
      role: lambdaRole,
      layers: [dependenciesLayer],
      vpc: vpc,
      vpcSubnets: vpc ? { subnets: vpc.privateSubnets } : undefined,
      tracing: props.enableXRay ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      logRetention: logs.RetentionDays.ONE_MONTH,
      deadLetterQueueEnabled: isProd,
      retryAttempts: isProd ? 2 : 0
    });

    // Add auto-scaling for production
    if (isProd) {
      const scalableTarget = this.queenLambda.addAlias('live', {
        provisionedConcurrentExecutions: 5
      });

      new cloudwatch.Alarm(this, 'QueenLambdaErrors', {
        metric: this.queenLambda.metricErrors(),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

    // =================
    // Worker Lambdas (Swarm Agents)
    // =================
    const workerConfigs = [
      { id: 'emotional-analyst', memory: 512 },
      { id: 'motivational-content', memory: 768 },
      { id: 'personalization', memory: 512 },
      { id: 'cultural-sensitivity', memory: 512 },
      { id: 'peer-connection', memory: 1024 }
    ];

    for (const config of workerConfigs) {
      const workerLambda = new NodejsFunction(this, `Worker-${config.id}`, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(__dirname, `worker-handlers/${config.id}-handler.ts`),
        functionName: `PeerSupportWorker-${config.id}-${props.environment}`,
        description: `Worker agent: ${config.id}`,
        timeout: cdk.Duration.seconds(15),
        memorySize: config.memory,
        environment,
        role: lambdaRole,
        layers: [dependenciesLayer],
        vpc: vpc,
        vpcSubnets: vpc ? { subnets: vpc.privateSubnets } : undefined,
        tracing: props.enableXRay ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
        logRetention: logs.RetentionDays.ONE_WEEK
      });

      this.workerLambdas.push(workerLambda);
      
      // Grant queen permission to invoke workers
      workerLambda.grantInvoke(this.queenLambda);
    }

    // =================
    // API Gateway
    // =================
    this.api = new apigateway.RestApi(this, 'PeerSupportAPI', {
      restApiName: `PeerSupportSwarm-${props.environment}`,
      description: 'API for PeerSupport Swarm Microservice',
      deployOptions: {
        stageName: props.environment,
        throttlingRateLimit: isProd ? 1000 : 100,
        throttlingBurstLimit: isProd ? 2000 : 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: !isProd,
        metricsEnabled: true,
        tracingEnabled: props.enableXRay || false
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ]
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL]
    });

    // API Key for additional security
    const apiKey = this.api.addApiKey('ApiKey', {
      apiKeyName: `PeerSupportSwarm-${props.environment}-key`
    });

    const usagePlan = this.api.addUsagePlan('UsagePlan', {
      name: `PeerSupportSwarm-${props.environment}-usage`,
      throttle: {
        rateLimit: isProd ? 1000 : 100,
        burstLimit: isProd ? 2000 : 200
      },
      quota: {
        limit: isProd ? 100000 : 10000,
        period: apigateway.Period.DAY
      }
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: this.api.deploymentStage
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(this.queenLambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
    });

    // API Routes
    const peer = this.api.root.addResource('peer');
    
    // /peer/message
    const message = peer.addResource('message');
    message.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true,
      authorizationType: apigateway.AuthorizationType.NONE // Add Cognito later
    });

    // /peer/connect
    const connect = peer.addResource('connect');
    connect.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /peer/crisis
    const crisis = peer.addResource('crisis');
    crisis.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /peer/health
    const health = peer.addResource('health');
    health.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: false // Health check doesn't need API key
    });

    // =================
    // WAF (Web Application Firewall)
    // =================
    if (props.enableWAF) {
      const webAcl = new waf.CfnWebACL(this, 'WebACL', {
        scope: 'REGIONAL',
        defaultAction: { allow: {} },
        rules: [
          {
            name: 'RateLimitRule',
            priority: 1,
            action: { block: {} },
            statement: {
              rateBasedStatement: {
                limit: 2000,
                aggregateKeyType: 'IP'
              }
            },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'RateLimitRule'
            }
          },
          {
            name: 'SQLiRule',
            priority: 2,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                vendorName: 'AWS',
                name: 'AWSManagedRulesSQLiRuleSet'
              }
            },
            visibilityConfig: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'SQLiRule'
            }
          }
        ],
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'WebACL'
        }
      });

      new waf.CfnWebACLAssociation(this, 'WebACLAssociation', {
        resourceArn: this.api.arnForExecuteApi(),
        webAclArn: webAcl.attrArn
      });
    }

    // =================
    // CloudWatch Dashboard
    // =================
    const dashboard = new cloudwatch.Dashboard(this, 'SwarmDashboard', {
      dashboardName: `PeerSupportSwarm-${props.environment}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Swarm Health',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/PeerSupport',
                metricName: 'SwarmHealth',
                statistic: 'Average'
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'Serenity/PeerSupport',
                metricName: 'ActiveAgents',
                statistic: 'Sum'
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Response Times',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/PeerSupport',
                metricName: 'AverageResponseTime',
                statistic: 'Average'
              })
            ]
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Lambda Invocations',
            left: [
              this.queenLambda.metricInvocations(),
              ...this.workerLambdas.map(w => w.metricInvocations())
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Lambda Errors',
            left: [
              this.queenLambda.metricErrors(),
              ...this.workerLambdas.map(w => w.metricErrors())
            ]
          })
        ]
      ]
    });

    // =================
    // Outputs
    // =================
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: this.api.url,
      description: 'PeerSupport Swarm API Endpoint'
    });

    new cdk.CfnOutput(this, 'APIKey', {
      value: apiKey.keyId,
      description: 'API Key ID (retrieve value from console)'
    });

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL'
    });
  }
}
