#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PeerSupportSwarmStack } from './peer-swarm-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'staging';

new PeerSupportSwarmStack(app, `PeerSupportSwarmStack-${environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  },
  environment: environment,
  enableXRay: app.node.tryGetContext('enableXRay') === 'true',
  enableWAF: app.node.tryGetContext('enableWAF') === 'true',
  description: `Peer Support Swarm Stack for ${environment} environment`
});