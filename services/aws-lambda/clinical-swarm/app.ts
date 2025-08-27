#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClinicalSwarmStackStack } from './clinical-swarm-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'staging';
new ClinicalSwarmStackStack(app, `ClinicalSwarmStackStack-${environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  },
  environment: environment
});
