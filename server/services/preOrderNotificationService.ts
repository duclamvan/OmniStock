import twilio from 'twilio';
import { Resend } from 'resend';
import { db } from '../db';
import { preOrders, preOrderReminders, customers } from '@shared/schema';
import { eq, and, lte, isNull, inArray } from 'drizzle-orm';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Resend email configuration
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'Davie Shop <info@davie.shop>';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface ReminderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ScheduledReminder {
  preOrderId: string;
  channel: 'sms' | 'email';
  scheduledFor: Date;
  recipientPhone?: string;
  recipientEmail?: string;
}

export async function sendSmsReminder(
  phoneNumber: string,
  message: string
): Promise<ReminderResult> {
  if (!client) {
    console.warn('⚠️ Twilio client not configured. SMS reminder not sent.');
    return {
      success: false,
      error: 'Twilio service not configured'
    };
  }

  if (!twilioPhoneNumber) {
    console.warn('⚠️ TWILIO_PHONE_NUMBER not configured. SMS reminder not sent.');
    return {
      success: false,
      error: 'Twilio phone number not configured'
    };
  }

  try {
    const twilioMessage = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber
    });

    console.log(`📱 SMS reminder sent to ${phoneNumber}, SID: ${twilioMessage.sid}`);

    return {
      success: true,
      messageId: twilioMessage.sid
    };
  } catch (error: any) {
    console.error('❌ Failed to send SMS reminder:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}

export async function sendEmailReminder(
  email: string,
  subject: string,
  message: string
): Promise<ReminderResult> {
  if (!resend) {
    console.warn('⚠️ Resend API not configured (RESEND_API_KEY required). Email reminder not sent.');
    return {
      success: false,
      error: 'Email service not configured. Please set RESEND_API_KEY environment variable.'
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
          <p style="color: #555; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">Davie Supply - Warehouse Management System</p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Failed to send email reminder:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    console.log(`📧 Email reminder sent to ${email}, MessageID: ${data?.id}`);

    return {
      success: true,
      messageId: data?.id
    };
  } catch (error: any) {
    console.error('❌ Failed to send email reminder:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

export function generateReminderMessage(
  customerName: string,
  itemNames: string[],
  expectedDate: string | null,
  language: 'en' | 'vi' = 'en'
): string {
  const itemList = itemNames.slice(0, 3).join(', ');
  const moreItems = itemNames.length > 3 ? ` +${itemNames.length - 3} more` : '';
  const dateStr = expectedDate ? new Date(expectedDate).toLocaleDateString() : 'soon';

  if (language === 'vi') {
    return `Xin chào ${customerName}! Đơn hàng đặt trước của bạn (${itemList}${moreItems}) dự kiến sẽ đến vào ${dateStr}. Chúng tôi sẽ thông báo khi hàng về. - Davie Supply`;
  }

  return `Hi ${customerName}! Your pre-order (${itemList}${moreItems}) is expected to arrive on ${dateStr}. We'll notify you when it's ready. - Davie Supply`;
}

export async function sendPreOrderReminder(
  preOrderId: string,
  channel: 'sms' | 'email' | 'both'
): Promise<{ sms?: ReminderResult; email?: ReminderResult }> {
  try {
    const [preOrder] = await db
      .select()
      .from(preOrders)
      .where(eq(preOrders.id, preOrderId));

    if (!preOrder) {
      return { sms: { success: false, error: 'Pre-order not found' } };
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, preOrder.customerId));

    if (!customer) {
      return { sms: { success: false, error: 'Customer not found' } };
    }

    const phoneNumber = preOrder.reminderPhone || customer.billingTel;
    const emailAddress = preOrder.reminderEmail || customer.billingEmail;
    const customerName = customer.name || customer.billingFirstName || 'Customer';

    const message = generateReminderMessage(
      customerName,
      ['Your pre-ordered items'],
      preOrder.expectedDate
    );

    const results: { sms?: ReminderResult; email?: ReminderResult } = {};

    if ((channel === 'sms' || channel === 'both') && phoneNumber) {
      results.sms = await sendSmsReminder(phoneNumber, message);

      await db.insert(preOrderReminders).values({
        preOrderId,
        channel: 'sms',
        scheduledFor: new Date(),
        sentAt: results.sms.success ? new Date() : null,
        status: results.sms.success ? 'sent' : 'failed',
        errorMessage: results.sms.error || null,
        recipientPhone: phoneNumber,
        messageContent: message
      });
    }

    if ((channel === 'email' || channel === 'both') && emailAddress) {
      results.email = await sendEmailReminder(
        emailAddress,
        'Your Pre-Order Update',
        message
      );

      await db.insert(preOrderReminders).values({
        preOrderId,
        channel: 'email',
        scheduledFor: new Date(),
        sentAt: results.email.success ? new Date() : null,
        status: results.email.success ? 'sent' : 'failed',
        errorMessage: results.email.error || null,
        recipientEmail: emailAddress,
        messageContent: message
      });
    }

    const overallSuccess = 
      (results.sms?.success || !phoneNumber) && 
      (results.email?.success || !emailAddress);

    await db
      .update(preOrders)
      .set({
        lastReminderSentAt: new Date(),
        lastReminderStatus: overallSuccess ? 'sent' : 'failed',
        updatedAt: new Date()
      })
      .where(eq(preOrders.id, preOrderId));

    return results;
  } catch (error: any) {
    console.error('❌ Error sending pre-order reminder:', error);
    return { sms: { success: false, error: error.message } };
  }
}

export async function getPreOrderReminderLogs(preOrderId: string) {
  return await db
    .select()
    .from(preOrderReminders)
    .where(eq(preOrderReminders.preOrderId, preOrderId))
    .orderBy(preOrderReminders.createdAt);
}

export async function getDueReminders(): Promise<ScheduledReminder[]> {
  const now = new Date();

  const pendingPreOrders = await db
    .select({
      id: preOrders.id,
      expectedDate: preOrders.expectedDate,
      reminderEnabled: preOrders.reminderEnabled,
      reminderChannel: preOrders.reminderChannel,
      reminderDaysBefore: preOrders.reminderDaysBefore,
      reminderPhone: preOrders.reminderPhone,
      reminderEmail: preOrders.reminderEmail,
      lastReminderSentAt: preOrders.lastReminderSentAt,
      customerId: preOrders.customerId,
      status: preOrders.status
    })
    .from(preOrders)
    .where(
      and(
        eq(preOrders.reminderEnabled, true),
        inArray(preOrders.status, ['pending', 'partially_arrived'])
      )
    );

  const dueReminders: ScheduledReminder[] = [];

  for (const preOrder of pendingPreOrders) {
    if (!preOrder.expectedDate) continue;

    const expectedDate = new Date(preOrder.expectedDate);
    const daysBefore = preOrder.reminderDaysBefore || [1, 3];

    for (const days of daysBefore) {
      const reminderDate = new Date(expectedDate);
      reminderDate.setDate(reminderDate.getDate() - days);

      if (reminderDate <= now) {
        if (!preOrder.lastReminderSentAt || 
            new Date(preOrder.lastReminderSentAt).getTime() < reminderDate.getTime() - 86400000) {
          
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, preOrder.customerId));

          if (customer) {
            const channel = (preOrder.reminderChannel || 'sms') as 'sms' | 'email';
            dueReminders.push({
              preOrderId: preOrder.id,
              channel,
              scheduledFor: reminderDate,
              recipientPhone: preOrder.reminderPhone || customer.billingTel || undefined,
              recipientEmail: preOrder.reminderEmail || customer.billingEmail || undefined
            });
          }
        }
      }
    }
  }

  return dueReminders;
}

export async function processScheduledReminders(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const dueReminders = await getDueReminders();
  let successful = 0;
  let failed = 0;

  for (const reminder of dueReminders) {
    const result = await sendPreOrderReminder(
      reminder.preOrderId,
      reminder.channel
    );

    if (result.sms?.success || result.email?.success) {
      successful++;
    } else {
      failed++;
    }
  }

  console.log(`📊 Processed ${dueReminders.length} reminders: ${successful} successful, ${failed} failed`);

  return {
    processed: dueReminders.length,
    successful,
    failed
  };
}
