#!/usr/bin/env ts-node
import { rollbackMigration } from './migrate';
import { closeDatabase } from './index';

// CLI entry point for rollback
if (require.main === module) {
  try {
    rollbackMigration();
  } finally {
    closeDatabase();
  }
}
