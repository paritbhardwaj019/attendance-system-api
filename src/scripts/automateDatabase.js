const { execSync } = require('child_process');
const logger = require('../config/logger');

const COMMANDS = {
  RESET: 'npx prisma migrate reset --force',
  GENERATE: 'npx prisma generate',
  PUSH: 'npx prisma db push',
  STATUS: 'npx prisma migrate status',
};

const executeCommand = (command, description) => {
  try {
    logger.info(`Starting: ${description}`);
    execSync(command, { stdio: 'inherit' });
    logger.info(`Completed: ${description}`);
    return true;
  } catch (error) {
    logger.error(`Failed: ${description}`);
    logger.error(error.message);
    return false;
  }
};

const runDatabaseAutomation = async () => {
  logger.info('Starting database automation process...');

  if (!executeCommand(COMMANDS.STATUS, 'Checking migration status')) {
    logger.error('Failed to check migration status. Aborting process.');
    process.exit(1);
  }

  if (!executeCommand(COMMANDS.RESET, 'Resetting database')) {
    logger.error('Failed to reset database. Aborting process.');
    process.exit(1);
  }

  if (!executeCommand(COMMANDS.GENERATE, 'Generating Prisma Client')) {
    logger.error('Failed to generate Prisma Client. Aborting process.');
    process.exit(1);
  }

  if (!executeCommand(COMMANDS.PUSH, 'Pushing schema changes')) {
    logger.error('Failed to push schema changes. Aborting process.');
    process.exit(1);
  }

  logger.info('Database automation completed successfully! ✨');
};

if (require.main === module) {
  runDatabaseAutomation().catch((error) => {
    logger.error('Automation failed:', error);
    process.exit(1);
  });
}

module.exports = runDatabaseAutomation;
