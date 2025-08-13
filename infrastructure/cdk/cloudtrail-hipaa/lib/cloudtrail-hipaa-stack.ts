import { Stack, StackProps, aws_kms as kms, aws_s3 as s3, aws_logs as logs, aws_cloudtrail as cloudtrail, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CloudTrailHipaaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const trailName = 'serenity-hipaa-trail';
    const logsBucketName = process.env.CLOUDTRAIL_LOGS_BUCKET || 'serenity-logs-CHANGE-ME';
    const s3KeyPrefix = process.env.CLOUDTRAIL_S3_PREFIX || 'cloudtrail-logs';
    const phiBucketName = process.env.PHI_BUCKET || 'your-phi-bucket';

    const encryptionKey = new kms.Key(this, 'CloudTrailKmsKey', {
      description: 'KMS Key for CloudTrail encryption',
      enableKeyRotation: true,
    });

    encryptionKey.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowCloudTrailToUseKey',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudtrail.amazonaws.com')],
      actions: ['kms:GenerateDataKey*', 'kms:DescribeKey'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'aws:SourceArn': `arn:aws:cloudtrail:${this.region}:${this.account}:trail/${trailName}`,
        },
      },
    }));

    const logsBucket = new s3.Bucket(this, 'LogsBucket', {
      bucketName: logsBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      enforceSSL: true,
      versioned: true,
    });

    logsBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowCloudTrailDelivery',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudtrail.amazonaws.com')],
      actions: ['s3:PutObject'],
      resources: [logsBucket.arnForObjects(`${s3KeyPrefix}/AWSLogs/${this.account}/*`)],
      conditions: {
        StringEquals: {
          'aws:SourceArn': `arn:aws:cloudtrail:${this.region}:${this.account}:trail/${trailName}`,
          'aws:SourceAccount': this.account,
        },
      },
    }));

    const logGroup = new logs.LogGroup(this, 'CloudTrailLogGroup', {
      logGroupName: `/aws/cloudtrail/${trailName}`,
    });

    const deliveryRole = new iam.Role(this, 'CloudTrailToCloudWatchRole', {
      assumedBy: new iam.ServicePrincipal('cloudtrail.amazonaws.com'),
    });
    deliveryRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [logGroup.logGroupArn],
    }));

    const trail = new cloudtrail.Trail(this, 'SerenityCloudTrail', {
      trailName,
      bucket: logsBucket,
      s3KeyPrefix,
      enableFileValidation: true,
      isMultiRegionTrail: true,
      encryptionKey,
      cloudWatchLogGroup: logGroup,
      cloudWatchLogsRole: deliveryRole,
    });

    trail.addS3EventSelector([{ bucket: s3.Bucket.fromBucketName(this, 'PhiBucket', phiBucketName) }], {
      includeManagementEvents: true,
      readWriteType: cloudtrail.ReadWriteType.ALL,
    });
  }
}

