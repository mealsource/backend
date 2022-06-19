import * as firebase from 'firebase-admin';
import * as serviceAccount from '../secrets/firebase.json';
import * as db from '../db';
import logger from '../logger';

const params = {
	type: serviceAccount.type,
	projectId: serviceAccount.project_id,
	privateKeyId: serviceAccount.private_key_id,
	privateKey: serviceAccount.private_key,
	clientEmail: serviceAccount.client_email,
	clientId: serviceAccount.client_id,
	authUri: serviceAccount.auth_uri,
	tokenUri: serviceAccount.token_uri,
	authProviderX509CertUrl: serviceAccount.auth_provider_x509_cert_url,
	clientC509CertUrl: serviceAccount.client_x509_cert_url,
};

firebase.initializeApp({ credential: firebase.credential.cert(params) });

export const sendOrder = async (order: db.IOrder) => {
	const topic = 'orders';
	const message = {
		data: {
			order: JSON.stringify(order),
		},
		topic: topic,
	};
	try {
		logger.info(`Sending order to topic ${topic}`);
		return await firebase.messaging().send(message);
	} catch (error) {
		logger.error(`Error sending order to topic ${topic}: ${error}`);
	}
};
