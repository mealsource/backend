import prouter, { Request } from './auth';
import { Response } from 'express';
import * as db from '../db';

prouter.get('/stores', async (req: Request, res: Response) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const stores = (await db.Store.find()).map(({ inventory, ...others }) => others);
	res.json(stores);
});

prouter.get('/inventory/:storeId', async (req: Request, res: Response) => {
	const storeId = req.params['storeId'];
	const store = await db.Store.findOne({ _id: storeId }).populate<{
		inventory: db.IInventoryItem[];
	}>('inventory');

	const inventory = store?.inventory;
	res.json(inventory);
});
