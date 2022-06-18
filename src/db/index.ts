import mongoose from 'mongoose';

mongoose.connect(process.env['MONGODB_URI'] || 'mongodb://localhost/test');

export * from './Model';
