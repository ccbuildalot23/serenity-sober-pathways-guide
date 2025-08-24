#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EmergencySwarmStackStack } from './emergency-swarm-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'staging';
new EmergencySwarmStackStack(app, `EmergencySwarmStackStack-${environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  },
  environment: environment
});
