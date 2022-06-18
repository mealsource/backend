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
