import { Config } from 'sst/node/config';
import mongoose from 'mongoose';

export const connectToDB = async () => await mongoose.connect(Config.DB_CONNECTION);
