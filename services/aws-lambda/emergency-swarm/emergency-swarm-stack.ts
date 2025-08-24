/**
 * CDK Stack for Care Navigation Emergency Swarm
 * Multi-tier crisis escalation with real-time coordination
 * Integrates emergency services and notification systems
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface EmergencySwarmStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  vpcId?: string;
  enableXRay?: boolean;
  emergencyPhoneNumber?: string;
  escalationTimeoutMinutes?: number;
}

export class EmergencySwarmStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly stateMachine: stepfunctions.StateMachine;
  public readonly coordinatorLambda: NodejsFunction;
  public readonly workerLambdas: NodejsFunction[] = [];
  public readonly emergencyTopic: sns.Topic;
  public readonly escalationQueue: sqs.Queue;
  
  constructor(scope: Construct, id: string, props: EmergencySwarmStackProps) {
    super(scope, id, props);

    const isProd = props.environment === 'prod';
    const escalationTimeout = props.escalationTimeoutMinutes || 5;

    // =================
    // SNS Emergency Topic
    // =================
    this.emergencyTopic = new sns.Topic(this, 'EmergencyAlerts', {
      topicName: `EmergencySwarmAlerts-${props.environment}`,
      displayName: 'Serenity Emergency Alerts'
    });

    // =================
    // SQS Escalation Queue
    // =================
    this.escalationQueue = new sqs.Queue(this, 'EscalationQueue', {
      queueName: `EmergencyEscalation-${props.environment}`,
      visibilityTimeout: cdk.Duration.minutes(escalationTimeout),
      retentionPeriod: cdk.Duration.days(7),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'EscalationDLQ', {
          queueName: `EmergencyEscalation-DLQ-${props.environment}`
        }),
        maxReceiveCount: 3
      }
    });

    // =================
    // DynamoDB Tables
    // =================
    
    // Emergency Events Table
    const emergencyTable = new dynamodb.Table(this, 'EmergencyEventsTable', {
      tableName: `EmergencyEvents-${props.environment}`,
      partitionKey: { name: 'emergencyId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add GSI for patient lookup
    emergencyTable.addGlobalSecondaryIndex({
      indexName: 'PatientIdIndex',
      partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Escalation State Table
    const escalationTable = new dynamodb.Table(this, 'EscalationStateTable', {
      tableName: `EscalationState-${props.environment}`,
      partitionKey: { name: 'escalationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Resource Location Table
    const resourceTable = new dynamodb.Table(this, 'EmergencyResourcesTable', {
      tableName: `EmergencyResources-${props.environment}`,
      partitionKey: { name: 'resourceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // =================
    // Lambda Layer
    // =================
    const emergencyLayer = new lambda.LayerVersion(this, 'EmergencyDependencies', {
      code: lambda.Code.fromAsset('layers/emergency'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Emergency swarm dependencies'
    });

    // =================
    // IAM Role
    // =================
    const lambdaRole = new iam.Role(this, 'EmergencyLambdaRole', {
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
        emergencyTable.tableArn,
        escalationTable.tableArn,
        resourceTable.tableArn,
        `${emergencyTable.tableArn}/index/*`
      ]
    }));

    // SNS permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [this.emergencyTopic.topicArn]
    }));

    // SQS permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sqs:SendMessage',
        'sqs:ReceiveMessage',
        'sqs:DeleteMessage'
      ],
      resources: [this.escalationQueue.queueArn]
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

    // Step Functions permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['states:StartExecution'],
      resources: ['*']
    }));

    // =================
    // Environment Variables
    // =================
    const environment = {
      NODE_ENV: props.environment,
      EMERGENCY_TABLE: emergencyTable.tableName,
      ESCALATION_TABLE: escalationTable.tableName,
      RESOURCE_TABLE: resourceTable.tableName,
      EMERGENCY_TOPIC_ARN: this.emergencyTopic.topicArn,
      ESCALATION_QUEUE_URL: this.escalationQueue.queueUrl,
      ESCALATION_TIMEOUT_MINUTES: escalationTimeout.toString(),
      EMERGENCY_PHONE: props.emergencyPhoneNumber || '911',
      ENABLE_XRAY: props.enableXRay ? 'true' : 'false',
      ENABLE_MCP: 'true',
      SWARM_MODE: 'emergency'
    };

    // =================
    // Emergency Coordinator Lambda
    // =================
    this.coordinatorLambda = new NodejsFunction(this, 'EmergencyCoordinator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'emergency-coordinator.ts'),
      functionName: `EmergencyCoordinator-${props.environment}`,
      description: 'Emergency swarm coordinator with multi-tier escalation',
      timeout: cdk.Duration.seconds(60),
      memorySize: 2048,
      reservedConcurrentExecutions: isProd ? 100 : 10,
      environment,
      role: lambdaRole,
      layers: [emergencyLayer],
      tracing: props.enableXRay ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      logRetention: logs.RetentionDays.ONE_YEAR,
      deadLetterQueueEnabled: false // Never fail emergency processing
    });

    // =================
    // Emergency Worker Lambdas
    // =================
    const workerConfigs = [
      { id: 'crisis-detector', memory: 1024, timeout: 20 },
      { id: 'resource-locator', memory: 768, timeout: 30 },
      { id: 'notification-dispatcher', memory: 512, timeout: 15 },
      { id: 'intervention-coordinator', memory: 1536, timeout: 45 },
      { id: 'follow-up-scheduler', memory: 512, timeout: 20 }
    ];

    for (const config of workerConfigs) {
      const workerLambda = new NodejsFunction(this, `EmergencyWorker-${config.id}`, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(__dirname, `emergency-workers/${config.id}.ts`),
        functionName: `EmergencyWorker-${config.id}-${props.environment}`,
        description: `Emergency worker: ${config.id}`,
        timeout: cdk.Duration.seconds(config.timeout),
        memorySize: config.memory,
        environment,
        role: lambdaRole,
        layers: [emergencyLayer],
        tracing: props.enableXRay ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
        logRetention: logs.RetentionDays.SIX_MONTHS
      });

      this.workerLambdas.push(workerLambda);
      workerLambda.grantInvoke(this.coordinatorLambda);
    }

    // =================
    // Step Functions State Machine
    // =================
    const detectCrisisTask = new stepfunctionsTasks.LambdaInvoke(this, 'DetectCrisis', {
      lambdaFunction: this.workerLambdas[0],
      outputPath: '$.Payload'
    });

    const locateResourcesTask = new stepfunctionsTasks.LambdaInvoke(this, 'LocateResources', {
      lambdaFunction: this.workerLambdas[1],
      outputPath: '$.Payload'
    });

    const dispatchNotificationsTask = new stepfunctionsTasks.LambdaInvoke(this, 'DispatchNotifications', {
      lambdaFunction: this.workerLambdas[2],
      outputPath: '$.Payload'
    });

    const coordinateInterventionTask = new stepfunctionsTasks.LambdaInvoke(this, 'CoordinateIntervention', {
      lambdaFunction: this.workerLambdas[3],
      outputPath: '$.Payload'
    });

    const scheduleFollowUpTask = new stepfunctionsTasks.LambdaInvoke(this, 'ScheduleFollowUp', {
      lambdaFunction: this.workerLambdas[4],
      outputPath: '$.Payload'
    });

    // Define escalation workflow
    const definition = detectCrisisTask
      .next(new stepfunctions.Parallel(this, 'EmergencyResponse')
        .branch(locateResourcesTask)
        .branch(dispatchNotificationsTask))
      .next(coordinateInterventionTask)
      .next(new stepfunctions.Choice(this, 'CheckResolution')
        .when(stepfunctions.Condition.stringEquals('$.status', 'resolved'), 
          scheduleFollowUpTask)
        .otherwise(new stepfunctions.Wait(this, 'WaitForEscalation', {
          time: stepfunctions.WaitTime.duration(cdk.Duration.minutes(1))
        }).next(coordinateInterventionTask)));

    this.stateMachine = new stepfunctions.StateMachine(this, 'EmergencyStateMachine', {
      definition,
      stateMachineName: `EmergencyEscalation-${props.environment}`,
      timeout: cdk.Duration.hours(1),
      tracingEnabled: props.enableXRay || false
    });

    // Grant state machine permissions
    this.stateMachine.grantStartExecution(this.coordinatorLambda);

    // =================
    // API Gateway
    // =================
    this.api = new apigateway.RestApi(this, 'EmergencyAPI', {
      restApiName: `EmergencySwarm-${props.environment}`,
      description: 'Emergency Response API with Multi-tier Escalation',
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
        allowMethods: apigateway.Cors.ALL_METHODS
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL]
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(this.coordinatorLambda);

    // API Routes
    const emergency = this.api.root.addResource('emergency');
    
    // /emergency/alert
    const alert = emergency.addResource('alert');
    alert.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: false // Emergency endpoints don't require API key
    });

    // /emergency/status
    const status = emergency.addResource('status');
    status.addMethod('GET', lambdaIntegration);

    // /emergency/escalate
    const escalate = emergency.addResource('escalate');
    escalate.addMethod('POST', lambdaIntegration);

    // /emergency/resources
    const resources = emergency.addResource('resources');
    resources.addMethod('GET', lambdaIntegration);

    // /emergency/health
    const health = emergency.addResource('health');
    health.addMethod('GET', lambdaIntegration);

    // =================
    // CloudWatch Alarms
    // =================
    new cloudwatch.Alarm(this, 'EmergencyResponseTime', {
      metric: new cloudwatch.Metric({
        namespace: 'Serenity/Emergency',
        metricName: 'ResponseTime',
        statistic: 'Average'
      }),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });

    new cloudwatch.Alarm(this, 'CrisisDetected', {
      metric: new cloudwatch.Metric({
        namespace: 'Serenity/Emergency',
        metricName: 'CrisisEvents',
        statistic: 'Sum'
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // =================
    // CloudWatch Dashboard
    // =================
    new cloudwatch.Dashboard(this, 'EmergencyDashboard', {
      dashboardName: `EmergencySwarm-${props.environment}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Emergency Events',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Emergency',
                metricName: 'CrisisEvents',
                statistic: 'Sum'
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Response Times',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Emergency',
                metricName: 'ResponseTime',
                statistic: 'Average'
              })
            ]
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Escalation Levels',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Emergency',
                metricName: 'EscalationLevel',
                statistic: 'Maximum'
              })
            ]
          }),
          new cloudwatch.GraphWidget({
            title: 'Resources Deployed',
            left: [
              new cloudwatch.Metric({
                namespace: 'Serenity/Emergency',
                metricName: 'ResourcesDeployed',
                statistic: 'Sum'
              })
            ]
          })
        ]
      ]
    });

    // =================
    // Outputs
    // =================
    new cdk.CfnOutput(this, 'EmergencyAPIEndpoint', {
      value: this.api.url,
      description: 'Emergency Swarm API Endpoint'
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      description: 'Emergency State Machine ARN'
    });

    new cdk.CfnOutput(this, 'EmergencyTopicArn', {
      value: this.emergencyTopic.topicArn,
      description: 'Emergency Alert Topic ARN'
    });
  }
}
