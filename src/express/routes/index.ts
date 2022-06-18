import prouter, { Request } from '../auth';
import { Response } from 'express';
import * as db from '../../db';
import app from '..';

export { app as app };
export { Request as Request };

prouter.get('/stores', async (req: Request, res: Response) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const stores = (await db.Store.find().lean()).map(({ inventory, ...store }) => store);
	res.json(stores);
});

prouter.get('/store/:storeId/inventory', async (req: Request, res: Response) => {
	const storeId = req.params['storeId'];
	const store = await db.Store.findById(storeId).populate<{
		inventory: db.IInventoryItem[];
	}>('inventory');

	const inventory = store?.inventory;
	res.json(inventory);
});

prouter.get('/orders', async (req: Request, res: Response) => {
	const orders = await db.Order.find({ status: db.OrderStatus.PENDING })
		.populate('items')
		.populate('orderdBy');
	res.json(orders);
});

prouter.post('/order', async (req: Request, res: Response) => {
	const Items: db.IInventoryItem[] = req.body['items'];
	const rollno = req.auth?.rollno;
	const user = db.User.findOne({ rollno: rollno });
	const store = await db.Store.findById(Items[0].store);
	let price = 0;
	const dbItems = [];
	for (const item of Items) {
		if (item.store != store?._id) {
			res.status(400).json({
				error: 'Items from multiple stores. Select only one store.',
			});
			return;
		}
		const dbItem = await db.InventoryItem.findById(item._id);
		dbItems.push(dbItem);
		if (!dbItem?.quantity || dbItem?.quantity <= 0) {
			res.status(400).json({
				errorCode: 2,
				error: `${item.name} is out of stock.`,
			});
			return;
		}
		dbItem.quantity--;
		dbItem.save();
		price += dbItem.price;
	}
	const order = new db.Order({
		orderdBy: user,
		items: dbItems,
		price: price,
		store: store?._id,
	});
	await order.save();
	res.json({
		success: true,
		orderId: order._id,
	});
});

//import { adminrouter } from './admin';
//prouter.use('/', adminrouter);
