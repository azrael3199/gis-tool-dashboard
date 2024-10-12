// server/db.ts
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (process.env.DB_CONNECTION_STRING) {
      await mongoose.connect(process.env.DB_CONNECTION_STRING);
      console.log('MongoDB connected');
    } else {
      throw new Error('DB_CONNECTION_STRING is not defined');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

export default connectDB;
