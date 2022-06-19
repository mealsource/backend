/* eslint-disable @typescript-eslint/no-non-null-assertion */
import express from 'express';
import cookieParser from 'cookie-parser';
import { morganMiddleware } from '../logger';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morganMiddleware);
export default app;

import prouter from './auth';
import './routes';

app.use('/', prouter);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
//app.use((err, req, res, next) => {
//	if (err) {
//		logger.error(err);
//		res.status(500).send(err.message);
//		return;
//	}
//	next();
//});
