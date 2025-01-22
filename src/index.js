require('dotenv').config();
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const db = require('./database/prisma');

let server;

db.$connect()
  .then(async () => {
    logger.info('Connected to MySQL database');

    server = app.listen(config.port, () => {
      logger.info(`Listening to port ${config.port}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to the database', error);
    process.exit(1);
  });

const exitHandler = () => {
  if (server) {
    server.close(async () => {
      logger.info('Server closed');
      await db.$disconnect();
      process.exit(1);
    });
  } else {
    db.$disconnect().then(() => {
      process.exit(1);
    });
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close(async () => {
      logger.info('Server closed');
      await db.$disconnect();
    });
  } else {
    db.$disconnect();
  }
});
