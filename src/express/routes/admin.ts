import { Router, Response } from 'express';
import * as db from '../../db';
import { Request } from '.';
import { guard } from '../auth';
import { HydratedDocument } from 'mongoose';

const adminrouter = Router();
adminrouter.use(guard.check('admin'));

adminrouter.post('/store', async (req: Request, res: Response) => {
	const newStore = new db.Store({
		name: req.body.name,
		latitude: req.body.latitude,
		longitude: req.body.longitude,
		radius: req.body.radius,
	});
	await newStore.save();
	res.send(newStore);
});

adminrouter.put('/store/:id/inventory', async (req: Request, res: Response) => {
	const store = await db.Store.findById(req.params.id).populate<{
		inventory: HydratedDocument<db.IInventoryItem>[];
	}>('inventory');
	let item = store?.inventory.filter(
		(i) => i.name === req.body.name,
	)[0] as HydratedDocument<db.IInventoryItem>;
	if (!item) {
		item = new db.InventoryItem({
			name: req.body.name,
			price: req.body.price,
			quantity: req.body.quantity,
			description: req.body.description,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			store: store!._id,
		});
		await item.save();
		store?.inventory.push(item);
		await store?.save();
	}
	res.json(item);
});

export { adminrouter };
