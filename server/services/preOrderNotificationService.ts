import twilio from 'twilio';
import { Resend } from 'resend';
import { db } from '../db';
import { preOrders, preOrderReminders, customers, preOrderItems, products } from '@shared/schema';
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

interface PreOrderItemWithProduct {
  id: string;
  itemName: string;
  itemDescription: string | null;
  quantity: number;
  productId: string | null;
  productImage: string | null;
}

async function getPreOrderItemsWithProducts(preOrderId: string): Promise<PreOrderItemWithProduct[]> {
  const items = await db
    .select({
      id: preOrderItems.id,
      itemName: preOrderItems.itemName,
      itemDescription: preOrderItems.itemDescription,
      quantity: preOrderItems.quantity,
      productId: preOrderItems.productId,
      productImages: products.images
    })
    .from(preOrderItems)
    .leftJoin(products, eq(preOrderItems.productId, products.id))
    .where(eq(preOrderItems.preOrderId, preOrderId));

  return items.map(item => {
    const images = item.productImages as string[] | null;
    return {
      ...item,
      productImage: images && images.length > 0 ? images[0] : null
    };
  });
}

function generateStyledEmailHtml(
  customerName: string,
  items: PreOrderItemWithProduct[],
  expectedDate: string | null
): string {
  const dateStr = expectedDate 
    ? new Date(expectedDate).toLocaleDateString('vi-VN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) 
    : 'sớm';

  const itemsHtml = items.map(item => {
    const imageUrl = item.productImage || 'https://via.placeholder.com/80x80?text=No+Image';
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <img src="${imageUrl}" alt="${item.itemName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e5e5;">
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; color: #333; font-size: 14px;">${item.itemName}</div>
          ${item.itemDescription ? `<div style="color: #666; font-size: 12px; margin-top: 4px;">${item.itemDescription}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          <span style="background: #f0f0f0; padding: 4px 12px; border-radius: 12px; font-weight: 600; color: #333;">x${item.quantity}</span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🛒 Thông Báo Đơn Đặt Trước</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Davie Shop</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Xin chào <strong>${customerName}</strong>! 👋
          </p>
          
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
            Đơn hàng đặt trước của bạn dự kiến sẽ về vào <strong style="color: #667eea;">${dateStr}</strong>. 
            Chúng tôi sẽ liên hệ với bạn ngay khi hàng về kho.
          </p>

          <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📦 Sản phẩm đặt trước:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>
          </div>

          <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <p style="color: #8b5a2b; margin: 0; font-size: 14px; font-weight: 500;">
              💬 Nếu bạn có câu hỏi, vui lòng liên hệ:
            </p>
            <p style="margin: 10px 0 0 0;">
              <a href="https://facebook.com/davie.lam" style="color: #1877f2; text-decoration: none; font-weight: 600; font-size: 15px;">
                📱 Davie Lam trên Facebook
              </a>
            </p>
          </div>

          <p style="color: #888; font-size: 13px; text-align: center; margin: 0;">
            Cảm ơn bạn đã tin tưởng Davie Shop! ❤️
          </p>
        </div>

        <div style="text-align: center; padding: 20px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Davie Shop | Hệ thống quản lý kho hàng
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
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

    // Fetch pre-order items with product images
    const items = await getPreOrderItemsWithProducts(preOrderId);
    const itemNames = items.map(item => item.itemName);

    const phoneNumber = preOrder.reminderPhone || customer.billingTel;
    const emailAddress = preOrder.reminderEmail || customer.billingEmail;
    const customerName = customer.name || customer.billingFirstName || 'Quý khách';

    // SMS message in Vietnamese
    const smsMessage = generateReminderMessage(customerName, itemNames, preOrder.expectedDate, 'vi');

    const results: { sms?: ReminderResult; email?: ReminderResult } = {};

    if ((channel === 'sms' || channel === 'both') && phoneNumber) {
      results.sms = await sendSmsReminder(phoneNumber, smsMessage);

      await db.insert(preOrderReminders).values({
        preOrderId,
        channel: 'sms',
        scheduledFor: new Date(),
        sentAt: results.sms.success ? new Date() : null,
        status: results.sms.success ? 'sent' : 'failed',
        errorMessage: results.sms.error || null,
        recipientPhone: phoneNumber,
        messageContent: smsMessage
      });
    }

    if ((channel === 'email' || channel === 'both') && emailAddress) {
      // Generate styled HTML email
      const htmlContent = generateStyledEmailHtml(customerName, items, preOrder.expectedDate);
      
      results.email = await sendStyledEmailReminder(
        emailAddress,
        '🛒 Thông Báo Đơn Đặt Trước - Davie Shop',
        htmlContent,
        smsMessage
      );

      await db.insert(preOrderReminders).values({
        preOrderId,
        channel: 'email',
        scheduledFor: new Date(),
        sentAt: results.email.success ? new Date() : null,
        status: results.email.success ? 'sent' : 'failed',
        errorMessage: results.email.error || null,
        recipientEmail: emailAddress,
        messageContent: smsMessage
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

async function sendStyledEmailReminder(
  email: string,
  subject: string,
  htmlContent: string,
  textContent: string
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
      text: textContent,
      html: htmlContent
    });

    if (error) {
      console.error('❌ Failed to send styled email reminder:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    console.log(`📧 Styled email reminder sent to ${email}, MessageID: ${data?.id}`);

    return {
      success: true,
      messageId: data?.id
    };
  } catch (error: any) {
    console.error('❌ Failed to send styled email reminder:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
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
    const daysBefore = preOrder.reminderDaysBefore || [-1, 0];

    for (const days of daysBefore) {
      const reminderDate = new Date(expectedDate);
      // days can be negative (before arrival), 0 (same day), or positive (after arrival)
      // Add the days value to expectedDate: -3 = 3 days before, 0 = same day, 2 = 2 days after
      reminderDate.setDate(reminderDate.getDate() + days);

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
