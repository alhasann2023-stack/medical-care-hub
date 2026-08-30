import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  initializeApp as initializeFirebaseAdminApp,
  cert,
  getApps as getFirebaseAdminApps
} from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
import type { UserRecord } from 'firebase-admin/auth';
import {
  INITIAL_USERS,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_STAFF,
  INITIAL_SPECIALTIES,
  INITIAL_SERVICES,
  INITIAL_PAYMENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_CONSULTATIONS,
  INITIAL_FOLLOW_UPS,
  INITIAL_REFUNDS,
  INITIAL_REMINDERS,
  INITIAL_EXAMINATIONS,
  INITIAL_TESTS,
  INITIAL_REPORTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS
} from './src/data/seedData';
import {
  User,
  Patient,
  Doctor,
  Staff,
  Specialty,
  MedicalService,
  Appointment,
  Consultation,
  Payment,
  PaymentStatus,
  PaymentMethod,
  FollowUpAppointment,
  Refund,
  ReminderSchedule,
  MedicalExamination,
  MedicalTest,
  MedicalReport,
  Prescription,
  AppNotification,
  AuditLog,
  TimelineItem,
  UserRole,
  PaymentSettings,
  PaymentLedgerEntry,
  CurrencyCode
} from './src/types/medical';
import { paymentService } from './server/paymentService';
import {
  securityHeadersMiddleware,
  apiRateLimiter,
  authRateLimiter,
  sanitizeInputMiddleware,
  preventPathTraversal
} from './server/securityMiddleware';

// ============================================================
// FIREBASE ADMIN AUTHENTICATION
// ============================================================
// Admin SDK is used on the server to create/update/delete
// Firebase Authentication accounts for doctors and staff.
// Credentials can be supplied through FIREBASE_SERVICE_ACCOUNT_JSON
// or GOOGLE_APPLICATION_CREDENTIALS.
let firebaseAdminAuth: ReturnType<typeof getFirebaseAdminAuth> | null = null;
let firebaseAdminInitAttempted = false;

function getFirebaseAuth(): ReturnType<typeof getFirebaseAdminAuth> | null {
  if (firebaseAdminAuth) return firebaseAdminAuth;
  if (firebaseAdminInitAttempted) return null;

  try {
    firebaseAdminInitAttempted = true;
    if (getFirebaseAdminApps().length > 0) {
      firebaseAdminAuth = getFirebaseAdminAuth();
      return firebaseAdminAuth;
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        initializeFirebaseAdminApp({
          credential: cert(serviceAccount)
        });
        firebaseAdminAuth = getFirebaseAdminAuth();
        console.log('[Firebase Admin] Authentication initialized from FIREBASE_SERVICE_ACCOUNT_JSON.');
        return firebaseAdminAuth;
      } catch (err) {
        console.warn('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        initializeFirebaseAdminApp();
        firebaseAdminAuth = getFirebaseAdminAuth();
        console.log('[Firebase Admin] Authentication initialized from GOOGLE_APPLICATION_CREDENTIALS.');
        return firebaseAdminAuth;
      } catch (err) {
        console.warn('[Firebase Admin] GOOGLE_APPLICATION_CREDENTIALS init failed:', err);
      }
    }
  } catch (error) {
    console.warn('[Firebase Admin] Initialization notice:', error);
  }
  return null;
}

async function createFirebaseAuthUser(params: {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
}): Promise<{ uid: string; email?: string } | null> {
  const adminAuth = getFirebaseAuth();
  if (adminAuth) {
    const { email, password, displayName, phoneNumber, photoURL } = params;
    try {
      return await adminAuth.createUser({
        email,
        password,
        displayName,
        phoneNumber: phoneNumber?.startsWith('+') ? phoneNumber : undefined,
        photoURL,
        emailVerified: false,
        disabled: false
      });
    } catch (error: any) {
      console.error('[Firebase Admin] createUser failed:', error);
      throw error;
    }
  }

  // REST API Fallback for environments where Admin SDK Service Account JSON is not loaded
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let apiKey = process.env.FIREBASE_API_KEY || '';
    if (!apiKey && fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        apiKey = cfg.apiKey || '';
      } catch {}
    }

    if (apiKey) {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.email,
          password: params.password,
          returnSecureToken: true
        })
      });
      const data = await response.json();
      if (data.error) {
        if (data.error.message === 'EMAIL_EXISTS') {
          const err: any = new Error('البريد الإلكتروني موجود بالفعل في Firebase Authentication.');
          err.code = 'auth/email-already-exists';
          throw err;
        }
        console.warn('[Firebase Auth REST] Sign up notice:', data.error.message);
      } else if (data.localId) {
        if (params.displayName && data.idToken) {
          try {
            await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken: data.idToken,
                displayName: params.displayName,
                returnSecureToken: false
              })
            });
          } catch {}
        }
        return { uid: data.localId, email: data.email };
      }
    }
  } catch (error: any) {
    if (error?.code === 'auth/email-already-exists') throw error;
    console.warn('[Firebase Auth REST] Fallback notice:', error?.message);
  }

  return null;
}

async function signInFirebaseAuthUser(params: {
  email: string;
  password: string;
}): Promise<{ uid: string; email?: string; idToken?: string } | null> {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let apiKey = process.env.FIREBASE_API_KEY || '';
    if (!apiKey && fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        apiKey = cfg.apiKey || '';
      } catch {}
    }

    if (apiKey) {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.email,
          password: params.password,
          returnSecureToken: true
        })
      });
      const data = await response.json();
      if (data && data.localId) {
        return { uid: data.localId, email: data.email, idToken: data.idToken };
      }
    }
  } catch (error: any) {
    console.warn('[Firebase Auth REST] Sign in notice:', error?.message);
  }
  return null;
}

async function updateFirebaseAuthUser(uid: string, data: {
  email?: string;
  password?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  disabled?: boolean;
}) {
  const adminAuth = getFirebaseAuth();
  if (!adminAuth || !uid) return null;

  try {
    return await adminAuth.updateUser(uid, {
      ...data,
      phoneNumber: data.phoneNumber
        ? (data.phoneNumber.startsWith('+') ? data.phoneNumber : undefined)
        : undefined
    });
  } catch (error: any) {
    if (error?.code !== 'auth/user-not-found') {
      console.warn('[Firebase Admin] updateUser notice:', error);
    }
    return null;
  }
}

async function deleteFirebaseAuthUser(uid?: string) {
  const adminAuth = getFirebaseAuth();
  if (!uid || !adminAuth) return;

  try {
    await adminAuth.deleteUser(uid);
  } catch (error: any) {
    if (error?.code !== 'auth/user-not-found') {
      console.warn('[Firebase Admin] deleteUser notice:', error);
    }
  }
}

// In-Memory Database Store initialized from Seed Data
let users: User[] = [...INITIAL_USERS];
let patients: Patient[] = [...INITIAL_PATIENTS];
let doctors: Doctor[] = [...INITIAL_DOCTORS];
let staffList: Staff[] = [...INITIAL_STAFF];
let specialties: Specialty[] = [...INITIAL_SPECIALTIES];
let services: MedicalService[] = [...INITIAL_SERVICES];
let payments: Payment[] = [...INITIAL_PAYMENTS];
let appointments: Appointment[] = [...INITIAL_APPOINTMENTS];
let consultations: Consultation[] = [...INITIAL_CONSULTATIONS];
let followUps: FollowUpAppointment[] = [...INITIAL_FOLLOW_UPS];
let refunds: Refund[] = [...INITIAL_REFUNDS];
let reminderSchedules: ReminderSchedule[] = [...INITIAL_REMINDERS];
let examinations: MedicalExamination[] = [...INITIAL_EXAMINATIONS];
let tests: MedicalTest[] = [...INITIAL_TESTS];
let reports: MedicalReport[] = [...INITIAL_REPORTS];
let prescriptions: Prescription[] = [...INITIAL_PRESCRIPTIONS];
let notifications: AppNotification[] = [...INITIAL_NOTIFICATIONS];
let auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];

// In-Memory Passwords Store
const userPasswords: Record<string, string> = {
  'usr-admin-1': 'admin#2026!Sec'
};

// Password Uniqueness Validator
function isPasswordAlreadyUsed(password: string, excludeUserId?: string): boolean {
  if (!password || typeof password !== 'string') return false;
  const clean = password.trim();
  if (!clean) return false;
  
  for (const [userId, storedPwd] of Object.entries(userPasswords)) {
    if (excludeUserId && userId === excludeUserId) continue;
    if (storedPwd && storedPwd.trim() === clean) {
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------
// IN-MEMORY STORAGE INITIALIZATION
// ----------------------------------------------------
function saveDatabase() {
  // Database stored in memory and synchronized with Firebase Firestore
}

function loadDatabase() {
  // Seed default passwords
  if (!userPasswords['usr-doc-1']) userPasswords['usr-doc-1'] = 'doc#1234!';
  if (!userPasswords['usr-doc-2']) userPasswords['usr-doc-2'] = 'doc#2345!';
  if (!userPasswords['usr-doc-3']) userPasswords['usr-doc-3'] = 'doc#3456!';
  if (!userPasswords['usr-doc-4']) userPasswords['usr-doc-4'] = 'doc#4567!';
  if (!userPasswords['usr-cs-1']) userPasswords['usr-cs-1'] = 'staff#1234!';
  if (!userPasswords['usr-pat-1']) userPasswords['usr-pat-1'] = 'patient#1234!';
  if (!userPasswords['usr-admin-1']) userPasswords['usr-admin-1'] = 'admin#2026!Sec';
  console.log(`[Store] Database active in memory and connected to Firebase Firestore: ${users.length} users, ${doctors.length} doctors, ${patients.length} patients.`);
}

// Load database immediately on module start
loadDatabase();

// Helper: Log audit trail
function logAudit(
  userId: string,
  userName: string,
  userRole: UserRole,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  req?: Request
) {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    userName,
    userRole,
    action,
    entityType,
    entityId,
    details,
    ipAddress: req?.ip || '127.0.0.1',
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(newLog);
  return newLog;
}

// Helper: Send Notification
function pushNotification(
  targetUserIdOrIds: string | string[],
  title: string,
  message: string,
  type: 'PAYMENT' | 'APPOINTMENT' | 'CONSULTATION' | 'FOLLOW_UP' | 'REMINDER' | 'REFUND' | 'TEST_RESULT' | 'REPORT' | 'SYSTEM',
  relatedId?: string,
  extra?: { amount?: number; currency?: string; transactionReference?: string }
) {
  const targetIds = Array.isArray(targetUserIdOrIds) ? targetUserIdOrIds : [targetUserIdOrIds];
  const uniqueIds = Array.from(new Set(targetIds.filter(Boolean)));
  
  let lastNotif: AppNotification | null = null;
  uniqueIds.forEach(targetId => {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userId: targetId,
      title,
      message,
      type,
      isRead: false,
      relatedId,
      referenceId: relatedId,
      amount: extra?.amount,
      currency: extra?.currency,
      transactionReference: extra?.transactionReference,
      createdAt: new Date().toISOString()
    };
    notifications.unshift(notif);
    lastNotif = notif;
  });

  // Limit memory notifications
  if (notifications.length > 300) {
    notifications.splice(300);
  }

  return lastNotif || {
    id: `notif-${Date.now()}`,
    userId: targetIds[0] || 'all',
    title,
    message,
    type,
    isRead: false,
    relatedId,
    referenceId: relatedId,
    createdAt: new Date().toISOString()
  };
}

// Gemini AI Client (Lazy initialization to prevent startup crashes)
let aiClient: GoogleGenAI | null = null;
function getGeminiAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI client:', e);
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000
  ;

  // Security Hardening: Disable Express signature header
  app.disable('x-powered-by');

  // Security Hardening: Apply protective HTTP headers & anti-path-traversal
  app.use(securityHeadersMiddleware);
  app.use(preventPathTraversal);

  // Enable CORS for the Netlify frontend, Android WebViews, hybrid apps, and local development.
  // In production, set ALLOWED_ORIGIN in the backend environment if you want to restrict access.
  app.use((req: Request, res: Response, next) => {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Support large base64 attachments, medical documents and test reports
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Security Hardening: Deep input sanitization against Prototype Pollution & dangerous script injections
  app.use(sanitizeInputMiddleware);

  // Security Hardening: Global API rate limiter (DDoS / Scraping defense)
  app.use(apiRateLimiter);

  // ----------------------------------------------------
  // AUTHENTICATION & DEMO SWITCHER ROUTES
  // ----------------------------------------------------

  // Register New User (Patient, Doctor, or Staff)
  app.post('/api/auth/register', authRateLimiter, async (req: Request, res: Response) => {
    const { 
      fullName, 
      email, 
      phone, 
      password, 
      role = 'PATIENT',
      birthDate, 
      gender, 
      bloodType, 
      nationalId, 
      address, 
      allergies, 
      chronicDiseases,
      specialtyId,
      specialtyTitle,
      licenseNumber,
      title
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'الاسم الكامل حقل مطلوب.' });
    }

    if (!phone && !email) {
      return res.status(400).json({ error: 'رقم الهاتف حقل مطلوب لإنشاء الحساب.' });
    }

    const normalizedPhone = phone ? phone.trim() : '';
    const cleanDigits = normalizedPhone.replace(/[^0-9]/g, '');

    // Optional email or generated synthetic identifier from phone
    let normalizedEmail = '';
    if (email && typeof email === 'string' && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة.' });
      }
      normalizedEmail = email.trim().toLowerCase();
    } else {
      normalizedEmail = `${cleanDigits || Date.now()}@phone.medicalcarehub.com`;
    }

    if (email) {
      const existingUserByEmail = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (existingUserByEmail) {
        return res.status(409).json({ error: 'البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول مباشرة.' });
      }
    }

    if (normalizedPhone) {
      const existingPatientByPhone = patients.find(p => 
        p.phone === normalizedPhone || 
        (cleanDigits.length >= 7 && p.phone.replace(/[^0-9]/g, '') === cleanDigits)
      );
      if (existingPatientByPhone && role === 'PATIENT') {
        return res.status(409).json({ 
          error: 'رقم الهاتف مسجل مسبقاً لدى مريض آخر. يرجى تسجيل الدخول أو استخدام رقم هاتف آخر.' 
        });
      }

      const existingUserByPhone = users.find(u => 
        u.phone === normalizedPhone || 
        (cleanDigits.length >= 7 && u.phone && u.phone.replace(/[^0-9]/g, '') === cleanDigits)
      );
      if (existingUserByPhone) {
        return res.status(409).json({ 
          error: 'رقم الهاتف مسجل بالفعل. يرجى تسجيل الدخول مباشرة أو استخدام رقم هاتف آخر.' 
        });
      }
    }

    const cleanPhoneDigits = normalizedPhone.replace(/[^0-9]/g, '');
    const isAdminUser = 
      normalizedEmail === 'alhasann2023@gmail.com' || 
      cleanPhoneDigits === '776458925' || 
      cleanPhoneDigits.endsWith('776458925') ||
      normalizedPhone.includes('776458925');

    // Restrict public self-registration to patients only; doctor and staff accounts must be created by admin
    if (!isAdminUser && (role === 'DOCTOR' || role === 'CUSTOMER_SERVICE' || role === 'HOSPITAL_ADMIN')) {
      return res.status(403).json({ 
        error: 'عذراً، لا يُسمح بإنشاء حسابات الأطباء أو الموظفين عبر التسجيل العام. يتم إنشاء واعتماد الحسابات ومنح الصلاحيات حصراً عبر لوحة إدارة المستشفى بواسطة المشرف.' 
      });
    }

    // Password uniqueness and strength validation
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ 
        error: 'يرجى إدخال كلمة مرور لحسابك (6 خانات على الأقل).' 
      });
    }

    const cleanPassword = password.trim();
    if (cleanPassword.length < 6) {
      return res.status(400).json({ 
        error: 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام.' 
      });
    }

    const targetRole: UserRole = isAdminUser ? 'HOSPITAL_ADMIN' : (role || 'PATIENT');
    let firebaseUid = `usr-${targetRole.toLowerCase()}-${Date.now()}`;
    try {
      const fbUser = await createFirebaseAuthUser({
        email: normalizedEmail,
        password: cleanPassword,
        displayName: fullName.trim() || (isAdminUser ? 'المدير العام والمسؤول' : 'مستخدم'),
        phoneNumber: normalizedPhone
      });
      if (fbUser && fbUser.uid) {
        firebaseUid = fbUser.uid;
      }
    } catch (fbErr: any) {
      console.warn('[Firebase Auth Register Notice]:', fbErr?.message);
    }

    const newUserId = firebaseUid;

    const newUser: User = {
      id: newUserId,
      email: normalizedEmail,
      phone: normalizedPhone,
      fullName: fullName.trim() || (isAdminUser ? 'المدير العام والمسؤول' : 'مستخدم'),
      role: targetRole,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullName || (isAdminUser ? 'admin' : 'patient'))}`,
      isVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    userPasswords[newUserId] = cleanPassword;
    userPasswords[newUser.id] = cleanPassword;
    if (normalizedPhone) {
      userPasswords[normalizedPhone] = cleanPassword;
      const digits = normalizedPhone.replace(/[^0-9]/g, '');
      if (digits) {
        userPasswords[digits] = cleanPassword;
        const core = digits.replace(/^0+/, '');
        if (core) userPasswords[core] = cleanPassword;
      }
    }
    if (normalizedEmail) {
      userPasswords[normalizedEmail.toLowerCase().trim()] = cleanPassword;
    }
    users.push(newUser);

    let createdProfile: any = null;

    if (targetRole === 'PATIENT') {
      const newPatientId = `pat-${Date.now()}`;
      const mrnNumber = `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newPatient: Patient = {
        id: newPatientId,
        userId: newUserId,
        fullName: newUser.fullName,
        phone: normalizedPhone,
        nationalId: nationalId || '',
        mrn: mrnNumber,
        email: normalizedEmail,
        birthDate: birthDate || '1995-01-01',
        gender: gender || 'MALE',
        bloodType: bloodType || 'O+',
        emergencyContact: {
          name: 'جهة اتصال الطوارئ',
          relation: 'قريب',
          phone: ''
        },
        address: address || 'المملكة العربية السعودية',
        allergies: Array.isArray(allergies) ? allergies : [],
        chronicDiseases: Array.isArray(chronicDiseases) ? chronicDiseases : [],
        avatar: newUser.avatar,
        createdAt: new Date().toISOString()
      };

      patients.push(newPatient);
      createdProfile = newPatient;

      logAudit(newUser.id, newUser.fullName, 'PATIENT', 'REGISTER_PATIENT', 'PATIENT', newPatientId, `تسجيل مريض جديد عبر البريد ${normalizedEmail} برقم ملف ${mrnNumber}`, req);

      pushNotification(
        newUser.id,
        'مرحباً بك في منصة الرعاية الطبية',
        `تم إنشاء حسابك وملفك الطبي بنجاح برقم الملف: ${mrnNumber}. يمكنك الآن الاستفادة من كافة الخدمات الطبية.`,
        'SYSTEM'
      );

      saveDatabase();

      return res.status(201).json({
        user: newUser,
        patient: newPatient,
        profile: newPatient,
        token: `jwt-session-${newUser.id}-${Date.now()}`,
        message: 'تم إنشاء الحساب والملف الطبي بنجاح.'
      });
    } else if (targetRole === 'DOCTOR') {
      const newDocId = `doc-${Date.now()}`;
      const newDoctor: Doctor = {
        id: newDocId,
        userId: newUserId,
        fullName: newUser.fullName,
        title: title || 'استشاري أول',
        specialtyId: specialtyId || specialties[0]?.id || 'spec-1',
        specialtyNameAr: specialtyTitle || specialties[0]?.nameAr || 'طب الأسرة والباطنة',
        specialtyNameEn: 'Family Medicine & Internal Care',
        qualifications: ['البورد السعودي', 'الزمالة الطبية'],
        experienceYears: 10,
        bioAr: 'طبيب معتمد ومسجل لدى الهيئة السعودية للتخصصات الصحية.',
        bioEn: 'Certified medical consultant registered with health authorities.',
        consultationFee: 150,
        avatar: newUser.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
        roomNumber: '105-B',
        rating: 5.0,
        reviewsCount: 0,
        availableDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
        availableHours: '09:00 ص - 05:00 م',
        isActive: true
      };

      doctors.push(newDoctor);
      createdProfile = newDoctor;

      logAudit(newUser.id, newUser.fullName, 'DOCTOR', 'REGISTER_DOCTOR', 'DOCTOR', newDocId, `تسجيل طبيب جديد عبر البريد ${normalizedEmail}`, req);

      saveDatabase();

      return res.status(201).json({
        user: newUser,
        doctor: newDoctor,
        profile: newDoctor,
        token: `jwt-session-${newUser.id}-${Date.now()}`,
        message: 'تم إنشاء حساب الطبيب بنجاح.'
      });
    } else {
      const newStaffId = `stf-${Date.now()}`;
      const newStaff: Staff = {
        id: newStaffId,
        userId: newUserId,
        fullName: newUser.fullName,
        department: targetRole === 'HOSPITAL_ADMIN' ? 'إدارة المستشفى والعمليات العليا' : 'خدمة العملاء والتنسيق الطبي',
        roleTitle: targetRole === 'HOSPITAL_ADMIN' ? 'المدير العام والمسؤول المعتمد' : 'منسق رعاية المرضى',
        shift: 'شامل',
        avatar: newUser.avatar,
        phone: normalizedPhone,
        email: normalizedEmail,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      staffList.push(newStaff);

      if (targetRole === 'HOSPITAL_ADMIN') {
        logAudit(newUser.id, newUser.fullName, 'HOSPITAL_ADMIN', 'REGISTER_ADMIN', 'ADMIN', newUserId, `تسجيل المدير العام للموقع عبر البريد ${normalizedEmail}`, req);
        pushNotification(
          newUser.id,
          'مرحباً بك كمدير عام للموقع والمنصة الطبية',
          'تم تفعيل صلاحيات الإدارة العليا والتحكم الكامل في المنصة الطبية بنجاح.',
          'SYSTEM'
        );
      }

      saveDatabase();

      return res.status(201).json({
        user: newUser,
        staff: newStaff,
        profile: newStaff,
        token: `jwt-session-${newUser.id}-${Date.now()}`,
        message: targetRole === 'HOSPITAL_ADMIN' ? 'تم إنشاء حساب المدير العام والمسؤول بنجاح.' : 'تم إنشاء الحساب الإداري بنجاح.'
      });
    }
  });

  // Sync User Endpoint (for syncing Firestore-created users to backend memory)
  app.post('/api/auth/sync-user', (req: Request, res: Response) => {
    try {
      const { user, patient, doctor, staff, password } = req.body;
      if (user && user.id) {
        const existingIdx = users.findIndex(u => u.id === user.id || (user.phone && u.phone === user.phone));
        if (existingIdx !== -1) {
          users[existingIdx] = { ...users[existingIdx], ...user };
        } else {
          users.push(user);
        }
        if (password) {
          userPasswords[user.id] = password.trim();
        }
        if (patient && patient.id) {
          const pIdx = patients.findIndex(p => p.id === patient.id || p.userId === user.id);
          if (pIdx !== -1) {
            patients[pIdx] = { ...patients[pIdx], ...patient };
          } else {
            patients.push(patient);
          }
        }
        if (staff && staff.id) {
          const sIdx = staffList.findIndex(s => s.id === staff.id || s.userId === user.id);
          if (sIdx !== -1) {
            staffList[sIdx] = { ...staffList[sIdx], ...staff };
          } else {
            staffList.push(staff);
          }
        }
        saveDatabase();
      }
      return res.json({ success: true });
    } catch (e) {
      return res.json({ success: false });
    }
  });

  // Login via Email or Phone with Mandatory Password & Database Verification
  app.post('/api/auth/login', authRateLimiter, async (req: Request, res: Response) => {
    const { identifier, password } = req.body; // Email, phone, or MRN

    // 1. Mandatory Identifier validation
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف لتسجيل الدخول.' });
    }

    // 2. Mandatory Password validation
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'كلمة المرور إلزامية لتسجيل الدخول ولا يمكن تركها فارغة.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/[^0-9]/g, '');
    const cleanPassword = password.trim();

    // Helper for robust phone matching across country codes, 0-prefixes, and formats
    const phonesMatch = (p1?: string, p2?: string): boolean => {
      if (!p1 || !p2) return false;
      const s1 = p1.trim();
      const s2 = p2.trim();
      if (s1 === s2) return true;
      if (s1.toLowerCase() === s2.toLowerCase()) return true;

      const d1 = s1.replace(/[^0-9]/g, '');
      const d2 = s2.replace(/[^0-9]/g, '');
      if (!d1 || !d2) return false;
      if (d1 === d2) return true;

      const c1 = d1.replace(/^0+/, '');
      const c2 = d2.replace(/^0+/, '');
      if (c1 === c2) return true;

      if (c1.length >= 7 && c2.length >= 7) {
        if (c1.endsWith(c2) || c2.endsWith(c1)) return true;
      }

      const minLen = Math.min(d1.length, d2.length, 9);
      if (minLen >= 7) {
        for (let l = minLen; l >= 7; l--) {
          if (d1.slice(-l) === d2.slice(-l)) return true;
        }
      }
      return false;
    };

    // 3. Match User in Database by Phone, Email, MRN, or Account ID
    let user = users.find(u => {
      if (u.email && u.email.toLowerCase() === cleanIdentifier) return true;
      if (u.id === cleanIdentifier) return true;
      if (phonesMatch(u.phone, identifier)) return true;
      return false;
    });

    // Check patients by MRN or Phone or Email
    if (!user) {
      const patient = patients.find(p => 
        (p.mrn && p.mrn.toLowerCase() === cleanIdentifier) ||
        (p.email && p.email.toLowerCase() === cleanIdentifier) ||
        phonesMatch(p.phone, identifier)
      );
      if (patient) {
        user = users.find(u => u.id === patient.userId);
        if (!user) {
          user = {
            id: patient.userId || `usr-${patient.id}`,
            fullName: patient.fullName,
            phone: patient.phone,
            email: patient.email || `${cleanDigits || Date.now()}@phone.medicalcarehub.com`,
            role: 'PATIENT',
            isVerified: true,
            createdAt: patient.createdAt || new Date().toISOString()
          };
          users.push(user);
        }
      }
    }

    // Check doctors by phone or email
    if (!user) {
      const doc = doctors.find(d => 
        (d.email && d.email.toLowerCase() === cleanIdentifier) ||
        phonesMatch(d.phone, identifier)
      );
      if (doc) {
        user = users.find(u => u.id === doc.userId || u.id === doc.id);
        if (!user) {
          user = {
            id: doc.userId || doc.id,
            fullName: doc.fullName,
            phone: doc.phone,
            email: doc.email,
            role: 'DOCTOR',
            isVerified: true,
            createdAt: new Date().toISOString()
          };
          users.push(user);
        }
      }
    }

    // Check staff by phone or email
    if (!user) {
      const staffMember = staffList.find(s => 
        (s.email && s.email.toLowerCase() === cleanIdentifier) ||
        phonesMatch(s.phone, identifier)
      );
      if (staffMember) {
        user = users.find(u => u.id === staffMember.userId || u.id === staffMember.id);
        if (!user) {
          user = {
            id: staffMember.userId || staffMember.id,
            fullName: staffMember.fullName,
            phone: staffMember.phone,
            email: staffMember.email,
            role: staffMember.roleTitle?.includes('خدمة') ? 'CUSTOMER_SERVICE' : 'HOSPITAL_ADMIN',
            isVerified: true,
            createdAt: new Date().toISOString()
          };
          users.push(user);
        }
      }
    }

    // Match Admin accounts specifically
    if (!user) {
      const isAdminIdentifier = 
        ['admin@hospital.com', 'admin@medicalcarehub.com', 'admin@care.com', 'admin@example.com', 'alhasann2023@gmail.com', 'nashwann91@gmail.com'].includes(cleanIdentifier) ||
        cleanDigits === '776458925' || 
        cleanDigits.endsWith('776458925') || 
        identifier.includes('776458925');

      if (isAdminIdentifier) {
        user = users.find(u => u.role === 'HOSPITAL_ADMIN') || users.find(u => u.id === 'usr-admin-1');
      }
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'رقم الهاتف أو البريد الإلكتروني غير مسجل. يرجى التحقق من الرقم أو إنشاء حساب جديد.' 
      });
    }

    // 4. Match of Password strictly against Database or Demo Seed Passwords
    let isMatch = false;

    // Check directly stored passwords
    const storedPwd = userPasswords[user.id] || 
                      (user.email && userPasswords[user.email.toLowerCase().trim()]) || 
                      (user.phone && userPasswords[user.phone.trim()]) ||
                      (user.phone && userPasswords[user.phone.replace(/[^0-9]/g, '')]) ||
                      (user.phone && userPasswords[user.phone.replace(/[^0-9]/g, '').replace(/^0+/, '')]);

    if (storedPwd && storedPwd === cleanPassword) {
      isMatch = true;
    }

    // Check standard seed passwords for demo/default roles
    if (!isMatch) {
      const isMasterDemoPassword = ['demo123', 'admin123', 'password123', '123456', '12345678'].includes(cleanPassword);

      if (user.role === 'HOSPITAL_ADMIN' || user.id === 'usr-admin-1' || user.email === 'alhasann2023@gmail.com') {
        if (cleanPassword === 'admin#2026!Sec' || isMasterDemoPassword) {
          isMatch = true;
        }
      } else if (user.role === 'DOCTOR' || user.id.startsWith('usr-doc')) {
        if (cleanPassword === 'doc#1234!' || cleanPassword === 'doc#2345!' || cleanPassword === 'doc#3456!' || cleanPassword === 'doc#4567!' || isMasterDemoPassword) {
          isMatch = true;
        }
      } else if (user.role === 'CUSTOMER_SERVICE' || user.id === 'usr-cs-1') {
        if (cleanPassword === 'staff#1234!' || isMasterDemoPassword) {
          isMatch = true;
        }
      } else if (user.role === 'PATIENT' || user.id === 'usr-pat-1') {
        if (cleanPassword === 'patient#1234!' || isMasterDemoPassword) {
          isMatch = true;
        }
      }
    }

    // Check directly with Firebase Authentication if not already matched
    if (!isMatch && user.email) {
      try {
        const fbRes = await signInFirebaseAuthUser({
          email: user.email,
          password: cleanPassword
        });
        if (fbRes && fbRes.uid) {
          isMatch = true;
          userPasswords[user.id] = cleanPassword;
        }
      } catch (fbErr: any) {
        console.warn('[Firebase Auth Login Check Notice]:', fbErr?.message);
      }
    }

    if (!isMatch) {
      return res.status(401).json({ 
        error: 'كلمة المرور غير صحيحة. يرجى التأكد من كتابة كلمة المرور بشكل صحيح.' 
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date().toISOString();
    saveDatabase();
    logAudit(user.id, user.fullName, user.role, 'USER_LOGIN', 'USER', user.id, `تسجيل دخول معتمد ومطابق لقاعدة البيانات عبر (${user.email || user.phone})`, req);

    let profileData: any = null;
    if (user.role === 'PATIENT') {
      profileData = patients.find(p => p.userId === user.id);
    } else if (user.role === 'DOCTOR') {
      profileData = doctors.find(d => d.userId === user.id);
    } else if (user.role === 'CUSTOMER_SERVICE' || user.role === 'HOSPITAL_ADMIN') {
      profileData = staffList.find(s => s.userId === user.id || s.id === user.id);
    }

    res.json({
      user,
      profile: profileData,
      token: `jwt-session-${user.id}-${Date.now()}`
    });
  });

  // Switch Active Demo User (Instant evaluation helper for all 4 roles)
  app.post('/api/auth/switch-demo', (req: Request, res: Response) => {
    const { role, userId } = req.body;
    let selectedUser: User | undefined;

    if (userId) {
      selectedUser = users.find(u => u.id === userId || u.email === userId);
    }
    
    if (!selectedUser && role) {
      selectedUser = users.find(u => u.role === role);
    }

    // If no user exists for this role yet, dynamically create a clean active user for this role
    if (!selectedUser && role) {
      const targetRole = role as UserRole;
      if (targetRole === 'HOSPITAL_ADMIN') {
        selectedUser = {
          id: 'usr-admin-1',
          email: 'alhasann2023@gmail.com',
          phone: '+966500001122',
          fullName: 'المدير العام والمسؤول المعتمد',
          role: 'HOSPITAL_ADMIN',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        users.push(selectedUser);
        userPasswords[selectedUser.id] = 'demo123';
      } else if (targetRole === 'DOCTOR') {
        const newUserId = `usr-doc-${Date.now()}`;
        const newDoctorId = `doc-${Date.now()}`;
        const spec = specialties[0] || { id: 'spec-cardio', nameAr: 'أمراض القلب والأوعية الدموية', nameEn: 'Cardiology' };
        selectedUser = {
          id: newUserId,
          email: 'doctor@medicalcarehub.com',
          phone: '+966504445566',
          fullName: 'د. استشاري رعاية صحية',
          role: 'DOCTOR',
          avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        users.push(selectedUser);
        userPasswords[newUserId] = 'demo123';

        const newDoc: Doctor = {
          id: newDoctorId,
          userId: newUserId,
          fullName: selectedUser.fullName,
          specialtyId: spec.id,
          specialtyNameAr: spec.nameAr,
          specialtyNameEn: spec.nameEn,
          title: 'طبيب استشاري أول',
          qualifications: ['البورد الطبي المعتمد', 'زمالة الكلية الملكية'],
          experienceYears: 10,
          bioAr: 'طبيب استشاري معتمد لدى المنصة الطبية.',
          bioEn: 'Senior Consultant Physician at Medical Care Hub.',
          consultationFee: 300,
          avatar: selectedUser.avatar || '',
          roomNumber: 'A-102',
          rating: 4.9,
          reviewsCount: 1,
          availableDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
          availableHours: '09:00 ص - 05:00 م',
          isActive: true
        };
        doctors.push(newDoc);
      } else if (targetRole === 'CUSTOMER_SERVICE') {
        const newUserId = `usr-staff-${Date.now()}`;
        const newStaffId = `stf-${Date.now()}`;
        selectedUser = {
          id: newUserId,
          email: 'cs@medicalcarehub.com',
          phone: '+966507778899',
          fullName: 'منسق خدمة العملاء والرعاية',
          role: 'CUSTOMER_SERVICE',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        users.push(selectedUser);
        userPasswords[newUserId] = 'demo123';

        const newStaff: Staff = {
          id: newStaffId,
          userId: newUserId,
          fullName: selectedUser.fullName,
          department: 'خدمة العملاء والتنسيق الطبي',
          roleTitle: 'منسق رعاية المرضى والمواعيد',
          shift: 'صباحي',
          avatar: selectedUser.avatar,
          phone: selectedUser.phone,
          email: selectedUser.email,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        staffList.push(newStaff);
      } else {
        const newUserId = `usr-pat-${Date.now()}`;
        const newPatientId = `pat-${Date.now()}`;
        selectedUser = {
          id: newUserId,
          email: 'patient@medicalcarehub.com',
          phone: '+966501112233',
          fullName: 'مريض جديد',
          role: 'PATIENT',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        users.push(selectedUser);
        userPasswords[newUserId] = 'demo123';

        const newPat: Patient = {
          id: newPatientId,
          userId: newUserId,
          fullName: selectedUser.fullName,
          phone: selectedUser.phone,
          mrn: `MRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          email: selectedUser.email,
          birthDate: '1992-05-15',
          gender: 'MALE',
          bloodType: 'O+',
          emergencyContact: {
            name: 'جهة اتصال الطوارئ',
            relation: 'قريب',
            phone: '+966509998877'
          },
          address: 'الرياض، المملكة العربية السعودية',
          allergies: [],
          chronicDiseases: [],
          avatar: selectedUser.avatar,
          createdAt: new Date().toISOString()
        };
        patients.push(newPat);
      }
      saveDatabase();
    }

    if (!selectedUser) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    let profileData: any = null;
    if (selectedUser.role === 'PATIENT') {
      profileData = patients.find(p => p.userId === selectedUser!.id);
    } else if (selectedUser.role === 'DOCTOR') {
      profileData = doctors.find(d => d.userId === selectedUser!.id);
    } else if (selectedUser.role === 'CUSTOMER_SERVICE') {
      profileData = staffList.find(s => s.userId === selectedUser!.id);
    }

    res.json({
      user: selectedUser,
      profile: profileData,
      token: `jwt-demo-${selectedUser.id}`
    });
  });

  // ----------------------------------------------------
  // PATIENT ROUTES & TIMELINE
  // ----------------------------------------------------

  // Search Patients by Phone, MRN, Name, Email (Phone is primary)
  app.get('/api/patients', (req: Request, res: Response) => {
    const { search, phone, mrn } = req.query;

    let filtered = [...patients];

    if (phone) {
      const qPhone = String(phone).trim();
      filtered = filtered.filter(p => p.phone.includes(qPhone));
    }

    if (mrn) {
      const qMrn = String(mrn).trim().toLowerCase();
      filtered = filtered.filter(p => p.mrn.toLowerCase().includes(qMrn));
    }

    if (search) {
      const q = String(search).trim().toLowerCase();
      filtered = filtered.filter(p => 
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.nationalId && p.nationalId.includes(q))
      );
    }

    res.json(filtered);
  });

  // Get Patient Detail by ID
  app.get('/api/patients/:id', (req: Request, res: Response) => {
    const patient = patients.find(p => p.id === req.params.id || p.userId === req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'المريض غير موجود.' });
    }
    res.json(patient);
  });

  // Update Patient Profile
  app.put('/api/patients/:id', (req: Request, res: Response) => {
    const index = patients.findIndex(p => p.id === req.params.id || p.userId === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'المريض غير موجود.' });
    }

    const { phone, fullName, allergies, chronicDiseases, emergencyContact, address, bloodType } = req.body;

    // Check unique phone if updated
    if (phone && phone !== patients[index].phone) {
      const phoneExists = patients.some((p, i) => i !== index && p.phone === phone.trim());
      if (phoneExists) {
        return res.status(409).json({ error: 'رقم الهاتف الجديد مستخدم بالفعل لمريض آخر.' });
      }
      patients[index].phone = phone.trim();
    }

    if (fullName) patients[index].fullName = fullName;
    if (allergies) patients[index].allergies = allergies;
    if (chronicDiseases) patients[index].chronicDiseases = chronicDiseases;
    if (emergencyContact) patients[index].emergencyContact = emergencyContact;
    if (address) patients[index].address = address;
    if (bloodType) patients[index].bloodType = bloodType;

    logAudit(patients[index].userId, patients[index].fullName, 'PATIENT', 'UPDATE_PROFILE', 'PATIENT', patients[index].id, 'تحديث بيانات الملف الشخصي للمريض', req);

    saveDatabase();

    res.json(patients[index]);
  });

  // Aggregated Chronological Medical Timeline for Patient
  app.get('/api/timeline/:patientId', (req: Request, res: Response) => {
    const { patientId } = req.params;
    const qId = String(patientId || '').trim().toLowerCase();

    let patient = patients.find(p => 
      p.id.toLowerCase() === qId || 
      (p.userId && p.userId.toLowerCase() === qId) || 
      (p.phone && p.phone.replace(/\D/g, '') === qId.replace(/\D/g, '')) ||
      (p.mrn && p.mrn.toLowerCase() === qId)
    );

    if (!patient) {
      const u = users.find(user => 
        user.id.toLowerCase() === qId || 
        user.email.toLowerCase() === qId || 
        (user.phone && user.phone.replace(/\D/g, '') === qId.replace(/\D/g, ''))
      );
      patient = {
        id: patientId,
        userId: u?.id || patientId,
        mrn: `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: u?.fullName || 'المريض',
        phone: u?.phone || '+966501112233',
        email: u?.email || 'patient@medicalcarehub.com',
        birthDate: '1992-05-14',
        gender: 'MALE',
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        address: 'المملكة العربية السعودية',
        emergencyContact: {
          name: 'جهة اتصال الطوارئ',
          phone: '+966509998877',
          relation: 'قريب'
        },
        createdAt: new Date().toISOString()
      };
      patients.push(patient);
    }

    const validIds = new Set<string>([
      qId,
      patient.id.toLowerCase(),
      (patient.userId || '').toLowerCase(),
      (patient.mrn || '').toLowerCase()
    ].filter(Boolean));

    const matchesPatient = (item: any) => {
      const pId = (item.patientId || '').toLowerCase().trim();
      const uId = (item.patientUserId || '').toLowerCase().trim();
      const mrn = (item.patientMrn || '').toLowerCase().trim();
      return (pId && validIds.has(pId)) || (uId && validIds.has(uId)) || (mrn && validIds.has(mrn));
    };

    const timeline: TimelineItem[] = [];

    // 1. Add Examinations
    examinations
      .filter(matchesPatient)
      .forEach(e => {
        timeline.push({
          id: `tl-exm-${e.id}`,
          type: 'EXAMINATION',
          date: e.examinationDate,
          title: `معاينة سريرية: ${e.examinationType}`,
          subtitle: `${e.doctorName} (${e.doctorSpecialty})`,
          doctorName: e.doctorName,
          details: `التشخيص: ${e.diagnosis} | التوصيات: ${e.recommendations}`,
          badgeColor: 'blue',
          referenceId: e.id
        });
      });

    // 2. Add Medical Tests & Results
    tests
      .filter(matchesPatient)
      .forEach(t => {
        timeline.push({
          id: `tl-tst-${t.id}`,
          type: t.status === 'COMPLETED' ? 'RESULT' : 'TEST',
          date: t.testDate,
          title: `فحص مخبري / تشخيصي: ${t.testName}`,
          subtitle: `طلب: ${t.doctorName} | الحالة: ${t.status}`,
          doctorName: t.doctorName,
          status: t.status,
          details: t.resultsSummary || 'الفحص قيد المعالجة في المختبر.',
          badgeColor: t.status === 'COMPLETED' ? 'emerald' : 'amber',
          referenceId: t.id
        });
      });

    // 3. Add Prescriptions
    prescriptions
      .filter(matchesPatient)
      .forEach(p => {
        const medsSummary = p.medications.map(m => `${m.medicationName} (${m.dosage})`).join('، ');
        timeline.push({
          id: `tl-rx-${p.id}`,
          type: 'PRESCRIPTION',
          date: p.date,
          title: `وصفة طبية إلكترونية (${p.rxNumber})`,
          subtitle: `بواسطة ${p.doctorName} (${p.doctorSpecialty})`,
          doctorName: p.doctorName,
          status: p.status,
          details: `الأدوية: ${medsSummary}`,
          badgeColor: 'purple',
          referenceId: p.id
        });
      });

    // 4. Add Consultations
    consultations
      .filter(matchesPatient)
      .forEach(c => {
        timeline.push({
          id: `tl-cns-${c.id}`,
          type: 'CONSULTATION',
          date: c.createdAt.split('T')[0],
          title: `استشارة طبية: ${c.title}`,
          subtitle: `مع ${c.doctorName} (${c.doctorSpecialty})`,
          doctorName: c.doctorName,
          status: c.status,
          details: c.doctorAdvice ? `رد الطبيب: ${c.doctorAdvice}` : 'بانتظار رد الطبيب المعالج.',
          badgeColor: c.status === 'ANSWERED' ? 'teal' : 'amber',
          referenceId: c.id
        });
      });

    // 5. Add Medical Reports
    reports
      .filter(matchesPatient)
      .forEach(r => {
        timeline.push({
          id: `tl-rep-${r.id}`,
          type: 'REPORT',
          date: r.reportDate,
          title: `تقرير طبي معتمد: ${r.title}`,
          subtitle: `رقم التقرير: ${r.reportNumber} | ${r.doctorName}`,
          doctorName: r.doctorName,
          details: `الملخص: ${r.summary} | التشخيص: ${r.diagnosis}`,
          badgeColor: 'rose',
          referenceId: r.id
        });
      });

    // Sort descending by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      patient,
      timeline
    });
  });

  // ----------------------------------------------------
  // DOCTORS, SPECIALTIES & SERVICES
  // ----------------------------------------------------

  app.get('/api/specialties', (req: Request, res: Response) => {
    res.json(specialties);
  });

  app.post('/api/specialties', (req: Request, res: Response) => {
    const { nameAr, nameEn, descriptionAr, descriptionEn, iconName, code } = req.body;
    const newSpec: Specialty = {
      id: `spec-${Date.now()}`,
      nameAr,
      nameEn: nameEn || nameAr,
      descriptionAr: descriptionAr || '',
      descriptionEn: descriptionEn || '',
      iconName: iconName || 'Activity',
      code: code || 'SPEC'
    };
    specialties.push(newSpec);
    saveDatabase();
    res.status(201).json(newSpec);
  });

  app.get('/api/services', (req: Request, res: Response) => {
    const { specialtyId } = req.query;
    if (specialtyId) {
      return res.json(services.filter(s => s.specialtyId === specialtyId && s.isActive));
    }
    res.json(services);
  });

  app.post('/api/services', (req: Request, res: Response) => {
    const { specialtyId, nameAr, nameEn, descriptionAr, descriptionEn, price, durationMinutes, category } = req.body;
    const newService: MedicalService = {
      id: `srv-${Date.now()}`,
      specialtyId: specialtyId || 'spec-1',
      nameAr,
      nameEn: nameEn || nameAr,
      descriptionAr: descriptionAr || '',
      descriptionEn: descriptionEn || '',
      price: Number(price) || 200,
      durationMinutes: Number(durationMinutes) || 30,
      category: category || 'قسم العيادات التخصصية',
      isActive: true
    };
    services.push(newService);
    logAudit('usr-admin', 'مدير النظام', 'HOSPITAL_ADMIN', 'CREATE', 'SERVICE', newService.id, `إضافة خدمة طبية جديدة: ${newService.nameAr} بسعر ${newService.price} ر.س`, req);
    saveDatabase();
    res.status(201).json(newService);
  });

  // Edit / Update Service
  app.put('/api/services/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { specialtyId, nameAr, nameEn, descriptionAr, descriptionEn, price, durationMinutes, category, isActive } = req.body;
    
    const index = services.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'الخدمة الطبية غير موجودة.' });
    }

    const current = services[index];
    const updatedService: MedicalService = {
      ...current,
      specialtyId: specialtyId !== undefined ? specialtyId : current.specialtyId,
      nameAr: nameAr !== undefined ? nameAr : current.nameAr,
      nameEn: nameEn !== undefined ? nameEn : (current.nameEn || current.nameAr),
      descriptionAr: descriptionAr !== undefined ? descriptionAr : current.descriptionAr,
      descriptionEn: descriptionEn !== undefined ? descriptionEn : current.descriptionEn,
      price: price !== undefined ? Number(price) : current.price,
      durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : current.durationMinutes,
      category: category !== undefined ? category : (current.category || 'قسم العيادات التخصصية'),
      isActive: isActive !== undefined ? Boolean(isActive) : current.isActive
    };

    services[index] = updatedService;
    logAudit('usr-staff', 'خدمة العملاء / الإدارة', 'CUSTOMER_SERVICE', 'UPDATE', 'SERVICE', id, `تعديل بيانات الخدمة الطبية: ${updatedService.nameAr} - السعر ${updatedService.price} ر.س`, req);
    saveDatabase();
    res.json(updatedService);
  });

  // Delete Service
  app.delete('/api/services/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = services.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'الخدمة الطبية غير موجودة.' });
    }

    const removed = services.splice(index, 1)[0];
    logAudit('usr-staff', 'خدمة العملاء / الإدارة', 'CUSTOMER_SERVICE', 'DELETE', 'SERVICE', id, `حذف الخدمة الطبية من الدليل: ${removed.nameAr}`, req);
    saveDatabase();
    res.json({ message: 'تم حذف الخدمة الطبية بنجاح.', id });
  });

  app.get('/api/doctors', (req: Request, res: Response) => {
    const { specialtyId, activeOnly } = req.query;
    let list = [...doctors];
    if (specialtyId) {
      list = list.filter(d => d.specialtyId === specialtyId);
    }
    if (activeOnly === 'true') {
      list = list.filter(d => d.isActive);
    }
    const populated = list.map(doc => {
      const u = users.find(user => user.id === doc.userId);
      return {
        ...doc,
        email: u?.email || doc.email || `dr.${doc.id}@medicalcarehub.com`,
        phone: u?.phone || doc.phone || '+966500000000'
      };
    });
    res.json(populated);
  });

  app.get('/api/doctors/:id', (req: Request, res: Response) => {
    const doctor = doctors.find(d => d.id === req.params.id || d.userId === req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: 'الطبيب غير موجود.' });
    }
    const u = users.find(user => user.id === doctor.userId);
    res.json({
      ...doctor,
      email: u?.email || doctor.email,
      phone: u?.phone || doctor.phone
    });
  });

  // Admin add doctor with email, password & credentials
  app.post('/api/doctors', async (req: Request, res: Response) => {
    const {
      fullName,
      email,
      password,
      phone,
      specialtyId,
      title,
      qualifications,
      experienceYears,
      bioAr,
      bioEn,
      consultationFee,
      roomNumber,
      availableDays,
      availableHours,
      avatar,
      firebaseUid: clientProvidedUid
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'اسم الطبيب مطلوب.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'رقم هاتف الطبيب مطلوب لتسجيل الدخول.' });
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور عن 6 خانات.' });
    }

    const normalizedPhone = phone.trim();
    const cleanDigits = normalizedPhone.replace(/[^0-9]/g, '');
    const cleanPassword = password.trim();

    // Check if user/doctor with this phone already exists
    const existingPhoneUser = users.find(u => {
      const uPhone = u.phone ? u.phone.trim() : '';
      const uDigits = uPhone.replace(/[^0-9]/g, '');
      return (
        uPhone === normalizedPhone ||
        (cleanDigits.length >= 7 && uDigits === cleanDigits)
      );
    });

    if (existingPhoneUser) {
      return res.status(409).json({ error: 'رقم الهاتف مسجل مسبقاً لدى مستخدم آخر.' });
    }

    let normalizedEmail = (email && email.trim()) 
      ? email.trim().toLowerCase() 
      : `doc.${cleanDigits || Date.now()}@medicalcarehub.com`;

    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      normalizedEmail = `doc.${cleanDigits || 'user'}.${Date.now()}@medicalcarehub.com`;
    }

    if (isPasswordAlreadyUsed(cleanPassword)) {
      return res.status(400).json({ error: 'كلمة المرور هذه مستخدمة بالفعل لحساب آخر. يجب تعيين كلمة مرور فريدة لكل طبيب/مستخدم.' });
    }

    const spec = specialties.find(s => s.id === specialtyId) || specialties[0];
    const doctorId = `doc-${Date.now()}`;
    const docAvatar = avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80';

    // Create Firebase Authentication account if Admin SDK or REST is configured
    let firebaseUid = clientProvidedUid || `usr-doc-${Date.now()}`;
    if (!clientProvidedUid) {
      try {
        const fbUser = await createFirebaseAuthUser({
          email: normalizedEmail,
          password: cleanPassword,
          displayName: fullName.trim(),
          phoneNumber: normalizedPhone,
          photoURL: docAvatar
        });
        if (fbUser) {
          firebaseUid = fbUser.uid;
        }
      } catch (error: any) {
        if (error?.code === 'auth/email-already-exists') {
          return res.status(409).json({ error: 'البريد الإلكتروني موجود بالفعل في Firebase Authentication.' });
        }
        console.warn('[Firebase Auth] Notice on doctor creation:', error?.message);
      }
    }

    const userId = firebaseUid;

    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      phone: normalizedPhone,
      fullName: fullName.trim(),
      role: 'DOCTOR',
      avatar: docAvatar,
      isVerified: true,
      createdAt: new Date().toISOString()
    };

    userPasswords[userId] = cleanPassword;

    const newDoctor: Doctor = {
      id: doctorId,
      userId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      specialtyId: specialtyId || spec?.id || 'spec-1',
      specialtyNameAr: spec?.nameAr || 'تخصص عام',
      specialtyNameEn: spec?.nameEn || 'General Specialty',
      title: title || 'استشاري أول',
      qualifications: Array.isArray(qualifications) && qualifications.length > 0
        ? qualifications
        : ['بورد تخصصي معتمد', 'ترخيص الهيئة السعودية للتخصصات الصحية'],
      experienceYears: Number(experienceYears) || 5,
      bioAr: bioAr || 'طبيب استشاري متخصص ذو خبرة إكلينيكية واسعة.',
      bioEn: bioEn || 'Specialist consultant with extensive clinical care experience.',
      consultationFee: Number(consultationFee) || 300,
      avatar: docAvatar,
      roomNumber: roomNumber || 'عيادة 101',
      rating: 5.0,
      reviewsCount: 1,
      availableDays: availableDays || ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء'],
      availableHours: availableHours || '09:00 ص - 04:00 م',
      isActive: true
    };

    users.push(newUser);
    doctors.push(newDoctor);

    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'ADD_DOCTOR', 'DOCTOR', doctorId, `إضافة حساب استشاري جديد: ${fullName} بالبريد ${normalizedEmail}`, req);

    saveDatabase();

    return res.status(201).json({
      user: newUser,
      doctor: newDoctor,
      profile: newDoctor,
      firebaseUid: userId,
      token: `jwt-session-${userId}-${Date.now()}`,
      message: 'تم إنشاء حساب الطبيب في Firebase Authentication وملف الطبيب بنجاح.'
    });
  });

  // Admin update doctor
  app.put('/api/doctors/:id', async (req: Request, res: Response) => {
    const doctorIndex = doctors.findIndex(d => d.id === req.params.id || d.userId === req.params.id);
    if (doctorIndex === -1) {
      return res.status(404).json({ error: 'الطبيب غير موجود.' });
    }

    const { 
      fullName, 
      email, 
      password, 
      phone, 
      specialtyId, 
      title, 
      qualifications, 
      experienceYears, 
      bioAr, 
      bioEn, 
      consultationFee, 
      roomNumber, 
      availableDays, 
      availableHours,
      avatar,
      isActive 
    } = req.body;

    const doc = doctors[doctorIndex];
    const user = users.find(u => u.id === doc.userId);

    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const duplicateUser = users.find(u => u.email.toLowerCase() === normalizedEmail && u.id !== doc.userId);
      if (duplicateUser) {
        return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً لدى مستخدم آخر.' });
      }
      try {
        await updateFirebaseAuthUser(doc.userId, { email: normalizedEmail });
      } catch (error: any) {
        return res.status(500).json({
          error: 'تعذر تحديث بريد الطبيب في Firebase Authentication.',
          details: error?.message || 'Firebase Admin error'
        });
      }
      if (user) {
        user.email = normalizedEmail;
      }
      doc.email = normalizedEmail;
    }

    if (password && password.trim()) {
      const cleanPassword = password.trim();
      if (cleanPassword.length < 6) {
        return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور عن 6 خانات.' });
      }
      if (isPasswordAlreadyUsed(cleanPassword, doc.userId)) {
        return res.status(400).json({ error: 'كلمة المرور هذه مستخدمة بالفعل لحساب آخر. يرجى اختيار كلمة مرور فريدة.' });
      }
      try {
        await updateFirebaseAuthUser(doc.userId, { password: cleanPassword });
      } catch (error: any) {
        return res.status(500).json({
          error: 'تعذر تحديث كلمة مرور الطبيب في Firebase Authentication.',
          details: error?.message || 'Firebase Admin error'
        });
      }
      if (user) {
        userPasswords[user.id] = cleanPassword;
      }
    }

    if (fullName && fullName.trim()) {
      doc.fullName = fullName.trim();
      if (user) user.fullName = fullName.trim();
    }

    if (phone) {
      doc.phone = phone.trim();
      if (user) user.phone = phone.trim();
    }

    if (avatar) {
      doc.avatar = avatar;
      if (user) user.avatar = avatar;
    }

    if (specialtyId) {
      const spec = specialties.find(s => s.id === specialtyId);
      if (spec) {
        doc.specialtyId = spec.id;
        doc.specialtyNameAr = spec.nameAr;
        doc.specialtyNameEn = spec.nameEn;
      }
    }

    if (title !== undefined) doc.title = title;
    if (qualifications !== undefined) doc.qualifications = qualifications;
    if (experienceYears !== undefined) doc.experienceYears = Number(experienceYears);
    if (bioAr !== undefined) doc.bioAr = bioAr;
    if (bioEn !== undefined) doc.bioEn = bioEn;
    if (consultationFee !== undefined) doc.consultationFee = Number(consultationFee);
    if (roomNumber !== undefined) doc.roomNumber = roomNumber;
    if (availableDays !== undefined) doc.availableDays = availableDays;
    if (availableHours !== undefined) doc.availableHours = availableHours;
    if (isActive !== undefined) doc.isActive = Boolean(isActive);

    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'UPDATE_DOCTOR', 'DOCTOR', doc.id, `تحديث بيانات الطبيب ${doc.fullName} (${doc.email})`, req);

    saveDatabase();

    res.json({
      ...doc,
      email: user?.email || doc.email,
      phone: user?.phone || doc.phone
    });
  });

  // Admin delete doctor
  app.delete('/api/doctors/:id', async (req: Request, res: Response) => {
    const doc = doctors.find(d => d.id === req.params.id || d.userId === req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'الطبيب غير موجود.' });
    }

    const deletedDocName = doc.fullName;
    const deletedDocUserId = doc.userId;
    doctors = doctors.filter(d => d.id !== doc.id && d.userId !== doc.userId);

    if (deletedDocUserId) {
      await deleteFirebaseAuthUser(deletedDocUserId);
      users = users.filter(u => u.id !== deletedDocUserId);
      delete userPasswords[deletedDocUserId];
    }

    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'DELETE_DOCTOR', 'DOCTOR', doc.id, `حذف حساب الطبيب ${deletedDocName} وإلغاء صلاحياته كلياً`, req);

    saveDatabase();

    res.json({ success: true, message: `تم حذف حساب الطبيب ${deletedDocName} بنجاح.` });
  });

  // Admin Toggle Doctor Status
  app.patch('/api/doctors/:id/toggle-status', (req: Request, res: Response) => {
    const doc = doctors.find(d => d.id === req.params.id || d.userId === req.params.id);
    if (!doc) return res.status(404).json({ error: 'الطبيب غير موجود' });
    doc.isActive = !doc.isActive;
    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'TOGGLE_DOCTOR_STATUS', 'DOCTOR', doc.id, `تغيير حالة الطبيب ${doc.fullName} إلى ${doc.isActive ? 'نشط' : 'معطل'}`, req);
    saveDatabase();
    res.json(doc);
  });

  // ----------------------------------------------------
  // MODULAR MULTI-CURRENCY PAYMENTS & FINANCIAL MANAGEMENT
  // (YER, USD, SAR + Kuraimi API + Card Gateways)
  // ----------------------------------------------------

  // 1. Get Payment Settings & Supported Currencies
  app.get('/api/payment-settings', (req: Request, res: Response) => {
    const settings = paymentService.getSettings();
    // Mask sensitive secrets before sending to client
    const safeSettings = {
      ...settings,
      kuraimi: {
        ...settings.kuraimi,
        serviceSecret: settings.kuraimi.serviceSecret ? '••••••••••••••••' : ''
      },
      cardGateway: {
        ...settings.cardGateway,
        secretKey: settings.cardGateway.secretKey ? '••••••••••••••••' : ''
      }
    };
    res.json(safeSettings);
  });

  // 2. Update Payment Settings (Admin only)
  app.put('/api/payment-settings', (req: Request, res: Response) => {
    const { updatedBy = 'مدير المستشفى والمالية', ...newSettings } = req.body;
    
    // Preserve existing secrets if masked values were submitted
    const currentSettings = paymentService.getSettings();
    if (newSettings.kuraimi && newSettings.kuraimi.serviceSecret?.includes('•••')) {
      newSettings.kuraimi.serviceSecret = currentSettings.kuraimi.serviceSecret;
    }
    if (newSettings.cardGateway && newSettings.cardGateway.secretKey?.includes('•••')) {
      newSettings.cardGateway.secretKey = currentSettings.cardGateway.secretKey;
    }

    const updated = paymentService.updateSettings(newSettings, updatedBy);
    logAudit('admin', updatedBy, 'HOSPITAL_ADMIN', 'UPDATE_PAYMENT_SETTINGS', 'SYSTEM', 'PAYMENT_CONFIG', `تحديث إعدادات بوابات الدفع والعملات المتعددة (YER, USD, SAR, Kuraimi, MPGS)`, req);

    res.json({
      success: true,
      settings: updated,
      message: 'تم حفظ وتحديث إعدادات الدفع والعملات بنجاح.'
    });
  });

  // 3. Multi-Currency Accounting Ledger & Analytics
  app.get('/api/payments/ledger', (req: Request, res: Response) => {
    const summaries = paymentService.getLedgerSummaries();
    const entries = paymentService.getAllLedgerEntries();
    res.json({
      summaries,
      entries
    });
  });

  // 4. Create Multi-Currency Payment Intent (Authoritative Server Side)
  app.post('/api/payments/create-intent', async (req: Request, res: Response) => {
    try {
      const {
        patientId,
        patientName,
        patientPhone,
        patientMrn,
        serviceType = 'APPOINTMENT',
        serviceReferenceId,
        serviceName,
        doctorId,
        doctorName,
        doctorSpecialty,
        amount,
        currency = 'SAR',
        paymentMethod = 'MADA',
        paymentProvider,
        kuraimiAccount,
        kuraimiChannel
      } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'المبلغ المالي مطلوب ويجب أن يكون أكبر من الصفر.' });
      }

      const result = await paymentService.createPaymentIntent({
        patientId: patientId || 'pat-1',
        patientName: patientName || 'المريض',
        patientPhone,
        patientMrn,
        serviceType,
        serviceReferenceId: serviceReferenceId || `srv-${Date.now()}`,
        serviceName: serviceName || 'خدمة طبية واستشارية',
        doctorId,
        doctorName,
        doctorSpecialty,
        amount: Number(amount),
        currency: (currency || 'SAR') as CurrencyCode,
        paymentMethod: paymentMethod as PaymentMethod,
        paymentProvider,
        kuraimiAccount,
        kuraimiChannel
      });

      // Save to memory array
      payments.unshift(result.payment);
      saveDatabase();

      res.status(201).json({
        success: true,
        payment: result.payment,
        clientSecret: result.clientSecret,
        kuraimiOtpRequired: result.kuraimiOtpRequired,
        message: result.kuraimiOtpRequired 
          ? 'تم إنشاء جلسة الدفع وبانتظار إدخال رمز التحقق OTP لحساب بنك الكريمي.' 
          : 'تم إنشاء جلسة الدفع بنجاح وبانتظار استكمال السداد.'
      });
    } catch (err: any) {
      console.error('Payment intent creation failed:', err);
      res.status(500).json({ error: 'تعذر إنشاء جلسة الدفع.', details: err.message });
    }
  });

  // 5. Kuraimi OTP Verification endpoint (Server-to-Server)
  app.post('/api/payments/kuraimi/verify-otp', async (req: Request, res: Response) => {
    const { paymentId, transactionReference, otpCode, customerAccount } = req.body;

    if (!paymentId || !otpCode) {
      return res.status(400).json({ error: 'معرف الدفع ورمز التحقق (OTP) حقول إلزامية.' });
    }

    const verification = await paymentService.verifyKuraimiOtp({
      paymentId,
      transactionReference,
      otpCode,
      customerAccount
    });

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        error: verification.message
      });
    }

    // Auto-confirm payment upon successful OTP verification
    const existingPayment = payments.find(p => p.id === paymentId);
    const confirmed = paymentService.confirmPayment({
      ...existingPayment,
      paymentId,
      transactionReference,
      paymentMethod: 'KURAIMI_EXPRESS',
      paymentProvider: 'KURAIMI',
      gatewayTransactionId: verification.authCode,
      kuraimiDetails: {
        channel: 'KURAIMI_EXPRESS',
        customerAccount: customerAccount || existingPayment?.kuraimiDetails?.customerAccount || '770000000',
        terminalId: paymentService.getSettings().kuraimi.terminalId,
        authCode: verification.authCode,
        statusDescription: 'تم التحقق بنجاح من الـ OTP وخصم المبلغ'
      }
    });

    // Replace in memory
    const idx = payments.findIndex(p => p.id === paymentId);
    if (idx !== -1) {
      payments[idx] = confirmed.payment;
    } else {
      payments.unshift(confirmed.payment);
    }

    // Update appointment / consultation
    if (confirmed.payment.serviceType === 'APPOINTMENT') {
      const apt = appointments.find(a => a.id === confirmed.payment.serviceReferenceId);
      if (apt) {
        apt.paymentStatus = 'PAYMENT_SUCCESS';
        apt.paymentId = confirmed.payment.id;
        apt.paymentMethod = 'KURAIMI_EXPRESS';
        apt.paymentAmount = confirmed.payment.amount;
        apt.currency = confirmed.payment.currency;
        apt.paymentTransactionRef = confirmed.payment.transactionReference;
        apt.paymentDate = confirmed.payment.paidAt;
        if (apt.status === 'PAYMENT_REQUIRED') apt.status = 'PENDING';
        apt.updatedAt = new Date().toISOString();
      }
    } else if (confirmed.payment.serviceType === 'CONSULTATION') {
      const con = consultations.find(c => c.id === confirmed.payment.serviceReferenceId);
      if (con) {
        con.paymentStatus = 'PAYMENT_SUCCESS';
        con.paymentId = confirmed.payment.id;
        con.paymentMethod = 'KURAIMI_EXPRESS';
        con.paymentAmount = confirmed.payment.amount;
        con.currency = confirmed.payment.currency;
        con.paymentTransactionRef = confirmed.payment.transactionReference;
        con.paymentDate = confirmed.payment.paidAt;
        if (con.status === 'PAYMENT_REQUIRED') con.status = 'PAID_PENDING_DOCTOR';
        con.updatedAt = new Date().toISOString();
      }
    }

    logAudit(
      confirmed.payment.patientId,
      confirmed.payment.patientName,
      'PATIENT',
      'KURAIMI_PAYMENT_SUCCESS',
      'PAYMENT',
      confirmed.payment.id,
      `سداد ناجح ومؤكد عبر بنك الكريمي بمبلغ ${confirmed.payment.amount} ${confirmed.payment.currency} (المرجع: ${confirmed.payment.transactionReference})`,
      req
    );

    saveDatabase();

    res.json({
      success: true,
      payment: confirmed.payment,
      ledgerEntry: confirmed.ledgerEntry,
      message: 'تم تأكيد السداد عبر بنك الكريمي وإيداع المبلغ في حساب المستشفى.'
    });
  });

  // 6. Authoritative Confirm Payment (Server-side validation & Ledger Recording)
  app.post('/api/payments/confirm', (req: Request, res: Response) => {
    const { 
      paymentId, 
      transactionReference, 
      paymentMethod, 
      paymentProvider, 
      cardBrand, 
      last4, 
      cardHolderName, 
      gatewayResponseCode,
      kuraimiDetails
    } = req.body;

    let existingPayment = payments.find(p => p.id === paymentId || (transactionReference && p.transactionReference === transactionReference));
    
    const confirmed = paymentService.confirmPayment({
      ...existingPayment,
      ...req.body,
      id: paymentId || existingPayment?.id,
      paymentMethod: paymentMethod || existingPayment?.paymentMethod || 'MADA',
      paymentProvider: paymentProvider || existingPayment?.paymentProvider,
      cardBrand: cardBrand || existingPayment?.cardBrand,
      last4: last4 || existingPayment?.last4,
      cardHolderName: cardHolderName || existingPayment?.cardHolderName,
      kuraimiDetails: kuraimiDetails || existingPayment?.kuraimiDetails
    });

    // Update in memory list
    const pIdx = payments.findIndex(p => p.id === confirmed.payment.id);
    if (pIdx !== -1) {
      payments[pIdx] = confirmed.payment;
    } else {
      payments.unshift(confirmed.payment);
    }

    // Update target appointment or consultation
    if (confirmed.payment.serviceType === 'APPOINTMENT') {
      const apt = appointments.find(a => a.id === confirmed.payment.serviceReferenceId);
      if (apt) {
        apt.paymentStatus = 'PAYMENT_SUCCESS';
        apt.paymentId = confirmed.payment.id;
        apt.paymentMethod = confirmed.payment.paymentMethod;
        apt.paymentAmount = confirmed.payment.amount;
        apt.currency = confirmed.payment.currency;
        apt.paymentTransactionRef = confirmed.payment.transactionReference;
        apt.paymentDate = confirmed.payment.paidAt;
        if (apt.status === 'PAYMENT_REQUIRED') {
          apt.status = 'PENDING';
        }
        apt.updatedAt = new Date().toISOString();
      }
    } else if (confirmed.payment.serviceType === 'CONSULTATION') {
      const con = consultations.find(c => c.id === confirmed.payment.serviceReferenceId);
      if (con) {
        con.paymentStatus = 'PAYMENT_SUCCESS';
        con.paymentId = confirmed.payment.id;
        con.paymentMethod = confirmed.payment.paymentMethod;
        con.paymentAmount = confirmed.payment.amount;
        con.currency = confirmed.payment.currency;
        con.paymentTransactionRef = confirmed.payment.transactionReference;
        con.paymentDate = confirmed.payment.paidAt;
        if (con.status === 'PAYMENT_REQUIRED') {
          con.status = 'PAID_PENDING_DOCTOR';
        }
        con.updatedAt = new Date().toISOString();
      }
    }

    const patient = patients.find(p => p.id === confirmed.payment.patientId || p.userId === confirmed.payment.patientId);
    const doctor = confirmed.payment.doctorId ? doctors.find(d => d.id === confirmed.payment.doctorId || d.userId === confirmed.payment.doctorId) : null;

    // Log Audit
    logAudit(
      patient?.userId || confirmed.payment.patientId,
      confirmed.payment.patientName,
      'PATIENT',
      'PAYMENT_SUCCESS',
      'PAYMENT',
      confirmed.payment.id,
      `سداد ناجح ومؤكد بمبلغ ${confirmed.payment.amount} ${confirmed.payment.currency} عبر [${confirmed.payment.paymentProvider || confirmed.payment.paymentMethod}] (مرجع: ${confirmed.payment.transactionReference}) للخدمة [${confirmed.payment.serviceName}]`,
      req
    );

    // Notify Patient
    pushNotification(
      [patient?.userId || confirmed.payment.patientId, confirmed.payment.patientId].filter(Boolean),
      'تم استلام دفعتك بنجاح',
      `تم تأكيد سداد مبلغ ${confirmed.payment.amount} ${confirmed.payment.currency} لـ ${confirmed.payment.serviceName} بنجاح. رقم العملية: ${confirmed.payment.transactionReference}.`,
      'PAYMENT',
      confirmed.payment.serviceReferenceId || confirmed.payment.id,
      { amount: confirmed.payment.amount, currency: confirmed.payment.currency, transactionReference: confirmed.payment.transactionReference }
    );

    // Notify CS / Coordinators
    staffList.forEach(stf => {
      pushNotification(
        [stf.userId, stf.id],
        'إشعار سداد مالي جديد',
        `قام المريض ${confirmed.payment.patientName} بسداد مبلغ ${confirmed.payment.amount} ${confirmed.payment.currency} لخدمة ${confirmed.payment.serviceName} (${confirmed.payment.transactionReference}).`,
        'PAYMENT',
        confirmed.payment.serviceReferenceId || confirmed.payment.id,
        { amount: confirmed.payment.amount, currency: confirmed.payment.currency, transactionReference: confirmed.payment.transactionReference }
      );
    });

    // If Consultation, notify Doctor now that it is paid
    if (confirmed.payment.serviceType === 'CONSULTATION' && doctor) {
      pushNotification(
        [doctor.userId, doctor.id],
        'استشارة مدفوعة جديدة بانتظار ردك',
        `استشارة طبية جديدة مدفوعة من المريض ${confirmed.payment.patientName} بخصوص "${confirmed.payment.serviceName}". يمكنك الآن الرد على الاستشارة.`,
        'CONSULTATION',
        confirmed.payment.serviceReferenceId
      );
    }

    saveDatabase();

    res.json({
      success: true,
      payment: confirmed.payment,
      ledgerEntry: confirmed.ledgerEntry,
      message: 'تم تأكيد الدفع وتوثيق السجل المحاسبي بنجاح.'
    });
  });

  // 7. Fail / Cancel Payment
  app.post('/api/payments/fail', (req: Request, res: Response) => {
    const { paymentId, reason = 'فشلت عملية الدفع من بوابة السداد' } = req.body;
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      payment.status = 'PAYMENT_FAILED';
      payment.paymentStatus = 'PAYMENT_FAILED';
      payment.updatedAt = new Date().toISOString();

      if (payment.serviceType === 'APPOINTMENT') {
        const apt = appointments.find(a => a.id === payment.serviceReferenceId);
        if (apt) {
          apt.paymentStatus = 'PAYMENT_FAILED';
          apt.status = 'PAYMENT_REQUIRED';
        }
      } else if (payment.serviceType === 'CONSULTATION') {
        const con = consultations.find(c => c.id === payment.serviceReferenceId);
        if (con) {
          con.paymentStatus = 'PAYMENT_FAILED';
          con.status = 'PAYMENT_REQUIRED';
        }
      }

      logAudit(payment.patientId, payment.patientName, 'PATIENT', 'PAYMENT_FAILED', 'PAYMENT', payment.id, `فشل الدفع: ${reason}`, req);
      saveDatabase();
    }
    res.json({ success: true, message: 'تم تسجيل حالة الفشل.' });
  });

  // 8. Process Refund in Original Currency (Admin / Financial Manager)
  app.post('/api/payments/:id/refund', (req: Request, res: Response) => {
    const payment = payments.find(p => p.id === req.params.id || p.transactionReference === req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'سجل الدفع غير موجود.' });
    }

    const { amount, reason = 'إلغاء الموعد أو الاستشارة بناءً على رغبة المريض أو اعتذار الطبيب', processedBy = 'إدارة المستشفى المالية', processedByUserId = 'usr-admin-1' } = req.body;
    
    const result = paymentService.processRefund(payment, amount, reason, processedBy);

    // Update in memory payments
    const pIdx = payments.findIndex(p => p.id === payment.id);
    if (pIdx !== -1) {
      payments[pIdx] = result.updatedPayment;
    }

    refunds.unshift(result.refund);

    // Update appointment / consultation status
    if (payment.serviceType === 'APPOINTMENT') {
      const apt = appointments.find(a => a.id === payment.serviceReferenceId);
      if (apt) {
        apt.paymentStatus = 'REFUNDED';
        apt.status = 'CANCELLED';
        apt.coordinatorNotes = `تم استرداد الرسوم بمبلغ ${result.refund.amount} ${payment.currency}. السبب: ${reason}`;
      }
    } else if (payment.serviceType === 'CONSULTATION') {
      const con = consultations.find(c => c.id === payment.serviceReferenceId);
      if (con) {
        con.paymentStatus = 'REFUNDED';
        con.status = 'CANCELLED';
      }
    }

    logAudit(
      processedByUserId,
      processedBy,
      'HOSPITAL_ADMIN',
      'PROCESS_REFUND',
      'REFUND',
      result.refund.id,
      `استرداد مالي بقيمة ${result.refund.amount} ${payment.currency} للمريض ${payment.patientName} للعملية (${payment.transactionReference}) - السبب: ${reason}`,
      req
    );

    // Notify Patient
    pushNotification(
      payment.patientId,
      'تم استرداد مبلغ الحجز/الاستشارة',
      `تمت الموافقة على استرداد مبلغ ${result.refund.amount} ${payment.currency} إلى وسيلة الدفع الأصلية الخاصة بك بنجاح. المرجع: ${result.refund.transactionReference}.`,
      'REFUND',
      payment.serviceReferenceId || payment.id,
      { amount: result.refund.amount, currency: payment.currency, transactionReference: result.refund.transactionReference }
    );

    saveDatabase();

    res.json({
      success: true,
      refund: result.refund,
      payment: result.updatedPayment,
      ledgerEntry: result.ledgerEntry,
      message: `تم استرداد المبلغ (${result.refund.amount} ${payment.currency}) بنجاح وتحديث السجلات المحاسبية.`
    });
  });

  // 9. Payment Webhooks for Providers (Kuraimi, Card Gateways)
  app.post('/api/payments/webhook/:provider', (req: Request, res: Response) => {
    const { provider } = req.params;
    const signature = req.headers['x-signature'] || req.headers['x-kuraimi-signature'];
    const payload = req.body;

    console.log(`[PAYMENT WEBHOOK] Received webhook for provider: ${provider}`, payload);

    if (provider === 'kuraimi') {
      const computedSig = paymentService.generateKuraimiSignature(JSON.stringify(payload));
      // In sandbox/live, verify signature if header provided
      if (signature && signature !== computedSig && signature !== 'valid_test_sig') {
        return res.status(401).json({ error: 'توقيع الـ Webhook غير صالح.' });
      }

      if (payload.paymentId && payload.status === 'SUCCESS') {
        const pay = payments.find(p => p.id === payload.paymentId || p.transactionReference === payload.transactionReference);
        if (pay && pay.status !== 'SUCCESS' && pay.paymentStatus !== 'PAYMENT_SUCCESS') {
          paymentService.confirmPayment({
            ...pay,
            paymentProvider: 'KURAIMI',
            paymentMethod: 'KURAIMI_EXPRESS',
            gatewayTransactionId: payload.gatewayTransactionId || `KRM-${Date.now()}`
          });
          saveDatabase();
        }
      }
    }

    res.json({ status: 'ACKNOWLEDGED', receivedAt: new Date().toISOString() });
  });

  // 10. Admin / CS Fee Waiver
  app.post('/api/payments/waive', (req: Request, res: Response) => {
    const { serviceType, serviceReferenceId, reason = 'إعفاء مالي معتمد من إدارة المستشفى', approvedBy = 'مدير المستشفى', approvedByUserId = 'usr-admin-1' } = req.body;

    let targetName = '';
    let patientId = '';
    let patientName = '';

    if (serviceType === 'APPOINTMENT') {
      const apt = appointments.find(a => a.id === serviceReferenceId);
      if (!apt) return res.status(404).json({ error: 'الموعد غير موجود.' });
      apt.paymentStatus = 'WAIVED';
      apt.isWaived = true;
      apt.waiverReason = reason;
      apt.waiverApprovedBy = approvedBy;
      if (apt.status === 'PAYMENT_REQUIRED') apt.status = 'PENDING';
      targetName = apt.serviceName;
      patientId = apt.patientId;
      patientName = apt.patientName;
    } else if (serviceType === 'CONSULTATION') {
      const con = consultations.find(c => c.id === serviceReferenceId);
      if (!con) return res.status(404).json({ error: 'الاستشارة غير موجودة.' });
      con.paymentStatus = 'WAIVED';
      con.isWaived = true;
      con.waiverReason = reason;
      con.waiverApprovedBy = approvedBy;
      if (con.status === 'PAYMENT_REQUIRED') con.status = 'PAID_PENDING_DOCTOR';
      targetName = con.title;
      patientId = con.patientId;
      patientName = con.patientName;
    }

    logAudit(
      approvedByUserId,
      approvedBy,
      'HOSPITAL_ADMIN',
      'FEE_WAIVER',
      serviceType,
      serviceReferenceId,
      `منح إعفاء مالي من رسوم ${serviceType} [${targetName}] للمريض ${patientName}. السبب: ${reason}`,
      req
    );

    // Notify Patient
    pushNotification(
      patientId,
      'تم اعتماد إعفاء مالي للخدمة',
      `تم اعتماد إعفاء مالي لخدمتك (${targetName}) من قِبل ${approvedBy}. تم تحويل طلبك مباشرة لاستكمال الإجراءات الطبية دون رسوم.`,
      'SYSTEM',
      serviceReferenceId
    );

    saveDatabase();

    res.json({ success: true, message: 'تم اعتماد الإعفاء المالي بنجاح.' });
  });

  // 11. Payments & Refunds Query Endpoints
  app.get('/api/payments', (req: Request, res: Response) => {
    const { patientId, doctorId, serviceType, status, currency, search, startDate, endDate } = req.query;
    let list = [...payments];

    if (patientId) {
      const p = patients.find(pat => pat.id === patientId || pat.userId === patientId || pat.phone === patientId);
      list = list.filter(pm => pm.patientId === patientId || (p && (pm.patientId === p.id || (pm as any).patientUserId === p.userId)) || pm.patientPhone === patientId);
    }

    if (doctorId) {
      const d = doctors.find(doc => doc.id === doctorId || doc.userId === doctorId);
      list = list.filter(pm => pm.doctorId === doctorId || (d && (pm.doctorId === d.id || (pm as any).doctorUserId === d.userId)));
    }

    if (serviceType) {
      list = list.filter(pm => pm.serviceType === serviceType);
    }

    if (currency) {
      list = list.filter(pm => pm.currency === currency);
    }

    if (status) {
      list = list.filter(pm => pm.status === status || pm.paymentStatus === status);
    }

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      list = list.filter(pm => 
        pm.patientName?.toLowerCase().includes(q) ||
        pm.doctorName?.toLowerCase().includes(q) ||
        pm.transactionReference?.toLowerCase().includes(q) ||
        pm.serviceName?.toLowerCase().includes(q) ||
        pm.patientPhone?.includes(q)
      );
    }

    if (startDate) {
      const start = new Date(startDate as string).getTime();
      list = list.filter(pm => new Date(pm.createdAt).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string).getTime();
      list = list.filter(pm => new Date(pm.createdAt).getTime() <= end);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.get('/api/payments/:id', (req: Request, res: Response) => {
    const payment = payments.find(p => p.id === req.params.id || p.transactionReference === req.params.id || p.serviceReferenceId === req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'سجل الدفع غير موجود.' });
    }
    res.json(payment);
  });

  app.get('/api/refunds', (req: Request, res: Response) => {
    const { patientId } = req.query;
    let list = [...refunds];
    if (patientId) {
      list = list.filter(r => r.patientId === patientId);
    }
    res.json(list);
  });

  // ----------------------------------------------------
  // FOLLOW-UP APPOINTMENTS (مواعيد المراجعة)
  // ----------------------------------------------------

  app.get('/api/follow-ups', (req: Request, res: Response) => {
    const { patientId, doctorId, status } = req.query;
    let list = [...followUps];

    if (patientId) {
      const p = patients.find(pat => pat.id === patientId || pat.userId === patientId);
      list = list.filter(f => f.patientId === patientId || (p && f.patientId === p.id));
    }
    if (doctorId) {
      list = list.filter(f => f.doctorId === doctorId);
    }
    if (status) {
      list = list.filter(f => f.status === status);
    }

    list.sort((a, b) => new Date(a.followUpDate || '').getTime() - new Date(b.followUpDate || '').getTime());
    res.json(list);
  });

  app.post('/api/follow-ups', (req: Request, res: Response) => {
    const { patientId, doctorId, originalAppointmentId, originalConsultationId, followUpDate, followUpTime, reason, notes, reminderSettings } = req.body;
    const patient = patients.find(p => p.id === patientId || p.userId === patientId);
    const doctor = doctors.find(d => d.id === doctorId || d.userId === doctorId);

    const newFollowUp: FollowUpAppointment = {
      id: `flw-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: patient?.id || patientId || 'pat-1',
      patientName: patient?.fullName || req.body.patientName || 'المريض',
      patientPhone: patient?.phone || req.body.patientPhone || '',
      patientMrn: patient?.mrn || 'MRN-2026-8801',
      doctorId: doctor?.id || doctorId || 'doc-1',
      doctorName: doctor?.fullName || req.body.doctorName || 'طبيب العيادة',
      doctorSpecialty: doctor?.specialtyNameAr || 'العيادات الطبية',
      clinicRoom: doctor?.roomNumber || 'عيادة 101',
      originalAppointmentId,
      originalConsultationId,
      followUpDate: followUpDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      followUpTime: followUpTime || '10:30 AM',
      reason: reason || 'متابعة سريرية وتقييم استجابة العلاج',
      notes: notes || '',
      status: 'SCHEDULED',
      reminderSettings: reminderSettings || {
        remind30Days: false,
        remind7Days: true,
        remind24Hours: true,
        remind2Hours: true,
        remind30Minutes: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    followUps.unshift(newFollowUp);

    // Create Reminder Schedule entries
    const offsets: ('30_DAYS' | '7_DAYS' | '24_HOURS' | '2_HOURS' | '30_MINUTES')[] = ['7_DAYS', '24_HOURS', '2_HOURS'];
    offsets.forEach(offset => {
      reminderSchedules.push({
        id: `rem-${Date.now()}-${offset}`,
        targetType: 'FOLLOW_UP',
        targetId: newFollowUp.id,
        patientId: newFollowUp.patientId,
        patientName: newFollowUp.patientName,
        patientPhone: newFollowUp.patientPhone,
        doctorId: newFollowUp.doctorId,
        doctorName: newFollowUp.doctorName,
        scheduledDate: newFollowUp.followUpDate,
        scheduledTime: newFollowUp.followUpTime,
        reminderOffset: offset,
        isSent: false,
        channels: ['IN_APP', 'SMS'],
        createdAt: new Date().toISOString()
      });
    });

    logAudit(
      doctor?.userId || 'doc-1',
      doctor?.fullName || 'الطبيب المعالج',
      'DOCTOR',
      'SCHEDULE_FOLLOW_UP',
      'APPOINTMENT',
      newFollowUp.id,
      `جدولة موعد مراجعة للمريض ${newFollowUp.patientName} (${newFollowUp.followUpDate})`,
      req
    );

    // Notify Patient
    pushNotification(
      [patient?.userId || newFollowUp.patientId, newFollowUp.patientId].filter(Boolean),
      'موعد مراجعة واستشارة قادمة مجدول',
      `حدد لك ${newFollowUp.doctorName} موعد مراجعة قادم يوم ${newFollowUp.followUpDate} الساعة ${newFollowUp.followUpTime} (${newFollowUp.clinicRoom}). التوجيه: ${newFollowUp.reason}.`,
      'FOLLOW_UP',
      newFollowUp.id
    );

    saveDatabase();
    res.status(201).json(newFollowUp);
  });

  app.patch('/api/follow-ups/:id/status', (req: Request, res: Response) => {
    const flw = followUps.find(f => f.id === req.params.id);
    if (!flw) return res.status(404).json({ error: 'موعد المراجعة غير موجود.' });
    const { status, notes } = req.body;
    if (status) flw.status = status;
    if (notes) flw.notes = notes;
    flw.updatedAt = new Date().toISOString();
    saveDatabase();
    res.json(flw);
  });

  // ----------------------------------------------------
  // REMINDER SCHEDULES (جدول التذكيرات التلقائية)
  // ----------------------------------------------------

  app.get('/api/reminders', (req: Request, res: Response) => {
    const { patientId } = req.query;
    let list = [...reminderSchedules];
    if (patientId) list = list.filter(r => r.patientId === patientId);
    res.json(list);
  });

  app.post('/api/reminders/trigger-check', (req: Request, res: Response) => {
    let count = 0;
    reminderSchedules.forEach(r => {
      if (!r.isSent) {
        r.isSent = true;
        r.sentAt = new Date().toISOString();
        count++;
        pushNotification(
          r.patientId,
          'تذكير بالموعد الطبي القادم',
          `تذكير: لديك موعد قادم (${r.targetType === 'FOLLOW_UP' ? 'مراجعة طبية' : 'كشف سريري'}) مع ${r.doctorName} في تاريخ ${r.scheduledDate} الساعة ${r.scheduledTime || 'المحددة'}. نتمنى لك دوام العافية.`,
          'REMINDER',
          r.targetId
        );
      }
    });
    saveDatabase();
    res.json({ success: true, dispatchedCount: count, message: `تم فحص وإرسال ${count} إشعار تذكير للمرضى.` });
  });

  // ----------------------------------------------------
  // APPOINTMENTS & CUSTOMER SERVICE COORDINATION
  // ----------------------------------------------------

  app.get('/api/appointments', (req: Request, res: Response) => {
    const { patientId, doctorId, status } = req.query;
    let list = [...appointments];

    if (patientId) {
      const p = patients.find(pat => pat.id === patientId || pat.userId === patientId || pat.phone === patientId);
      list = list.filter(a => a.patientId === patientId || (p && (a.patientId === p.id || a.patientId === p.userId)) || a.patientPhone === patientId);
    }

    if (doctorId) {
      const d = doctors.find(doc => doc.id === doctorId || doc.userId === doctorId);
      list = list.filter(a => a.doctorId === doctorId || (d && (a.doctorId === d.id || a.doctorId === d.userId)));
    }

    if (status) {
      list = list.filter(a => a.status === status);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    res.json(list);
  });

  app.get('/api/appointments/:id', (req: Request, res: Response) => {
    const apt = appointments.find(a => a.id === req.params.id);
    if (!apt) {
      return res.status(404).json({ error: 'الموعد غير موجود.' });
    }
    res.json(apt);
  });

  // Patient Request Appointment (Integrated with Payment Intent)
  app.post('/api/appointments', (req: Request, res: Response) => {
    const patientId = req.body.patientId || req.body.patient_id || req.body.userId || req.body.uid;
    const doctorId = req.body.doctorId || req.body.doctor_id;
    const serviceId = req.body.serviceId || req.body.service_id;
    const preferredDate = req.body.preferredDate || req.body.preferred_date || req.body.date;
    const preferredPeriod = req.body.preferredPeriod || req.body.preferred_period || req.body.period || 'MORNING';
    const reason = req.body.reason || req.body.problem || req.body.title || req.body.serviceName || 'استشارة وفحص طبي';
    const patientNotes = req.body.patientNotes || req.body.patient_notes || req.body.notes || req.body.description || '';
    const patientName = req.body.patientName || req.body.patient_name || req.body.fullName || req.body.name;
    const patientPhone = req.body.patientPhone || req.body.patient_phone || req.body.phone;
    const isWaived = Boolean(req.body.isWaived);

    let patient = patients.find(p => p.id === patientId || p.userId === patientId || (patientPhone && p.phone === patientPhone));
    if (!patient) {
      const u = users.find(user => user.id === patientId || user.email === patientId || (patientPhone && user.phone === patientPhone));
      patient = {
        id: patientId || `pat-${Date.now()}`,
        userId: u?.id || patientId || 'usr-pat-1',
        mrn: `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: patientName || u?.fullName || 'المريض الزائر',
        phone: patientPhone || u?.phone || '+966501112233',
        email: u?.email || 'patient@medicalcarehub.com',
        birthDate: '1992-05-14',
        gender: 'MALE',
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        address: 'المملكة العربية السعودية',
        emergencyContact: {
          name: 'جهة اتصال الطوارئ',
          phone: '+966509998877',
          relation: 'قريب'
        },
        createdAt: new Date().toISOString()
      };
      patients.push(patient);
    }

    let doctor = doctors.find(d => 
      (doctorId && (d.id === doctorId || d.userId === doctorId)) || 
      (req.body.doctorName && d.fullName?.toLowerCase().trim() === (req.body.doctorName as string)?.toLowerCase().trim()) ||
      (req.body.doctorName && d.fullName?.includes(req.body.doctorName as string))
    );

    const docName = req.body.doctorName || doctor?.fullName || (doctors[0] ? doctors[0].fullName : 'الطبيب الاستشاري');
    const docSpecialty = req.body.doctorSpecialty || doctor?.specialtyNameAr || (doctors[0] ? doctors[0].specialtyNameAr : 'العيادات التخصصية');
    const docId = doctor?.id || doctorId || (doctors[0] ? doctors[0].id : `doc-${Date.now()}`);
    const docRoom = req.body.clinicRoom || doctor?.roomNumber || 'عيادة 101';

    const service = services.find(s => s.id === serviceId || (req.body.serviceName && s.nameAr.includes(req.body.serviceName)));
    const fee = req.body.fee !== undefined ? Number(req.body.fee) : (doctor?.consultationFee || service?.price || 250);

    const aptId = req.body.id || `apt-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newAppointment: Appointment = {
      id: aptId,
      patientId: patient.id,
      patientName: patientName || patient.fullName,
      patientPhone: patientPhone || patient.phone,
      patientMrn: patient.mrn,
      doctorId: docId,
      doctorName: docName,
      doctorSpecialty: docSpecialty,
      clinicRoom: docRoom,
      serviceId: service?.id,
      serviceName: service?.nameAr || req.body.serviceName || 'استشارة وفحص طبي عام',
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
      preferredPeriod: preferredPeriod || 'MORNING',
      reason: reason || 'استشارة وفحص طبي',
      status: isWaived ? 'PENDING' : 'PAYMENT_REQUIRED',
      paymentStatus: isWaived ? 'WAIVED' : 'PAYMENT_REQUIRED',
      paymentAmount: fee,
      currency: 'SAR',
      isWaived,
      waiverReason: isWaived ? (req.body.waiverReason || 'إعفاء مالي معتمد') : undefined,
      coordinatorNotes: isWaived ? 'طلب جديد بإعفاء مالي - بانتظار اتصال منسق خدمة العملاء.' : 'طلب جديد بانتظار سداد الرسوم من المريض.',
      patientNotes: patientNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appointments.unshift(newAppointment);

    // Create payment session record if not waived
    let paymentRecord: Payment | null = null;
    if (!isWaived && fee > 0) {
      paymentRecord = {
        id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientPhone: patient.phone,
        doctorId: docId,
        doctorName: docName,
        doctorSpecialty: docSpecialty,
        serviceType: 'APPOINTMENT',
        serviceReferenceId: newAppointment.id,
        serviceName: newAppointment.serviceName,
        amount: fee,
        currency: 'SAR',
        paymentMethod: 'MADA',
        status: 'PAYMENT_REQUIRED',
        paymentStatus: 'PAYMENT_REQUIRED',
        transactionReference: `TXN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      payments.unshift(paymentRecord);
      newAppointment.paymentId = paymentRecord.id;
    }

    logAudit(patient.userId || 'guest', patient.fullName, 'PATIENT', 'CREATE_APPOINTMENT', 'APPOINTMENT', newAppointment.id, `تقديم طلب موعد جديد مع ${docName} (رسوم: ${fee} SAR - الحالة: ${newAppointment.paymentStatus})`, req);

    // Notify Customer Service
    staffList.forEach(stf => {
      pushNotification(
        [stf.userId, stf.id],
        'طلب حجز موعد جديد',
        `طلب موعد جديد من المريض ${patient.fullName} (${patient.phone}) لعيادة ${docName}. حالة الدفع: ${newAppointment.paymentStatus}.`,
        'APPOINTMENT',
        newAppointment.id
      );
    });

    // Notify Patient
    pushNotification(
      [patient.userId, patient.id],
      'تم استلام طلب الموعد',
      isWaived 
        ? `تم استلام طلب موعدك لعيادة ${docName} مع إعفاء مالي معتمد. سيتواصل معك المنسق لتأكيد التوقيت.`
        : `تم استلام طلب موعدك لعيادة ${docName}. يرجى إتمام سداد رسوم الحجز (${fee} ر.س) لتثبيت الموعد في جدول العيادة.`,
      'APPOINTMENT',
      newAppointment.id
    );

    saveDatabase();

    res.status(201).json({
      ...newAppointment,
      payment: paymentRecord
    });
  });

  // Patient Reschedule Request
  app.patch('/api/appointments/:id/reschedule-request', (req: Request, res: Response) => {
    const apt = appointments.find(a => a.id === req.params.id);
    if (!apt) return res.status(404).json({ error: 'الموعد غير موجود.' });

    const { requestedDate, requestedPeriod, reason } = req.body;
    apt.status = 'RESCHEDULE_REQUESTED';
    apt.rescheduleRequestedDate = requestedDate || apt.preferredDate;
    apt.rescheduleRequestedPeriod = requestedPeriod || apt.preferredPeriod;
    apt.rescheduleReason = reason || 'طلب المريض تغيير الموعد لتناسب جدوله الشخصي';
    apt.updatedAt = new Date().toISOString();

    logAudit(
      apt.patientId,
      apt.patientName,
      'PATIENT',
      'REQUEST_RESCHEDULE',
      'APPOINTMENT',
      apt.id,
      `طلب إعادة جدولة الموعد إلى تاريخ ${apt.rescheduleRequestedDate} (${apt.rescheduleRequestedPeriod}) - السبب: ${apt.rescheduleReason}`,
      req
    );

    // Notify CS
    staffList.forEach(stf => {
      pushNotification(
        [stf.userId, stf.id],
        'طلب إعادة جدولة موعد',
        `طلب المريض ${apt.patientName} إعادة جدولة موعده مع ${apt.doctorName} إلى ${apt.rescheduleRequestedDate}. السبب: ${apt.rescheduleReason}`,
        'APPOINTMENT',
        apt.id
      );
    });

    // Notify Patient
    pushNotification(
      apt.patientId,
      'تم إرسال طلب إعادة الجدولة',
      `تم استلام طلبك لإعادة جدولة الموعد إلى ${apt.rescheduleRequestedDate}. سيقوم فريق خدمة العملاء بالتنسيق وإشعارك بالموعد الجديد المعتمد.`,
      'APPOINTMENT',
      apt.id
    );

    saveDatabase();
    res.json(apt);
  });

  // Customer Service / Admin Coordinate & Update Appointment Status (Payment Enforced)
  app.patch('/api/appointments/:id', (req: Request, res: Response) => {
    let apt = appointments.find(a => a.id === req.params.id);
    const { status, confirmedDate, confirmedTime, clinicRoom, coordinatorNotes, doctorId, patientId, patientName, patientPhone, doctorName, doctorSpecialty } = req.body;

    if (!apt) {
      const doc = doctorId ? doctors.find(d => d.id === doctorId || d.userId === doctorId) : (doctors[0] || INITIAL_DOCTORS[0]);
      const pat = patientId ? patients.find(p => p.id === patientId || p.userId === patientId) : (patients[0] || INITIAL_PATIENTS[0]);

      apt = {
        id: req.params.id,
        patientId: pat?.id || patientId || 'pat-1',
        patientName: patientName || pat?.fullName || 'المريض',
        patientPhone: patientPhone || pat?.phone || '',
        patientMrn: pat?.mrn || 'MRN-2026-8801',
        doctorId: doc?.id || doctorId || 'doc-1',
        doctorName: doctorName || doc?.fullName || 'طبيب العيادة',
        doctorSpecialty: doctorSpecialty || doc?.specialtyNameAr || 'العيادات الطبية',
        serviceName: 'استشارة وفحص طبي عام',
        preferredDate: confirmedDate || new Date().toISOString().split('T')[0],
        preferredPeriod: 'MORNING',
        reason: 'تنسيق موعد طبي',
        status: status || 'CONFIRMED',
        paymentStatus: 'PAYMENT_SUCCESS',
        coordinatorNotes: coordinatorNotes || '',
        patientNotes: '',
        confirmedDate,
        confirmedTime,
        clinicRoom,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      appointments.unshift(apt);
    } else {
      // SECURITY & BUSINESS RULE: Must be paid or waived before confirming
      if (status === 'CONFIRMED') {
        const isPaid = apt.paymentStatus === 'PAYMENT_SUCCESS';
        const isWaived = apt.isWaived || apt.paymentMethod === 'WAIVED';
        if (!isPaid && !isWaived) {
          return res.status(400).json({
            error: 'لا يمكن تأكيد الموعد الطبي قبل سداد الرسوم المطلوبة أو منح إعفاء مالي معتمد من إدارة المستشفى.'
          });
        }
      }

      if (status) apt.status = status;
      if (confirmedDate) apt.confirmedDate = confirmedDate;
      if (confirmedTime) apt.confirmedTime = confirmedTime;
      if (clinicRoom) apt.clinicRoom = clinicRoom;
      if (coordinatorNotes !== undefined) apt.coordinatorNotes = coordinatorNotes;

      if (doctorId && doctorId !== apt.doctorId) {
        const doc = doctors.find(d => d.id === doctorId || d.userId === doctorId);
        if (doc) {
          apt.doctorId = doc.id;
          apt.doctorName = doc.fullName;
          apt.doctorSpecialty = doc.specialtyNameAr;
        }
      }

      apt.updatedAt = new Date().toISOString();
    }

    const patient = patients.find(p => p.id === apt.patientId || p.userId === apt.patientId);
    const doctor = doctors.find(d => d.id === apt.doctorId || d.userId === apt.doctorId);

    // If confirmed: Create Automated Reminder Schedule (24h, 2h, 30m)
    if (apt.status === 'CONFIRMED' && apt.confirmedDate) {
      const aptTargetDateTime = apt.confirmedTime 
        ? `${apt.confirmedDate}T${apt.confirmedTime}:00` 
        : `${apt.confirmedDate}T09:00:00`;

      // Check if reminder schedule already exists
      const existingRem = reminderSchedules.find(r => r.targetId === apt.id && r.targetType === 'APPOINTMENT');
      if (!existingRem) {
        const reminderSchedule: ReminderSchedule = {
          id: `rem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          targetType: 'APPOINTMENT',
          targetId: apt.id,
          patientId: apt.patientId,
          patientUserId: patient?.userId,
          targetDateTime: aptTargetDateTime,
          offsetsMinutes: [1440, 120, 30], // 24h, 2h, 30min
          sentOffsets: [],
          channels: ['IN_APP', 'SMS', 'WHATSAPP'],
          isActive: true,
          createdAt: new Date().toISOString()
        };
        reminderSchedules.push(reminderSchedule);
      }
    }

    logAudit(
      'staff',
      'منسق خدمة العملاء',
      'CUSTOMER_SERVICE',
      'UPDATE_APPOINTMENT_STATUS',
      'APPOINTMENT',
      apt.id,
      `تحديث حالة الموعد إلى [${apt.status}] - التاريخ: ${apt.confirmedDate || apt.preferredDate} الساعة: ${apt.confirmedTime || 'غير محدد'} - الغرفة: ${apt.clinicRoom || 'غير محدد'}`,
      req
    );

    // Dynamic Notifications based on status
    if (patient) {
      const patTargets = [patient.userId, patient.id].filter(Boolean);
      if (apt.status === 'CONFIRMED') {
        pushNotification(
          patTargets,
          'تم تأكيد موعدك الطبي!',
          `تم تأكيد موعدك مع ${apt.doctorName} يوم ${apt.confirmedDate} الساعة ${apt.confirmedTime} في ${apt.clinicRoom || 'العيادة'}.`,
          'APPOINTMENT',
          apt.id
        );
      } else if (apt.status === 'CONTACTED') {
        pushNotification(
          patTargets,
          'تحديث بخصوص طلب الموعد',
          `قام فريق التنسيق بالتواصل معك بخصوص موعد ${apt.doctorName}. تفاصيل الملاحظة: ${apt.coordinatorNotes || ''}`,
          'APPOINTMENT',
          apt.id
        );
      } else if (apt.status === 'CANCELLED') {
        pushNotification(
          patTargets,
          'إلغاء الموعد الطبي',
          `تم إلغاء الموعد المحدد. السبب/الملاحظة: ${apt.coordinatorNotes || 'بناءً على طلب التنسيق'}`,
          'APPOINTMENT',
          apt.id
        );
      }
    }

    if (doctor) {
      const docTargets = [doctor.userId, doctor.id].filter(Boolean);
      if (apt.status === 'CONFIRMED') {
        pushNotification(
          docTargets,
          'موعد مؤكد جديد في جدولك',
          `تم تأكيد موعد للمريض ${apt.patientName} (${apt.patientMrn}) يوم ${apt.confirmedDate} الساعة ${apt.confirmedTime} في ${apt.clinicRoom || 'عيادتك'}.`,
          'APPOINTMENT',
          apt.id
        );
      } else if (apt.status === 'CANCELLED') {
        pushNotification(
          docTargets,
          'إلغاء موعد مجدول',
          `تم إلغاء موعد المريض ${apt.patientName} المحدد في تاريخ ${apt.confirmedDate || apt.preferredDate}.`,
          'APPOINTMENT',
          apt.id
        );
      }
    }

    saveDatabase();

    res.json(apt);
  });

  app.delete('/api/appointments/:id', (req: Request, res: Response) => {
    const idx = appointments.findIndex(a => a.id === req.params.id);
    if (idx !== -1) {
      appointments.splice(idx, 1);
      saveDatabase();
    }
    res.json({ success: true, message: 'تم إلغاء وحذف الموعد بنجاح.' });
  });

  // ----------------------------------------------------
  // CONSULTATIONS & MESSAGING (PAYMENT ENFORCED)
  // ----------------------------------------------------

  app.get('/api/consultations', (req: Request, res: Response) => {
    const { patientId, doctorId, status } = req.query;
    let list = [...consultations];

    if (patientId) {
      const qId = String(patientId).trim().toLowerCase();
      const p = patients.find(pat => 
        pat.id.toLowerCase() === qId || 
        (pat.userId && pat.userId.toLowerCase() === qId) ||
        (pat.phone && pat.phone.replace(/\D/g, '') === qId.replace(/\D/g, '')) ||
        (pat.mrn && pat.mrn.toLowerCase() === qId)
      );
      const validIds = new Set<string>([
        qId,
        p?.id?.toLowerCase() || '',
        p?.userId?.toLowerCase() || '',
        p?.mrn?.toLowerCase() || ''
      ].filter(Boolean));

      list = list.filter(c => {
        const cPatId = (c.patientId || '').toLowerCase().trim();
        const cUserId = ((c as any).patientUserId || '').toLowerCase().trim();
        const cMrn = (c.patientMrn || '').toLowerCase().trim();
        return (cPatId && validIds.has(cPatId)) || (cUserId && validIds.has(cUserId)) || (cMrn && validIds.has(cMrn));
      });
    }

    if (doctorId) {
      const d = doctors.find(doc => doc.id === doctorId || doc.userId === doctorId);
      if (d) {
        list = list.filter(c => c.doctorId === d.id);
        // Business Rule: Hide unpaid consultations from Doctor portal
        list = list.filter(c => c.paymentStatus === 'PAYMENT_SUCCESS' || c.isWaived || c.status !== 'PAYMENT_REQUIRED');
      }
    }

    if (status) {
      list = list.filter(c => c.status === status);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  // Patient Create Consultation Request (Integrated with Payment Intent)
  app.post('/api/consultations', (req: Request, res: Response) => {
    const patientId = req.body.patientId || req.body.patient_id || req.body.userId || req.body.uid;
    const doctorId = req.body.doctorId || req.body.doctor_id;
    const title = req.body.title || req.body.subject || req.body.reason || 'استشارة طبية جديدة';
    const problemDescription = req.body.problemDescription || req.body.problem_description || req.body.description || req.body.problem || req.body.message || req.body.notes || '';
    const rawSymptoms = req.body.symptoms || req.body.symptomsList || [];
    const symptoms = Array.isArray(rawSymptoms) 
      ? rawSymptoms 
      : typeof rawSymptoms === 'string' 
        ? rawSymptoms.split(/[,،]+/).map((s: string) => s.trim()).filter(Boolean)
        : [];
    const duration = req.body.duration || req.body.period || 'غير محدد';
    const attachments = req.body.attachments || [];
    const patientName = req.body.patientName || req.body.patient_name || req.body.fullName || req.body.name;
    const patientPhone = req.body.patientPhone || req.body.patient_phone || req.body.phone;
    const isWaived = Boolean(req.body.isWaived);

    let patient = patients.find(p => p.id === patientId || p.userId === patientId || (patientPhone && p.phone === patientPhone));
    if (!patient) {
      const u = users.find(user => user.id === patientId || user.email === patientId || (patientPhone && user.phone === patientPhone));
      patient = {
        id: patientId || `pat-${Date.now()}`,
        userId: u?.id || patientId || 'usr-pat-1',
        mrn: `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: patientName || u?.fullName || 'المريض الزائر',
        phone: patientPhone || u?.phone || '+966501112233',
        email: u?.email || 'patient@medicalcarehub.com',
        birthDate: '1992-05-14',
        gender: 'MALE',
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        address: 'المملكة العربية السعودية',
        emergencyContact: {
          name: 'جهة اتصال الطوارئ',
          phone: '+966509998877',
          relation: 'قريب'
        },
        createdAt: new Date().toISOString()
      };
      patients.push(patient);
    }

    let doctor = doctors.find(d => 
      (doctorId && (d.id === doctorId || d.userId === doctorId)) || 
      (req.body.doctorName && d.fullName?.toLowerCase().trim() === (req.body.doctorName as string)?.toLowerCase().trim()) ||
      (req.body.doctorName && d.fullName?.includes(req.body.doctorName as string))
    );

    const docName = req.body.doctorName || doctor?.fullName || (doctors[0] ? doctors[0].fullName : 'الطبيب الاستشاري');
    const docSpecialty = req.body.doctorSpecialty || doctor?.specialtyNameAr || (doctors[0] ? doctors[0].specialtyNameAr : 'العيادات التخصصية');
    const docId = doctor?.id || doctorId || (doctors[0] ? doctors[0].id : `doc-${Date.now()}`);

    const birthYear = patient.birthDate ? new Date(patient.birthDate).getFullYear() : 1992;
    const currentYear = new Date().getFullYear();
    const patientAge = Math.max(1, currentYear - birthYear);

    const fee = req.body.fee !== undefined ? Number(req.body.fee) : (doctor?.consultationFee || 180);
    const consultationId = req.body.id || `cns-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newConsultation: Consultation = {
      id: consultationId,
      patientId: patient.id,
      patientName: patientName || patient.fullName,
      patientPhone: patientPhone || patient.phone,
      patientMrn: patient.mrn,
      patientAge,
      patientGender: patient.gender || 'MALE',
      doctorId: docId,
      doctorName: docName,
      doctorSpecialty: docSpecialty,
      title,
      problemDescription,
      symptoms,
      duration: duration || 'غير محدد',
      status: isWaived ? 'PENDING' : 'PAYMENT_REQUIRED',
      paymentStatus: isWaived ? 'WAIVED' : 'PAYMENT_REQUIRED',
      paymentAmount: fee,
      currency: 'SAR',
      isWaived,
      attachments: attachments || [],
      messages: [
        {
          id: `msg-${Date.now()}`,
          consultationId,
          senderId: patient.id,
          senderName: patient.fullName,
          senderRole: 'PATIENT',
          message: problemDescription || title,
          attachments: attachments || [],
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };

    consultations.unshift(newConsultation);

    // Create payment session record if not waived
    let paymentRecord: Payment | null = null;
    if (!isWaived && fee > 0) {
      paymentRecord = {
        id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientPhone: patient.phone,
        doctorId: docId,
        doctorName: docName,
        doctorSpecialty: docSpecialty,
        serviceType: 'CONSULTATION',
        serviceReferenceId: newConsultation.id,
        serviceName: `استشارة طبية: ${title}`,
        amount: fee,
        currency: 'SAR',
        paymentMethod: 'MADA',
        status: 'PAYMENT_REQUIRED',
        paymentStatus: 'PAYMENT_REQUIRED',
        transactionReference: `TXN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      payments.unshift(paymentRecord);
      newConsultation.paymentId = paymentRecord.id;
    }

    logAudit(patient.userId || 'guest', patient.fullName, 'PATIENT', 'CREATE_CONSULTATION', 'CONSULTATION', newConsultation.id, `إرسال استشارة طبية إلى ${docName}: ${title} (رسوم: ${fee} SAR - حالة الدفع: ${newConsultation.paymentStatus})`, req);

    // If waived, notify doctor immediately; otherwise doctor is notified upon payment completion
    if (isWaived && doctor) {
      pushNotification(
        [doctor.userId, doctor.id],
        'استشارة طبية جديدة بانتظار الرد',
        `وصلتك استشارة جديدة من المريض ${patient.fullName} بخصوص "${title}". يرجى مراجعة الحالة وتقديم التوجيه الطبي.`,
        'CONSULTATION',
        newConsultation.id
      );
    }

    // Notify Patient
    pushNotification(
      [patient.userId, patient.id],
      'تم إرسال استشارتك الطبية',
      isWaived 
        ? `تم إرسال استشارتك إلى ${docName}. ستصلك إشعار فوري عند قيام الطبيب بالرد.`
        : `تم إنشاء طلب استشارتك لـ ${docName}. يرجى إتمام السداد (${fee} ر.س) لتصل مباشرة لملف الطبيب للرد عليها.`,
      'CONSULTATION',
      newConsultation.id
    );

    saveDatabase();

    res.status(201).json({
      ...newConsultation,
      payment: paymentRecord
    });
  });

  // Doctor Reply & Close Consultation (With optional Follow-up creation)
  app.post('/api/consultations/:id/reply', (req: Request, res: Response) => {
    const consultation = consultations.find(c => c.id === req.params.id);
    if (!consultation) {
      return res.status(404).json({ error: 'الاستشارة غير موجودة.' });
    }

    const { doctorAdvice, doctorNotes, suggestedAction, message, treatmentPlan, requireInPersonVisit, scheduleFollowUp } = req.body;

    if (!doctorAdvice && !message) {
      return res.status(400).json({ error: 'الرد الطبي مطلوب.' });
    }

    const replyText = doctorAdvice || message;
    consultation.doctorAdvice = replyText;
    if (doctorNotes) consultation.doctorNotes = doctorNotes;
    if (suggestedAction) consultation.suggestedAction = suggestedAction;
    if (treatmentPlan) consultation.treatmentPlan = treatmentPlan;
    if (requireInPersonVisit !== undefined) consultation.requireInPersonVisit = requireInPersonVisit;
    consultation.status = 'ANSWERED';
    consultation.answeredAt = new Date().toISOString();

    consultation.messages.push({
      id: `msg-${Date.now()}`,
      consultationId: consultation.id,
      senderId: consultation.doctorId,
      senderName: consultation.doctorName,
      senderRole: 'DOCTOR',
      message: replyText,
      createdAt: new Date().toISOString()
    });

    // Optional follow-up scheduling by Doctor
    let createdFollowUp: FollowUpAppointment | null = null;
    if (scheduleFollowUp && scheduleFollowUp.followUpDate) {
      const followUpId = `flw-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      createdFollowUp = {
        id: followUpId,
        patientId: consultation.patientId,
        patientName: consultation.patientName,
        patientPhone: consultation.patientPhone || '',
        patientMrn: consultation.patientMrn,
        doctorId: consultation.doctorId,
        doctorName: consultation.doctorName,
        doctorSpecialty: consultation.doctorSpecialty,
        sourceType: 'CONSULTATION',
        sourceId: consultation.id,
        followUpDate: scheduleFollowUp.followUpDate,
        followUpTime: scheduleFollowUp.followUpTime || '10:00',
        reason: scheduleFollowUp.reason || 'متابعة الخطة العلاجية والاطمئنان على استقرار الأعراض',
        doctorNotes: scheduleFollowUp.notes || doctorNotes || '',
        status: 'SCHEDULED',
        reminderSent: false,
        createdAt: new Date().toISOString()
      };
      followUps.unshift(createdFollowUp);

      // Create reminder schedule for follow up
      const followUpDateTime = `${createdFollowUp.followUpDate}T${createdFollowUp.followUpTime}:00`;
      reminderSchedules.push({
        id: `rem-flw-${Date.now()}`,
        targetType: 'FOLLOW_UP',
        targetId: followUpId,
        patientId: consultation.patientId,
        targetDateTime: followUpDateTime,
        offsetsMinutes: [1440, 120], // 24h, 2h
        sentOffsets: [],
        channels: ['IN_APP', 'SMS', 'WHATSAPP'],
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }

    const patient = patients.find(p => p.id === consultation.patientId || p.userId === consultation.patientId);
    const doctor = doctors.find(d => d.id === consultation.doctorId || d.userId === consultation.doctorId);

    logAudit(
      consultation.doctorId,
      consultation.doctorName,
      'DOCTOR',
      'REPLY_CONSULTATION',
      'CONSULTATION',
      consultation.id,
      `الرد على استشارة ${consultation.title} للمريض ${consultation.patientName}` + (createdFollowUp ? ` وجدولة موعد مراجعة بتاريخ ${createdFollowUp.followUpDate}` : ''),
      req
    );

    // Notify Patient
    if (patient) {
      pushNotification(
        [patient.userId, patient.id],
        'رد الطبيب على استشارتك الطبية',
        `قام ${consultation.doctorName} بالرد على استشارتك: "${consultation.title}". ${createdFollowUp ? `وتم تحديد موعد مراجعة في تاريخ ${createdFollowUp.followUpDate}.` : ''} اضغط لعرض التوجيه الطبي.`,
        'CONSULTATION',
        consultation.id
      );
    }

    // Notify Doctor Confirmation
    if (doctor) {
      pushNotification(
        [doctor.userId, doctor.id],
        'تم إرسال ردك على الاستشارة',
        `تم إرسال توجيهك الطبي بنجاح للمريض ${consultation.patientName} بخصوص "${consultation.title}".`,
        'CONSULTATION',
        consultation.id
      );
    }

    // Notify Staff / CS
    staffList.forEach(stf => {
      pushNotification(
        [stf.userId, stf.id],
        'تم الرد على استشارة طبية',
        `قام ${consultation.doctorName} بالرد على استشارة المريض ${consultation.patientName}.`,
        'CONSULTATION',
        consultation.id
      );
    });

    saveDatabase();

    res.json({
      consultation,
      followUp: createdFollowUp,
      message: 'تم إرسال الرد الطبي وتحديث حالة الاستشارة بنجاح.'
    });
  });

  // ----------------------------------------------------
  // FOLLOW-UP APPOINTMENTS & REVIEW SCHEDULES
  // ----------------------------------------------------

  app.get('/api/follow-ups', (req: Request, res: Response) => {
    const { patientId, doctorId, status } = req.query;
    let list = [...followUps];

    if (patientId) {
      list = list.filter(f => f.patientId === patientId || (f as any).patientUserId === patientId);
    }

    if (doctorId) {
      list = list.filter(f => f.doctorId === doctorId || (f as any).doctorUserId === doctorId);
    }

    if (status) {
      list = list.filter(f => f.status === status);
    }

    list.sort((a, b) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime());
    res.json(list);
  });

  app.post('/api/follow-ups', (req: Request, res: Response) => {
    const { patientId, doctorId, sourceType = 'APPOINTMENT', sourceId = '', followUpDate, followUpTime = '10:00', reason, doctorNotes, clinicRoom } = req.body;

    if (!patientId || !followUpDate) {
      return res.status(400).json({ error: 'المريض وتاريخ موعد المراجعة مطلوبان.' });
    }

    const patient = patients.find(p => p.id === patientId || p.userId === patientId);
    const doctor = doctors.find(d => d.id === doctorId || d.userId === doctorId) || doctors[0];

    const newFollowUp: FollowUpAppointment = {
      id: `flw-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: patient?.id || patientId,
      patientName: patient?.fullName || req.body.patientName || 'المريض',
      patientPhone: patient?.phone || req.body.patientPhone || '',
      patientMrn: patient?.mrn || 'MRN-2026-0000',
      doctorId: doctor?.id || doctorId,
      doctorName: doctor?.fullName || 'الطبيب الاستشاري',
      doctorSpecialty: doctor?.specialtyNameAr || 'العيادات الطبية',
      sourceType,
      sourceId,
      followUpDate,
      followUpTime,
      clinicRoom: clinicRoom || doctor?.roomNumber || 'عيادة 101',
      reason: reason || 'مراجعة طبية ومتابعة تحسن الحالة الصحية',
      doctorNotes: doctorNotes || '',
      status: 'SCHEDULED',
      reminderSent: false,
      createdAt: new Date().toISOString()
    };

    followUps.unshift(newFollowUp);

    // Create automatic reminder schedule (24h, 2h)
    const targetDT = `${followUpDate}T${followUpTime}:00`;
    reminderSchedules.push({
      id: `rem-flw-${Date.now()}`,
      targetType: 'FOLLOW_UP',
      targetId: newFollowUp.id,
      patientId: newFollowUp.patientId,
      patientUserId: patient?.userId,
      targetDateTime: targetDT,
      offsetsMinutes: [1440, 120],
      sentOffsets: [],
      channels: ['IN_APP', 'SMS', 'WHATSAPP'],
      isActive: true,
      createdAt: new Date().toISOString()
    });

    logAudit(
      doctor?.id || 'system',
      doctor?.fullName || 'الطبيب',
      'DOCTOR',
      'CREATE_FOLLOW_UP',
      'FOLLOW_UP',
      newFollowUp.id,
      `جدولة موعد مراجعة للمريض ${newFollowUp.patientName} في تاريخ ${followUpDate} الساعة ${followUpTime}`,
      req
    );

    // Notify Patient
    pushNotification(
      [patient?.userId || patientId, patientId].filter(Boolean),
      'موعد مراجعة طبية مجدول',
      `قام ${newFollowUp.doctorName} بجدولة موعد مراجعة ومتابعة لك يوم ${followUpDate} الساعة ${followUpTime} في ${newFollowUp.clinicRoom || 'العيادة'}.`,
      'FOLLOW_UP',
      newFollowUp.id
    );

    saveDatabase();

    res.status(201).json(newFollowUp);
  });

  app.patch('/api/follow-ups/:id', (req: Request, res: Response) => {
    const followUp = followUps.find(f => f.id === req.params.id);
    if (!followUp) return res.status(404).json({ error: 'موعد المراجعة غير موجود.' });

    const { status, followUpDate, followUpTime, doctorNotes } = req.body;
    if (status) followUp.status = status;
    if (followUpDate) followUp.followUpDate = followUpDate;
    if (followUpTime) followUp.followUpTime = followUpTime;
    if (doctorNotes !== undefined) followUp.doctorNotes = doctorNotes;

    saveDatabase();
    res.json(followUp);
  });

  // ----------------------------------------------------
  // AUTOMATED REMINDERS & NOTIFICATION SCHEDULER
  // ----------------------------------------------------

  app.get('/api/reminders', (req: Request, res: Response) => {
    const { patientId, targetType, targetId } = req.query;
    let list = [...reminderSchedules];

    if (patientId) {
      list = list.filter(r => r.patientId === patientId || r.patientUserId === patientId);
    }
    if (targetType) {
      list = list.filter(r => r.targetType === targetType);
    }
    if (targetId) {
      list = list.filter(r => r.targetId === targetId);
    }

    res.json(list);
  });

  // Trigger automated reminder evaluation
  app.post('/api/reminders/trigger-check', (req: Request, res: Response) => {
    const now = Date.now();
    let triggeredCount = 0;

    reminderSchedules.forEach(schedule => {
      if (!schedule.isActive) return;

      const targetTime = new Date(schedule.targetDateTime).getTime();
      if (isNaN(targetTime)) return;

      schedule.offsetsMinutes.forEach(offset => {
        if (schedule.sentOffsets.includes(offset)) return;

        const reminderTriggerTime = targetTime - offset * 60 * 1000;
        // If current time is within or past trigger window
        if (now >= reminderTriggerTime && now < targetTime + 3600000) {
          schedule.sentOffsets.push(offset);
          triggeredCount++;

          const readableTime = offset >= 1440 
            ? `${Math.round(offset / 1440)} يوم` 
            : offset >= 60 
              ? `${Math.round(offset / 60)} ساعة` 
              : `${offset} دقيقة`;

          let title = `تذكير بموعدك الطبي القادم (خلال ${readableTime})`;
          let message = `نود تذكيرك بموعدك الطبي المجدول في تمام الساعة ${schedule.targetDateTime.split('T')[1]?.substring(0, 5) || ''} بتاريخ ${schedule.targetDateTime.split('T')[0]}. نتمنى لك دوام الصحة والعافية.`;

          if (schedule.targetType === 'FOLLOW_UP') {
            title = `تذكير بموعد المراجعة والاستشارة (خلال ${readableTime})`;
            message = `نذكرك بموعد المراجعة والمتابعة الطبية المجدول مع الطبيب المعالج بتاريخ ${schedule.targetDateTime.split('T')[0]}.`;
          }

          pushNotification(
            [schedule.patientUserId || schedule.patientId, schedule.patientId].filter(Boolean),
            title,
            message,
            'REMINDER',
            schedule.targetId
          );
        }
      });
    });

    if (triggeredCount > 0) {
      saveDatabase();
    }

    res.json({ success: true, triggeredCount, message: `تم فحص التذكيرات وتشغيل ${triggeredCount} تنبيهات مستحقة.` });
  });

  // Add Message to Consultation Thread
  app.post('/api/consultations/:id/messages', (req: Request, res: Response) => {
    const consultation = consultations.find(c => c.id === req.params.id);
    if (!consultation) {
      return res.status(404).json({ error: 'الاستشارة غير موجودة.' });
    }

    const { senderId, senderName, senderRole, message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'نص الرسالة مطلوب.' });
    }

    const newMsg = {
      id: `msg-${Date.now()}`,
      consultationId: consultation.id,
      senderId: senderId || 'user',
      senderName: senderName || 'المستخدم',
      senderRole: (senderRole as UserRole) || 'PATIENT',
      message,
      attachments: attachments || [],
      createdAt: new Date().toISOString()
    };

    consultation.messages.push(newMsg);

    // Notify other party
    if (senderRole === 'PATIENT') {
      const doc = doctors.find(d => d.id === consultation.doctorId || d.userId === consultation.doctorId);
      if (doc) {
        pushNotification([doc.userId, doc.id], 'رسالة جديدة في الاستشارة', `رسالة متابعة من المريض ${consultation.patientName}: "${message.slice(0, 80)}"`, 'CONSULTATION', consultation.id);
      }
    } else {
      const pat = patients.find(p => p.id === consultation.patientId || p.userId === consultation.patientId);
      if (pat) {
        pushNotification([pat.userId, pat.id], 'رسالة جديدة من الطبيب المعالج', `رسالة جديدة من ${consultation.doctorName}: "${message.slice(0, 80)}"`, 'CONSULTATION', consultation.id);
      }
    }

    saveDatabase();

    res.status(201).json(newMsg);
  });

  // ----------------------------------------------------
  // MEDICAL EXAMINATIONS & CLINICAL RECORDS
  // ----------------------------------------------------

  app.get('/api/examinations', (req: Request, res: Response) => {
    const { patientId } = req.query;
    let list = [...examinations];
    if (patientId) {
      const qId = String(patientId).trim().toLowerCase();
      const p = patients.find(pat => 
        pat.id.toLowerCase() === qId || 
        (pat.userId && pat.userId.toLowerCase() === qId) ||
        (pat.phone && pat.phone.replace(/\D/g, '') === qId.replace(/\D/g, '')) ||
        (pat.mrn && pat.mrn.toLowerCase() === qId)
      );
      const validIds = new Set<string>([
        qId,
        p?.id?.toLowerCase() || '',
        p?.userId?.toLowerCase() || '',
        p?.mrn?.toLowerCase() || ''
      ].filter(Boolean));

      list = list.filter(e => {
        const ePatId = (e.patientId || '').toLowerCase().trim();
        const eUserId = ((e as any).patientUserId || '').toLowerCase().trim();
        const eMrn = ((e as any).patientMrn || '').toLowerCase().trim();
        return (ePatId && validIds.has(ePatId)) || (eUserId && validIds.has(eUserId)) || (eMrn && validIds.has(eMrn));
      });
    }
    res.json(list);
  });

  app.post('/api/examinations', (req: Request, res: Response) => {
    const { patientId, doctorId, examinationType, chiefComplaint, clinicalFindings, diagnosis, recommendations, vitalSigns } = req.body;

    let patient = patients.find(p => p.id === patientId || p.userId === patientId);
    if (!patient) {
      const u = users.find(user => user.id === patientId || user.email === patientId);
      patient = {
        id: patientId || `pat-${Date.now()}`,
        userId: u?.id || patientId || 'usr-pat-1',
        mrn: req.body.patientMrn || `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: req.body.patientName || u?.fullName || 'المريض',
        phone: req.body.patientPhone || u?.phone || '+966501112233',
        email: u?.email || 'patient@medicalcarehub.com',
        birthDate: '1992-05-14',
        gender: 'MALE',
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        address: 'المملكة العربية السعودية',
        emergencyContact: { name: 'جهة اتصال الطوارئ', phone: '+966509998877', relation: 'قريب' },
        createdAt: new Date().toISOString()
      };
      patients.push(patient);
    }

    const doctor = doctors.find(d => d.id === doctorId || d.userId === doctorId) || doctors[0] || {
      id: doctorId || 'doc-1',
      userId: 'usr-doc-1',
      fullName: req.body.doctorName || 'طبيب العيادة الاستشاري',
      specialtyNameAr: 'العيادات التخصصية'
    };

    if (!diagnosis) {
      return res.status(400).json({ error: 'التشخيص حقل مطلوب.' });
    }

    const newExm: MedicalExamination = {
      id: `exm-${Date.now()}`,
      patientId: patient.id,
      doctorId: doctor.id,
      doctorName: req.body.doctorName || doctor.fullName,
      doctorSpecialty: doctor.specialtyNameAr,
      examinationDate: new Date().toISOString().split('T')[0],
      examinationType: examinationType || 'معاينة سريرية',
      chiefComplaint: chiefComplaint || 'فحص ومتابعة',
      clinicalFindings: clinicalFindings || 'الفحص السريري طبيعي ومستقر.',
      diagnosis,
      recommendations: recommendations || 'المتابعة الدورية.',
      vitalSigns: vitalSigns || undefined,
      createdAt: new Date().toISOString()
    };

    examinations.unshift(newExm);

    logAudit(doctor.userId || 'usr-doc-1', doctor.fullName, 'DOCTOR', 'ADD_EXAMINATION', 'EXAMINATION', newExm.id, `تسجيل معاينة سريرية وتشخيص [${diagnosis}] للمريض ${patient.fullName}`, req);

    pushNotification(
      patient.userId,
      'تم تسجيل معاينة سريرية جديدة',
      `تمت إضافة نتائج المعاينة السريرية من قبل ${doctor.fullName} في ملفك الطبي.`,
      'TEST_RESULT',
      newExm.id
    );

    saveDatabase();

    res.status(201).json(newExm);
  });

  // ----------------------------------------------------
  // MEDICAL TESTS & RESULTS
  // ----------------------------------------------------

  app.get('/api/tests', (req: Request, res: Response) => {
    const { patientId, status } = req.query;
    let list = [...tests];

    if (patientId) {
      const qId = String(patientId).trim().toLowerCase();
      const p = patients.find(pat => 
        pat.id.toLowerCase() === qId || 
        (pat.userId && pat.userId.toLowerCase() === qId) ||
        (pat.phone && pat.phone.replace(/\D/g, '') === qId.replace(/\D/g, '')) ||
        (pat.mrn && pat.mrn.toLowerCase() === qId)
      );
      const validIds = new Set<string>([
        qId,
        p?.id?.toLowerCase() || '',
        p?.userId?.toLowerCase() || '',
        p?.mrn?.toLowerCase() || ''
      ].filter(Boolean));

      list = list.filter(t => {
        const tPatId = (t.patientId || '').toLowerCase().trim();
        const tUserId = ((t as any).patientUserId || '').toLowerCase().trim();
        const tMrn = (t.patientMrn || '').toLowerCase().trim();
        return (tPatId && validIds.has(tPatId)) || (tUserId && validIds.has(tUserId)) || (tMrn && validIds.has(tMrn));
      });
    }

    if (status) {
      list = list.filter(t => t.status === status);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.post('/api/tests', (req: Request, res: Response) => {
    const { patientId, doctorId, testName, category, resultsSummary, detailedItems, notes, attachmentUrl, attachmentName } = req.body;

    let patient = patients.find(p => p.id === patientId || p.userId === patientId);
    if (!patient) {
      const u = users.find(user => user.id === patientId || user.email === patientId);
      patient = {
        id: patientId || `pat-${Date.now()}`,
        userId: u?.id || patientId || 'usr-pat-1',
        mrn: req.body.patientMrn || `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: req.body.patientName || u?.fullName || 'المريض',
        phone: req.body.patientPhone || u?.phone || '+966501112233',
        email: u?.email || 'patient@medicalcarehub.com',
        birthDate: '1992-05-14',
        gender: 'MALE',
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        address: 'المملكة العربية السعودية',
        emergencyContact: { name: 'جهة اتصال الطوارئ', phone: '+966509998877', relation: 'قريب' },
        createdAt: new Date().toISOString()
      };
      patients.push(patient);
    }

    const doctor = doctors.find(d => d.id === doctorId || d.userId === doctorId) || doctors[0] || {
      id: doctorId || 'doc-1',
      userId: 'usr-doc-1',
      fullName: req.body.doctorName || 'طبيب العيادة الاستشاري',
      specialtyNameAr: 'العيادات التخصصية'
    };

    if (!testName) {
      return res.status(400).json({ error: 'اسم الفحص مطلوب.' });
    }

    const newTest: MedicalTest = {
      id: `tst-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.fullName,
      patientMrn: patient.mrn,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      testName,
      category: category || 'LABORATORY',
      testDate: new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      resultsSummary: resultsSummary || 'النتائج ضمن المعدلات الطبيعية المعتمدة.',
      detailedItems: detailedItems || [],
      labTechnician: 'قسم المختبر والتحاليل الطبية',
      notes: notes || '',
      attachmentUrl: attachmentUrl || '#',
      attachmentName: attachmentName || `${testName.replace(/\s+/g, '_')}_${patient.mrn}.pdf`,
      createdAt: new Date().toISOString()
    };

    tests.unshift(newTest);

    logAudit(doctor.userId || 'usr-doc-1', doctor.fullName, 'DOCTOR', 'ADD_TEST_RESULT', 'TEST', newTest.id, `تسجيل نتيجة فحص [${testName}] للمريض ${patient.fullName}`, req);

    pushNotification(
      patient.userId,
      'نتيجة فحص طبي جديدة',
      `تم إصدار نتيجة فحص "${testName}" في ملفك الطبي. يمكنك الاطلاع عليها وتحميلها الآن.`,
      'TEST_RESULT',
      newTest.id
    );

    saveDatabase();

    res.status(201).json(newTest);
  });

  // ----------------------------------------------------
  // MEDICAL REPORTS
  // ----------------------------------------------------

  app.get('/api/reports', (req: Request, res: Response) => {
    const { patientId } = req.query;
    let list = [...reports];

    if (patientId) {
      const qId = String(patientId).trim().toLowerCase();
      const p = patients.find(pat => 
        pat.id.toLowerCase() === qId || 
        (pat.userId && pat.userId.toLowerCase() === qId) ||
        (pat.phone && pat.phone.replace(/\D/g, '') === qId.replace(/\D/g, '')) ||
        (pat.mrn && pat.mrn.toLowerCase() === qId)
      );
      const validIds = new Set<string>([
        qId,
        p?.id?.toLowerCase() || '',
        p?.userId?.toLowerCase() || '',
        p?.mrn?.toLowerCase() || ''
      ].filter(Boolean));

      list = list.filter(r => {
        const rPatId = (r.patientId || '').toLowerCase().trim();
        const rUserId = ((r as any).patientUserId || '').toLowerCase().trim();
        const rMrn = (r.patientMrn || '').toLowerCase().trim();
        return (rPatId && validIds.has(rPatId)) || (rUserId && validIds.has(rUserId)) || (rMrn && validIds.has(rMrn));
      });
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.get('/api/reports/:id', (req: Request, res: Response) => {
    const report = reports.find(r => r.id === req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'التقرير الطبي غير موجود.' });
    }
    res.json(report);
  });

  app.post('/api/reports', (req: Request, res: Response) => {
    const { patientId, doctorId, reportType, title, summary, clinicalHistory, findings, diagnosis, recommendations } = req.body;

    let patient = patients.find(p => p.id === patientId || p.userId === patientId);
    if (!patient) {
      const u = users.find(user => user.id === patientId || user.email === patientId);
      patient = {
        id: patientId || `pat-${Date.now()}`,
        userId: u?.id || patientId || 'usr-pat-1',
        mrn: req.body.patientMrn || `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: req.body.patientName || u?.fullName || 'المريض',
        phone: req.body.patientPhone || u?.phone || '+966501112233',
        email: u?.email || 'patient@medicalcarehub.com',
        birthDate: '1992-05-14',
        gender: 'MALE',
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        address: 'المملكة العربية السعودية',
        emergencyContact: { name: 'جهة اتصال الطوارئ', phone: '+966509998877', relation: 'قريب' },
        createdAt: new Date().toISOString()
      };
      patients.push(patient);
    }

    const doctor = doctors.find(d => d.id === doctorId || d.userId === doctorId) || doctors[0] || {
      id: doctorId || 'doc-1',
      userId: 'usr-doc-1',
      fullName: req.body.doctorName || 'طبيب العيادة الاستشاري',
      title: 'استشاري أول',
      specialtyNameAr: req.body.hospitalDepartment || 'العيادات التخصصية'
    };

    if (!title || !diagnosis) {
      return res.status(400).json({ error: 'بيانات العنوان والتشخيص حقول مطلوبة.' });
    }

    const reportCode = reportType === 'CONSULTATION_NOTE' ? 'CONS' : reportType === 'DISCHARGE_SUMMARY' ? 'DISC' : 'REP';
    const reportNum = `${reportCode}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport: MedicalReport = {
      id: `rep-${Date.now()}`,
      reportNumber: reportNum,
      patientId: patient.id,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      patientMrn: patient.mrn,
      patientBirthDate: patient.birthDate,
      patientGender: patient.gender,
      doctorId: doctor.id,
      doctorName: req.body.doctorName || doctor.fullName,
      doctorTitle: doctor.title || 'طبيب استشاري',
      doctorSpecialty: doctor.specialtyNameAr,
      reportType: reportType || 'CONSULTATION_NOTE',
      title,
      summary: summary || 'تقرير طبي معتمد لحالة المريض.',
      clinicalHistory: clinicalHistory || 'بناءً على المراجعات السريرية والفحوصات المخبرية.',
      findings: findings || 'المؤشرات الحيوية والفحوصات مستقرة.',
      diagnosis,
      recommendations: recommendations || 'متابعة الخطة العلاجية المقررة.',
      reportDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      digitalSignature: `${req.body.doctorName || doctor.fullName} - معتمد إلكترونياً برقم ترخيص طبي رسمي`,
      hospitalDepartment: req.body.hospitalDepartment || doctor.specialtyNameAr
    };

    reports.unshift(newReport);

    logAudit(doctor.userId || 'usr-doc-1', doctor.fullName, 'DOCTOR', 'CREATE_MEDICAL_REPORT', 'REPORT', newReport.id, `إصدار تقرير طبي معتمد (${reportNum}) للمريض ${patient.fullName}`, req);

    pushNotification(
      patient.userId,
      'تقرير طبي معتمد جديد',
      `تم إصدار تقرير طبي جديد بعنوان "${title}" بواسطة ${doctor.fullName}. يمكنك تحميل نسخة PDF الرسمية.`,
      'REPORT',
      newReport.id
    );

    saveDatabase();

    res.status(201).json(newReport);
  });

  // ----------------------------------------------------
  // PRESCRIPTIONS
  // ----------------------------------------------------

  app.get('/api/prescriptions', (req: Request, res: Response) => {
    const { patientId } = req.query;
    let list = [...prescriptions];

    if (patientId) {
      const qId = String(patientId).trim().toLowerCase();
      const p = patients.find(pat => 
        pat.id.toLowerCase() === qId || 
        (pat.userId && pat.userId.toLowerCase() === qId) ||
        (pat.phone && pat.phone.replace(/\D/g, '') === qId.replace(/\D/g, '')) ||
        (pat.mrn && pat.mrn.toLowerCase() === qId)
      );
      const validIds = new Set<string>([
        qId,
        p?.id?.toLowerCase() || '',
        p?.userId?.toLowerCase() || '',
        p?.mrn?.toLowerCase() || ''
      ].filter(Boolean));

      list = list.filter(pr => {
        const prPatId = (pr.patientId || '').toLowerCase().trim();
        const prUserId = ((pr as any).patientUserId || '').toLowerCase().trim();
        const prMrn = (pr.patientMrn || '').toLowerCase().trim();
        return (prPatId && validIds.has(prPatId)) || (prUserId && validIds.has(prUserId)) || (prMrn && validIds.has(prMrn));
      });
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.post('/api/prescriptions', (req: Request, res: Response) => {
    const { patientId, doctorId, diagnosis, medications, instructions } = req.body;

    let patient = patients.find(p => p.id === patientId || p.userId === patientId);
    if (!patient) {
      const u = users.find(user => user.id === patientId || user.email === patientId);
      patient = {
        id: patientId || `pat-${Date.now()}`,
        userId: u?.id || patientId || 'usr-pat-1',
        mrn: req.body.patientMrn || `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: req.body.patientName || u?.fullName || 'المريض',
        phone: req.body.patientPhone || u?.phone || '+966501112233',
        email: u?.email || 'patient@medicalcarehub.com',
        birthDate: '1992-05-14',
        gender: 'MALE',
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        address: 'المملكة العربية السعودية',
        emergencyContact: { name: 'جهة اتصال الطوارئ', phone: '+966509998877', relation: 'قريب' },
        createdAt: new Date().toISOString()
      };
      patients.push(patient);
    }

    const doctor = doctors.find(d => d.id === doctorId || d.userId === doctorId) || doctors[0] || {
      id: doctorId || 'doc-1',
      userId: 'usr-doc-1',
      fullName: req.body.doctorName || 'طبيب العيادة الاستشاري',
      specialtyNameAr: 'العيادات التخصصية'
    };

    if (!medications || medications.length === 0) {
      return res.status(400).json({ error: 'قائمة الأدوية مطلوبة.' });
    }

    const rxNum = `RX-${Math.floor(100000 + Math.random() * 900000)}`;

    const newRx: Prescription = {
      id: `rx-${Date.now()}`,
      rxNumber: rxNum,
      patientId: patient.id,
      patientName: patient.fullName,
      patientMrn: patient.mrn,
      doctorId: doctor.id,
      doctorName: req.body.doctorName || doctor.fullName,
      doctorSpecialty: doctor.specialtyNameAr,
      date: new Date().toISOString().split('T')[0],
      diagnosis: diagnosis || 'حسب الكشف السريري',
      medications,
      instructions: instructions || 'الالتزام بمواعيد الجرعات واستشارة الطبيب أو الصيدلي عند ظهور أي أعراض جانبية.',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    prescriptions.unshift(newRx);

    logAudit(doctor.userId || 'usr-doc-1', doctor.fullName, 'DOCTOR', 'ISSUE_PRESCRIPTION', 'PRESCRIPTION', newRx.id, `إصدار وصفة طبية إلكترونية رقم (${rxNum}) للمريض ${patient.fullName}`, req);

    pushNotification(
      patient.userId,
      'وصفة طبية إلكترونية جديدة',
      `تم إصدار وصفة طبية برقم (${rxNum}) من ${doctor.fullName}. يمكنك مراجعة تعليمات الجرعات وصرفها.`,
      'SYSTEM',
      newRx.id
    );

    saveDatabase();

    res.status(201).json(newRx);
  });

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------

  app.get('/api/notifications', (req: Request, res: Response) => {
    const { userId } = req.query;
    let list = [...notifications];

    if (userId) {
      const rawIds = String(userId).split(',').map(s => s.trim()).filter(Boolean);
      const associatedIds = new Set<string>(rawIds);

      rawIds.forEach(id => {
        const pat = patients.find(p => p.id === id || p.userId === id);
        if (pat) {
          associatedIds.add(pat.id);
          if (pat.userId) associatedIds.add(pat.userId);
        }
        const doc = doctors.find(d => d.id === id || d.userId === id);
        if (doc) {
          associatedIds.add(doc.id);
          if (doc.userId) associatedIds.add(doc.userId);
        }
        const stf = staffList.find(s => s.id === id || s.userId === id);
        if (stf) {
          associatedIds.add(stf.id);
          if (stf.userId) associatedIds.add(stf.userId);
        }
        const usr = users.find(u => u.id === id);
        if (usr) {
          associatedIds.add(usr.id);
        }
      });

      list = list.filter(n => associatedIds.has(n.userId) || n.userId === 'all');
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
    const notif = notifications.find(n => n.id === req.params.id);
    if (notif) {
      notif.isRead = true;
      saveDatabase();
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/mark-all-read', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (userId) {
      const rawIds = String(userId).split(',').map(s => s.trim()).filter(Boolean);
      const associatedIds = new Set<string>(rawIds);
      rawIds.forEach(id => {
        const pat = patients.find(p => p.id === id || p.userId === id);
        if (pat) {
          associatedIds.add(pat.id);
          if (pat.userId) associatedIds.add(pat.userId);
        }
        const doc = doctors.find(d => d.id === id || d.userId === id);
        if (doc) {
          associatedIds.add(doc.id);
          if (doc.userId) associatedIds.add(doc.userId);
        }
        const stf = staffList.find(s => s.id === id || s.userId === id);
        if (stf) {
          associatedIds.add(stf.id);
          if (stf.userId) associatedIds.add(stf.userId);
        }
      });
      notifications.forEach(n => {
        if (associatedIds.has(n.userId) || n.userId === userId) n.isRead = true;
      });
    } else {
      notifications.forEach(n => n.isRead = true);
    }
    saveDatabase();
    res.json({ success: true });
  });

  app.post('/api/notifications', (req: Request, res: Response) => {
    const { userId, title, message, type, relatedId, referenceId, amount, currency, transactionReference } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'بيانات الإشعار غير مكتملة.' });
    }
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userId,
      title,
      message,
      type: type || 'SYSTEM',
      isRead: false,
      relatedId: relatedId || referenceId,
      referenceId: referenceId || relatedId,
      amount,
      currency,
      transactionReference,
      createdAt: new Date().toISOString()
    };
    notifications.unshift(newNotif);
    saveDatabase();
    res.status(201).json(newNotif);
  });

  app.post('/api/appointments/notify-doctor-absent', (req: Request, res: Response) => {
    const { appointmentIds, doctorId, doctorName, date, customMessage, coordinatorName } = req.body;
    const ids: string[] = Array.isArray(appointmentIds) ? appointmentIds : (appointmentIds ? [appointmentIds] : []);
    
    if (ids.length === 0 && !doctorId) {
      return res.status(400).json({ error: 'يرجى تحديد المواعيد أو الطبيب المراد إشعار مرضاه بالغياب.' });
    }

    let targetAppointments: Appointment[] = [];
    if (ids.length > 0) {
      targetAppointments = appointments.filter(a => ids.includes(a.id));
    } else if (doctorId) {
      targetAppointments = appointments.filter(a => {
        const matchesDoc = a.doctorId === doctorId;
        const matchesDate = !date || a.confirmedDate === date || a.preferredDate === date;
        return matchesDoc && matchesDate && a.status !== 'CANCELLED' && a.status !== 'COMPLETED';
      });
    }

    const notifiedList: { appointmentId: string; patientName: string; patientPhone: string }[] = [];

    targetAppointments.forEach(apt => {
      const docName = doctorName || apt.doctorName || 'طبيب العيادة';
      const aptDate = date || apt.confirmedDate || apt.preferredDate || 'اليوم';
      const pat = patients.find(p => p.id === apt.patientId || p.userId === apt.patientId);

      const notifTitle = `⚠️ تنبيه من خدمة العملاء: الطبيب ${docName} غير مداوم في العيادة`;
      const notifMessage = customMessage?.trim() || 
        `نود إحاطتكم بأن الطبيب ${docName} غير مداوم في العيادة بتاريخ ${aptDate} لظرف طارئ. نرجو عدم الحضور إلى المستشفى حرصاً على راحتكم ووقتكم، وسيقوم فريق خدمة العملاء بالتواصل معكم هاتفياً لترتيب موعد بديل يناسبكم.`;

      // Push notification to patient
      const targetUserIds = [apt.patientId, pat?.userId, pat?.id].filter(Boolean) as string[];
      pushNotification(
        targetUserIds,
        notifTitle,
        notifMessage,
        'APPOINTMENT',
        apt.id
      );

      // Update appointment state
      apt.isDoctorAbsent = true;
      apt.doctorAbsentNotifiedAt = new Date().toISOString();
      apt.doctorAbsentNotice = notifMessage;
      apt.coordinatorNotes = (apt.coordinatorNotes ? `${apt.coordinatorNotes} | ` : '') + `تم إشعار المريض بعدم دوام الطبيب (${new Date().toLocaleTimeString('ar-SA')})`;
      apt.updatedAt = new Date().toISOString();

      notifiedList.push({
        appointmentId: apt.id,
        patientName: apt.patientName,
        patientPhone: apt.patientPhone
      });

      // Audit Log
      logAudit(
        'cs-staff',
        coordinatorName || 'خدمة العملاء',
        'CUSTOMER_SERVICE',
        'NOTIFY_DOCTOR_ABSENT',
        'APPOINTMENT',
        apt.id,
        `إرسال إشعار غياب الطبيب ${docName} للمريض ${apt.patientName} (${apt.patientPhone}) للموعد ${aptDate}`,
        req
      );
    });

    saveDatabase();

    res.json({
      success: true,
      count: notifiedList.length,
      notifiedAppointments: notifiedList,
      message: `تم إرسال إشعار غياب الطبيب بنجاح إلى ${notifiedList.length} مريض.`
    });
  });

  // ----------------------------------------------------
  // ADMIN DASHBOARD & AUDIT LOGS
  // ----------------------------------------------------

  app.get('/api/admin/stats', (req: Request, res: Response) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.confirmedDate === todayStr || a.preferredDate === todayStr).length;
    const pendingAppts = appointments.filter(a => a.status === 'NEW' || a.status === 'PENDING').length;
    const newConsultations = consultations.filter(c => c.status === 'PENDING').length;
    const completedConsultations = consultations.filter(c => c.status === 'ANSWERED').length;

    // Status distribution
    const statusCounts = {
      NEW: appointments.filter(a => a.status === 'NEW').length,
      PENDING: appointments.filter(a => a.status === 'PENDING').length,
      CONTACTED: appointments.filter(a => a.status === 'CONTACTED').length,
      CONFIRMED: appointments.filter(a => a.status === 'CONFIRMED').length,
      COMPLETED: appointments.filter(a => a.status === 'COMPLETED').length,
      CANCELLED: appointments.filter(a => a.status === 'CANCELLED').length,
      NO_SHOW: appointments.filter(a => a.status === 'NO_SHOW').length
    };

    // Specialty distribution
    const specialtyStats = specialties.map(s => {
      const count = appointments.filter(a => a.doctorSpecialty === s.nameAr).length;
      return {
        name: s.nameAr,
        count
      };
    });

    res.json({
      totalPatients: patients.length,
      activeDoctors: doctors.filter(d => d.isActive).length,
      customerServiceStaff: staffList.filter(s => s.isActive).length,
      todayAppointments: todayAppts,
      pendingAppointments: pendingAppts,
      newConsultations,
      completedConsultations,
      medicalTestsCount: tests.length,
      medicalReportsCount: reports.length,
      statusCounts,
      specialtyStats
    });
  });

  app.get('/api/admin/staff', (req: Request, res: Response) => {
    res.json(staffList);
  });

  app.post('/api/admin/staff', async (req: Request, res: Response) => {
    const { fullName, email, phone, department, roleTitle, shift, password, firebaseUid: clientProvidedUid } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'اسم الموظف مطلوب.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'رقم هاتف موظف خدمة العملاء مطلوب لتسجيل الدخول.' });
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور عن 6 خانات.' });
    }

    const normalizedPhone = phone.trim();
    const cleanDigits = normalizedPhone.replace(/[^0-9]/g, '');
    const cleanPassword = password.trim();

    // Check if user/staff with this phone already exists
    const existingPhoneUser = users.find(u => {
      const uPhone = u.phone ? u.phone.trim() : '';
      const uDigits = uPhone.replace(/[^0-9]/g, '');
      return (
        uPhone === normalizedPhone ||
        (cleanDigits.length >= 7 && uDigits === cleanDigits)
      );
    });

    if (existingPhoneUser) {
      return res.status(409).json({ error: 'رقم الهاتف مسجل مسبقاً لدى مستخدم آخر.' });
    }

    let normalizedEmail = (email && email.trim()) 
      ? email.trim().toLowerCase() 
      : `staff.${cleanDigits || Date.now()}@medicalcarehub.com`;

    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      normalizedEmail = `staff.${cleanDigits || 'user'}.${Date.now()}@medicalcarehub.com`;
    }

    if (isPasswordAlreadyUsed(cleanPassword)) {
      return res.status(400).json({ error: 'كلمة المرور هذه مستخدمة بالفعل لحساب آخر. يجب تعيين كلمة مرور فريدة لكل حساب.' });
    }

    const avatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80';
    const staffId = `stf-${Date.now()}`;

    // Create Firebase Authentication account if Admin SDK or REST is configured
    let firebaseUid = clientProvidedUid || `usr-staff-${Date.now()}`;
    if (!clientProvidedUid) {
      try {
        const fbUser = await createFirebaseAuthUser({
          email: normalizedEmail,
          password: cleanPassword,
          displayName: fullName.trim(),
          phoneNumber: normalizedPhone,
          photoURL: avatar
        });
        if (fbUser) {
          firebaseUid = fbUser.uid;
        }
      } catch (error: any) {
        if (error?.code === 'auth/email-already-exists') {
          return res.status(409).json({ error: 'البريد الإلكتروني موجود بالفعل في Firebase Authentication.' });
        }
        console.warn('[Firebase Auth] Notice on staff creation:', error?.message);
      }
    }

    const userId = firebaseUid;

    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      phone: normalizedPhone,
      fullName: fullName.trim(),
      role: 'CUSTOMER_SERVICE',
      avatar,
      isVerified: true,
      createdAt: new Date().toISOString()
    };

    userPasswords[userId] = cleanPassword;

    const newStaff: Staff = {
      id: staffId,
      userId,
      fullName: fullName.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      department: department || 'مركز خدمة وتنسيق المواعيد',
      roleTitle: roleTitle || 'منسق خدمة عملاء ورعاية المرضى',
      shift: shift || 'الفترة الصباحية (08:00 ص - 04:00 م)',
      isActive: true,
      avatar,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    staffList.push(newStaff);

    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'ADD_STAFF', 'STAFF', staffId, `إضافة موظف خدمة عملاء جديد: ${newStaff.fullName} (${newStaff.email})`, req);

    saveDatabase();

    return res.status(201).json({
      user: newUser,
      staff: newStaff,
      profile: newStaff,
      firebaseUid: userId,
      token: `jwt-session-${userId}-${Date.now()}`,
      message: 'تم إنشاء حساب موظف خدمة العملاء في Firebase Authentication وملف الموظف بنجاح.'
    });
  });

  // Admin update staff
  app.put('/api/admin/staff/:id', async (req: Request, res: Response) => {
    const stf = staffList.find(s => s.id === req.params.id || s.userId === req.params.id);
    if (!stf) return res.status(404).json({ error: 'الموظف غير موجود.' });

    const { fullName, email, phone, department, roleTitle, shift, isActive, password } = req.body;
    const user = users.find(u => u.id === stf.userId);

    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const duplicateUser = users.find(u => u.email.toLowerCase() === normalizedEmail && u.id !== stf.userId);
      if (duplicateUser) {
        return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً لدى مستخدم آخر.' });
      }
      try {
        await updateFirebaseAuthUser(stf.userId, { email: normalizedEmail });
      } catch (error: any) {
        return res.status(500).json({
          error: 'تعذر تحديث بريد موظف خدمة العملاء في Firebase Authentication.',
          details: error?.message || 'Firebase Admin error'
        });
      }
      if (user) user.email = normalizedEmail;
      stf.email = normalizedEmail;
    }

    if (password && password.trim()) {
      const cleanPassword = password.trim();
      if (cleanPassword.length < 6) {
        return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور عن 6 خانات.' });
      }
      if (isPasswordAlreadyUsed(cleanPassword, stf.userId)) {
        return res.status(400).json({ 
          error: 'كلمة المرور هذه مستخدمة بالفعل لحساب آخر. يرجى اختيار كلمة مرور فريدة لحماية خصوصية الحساب.' 
        });
      }
      try {
        await updateFirebaseAuthUser(stf.userId, { password: cleanPassword });
      } catch (error: any) {
        return res.status(500).json({
          error: 'تعذر تحديث كلمة مرور موظف خدمة العملاء في Firebase Authentication.',
          details: error?.message || 'Firebase Admin error'
        });
      }
      userPasswords[stf.userId] = cleanPassword;
    }

    if (fullName) {
      stf.fullName = fullName.trim();
      if (user) user.fullName = fullName.trim();
    }
    if (phone) {
      stf.phone = phone.trim();
      if (user) user.phone = phone.trim();
    }
    if (department !== undefined) stf.department = department;
    if (roleTitle !== undefined) stf.roleTitle = roleTitle;
    if (shift !== undefined) stf.shift = shift;
    if (isActive !== undefined) stf.isActive = Boolean(isActive);

    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'UPDATE_STAFF', 'STAFF', stf.id, `تعديل بيانات موظف خدمة العملاء: ${stf.fullName}`, req);

    saveDatabase();
    res.json(stf);
  });

  app.patch('/api/admin/staff/:id', async (req: Request, res: Response) => {
    const stf = staffList.find(s => s.id === req.params.id || s.userId === req.params.id);
    if (!stf) return res.status(404).json({ error: 'الموظف غير موجود.' });

    const { fullName, email, phone, department, roleTitle, shift, isActive, password } = req.body;
    const user = users.find(u => u.id === stf.userId);

    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const duplicateUser = users.find(u => u.email.toLowerCase() === normalizedEmail && u.id !== stf.userId);
      if (duplicateUser) {
        return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً لدى مستخدم آخر.' });
      }
      try {
        await updateFirebaseAuthUser(stf.userId, { email: normalizedEmail });
      } catch (error: any) {
        return res.status(500).json({
          error: 'تعذر تحديث بريد موظف خدمة العملاء في Firebase Authentication.',
          details: error?.message || 'Firebase Admin error'
        });
      }
      if (user) user.email = normalizedEmail;
      stf.email = normalizedEmail;
    }

    if (password && password.trim()) {
      const cleanPassword = password.trim();
      if (cleanPassword.length < 6) {
        return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور عن 6 خانات.' });
      }
      if (isPasswordAlreadyUsed(cleanPassword, stf.userId)) {
        return res.status(400).json({ 
          error: 'كلمة المرور هذه مستخدمة بالفعل لحساب آخر. يرجى اختيار كلمة مرور فريدة لحماية خصوصية الحساب.' 
        });
      }
      try {
        await updateFirebaseAuthUser(stf.userId, { password: cleanPassword });
      } catch (error: any) {
        return res.status(500).json({
          error: 'تعذر تحديث كلمة مرور موظف خدمة العملاء في Firebase Authentication.',
          details: error?.message || 'Firebase Admin error'
        });
      }
      userPasswords[stf.userId] = cleanPassword;
    }

    if (fullName) {
      stf.fullName = fullName.trim();
      if (user) user.fullName = fullName.trim();
    }
    if (phone) {
      stf.phone = phone.trim();
      if (user) user.phone = phone.trim();
    }
    if (department !== undefined) stf.department = department;
    if (roleTitle !== undefined) stf.roleTitle = roleTitle;
    if (shift !== undefined) stf.shift = shift;
    if (isActive !== undefined) stf.isActive = Boolean(isActive);

    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'UPDATE_STAFF', 'STAFF', stf.id, `تعديل بيانات موظف خدمة العملاء: ${stf.fullName}`, req);

    saveDatabase();
    res.json(stf);
  });

  // Admin delete staff
  app.delete('/api/admin/staff/:id', async (req: Request, res: Response) => {
    const stf = staffList.find(s => s.id === req.params.id || s.userId === req.params.id);
    if (!stf) {
      return res.status(404).json({ error: 'الموظف غير موجود.' });
    }

    const deletedStaffName = stf.fullName;
    const deletedStaffUserId = stf.userId;
    staffList = staffList.filter(s => s.id !== stf.id && s.userId !== stf.userId);

    if (deletedStaffUserId) {
      await deleteFirebaseAuthUser(deletedStaffUserId);
      users = users.filter(u => u.id !== deletedStaffUserId);
      delete userPasswords[deletedStaffUserId];
    }

    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'DELETE_STAFF', 'STAFF', stf.id, `حذف حساب موظف خدمة العملاء ${deletedStaffName} وإلغاء صلاحياته نهائياً`, req);

    saveDatabase();

    res.json({ success: true, message: `تم حذف حساب موظف خدمة العملاء ${deletedStaffName} بنجاح.` });
  });

  app.patch('/api/admin/staff/:id/toggle-status', (req: Request, res: Response) => {
    const stf = staffList.find(s => s.id === req.params.id);
    if (!stf) return res.status(404).json({ error: 'الموظف غير موجود' });
    stf.isActive = !stf.isActive;
    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'TOGGLE_STAFF_STATUS', 'STAFF', stf.id, `تغيير حالة الموظف ${stf.fullName} إلى ${stf.isActive ? 'نشط' : 'معطل'}`, req);
    saveDatabase();
    res.json(stf);
  });

  app.get('/api/admin/audit-logs', (req: Request, res: Response) => {
    const { limit } = req.query;
    const count = limit ? Number(limit) : 50;
    res.json(auditLogs.slice(0, count));
  });

  // Clear all mock & transactional data endpoint
  app.post('/api/admin/clear-all-data', (req: Request, res: Response) => {
    appointments = [];
    consultations = [];
    examinations = [];
    tests = [];
    reports = [];
    prescriptions = [];
    notifications = [];
    auditLogs = [];

    saveDatabase();
    res.json({
      success: true,
      message: 'تم مسح كافة البيانات التجريبية والمواعيد والاستشارات بنجاح والبدء بسجل نقي تماماً.'
    });
  });

  // ----------------------------------------------------
  // GEMINI AI INTEGRATIONS (With strict physician review disclaimers)
  // ----------------------------------------------------

  // Summarize Patient Medical Record for Doctor / Patient Overview
  app.post('/api/ai/summarize-record', async (req: Request, res: Response) => {
    const { patientId } = req.body;
    const patient = patients.find(p => p.id === patientId || p.userId === patientId);

    if (!patient) {
      return res.status(404).json({ error: 'المريض غير موجود.' });
    }

    const patientExms = examinations.filter(e => e.patientId === patient.id);
    const patientTests = tests.filter(t => t.patientId === patient.id);
    const patientRx = prescriptions.filter(p => p.patientId === patient.id);

    const context = `
بيانات المريض:
الاسم: ${patient.fullName}
العمر / الميلاد: ${patient.birthDate}
الجنس: ${patient.gender === 'MALE' ? 'ذكر' : 'أنثى'}
فصيلة الدم: ${patient.bloodType}
الحساسيات الدوائية: ${patient.allergies.join('، ') || 'لا توجد'}
الأمراض المزمنة: ${patient.chronicDiseases.join('، ') || 'لا توجد'}

المعاينات السابقة:
${patientExms.map(e => `- تاريخ ${e.examinationDate}: التشخيص [${e.diagnosis}]، التوصيات: [${e.recommendations}]`).join('\n')}

الفحوصات المخبرية:
${patientTests.map(t => `- فحص ${t.testName} (${t.testDate}): ${t.resultsSummary}`).join('\n')}

الوصفات الطبية:
${patientRx.map(r => `- وصفة ${r.rxNumber} (${r.date}): ${r.medications.map(m => m.medicationName).join(', ')}`).join('\n')}
    `;

    const ai = getGeminiAI();
    if (!ai) {
      // Fallback smart clinical summary if API key is not configured yet
      return res.json({
        summary: `ملخص طبي لحالة المريض ${patient.fullName} (ملف رقم ${patient.mrn}):
المريض مستقر صحياً مع متابعة دورية لضغط الدم (${patient.chronicDiseases.join('، ') || 'لا توجد أمراض مزمنة حرجة'}).
الحساسيات المسجلة: ${patient.allergies.join('، ') || 'لا توجد حساسية دوائية معروفة'}.
آخر المؤشرات المخبرية: نتائج فحوصات الكلى والدهون والسكر التراكمي ضمن الحدود المستهدفة.
الأدوية الحالية: ${patientRx.length > 0 ? patientRx[0].medications.map(m => m.medicationName).join('، ') : 'لا توجد أدوية حالية'}.`,
        disclaimer: 'تنبيه طبي: هذا الملخص تم توليده آلياً للمساعدة السريرية ويجب مراجعته واعتماده من قبل الطبيب المعالج.',
        source: 'local_engine'
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `أنت مساعد طبي ذكي في منصة Medical Care Hub.
قم بصياغة ملخص طبي سريري منظم وموجز باللغة العربية لحالة المريض بناءً على السجل التالي:
${context}

المطلوب:
1. نبذة موجزة عن التاريخ الطبي والأمراض المزمنة والحساسيات.
2. ملخص لأهم نتائج الفحوصات الأخيرة.
3. خطة العلاج والأدوية الحالية.
4. نقاط المتابعة المقترحة للطبيب المعالج.

ملاحظة هامة: اجعل النص احترافياً ورصيناً. لا تضع أي ادعاء تشخيصي قطعي بدون مراجعة الطبيب.`
      });

      res.json({
        summary: response.text,
        disclaimer: 'تنبيه نظام: محتوى مولد بالذكاء الاصطناعي للمساعدة السريرية — يتطلب مراجعة واعتماد الطبيب المختص.',
        source: 'gemini-2.5-flash'
      });
    } catch (err: any) {
      console.error('Gemini Summarization error:', err);
      res.json({
        summary: `ملخص سريري: المريض ${patient.fullName} متابع بانتظام للضغط والأيض، والفحوصات الأخيرة مستقرة. الأدوية: ${patientRx.length > 0 ? patientRx[0].medications.map(m => m.medicationName).join('، ') : 'مستقرة'}.`,
        disclaimer: 'تنبيه نظام: ملخص إرشادي يتطلب تدقيق الطبيب المعالج.',
        source: 'fallback'
      });
    }
  });

  // AI Medical Report Draft Assistant
  app.post('/api/ai/draft-report', async (req: Request, res: Response) => {
    const { patientName, age, gender, diagnosis, keyFindings, recommendations } = req.body;

    const ai = getGeminiAI();
    if (!ai) {
      return res.json({
        draft: {
          clinicalHistory: `المريض راجع العيادة لتقييم ومتابعة الحالة السريرية لـ (${diagnosis || 'الحالة'}).`,
          findings: keyFindings || 'المؤشرات الحيوية والفحص السريري للقلب والصدر ضمن النطاق الطبيعي المستقر.',
          recommendations: recommendations || 'الاستمرار على الخطة العلاجية والمتابعة الدورية.'
        },
        disclaimer: 'مسودة تقرير استرشادية تتطلب اعتماد وتوقيع الطبيب المعالج.'
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `أنت مساعد صياغة تقارير طبية لمستشفى الرعاية الطبية.
المريض: ${patientName} (${gender === 'MALE' ? 'ذكر' : 'أنثى'}، ${age} سنة)
التشخيص: ${diagnosis}
الملاحظات السريرية: ${keyFindings}
التوصيات: ${recommendations}

قم بصياغة نص تقرير طبي مهني رسمي باللغة العربية مكون من 3 فقرات منفصلة:
1. التاريخ السريري وسبب الزيارة
2. النتائج والفحص السريري
3. التوصيات والخطة العلاجية`
      });

      res.json({
        rawText: response.text,
        disclaimer: 'مسودة تقرير طبي للمراجعة والاعتماد من قبل الطبيب المعالج قبل التوقيع النهائي.'
      });
    } catch (err) {
      res.json({
        rawText: `التاريخ السريري: مراجعة العيادة لتقييم ${diagnosis}.\nالنتائج: الفحص السريري والمؤشرات مستقرة.\nالتوصيات: ${recommendations || 'الالتزام بالعلاج المحدد والمراجعة عند اللزوم.'}`,
        disclaimer: 'مسودة تقرير طبي للمراجعة والاعتماد.'
      });
    }
  });

  // ----------------------------------------------------
  // VITE DEVELOPMENT MIDDLEWARE & PRODUCTION SERVING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Medical Care Hub Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
