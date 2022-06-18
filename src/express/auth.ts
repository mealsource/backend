import app from '.';
import { Request, Response, Router } from 'express';

import { expressjwt } from 'express-jwt';
import * as db from '../db';
import jwt from 'jsonwebtoken';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CAS = require('cas');
import logger from '../logger';

const prouter = Router();
prouter.use(
	expressjwt({
		secret: process.env.JWT_SECRET || 'CHANGEYOURSECRET',
		algorithms: ['HS256'],
	}),
);

const cas = new CAS({
	base_url: process.env['CAS_URL'],
	service: `${process.env['BASE_URL']}/login`,
	version: 2.0,
});

interface IExtended {
	username: string;
	attributes: {
		rollno: string[];
		'e-mail': string[];
		isfromnewlogin: string[];
		authenticationdate: string[];
		firstname: string[];
		successfulauthenticationhandlers: string[];
		name: string[];
		credentialtype: string[];
		uid: string[];
		authenticationmethod: string[];
		longtermauthenticationrequesttokenused: string[];
		lastname: string[];
	};
	PGTIOU: string;
	ticket: string;
	proxies: string[];
}

app.get('/login', (req: Request, res: Response) => {
	if (req.query.ticket) {
		cas.validate(
			req.query.ticket,
			async (err: unknown, status: unknown, username: string, extended: IExtended) => {
				if (err) {
					res.status(500).send(err);
					logger.error('ERRORRED');
					logger.error(err);
					return;
				}
				if (!status) {
					res.status(401).send('Invalid ticket');
					return;
				}
				const uuid_cokkie: string = req.cookies.uuid;
				let user = await db.User.findOne({
					rollno: extended.attributes.rollno[0],
				});
				if (!user) {
					user = new db.User({
						rollno: extended.attributes.rollno[0],
						name: extended.attributes.name[0],
						email: extended.attributes['e-mail'][0],
					});
					await user.save();
				}
				const uuid_mapping = new db.UUIDMapping({
					uuid: uuid_cokkie,
					user: user._id,
				});
				await uuid_mapping.save();
				res.send('You are logged in! Go back to the app.');
			},
		);
		return;
	}
	if (!req.query.uuid) {
		res.status(400).send('No uuid provided');
		return;
	}
	const uuid_cokkie: string = req.query.uuid as string;
	res.cookie('uuid', uuid_cokkie, { maxAge: 1000 * 60 * 60 * 1 });
	res.redirect(`${process.env['CAS_URL']}/login?service=${process.env['BASE_URL']}/login`);
});

app.get('/token', async (req: Request, res: Response) => {
	const uuid_cokkie: string = req.query.uuid as string;
	const uuid_mapping = await db.UUIDMapping.findOne({
		uuid: uuid_cokkie,
	}).populate<{ user: db.IUser }>('user');
	if (!uuid_mapping) {
		res.status(400).send("UUID doesn't exist");
		return;
	}
	const user = uuid_mapping.user;
	const token = jwt.sign(
		{
			rollno: user.rollno,
		},
		process.env.JWT_SECRET || 'CHANGEYOURSECRET',
		{
			expiresIn: '30d',
		},
	);
	res.json({
		token: token,
		name: user.name,
		rollno: user.rollno,
		email: user.email,
	});
	await uuid_mapping.delete();
});

export { Request } from 'express-jwt';
export default prouter;
