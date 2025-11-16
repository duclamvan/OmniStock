import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifySid) {
  console.warn('⚠️  Twilio credentials not configured. SMS 2FA will not be available.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface VerificationResult {
  success: boolean;
  status?: string;
  error?: string;
}

export async function sendVerificationCode(phoneNumber: string): Promise<VerificationResult> {
  if (!client || !verifySid) {
    return {
      success: false,
      error: 'Twilio service not configured'
    };
  }

  try {
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications
      .create({
        to: phoneNumber,
        channel: 'sms'
      });

    console.log(`📱 SMS verification sent to ${phoneNumber}, status: ${verification.status}`);

    return {
      success: true,
      status: verification.status
    };
  } catch (error: any) {
    console.error('❌ Failed to send verification code:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification code'
    };
  }
}

export async function verifyCode(phoneNumber: string, code: string): Promise<VerificationResult> {
  if (!client || !verifySid) {
    return {
      success: false,
      error: 'Twilio service not configured'
    };
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(verifySid)
      .verificationChecks
      .create({
        to: phoneNumber,
        code: code
      });

    console.log(`✅ Verification check for ${phoneNumber}, status: ${verificationCheck.status}`);

    return {
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status
    };
  } catch (error: any) {
    console.error('❌ Failed to verify code:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify code'
    };
  }
}
