#!/usr/bin/env node
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { App } from 'aws-cdk-lib';
import { AsxScraperStack } from '../lib/stack.js';

const app = new App();
new AsxScraperStack(app, 'AsxScraperStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
