import mongoose from "mongoose";

enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  DELIVERED = "delivered",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

enum PaymentStatus {
  PENDING = "pending",
  CONFIRMED_BY_CUSTOMER = "confirmed_by_customer",
  CONFIRMED_BY_MERCHANT = "confirmed_by_merchant",
  CONFIRMED_BY_BOTH = "confirmed_by_both",
}

interface IUser {
  name: string;
  email: string;
  rollno: string;
  rating: number;
}

const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  rollno: { type: String, required: true },
  rating: { type: Number },
});

export const User = mongoose.model<IUser>("User", UserSchema);

interface IInventoryItem {
  name: string;
  quantity: number;
  price: number;
  description: string;
  store: mongoose.Schema.Types.ObjectId;
}

interface IStore {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  inventory: mongoose.Schema.Types.ObjectId[];
}

const InventoryItemSchema = new mongoose.Schema<IInventoryItem>({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  store: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Store" },
});

export const InventoryItem = mongoose.model<IInventoryItem>(
  "InventoryItem",
  InventoryItemSchema
);

const StoreSchema = new mongoose.Schema<IStore>({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius: { type: Number, required: true },
  inventory: [{ type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem" }],
});

export const Store = mongoose.model<IStore>("Store", StoreSchema);

interface IOrder {
  orderdBy: mongoose.Types.ObjectId;
  orderdAt: Date;
  items: mongoose.Types.ObjectId[];
  deliveredBy: mongoose.Types.ObjectId;
  deliveredAt: Date;
  status: OrderStatus;
  store: mongoose.Types.ObjectId;
  total: number;
  paid: PaymentStatus;
}

const OrderSchema = new mongoose.Schema<IOrder>({
  orderdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  orderdAt: { type: Date, required: true },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "InventoryItem",
    },
  ],
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  deliveredAt: { type: Date, required: true },
  status: { type: String, enum: Object.values(OrderStatus), required: true },
  store: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Store" },
  total: { type: Number, required: true },
  paid: { type: String, enum: Object.values(PaymentStatus), required: true },
});

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
