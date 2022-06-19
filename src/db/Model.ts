import mongoose from 'mongoose';

export enum OrderStatus {
	PENDING = 'pending',
	CONFIRMED = 'confirmed',
	CANCELLED = 'cancelled',
	DELIVERED = 'delivered',
	ACCEPTED = 'accepted',
	REJECTED = 'rejected',
	PAID = 'paid',
	DONE = 'done',
}

export enum PaymentStatus {
	PENDING = 'pending',
	CONFIRMED_BY_CUSTOMER = 'confirmed_by_customer',
	CONFIRMED_BY_MERCHANT = 'confirmed_by_merchant',
	CONFIRMED_BY_BOTH = 'confirmed_by_both',
}

export interface IUser {
	name: string;
	email: string;
	rollno: string;
	rating: number;
	admin: boolean;
	currentOrder?: mongoose.Types.ObjectId;
	currentDelivery?: mongoose.Types.ObjectId;
}

const UserSchema = new mongoose.Schema<IUser>({
	name: { type: String, required: true },
	email: { type: String, required: true },
	rollno: { type: String, required: true, unique: true },
	rating: { type: Number },
	admin: { type: Boolean, default: false },
	currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
	currentDelivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
});

export interface IUUIDCookie {
	uuid: string;
	user: mongoose.Types.ObjectId;
}

const UUIDCookieSchema = new mongoose.Schema<IUUIDCookie>({
	uuid: { type: String, required: true, unique: true },
	user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
});

export const UUIDMapping = mongoose.model('UUIDMapping', UUIDCookieSchema);

export const User = mongoose.model<IUser>('User', UserSchema);

export interface IInventoryItem {
	_id: mongoose.Types.ObjectId;
	name: string;
	quantity: number;
	price: number;
	description: string;
	store: mongoose.Types.ObjectId;
}

export interface IStore {
	name: string;
	latitude: number;
	longitude: number;
	radius: number;
	inventory: mongoose.Types.ObjectId[];
}

const InventoryItemSchema = new mongoose.Schema<IInventoryItem>({
	name: { type: String, required: true },
	quantity: { type: Number, required: true },
	price: { type: Number, required: true },
	description: { type: String, required: true },
	store: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Store' },
});

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);

const StoreSchema = new mongoose.Schema<IStore>({
	name: { type: String, required: true },
	latitude: { type: Number, required: true },
	longitude: { type: Number, required: true },
	radius: { type: Number, required: true },
	inventory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }],
});

export const Store = mongoose.model<IStore>('Store', StoreSchema);

export interface IOrder {
	orderedBy: mongoose.Types.ObjectId;
	orderdAt: Date;
	items: mongoose.Types.ObjectId[];
	deliveredBy?: mongoose.Types.ObjectId;
	deliveredAt?: Date;
	status: OrderStatus;
	store: mongoose.Types.ObjectId;
	total: number;
	quantities: number[];
	paid: PaymentStatus;
	destination: string;
}

const OrderSchema = new mongoose.Schema<IOrder>({
	orderedBy: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'User',
	},
	orderdAt: { type: Date, required: true, default: () => new Date() },
	items: [
		{
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'InventoryItem',
		},
	],
	quantities: [{ type: Number, required: true }],
	deliveredBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
	},
	deliveredAt: { type: Date },
	status: {
		type: String,
		enum: Object.values(OrderStatus),
		required: true,
		default: OrderStatus.PENDING,
	},
	store: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Store' },
	total: { type: Number, required: true },
	paid: {
		type: String,
		enum: Object.values(PaymentStatus),
		required: true,
		default: PaymentStatus.PENDING,
	},
	destination: { type: String, required: true },
});

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
