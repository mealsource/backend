import 'dotenv/config';
import app from './express';
import logger from './logger';

const PORT: number = Number(process.env['PORT']) || 8080;
const ADDRESS: string = process.env['ADDRESS'] || '0.0.0.0';

app.listen(PORT, ADDRESS, () => {
	logger.info(`Server is running at ${ADDRESS}:${PORT}`);
});
