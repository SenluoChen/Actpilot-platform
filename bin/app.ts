#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AiActMvpStack } from '../lib/ai-act-mvp-stack';

const app = new cdk.App();
new AiActMvpStack(app, 'AiActMvpStack', {
  /* Optionally lock env:
  // env: { account: '123456789012', region: 'eu-west-3' },
  */
});
