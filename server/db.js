import { MongoClient } from 'mongodb';
import { env } from './env.js';

let client;
let db;

export async function connect(url = env.mongoUrl) {
  if (db) return db;
  client = new MongoClient(url);
  await client.connect();
  db = client.db();
  await Promise.all([
    db.collection('users').createIndex({ phone: 1 }, { unique: true }),
    db.collection('otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('otps').createIndex({ phone: 1 }),
    db.collection('addresses').createIndex({ userId: 1 }),
    db.collection('orders').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('orders').createIndex({ status: 1, createdAt: -1 }),
    db.collection('wallet_txns').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('products').createIndex({ categoryId: 1 }),
    db.collection('payments').createIndex({ userId: 1 }),
  ]);
  return db;
}

export const col = (name) => db.collection(name);
export const getClient = () => client;

export async function close() {
  await client?.close();
  client = undefined;
  db = undefined;
}

/** Run fn inside a transaction when the server supports it (replica set / Atlas), else directly. */
export async function withTxn(fn) {
  const session = client.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => { result = await fn(session); });
    } catch (e) {
      if (/Transaction numbers are only allowed|replica set/i.test(e.message)) return await fn(undefined);
      throw e;
    }
    return result;
  } finally {
    await session.endSession();
  }
}
