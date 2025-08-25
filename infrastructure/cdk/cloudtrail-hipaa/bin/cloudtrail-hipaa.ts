#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CloudTrailHipaaStack } from '../lib/cloudtrail-hipaa-stack';

const app = new App();

new CloudTrailHipaaStack(app, 'CloudTrailHipaaStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});


















