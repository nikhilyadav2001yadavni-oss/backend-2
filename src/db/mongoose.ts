// Create mongoose connection here & export the connection instance.
import mongoose from 'mongoose';

mongoose.set('strictQuery', true);
mongoose.set('debug', false);

const connect = async (uri: string): Promise<void> => {
  const safeUri = uri.replace(/:\/\/[^@]+@/, '://<credentials>@');
  console.log(`Connecting to MongoDB: ${safeUri}`);
  try {
    await mongoose.connect(uri, {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    } as any);
    console.log('MongoDB connected successfully');
    // Drop non-sparse transactionHash index if it exists, so Mongoose recreates it as sparse
    try {
      const db = mongoose.connection.db;
      if (db) {
        const col = db.collection('transactions');
        const indexes = await col.indexes();
        const badIndex = indexes.find((i: any) => i.name === 'transactionHash_1' && !i.sparse);
        if (badIndex) {
          await col.dropIndex('transactionHash_1');
          console.log('Dropped non-sparse transactionHash_1 index — will be recreated as sparse');
        }
      }
    } catch (indexErr: any) {
      console.warn('Index fix skipped:', indexErr.message);
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error('MongoDB connection error:', err.message);
    } else {
      console.error('MongoDB connection error:', err);
    }
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

mongoose.connection.on('error', (err: Error) => {
  console.error('Mongoose connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed due to app termination');
  process.exit(0);
});

export default connect;