/**
 * CDK Stack for RBAC Adaptive Security Swarm
 * Zero-trust security with dynamic role-based access control
 * Implements threat detection, audit logging, and compliance monitoring
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface SecuritySwarmStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  vpcId?: string;
  enableXRay?: boolean;
  alertEmail?: string;
  encryptionKeyArn?: string;
}

export class SecuritySwarmStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly coordinatorLambda: NodejsFunction;
  public readonly workerLambdas: NodejsFunction[] = [];
  public readonly encryptionKey: kms.Key;
  public readonly alertTopic: sns.Topic;
  
  constructor(scope: Construct, id: string, props: SecuritySwarmStackProps) {
    super(scope, id, props);

    const isProd = props.environment === 'prod';

    // =================
    // KMS Encryption Key
    // =================
    this.encryptionKey = props.encryptionKeyArn ? 
      kms.Key.fromKeyArn(this, 'EncryptionKey', props.encryptionKeyArn) :
      new kms.Key(this, 'EncryptionKey', {
        description: `Security Swarm Encryption Key - ${props.environment}`,
        enableKeyRotation: true,
        alias: `serenity-security-${props.environment}`
      });

    // =================
    // SNS Alert Topic
    // =================
    this.alertTopic = new sns.Topic(this, 'SecurityAlerts', {
      topicName: `SecuritySwarmAlerts-${props.environment}`,
      masterKey: this.encryptionKey
    });

    if (props.alertEmail) {
      this.alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // =================
    // DynamoDB Tables with Encryption
    // =================
    
    // RBAC Policies Table
    const rbacTable = new dynamodb.Table(this, 'RBACPoliciesTable', {
      tableName: `RBACPolicies-${props.environment}`,
      partitionKey: { name: 'roleId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'resourceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: isProd,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.encryptionKey,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Audit Log Table (HIPAA Compliant)
    const auditTable = new dynamodb.Table(this, 'AuditLogTable', {
      tableName: `SecurityAuditLog-${props.environment}`,
      partitionKey: { name: 'auditId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: true, // Always enabled for audit logs
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.encryptionKey,
      removalPolicy: cdk.RemovalPolicy.RETAIN // Always retain audit logs
    });

    // Add GSI for user-based queries
    auditTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Threat Detection Table
    const threatTable = new dynamodb.Table(this, 'ThreatDetectionTable', {
      tableName: `ThreatDetection-${props.environment}`,
      partitionKey: { name: 'threatId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.encryptionKey,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Session Management Table
    const sessionTable = new dynamodb.Table(this, 'SessionTable', {
      tableName: `SecuritySessions-${props.environment}`,
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.encryptionKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // =================
    // Secrets Manager
    // =================
    const securitySecrets = new secretsmanager.Secret(this, 'SecuritySecrets', {
      secretName: `/serenity/${props.environment}/security-keys`,
      description: 'Security swarm API keys and certificates',
      encryptionKey: this.encryptionKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          jwtSecret: '',
          apiKey: ''
        }),
        generateStringKey: 'password',
        excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
        passwordLength: 32
      }
    });

    // =================
    // Lambda Layer
    // =================
    const securityLayer = new lambda.LayerVersion(this, 'SecurityDependencies', {
      code: lambda.Code.fromAsset('layers/security'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Security swarm dependencies including crypto libraries'
    });

    // =================
    // IAM Role with Least Privilege
    // =================
    const lambdaRole = new iam.Role(this, 'SecurityLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // DynamoDB permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:UpdateItem',
        'dynamodb:BatchWriteItem'
      ],
      resources: [
        rbacTable.tableArn,
        auditTable.tableArn,
        threatTable.tableArn,
        sessionTable.tableArn,
        `${auditTable.tableArn}/index/*`
      ]
    }));

    // KMS permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kms:Encrypt',
        'kms:Decrypt',
        'kms:GenerateDataKey'
      ],
      resources: [this.encryptionKey.keyArn]
    }));

    // SNS permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [this.alertTopic.topicArn]
    }));

    // Secrets Manager permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [securitySecrets.secretArn]
    }));

    // Lambda invoke permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': this.region
        }
      }
    }));

    // CloudWatch permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudwatch:PutMetricData'],
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
      AWS_REGION: this.region,
      RBAC_TABLE: rbacTable.tableName,
      AUDIT_TABLE: auditTable.tableName,
      THREAT_TABLE: threatTable.tableName,
      SESSION_TABLE: sessionTable.tableName,
      KMS_KEY_ID: this.encryptionKey.keyId,
      ALERT_TOPIC_ARN: this.alertTopic.topicArn,
      SECRET_NAME: securitySecrets.secretName,
      ENABLE_XRAY: props.enableXRay ? 'true' : 'false',
      ZERO_TRUST_MODE: 'true',
      ADAPTIVE_SECURITY: 'true',
      ENABLE_MCP: 'true'
    };

    // =================
    // RBAC Coordinator Lambda
    // =================
    this.coordinatorLambda = new NodejsFunction(this, 'RBACCoordinator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'rbac-coordinator.ts',
      functionName: `SecurityCoordinator-${props.environment}`,
      description: 'Zero-trust RBAC coordinator with adaptive security',
      timeout: cdk.Duration.seconds(30),
      memorySize: 1536,
      reservedConcurrentExecutions: isProd ? 100 : 10,
      environment,
      role: lambdaRole,
      layers: [securityLayer],
      tracing: props.enableXRay ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      logRetention: logs.RetentionDays.ONE_YEAR, // Security logs retained longer
      deadLetterQueueEnabled: isProd,
      retryAttempts: isProd ? 1 : 0
    });

    // =================
    // Security Worker Lambdas
    // =================
    const workerConfigs = [
      { id: 'access-validator', memory: 512, timeout: 10 },
      { id: 'threat-detector', memory: 1024, timeout: 20 },
      { id: 'audit-logger', memory: 512, timeout: 10 },
      { id: 'encryption-manager', memory: 768, timeout: 15 },
      { id: 'compliance-monitor', memory: 1024, timeout: 30 }
    ];

    for (const config of workerConfigs) {
      const workerLambda = new NodejsFunction(this, `SecurityWorker-${config.id}`, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: `security-workers/${config.id}.ts`,
        functionName: `SecurityWorker-${config.id}-${props.environment}`,
        description: `Security worker: ${config.id}`,
        timeout: cdk.Duration.seconds(config.timeout),
        memorySize: config.memory,
        environment,
        role: lambdaRole,
        layers: [securityLayer],
        tracing: props.enableXRay ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
        logRetention: logs.RetentionDays.SIX_MONTHS
      });

      this.workerLambdas.push(workerLambda);
      
      // Grant coordinator permission to invoke workers
      workerLambda.grantInvoke(this.coordinatorLambda);
    }

    // =================
    // API Gateway with Security Headers
    // =================
    this.api = new apigateway.RestApi(this, 'SecurityAPI', {
      restApiName: `SecuritySwarm-${props.environment}`,
      description: 'Zero-trust Security API with RBAC',
      deployOptions: {
        stageName: props.environment,
        throttlingRateLimit: isProd ? 200 : 20,
        throttlingBurstLimit: isProd ? 400 : 40,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false, // Never log sensitive data
        metricsEnabled: true,
        tracingEnabled: props.enableXRay || false
      },
      defaultCorsPreflightOptions: {
        allowOrigins: isProd ? ['https://serenity-sober-pathways.com'] : apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Session-Id',
          'X-User-Id'
        ],
        maxAge: cdk.Duration.hours(1)
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*']
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*'],
            conditions: {
              IpAddressNotEquals: {
                'aws:SourceIp': isProd ? ['10.0.0.0/8'] : ['0.0.0.0/0']
              }
            }
          })
        ]
      })
    });

    // API Key with usage plan
    const apiKey = this.api.addApiKey('SecurityApiKey', {
      apiKeyName: `SecuritySwarm-${props.environment}-key`
    });

    const usagePlan = this.api.addUsagePlan('SecurityUsagePlan', {
      name: `SecuritySwarm-${props.environment}-usage`,
      throttle: {
        rateLimit: isProd ? 200 : 20,
        burstLimit: isProd ? 400 : 40
      },
      quota: {
        limit: isProd ? 10000 : 1000,
        period: apigateway.Period.DAY
      }
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: this.api.deploymentStage
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(this.coordinatorLambda);

    // API Routes
    const security = this.api.root.addResource('security');
    
    // /security/validate
    const validate = security.addResource('validate');
    validate.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true,
      authorizationType: apigateway.AuthorizationType.NONE
    });

    // /security/audit
    const audit = security.addResource('audit');
    audit.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });
    audit.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /security/threat
    const threat = security.addResource('threat');
    threat.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /security/session
    const session = security.addResource('session');
    session.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });
    session.addMethod('DELETE', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /security/compliance
    const compliance = security.addResource('compliance');
    compliance.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /security/health
    const health = security.addResource('health');
    health.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: false
    });

    // =================
    // CloudWatch Alarms
    // =================
    new cloudwatch.Alarm(this, 'UnauthorizedAccessAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'Serenity/Security',
        metricName: 'UnauthorizedAccess',
        statistic: 'Sum'
      }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    new cloudwatch.Alarm(this, 'ThreatDetectedAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'Serenity/Security',
        metricName: 'ThreatDetected',
        statistic: 'Sum'
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // =================
    // CloudWatch Dashboard
    // =================
    const dashboard = new cloudwatch.Dashboard(this, 'SecurityDashboard', {
      dashboardName: `SecuritySwarm-${props.environment}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Access Validation',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Security',
                metricName: 'AccessGranted',
                statistic: 'Sum'
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Security',
                metricName: 'AccessDenied',
                statistic: 'Sum'
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Threat Detection',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Security',
                metricName: 'ThreatDetected',
                statistic: 'Sum'
              })
            ]
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Audit Events',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Security',
                metricName: 'AuditEvents',
                statistic: 'Sum'
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Compliance Score',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Security',
                metricName: 'ComplianceScore',
                statistic: 'Average'
              })
            ]
          })
        ]
      ]
    });

    // =================
    // Outputs
    // =================
    new cdk.CfnOutput(this, 'SecurityAPIEndpoint', {
      value: this.api.url,
      description: 'Security Swarm API Endpoint'
    });

    new cdk.CfnOutput(this, 'SecurityAPIKey', {
      value: apiKey.keyId,
      description: 'Security API Key ID'
    });

    new cdk.CfnOutput(this, 'KMSKeyId', {
      value: this.encryptionKey.keyId,
      description: 'KMS Encryption Key ID'
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'Security Alert Topic ARN'
    });

    new cdk.CfnOutput(this, 'SecurityDashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'Security CloudWatch Dashboard'
    });
  }
}