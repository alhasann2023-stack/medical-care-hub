export type UserRole = 'PATIENT' | 'DOCTOR' | 'CUSTOMER_SERVICE' | 'HOSPITAL_ADMIN';

export type AppointmentStatus = 
  | 'PAYMENT_REQUIRED'
  | 'NEW'
  | 'PENDING'
  | 'CONTACTED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULE_REQUESTED'
  | 'DOCTOR_ABSENT';

export type ConsultationStatus = 
  | 'PAYMENT_REQUIRED'
  | 'PAID_PENDING_DOCTOR'
  | 'PENDING'
  | 'ANSWERED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REFUNDED';

export type CurrencyCode = 'YER' | 'USD' | 'SAR';

export type PaymentProviderType = 
  | 'KURAIMI' 
  | 'VISA_MASTERCARD' 
  | 'MADA' 
  | 'APPLE_PAY' 
  | 'STC_PAY' 
  | 'CASH' 
  | 'WAIVED';

export type KuraimiPaymentChannel = 'KURAIMI_EXPRESS' | 'HASEB_PAY' | 'KURAIMI_APP';

export type PaymentStatus = 
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'WAIVED'
  // Backward-compatibility aliases
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED';

export type PaymentMethod = 
  | 'KURAIMI'
  | 'KURAIMI_EXPRESS'
  | 'HASEB_PAY'
  | 'VISA'
  | 'MASTERCARD'
  | 'CREDIT_CARD'
  | 'MADA'
  | 'APPLE_PAY'
  | 'STC_PAY'
  | 'WAIVED'
  | 'CASH'
  | 'INSURANCE';

export type NotificationChannel = 'IN_APP' | 'SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH';

export type TestStatus = 'ORDERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ReportType = 
  | 'DISCHARGE_SUMMARY'
  | 'SURGICAL_REPORT'
  | 'LAB_SUMMARY'
  | 'RADIOLOGY'
  | 'CONSULTATION_NOTE'
  | 'GENERAL_CHECKUP';

export type PreferredPeriod = 'MORNING' | 'AFTERNOON' | 'EVENING';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Patient {
  id: string;
  userId: string;
  fullName: string;
  phone: string; // Primary Unique Identifier
  nationalId?: string;
  mrn: string; // Medical Record Number e.g. MRN-2026-0041
  email: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  address: string;
  allergies: string[];
  chronicDiseases: string[];
  avatar?: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  specialtyId: string;
  specialtyNameAr: string;
  specialtyNameEn: string;
  title: string; // e.g. استشاري أول / Senior Consultant
  qualifications: string[];
  experienceYears: number;
  bioAr: string;
  bioEn: string;
  consultationFee: number;
  multiCurrencyPricing?: MultiCurrencyPrice;
  avatar: string;
  roomNumber: string;
  rating: number;
  reviewsCount: number;
  availableDays: string[];
  availableHours: string;
  isActive: boolean;
}

export interface Staff {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  department: string;
  roleTitle: string;
  shift: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Specialty {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  iconName: string;
  code: string;
}

export interface MedicalService {
  id: string;
  specialtyId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  multiCurrencyPricing?: MultiCurrencyPrice;
  durationMinutes: number;
  category?: string;
  isActive: boolean;
}

export interface MultiCurrencyPrice {
  YER: number;
  USD: number;
  SAR: number;
}

export interface CurrencyConfig {
  code: CurrencyCode;
  nameAr: string;
  nameEn: string;
  symbolAr: string;
  symbolEn: string;
  isDefault?: boolean;
  isActive: boolean;
  exchangeRateToSAR: number; // e.g. 1 USD = 3.75 SAR, 1 SAR = ~420 YER (1 YER = 0.00238 SAR)
  exchangeRateToUSD: number;
  decimals: number;
  flagIcon: string;
  supportedProviders: PaymentProviderType[];
}

export interface KuraimiMerchantConfig {
  merchantId: string;
  terminalId: string;
  serviceKey: string;
  serviceSecret: string;
  environment: 'SANDBOX' | 'LIVE';
  webhookUrl: string;
  enableHasebPay: boolean;
  enableExpressPay: boolean;
  allowedCurrencies: CurrencyCode[];
}

export interface CardGatewayConfig {
  gatewayProvider: 'MPGS' | 'CYBERSOURCE' | 'STRIPE' | 'NETWORK_INTERNATIONAL';
  merchantId: string;
  publishableKey: string;
  secretKey: string;
  environment: 'SANDBOX' | 'LIVE';
  require3DSecure: boolean;
  allowedCurrencies: CurrencyCode[];
}

export interface PaymentSettings {
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyConfig[];
  kuraimi: KuraimiMerchantConfig;
  cardGateway: CardGatewayConfig;
  enableCashOnArrival: boolean;
  enableWaiverOption: boolean;
  vatPercentage: number;
  gatewayFeePercentage: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PaymentLedgerEntry {
  id: string;
  paymentId: string;
  receiptNumber: string;
  transactionReference: string;
  patientId: string;
  patientName: string;
  serviceType: string;
  serviceName: string;
  currency: CurrencyCode;
  grossAmount: number;
  gatewayFee: number;
  vatAmount: number;
  netAmount: number;
  refundedAmount: number;
  provider: PaymentProviderType;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  settlementStatus: 'SETTLED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  createdAt: string;
  settledAt?: string;
  notes?: string;
}

export interface PaymentLedgerSummary {
  currency: CurrencyCode;
  totalGross: number;
  totalGatewayFees: number;
  totalVat: number;
  totalNet: number;
  totalRefunds: number;
  successCount: number;
  pendingCount: number;
  refundCount: number;
  failedCount: number;
}

export interface Payment {
  id: string;
  paymentId?: string;
  receiptNumber?: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientMrn?: string;
  serviceType: 'APPOINTMENT_BOOKING' | 'MEDICAL_CONSULTATION' | 'LAB_TEST' | 'PROCEDURE' | 'APPOINTMENT' | 'CONSULTATION' | 'MEDICATION';
  appointmentId?: string;
  consultationId?: string;
  serviceReferenceId?: string;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  serviceId?: string;
  serviceName: string;
  amount: number;
  currency: CurrencyCode | string; // 'YER' | 'USD' | 'SAR'
  baseCurrency?: CurrencyCode;
  exchangeRate?: number;
  grossAmount?: number;
  gatewayFee?: number;
  vatAmount?: number;
  netAmount?: number;
  refundAmount?: number;
  paymentProvider?: PaymentProviderType;
  paymentMethod: PaymentMethod;
  kuraimiDetails?: {
    channel?: KuraimiPaymentChannel;
    customerAccount?: string;
    hasebTransactionCode?: string;
    expressCode?: string;
    terminalId?: string;
    authCode?: string;
    statusDescription?: string;
  };
  cardBrand?: string;
  last4?: string;
  cardHolderName?: string;
  paymentStatus: PaymentStatus;
  status?: PaymentStatus;
  transactionReference: string;
  gatewayTransactionId?: string;
  gatewayProvider?: string;
  gatewayResponseCode?: string;
  waivedBy?: string;
  waivedByName?: string;
  waivedReason?: string;
  isWaived?: boolean;
  receiptUrl?: string;
  paidAt?: string;
  createdAt: string;
  confirmedAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  serviceId?: string;
  serviceName: string;
  preferredDate: string;
  preferredPeriod: PreferredPeriod;
  reason: string;
  confirmedDate?: string;
  confirmedTime?: string;
  clinicRoom?: string;
  status: AppointmentStatus;
  
  // Payment Integration Fields
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  paymentTransactionRef?: string;
  paymentDate?: string;
  isWaived?: boolean;
  waiverReason?: string;
  waiverApprovedBy?: string;
  waiverApprovedAt?: string;
  
  // Reschedule Fields
  rescheduleRequestedDate?: string;
  rescheduleRequestedPeriod?: PreferredPeriod;
  rescheduleReason?: string;
  
  // Doctor Absence Notification Fields
  isDoctorAbsent?: boolean;
  doctorAbsentNotifiedAt?: string;
  doctorAbsentNotice?: string;
  
  coordinatorNotes?: string;
  patientNotes?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: string;
  }[];
  createdAt: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientMrn: string;
  patientAge?: number;
  patientGender?: 'MALE' | 'FEMALE';
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  title: string;
  problemDescription: string;
  symptoms: string[];
  duration: string; // e.g. 'منذ 3 أيام' / '3 days'
  status: ConsultationStatus;
  
  // Payment Integration Fields
  consultationFee?: number;
  paymentAmount?: number;
  currency?: string;
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  paymentTransactionRef?: string;
  paymentDate?: string;
  isWaived?: boolean;
  waiverReason?: string;
  waiverApprovedBy?: string;
  waiverApprovedAt?: string;

  doctorAdvice?: string;
  doctorNotes?: string; // Internal medical notes
  suggestedAction?: string;
  treatmentPlan?: string;
  requireInPersonVisit?: boolean;
  orderedLabTests?: string[];
  recommendedPrescription?: string;
  
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: string;
  }[];
  messages: ConsultationMessage[];
  createdAt: string;
  answeredAt?: string;
  updatedAt?: string;
}

export interface FollowUpAppointment {
  id: string;
  followUpId?: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientMrn?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  clinicRoom?: string;
  sourceType?: 'APPOINTMENT' | 'CONSULTATION';
  sourceId?: string;
  originalAppointmentId?: string;
  originalConsultationId?: string;
  followUpDate: string; // e.g. 2026-09-25
  followUpTime: string; // e.g. 17:00
  scheduledDate?: string;
  scheduledTime?: string;
  isFreeFollowUp?: boolean;
  reason: string;
  notes?: string;
  doctorNotes?: string;
  status: 'SCHEDULED' | 'REMINDED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  reminderSent?: boolean;
  reminderSettings?: {
    days30?: boolean;
    days7?: boolean;
    hours24?: boolean;
    hours2?: boolean;
    minutes30?: boolean;
    remind30Days?: boolean;
    remind7Days?: boolean;
    remind24Hours?: boolean;
    remind2Hours?: boolean;
    remind30Minutes?: boolean;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Refund {
  id: string;
  refundId?: string;
  paymentId: string;
  appointmentId?: string;
  consultationId?: string;
  serviceType?: string;
  serviceReferenceId?: string;
  patientId: string;
  patientName: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'REFUND_PENDING' | 'REFUNDED' | 'REJECTED';
  initiatedBy?: string;
  initiatedByName?: string;
  initiatedByRole?: UserRole;
  transactionReference?: string;
  refundTransactionRef?: string;
  processedBy?: string;
  processedByUserId?: string;
  processedAt?: string;
  gatewayRefundId?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface ReminderSchedule {
  id: string;
  appointmentId?: string;
  followUpId?: string;
  targetType?: 'APPOINTMENT' | 'FOLLOW_UP' | 'CONSULTATION';
  targetId?: string;
  patientId: string;
  patientUserId?: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  doctorId?: string;
  doctorName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  targetDateTime?: string;
  title?: string;
  message?: string;
  offsetsMinutes?: number[]; // e.g. [1440, 120, 30] for 24h, 2h, 30m
  sentOffsets?: number[];
  reminderOffset?: '30_DAYS' | '7_DAYS' | '24_HOURS' | '2_HOURS' | '30_MINUTES';
  channels?: ('IN_APP' | 'SMS' | 'EMAIL' | 'WHATSAPP' | NotificationChannel)[];
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  isActive?: boolean;
  isSent?: boolean;
  sentAt?: string;
  createdAt: string;
}

export interface VitalSigns {
  bloodPressure: string; // e.g. 120/80
  heartRate: number; // bpm
  temperature: number; // Celsius
  respiratoryRate?: number;
  oxygenSaturation: number; // %
  weightKg: number;
  heightCm: number;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  recordDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  clinicalNotes: string;
  vitalSigns?: VitalSigns;
  createdAt: string;
}

export interface MedicalExamination {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  examinationDate: string;
  examinationType: string;
  chiefComplaint: string;
  clinicalFindings: string;
  diagnosis: string;
  recommendations: string;
  vitalSigns?: VitalSigns;
  createdAt: string;
}

export interface MedicalTestItem {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag?: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
}

export interface MedicalTest {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  testName: string;
  category: 'LABORATORY' | 'RADIOLOGY' | 'CARDIOLOGY' | 'PATHOLOGY';
  testDate: string;
  status: TestStatus;
  resultsSummary: string;
  detailedItems?: MedicalTestItem[];
  labTechnician?: string;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface MedicalReport {
  id: string;
  reportNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientMrn: string;
  patientBirthDate: string;
  patientGender: 'MALE' | 'FEMALE';
  doctorId: string;
  doctorName: string;
  doctorTitle: string;
  doctorSpecialty: string;
  reportType: ReportType;
  title: string;
  summary: string;
  clinicalHistory: string;
  findings: string;
  diagnosis: string;
  recommendations: string;
  reportDate: string;
  createdAt: string;
  digitalSignature?: string;
  hospitalDepartment: string;
}

export interface PrescriptionItem {
  medicationName: string;
  strength: string; // e.g. 500mg
  form: string; // Tablets, Syrup, Injection
  dosage: string; // 1 tablet
  frequency: string; // twice daily after meals
  duration: string; // 7 days
  instructions: string;
}

export interface Prescription {
  id: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  diagnosis: string;
  medications: PrescriptionItem[];
  instructions: string;
  status: 'ACTIVE' | 'COMPLETED' | 'RENEWED';
  createdAt: string;
}

export interface TimelineItem {
  id: string;
  type: 'EXAMINATION' | 'TEST' | 'RESULT' | 'PRESCRIPTION' | 'CONSULTATION' | 'REPORT' | 'PAYMENT' | 'FOLLOW_UP';
  date: string;
  title: string;
  subtitle: string;
  doctorName: string;
  status?: string;
  details: string;
  badgeColor?: string;
  referenceId: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'PAYMENT' | 'APPOINTMENT' | 'CONSULTATION' | 'FOLLOW_UP' | 'REMINDER' | 'REFUND' | 'TEST_RESULT' | 'REPORT' | 'SYSTEM';
  isRead: boolean;
  relatedId?: string;
  referenceId?: string;
  actionUrl?: string;
  amount?: number;
  currency?: string;
  transactionReference?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType?: string;
  entityId?: string;
  targetEntity?: string;
  targetId?: string;
  details: string;
  ipAddress: string;
  timestamp?: string;
  createdAt?: string;
  status?: string;
}

export interface DashboardStats {
  totalPatients: number;
  activeDoctors: number;
  customerServiceStaff: number;
  todayAppointments: number;
  pendingAppointments: number;
  newConsultations: number;
  completedConsultations: number;
  medicalTestsCount: number;
  medicalReportsCount: number;
  
  // Payment Stats
  totalRevenue: number;
  todayRevenue: number;
  bookingPaymentsCount: number;
  consultationPaymentsCount: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  refundedAmount: number;
}
