'use strict';

const winston = require(`winston`);

winston.emitErrs = true;
const logger = new winston.Logger(
  {
    levels: {
      Error: 0,
      Warn: 1,
      Info: 2,
      Verbose: 3,
      Debug: 4,
      Silly: 5
    },
    colors: {
      Error: `red`,
      Warn: `yellow`,
      Info: `green`,
      Verbose: `cyan`,
      Debug: `blue`,
      Silly: `magenta`
    },
    transports: [
      new winston.transports.Console(
        {
          level: process.env.LB_LOGGING_LEVEL,
          colorize: true
        })
    ],
    handleExceptions: true,
    humanReadableUnhandledException: true,
    exitOnError: false,
    meta: true,
  });

module.exports = logger;
