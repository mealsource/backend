/* eslint-disable @typescript-eslint/no-non-null-assertion */
import prouter, { Request } from '../auth';
import { Response } from 'express';
import * as db from '../../db';
import app from '..';
import { sendOrder } from '../../firebase';
import * as Errors from '../errors';

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

prouter.post('/order/:orderId/accept', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId);
	if (!order) {
		res.status(404).json({
			error: 'Order not found',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (order.status !== db.OrderStatus.PENDING) {
		res.status(400).json({
			error: 'Order is not pending',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
	}
	order.deliveredBy = user!._id;
	order.status = db.OrderStatus.ACCEPTED;
	await order.save();
	sendOrder(order.toObject());
	res.json(order);
});

prouter.post('/order/:orderId/confirm', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId).populate<{ orderdBy: db.IUser }>('orderdBy');
	if (user != order!.orderdBy) {
		res.status(400).json({
			error: 'You are not the owner of this order',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (order!.status !== db.OrderStatus.ACCEPTED) {
		res.status(400).json({
			error: 'Order is not accepted',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
	}
	order!.status = db.OrderStatus.CONFIRMED;
	await order!.save();
	res.json(order);
});

prouter.post('/order/:orderId/reject', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId).populate<{ orderdBy: db.IUser }>('orderdBy');
	if (user != order!.orderdBy) {
		res.status(400).json({
			error: 'You are not the owner of this order',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (order!.status !== db.OrderStatus.ACCEPTED) {
		res.status(400).json({
			error: 'Order is not accepted',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
	}
	order!.status = db.OrderStatus.PENDING;
	order!.deliveredBy = undefined;
	sendOrder(order!.toObject());
	await order!.save();
});

prouter.post('/order', async (req: Request, res: Response) => {
	const Items: db.IInventoryItem[] = req.body['items'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno: rollno });
	const store = await db.Store.findById(Items[0].store);
	let price = 0;
	const dbItems = [];
	const quantities: number[] = [];
	for (const item of Items) {
		if (item.store != store?._id) {
			res.status(400).json({
				errorcode: Errors.ErrorCode.MULTIPLE_STORES,
				error: 'Items from multiple stores. Select only one store.',
			});
			return;
		}
		const dbItem = await db.InventoryItem.findOneAndUpdate(
			{ _id: item._id, quantity: { $gte: item.quantity } },
			{
				$inc: { quantity: -item.quantity },
			},
		);
		dbItems.push(dbItem);
		quantities.push(item.quantity);
		if (!dbItem?.quantity) {
			res.status(400).json({
				errorcode: Errors.ErrorCode.OUT_OF_STOCK,
				error: `${item.name} is out of stock.`,
			});
			return;
		}
		price += dbItem.price * item.quantity;
	}

	const order = new db.Order({
		orderdBy: user!._id,
		items: dbItems,
		total: price,
		quantities: quantities,
		store: store?._id,
	});
	await order.save();
	void sendOrder(order.toObject());
	res.json({
		success: true,
		orderId: order._id,
	});
});

//import { adminrouter } from './admin';
//prouter.use('/', adminrouter);
