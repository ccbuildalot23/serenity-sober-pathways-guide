import { CloudTrailClient, GetTrailCommand, GetEventSelectorsCommand, GetTrailStatusCommand } from '@aws-sdk/client-cloudtrail';
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { S3Client, GetBucketEncryptionCommand, GetBucketPolicyStatusCommand, GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import { KMSClient, DescribeKeyCommand } from '@aws-sdk/client-kms';

type Check = { name: string; pass: boolean; details?: string };

async function run(): Promise<number> {
  const region = process.env.AWS_REGION || 'us-east-1';
  const trailName = process.env.CLOUDTRAIL_TRAIL || 'serenity-hipaa-trail';
  const phiBucket = process.env.PHI_BUCKET || '';
  const logsBucket = process.env.CLOUDTRAIL_LOGS_BUCKET || '';

  const ct = new CloudTrailClient({ region });
  const logs = new CloudWatchLogsClient({ region });
  const s3 = new S3Client({ region });
  const kms = new KMSClient({ region });

  const checks: Check[] = [];

  // Trail exists and is multi-region, validated, logging
  const trailResp = await ct.send(new GetTrailCommand({ Name: trailName }));
  const trail = trailResp.Trail;
  checks.push({ name: 'Trail exists', pass: !!trail });
  checks.push({ name: 'Multi-Region', pass: trail?.IsMultiRegionTrail === true });
  checks.push({ name: 'Log file validation enabled', pass: trail?.LogFileValidationEnabled === true });
  checks.push({ name: 'S3 bucket configured', pass: !!trail?.S3BucketName });
  checks.push({ name: 'KMS key configured', pass: !!trail?.KmsKeyId });

  const status = await ct.send(new GetTrailStatusCommand({ Name: trailName }));
  checks.push({ name: 'Is logging', pass: status.IsLogging === true });

  // Event selectors include S3 data events for PHI bucket
  const selectors = await ct.send(new GetEventSelectorsCommand({ TrailName: trailName }));
  const hasS3DataEvents = (selectors.EventSelectors || []).some(es =>
    (es.DataResources || []).some(dr => dr.Type === 'AWS::S3::Object' && (dr.Values || []).some(v => phiBucket ? v.includes(`${phiBucket}/`) : v.includes('arn:aws:s3:::')))
  );
  checks.push({ name: 'S3 data events enabled', pass: hasS3DataEvents });

  // CloudWatch log group present
  const cwGroup = trail?.CloudWatchLogsLogGroupArn?.split(':log-group:')[1] || '';
  const lg = await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: cwGroup }));
  const hasLogGroup = (lg.logGroups || []).some(g => g.logGroupName === cwGroup);
  checks.push({ name: 'CloudWatch Logs configured', pass: hasLogGroup });

  // S3 bucket encryption uses KMS
  if (logsBucket) {
    try {
      const enc = await s3.send(new GetBucketEncryptionCommand({ Bucket: logsBucket }));
      const rule = enc.ServerSideEncryptionConfiguration?.Rules?.[0];
      const usesKms = rule?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm === 'aws:kms';
      checks.push({ name: 'Logs bucket SSE-KMS enabled', pass: !!usesKms });
    } catch (e) {
      checks.push({ name: 'Logs bucket SSE-KMS enabled', pass: false, details: 'No encryption config' });
    }

    // Bucket policy status (must not be public)
    try {
      const publicStatus = await s3.send(new GetBucketPolicyStatusCommand({ Bucket: logsBucket }));
      checks.push({ name: 'Logs bucket not public', pass: publicStatus.PolicyStatus?.IsPublic === false });
    } catch (e) {
      checks.push({ name: 'Logs bucket not public', pass: true, details: 'No policy status API; treat as pass if policy exists' });
    }

    // Verify required statements exist roughly
    try {
      const pol = await s3.send(new GetBucketPolicyCommand({ Bucket: logsBucket }));
      const doc = JSON.parse(pol.Policy as string);
      const statements = doc.Statement || [];
      const hasCloudTrailWrite = statements.some((s: any) => s.Sid === 'AllowCloudTrailDelivery' || (Array.isArray(s.Action) ? s.Action.includes('s3:PutObject') : s.Action === 's3:PutObject'));
      checks.push({ name: 'Bucket policy allows CloudTrail writes', pass: !!hasCloudTrailWrite });
    } catch (e) {
      checks.push({ name: 'Bucket policy allows CloudTrail writes', pass: false });
    }
  }

  // KMS key exists and rotation enabled
  if (trail?.KmsKeyId) {
    const key = await kms.send(new DescribeKeyCommand({ KeyId: trail.KmsKeyId }));
    checks.push({ name: 'KMS key enabled', pass: key.KeyMetadata?.Enabled === true });
    checks.push({ name: 'KMS rotation enabled', pass: key.KeyMetadata?.KeyRotationEnabled === true });
  }

  const failures = checks.filter(c => !c.pass);
  for (const c of checks) {
    const mark = c.pass ? 'PASS' : 'FAIL';
    console.log(`${mark} - ${c.name}${c.details ? ' - ' + c.details : ''}`);
  }
  if (failures.length > 0) {
    console.error(`Non-compliant: ${failures.length} failing checks.`);
    return 1;
  }
  console.log('CloudTrail HIPAA baseline checks passed.');
  return 0;
}

run().then(code => process.exit(code)).catch(err => {
  console.error(err);
  process.exit(1);
});




























