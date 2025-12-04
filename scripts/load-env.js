#!/usr/bin/env node
/**
 * Environment Loader Script
 * Loads the appropriate .env file based on NODE_ENV
 * Usage: node scripts/load-env.js <command>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';
const envFileMap = {
  development: '.env.development',
  production: '.env.production',
  test: '.env.test',
};

const envFile = envFileMap[nodeEnv] || '.env.development';
const envFilePath = path.join(process.cwd(), envFile);

// Check if env file exists
if (!fs.existsSync(envFilePath)) {
  console.error(`❌ Environment file not found: ${envFile}`);
  console.error(`   Please create ${envFile} based on .env.example`);
  process.exit(1);
}

// Load environment variables from the file
const envContent = fs.readFileSync(envFilePath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Expand variables like ${POSTGRES_USER}
      value = value.replace(/\${([^}]+)}/g, (_, varName) => {
        return process.env[varName] || envVars[varName] || '';
      });
      
      envVars[key] = value;
      process.env[key] = value;
    }
  }
});

// Execute the command passed as arguments
const command = process.argv.slice(2).join(' ');
if (command) {
  try {
    execSync(command, { stdio: 'inherit', env: { ...process.env, ...envVars } });
  } catch (error) {
    process.exit(error.status || 1);
  }
} else {
  console.log(`✅ Loaded environment from ${envFile}`);
  console.log(`   NODE_ENV: ${nodeEnv}`);
}

