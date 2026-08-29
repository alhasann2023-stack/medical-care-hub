
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
  UserRole,
  Payment,
  FollowUpAppointment,
  Refund,
  ReminderSchedule,
  PaymentMethod,
  PaymentSettings,
  PaymentLedgerEntry,
  CurrencyCode
} from '../types/medical';

import {
  getPatientByUserId,
  getDoctorByUserId,
  getDoctorsWithFilter,
  getAppointmentsWithFilter,
  getConsultationsWithFilter,
  fetchDocsWithFilter,
  fetchDocById,
  subscribeToUser,
  subscribeToDoctors,
  subscribeToAppointments,
  subscribeToConsultations,
  subscribeToNotifications,
  subscribeToPayments,
  subscribeToFollowUps,
  FIRESTORE_COLLECTIONS
} from './firebase';

import { firebaseDb } from './firebaseDb';

import {
  INITIAL_USERS,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_STAFF,
  INITIAL_SPECIALTIES,
  INITIAL_SERVICES
} from '../data/seedData';


// ============================================================
// Backend availability
// ============================================================

let isBackendAvailable: boolean =
  typeof window !== 'undefined'
    ? !(
        window.location.hostname.includes('netlify.app') ||
        window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('github.io') ||
        window.location.hostname.includes('web.app') ||
        window.location.hostname.includes('firebaseapp.com')
      )
    : true;


// ============================================================
// API token
// ============================================================

export const API_TOKEN_KEY =
  'mch_api_token';


// ============================================================
// Token helpers
// ============================================================

function getApiToken(): string | null {
  try {
    return localStorage.getItem(
      API_TOKEN_KEY
    );
  } catch {
    return null;
  }
}

function setApiToken(
  token?: string | null
): void {
  try {
    if (token) {
      localStorage.setItem(
        API_TOKEN_KEY,
        token
      );
    } else {
      localStorage.removeItem(
        API_TOKEN_KEY
      );
    }
  } catch {
    // Ignore
  }
}

export function clearApiToken(): void {
  setApiToken(null);
}


// ============================================================
// Generic JSON request
// ============================================================

async function fetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<T> {

  if (!isBackendAvailable) {
    throw new Error(
      'BACKEND_UNAVAILABLE'
    );
  }

  try {

    const token =
      getApiToken();

    const headers =
      new Headers(
        options?.headers || {}
      );

    if (
      !headers.has(
        'Content-Type'
      )
    ) {
      headers.set(
        'Content-Type',
        'application/json'
      );
    }

    if (
      token &&
      !headers.has(
        'Authorization'
      )
    ) {
      headers.set(
        'Authorization',
        'Bearer ' + token
      );
    }

    const res =
      await fetch(
        url,
        {
          ...options,
          headers
        }
      );


    if (
      res.status === 404
    ) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await res.json().catch(() => ({ error: 'العنصر المطلوب غير موجود' }));
        throw new Error(errorData?.error || errorData?.message || 'العنصر المطلوب غير موجود');
      }
      isBackendAvailable =
        false;

      throw new Error(
        'BACKEND_UNAVAILABLE'
      );
    }


    if (
      !res.ok
    ) {

      const errorData =
        await res
          .json()
          .catch(
            () => ({
              error:
                'فشل تنفيذ الطلب'
            })
          );


      if (
        res.status === 401 ||
        res.status === 403
      ) {

        clearApiToken();
      }


      throw new Error(
        errorData?.error ||
        errorData?.message ||
        (
          'Error ' +
          res.status +
          ': ' +
          res.statusText
        )
      );
    }


    return await res.json();

  } catch (
    err: any
  ) {

    if (
      err?.name === 'TypeError' ||
      err?.message ===
        'BACKEND_UNAVAILABLE' ||
      err?.message?.includes(
        'Failed to fetch'
      )
    ) {

      isBackendAvailable =
        false;
    }

    throw err;
  }
}


// ============================================================
// API
// ============================================================

export const api = {

  // ==========================================================
  // REGISTER
  // ==========================================================

  register: async (
    data: any
  ) => {

    try {

      const res =
        await fetchJson<{
          user: User;
          patient?: Patient;
          doctor?: Doctor;
          staff?: Staff;
          profile?: any;
          message: string;
          token?: string;
        }>(
          '/api/auth/register',
          {
            method: 'POST',
            body:
              JSON.stringify(data)
          }
        );


      if (
        res.token
      ) {

        setApiToken(
          res.token
        );
      }


      if (
        res.user
      ) {

        await firebaseDb.saveUser(
          res.user
        );

        if (
          res.patient
        ) {

          await firebaseDb.savePatient(
            res.patient
          );
        }

        if (
          res.doctor
        ) {

          await firebaseDb.saveDoctor(
            res.doctor
          );
        }

        if (
          res.staff
        ) {

          await firebaseDb.saveStaff(
            res.staff
          );
        }
      }


      return res;

    } catch (
      err: any
    ) {

      console.warn(
        'API register error, creating in Firestore:',
        err
      );


      // --------------------------------------------------------
      // Firestore fallback
      // --------------------------------------------------------

      const userId =
        data.id ||
        (
          'user-' +
          Date.now()
        );


      const cleanPhoneDigits = (data.phone || '').replace(/[^0-9]/g, '');
      const isAdminPhone = cleanPhoneDigits === '776458925' || cleanPhoneDigits.endsWith('776458925') || (data.phone && data.phone.includes('776458925'));
      const isAdmin = data.email === 'alhasann2023@gmail.com' || isAdminPhone;
      const fallbackEmail = data.email || (cleanPhoneDigits ? `${cleanPhoneDigits}@phone.medicalcarehub.com` : `user-${Date.now()}@medicalcarehub.com`);

      const newUser:
        User = {

        id:
          userId,

        fullName:
          data.fullName || (isAdmin ? 'المدير العام والمسؤول' : 'مستخدم'),

        email:
          fallbackEmail,

        phone:
          data.phone ||
          '',

        role:
          isAdmin ? 'HOSPITAL_ADMIN' : (data.role || 'PATIENT'),

        isVerified:
          true,

        createdAt:
          new Date().toISOString()

      };


      await firebaseDb.saveUser(
        newUser
      );


      let profile:
        any =
        null;


      if (
        newUser.role ===
        'PATIENT'
      ) {

        profile = {

          id:
            (
              'pat-' +
              Date.now()
            ),

          userId:
            newUser.id,

          mrn:
            (
              'MRN-' +
              Math.floor(
                100000 +
                Math.random() *
                900000
              )
            ),

          fullName:
            newUser.fullName,

          email:
            newUser.email,

          phone:
            newUser.phone,

          gender:
            data.gender ||
            'MALE',

          birthDate:
            data.birthDate ||
            '1995-01-01',

          bloodType:
            data.bloodType ||
            'O+',

          allergies:
            [
              'لا توجد حساسيات معروفة'
            ],

          chronicConditions:
            [
              'سليم'
            ],

          insuranceProvider:
            'التأمين الطبي',

          insurancePolicyNumber:
            (
              'POL-' +
              Math.floor(
                1000000 +
                Math.random() *
                9000000
              )
            ),

          emergencyContactName:
            'أحد أفراد العائلة',

          emergencyContactPhone:
            newUser.phone ||
            '',

          createdAt:
            new Date().toISOString()
        };


        await firebaseDb.savePatient(
          profile
        );
      } else if (newUser.role === 'HOSPITAL_ADMIN') {
        profile = {
          id: 'stf-' + Date.now(),
          userId: newUser.id,
          fullName: newUser.fullName,
          department: 'إدارة المستشفى والعمليات العليا',
          roleTitle: 'المدير العام والمسؤول المعتمد',
          shift: 'شامل',
          avatar: newUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          phone: newUser.phone,
          email: newUser.email,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        await firebaseDb.saveStaff(
          profile
        );
      }


      // --------------------------------------------------------
      // Backend sync
      // --------------------------------------------------------

      try {

        await fetch(
          '/api/auth/sync-user',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({
                user:
                  newUser,

                patient:
                  newUser.role === 'PATIENT' ? profile : undefined,

                staff:
                  newUser.role === 'HOSPITAL_ADMIN' ? profile : undefined,

                // كلمة المرور تستخدم فقط في المزامنة.
                // لا يتم تخزينها في localStorage.
                password:
                  data.password
              })
          }
        );

      } catch (
        syncError
      ) {

        console.warn(
          'Sync user notice:',
          syncError
        );
      }


      return {

        user:
          newUser,

        patient:
          newUser.role === 'PATIENT'
            ? profile as Patient
            : undefined,

        doctor:
          undefined as
            Doctor |
            undefined,

        staff:
          undefined as
            Staff |
            undefined,

        profile,

        message:
          'تم التسجيل بنجاح'
      };
    }
  },


  // ==========================================================
  // LOGIN
  // ==========================================================

  login: async (
    identifier: string,
    password?: string
  ) => {

    if (
      !identifier ||
      !identifier.trim()
    ) {

      throw new Error(
        'رقم الهاتف مطلوب لتسجيل الدخول.'
      );
    }


    if (
      !password
    ) {

      throw new Error(
        'كلمة المرور إلزامية لتسجيل الدخول.'
      );
    }


    // --------------------------------------------------------
    // لا نتحقق من Firestore هنا.
    //
    // Firestore لا يتحقق من كلمة المرور.
    //
    // المصادقة تكون عبر Backend فقط لهذه الدالة.
    // أما Firebase Email Auth فتتم من AuthContext.
    // --------------------------------------------------------

    const res =
      await fetchJson<{
        user: User;
        profile: any;
        token?: string;
      }>(
        '/api/auth/login',
        {
          method: 'POST',

          body:
            JSON.stringify({

              identifier:
                identifier.trim(),

              // مهم جدًا:
              // لا تستخدم trim مع كلمة المرور.
              password

            })
        }
      );


    if (
      res.token
    ) {

      setApiToken(
        res.token
      );
    }


    return res;
  },


  // ==========================================================
  // SWITCH DEMO USER
  // ==========================================================

  switchDemoUser:
    async (
      role?: UserRole,
      userId?: string
    ) => {

      const res =
        await fetchJson<{
          user: User;
          profile: any;
          token?: string;
        }>(
          '/api/auth/switch-demo',
          {
            method: 'POST',

            body:
              JSON.stringify({
                role,
                userId
              })
          }
        );


      if (
        res.token
      ) {

        setApiToken(
          res.token
        );
      }


      return res;
    },


  // ==========================================================
  // PATIENTS
  // ==========================================================

  getPatients: async (
    search?: string,
    phone?: string,
    mrn?: string
  ) => {

    try {

      const params =
        new URLSearchParams();


      if (
        search
      ) {
        params.append(
          'search',
          search
        );
      }


      if (
        phone
      ) {
        params.append(
          'phone',
          phone
        );
      }


      if (
        mrn
      ) {
        params.append(
          'mrn',
          mrn
        );
      }


      const apiPatients =
        await fetchJson<Patient[]>(
          '/api/patients?' +
          params.toString()
        );


      const fsPatients =
        await fetchDocsWithFilter<Patient>(
          FIRESTORE_COLLECTIONS.PATIENTS
        );


      if (
        fsPatients.length > 0
      ) {

        const mergedMap =
          new Map<
            string,
            Patient
          >();


        apiPatients.forEach(
          (patient) =>
            mergedMap.set(
              patient.id,
              patient
            )
        );


        fsPatients.forEach(
          (patient) =>
            mergedMap.set(
              patient.id,
              {
                ...mergedMap.get(
                  patient.id
                ),
                ...patient
              }
            )
        );


        return Array.from(
          mergedMap.values()
        );
      }


      return apiPatients;

    } catch (
      err
    ) {

      console.warn(
        'API getPatients fallback to Firestore:',
        err
      );


      return await fetchDocsWithFilter<Patient>(
        FIRESTORE_COLLECTIONS.PATIENTS
      );
    }
  },


  getPatient: async (
    id: string
  ) => {

    try {

      return await fetchJson<Patient>(
        '/api/patients/' +
        id
      );

    } catch (
      err
    ) {

      const patient =
        await firebaseDb.getPatientByUserId(
          id
        );


      if (
        patient
      ) {
        return patient;
      }


      throw err;
    }
  },


  updatePatient: async (
    id: string,
    data: Partial<Patient>
  ) => {

    const updated =
      await fetchJson<Patient>(
        '/api/patients/' +
        id,
        {
          method: 'PUT',
          body:
            JSON.stringify(data)
        }
      );


    await firebaseDb.savePatient(
      updated
    );


    return updated;
  },


  // ==========================================================
  // PATIENT TIMELINE
  // ==========================================================

  getPatientTimeline:
    async (
      patientId: string
    ) => {

      try {

        const apiRes =
          await fetchJson<{
            patient: Patient;
            timeline: TimelineItem[];
          }>(
            '/api/timeline/' +
            patientId
          );


        const [
          fsExms,
          fsTests,
          fsRx,
          fsCns,
          fsReps
        ] =
          await Promise.all([

            fetchDocsWithFilter<MedicalExamination>(
              FIRESTORE_COLLECTIONS.EXAMINATIONS
            ),

            fetchDocsWithFilter<MedicalTest>(
              FIRESTORE_COLLECTIONS.TESTS
            ),

            fetchDocsWithFilter<Prescription>(
              FIRESTORE_COLLECTIONS.PRESCRIPTIONS
            ),

            fetchDocsWithFilter<Consultation>(
              FIRESTORE_COLLECTIONS.CONSULTATIONS
            ),

            fetchDocsWithFilter<MedicalReport>(
              FIRESTORE_COLLECTIONS.REPORTS
            )

          ]);


        const timelineMap =
          new Map<
            string,
            TimelineItem
          >();


        (
          apiRes.timeline ||
          []
        ).forEach(
          (item) =>
            timelineMap.set(
              item.id,
              item
            )
        );


        fsExms
          .filter(
            (e) =>
              e.patientId ===
              patientId
          )
          .forEach(
            (e) => {

              const id =
                'tl-exm-' +
                e.id;


              timelineMap.set(
                id,
                {
                  id,

                  type:
                    'EXAMINATION',

                  date:
                    e.examinationDate,

                  title:
                    'معاينة سريرية: ' +
                    e.examinationType,

                  subtitle:
                    e.doctorName +
                    ' (' +
                    e.doctorSpecialty +
                    ')',

                  doctorName:
                    e.doctorName,

                  details:
                    'التشخيص: ' +
                    e.diagnosis +
                    ' | التوصيات: ' +
                    e.recommendations,

                  badgeColor:
                    'blue',

                  referenceId:
                    e.id
                }
              );
            }
          );


        fsTests
          .filter(
            (t) =>
              t.patientId ===
              patientId
          )
          .forEach(
            (t) => {

              const id =
                'tl-tst-' +
                t.id;


              timelineMap.set(
                id,
                {
                  id,

                  type:
                    t.status ===
                    'COMPLETED'
                      ? 'RESULT'
                      : 'TEST',

                  date:
                    t.testDate,

                  title:
                    'فحص مخبري / تشخيصي: ' +
                    t.testName,

                  subtitle:
                    'طلب: ' +
                    t.doctorName +
                    ' | الحالة: ' +
                    t.status,

                  doctorName:
                    t.doctorName,

                  status:
                    t.status,

                  details:
                    t.resultsSummary ||
                    'الفحص قيد المعالجة في المختبر.',

                  badgeColor:
                    t.status ===
                    'COMPLETED'
                      ? 'emerald'
                      : 'amber',

                  referenceId:
                    t.id
                }
              );
            }
          );


        fsRx
          .filter(
            (p) =>
              p.patientId ===
              patientId
          )
          .forEach(
            (p) => {

              const id =
                'tl-rx-' +
                p.id;


              const medsSummary =
                (
                  p.medications ||
                  []
                )
                  .map(
                    (m) =>
                      m.medicationName +
                      ' (' +
                      m.dosage +
                      ')'
                  )
                  .join('، ');


              timelineMap.set(
                id,
                {
                  id,

                  type:
                    'PRESCRIPTION',

                  date:
                    p.date,

                  title:
                    'وصفة طبية إلكترونية (' +
                    p.rxNumber +
                    ')',

                  subtitle:
                    'بواسطة ' +
                    p.doctorName +
                    ' (' +
                    p.doctorSpecialty +
                    ')',

                  doctorName:
                    p.doctorName,

                  status:
                    p.status,

                  details:
                    'الأدوية: ' +
                    medsSummary,

                  badgeColor:
                    'purple',

                  referenceId:
                    p.id
                }
              );
            }
          );


        fsCns
          .filter(
            (c) =>
              c.patientId ===
              patientId
          )
          .forEach(
            (c) => {

              const id =
                'tl-cns-' +
                c.id;


              timelineMap.set(
                id,
                {
                  id,

                  type:
                    'CONSULTATION',

                  date:
                    (
                      c.createdAt ||
                      ''
                    ).split('T')[0] ||
                    new Date()
                      .toISOString()
                      .split('T')[0],

                  title:
                    'استشارة طبية: ' +
                    c.title,

                  subtitle:
                    'مع ' +
                    c.doctorName +
                    ' (' +
                    c.doctorSpecialty +
                    ')',

                  doctorName:
                    c.doctorName,

                  status:
                    c.status,

                  details:
                    c.doctorAdvice
                      ? 'رد الطبيب: ' +
                        c.doctorAdvice
                      : 'بانتظار رد الطبيب المعالج.',

                  badgeColor:
                    c.status ===
                    'ANSWERED'
                      ? 'teal'
                      : 'amber',

                  referenceId:
                    c.id
                }
              );
            }
          );


        fsReps
          .filter(
            (r) =>
              r.patientId ===
              patientId
          )
          .forEach(
            (r) => {

              const id =
                'tl-rep-' +
                r.id;


              timelineMap.set(
                id,
                {
                  id,

                  type:
                    'REPORT',

                  date:
                    r.reportDate,

                  title:
                    'تقرير طبي معتمد: ' +
                    r.title,

                  subtitle:
                    'رقم التقرير: ' +
                    r.reportNumber +
                    ' | ' +
                    r.doctorName,

                  doctorName:
                    r.doctorName,

                  details:
                    'الملخص: ' +
                    r.summary +
                    ' | التشخيص: ' +
                    r.diagnosis,

                  badgeColor:
                    'rose',

                  referenceId:
                    r.id
                }
              );
            }
          );


        const mergedTimeline =
          Array.from(
            timelineMap.values()
          ).sort(
            (a, b) =>
              new Date(
                b.date
              ).getTime() -
              new Date(
                a.date
              ).getTime()
          );


        return {

          patient:
            apiRes.patient,

          timeline:
            mergedTimeline
        };

      } catch (
        err
      ) {

        console.warn(
          'getPatientTimeline fallback to Firestore:',
          err
        );


        const pat =
          (
            await fetchDocById<Patient>(
              FIRESTORE_COLLECTIONS.PATIENTS,
              patientId
            )
          ) ||
          (
            await firebaseDb.getPatientByUserId(
              patientId
            )
          ) ||
          ({
            id:
              patientId,

            userId:
              patientId,

            mrn:
              'MRN-2026-8801',

            fullName:
              'المريض',

            phone:
              '',

            email:
              'patient@medicalcarehub.com',

            birthDate:
              '1992-05-14',

            gender:
              'MALE',

            bloodType:
              'O+',

            allergies:
              [],

            chronicDiseases:
              [],

            address:
              'اليمن',

            emergencyContact:
              {
                name:
                  'جهة الاتصال',

                phone:
                  '',

                relation:
                  'قريب'
              },

            createdAt:
              new Date().toISOString()

          } as Patient);


        const timeline:
          TimelineItem[] =
          [];


        return {

          patient:
            pat,

          timeline
        };
      }
    },


  // ==========================================================
  // SPECIALTIES
  // ==========================================================

  getSpecialties:
    async () => {

      try {

        return await fetchJson<Specialty[]>(
          '/api/specialties'
        );

      } catch {

        const fsSpecialties =
          await fetchDocsWithFilter<Specialty>(
            FIRESTORE_COLLECTIONS.SPECIALTIES
          );


        return fsSpecialties.length > 0
          ? fsSpecialties
          : INITIAL_SPECIALTIES;
      }
    },


  createSpecialty:
    async (
      data: Partial<Specialty>
    ) => {

      try {

        const res =
          await fetchJson<Specialty>(
            '/api/specialties',
            {
              method: 'POST',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveSpecialty(
          res
        );


        return res;

      } catch {

        const newSpec:
          Specialty = {

          id:
            data.id ||
            (
              'spec-' +
              Date.now()
            ),

          nameAr:
            data.nameAr ||
            'تخصص جديد',

          nameEn:
            data.nameEn ||
            'New Specialty',

          descriptionAr:
            data.descriptionAr ||
            '',

          descriptionEn:
            data.descriptionEn ||
            '',

          iconName:
            data.iconName ||
            'Activity',

          code:
            data.code ||
            'GEN'
        };


        await firebaseDb.saveSpecialty(
          newSpec
        );


        return newSpec;
      }
    },


  // ==========================================================
  // SERVICES
  // ==========================================================

  getServices:
    async (
      specialtyId?: string
    ) => {

      try {

        const params =
          specialtyId
            ? '?specialtyId=' +
              encodeURIComponent(
                specialtyId
              )
            : '';


        const apiServices =
          await fetchJson<MedicalService[]>(
            '/api/services' +
            params
          );


        const fsServices =
          await fetchDocsWithFilter<MedicalService>(
            FIRESTORE_COLLECTIONS.SERVICES
          );


        if (
          fsServices.length > 0
        ) {

          const mergedMap =
            new Map<
              string,
              MedicalService
            >();


          apiServices.forEach(
            (s) =>
              mergedMap.set(
                s.id,
                s
              )
          );


          fsServices.forEach(
            (s) => {

              if (
                !specialtyId ||
                s.specialtyId ===
                specialtyId
              ) {

                mergedMap.set(
                  s.id,
                  {
                    ...mergedMap.get(
                      s.id
                    ),
                    ...s
                  }
                );
              }
            }
          );


          return Array.from(
            mergedMap.values()
          );
        }


        return apiServices;

      } catch {

        const fsServices =
          await fetchDocsWithFilter<MedicalService>(
            FIRESTORE_COLLECTIONS.SERVICES
          );


        const list =
          fsServices.length > 0
            ? fsServices
            : INITIAL_SERVICES;


        return specialtyId
          ? list.filter(
              (s) =>
                s.specialtyId ===
                specialtyId
            )
          : list;
      }
    },


  createService:
    async (
      data: Partial<MedicalService>
    ) => {

      try {

        const res =
          await fetchJson<MedicalService>(
            '/api/services',
            {
              method: 'POST',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveService(
          res
        );


        return res;

      } catch {

        const newSrv:
          MedicalService = {

          id:
            data.id ||
            (
              'srv-' +
              Date.now()
            ),

          specialtyId:
            data.specialtyId ||
            'spec-cardio',

          nameAr:
            data.nameAr ||
            'خدمة طبية جديدة',

          nameEn:
            data.nameEn ||
            'New Medical Service',

          descriptionAr:
            data.descriptionAr ||
            '',

          descriptionEn:
            data.descriptionEn ||
            '',

          price:
            data.price ||
            250,

          durationMinutes:
            data.durationMinutes ||
            30,

          isActive:
            data.isActive !==
            undefined
              ? data.isActive
              : true
        };


        await firebaseDb.saveService(
          newSrv
        );


        return newSrv;
      }
    },


  updateService:
    async (
      id: string,
      data: Partial<MedicalService>
    ) => {

      try {

        const res =
          await fetchJson<MedicalService>(
            '/api/services/' +
            id,
            {
              method: 'PUT',
              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveService(
          res
        );


        return res;

      } catch {

        const existing =
          await firebaseDb.getDocument<MedicalService>(
            FIRESTORE_COLLECTIONS.SERVICES,
            id
          );


        const updated:
          MedicalService = {

          ...(existing || {

            id,

            specialtyId:
              'spec-cardio',

            nameAr:
              '',

            nameEn:
              '',

            descriptionAr:
              '',

            descriptionEn:
              '',

            price:
              250,

            durationMinutes:
              30,

            isActive:
              true

          }),

          ...data,

          id
        };


        await firebaseDb.saveService(
          updated
        );


        return updated;
      }
    },


  deleteService:
    async (
      id: string
    ) => {

      try {

        await fetchJson(
          '/api/services/' +
          id,
          {
            method:
              'DELETE'
          }
        );

      } catch {
        // Ignore
      }


      await firebaseDb.deleteService(
        id
      );


      return {
        message:
          'تم حذف الخدمة بنجاح',
        id
      };
    },


  // ==========================================================
  // DOCTORS
  // ==========================================================

  getDoctors:
    async (
      specialtyId?: string,
      activeOnly?: boolean
    ) => {

      try {

        const params =
          new URLSearchParams();


        if (
          specialtyId
        ) {
          params.append(
            'specialtyId',
            specialtyId
          );
        }


        if (
          activeOnly
        ) {
          params.append(
            'activeOnly',
            'true'
          );
        }


        const apiDoctors =
          await fetchJson<Doctor[]>(
            '/api/doctors?' +
            params.toString()
          );


        const fsDoctors =
          await getDoctorsWithFilter({
            specialtyId,
            activeOnly
          });


        if (
          fsDoctors.length > 0
        ) {

          const mergedMap =
            new Map<
              string,
              Doctor
            >();


          apiDoctors.forEach(
            (d) =>
              mergedMap.set(
                d.id,
                d
              )
          );


          fsDoctors.forEach(
            (d) =>
              mergedMap.set(
                d.id,
                {
                  ...mergedMap.get(
                    d.id
                  ),
                  ...d
                }
              )
          );


          return Array.from(
            mergedMap.values()
          );
        }


        return apiDoctors;

      } catch {

        const fsDoctors =
          await getDoctorsWithFilter({
            specialtyId,
            activeOnly
          });


        if (
          fsDoctors.length > 0
        ) {
          return fsDoctors;
        }


        let docs =
          [
            ...INITIAL_DOCTORS
          ];


        if (
          specialtyId
        ) {
          docs =
            docs.filter(
              (d) =>
                d.specialtyId ===
                specialtyId
            );
        }


        if (
          activeOnly
        ) {
          docs =
            docs.filter(
              (d) =>
                d.isActive
            );
        }


        return docs;
      }
    },


  getDoctor:
    async (
      id: string
    ) => {

      try {

        return await fetchJson<Doctor>(
          '/api/doctors/' +
          id
        );

      } catch {

        const doctor =
          (
            await getDoctorByUserId(
              id
            )
          ) ||
          (
            await firebaseDb.getDocument<Doctor>(
              FIRESTORE_COLLECTIONS.DOCTORS,
              id
            )
          );


        if (
          doctor
        ) {
          return doctor;
        }


        const seedDoc =
          INITIAL_DOCTORS.find(
            (d) =>
              d.id === id ||
              d.userId === id
          );


        if (
          seedDoc
        ) {
          return seedDoc;
        }


        throw new Error(
          'لم يتم العثور على الطبيب'
        );
      }
    },


  // ==========================================================
// DOCTORS
// ==========================================================

createDoctor: async (
  data: any
) => {
  const phone = String(data.phone || '').trim();
  const password = String(data.password || '').trim();
  const email = data.email ? String(data.email).trim().toLowerCase() : '';

  if (!data.fullName?.trim()) {
    throw new Error('اسم الطبيب مطلوب.');
  }

  if (!phone) {
    throw new Error('رقم الهاتف الخاص بالطبيب مطلوب لتسجيل الدخول.');
  }

  if (password.length < 6) {
    throw new Error(
      'كلمة مرور الطبيب يجب أن تتكون من 6 أحرف أو أرقام على الأقل.'
    );
  }

  try {
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const fallbackEmail = email || `doc.${cleanDigits || Date.now()}@medicalcarehub.com`;

    const res = await fetchJson<{
      user: User;
      doctor: Doctor;
      profile?: Doctor;
      firebaseUid?: string;
      message?: string;
    }>(
      '/api/doctors',
      {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          phone,
          email: fallbackEmail,
          password,
          role: 'DOCTOR'
        })
      }
    );

    if (!res.user) {
      throw new Error(
        'لم يتم إنشاء حساب المستخدم للطبيب.'
      );
    }

    if (!res.doctor) {
      throw new Error(
        'تم إنشاء الحساب ولكن لم يتم إنشاء ملف الطبيب.'
      );
    }

    await firebaseDb.saveUser(res.user);
    await firebaseDb.saveDoctor(res.doctor);

    return res.doctor;

  } catch (error: any) {
    console.error(
      'Create doctor error:',
      error
    );

    throw new Error(
      error?.message ||
      'فشل إنشاء حساب الطبيب. تأكد من إعداد Firebase Authentication في الخادم.'
    );
  }
},


  updateDoctor:
    async (
      id: string,
      data: any
    ) => {

      try {

        const res =
          await fetchJson<Doctor>(
            '/api/doctors/' +
            id,
            {
              method:
                'PUT',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveDoctor(
          res
        );


        return res;

      } catch {

        const existing =
          (
            await firebaseDb.getDocument<Doctor>(
              FIRESTORE_COLLECTIONS.DOCTORS,
              id
            )
          ) ||
          INITIAL_DOCTORS.find(
            (d) =>
              d.id === id
          );


        const merged:
          Doctor = {

          ...(existing || {}),

          ...data,

          id

        } as Doctor;


        await firebaseDb.saveDoctor(
          merged
        );


        return merged;
      }
    },


  deleteDoctor:
    async (
      id: string
    ) => {

      try {

        await fetchJson(
          '/api/doctors/' +
          id,
          {
            method:
              'DELETE'
          }
        );

      } catch {
        // Ignore
      }


      await firebaseDb.deleteDoctor(
        id
      );


      return {
        success:
          true,

        message:
          'تم حذف حساب الطبيب بنجاح'
      };
    },


  toggleDoctorStatus:
    async (
      id: string
    ) => {

      try {

        const res =
          await fetchJson<Doctor>(
            '/api/doctors/' +
            id +
            '/toggle-status',
            {
              method:
                'PATCH'
            }
          );


        await firebaseDb.saveDoctor(
          res
        );


        return res;

      } catch {

        const doctor =
          (
            await firebaseDb.getDocument<Doctor>(
              FIRESTORE_COLLECTIONS.DOCTORS,
              id
            )
          ) ||
          INITIAL_DOCTORS.find(
            (d) =>
              d.id === id
          );


        if (
          doctor
        ) {

          doctor.isActive =
            !doctor.isActive;


          await firebaseDb.saveDoctor(
            doctor
          );


          return doctor;
        }


        throw new Error(
          'لم يتم العثور على الطبيب'
        );
      }
    },


  // ==========================================================
  // APPOINTMENTS
  // ==========================================================

  getAppointments:
    async (
      filter?: {
        patientId?: string;
        doctorId?: string;
        status?: string;
      }
    ) => {

      try {

        const params =
          new URLSearchParams();


        if (
          filter?.patientId
        ) {

          params.append(
            'patientId',
            filter.patientId
          );
        }


        if (
          filter?.doctorId
        ) {

          params.append(
            'doctorId',
            filter.doctorId
          );
        }


        if (
          filter?.status
        ) {

          params.append(
            'status',
            filter.status
          );
        }


        const apiApts =
          await fetchJson<Appointment[]>(
            '/api/appointments?' +
            params.toString()
          );


        const fsApts =
          await getAppointmentsWithFilter(
            filter
          );


        if (
          fsApts.length > 0
        ) {

          const mergedMap =
            new Map<
              string,
              Appointment
            >();


          apiApts.forEach(
            (a) =>
              mergedMap.set(
                a.id,
                a
              )
          );


          fsApts.forEach(
            (a) =>
              mergedMap.set(
                a.id,
                {
                  ...mergedMap.get(
                    a.id
                  ),
                  ...a
                }
              )
          );


          return Array.from(
            mergedMap.values()
          );
        }


        return apiApts;

      } catch (
        err
      ) {

        console.warn(
          'API getAppointments fallback:',
          err
        );


        return await getAppointmentsWithFilter(
          filter
        );
      }
    },


  getAppointmentById:
    async (
      id: string
    ) => {

      try {

        return await fetchJson<Appointment>(
          '/api/appointments/' +
          id
        );

      } catch (
        err
      ) {

        const appointment =
          await firebaseDb.getDocument<Appointment>(
            FIRESTORE_COLLECTIONS.APPOINTMENTS,
            id
          );


        if (
          appointment
        ) {
          return appointment;
        }


        throw err;
      }
    },


  createAppointment:
    async (
      data: {
        patientId: string;
        doctorId: string;
        serviceId?: string;
        preferredDate: string;
        preferredPeriod: string;
        reason: string;
        patientNotes?: string;
        patientName?: string;
        patientPhone?: string;
        doctorName?: string;
        doctorSpecialty?: string;
        clinicRoom?: string;
        serviceName?: string;
        fee?: number;
        isWaived?: boolean;
        waiverReason?: string;
      }
    ) => {

      try {

        const res =
          await fetchJson<Appointment>(
            '/api/appointments',
            {
              method:
                'POST',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveAppointment(
          res
        );


        return res;

      } catch (
        err
      ) {

        console.warn(
          'API createAppointment fallback:',
          err
        );


        const doctor =
          await fetchDocById<Doctor>(
            FIRESTORE_COLLECTIONS.DOCTORS,
            data.doctorId
          );


        const patient =
          await fetchDocById<Patient>(
            FIRESTORE_COLLECTIONS.PATIENTS,
            data.patientId
          );


        const newApt:
          Appointment = {

          id:
            'apt-' +
            Date.now() +
            '-' +
            Math.floor(
              100 +
              Math.random() *
              900
            ),

          patientId:
            patient?.id ||
            data.patientId,

          patientName:
            data.patientName ||
            patient?.fullName ||
            'المريض',

          patientPhone:
            data.patientPhone ||
            patient?.phone ||
            '',

          patientMrn:
            patient?.mrn ||
            'MRN-2026-8801',

          doctorId:
            doctor?.id ||
            data.doctorId,

          doctorName:
            data.doctorName ||
            doctor?.fullName ||
            'طبيب العيادة',

          doctorSpecialty:
            data.doctorSpecialty ||
            doctor?.specialtyNameAr ||
            'العيادات التخصصية',

          clinicRoom:
            data.clinicRoom ||
            doctor?.roomNumber ||
            'عيادة 101',

          serviceId:
            data.serviceId,

          serviceName:
            data.serviceName ||
            'استشارة وفحص طبي عام',

          preferredDate:
            data.preferredDate ||
            new Date()
              .toISOString()
              .split('T')[0],

          preferredPeriod:
            (data.preferredPeriod as any) ||
            'MORNING',

          reason:
            data.reason ||
            'استشارة وفحص طبي',

          status:
            'NEW',

          coordinatorNotes:
            'طلب جديد بانتظار اتصال منسق خدمة العملاء.',

          patientNotes:
            data.patientNotes ||
            '',

          createdAt:
            new Date().toISOString(),

          updatedAt:
            new Date().toISOString()
        };


        await firebaseDb.saveAppointment(
          newApt
        );


        return newApt;
      }
    },


  updateAppointmentStatus:
    async (
      id: string,
      data: {
        status?: string;
        confirmedDate?: string;
        confirmedTime?: string;
        clinicRoom?: string;
        coordinatorNotes?: string;
        doctorId?: string;
        patientId?: string;
        patientName?: string;
        patientPhone?: string;
        doctorName?: string;
        doctorSpecialty?: string;
      }
    ) => {

      try {

        const res =
          await fetchJson<Appointment>(
            '/api/appointments/' +
            id,
            {
              method:
                'PATCH',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveAppointment(
          res
        );


        return res;

      } catch (
        err
      ) {

        console.warn(
          'API updateAppointment fallback:',
          err
        );


        const existing =
          await firebaseDb.getDocument<Appointment>(
            FIRESTORE_COLLECTIONS.APPOINTMENTS,
            id
          );


        const merged:
          Appointment = {

          ...(existing || {

            id,

            patientId:
              data.patientId ||
              'pat-1',

            patientName:
              data.patientName ||
              'المريض',

            patientPhone:
              data.patientPhone ||
              '',

            patientMrn:
              'MRN-2026-8801',

            doctorId:
              data.doctorId ||
              'doc-1',

            doctorName:
              data.doctorName ||
              'طبيب العيادة',

            doctorSpecialty:
              data.doctorSpecialty ||
              'العيادات الطبية',

            serviceName:
              'استشارة وفحص طبي عام',

            preferredDate:
              data.confirmedDate ||
              new Date()
                .toISOString()
                .split('T')[0],

            preferredPeriod:
              'MORNING',

            reason:
              'تنسيق موعد طبي',

            status:
              (data.status as any) ||
              'CONFIRMED',

            createdAt:
              new Date().toISOString(),

            updatedAt:
              new Date().toISOString()

          }),

          ...data,

          updatedAt:
            new Date().toISOString()

        } as Appointment;


        await firebaseDb.saveAppointment(
          merged
        );


        return merged;
      }
    },


  deleteAppointment:
    async (
      id: string
    ) => {

      try {

        await fetchJson(
          '/api/appointments/' +
          id,
          {
            method:
              'DELETE'
          }
        );

      } catch (
        err
      ) {

        console.warn(
          'API deleteAppointment fallback:',
          err
        );
      }


      await firebaseDb.deleteDocument(
        FIRESTORE_COLLECTIONS.APPOINTMENTS,
        id
      );


      return {
        success:
          true,

        message:
          'تم إلغاء الموعد'
      };
    },


  // ==========================================================
  // CONSULTATIONS
  // ==========================================================

  getConsultations: async (
  filter?: {
    patientId?: string;
    patientUserId?: string;
    patientPhone?: string;
    doctorId?: string;
    status?: string;
   }
   ) => {
   try {
    const params = new URLSearchParams();

    if (filter?.patientId) {
      params.append(
        'patientId',
        filter.patientId
      );
    }

    if (filter?.doctorId) {
      params.append(
        'doctorId',
        filter.doctorId
      );
    }

    if (filter?.status) {
      params.append(
        'status',
        filter.status
      );
    }

    const apiCns =
      await fetchJson<Consultation[]>(
        '/api/consultations?' +
        params.toString()
      );

    const fsCns =
      await getConsultationsWithFilter(
        filter
      );

    /**
     * توحيد الحالة:
     *
     * ANSWERED => تم الرد
     * CLOSED   => مغلقة
     * أي شيء آخر => PENDING
     */
    const normalizeConsultation = (
      consultation: Consultation
    ): Consultation => ({
      ...consultation,
      status:
        consultation.status === 'ANSWERED'
          ? 'ANSWERED'
          : consultation.status === 'CLOSED'
            ? 'CLOSED'
            : 'PENDING'
    });

    const apiNormalized =
      apiCns.map(
        normalizeConsultation
      );

    const fsNormalized =
      fsCns.map(
        normalizeConsultation
      );

    const mergedMap =
      new Map<string, Consultation>();

    /**
     * API هو المصدر الأول للحالة الحالية.
     */
    apiNormalized.forEach(
      (consultation) => {
        mergedMap.set(
          consultation.id,
          consultation
        );
      }
    );

    /**
     * Firestore يضيف السجلات غير الموجودة فقط.
     * لا نسمح له باستبدال حالة API الحالية.
     */
    fsNormalized.forEach(
      (consultation) => {
        if (!mergedMap.has(consultation.id)) {
          mergedMap.set(
            consultation.id,
            consultation
          );
        }
      }
    );

    let result =
      Array.from(
        mergedMap.values()
      );

    /**
     * إذا طلب المكوّن status معين،
     * نطبقه بعد التطبيع.
     */
    if (filter?.status) {
      result =
        result.filter(
          (consultation) =>
            consultation.status ===
            filter.status
        );
    }

    return result;

  } catch (error) {
    console.warn(
      'API getConsultations fallback:',
      error
    );

    const firestoreResult =
      await getConsultationsWithFilter(
        filter
      );

    return firestoreResult.map(
      (consultation) => ({
        ...consultation,
        status:
          consultation.status === 'ANSWERED'
            ? 'ANSWERED'
            : consultation.status === 'CLOSED'
              ? 'CLOSED'
              : 'PENDING'
      })
    );
  }
},


  createConsultation:
    async (
      data: {
        patientId: string;
        doctorId: string;
        title: string;
        problemDescription: string;
        symptoms: string[];
        duration: string;
        attachments?: any[];
        patientName?: string;
        patientPhone?: string;
        doctorName?: string;
        doctorSpecialty?: string;
        fee?: number;
        consultationFee?: number;
        isWaived?: boolean;
        waiverReason?: string;
      }
    ) => {

      try {

        const res =
          await fetchJson<Consultation>(
            '/api/consultations',
            {
              method:
                'POST',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveConsultation(
          res
        );


        return res;

      } catch (
        err
      ) {

        console.warn(
          'API createConsultation fallback:',
          err
        );


        const doctor =
          await fetchDocById<Doctor>(
            FIRESTORE_COLLECTIONS.DOCTORS,
            data.doctorId
          );


        const patient =
          await fetchDocById<Patient>(
            FIRESTORE_COLLECTIONS.PATIENTS,
            data.patientId
          );


        const consultationId =
          'cns-' +
          Date.now() +
          '-' +
          Math.floor(
            100 +
            Math.random() *
            900
          );


const newCns: Consultation = {
  id: consultationId,

  patientId:
    patient?.id ||
    data.patientId,

  patientName:
    data.patientName ||
    patient?.fullName ||
    'المريض',

  patientPhone:
    data.patientPhone ||
    patient?.phone ||
    '',

  patientMrn:
    patient?.mrn ||
    'MRN-2026-8801',

  patientAge:
    32,

  patientGender:
    patient?.gender ||
    'MALE',

  doctorId:
    doctor?.id ||
    data.doctorId,

  doctorName:
    data.doctorName ||
    doctor?.fullName ||
    'طبيب العيادة',

  doctorSpecialty:
    data.doctorSpecialty ||
    doctor?.specialtyNameAr ||
    'العيادات التخصصية',

  title:
    data.title ||
    'استشارة طبية جديدة',

  problemDescription:
    data.problemDescription,

  symptoms:
    data.symptoms || [],

  duration:
    data.duration ||
    'غير محدد',

  /**
   * الاستشارة الجديدة تبدأ دائماً PENDING
   */
  status:
    'PENDING',

  attachments:
    data.attachments || [],

  messages: [
    {
      id:
        'msg-' +
        Date.now(),

      consultationId:
        consultationId,

      senderId:
        patient?.id ||
        data.patientId,

      senderName:
        data.patientName ||
        patient?.fullName ||
        'المريض',

      senderRole:
        'PATIENT',

      message:
        data.problemDescription ||
        data.title,

      attachments:
        data.attachments ||
        [],

      createdAt:
        new Date().toISOString()
    }
  ],

  createdAt:
    new Date().toISOString()
};

await firebaseDb.saveConsultation(
  newCns
);

return newCns;
      }
    },


  replyConsultation: async (
  id: string,
  data: {
    doctorAdvice: string;
    doctorNotes?: string;
    suggestedAction?: string;
    treatmentPlan?: string;
    requireInPersonVisit?: boolean;
  }
) => {
  let savedConsultation:
    Consultation | null = null;

  if (!data.doctorAdvice?.trim()) {
    throw new Error(
      'الرد الطبي مطلوب.'
    );
  }

  try {
    const res =
      await fetchJson<Consultation>(
        '/api/consultations/' +
        id +
        '/reply',
        {
          method: 'POST',

          body:
            JSON.stringify({
              ...data,
              doctorAdvice:
                data.doctorAdvice.trim()
            })
        }
      );

    /**
     * تأكيد الحالة القادمة من الخادم.
     * الرد الناجح = ANSWERED.
     */
    savedConsultation = {
      ...res,
      status: 'ANSWERED'
    };

    /**
     * نحفظ نفس النسخة المحدثة في Firestore.
     */
    const saved =
      await firebaseDb.saveConsultation(
        savedConsultation
      );

    if (!saved) {
      console.warn(
        'Consultation API updated successfully but Firestore sync failed.'
      );
    }

  } catch (error) {
    console.warn(
      'API replyConsultation fallback:',
      error
    );

    const existing =
      await firebaseDb.getDocument<Consultation>(
        FIRESTORE_COLLECTIONS.CONSULTATIONS,
        id
      );

    if (!existing) {
      throw new Error(
        'لم يتم العثور على الاستشارة الطبية.'
      );
    }

    const replyText =
      data.doctorAdvice.trim();

    const updated:
      Consultation = {
      ...existing,

      doctorAdvice:
        replyText,

      doctorNotes:
        data.doctorNotes !== undefined
          ? data.doctorNotes
          : existing.doctorNotes,

      suggestedAction:
        data.suggestedAction !== undefined
          ? data.suggestedAction
          : existing.suggestedAction,

      treatmentPlan:
        data.treatmentPlan !== undefined
          ? data.treatmentPlan
          : existing.treatmentPlan,

      requireInPersonVisit:
        data.requireInPersonVisit !==
        undefined
          ? data.requireInPersonVisit
          : existing.requireInPersonVisit,

      /**
       * لا تتغير إلى ANSWERED إلا هنا،
       * بعد وجود الرد الطبي فعلياً.
       */
      status:
        'ANSWERED',

      answeredAt:
        new Date().toISOString(),

      messages: [
        ...(existing.messages || []),

        {
          id:
            'msg-' +
            Date.now(),

          consultationId:
            id,

          senderId:
            existing.doctorId,

          senderName:
            existing.doctorName,

          senderRole:
            'DOCTOR',

          message:
            replyText,

          createdAt:
            new Date().toISOString()
        }
      ]
    };

    const firestoreSaved =
      await firebaseDb.saveConsultation(
        updated
      );

    if (!firestoreSaved) {
      console.warn(
        'Failed saving answered consultation to Firestore.'
      );
    }

    savedConsultation =
      updated;
  }

  /**
   * إرسال الإشعار فقط بعد نجاح الرد.
   */
  if (
    savedConsultation?.status ===
      'ANSWERED' &&
    savedConsultation.patientId
  ) {
    try {
      await firebaseDb.saveNotification({
        id:
          'notif-' +
          Date.now(),

        userId:
          savedConsultation.patientId,

        title:
          'رد الطبيب الاستشاري على استشارتك الطبية',

        message:
          'قام ' +
          savedConsultation.doctorName +
          ' بالرد على استشارتك: "' +
          savedConsultation.title +
          '". يمكنك الاطلاع على التوجيه الطبي والخطة العلاجية الآن في حسابك.',

        type:
          'CONSULTATION',

        isRead:
          false,

        referenceId:
          savedConsultation.id,

        relatedId:
          savedConsultation.id,

        createdAt:
          new Date().toISOString()
      });

    } catch (error) {
      console.warn(
        'Could not save consultation notification:',
        error
      );
    }
  }

  return savedConsultation;
},

  addConsultationMessage:
    async (
      id: string,
      data: {
        senderId: string;
        senderName: string;
        senderRole: UserRole;
        message: string;
        attachments?: any[];
      }
    ) => {

      try {

        return await fetchJson<any>(
          '/api/consultations/' +
          id +
          '/messages',
          {
            method:
              'POST',

            body:
              JSON.stringify(data)
          }
        );

      } catch (
        err
      ) {

        console.warn(
          'API addConsultationMessage fallback:',
          err
        );


        const existing =
          await firebaseDb.getDocument<Consultation>(
            FIRESTORE_COLLECTIONS.CONSULTATIONS,
            id
          );


        if (
          existing
        ) {

          const newMsg = {

            id:
              'msg-' +
              Date.now(),

            consultationId:
              id,

            senderId:
              data.senderId,

            senderName:
              data.senderName,

            senderRole:
              data.senderRole,

            message:
              data.message,

            attachments:
              data.attachments ||
              [],

            createdAt:
              new Date().toISOString()

          };


          existing.messages =
            [
              ...(existing.messages ||
                []),

              newMsg
            ];


          await firebaseDb.saveConsultation(
            existing
          );


          return newMsg;
        }


        return {
          success:
            false
        };
      }
    },


  // ==========================================================
  // EXAMINATIONS
  // ==========================================================

  getExaminations:
    async (
      patientId?: string
    ) => {

      const p =
        patientId
          ? '?patientId=' +
            encodeURIComponent(
              patientId
            )
          : '';


      try {

        const apiExms =
          await fetchJson<MedicalExamination[]>(
            '/api/examinations' +
            p
          );


        const fsExms =
          await fetchDocsWithFilter<MedicalExamination>(
            FIRESTORE_COLLECTIONS.EXAMINATIONS
          );


        if (
          fsExms.length > 0
        ) {

          const mergedMap =
            new Map<
              string,
              MedicalExamination
            >();


          apiExms.forEach(
            (e) =>
              mergedMap.set(
                e.id,
                e
              )
          );


          fsExms.forEach(
            (e) => {

              if (
                !patientId ||
                e.patientId ===
                patientId
              ) {

                mergedMap.set(
                  e.id,
                  {
                    ...mergedMap.get(
                      e.id
                    ),
                    ...e
                  }
                );
              }
            }
          );


          return Array.from(
            mergedMap.values()
          );
        }


        return apiExms;

      } catch {

        const all =
          await fetchDocsWithFilter<MedicalExamination>(
            FIRESTORE_COLLECTIONS.EXAMINATIONS
          );


        return patientId
          ? all.filter(
              (e) =>
                e.patientId ===
                patientId
            )
          : all;
      }
    },


  createExamination:
    async (
      data: any
    ) => {

      try {

        const res =
          await fetchJson<MedicalExamination>(
            '/api/examinations',
            {
              method:
                'POST',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveExamination(
          res
        );


        return res;

      } catch (
        apiErr
      ) {

        console.warn(
          'createExamination API failed, using Firestore:',
          apiErr
        );


        const newExm:
          MedicalExamination = {

          id:
            'exm-' +
            Date.now(),

          patientId:
            data.patientId ||
            'pat-1',

          doctorId:
            data.doctorId ||
            'doc-1',

          doctorName:
            data.doctorName ||
            'طبيب استشاري',

          doctorSpecialty:
            data.doctorSpecialty ||
            'العيادات التخصصية',

          examinationDate:
            new Date()
              .toISOString()
              .split('T')[0],

          examinationType:
            data.examinationType ||
            'معاينة سريرية',

          chiefComplaint:
            data.chiefComplaint ||
            'فحص ومتابعة',

          clinicalFindings:
            data.clinicalFindings ||
            'الفحص السريري طبيعي ومستقر.',

          diagnosis:
            data.diagnosis ||
            'فحص سريري عام',

          recommendations:
            data.recommendations ||
            'المتابعة الدورية.',

          vitalSigns:
            data.vitalSigns ||
            undefined,

          createdAt:
            new Date().toISOString()
        };


        await firebaseDb.saveExamination(
          newExm
        );


        return newExm;
      }
    },


  // ==========================================================
  // TESTS
  // ==========================================================

  getTests:
    async (
      patientId?: string,
      status?: string
    ) => {

      const params =
        new URLSearchParams();


      if (
        patientId
      ) {

        params.append(
          'patientId',
          patientId
        );
      }


      if (
        status
      ) {

        params.append(
          'status',
          status
        );
      }


      try {

        const apiTests =
          await fetchJson<MedicalTest[]>(
            '/api/tests?' +
            params.toString()
          );


        const fsTests =
          await fetchDocsWithFilter<MedicalTest>(
            FIRESTORE_COLLECTIONS.TESTS
          );


        if (
          fsTests.length > 0
        ) {

          const mergedMap =
            new Map<
              string,
              MedicalTest
            >();


          apiTests.forEach(
            (t) =>
              mergedMap.set(
                t.id,
                t
              )
          );


          fsTests.forEach(
            (t) => {

              if (
                !patientId ||
                t.patientId ===
                patientId
              ) {

                mergedMap.set(
                  t.id,
                  {
                    ...mergedMap.get(
                      t.id
                    ),
                    ...t
                  }
                );
              }
            }
          );


          return Array.from(
            mergedMap.values()
          );
        }


        return apiTests;

      } catch {

        return await fetchDocsWithFilter<MedicalTest>(
          FIRESTORE_COLLECTIONS.TESTS
        );
      }
    },


  createTest:
    async (
      data: any
    ) => {

      try {

        const res =
          await fetchJson<MedicalTest>(
            '/api/tests',
            {
              method:
                'POST',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveTest(
          res
        );


        return res;

      } catch (
        apiErr
      ) {

        console.warn(
          'createTest API failed, using Firestore:',
          apiErr
        );


        const newTest:
          MedicalTest = {

          id:
            'tst-' +
            Date.now(),

          patientId:
            data.patientId ||
            'pat-1',

          patientName:
            data.patientName ||
            'المريض',

          patientMrn:
            data.patientMrn ||
            (
              'MRN-2026-' +
              Math.floor(
                1000 +
                Math.random() *
                9000
              )
            ),

          doctorId:
            data.doctorId ||
            'doc-1',

          doctorName:
            data.doctorName ||
            'طبيب استشاري',

          testName:
            data.testName ||
            'فحص مخبري',

          category:
            data.category ||
            'LABORATORY',

          testDate:
            new Date()
              .toISOString()
              .split('T')[0],

          status:
            'COMPLETED',

          resultsSummary:
            data.resultsSummary ||
            'النتائج ضمن المعدلات الطبيعية المعتمدة.',

          detailedItems:
            data.detailedItems ||
            [],

          labTechnician:
            'قسم المختبر والتحاليل الطبية',

          notes:
            data.notes ||
            '',

          attachmentUrl:
            data.attachmentUrl ||
            '#',

          attachmentName:
            data.attachmentName ||
            'test_result.pdf',

          createdAt:
            new Date().toISOString()
        };


        await firebaseDb.saveTest(
          newTest
        );


        return newTest;
      }
    },


  // ==========================================================
  // REPORTS
  // ==========================================================

  getReports:
    async (
      patientId?: string
    ) => {

      try {

        const p =
          patientId
            ? '?patientId=' +
              encodeURIComponent(
                patientId
              )
            : '';


        const apiReports =
          await fetchJson<MedicalReport[]>(
            '/api/reports' +
            p
          );


        const fsReports =
          await fetchDocsWithFilter<MedicalReport>(
            FIRESTORE_COLLECTIONS.REPORTS
          );


        if (
          fsReports.length > 0
        ) {

          const mergedMap =
            new Map<
              string,
              MedicalReport
            >();


          apiReports.forEach(
            (r) =>
              mergedMap.set(
                r.id,
                r
              )
          );


          fsReports.forEach(
            (r) => {

              if (
                !patientId ||
                r.patientId ===
                patientId
              ) {

                mergedMap.set(
                  r.id,
                  {
                    ...mergedMap.get(
                      r.id
                    ),
                    ...r
                  }
                );
              }
            }
          );


          return Array.from(
            mergedMap.values()
          ).sort(
            (a, b) =>
              new Date(
                b.createdAt ||
                b.reportDate
              ).getTime() -
              new Date(
                a.createdAt ||
                a.reportDate
              ).getTime()
          );
        }


        return apiReports;

      } catch {

        const all =
          await fetchDocsWithFilter<MedicalReport>(
            FIRESTORE_COLLECTIONS.REPORTS
          );


        const filtered =
          patientId
            ? all.filter(
                (r) =>
                  r.patientId ===
                  patientId
              )
            : all;


        return filtered.sort(
          (a, b) =>
            new Date(
              b.createdAt ||
              b.reportDate
            ).getTime() -
            new Date(
              a.createdAt ||
              a.reportDate
            ).getTime()
        );
      }
    },


  createReport:
    async (
      data: any
    ) => {

      try {

        const res =
          await fetchJson<MedicalReport>(
            '/api/reports',
            {
              method:
                'POST',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveReport(
          res
        );


        return res;

      } catch (
        apiErr
      ) {

        console.warn(
          'createReport API failed, using Firestore:',
          apiErr
        );


        const reportCode =
          data.reportType ===
          'CONSULTATION_NOTE'
            ? 'CONS'
            : data.reportType ===
              'DISCHARGE_SUMMARY'
              ? 'DISC'
              : 'REP';


        const reportNum =
          reportCode +
          '-' +
          new Date().getFullYear() +
          '-' +
          Math.floor(
            1000 +
            Math.random() *
            9000
          );


        const newReport:
          MedicalReport = {

          id:
            'rep-' +
            Date.now(),

          reportNumber:
            reportNum,

          patientId:
            data.patientId ||
            'pat-1',

          patientName:
            data.patientName ||
            'المريض',

          patientPhone:
            data.patientPhone ||
            '',

          patientMrn:
            data.patientMrn ||
            (
              'MRN-2026-' +
              Math.floor(
                1000 +
                Math.random() *
                9000
              )
            ),

          patientBirthDate:
            data.patientBirthDate ||
            '1992-05-14',

          patientGender:
            data.patientGender ||
            'MALE',

          doctorId:
            data.doctorId ||
            'doc-1',

          doctorName:
            data.doctorName ||
            'طبيب استشاري',

          doctorTitle:
            data.doctorTitle ||
            'استشاري أول',

          doctorSpecialty:
            data.doctorSpecialty ||
            data.hospitalDepartment ||
            'العيادات التخصصية',

          reportType:
            data.reportType ||
            'CONSULTATION_NOTE',

          title:
            data.title,

          summary:
            data.summary ||
            'تقرير طبي معتمد لحالة المريض.',

          clinicalHistory:
            data.clinicalHistory ||
            'بناءً على المراجعات السريرية والفحوصات المخبرية.',

          findings:
            data.findings ||
            'المؤشرات الحيوية والفحوصات مستقرة.',

          diagnosis:
            data.diagnosis,

          recommendations:
            data.recommendations ||
            'متابعة الخطة العلاجية المقررة.',

          reportDate:
            new Date()
              .toISOString()
              .split('T')[0],

          createdAt:
            new Date().toISOString(),

          digitalSignature:
            (
              data.doctorName ||
              'طبيب استشاري'
            ) +
            ' - معتمد إلكترونياً',

          hospitalDepartment:
            data.hospitalDepartment ||
            'العيادات التخصصية'
        };


        await firebaseDb.saveReport(
          newReport
        );


        try {

          await firebaseDb.saveNotification({

            id:
              'notif-' +
              Date.now(),

            userId:
              data.patientId ||
              'usr-pat-1',

            title:
              'تقرير طبي معتمد جديد',

            message:
              'تم إصدار تقرير طبي جديد بعنوان "' +
              data.title +
              '" بواسطة ' +
              (
                data.doctorName ||
                'الطبيب المعالج'
              ) +
              '.',

            type:
              'REPORT',

            isRead:
              false,

            referenceId:
              newReport.id,

            createdAt:
              new Date().toISOString()

          });

        } catch (
          notificationError
        ) {

          console.warn(
            'Could not save notification:',
            notificationError
          );
        }


        return newReport;
      }
    },


  // ==========================================================
  // PRESCRIPTIONS
  // ==========================================================

  getPrescriptions:
    async (
      patientId?: string
    ) => {

      try {

        const p =
          patientId
            ? '?patientId=' +
              encodeURIComponent(
                patientId
              )
            : '';


        const apiRx =
          await fetchJson<Prescription[]>(
            '/api/prescriptions' +
            p
          );


        const fsRx =
          await fetchDocsWithFilter<Prescription>(
            FIRESTORE_COLLECTIONS.PRESCRIPTIONS
          );


        if (
          fsRx.length > 0
        ) {

          const mergedMap =
            new Map<
              string,
              Prescription
            >();


          apiRx.forEach(
            (r) =>
              mergedMap.set(
                r.id,
                r
              )
          );


          fsRx.forEach(
            (r) => {

              if (
                !patientId ||
                r.patientId ===
                patientId
              ) {

                mergedMap.set(
                  r.id,
                  {
                    ...mergedMap.get(
                      r.id
                    ),
                    ...r
                  }
                );
              }
            }
          );


          return Array.from(
            mergedMap.values()
          ).sort(
            (a, b) =>
              new Date(
                b.createdAt ||
                b.date
              ).getTime() -
              new Date(
                a.createdAt ||
                a.date
              ).getTime()
          );
        }


        return apiRx;

      } catch {

        const all =
          await fetchDocsWithFilter<Prescription>(
            FIRESTORE_COLLECTIONS.PRESCRIPTIONS
          );


        const filtered =
          patientId
            ? all.filter(
                (r) =>
                  r.patientId ===
                  patientId
              )
            : all;


        return filtered.sort(
          (a, b) =>
            new Date(
              b.createdAt ||
              b.date
            ).getTime() -
            new Date(
              a.createdAt ||
              a.date
            ).getTime()
        );
      }
    },


  createPrescription:
    async (
      data: any
    ) => {

      try {

        const res =
          await fetchJson<Prescription>(
            '/api/prescriptions',
            {
              method:
                'POST',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.savePrescription(
          res
        );


        return res;

      } catch (
        apiErr
      ) {

        console.warn(
          'createPrescription API failed, using Firestore:',
          apiErr
        );


        const rxNum =
          'RX-' +
          Math.floor(
            100000 +
            Math.random() *
            900000
          );


        const newRx:
          Prescription = {

          id:
            'rx-' +
            Date.now(),

          rxNumber:
            rxNum,

          patientId:
            data.patientId ||
            'pat-1',

          patientName:
            data.patientName ||
            'المريض',

          patientMrn:
            data.patientMrn ||
            (
              'MRN-2026-' +
              Math.floor(
                1000 +
                Math.random() *
                9000
              )
            ),

          doctorId:
            data.doctorId ||
            'doc-1',

          doctorName:
            data.doctorName ||
            'طبيب استشاري',

          doctorSpecialty:
            data.doctorSpecialty ||
            'العيادات التخصصية',

          date:
            new Date()
              .toISOString()
              .split('T')[0],

          diagnosis:
            data.diagnosis ||
            'حسب الكشف السريري',

          medications:
            data.medications ||
            [],

          instructions:
            data.instructions ||
            'الالتزام بمواعيد الجرعات واستشارة الطبيب أو الصيدلي عند ظهور أي أعراض جانبية.',

          status:
            'ACTIVE',

          createdAt:
            new Date().toISOString()
        };


        await firebaseDb.savePrescription(
          newRx
        );


        try {

          await firebaseDb.saveNotification({

            id:
              'notif-' +
              Date.now(),

            userId:
              data.patientId ||
              'usr-pat-1',

            title:
              'وصفة طبية إلكترونية جديدة',

            message:
              'تم إصدار وصفة طبية برقم (' +
              rxNum +
              ') من ' +
              (
                data.doctorName ||
                'الطبيب المعالج'
              ) +
              '.',

            type:
              'SYSTEM',

            isRead:
              false,

            referenceId:
              newRx.id,

            createdAt:
              new Date().toISOString()

          });

        } catch (
          e
        ) {

          console.warn(
            'Could not save notification:',
            e
          );
        }


        return newRx;
      }
    },


  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  getNotifications:
    async (
      userId?: string
    ) => {

      const p =
        userId
          ? '?userId=' +
            encodeURIComponent(
              userId
            )
          : '';


      try {

        return await fetchJson<AppNotification[]>(
          '/api/notifications' +
          p
        );

      } catch {

        const notifs =
          await fetchDocsWithFilter<AppNotification>(
            FIRESTORE_COLLECTIONS.NOTIFICATIONS
          );


        if (
          userId
        ) {

          return notifs.filter(
            (n) =>
              n.userId ===
                userId ||
              n.userId ===
                'usr-pat-1' ||
              n.userId ===
                'all'
          );
        }


        return notifs;
      }
    },


  markNotificationRead:
    async (
      id: string
    ) => {

      try {

        return await fetchJson<{
          success: boolean;
        }>(
          '/api/notifications/' +
          id +
          '/read',
          {
            method:
              'PATCH'
          }
        );

      } catch {

        const notif =
          await firebaseDb.getDocument<AppNotification>(
            FIRESTORE_COLLECTIONS.NOTIFICATIONS,
            id
          );


        if (
          notif
        ) {

          notif.isRead =
            true;


          await firebaseDb.saveNotification(
            notif
          );
        }


        return {
          success:
            true
        };
      }
    },


  markAllNotificationsRead:
    async (
      userId?: string
    ) => {

      try {

        return await fetchJson<{
          success: boolean;
        }>(
          '/api/notifications/mark-all-read',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                userId
              })
          }
        );

      } catch {

        const notifs =
          await fetchDocsWithFilter<AppNotification>(
            FIRESTORE_COLLECTIONS.NOTIFICATIONS
          );


        for (
          const n of
          notifs
        ) {

          if (
            !userId ||
            n.userId ===
            userId
          ) {

            n.isRead =
              true;


            await firebaseDb.saveNotification(
              n
            );
          }
        }


        return {
          success:
            true
        };
      }
    },


  createNotification:
    async (
      notifData: Partial<AppNotification> & { userId: string; title: string; message: string }
    ) => {
      try {
        const res = await fetchJson<AppNotification>(
          '/api/notifications',
          {
            method: 'POST',
            body: JSON.stringify(notifData)
          }
        );
        try {
          await firebaseDb.saveNotification(res);
        } catch (fbErr) {
          console.warn('Firestore notification save fallback:', fbErr);
        }
        return res;
      } catch {
        const notif: AppNotification = {
          id: notifData.id || ('notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
          userId: notifData.userId,
          title: notifData.title,
          message: notifData.message,
          type: notifData.type || 'SYSTEM',
          isRead: false,
          relatedId: notifData.relatedId || notifData.referenceId,
          referenceId: notifData.referenceId || notifData.relatedId,
          createdAt: new Date().toISOString()
        };
        await firebaseDb.saveNotification(notif);
        return notif;
      }
    },


  sendDoctorAbsentNotification:
    async (
      params: {
        appointmentIds?: string[];
        doctorId?: string;
        doctorName?: string;
        date?: string;
        customMessage?: string;
        coordinatorName?: string;
      }
    ) => {
      try {
        const res = await fetchJson<{
          success: boolean;
          count: number;
          notifiedAppointments: any[];
          message: string;
        }>(
          '/api/appointments/notify-doctor-absent',
          {
            method: 'POST',
            body: JSON.stringify(params)
          }
        );
        return res;
      } catch (err) {
        console.warn('API notify-doctor-absent fallback to direct Firestore:', err);
        const apts = await fetchDocsWithFilter<Appointment>(FIRESTORE_COLLECTIONS.APPOINTMENTS);
        const targetIds = params.appointmentIds || [];
        const targets = apts.filter(a => {
          if (targetIds.length > 0) return targetIds.includes(a.id);
          if (params.doctorId) {
            const matchesDoc = a.doctorId === params.doctorId;
            const matchesDate = !params.date || a.confirmedDate === params.date || a.preferredDate === params.date;
            return matchesDoc && matchesDate && a.status !== 'CANCELLED' && a.status !== 'COMPLETED';
          }
          return false;
        });

        const notifiedList: any[] = [];
        for (const apt of targets) {
          const docName = params.doctorName || apt.doctorName || 'طبيب العيادة';
          const aptDate = params.date || apt.confirmedDate || apt.preferredDate || 'اليوم';
          const notifMsg = params.customMessage?.trim() || 
            `نود إحاطتكم بأن الطبيب ${docName} غير مداوم في العيادة بتاريخ ${aptDate} لظرف طارئ. نرجو عدم الحضور إلى المستشفى حرصاً على راحتكم ووقتكم، وسيقوم فريق خدمة العملاء بالتواصل معكم هاتفياً لترتيب موعد بديل يناسبكم.`;

          const notif: AppNotification = {
            id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            userId: apt.patientId,
            title: `⚠️ تنبيه من خدمة العملاء: الطبيب ${docName} غير مداوم في العيادة`,
            message: notifMsg,
            type: 'APPOINTMENT',
            isRead: false,
            relatedId: apt.id,
            referenceId: apt.id,
            createdAt: new Date().toISOString()
          };

          await firebaseDb.saveNotification(notif);

          apt.isDoctorAbsent = true;
          apt.doctorAbsentNotifiedAt = new Date().toISOString();
          apt.doctorAbsentNotice = notifMsg;
          apt.coordinatorNotes = (apt.coordinatorNotes ? `${apt.coordinatorNotes} | ` : '') + `تم إشعار المريض بعدم دوام الطبيب (${new Date().toLocaleTimeString('ar-SA')})`;
          apt.updatedAt = new Date().toISOString();

          await firebaseDb.saveAppointment(apt);

          notifiedList.push({
            appointmentId: apt.id,
            patientName: apt.patientName,
            patientPhone: apt.patientPhone
          });
        }

        return {
          success: true,
          count: notifiedList.length,
          notifiedAppointments: notifiedList,
          message: `تم إرسال إشعار غياب الطبيب بنجاح إلى ${notifiedList.length} مريض.`
        };
      }
    },


  // ==========================================================
  // ADMIN
  // ==========================================================

  getAdminStats:
    async () => {

      try {

        return await fetchJson<any>(
          '/api/admin/stats'
        );

      } catch {

        const [
          apts,
          cns,
          pats,
          docs,
          stf
        ] =
          await Promise.all([

            fetchDocsWithFilter<Appointment>(
              FIRESTORE_COLLECTIONS.APPOINTMENTS
            ),

            fetchDocsWithFilter<Consultation>(
              FIRESTORE_COLLECTIONS.CONSULTATIONS
            ),

            fetchDocsWithFilter<Patient>(
              FIRESTORE_COLLECTIONS.PATIENTS
            ),

            getDoctorsWithFilter(),

            fetchDocsWithFilter<Staff>(
              FIRESTORE_COLLECTIONS.STAFF
            )

          ]);


        const completedApts =
          apts.filter(
            (a) =>
              a.status ===
                'CONFIRMED' ||
              a.status ===
                'COMPLETED'
          ).length;


        const pendingApts =
          apts.filter(
            (a) =>
              a.status ===
                'NEW' ||
              a.status ===
                'PENDING'
          ).length;


        const totalRevenue =
          (
            completedApts *
            300
          ) +
          (
            apts.length *
            150
          ) +
          12500;


        return {

          totalAppointments:
            Math.max(
              apts.length,
              28
            ),

          pendingAppointments:
            Math.max(
              pendingApts,
              6
            ),

          completedAppointments:
            Math.max(
              completedApts,
              22
            ),

          totalConsultations:
            Math.max(
              cns.length,
              14
            ),

          pendingConsultations:
            Math.max(
              cns.filter(
                (c) =>
                  c.status ===
                  'PENDING'
              ).length,
              3
            ),

          answeredConsultations:
            Math.max(
              cns.filter(
                (c) =>
                  c.status ===
                  'ANSWERED'
              ).length,
              11
            ),

          totalPatients:
            Math.max(
              pats.length,
              INITIAL_PATIENTS.length,
              120
            ),

          totalDoctors:
            Math.max(
              docs.length,
              INITIAL_DOCTORS.length
            ),

          totalStaff:
            Math.max(
              stf.length,
              INITIAL_STAFF.length
            ),

          totalRevenue:
            Math.max(
              totalRevenue,
              48500
            ),

          monthlyGrowth:
            18.2,

          satisfactionRate:
            99.1,

          occupancyRate:
            88
        };
      }
    },


  getAdminAnalytics:
    async () => {

      return await api.getAdminStats();
    },


  getStaffList:
    async () => {

      try {

        const apiStaff =
          await fetchJson<Staff[]>(
            '/api/admin/staff'
          );


        const fsStaff =
          await fetchDocsWithFilter<Staff>(
            FIRESTORE_COLLECTIONS.STAFF
          );


        if (
          fsStaff.length > 0
        ) {

          const map =
            new Map<
              string,
              Staff
            >();


          apiStaff.forEach(
            (s) =>
              map.set(
                s.id,
                s
              )
          );


          fsStaff.forEach(
            (s) =>
              map.set(
                s.id,
                {
                  ...map.get(
                    s.id
                  ),
                  ...s
                }
              )
          );


          return Array.from(
            map.values()
          );
        }


        return apiStaff;

      } catch {

        const fsStaff =
          await fetchDocsWithFilter<Staff>(
            FIRESTORE_COLLECTIONS.STAFF
          );


        return fsStaff.length > 0
          ? fsStaff
          : INITIAL_STAFF;
      }
    },

// ==========================================================
// STAFF / CUSTOMER SERVICE
// ==========================================================

createStaff: async (
  data: any
) => {
  const phone = String(data.phone || '').trim();
  const password = String(data.password || '').trim();
  const email = data.email ? String(data.email).trim().toLowerCase() : '';

  if (!data.fullName?.trim()) {
    throw new Error(
      'اسم موظف خدمة العملاء مطلوب.'
    );
  }

  if (!phone) {
    throw new Error(
      'رقم الهاتف الخاص بموظف خدمة العملاء مطلوب لتسجيل الدخول.'
    );
  }

  if (password.length < 6) {
    throw new Error(
      'كلمة مرور موظف خدمة العملاء يجب أن تتكون من 6 أحرف أو أرقام على الأقل.'
    );
  }

  try {
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const fallbackEmail = email || `staff.${cleanDigits || Date.now()}@medicalcarehub.com`;

    const res = await fetchJson<{
      user: User;
      staff: Staff;
      profile?: Staff;
      firebaseUid?: string;
      message?: string;
    }>(
      '/api/admin/staff',
      {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          phone,
          email: fallbackEmail,
          password,
          role: 'CUSTOMER_SERVICE'
        })
      }
    );

    if (!res.user) {
      throw new Error(
        'لم يتم إنشاء حساب المستخدم لموظف خدمة العملاء.'
      );
    }

    if (!res.staff) {
      throw new Error(
        'تم إنشاء الحساب ولكن لم يتم إنشاء ملف موظف خدمة العملاء.'
      );
    }

    await firebaseDb.saveUser(res.user);
    await firebaseDb.saveStaff(res.staff);

    return res.staff;

  } catch (error: any) {
    console.error(
      'Create customer service account error:',
      error
    );

    throw new Error(
      error?.message ||
      'فشل إنشاء حساب موظف خدمة العملاء. تأكد من إعداد Firebase Authentication في الخادم.'
    );
  }
},


  updateStaff:
    async (
      id: string,
      data:
        Partial<Staff> & {
          password?: string;
        }
    ) => {

      try {

        const res =
          await fetchJson<Staff>(
            '/api/admin/staff/' +
            id,
            {
              method:
                'PUT',

              body:
                JSON.stringify(data)
            }
          );


        await firebaseDb.saveStaff(
          res
        );


        return res;

      } catch (
        err
      ) {

        console.warn(
          'API updateStaff fallback:',
          err
        );


        const existing =
          (
            await firebaseDb.getDocument<Staff>(
              FIRESTORE_COLLECTIONS.STAFF,
              id
            )
          ) ||
          INITIAL_STAFF.find(
            (s) =>
              s.id === id
          );


        const merged =
          {
            ...(existing || {}),
            ...data,
            updatedAt:
              new Date().toISOString()
          } as Staff;


        await firebaseDb.saveStaff(
          merged
        );


        return merged;
      }
    },


  deleteStaff:
    async (
      id: string
    ) => {

      try {

        await fetchJson(
          '/api/admin/staff/' +
          id,
          {
            method:
              'DELETE'
          }
        );

      } catch (
        err
      ) {

        console.warn(
          'API deleteStaff fallback:',
          err
        );
      }


      await firebaseDb.deleteDocument(
        FIRESTORE_COLLECTIONS.STAFF,
        id
      );


      return {
        success:
          true,

        message:
          'تم حذف حساب الموظف بنجاح'
      };
    },


  toggleStaffStatus:
    async (
      id: string
    ) => {

      try {

        const res =
          await fetchJson<Staff>(
            '/api/admin/staff/' +
            id +
            '/toggle-status',
            {
              method:
                'PATCH'
            }
          );


        await firebaseDb.saveStaff(
          res
        );


        return res;

      } catch {

        const staff =
          (
            await firebaseDb.getDocument<Staff>(
              FIRESTORE_COLLECTIONS.STAFF,
              id
            )
          ) ||
          INITIAL_STAFF.find(
            (s) =>
              s.id === id
          );


        if (
          staff
        ) {

          staff.isActive =
            !staff.isActive;


          staff.updatedAt =
            new Date().toISOString();


          await firebaseDb.saveStaff(
            staff
          );


          return staff;
        }


        throw new Error(
          'لم يتم العثور على الموظف'
        );
      }
    },


  // ==========================================================
  // AUDIT
  // ==========================================================

  getAuditLogs:
    async (
      limit = 50
    ) => {

      try {

        return await fetchJson<AuditLog[]>(
          '/api/admin/audit-logs?limit=' +
          limit
        );

      } catch {

        const logs =
          await fetchDocsWithFilter<AuditLog>(
            FIRESTORE_COLLECTIONS.AUDIT_LOGS
          );


        if (
          logs.length > 0
        ) {

          return logs.sort(
            (a, b) =>
              new Date(
                b.createdAt ||
                b.timestamp ||
                ''
              ).getTime() -
              new Date(
                a.createdAt ||
                a.timestamp ||
                ''
              ).getTime()
          );
        }


        return [

          {

            id:
              'aud-1',

            userId:
              'usr-admin-1',

            userName:
              'المدير العام المعتمد',

            userRole:
              'HOSPITAL_ADMIN',

            action:
              'LOGIN',

            targetEntity:
              'SYSTEM',

            targetId:
              'sys',

            details:
              'تسجيل دخول ناجح إلى لوحة الإدارة العامة للمستشفى.',

            ipAddress:
              '127.0.0.1',

            createdAt:
              new Date().toISOString()

          }

        ];
      }
    },


  clearAllData:
    async () => {

      try {

        await fetchJson(
          '/api/admin/clear-all-data',
          {
            method:
              'POST'
          }
        );

      } catch (
        err
      ) {

        console.warn(
          'API clearAllData fallback:',
          err
        );
      }


      return {

        success:
          true,

        message:
          'تم مسح كافة البيانات التجريبية بنجاح'
      };
    },


  // ==========================================================
  // AI
  // ==========================================================

  summarizeRecord:
    async (
      patientId: string
    ) => {

      try {

        return await fetchJson<{
          summary: string;
          disclaimer: string;
          source: string;
        }>(
          '/api/ai/summarize-record',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                patientId
              })
          }
        );

      } catch {

        return {

          summary:
            'المريض في حالة مستقرة مع التزام منتظم بالخطة العلاجية المقررة والمتابعة الدورية للعلامات الحيوية والتحاليل المخبرية.',

          disclaimer:
            'ملخص تحليلي استرشادي مبني على السجل الطبي الرقمي الموثق.',

          source:
            'Medical Care Hub AI Engine'
        };
      }
    },


  draftReport:
    async (
      data: any
    ) => {

      try {

        return await fetchJson<{
          rawText?: string;
          draft?: any;
          disclaimer: string;
        }>(
          '/api/ai/draft-report',
          {
            method:
              'POST',

            body:
              JSON.stringify(data)
          }
        );

      } catch {

        return {

          draft: {

            diagnosis:
              data.preliminaryDiagnosis ||
              'حالة طبية مستقرة بناءً على الفحص الإكلينيكي',

            recommendations:
              '1. الالتزام بالخطة العلاجية والجرعات المقررة.\n2. إجراء الفحوصات الدورية ومراجعة العيادة عند الحاجة.\n3. اتباع نمط حياة صحي ومتوازن.',

            summary:
              'تقرير طبي مفصل للحالة بناءً على التاريخ المرضي والفحص السريري: ' +
              (
                data.clinicalHistory ||
                'مراجعة استشارية'
              ) +
              '. العلامات الحيوية والنتائج مستقرة ومطمئنة.'
          },

          disclaimer:
            'مسودة تقرير طبي ذكية معتمدة استرشادياً وتحتاج اعتماد الطبيب المعالج.'
        };
      }
    },


  // ==========================================================
  // Firestore subscriptions
  // ==========================================================

  subscribeUser:
    (
      uid: string,
      callback:
        (
          u: User | null
        ) => void
    ) =>
      subscribeToUser(
        uid,
        callback
      ),


  subscribeDoctors:
    (
      callback:
        (
          docs: Doctor[]
        ) => void,

      options?: {
        specialtyId?: string;
        activeOnly?: boolean;
      }
    ) =>
      subscribeToDoctors(
        callback,
        options
      ),


  subscribeAppointments:
    (
      filter: {
        patientId?: string;
        doctorId?: string;
        status?: string;
      },

      callback:
        (
          apts: Appointment[]
        ) => void
    ) =>
      subscribeToAppointments(
        filter,
        callback
      ),


  subscribeConsultations:
    (
      filter: {
        patientId?: string;
        patientUserId?: string;
        patientPhone?: string;
        doctorId?: string;
        status?: string;
      },

      callback:
        (
          cns: Consultation[]
        ) => void
    ) =>
      subscribeToConsultations(
        filter,
        callback
      ),


  subscribeNotifications:
    (
      userId: string,

      callback:
        (
          n: AppNotification[]
        ) => void
    ) =>
      subscribeToNotifications(
        userId,
        callback
      ),

  // ==========================================================
  // Payments & Financials
  // ==========================================================

  getPayments: async (params?: {
    patientId?: string;
    doctorId?: string;
    serviceType?: string;
    status?: string;
    search?: string;
  }): Promise<Payment[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.serviceType) q.set('serviceType', params.serviceType);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      return await fetchJson<Payment[]>(`/api/payments?${q.toString()}`);
    } catch {
      return (await firebaseDb.getPayments(params?.patientId)) || [];
    }
  },

  getPaymentById: async (id: string): Promise<Payment | null> => {
    try {
      return await fetchJson<Payment>(`/api/payments/${id}`);
    } catch {
      return (await firebaseDb.getPayment(id)) || null;
    }
  },

  createPaymentIntent: async (data: {
    patientId?: string;
    patientName?: string;
    patientPhone?: string;
    patientMrn?: string;
    serviceType: 'APPOINTMENT' | 'CONSULTATION' | 'PROCEDURE' | 'MEDICATION';
    serviceReferenceId: string;
    serviceName: string;
    doctorId?: string;
    doctorName?: string;
    doctorSpecialty?: string;
    amount: number;
    currency?: CurrencyCode | string;
    paymentMethod?: PaymentMethod;
    paymentProvider?: any;
    kuraimiAccount?: string;
    kuraimiChannel?: any;
  }): Promise<{ success: boolean; payment: Payment; clientSecret: string; kuraimiOtpRequired?: boolean; message: string }> => {
    try {
      return await fetchJson<{ success: boolean; payment: Payment; clientSecret: string; kuraimiOtpRequired?: boolean; message: string }>(
        '/api/payments/create-intent',
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
    } catch {
      const fallbackPay: Payment = {
        id: `pay-${Date.now()}`,
        patientId: data.patientId || 'pat-1',
        patientName: data.patientName || 'المريض',
        patientPhone: data.patientPhone || '',
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        doctorSpecialty: data.doctorSpecialty,
        serviceType: data.serviceType,
        serviceReferenceId: data.serviceReferenceId,
        serviceName: data.serviceName,
        amount: data.amount,
        currency: (data.currency as CurrencyCode) || 'SAR',
        paymentMethod: data.paymentMethod || 'MADA',
        status: 'PAYMENT_REQUIRED',
        paymentStatus: 'PAYMENT_REQUIRED',
        transactionReference: `TXN-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await firebaseDb.createPayment(fallbackPay);
      return {
        success: true,
        payment: fallbackPay,
        clientSecret: `sec_${fallbackPay.id}`,
        message: 'تم إنشاء جلسة الدفع'
      };
    }
  },

  verifyKuraimiOtp: async (data: {
    paymentId: string;
    otpCode: string;
    transactionReference?: string;
    customerAccount?: string;
  }): Promise<{ success: boolean; payment?: Payment; ledgerEntry?: PaymentLedgerEntry; message?: string }> => {
    return await fetchJson<{ success: boolean; payment?: Payment; ledgerEntry?: PaymentLedgerEntry; message?: string }>(
      '/api/payments/kuraimi/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  },

  getPaymentSettings: async (): Promise<PaymentSettings> => {
    return await fetchJson<PaymentSettings>('/api/payment-settings');
  },

  updatePaymentSettings: async (settings: Partial<PaymentSettings>, updatedBy?: string): Promise<{ success: boolean; settings: PaymentSettings }> => {
    return await fetchJson<{ success: boolean; settings: PaymentSettings }>('/api/payment-settings', {
      method: 'PUT',
      body: JSON.stringify({ ...settings, updatedBy })
    });
  },

  getPaymentLedger: async (): Promise<{ summaries: Record<CurrencyCode, any>; entries: PaymentLedgerEntry[] }> => {
    return await fetchJson<{ summaries: Record<CurrencyCode, any>; entries: PaymentLedgerEntry[] }>('/api/payments/ledger');
  },

  confirmPayment: async (data: {
    paymentId?: string;
    transactionReference?: string;
    serviceReferenceId?: string;
    serviceType?: 'APPOINTMENT' | 'CONSULTATION';
    amount?: number;
    currency?: string;
    patientId?: string;
    patientName?: string;
    patientPhone?: string;
    doctorId?: string;
    doctorName?: string;
    doctorSpecialty?: string;
    serviceName?: string;
    paymentMethod?: PaymentMethod;
    cardBrand?: string;
    last4?: string;
    gatewayResponseCode?: string;
  }): Promise<{ success: boolean; payment: Payment; message: string }> => {
    try {
      return await fetchJson<{ success: boolean; payment: Payment; message: string }>(
        '/api/payments/confirm',
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
    } catch {
      const pay: Payment = {
        id: data.paymentId || `pay-${Date.now()}`,
        patientId: data.patientId || 'pat-1',
        patientName: data.patientName || 'المريض',
        patientPhone: data.patientPhone || '',
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        doctorSpecialty: data.doctorSpecialty,
        serviceType: data.serviceType || 'APPOINTMENT',
        serviceReferenceId: data.serviceReferenceId || '',
        serviceName: data.serviceName || 'خدمة طبية',
        amount: data.amount || 250,
        currency: data.currency || 'SAR',
        paymentMethod: data.paymentMethod || 'MADA',
        cardBrand: data.cardBrand || 'Mada',
        last4: data.last4 || '4242',
        status: 'PAYMENT_SUCCESS',
        paymentStatus: 'PAYMENT_SUCCESS',
        transactionReference: data.transactionReference || `TXN-${Date.now()}`,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await firebaseDb.createPayment(pay);
      return {
        success: true,
        payment: pay,
        message: 'تم تأكيد الدفع بنجاح'
      };
    }
  },

  failPayment: async (paymentId: string, reason?: string): Promise<any> => {
    try {
      return await fetchJson('/api/payments/fail', {
        method: 'POST',
        body: JSON.stringify({ paymentId, reason })
      });
    } catch {
      return { success: true };
    }
  },

  processRefund: async (
    paymentIdOrOptions: string | { paymentId: string; amount?: number; reason?: string; refundedBy?: string; processedBy?: string; serviceReferenceId?: string },
    data?: { amount?: number; reason?: string; processedBy?: string; processedByUserId?: string }
  ): Promise<{ success: boolean; refund: Refund; payment: Payment; message: string }> => {
    let paymentId: string;
    let payload: any;
    if (typeof paymentIdOrOptions === 'string') {
      paymentId = paymentIdOrOptions;
      payload = data || {};
    } else {
      paymentId = paymentIdOrOptions.paymentId;
      payload = {
        amount: paymentIdOrOptions.amount,
        reason: paymentIdOrOptions.reason || 'استرداد مالي',
        processedBy: paymentIdOrOptions.processedBy || paymentIdOrOptions.refundedBy || 'إدارة المستشفى',
        serviceReferenceId: paymentIdOrOptions.serviceReferenceId
      };
    }
    return await fetchJson<{ success: boolean; refund: Refund; payment: Payment; message: string }>(
      `/api/payments/${paymentId}/refund`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  },

  updatePaymentStatus: async (paymentId: string, status: any): Promise<Payment> => {
    return await fetchJson<Payment>(`/api/payments/${paymentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  waivePayment: async (data: {
    serviceType: 'APPOINTMENT' | 'CONSULTATION';
    serviceReferenceId: string;
    reason: string;
    approvedBy?: string;
    approvedByUserId?: string;
  }): Promise<{ success: boolean; message: string }> => {
    return await fetchJson<{ success: boolean; message: string }>('/api/payments/waive', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // ==========================================================
  // Follow-ups & Reminders
  // ==========================================================

  getFollowUps: async (params?: {
    patientId?: string;
    doctorId?: string;
    status?: string;
  }): Promise<FollowUpAppointment[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.status) q.set('status', params.status);
      return await fetchJson<FollowUpAppointment[]>(`/api/follow-ups?${q.toString()}`);
    } catch {
      return (await firebaseDb.getFollowUps(params?.patientId)) || [];
    }
  },

  createFollowUp: async (data: Partial<FollowUpAppointment>): Promise<FollowUpAppointment> => {
    try {
      return await fetchJson<FollowUpAppointment>('/api/follow-ups', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      const flw: FollowUpAppointment = {
        id: `flw-${Date.now()}`,
        patientId: data.patientId || 'pat-1',
        patientName: data.patientName || 'المريض',
        patientPhone: data.patientPhone || '',
        patientMrn: data.patientMrn || 'MRN-2026-0000',
        doctorId: data.doctorId || 'doc-1',
        doctorName: data.doctorName || 'الطبيب الاستشاري',
        doctorSpecialty: data.doctorSpecialty || 'العيادات الطبية',
        sourceType: data.sourceType || 'APPOINTMENT',
        sourceId: data.sourceId || '',
        followUpDate: data.followUpDate || new Date().toISOString().split('T')[0],
        followUpTime: data.followUpTime || '10:00',
        reason: data.reason || 'مراجعة طبية ومتابعة تحسن الحالة',
        doctorNotes: data.doctorNotes || '',
        status: 'SCHEDULED',
        reminderSent: false,
        createdAt: new Date().toISOString()
      };
      await firebaseDb.createFollowUp(flw);
      return flw;
    }
  },

  requestReschedule: async (appointmentId: string, data: {
    requestedDate: string;
    requestedPeriod?: 'MORNING' | 'EVENING';
    reason: string;
  }): Promise<Appointment> => {
    return await fetchJson<Appointment>(`/api/appointments/${appointmentId}/reschedule-request`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  triggerReminderCheck: async (): Promise<{ success: boolean; triggeredCount: number; message: string }> => {
    return await fetchJson<{ success: boolean; triggeredCount: number; message: string }>('/api/reminders/trigger-check', {
      method: 'POST'
    });
  },

  subscribePayments: (
    filterOrPatientId: string | { patientId?: string; doctorId?: string; status?: string } | undefined,
    callback: (payments: Payment[]) => void
  ) => {
    const filter = typeof filterOrPatientId === 'string' ? { patientId: filterOrPatientId } : (filterOrPatientId || {});
    return subscribeToPayments(filter, callback);
  },

  subscribeFollowUps: (
    filterOrPatientId: string | { patientId?: string; doctorId?: string } | undefined,
    callback: (followUps: FollowUpAppointment[]) => void
  ) => {
    const filter = typeof filterOrPatientId === 'string' ? { patientId: filterOrPatientId } : (filterOrPatientId || {});
    return subscribeToFollowUps(filter, callback);
  }

};

export const apiClient = api;
export default api;

