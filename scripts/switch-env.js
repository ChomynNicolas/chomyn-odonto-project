#!/usr/bin/env node
/**
 * Environment Switcher
 * Copies the appropriate .env file to .env based on NODE_ENV
 */

const fs = require('fs');
const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';
const envFileMap = {
  development: '.env.development',
  production: '.env.production',
  test: '.env.test',
};

const sourceFile = envFileMap[nodeEnv] || '.env.development';
const targetFile = '.env';

const sourcePath = path.join(process.cwd(), sourceFile);
const targetPath = path.join(process.cwd(), targetFile);

if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Environment file not found: ${sourceFile}`);
  console.error(`   Please create ${sourceFile} based on .env.example`);
  process.exit(1);
}

try {
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`✅ Switched to ${nodeEnv} environment (${sourceFile} → .env)`);
} catch (error) {
  console.error(`❌ Failed to copy ${sourceFile} to .env:`, error.message);
  process.exit(1);
}

