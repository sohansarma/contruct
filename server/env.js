// Server configuration from environment variables (see .env.example).
const bool = (v) => ['1', 'true', 'yes'].includes(String(v || '').toLowerCase());
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

export const env = {
  port: Number(process.env.PORT || 8080),
  production: process.env.NODE_ENV === 'production',
  mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/buildrun',
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-me'),
  corsOrigins: ['capacitor://localhost', 'http://localhost', 'https://localhost', ...list(process.env.CORS_ORIGINS)],
  adminPhones: list(process.env.ADMIN_PHONES), // e.g. +919876543210
  // SMS: 'msg91' | 'twilio' | 'console' (logs the code — development only)
  smsProvider: process.env.SMS_PROVIDER || 'console',
  msg91: { authKey: process.env.MSG91_AUTH_KEY, templateId: process.env.MSG91_TEMPLATE_ID },
  twilio: { sid: process.env.TWILIO_ACCOUNT_SID, token: process.env.TWILIO_AUTH_TOKEN, from: process.env.TWILIO_FROM },
  // Fixed-code logins for app-store reviewers / QA, e.g. "+919999999999:123456"
  testLogins: Object.fromEntries(list(process.env.TEST_LOGINS).map((x) => x.split(':'))),
  razorpay: { keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET },
  allowMockPayments: bool(process.env.ALLOW_MOCK_PAYMENTS),
  serveStatic: process.env.SERVE_STATIC !== '0',
};

export function assertProductionConfig() {
  if (!env.production) return;
  const missing = [];
  if (!env.jwtSecret || env.jwtSecret.length < 32) missing.push('JWT_SECRET (32+ chars)');
  if (env.smsProvider === 'console') missing.push('SMS_PROVIDER (msg91 or twilio)');
  if (!env.razorpay.keyId || !env.razorpay.keySecret) missing.push('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET');
  if (env.allowMockPayments) missing.push('ALLOW_MOCK_PAYMENTS must be off');
  if (missing.length) throw new Error('Missing production config: ' + missing.join(', '));
}
