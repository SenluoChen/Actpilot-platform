#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables for CDK synth/deploy so values like OPENAI_API_KEY
// get passed into Lambda environment configuration.
// Preference order:
// 1) backend/.env
// 2) repo-root .env
(() => {
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env')
  ];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (envPath) {
    loadEnv({ path: envPath });
  }
})();

const app = new cdk.App();
new BackendStack(app, 'AiActLayeredBackend', {
  // env: { account: '123456789012', region: 'eu-west-3' },
});

new FrontendStack(app, 'AiActLayeredFrontend', {
  // env: { account: '123456789012', region: 'eu-west-3' },
});
