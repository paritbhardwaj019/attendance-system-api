const winston = require('winston');
const config = require('./config');

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const formatArgs = (args) => {
  return args
    .map((arg) => {
      if (typeof arg === 'string' || typeof arg === 'number') {
        return arg;
      }
      return JSON.stringify(arg, null, 2);
    })
    .join(' ');
};

const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    enumerateErrorFormat(),
    config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.printf(({ level, message, ...rest }) => {
      const args = Object.values(rest).filter((arg) => arg !== undefined);
      const formattedArgs = args.length ? ` ${formatArgs(args)}` : '';
      return `${level} - ${message}${formattedArgs}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

module.exports = logger;
