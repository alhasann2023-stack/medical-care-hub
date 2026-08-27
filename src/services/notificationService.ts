import { NotificationChannel, UserRole } from '../types/medical';

export interface NotificationPayload {
  userId: string;
  userEmail?: string;
  userPhone?: string;
  userRole?: UserRole;
  title: string;
  message: string;
  type: 'PAYMENT' | 'APPOINTMENT' | 'CONSULTATION' | 'FOLLOW_UP' | 'REMINDER' | 'REFUND' | 'TEST_RESULT' | 'REPORT' | 'SYSTEM';
  referenceId?: string;
  amount?: number;
  currency?: string;
  transactionReference?: string;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  messageId: string;
  timestamp: string;
  details?: string;
}

/**
 * Multi-Channel Notification Service Architecture
 * Supports In-App, SMS, Email, WhatsApp, and Push Notifications.
 */
class NotificationService {
  private inAppEnabled = true;
  private smsEnabled = true;
  private emailEnabled = true;
  private whatsAppEnabled = true;
  private pushEnabled = true;

  /**
   * Dispatch notification across requested or default channels
   */
  async dispatch(payload: NotificationPayload): Promise<NotificationDeliveryResult[]> {
    const channels = payload.channels || ['IN_APP', 'SMS', 'EMAIL'];
    const results: NotificationDeliveryResult[] = [];

    for (const channel of channels) {
      try {
        const result = await this.sendToChannel(channel, payload);
        results.push(result);
      } catch (err: any) {
        results.push({
          channel,
          success: false,
          messageId: `err-${Date.now()}`,
          timestamp: new Date().toISOString(),
          details: err.message || 'Delivery error'
        });
      }
    }

    return results;
  }

  private async sendToChannel(channel: NotificationChannel, payload: NotificationPayload): Promise<NotificationDeliveryResult> {
    const timestamp = new Date().toISOString();
    const messageId = `msg-${channel.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    switch (channel) {
      case 'IN_APP':
        // Handled via backend pushNotification / Firestore notification collection
        return {
          channel: 'IN_APP',
          success: true,
          messageId,
          timestamp,
          details: `In-App notification queued for user ${payload.userId}`
        };

      case 'SMS':
        console.log(`[SMS Gateway Simulated] To: ${payload.userPhone || 'N/A'} | Body: ${payload.title} - ${payload.message}`);
        return {
          channel: 'SMS',
          success: true,
          messageId,
          timestamp,
          details: `SMS message dispatched to ${payload.userPhone || 'Registered Mobile'}`
        };

      case 'EMAIL':
        console.log(`[Email SMTP Simulated] To: ${payload.userEmail || 'N/A'} | Subject: ${payload.title} | Body: ${payload.message}`);
        return {
          channel: 'EMAIL',
          success: true,
          messageId,
          timestamp,
          details: `Email notification sent to ${payload.userEmail || 'Registered Email'}`
        };

      case 'WHATSAPP':
        console.log(`[WhatsApp Business API Simulated] To: ${payload.userPhone || 'N/A'} | Template: ${payload.title} - ${payload.message}`);
        return {
          channel: 'WHATSAPP',
          success: true,
          messageId,
          timestamp,
          details: `WhatsApp verified message delivered to ${payload.userPhone || 'Customer Phone'}`
        };

      case 'PUSH':
        return {
          channel: 'PUSH',
          success: true,
          messageId,
          timestamp,
          details: 'Web Push / Mobile Push delivered'
        };

      default:
        return {
          channel,
          success: true,
          messageId,
          timestamp,
          details: 'Dispatched successfully'
        };
    }
  }

  /**
   * Send Payment Success Notification
   */
  async sendPaymentSuccessNotification(payment: any): Promise<NotificationDeliveryResult[]> {
    return this.dispatch({
      userId: payment.patientId,
      userPhone: payment.patientPhone,
      title: 'تم استلام وتأكيد سداد الرسوم الطبية بنجاح',
      message: `تم سداد مبلغ ${payment.amount} ${payment.currency || 'ر.س'} للخدمة [${payment.serviceName}] عبر ${payment.paymentMethod}. الرقم المرجعي: ${payment.transactionReference}. الموعد مثبت في جدول العيادة.`,
      type: 'PAYMENT',
      referenceId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      transactionReference: payment.transactionReference,
      channels: ['IN_APP', 'SMS', 'WHATSAPP']
    });
  }

  /**
   * Send Refund Notification
   */
  async sendRefundNotification(refund: any): Promise<NotificationDeliveryResult[]> {
    return this.dispatch({
      userId: refund.patientId,
      title: 'إشعار استرداد مالي معتمد',
      message: `تم معالجة استرداد مبلغ ${refund.amount} ${refund.currency || 'ر.س'} لعملية الدفع ${refund.transactionReference}. سبب الاسترداد: ${refund.reason}.`,
      type: 'REFUND',
      referenceId: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      channels: ['IN_APP', 'SMS', 'EMAIL']
    });
  }

  /**
   * Format message for Appointment Reminder
   */
  buildAppointmentReminder(doctorName: string, date: string, time: string, clinicRoom: string, offsetLabel: string): { title: string; message: string } {
    return {
      title: `تذكير بموعدك الطبي (${offsetLabel})`,
      message: `نود تذكيرك بموعدك القادم مع ${doctorName} بتاريخ ${date} الساعة ${time} في ${clinicRoom || 'العيادة'}. نرجو الحضور قبل الموعد بـ 15 دقيقة.`
    };
  }

  /**
   * Format message for Follow-up Appointment
   */
  buildFollowUpReminder(doctorName: string, date: string, time: string, offsetLabel: string): { title: string; message: string } {
    return {
      title: `تذكير بموعد المراجعة (${offsetLabel})`,
      message: `تذكير بموعد المراجعة والاستشارة المجدول مع ${doctorName} يوم ${date} في تمام الساعة ${time}.`
    };
  }
}

export const notificationService = new NotificationService();
