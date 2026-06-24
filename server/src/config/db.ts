import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      logger.warn('MongoDB URI not found, running without DB for now.');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
