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
	const stores = await db.Store.find().populate('inventory');
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
	const orders = await db.Order.find({
		status: db.OrderStatus.PENDING,
		rollno: { $ne: req.auth?.rollno },
	})
		.populate('items')
		.populate('orderedBy')
		.populate('store');
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
		return;
	}
	if (user?.currentDelivery) {
		res.status(400).json({
			error: 'You are already delivering',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	order.deliveredBy = user!._id;
	order.status = db.OrderStatus.ACCEPTED;
	await order.save();
	user!.currentDelivery = order._id;
	await user?.save();
	sendOrder(order.toObject());
	res.json(order);
});

prouter.post('/order/:orderId/confirm', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId).populate<{ orderedBy: db.IUser }>('orderedBy');
	if (user!.rollno != order!.orderedBy.rollno) {
		res.status(400).json({
			error: 'You are not the owner of this order',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (order!.status != db.OrderStatus.ACCEPTED) {
		res.status(400).json({
			error: 'Order is not accepted',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	order!.status = db.OrderStatus.CONFIRMED;
	await order!.save();
	res.json(order);
});

prouter.post('/order/:orderId/reject', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId)
		.populate<{ orderedBy: db.IUser }>('orderedBy')
		.populate('deliveredBy');
	if (user!.rollno != order!.orderedBy.rollno) {
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
	await db.User.findByIdAndUpdate(order!.deliveredBy, { $set: { currentDelivery: null } });
	order!.deliveredBy = undefined;
	sendOrder(order!.toObject());
	await order!.save();
	res.json(order);
});

prouter.post('/order/:orderId/cancel', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId).populate<{ orderedBy: db.IUser }>('orderedBy');
	if (user != order!.orderedBy) {
		res.status(400).json({
			error: 'You are not the owner of this order',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (order!.status != db.OrderStatus.PENDING && order!.status != db.OrderStatus.ACCEPTED) {
		res.status(400).json({
			error: 'Order is not pending',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	order!.status = db.OrderStatus.CANCELLED;
	await order!.save();
	res.json(order);
});

prouter.get('/currentorder', async (req: Request, res: Response) => {
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno: rollno })
		.populate<{ currentOrder: db.IOrder }>('currentOrder')
		.populate<{ currentDelivery: db.IOrder }>('currentDelivery');
	if (user!.currentOrder) {
		const order = await db.Order.findById(user!.currentOrder)
			.populate('items')
			.populate('store')
			.populate('orderedBy')
			.populate('deliveredBy');
		res.json({ type: 'order', order: order });
	} else if (user!.currentDelivery) {
		const order = await db.Order.findById(user!.currentDelivery)
			.populate('items')
			.populate('store')
			.populate('orderedBy')
			.populate('deliveredBy');
		res.json({ type: 'delivery', order: order });
	} else {
		res.json({ type: 'none' });
	}
});

prouter.post('/order', async (req: Request, res: Response) => {
	let Items: db.IInventoryItem[] = req.body['items'];
	if (!req.body.destination) {
		res.status(400).json({
			error: 'Destination is required',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	Items = [...new Set(Items)];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno: rollno })
		.populate<{ currentOrder: db.IOrder }>('currentOrder')
		.populate<{ currentDelivery: db.IOrder }>('currentDelivery');
	if (user!.currentDelivery) {
		res.status(400).json({
			error: 'You have a delivery in progress',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (user!.currentOrder) {
		res.status(400).json({
			error: 'You have an order in progress',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
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
		const dbItem = await db.InventoryItem.findOneAndUpdate({ _id: item._id }, {});
		dbItems.push(dbItem);
		quantities.push(item.quantity);
		if (!dbItem?.quantity) {
			res.status(400).json({
				errorcode: Errors.ErrorCode.OUT_OF_STOCK,
				error: `${item.name} is out of stock.`,
			});
			return;
		}
		price += dbItem.price;
	}
	price += (price * 5) / 100;

	const order = new db.Order({
		orderedBy: user!._id,
		items: dbItems,
		total: price,
		quantities: quantities,
		store: store?._id,
		destination: req.body['destination'],
	});
	await order.save();
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	user!.currentOrder = order._id;
	await user!.save();
	sendOrder(order.toObject());
	res.json({
		success: true,
		orderId: order._id,
	});
});

prouter.post('/order/:orderId/deliver', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId)
		.populate<{ orderedBy: db.IUser }>('orderedBy')
		.populate<{ deliveredBy: db.IUser }>('deliveredBy');
	if (user!.rollno != order!.deliveredBy.rollno) {
		res.status(400).json({
			error: 'You are not the owner of this order',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (order!.status != db.OrderStatus.CONFIRMED) {
		res.status(400).json({
			error: 'Order is not confirmed',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	order!.status = db.OrderStatus.DELIVERED;
	await order!.save();
	res.json(order);
});

prouter.post('/order/:orderId/payment/received', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId)
		.populate<{ orderedBy: db.IUser }>('orderedBy')
		.populate<{ deliveredBy: db.IUser }>('deliveredBy');
	if (user!.rollno != order!.deliveredBy.rollno) {
		res.status(400).json({
			error: 'You are not the owner of this order',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (order!.status != db.OrderStatus.PAID) {
		res.status(400).json({
			error: 'Order is not paid',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	order!.status = db.OrderStatus.DONE;
	await order!.save();
	await db.User.findOneAndUpdate(
		{ rollno: order!.orderedBy.rollno },
		{ $set: { currentOrder: null } },
	);
	await db.User.findOneAndUpdate(
		{ rollno: order!.deliveredBy.rollno },
		{ $set: { currentDelivery: null } },
	);
	res.json(order);
});

prouter.post('/order/:orderId/payment/sent', async (req: Request, res: Response) => {
	const orderId = req.params['orderId'];
	const rollno = req.auth?.rollno;
	const user = await db.User.findOne({ rollno });
	const order = await db.Order.findById(orderId)
		.populate<{ orderedBy: db.IUser }>('orderedBy')
		.populate<{ deliveredBy: db.IUser }>('deliveredBy');
	if (user!.rollno != order!.orderedBy.rollno) {
		res.status(400).json({
			error: 'You are not the owner of this order',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	if (order!.status != db.OrderStatus.DELIVERED) {
		res.status(400).json({
			error: 'Order is not delivered',
			errorcode: Errors.ErrorCode.INVALID_ORDER,
		});
		return;
	}
	order!.status = db.OrderStatus.PAID;
	await order!.save();
	res.json(order);
});

//import { adminrouter } from './admin';
//prouter.use('/', adminrouter);
