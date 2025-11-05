// src/scripts/test-twilio.js (ESM)
import 'dotenv/config';
import twilio from 'twilio';

(async () => {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    console.log('SID prefix:', sid?.slice(0,2), 'Token len:', token?.length);

    const client = twilio(sid, token);

    // En vez de list(), pide tu propia cuenta explícitamente:
    const me = await client.api.v2010.accounts(sid).fetch();
    console.log('OK account:', me.sid, 'status:', me.status);
  } catch (e) {
    console.error('FAIL', e.code, e.message);
  }
})();
