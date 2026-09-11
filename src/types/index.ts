export type Language = 'ar' | 'en';

export type BotRole = 'general' | 'triage' | 'reports' | 'pharmacist';

export type GeminiModelType = 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  botRole?: BotRole;
  isStreaming?: boolean;
}

export type AnalysisCategory = 'general' | 'xray' | 'skin' | 'lab_test' | 'prescription';

export interface ImageAnalysisResult {
  id: string;
  imageUrl: string;
  category: AnalysisCategory;
  modelUsed: string;
  analysisText: string;
  timestamp: string;
  userPrompt?: string;
}

export interface Doctor {
  id: string;
  nameAr: string;
  nameEn: string;
  specialtyAr: string;
  specialtyEn: string;
  titleAr: string;
  titleEn: string;
  experienceYears: number;
  rating: number;
  consultationFee: number;
  availableDays: string[];
  avatar: string;
  clinicRoom: string;
}

export interface MedicalSpecialty {
  id: string;
  nameAr: string;
  nameEn: string;
  iconName: string;
  descriptionAr: string;
  descriptionEn: string;
  color: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  timeSlot: string;
  reason: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface MedicalRecordItem {
  id: string;
  type: 'visit' | 'lab' | 'xray' | 'prescription';
  titleAr: string;
  titleEn: string;
  date: string;
  doctorName: string;
  specialty: string;
  details: string;
  attachmentsCount?: number;
  statusBadge?: string;
}

export interface PatientProfile {
  name: string;
  mrn: string;
  age: number;
  gender: string;
  bloodType: string;
  chronicDiseases: string[];
  allergies: string[];
  phone: string;
}
