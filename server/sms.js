// OTP delivery. India requires DLT-registered templates: create one in your
// MSG91 (or Twilio) account containing the variable for the code.
import { env } from './env.js';

export async function sendOtpSms(phone, code) {
  if (env.smsProvider === 'msg91') {
    const r = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: env.msg91.authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: env.msg91.templateId, short_url: '0', recipients: [{ mobiles: phone.replace('+', ''), otp: code }] }),
    });
    if (!r.ok) throw new Error('SMS failed: ' + (await r.text()));
    return;
  }
  if (env.smsProvider === 'twilio') {
    const { sid, token, from } = env.twilio;
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, From: from, Body: `${code} is your BuildRun login code. It expires in 5 minutes.` }),
    });
    if (!r.ok) throw new Error('SMS failed: ' + (await r.text()));
    return;
  }
  // development
  console.log(`[otp] ${phone} → ${code}`);
}
