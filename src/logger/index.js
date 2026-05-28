import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// const jsonFormat = winston.format.combine(
//   winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]' }),
//   winston.format.errors({ stack: true }),
//   winston.format.json()
// );

// const logger = winston.createLogger({
//   level: process.env.LOG_LEVEL || 'debug',
//   format: jsonFormat,
//   transports: [
//     // Stdout
//     new winston.transports.Console(),

//     // Rotating file - logs/app.log
//     new DailyRotateFile({
//       dirname: 'logs',
//       filename: 'app-%DATE%.log',
//       datePattern: 'YYYY-MM-DD',
//       maxSize: '20m',
//       maxFiles: '14d'
//     })
//   ]
// });

// export default logger;

const { combine, timestamp, errors, printf } = winston.format;

const flatJson = printf((info) => {
  const { level, message, timestamp, ...rest } = info;

  // Agar message object hai toh spread karo
  const flat = typeof message === 'object'
    ? { level, timestamp, ...message }
    : { level, timestamp, message, ...rest };

  return JSON.stringify(flat);
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]' }),
    errors({ stack: true }),
    flatJson
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      dirname: 'logs',
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

export default logger;