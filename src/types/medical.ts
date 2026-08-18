export type UserRole = 'PATIENT' | 'DOCTOR' | 'CUSTOMER_SERVICE' | 'HOSPITAL_ADMIN';

export type AppointmentStatus = 
  | 'NEW'
  | 'PENDING'
  | 'CONTACTED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ConsultationStatus = 'PENDING' | 'ANSWERED' | 'CLOSED';

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
  durationMinutes: number;
  category?: string;
  isActive: boolean;
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
  coordinatorNotes?: string;
  patientNotes?: string;
  createdAt: string;
  updatedAt: string;
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
  doctorAdvice?: string;
  doctorNotes?: string; // Internal medical notes
  suggestedAction?: string;
  treatmentPlan?: string;
  requireInPersonVisit?: boolean;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: string;
  }[];
  messages: ConsultationMessage[];
  createdAt: string;
  answeredAt?: string;
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
  type: 'EXAMINATION' | 'TEST' | 'RESULT' | 'PRESCRIPTION' | 'CONSULTATION' | 'REPORT';
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
  type: 'APPOINTMENT' | 'CONSULTATION' | 'TEST_RESULT' | 'REPORT' | 'SYSTEM';
  isRead: boolean;
  relatedId?: string;
  referenceId?: string;
  actionUrl?: string;
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
}
