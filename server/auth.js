import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { col } from './db.js';
import { env } from './env.js';
import { sendOtpSms } from './sms.js';

const OTP_TTL_MS = 5 * 60_000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

const hash = (phone, code) => crypto.createHmac('sha256', env.jwtSecret).update(`${phone}:${code}`).digest('hex');
export const normalisePhone = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(d)) return '+91' + d;
  if (/^91[6-9]\d{9}$/.test(d)) return '+' + d;
  return null;
};

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function requestOtp(rawPhone) {
  const phone = normalisePhone(rawPhone);
  if (!phone) throw new HttpError(400, 'Enter a valid Indian mobile number.');
  const recent = await col('otps').countDocuments({ phone, createdAt: { $gt: new Date(Date.now() - 3_600_000) } });
  if (recent >= MAX_SENDS_PER_HOUR) throw new HttpError(429, 'Too many codes requested. Try again in an hour.');
  const code = env.testLogins[phone] || String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await col('otps').insertOne({ phone, hash: hash(phone, code), attempts: 0, createdAt: new Date(), expiresAt: new Date(Date.now() + OTP_TTL_MS) });
  if (!env.testLogins[phone]) await sendOtpSms(phone, code);
  return { ok: true };
}

export async function verifyOtp(rawPhone, code) {
  const phone = normalisePhone(rawPhone);
  if (!phone || !/^\d{6}$/.test(String(code))) throw new HttpError(400, 'Enter the 6-digit code.');
  const otp = await col('otps').findOne({ phone, expiresAt: { $gt: new Date() } }, { sort: { createdAt: -1 } });
  if (!otp) throw new HttpError(400, 'Code expired. Request a new one.');
  if (otp.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many attempts. Request a new code.');
  if (otp.hash !== hash(phone, code)) {
    await col('otps').updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    throw new HttpError(400, 'Incorrect code. Try again.');
  }
  await col('otps').deleteMany({ phone });
  const isAdmin = env.adminPhones.includes(phone);
  const { value: user } = await col('users').findOneAndUpdate(
    { phone },
    { $setOnInsert: { phone, name: '', email: '', gstin: '', businessName: '', createdAt: new Date() }, ...(isAdmin ? { $set: { isAdmin: true } } : {}) },
    { upsert: true, returnDocument: 'after', includeResultMetadata: true },
  );
  return { token: sign(user), user: publicUser(user) };
}

export const sign = (user) => jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: '30d' });

export const publicUser = (u) => ({
  id: String(u._id), phone: u.phone, name: u.name || '', email: u.email || '',
  gstin: u.gstin || '', businessName: u.businessName || '', isAdmin: !!u.isAdmin,
});

/** Express middleware: attaches req.user or responds 401. */
export function requireUser({ admin = false } = {}) {
  return async (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const { sub } = jwt.verify(token, env.jwtSecret);
      const { ObjectId } = await import('mongodb');
      const user = await col('users').findOne({ _id: new ObjectId(sub) });
      if (!user) return res.status(401).json({ error: 'Please sign in again.' });
      if (admin && !user.isAdmin) return res.status(403).json({ error: 'Admins only.' });
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Please sign in.' });
    }
  };
}
