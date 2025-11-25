#!/usr/bin/env tsx
// scripts/migrate-odontograms.ts
import { runOdontogramMigration } from '../src/lib/migrations/odontogram-migration'

/**
 * CLI script to migrate odontogram data from consultation-specific to patient-level persistence
 * 
 * Usage:
 *   npm run migrate:odontograms -- --dry-run     # Simulate migration
 *   npm run migrate:odontograms -- --execute     # Execute migration
 *   npm run migrate:odontograms -- --execute --verbose  # Execute with detailed logging
 */

async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')
  const verbose = args.includes('--verbose')

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made')
    console.log('   Use --execute flag to perform actual migration')
  } else {
    console.log('⚠️  EXECUTING MIGRATION - changes will be made to the database')
    console.log('   Make sure you have a backup before proceeding')
    
    // Add a confirmation prompt in production
    if (process.env.NODE_ENV === 'production') {
      console.log('\n❌ Migration execution is disabled in production environment')
      console.log('   Please run this script in a development or staging environment first')
      process.exit(1)
    }
  }

  try {
    await runOdontogramMigration({ dryRun, verbose })
    process.exit(0)
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

main().catch(console.error)
