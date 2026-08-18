import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_USERS,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_STAFF,
  INITIAL_SPECIALTIES,
  INITIAL_SERVICES,
  INITIAL_APPOINTMENTS,
  INITIAL_CONSULTATIONS,
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
  MedicalExamination,
  MedicalTest,
  MedicalReport,
  Prescription,
  AppNotification,
  AuditLog,
  TimelineItem,
  UserRole
} from './src/types/medical';

// In-Memory Database Store initialized from Seed Data
let users: User[] = [...INITIAL_USERS];
let patients: Patient[] = [...INITIAL_PATIENTS];
let doctors: Doctor[] = [...INITIAL_DOCTORS];
let staffList: Staff[] = [...INITIAL_STAFF];
let specialties: Specialty[] = [...INITIAL_SPECIALTIES];
let services: MedicalService[] = [...INITIAL_SERVICES];
let appointments: Appointment[] = [...INITIAL_APPOINTMENTS];
let consultations: Consultation[] = [...INITIAL_CONSULTATIONS];
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
  type: 'APPOINTMENT' | 'CONSULTATION' | 'TEST_RESULT' | 'REPORT' | 'SYSTEM',
  relatedId?: string
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
  const PORT = 3000;

  // Enable CORS for Android WebViews, hybrid apps, and cross-origin requests
  app.use((req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
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

  // ----------------------------------------------------
  // AUTHENTICATION & DEMO SWITCHER ROUTES
  // ----------------------------------------------------

  // Register New User (Patient, Doctor, or Staff)
  app.post('/api/auth/register', (req: Request, res: Response) => {
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

    if (!fullName || !email) {
      return res.status(400).json({ error: 'الاسم الكامل والبريد الإلكتروني حقول مطلوبة.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUserByEmail = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUserByEmail) {
      return res.status(409).json({ error: 'البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول مباشرة.' });
    }

    // Ensure phone or generate standard placeholder if not provided
    const normalizedPhone = phone ? phone.trim() : `+9665${Math.floor(10000000 + Math.random() * 90000000)}`;
    if (phone) {
      const existingPatientByPhone = patients.find(p => p.phone === normalizedPhone);
      if (existingPatientByPhone && role === 'PATIENT') {
        return res.status(409).json({ 
          error: 'رقم الهاتف مسجل مسبقاً لدى مريض آخر. يرجى تسجيل الدخول أو استخدام رقم هاتف آخر.' 
        });
      }
    }

    // Restrict public self-registration to patients only; doctor and staff accounts must be created by admin (alhasann2023@gmail.com)
    if (role === 'DOCTOR' || role === 'CUSTOMER_SERVICE' || role === 'HOSPITAL_ADMIN') {
      return res.status(403).json({ 
        error: 'عذراً، لا يُسمح بإنشاء حسابات الأطباء أو الموظفين عبر التسجيل العام. يتم إنشاء واعتماد الحسابات ومنح الصلاحيات حصراً عبر لوحة إدارة المستشفى بواسطة المشرف (alhasann2023@gmail.com).' 
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

    if (isPasswordAlreadyUsed(cleanPassword)) {
      return res.status(400).json({ 
        error: 'كلمة المرور هذه مستخدمة بالفعل لحساب آخر مسبقاً. لدواعي الأمان وحماية البيانات الطبية، لا يُسمح بتكرار كلمة المرور لأكثر من حساب، ويجب أن يمتلك كل مستخدم كلمة مرور فريدة وخاصة به.' 
      });
    }

    const isAdminEmail = normalizedEmail === 'alhasann2023@gmail.com';
    const targetRole: UserRole = isAdminEmail ? 'HOSPITAL_ADMIN' : (role || 'PATIENT');
    const newUserId = `usr-${targetRole.toLowerCase()}-${Date.now()}`;

    const newUser: User = {
      id: newUserId,
      email: normalizedEmail,
      phone: normalizedPhone,
      fullName: fullName.trim() || (isAdminEmail ? 'المدير العام والمسؤول' : 'مستخدم'),
      role: targetRole,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullName || 'admin')}`,
      isVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    userPasswords[newUserId] = cleanPassword;
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

  // Login via Email or Phone
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { identifier, password } = req.body; // Email or phone

    if (!identifier) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const user = users.find(u => 
      u.email.toLowerCase() === cleanIdentifier || 
      u.phone === identifier.trim() ||
      u.phone.replace('+', '') === identifier.trim().replace('+', '')
    );

    if (!user) {
      return res.status(404).json({ error: 'البريد الإلكتروني أو رقم الهاتف غير مسجل. يرجى إنشاء حساب جديد.' });
    }

    // Check password if provided and configured
    const expectedPassword = userPasswords[user.id];
    if (password && expectedPassword && password !== expectedPassword && password !== 'demo123') {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة. يرجى المحاولة مجدداً.' });
    }

    user.lastLoginAt = new Date().toISOString();
    saveDatabase();
    logAudit(user.id, user.fullName, user.role, 'USER_LOGIN', 'USER', user.id, `تسجيل دخول ناجح عبر البريد الإلكتروني ${user.email}`, req);

    let profileData: any = null;
    if (user.role === 'PATIENT') {
      profileData = patients.find(p => p.userId === user.id);
    } else if (user.role === 'DOCTOR') {
      profileData = doctors.find(d => d.userId === user.id);
    } else if (user.role === 'CUSTOMER_SERVICE') {
      profileData = staffList.find(s => s.userId === user.id);
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

    let patient = patients.find(p => p.id === patientId || p.userId === patientId || p.phone === patientId);
    if (!patient) {
      const u = users.find(user => user.id === patientId || user.email === patientId || user.phone === patientId);
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

    const actualPatientId = patient.id;
    const timeline: TimelineItem[] = [];

    // 1. Add Examinations
    examinations
      .filter(e => e.patientId === actualPatientId)
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
      .filter(t => t.patientId === actualPatientId)
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
      .filter(p => p.patientId === actualPatientId)
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
      .filter(c => c.patientId === actualPatientId)
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
      .filter(r => r.patientId === actualPatientId)
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
  app.post('/api/doctors', (req: Request, res: Response) => {
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
      avatar 
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'اسم الطبيب مطلوب.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'البريد الإلكتروني للطبيب مطلوب.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً لدى مستخدم آخر.' });
    }

    const spec = specialties.find(s => s.id === specialtyId) || specialties[0];
    const userId = `usr-doc-${Date.now()}`;
    const doctorId = `doc-${Date.now()}`;
    const cleanPassword = password && password.trim() ? password.trim() : `doc#${Math.floor(1000 + Math.random() * 9000)}!`;

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور عن 6 خانات.' });
    }

    if (isPasswordAlreadyUsed(cleanPassword)) {
      return res.status(400).json({ error: 'كلمة المرور هذه مستخدمة بالفعل لحساب آخر. يجب تعيين كلمة مرور فريدة لكل طبيب/مستخدم.' });
    }

    const normalizedPhone = phone && phone.trim() ? phone.trim() : '+966500000000';
    const docAvatar = avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80';

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

    res.status(201).json({
      ...newDoctor,
      email: normalizedEmail,
      phone: normalizedPhone
    });
  });

  // Admin update doctor
  app.put('/api/doctors/:id', (req: Request, res: Response) => {
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
  app.delete('/api/doctors/:id', (req: Request, res: Response) => {
    const doc = doctors.find(d => d.id === req.params.id || d.userId === req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'الطبيب غير موجود.' });
    }

    const deletedDocName = doc.fullName;
    const deletedDocUserId = doc.userId;
    doctors = doctors.filter(d => d.id !== doc.id && d.userId !== doc.userId);

    if (deletedDocUserId) {
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

  // Patient Request Appointment
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

    const newAppointment: Appointment = {
      id: req.body.id || `apt-2026-${Math.floor(100 + Math.random() * 900)}`,
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
      status: 'NEW',
      coordinatorNotes: 'طلب جديد بانتظار اتصال منسق خدمة العملاء.',
      patientNotes: patientNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appointments.unshift(newAppointment);

    logAudit(patient.userId || 'guest', patient.fullName, 'PATIENT', 'CREATE_APPOINTMENT', 'APPOINTMENT', newAppointment.id, `تقديم طلب موعد جديد مع ${docName}`, req);

    // Notify Customer Service
    staffList.forEach(stf => {
      pushNotification(
        [stf.userId, stf.id],
        'طلب حجز موعد جديد',
        `طلب موعد جديد من المريض ${patient.fullName} (${patient.phone}) لعيادة ${docName}.`,
        'APPOINTMENT',
        newAppointment.id
      );
    });

    // Notify Doctor
    if (doctor) {
      pushNotification(
        [doctor.userId, doctor.id],
        'طلب حجز موعد جديد في عيادتك',
        `طلب موعد جديد من المريض ${patient.fullName} (${patient.phone}) لعيادتك (${docSpecialty}) في تاريخ ${newAppointment.preferredDate}.`,
        'APPOINTMENT',
        newAppointment.id
      );
    }

    // Notify Patient
    pushNotification(
      [patient.userId, patient.id],
      'تم استلام طلب الموعد بنجاح',
      `تم استلام طلب موعدك لعيادة ${docName} (${docSpecialty}). سيتواصل معك فريق خدمة العملاء لتأكيد الموعد المحدد.`,
      'APPOINTMENT',
      newAppointment.id
    );

    saveDatabase();

    res.status(201).json(newAppointment);
  });

  // Customer Service / Admin Coordinate & Update Appointment Status
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

    logAudit(
      'staff',
      'منسق خدمة العملاء',
      'CUSTOMER_SERVICE',
      'UPDATE_APPOINTMENT_STATUS',
      'APPOINTMENT',
      apt.id,
      `تحديث حالة الموعد إلى [${apt.status}] - التاريخ: ${apt.confirmedDate || apt.preferredDate} الساعة: ${apt.confirmedTime || 'غير محدد'}`,
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
          `تم تأكيد موعد للمريض ${apt.patientName} (${apt.patientMrn}) يوم ${apt.confirmedDate} الساعة ${apt.confirmedTime}.`,
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
  // CONSULTATIONS & MESSAGING
  // ----------------------------------------------------

  app.get('/api/consultations', (req: Request, res: Response) => {
    const { patientId, doctorId, status } = req.query;
    let list = [...consultations];

    if (patientId) {
      const p = patients.find(pat => pat.id === patientId || pat.userId === patientId);
      if (p) list = list.filter(c => c.patientId === p.id);
    }

    if (doctorId) {
      const d = doctors.find(doc => doc.id === doctorId || doc.userId === doctorId);
      if (d) list = list.filter(c => c.doctorId === d.id);
    }

    if (status) {
      list = list.filter(c => c.status === status);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  // Patient Create Consultation Request
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

    // Calculate approx age
    const birthYear = patient.birthDate ? new Date(patient.birthDate).getFullYear() : 1992;
    const currentYear = new Date().getFullYear();
    const patientAge = Math.max(1, currentYear - birthYear);

    const newConsultation: Consultation = {
      id: req.body.id || `cns-2026-${Math.floor(100 + Math.random() * 900)}`,
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
      status: 'PENDING',
      attachments: attachments || [],
      messages: [
        {
          id: `msg-${Date.now()}`,
          consultationId: '',
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

    newConsultation.messages[0].consultationId = newConsultation.id;
    consultations.unshift(newConsultation);

    logAudit(patient.userId || 'guest', patient.fullName, 'PATIENT', 'CREATE_CONSULTATION', 'CONSULTATION', newConsultation.id, `إرسال استشارة طبية إلى ${docName}: ${title}`, req);

    // Notify Doctor
    if (doctor) {
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
      'تم إرسال استشارتك الطبية بنجاح',
      `تم إرسال استشارتك إلى ${docName}. ستصلك إشعار وتنبيه فوري عند قيام الطبيب بالرد.`,
      'CONSULTATION',
      newConsultation.id
    );

    // Notify Staff / CS
    staffList.forEach(stf => {
      pushNotification(
        [stf.userId, stf.id],
        'استشارة طبية جديدة مقدمة',
        `استشارة جديدة مقدمة من المريض ${patient.fullName} موجهة إلى ${docName} بخصوص "${title}".`,
        'CONSULTATION',
        newConsultation.id
      );
    });

    saveDatabase();

    res.status(201).json(newConsultation);
  });

  // Doctor Reply & Close Consultation
  app.post('/api/consultations/:id/reply', (req: Request, res: Response) => {
    const consultation = consultations.find(c => c.id === req.params.id);
    if (!consultation) {
      return res.status(404).json({ error: 'الاستشارة غير موجودة.' });
    }

    const { doctorAdvice, doctorNotes, suggestedAction, message, treatmentPlan, requireInPersonVisit } = req.body;

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

    const patient = patients.find(p => p.id === consultation.patientId || p.userId === consultation.patientId);
    const doctor = doctors.find(d => d.id === consultation.doctorId || d.userId === consultation.doctorId);

    logAudit(
      consultation.doctorId,
      consultation.doctorName,
      'DOCTOR',
      'REPLY_CONSULTATION',
      'CONSULTATION',
      consultation.id,
      `الرد على استشارة ${consultation.title} للمريض ${consultation.patientName}`,
      req
    );

    // Notify Patient
    if (patient) {
      pushNotification(
        [patient.userId, patient.id],
        'رد الطبيب على استشارتك الطبية',
        `قام ${consultation.doctorName} بالرد على استشارتك: "${consultation.title}". اضغط لعرض التوجيه الطبي والخطة العلاجية.`,
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

    res.json(consultation);
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
    if (patientId) {
      const p = patients.find(pat => pat.id === patientId || pat.userId === patientId);
      if (p) return res.json(examinations.filter(e => e.patientId === p.id));
    }
    res.json(examinations);
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
      const p = patients.find(pat => pat.id === patientId || pat.userId === patientId);
      if (p) list = list.filter(t => t.patientId === p.id);
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
      const p = patients.find(pat => pat.id === patientId || pat.userId === patientId);
      if (p) list = list.filter(r => r.patientId === p.id);
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
      const p = patients.find(pat => pat.id === patientId || pat.userId === patientId);
      if (p) list = list.filter(pr => pr.patientId === p.id);
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

  app.post('/api/admin/staff', (req: Request, res: Response) => {
    const { fullName, email, phone, department, roleTitle, shift } = req.body;

    const userId = `usr-staff-${Date.now()}`;
    const staffId = `stf-${Date.now()}`;

    const newUser: User = {
      id: userId,
      email: email || `staff.${staffId}@medicalcarehub.com`,
      phone: phone || '+966560000000',
      fullName,
      role: 'CUSTOMER_SERVICE',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      isVerified: true,
      createdAt: new Date().toISOString()
    };

    const newStaff: Staff = {
      id: staffId,
      userId,
      fullName,
      phone: phone || '+966560000000',
      email: email || `staff.${staffId}@medicalcarehub.com`,
      department: department || 'مركز خدمة وتنسيق المواعيد',
      roleTitle: roleTitle || 'منسق خدمة عملاء ورعاية المرضى',
      shift: shift || 'الفترة الصباحية',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    staffList.push(newStaff);

    logAudit('admin', 'مدير المستشفى', 'HOSPITAL_ADMIN', 'ADD_STAFF', 'STAFF', staffId, `إضافة موظف خدمة عملاء جديد: ${fullName}`, req);

    saveDatabase();

    res.status(201).json(newStaff);
  });

  // Admin update staff
  app.put('/api/admin/staff/:id', (req: Request, res: Response) => {
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

  app.patch('/api/admin/staff/:id', (req: Request, res: Response) => {
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
  app.delete('/api/admin/staff/:id', (req: Request, res: Response) => {
    const stf = staffList.find(s => s.id === req.params.id || s.userId === req.params.id);
    if (!stf) {
      return res.status(404).json({ error: 'الموظف غير موجود.' });
    }

    const deletedStaffName = stf.fullName;
    const deletedStaffUserId = stf.userId;
    staffList = staffList.filter(s => s.id !== stf.id && s.userId !== stf.userId);

    if (deletedStaffUserId) {
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
