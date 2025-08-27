/**
 * CDK Stack for Clinical Decision Support Swarm
 * Implements Byzantine fault-tolerant clinical recommendations
 * Integrates with medical knowledge bases via MCP servers
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
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ClinicalSwarmStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  vpcId?: string;
  enableXRay?: boolean;
  byzantineNodes?: number;
  fhirServerUrl?: string;
}

export class ClinicalSwarmStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly coordinatorLambda: NodejsFunction;
  public readonly workerLambdas: NodejsFunction[] = [];
  public readonly clinicalDataBucket: s3.Bucket;
  
  constructor(scope: Construct, id: string, props: ClinicalSwarmStackProps) {
    super(scope, id, props);

    const isProd = props.environment === 'prod';
    const byzantineNodes = props.byzantineNodes || 9;

    // =================
    // VPC Configuration
    // =================
    let vpc: ec2.IVpc | undefined;
    if (isProd && props.vpcId) {
      vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId: props.vpcId });
    }

    // =================
    // S3 Bucket for Clinical Data
    // =================
    this.clinicalDataBucket = new s3.Bucket(this, 'ClinicalDataBucket', {
      bucketName: `clinical-data-${props.environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      lifecycleRules: [{
        id: 'delete-old-versions',
        noncurrentVersionExpiration: cdk.Duration.days(90)
      }],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // =================
    // Secrets Manager
    // =================
    const clinicalSecrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      'ClinicalSecrets',
      `/serenity/${props.environment}/clinical-apis`
    );

    // =================
    // DynamoDB Tables
    // =================
    
    // Clinical Decisions Table
    const decisionsTable = new dynamodb.Table(this, 'ClinicalDecisionsTable', {
      tableName: `ClinicalDecisions-${props.environment}`,
      partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'decisionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: isProd,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Byzantine Consensus Table
    const consensusTable = new dynamodb.Table(this, 'ByzantineConsensusTable', {
      tableName: `ClinicalConsensus-${props.environment}`,
      partitionKey: { name: 'consensusId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'nodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Treatment Plans Table
    const treatmentTable = new dynamodb.Table(this, 'TreatmentPlansTable', {
      tableName: `TreatmentPlans-${props.environment}`,
      partitionKey: { name: 'planId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: isProd,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Add GSI for patient lookup
    treatmentTable.addGlobalSecondaryIndex({
      indexName: 'PatientIdIndex',
      partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // =================
    // Lambda Layer
    // =================
    const clinicalLayer = new lambda.LayerVersion(this, 'ClinicalDependencies', {
      code: lambda.Code.fromAsset('layers/clinical'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Clinical swarm dependencies including FHIR libraries'
    });

    // =================
    // IAM Role
    // =================
    const lambdaRole = new iam.Role(this, 'ClinicalLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
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
        'dynamodb:DeleteItem',
        'dynamodb:BatchWriteItem',
        'dynamodb:BatchGetItem'
      ],
      resources: [
        decisionsTable.tableArn,
        consensusTable.tableArn,
        treatmentTable.tableArn,
        `${treatmentTable.tableArn}/index/*`
      ]
    }));

    // S3 permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject'
      ],
      resources: [`${this.clinicalDataBucket.bucketArn}/*`]
    }));

    // Secrets Manager permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [clinicalSecrets.secretArn]
    }));

    // Lambda invoke permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: ['*']
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
      DECISIONS_TABLE: decisionsTable.tableName,
      CONSENSUS_TABLE: consensusTable.tableName,
      TREATMENT_TABLE: treatmentTable.tableName,
      CLINICAL_BUCKET: this.clinicalDataBucket.bucketName,
      SECRET_NAME: clinicalSecrets.secretName,
      ENABLE_XRAY: props.enableXRay ? 'true' : 'false',
      BYZANTINE_NODES: byzantineNodes.toString(),
      BYZANTINE_THRESHOLD: '0.67',
      FHIR_SERVER_URL: props.fhirServerUrl || '',
      ENABLE_MCP: 'true',
      ENABLE_BYZANTINE: 'true',
      SWARM_MODE: 'byzantine'
    };

    // =================
    // Clinical Coordinator Lambda (Byzantine Leader)
    // =================
    this.coordinatorLambda = new NodejsFunction(this, 'ClinicalCoordinator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'clinical-coordinator.ts'),
      functionName: `ClinicalCoordinator-${props.environment}`,
      description: 'Byzantine coordinator for clinical decision support',
      timeout: cdk.Duration.seconds(60),
      memorySize: 2048,
      reservedConcurrentExecutions: isProd ? 50 : 5,
      environment,
      role: lambdaRole,
      layers: [clinicalLayer],
      vpc: vpc,
      vpcSubnets: vpc ? { subnets: vpc.privateSubnets } : undefined,
      tracing: props.enableXRay ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      logRetention: logs.RetentionDays.ONE_MONTH,
      deadLetterQueueEnabled: isProd,
      retryAttempts: isProd ? 2 : 0
    });

    // Add provisioned concurrency for production
    if (isProd) {
      const coordinatorAlias = this.coordinatorLambda.addAlias('live', {
        provisionedConcurrentExecutions: 3
      });

      new cloudwatch.Alarm(this, 'CoordinatorErrors', {
        metric: this.coordinatorLambda.metricErrors(),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

    // =================
    // Clinical Worker Lambdas (Byzantine Nodes)
    // =================
    const workerConfigs = [
      { id: 'diagnosis-analyzer', memory: 1024, timeout: 30 },
      { id: 'treatment-planner', memory: 1536, timeout: 45 },
      { id: 'medication-manager', memory: 1024, timeout: 30 },
      { id: 'clinical-documentation', memory: 768, timeout: 20 },
      { id: 'outcome-predictor', memory: 2048, timeout: 60 }
    ];

    for (const config of workerConfigs) {
      const workerLambda = new NodejsFunction(this, `ClinicalWorker-${config.id}`, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(__dirname, `clinical-workers/${config.id}.ts`),
        functionName: `ClinicalWorker-${config.id}-${props.environment}`,
        description: `Clinical worker: ${config.id}`,
        timeout: cdk.Duration.seconds(config.timeout),
        memorySize: config.memory,
        environment,
        role: lambdaRole,
        layers: [clinicalLayer],
        vpc: vpc,
        vpcSubnets: vpc ? { subnets: vpc.privateSubnets } : undefined,
        tracing: props.enableXRay ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
        logRetention: logs.RetentionDays.FOURTEEN_DAYS
      });

      this.workerLambdas.push(workerLambda);
      
      // Grant coordinator permission to invoke workers
      workerLambda.grantInvoke(this.coordinatorLambda);
    }

    // =================
    // API Gateway
    // =================
    this.api = new apigateway.RestApi(this, 'ClinicalAPI', {
      restApiName: `ClinicalSwarm-${props.environment}`,
      description: 'Clinical Decision Support API with Byzantine Consensus',
      deployOptions: {
        stageName: props.environment,
        throttlingRateLimit: isProd ? 500 : 50,
        throttlingBurstLimit: isProd ? 1000 : 100,
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
          'X-Patient-Id',
          'X-Provider-Id'
        ]
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL]
    });

    // API Key
    const apiKey = this.api.addApiKey('ClinicalApiKey', {
      apiKeyName: `ClinicalSwarm-${props.environment}-key`
    });

    const usagePlan = this.api.addUsagePlan('ClinicalUsagePlan', {
      name: `ClinicalSwarm-${props.environment}-usage`,
      throttle: {
        rateLimit: isProd ? 500 : 50,
        burstLimit: isProd ? 1000 : 100
      },
      quota: {
        limit: isProd ? 50000 : 5000,
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
    const clinical = this.api.root.addResource('clinical');
    
    // /clinical/diagnosis
    const diagnosis = clinical.addResource('diagnosis');
    diagnosis.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true,
      authorizationType: apigateway.AuthorizationType.NONE
    });
    diagnosis.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /clinical/treatment
    const treatment = clinical.addResource('treatment');
    treatment.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });
    treatment.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /clinical/medication
    const medication = clinical.addResource('medication');
    medication.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });
    medication.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /clinical/consensus
    const consensus = clinical.addResource('consensus');
    consensus.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });
    consensus.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true
    });

    // /clinical/health
    const health = clinical.addResource('health');
    health.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: false
    });

    // =================
    // CloudWatch Dashboard
    // =================
    const dashboard = new cloudwatch.Dashboard(this, 'ClinicalDashboard', {
      dashboardName: `ClinicalSwarm-${props.environment}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Byzantine Consensus',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Clinical',
                metricName: 'ConsensusAchieved',
                statistic: 'Sum'
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Clinical',
                metricName: 'ByzantineNodesDetected',
                statistic: 'Sum'
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Clinical Decisions',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Clinical',
                metricName: 'DecisionsProcessed',
                statistic: 'Sum'
              })
            ]
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Worker Performance',
            left: this.workerLambdas.map(w => w.metricDuration())
          }),
          new cloudwatch.GraphWidget({
            title: 'Error Rates',
            left: [
              this.coordinatorLambda.metricErrors(),
              ...this.workerLambdas.map(w => w.metricErrors())
            ]
          })
        ]
      ]
    });

    // =================
    // Outputs
    // =================
    new cdk.CfnOutput(this, 'ClinicalAPIEndpoint', {
      value: this.api.url,
      description: 'Clinical Swarm API Endpoint'
    });

    new cdk.CfnOutput(this, 'ClinicalAPIKey', {
      value: apiKey.keyId,
      description: 'Clinical API Key ID'
    });

    new cdk.CfnOutput(this, 'ClinicalBucket', {
      value: this.clinicalDataBucket.bucketName,
      description: 'Clinical Data S3 Bucket'
    });

    new cdk.CfnOutput(this, 'ClinicalDashboard', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'Clinical CloudWatch Dashboard'
    });
  }
}
