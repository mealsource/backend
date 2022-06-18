import winston from 'winston';

const levels = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	debug: 4,
};

const level = () => {
	const env = process.env.NODE_ENV || 'development';
	const isDevelopment = env === 'development';
	return isDevelopment ? 'debug' : 'warn';
};

const colors = {
	error: 'red',
	warn: 'yellow',
	info: 'green',
	http: 'magenta',
	debug: 'grey',
};

winston.addColors(colors);

const formatter = winston.format.combine(
	winston.format.timestamp({
		format: 'YYYY-MM-DD HH:mm:ss',
	}),
	winston.format.errors({ stack: true }),
	winston.format((info) => {
		if (typeof info.message === 'object') {
			info.message = JSON.stringify(info.message);
		}
		return info;
	})(),
	winston.format.splat(),
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	winston.format.printf(
		(info) => `${info.timestamp} [${info.Module}] ${info.level}: ${info.message}`,
	),
);

const logger = winston.createLogger({
	level: level(),
	levels: levels,
	format: formatter,
	defaultMeta: { Module: 'DEFAULT' },
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(formatter, winston.format.colorize({ all: true })),
		}),
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
		new winston.transports.File({ filename: 'combined.log' }),
	],
});

export function customChild(
	logger: winston.Logger,
	defaultMeta: Record<string, unknown>,
): winston.Logger {
	const childLogger = logger.child(defaultMeta);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	childLogger.defaultMeta = { ...logger.defaultMeta, ...defaultMeta };
	return childLogger;
}

export { morganMiddleware } from './morgan';
export default logger;
