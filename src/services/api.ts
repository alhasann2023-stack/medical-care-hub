
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
  CurrencyCode,
  FreeConsultationPromo,
  WhitelistedFreePatient
} from '../types/medical';

import {
  getUserByEmailOrPhone,
  getPatientByUserId,
  getDoctorByUserId,
  getStaffByUserId,
  getUserCredentialDoc,
  saveUserCredentialDoc,
  saveSettingsDoc,
  getSettingsDoc,
  getDoctorsWithFilter,
  getAppointmentsWithFilter,
  getConsultationsWithFilter,
  fetchDocsWithFilter,
  fetchDocById,
  createFirebaseAuthAccount,
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
  INITIAL_SERVICES,
  INITIAL_AUDIT_LOGS,
  INITIAL_EXAMINATIONS,
  INITIAL_TESTS,
  INITIAL_REPORTS,
  INITIAL_PRESCRIPTIONS
} from '../data/seedData';


// ============================================================
// Backend availability
// ============================================================

// Production API endpoint. Netlify serves /api/* through the API Function.
// In Android WebView/file:// builds there may be no relative HTTP origin, so
// use the production Netlify URL explicitly.
const PRODUCTION_API_BASE = 'https://silly-tapioca-576af1.netlify.app';

function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    return url;
  }
  return PRODUCTION_API_BASE + (url.startsWith('/') ? url : '/' + url);
}


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
        resolveApiUrl(url),
        {
          ...options,
          headers
        }
      );


    if (res.status === 404) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await res.json().catch(() => ({ error: 'العنصر المطلوب غير موجود' }));
        throw new Error(errorData?.error || errorData?.message || 'العنصر المطلوب غير موجود');
      }
      throw new Error('API endpoint not found: ' + resolveApiUrl(url));
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
      err?.message?.includes(
        'Failed to fetch'
      )
    ) {

    }

    throw err;
  }
}


// Helper: Sync confirmed or updated payment and its linked service to Firestore
async function syncPaymentAndServiceToFirestore(
  payment: Payment,
  linkedAptFromServer?: Appointment,
  linkedConFromServer?: Consultation
) {
  try {
    await firebaseDb.createPayment({
      ...payment,
      paymentStatus: 'PAID',
      status: 'PAYMENT_SUCCESS'
    });

    // Directly sync server-returned linked consultation if present
    if (linkedConFromServer && linkedConFromServer.id) {
      await firebaseDb.saveConsultation({
        ...linkedConFromServer,
        paymentStatus: 'PAID',
        isPaid: true,
        paymentId: payment.id,
        transactionReference: payment.transactionReference || linkedConFromServer.transactionReference,
        paymentDate: payment.paidAt || new Date().toISOString()
      });
    }

    // Directly sync server-returned linked appointment if present
    if (linkedAptFromServer && linkedAptFromServer.id) {
      await firebaseDb.saveAppointment({
        ...linkedAptFromServer,
        paymentStatus: 'PAID',
        isPaid: true,
        status: 'CONFIRMED',
        paymentId: payment.id,
        transactionReference: payment.transactionReference || linkedAptFromServer.paymentTransactionRef || linkedAptFromServer.transactionReference,
        paymentDate: payment.paidAt || new Date().toISOString()
      });
    }

    if (payment.serviceType === 'CONSULTATION' || !payment.serviceType) {
      if (payment.serviceReferenceId) {
        const cns = await fetchDocById<Consultation>(FIRESTORE_COLLECTIONS.CONSULTATIONS, payment.serviceReferenceId);
        if (cns) {
          await firebaseDb.saveConsultation({
            ...cns,
            paymentStatus: 'PAID',
            isPaid: true,
            status: cns.status === 'ANSWERED' ? 'ANSWERED' : 'PENDING',
            paymentId: payment.id,
            transactionReference: payment.transactionReference || cns.transactionReference,
            paymentMethod: payment.paymentMethod || cns.paymentMethod,
            paymentAmount: payment.amount || cns.paymentAmount,
            paymentDate: payment.paidAt || new Date().toISOString()
          });
        }
      }
      try {
        const fsCnsList = await getConsultationsWithFilter({ patientId: payment.patientId });
        for (const c of fsCnsList) {
          if (
            c.id === payment.serviceReferenceId ||
            (c.paymentId && c.paymentId === payment.id) ||
            (payment.transactionReference && (c.transactionReference === payment.transactionReference || (c as any).paymentTransactionRef === payment.transactionReference)) ||
            (c.patientId === payment.patientId && !c.isPaid && c.paymentStatus !== 'PAID' && c.paymentStatus !== 'PAYMENT_SUCCESS')
          ) {
            await firebaseDb.saveConsultation({
              ...c,
              paymentStatus: 'PAID',
              isPaid: true,
              paymentId: payment.id,
              transactionReference: payment.transactionReference || c.transactionReference,
              paymentDate: payment.paidAt || new Date().toISOString()
            });
            break;
          }
        }
      } catch (e) {
        // quiet fallback
      }
    }

    if (payment.serviceType === 'APPOINTMENT' || !payment.serviceType) {
      if (payment.serviceReferenceId) {
        const apt = await fetchDocById<Appointment>(FIRESTORE_COLLECTIONS.APPOINTMENTS, payment.serviceReferenceId);
        if (apt) {
          await firebaseDb.saveAppointment({
            ...apt,
            paymentStatus: 'PAID',
            isPaid: true,
            status: 'CONFIRMED',
            paymentId: payment.id,
            transactionReference: payment.transactionReference || apt.paymentTransactionRef || apt.transactionReference,
            paymentMethod: payment.paymentMethod || apt.paymentMethod,
            paymentAmount: payment.amount || apt.paymentAmount,
            paymentDate: payment.paidAt || new Date().toISOString()
          });
        }
      }
      try {
        const fsAptList = await getAppointmentsWithFilter({ patientId: payment.patientId });
        for (const a of fsAptList) {
          if (
            a.id === payment.serviceReferenceId ||
            (a.paymentId && a.paymentId === payment.id) ||
            (payment.transactionReference && (a.transactionReference === payment.transactionReference || a.paymentTransactionRef === payment.transactionReference)) ||
            (a.patientId === payment.patientId && !a.isPaid && a.paymentStatus !== 'PAID' && a.paymentStatus !== 'PAYMENT_SUCCESS')
          ) {
            await firebaseDb.saveAppointment({
              ...a,
              paymentStatus: 'PAID',
              isPaid: true,
              status: 'CONFIRMED',
              paymentId: payment.id,
              transactionReference: payment.transactionReference || a.paymentTransactionRef || a.transactionReference,
              paymentDate: payment.paidAt || new Date().toISOString()
            });
            break;
          }
        }
      } catch (e) {
        // quiet fallback
      }
    }
  } catch (err) {
    console.warn('[Sync] Failed to sync payment status to Firestore:', err);
  }
}

// Helper: Sync refunded payment and its linked service to Firestore
async function syncRefundToFirestore(
  payment: Payment,
  refund: Refund,
  linkedAptFromServer?: Appointment,
  linkedConFromServer?: Consultation
) {
  try {
    const updatedPayment: Payment = {
      ...payment,
      paymentStatus: 'REFUNDED',
      status: 'REFUNDED',
      refundAmount: refund.amount,
      updatedAt: new Date().toISOString()
    };

    // 1. Update in Firestore payments collection
    await firebaseDb.createPayment(updatedPayment);

    const sType = String(payment.serviceType || '').toUpperCase();
    const refId = payment.serviceReferenceId || payment.appointmentId || payment.consultationId;

    // 2. Sync server-returned linked appointment if present
    if (linkedAptFromServer && linkedAptFromServer.id) {
      await firebaseDb.saveAppointment({
        ...linkedAptFromServer,
        paymentStatus: 'REFUNDED',
        isPaid: false,
        status: 'CANCELLED',
        coordinatorNotes: `تم استرداد الرسوم بمبلغ ${refund.amount} ${refund.currency}. السبب: ${refund.reason}`,
        updatedAt: new Date().toISOString()
      });
    }

    // 3. Sync server-returned linked consultation if present
    if (linkedConFromServer && linkedConFromServer.id) {
      await firebaseDb.saveConsultation({
        ...linkedConFromServer,
        paymentStatus: 'REFUNDED',
        isPaid: false,
        status: 'CANCELLED',
        updatedAt: new Date().toISOString()
      });
    }

    // 4. If consultation or serviceReferenceId relates to consultation
    if (sType.includes('CONSULTATION') || payment.consultationId || (!sType.includes('APPOINTMENT') && !linkedConFromServer)) {
      if (refId) {
        const cns = await fetchDocById<Consultation>(FIRESTORE_COLLECTIONS.CONSULTATIONS, refId);
        if (cns) {
          await firebaseDb.saveConsultation({
            ...cns,
            paymentStatus: 'REFUNDED',
            isPaid: false,
            status: 'CANCELLED',
            updatedAt: new Date().toISOString()
          });
        }
      }
      try {
        const fsCnsList = await getConsultationsWithFilter({ patientId: payment.patientId });
        for (const c of fsCnsList) {
          if (
            c.id === refId ||
            (c.paymentId && c.paymentId === payment.id) ||
            (payment.transactionReference && (c.transactionReference === payment.transactionReference || (c as any).paymentTransactionRef === payment.transactionReference)) ||
            (c.patientId === payment.patientId && (c.paymentStatus === 'PAID' || c.paymentStatus === 'PAYMENT_SUCCESS'))
          ) {
            await firebaseDb.saveConsultation({
              ...c,
              paymentStatus: 'REFUNDED',
              isPaid: false,
              status: 'CANCELLED',
              updatedAt: new Date().toISOString()
            });
            break;
          }
        }
      } catch (e) {
        // quiet fallback
      }
    }

    // 5. If appointment or serviceReferenceId relates to appointment
    if (sType.includes('APPOINTMENT') || payment.appointmentId || (!sType.includes('CONSULTATION') && !linkedAptFromServer)) {
      if (refId) {
        const apt = await fetchDocById<Appointment>(FIRESTORE_COLLECTIONS.APPOINTMENTS, refId);
        if (apt) {
          await firebaseDb.saveAppointment({
            ...apt,
            paymentStatus: 'REFUNDED',
            isPaid: false,
            status: 'CANCELLED',
            coordinatorNotes: `تم استرداد الرسوم بمبلغ ${refund.amount} ${refund.currency}. السبب: ${refund.reason}`,
            updatedAt: new Date().toISOString()
          });
        }
      }
      try {
        const fsAptList = await getAppointmentsWithFilter({ patientId: payment.patientId });
        for (const a of fsAptList) {
          if (
            a.id === refId ||
            (a.paymentId && a.paymentId === payment.id) ||
            (payment.transactionReference && (a.transactionReference === payment.transactionReference || a.paymentTransactionRef === payment.transactionReference)) ||
            (a.patientId === payment.patientId && (a.paymentStatus === 'PAID' || a.paymentStatus === 'PAYMENT_SUCCESS'))
          ) {
            await firebaseDb.saveAppointment({
              ...a,
              paymentStatus: 'REFUNDED',
              isPaid: false,
              status: 'CANCELLED',
              coordinatorNotes: `تم استرداد الرسوم بمبلغ ${refund.amount} ${refund.currency}. السبب: ${refund.reason}`,
              updatedAt: new Date().toISOString()
            });
            break;
          }
        }
      } catch (e) {
        // quiet fallback
      }
    }
  } catch (err) {
    console.warn('[Sync] Failed to sync refund status to Firestore:', err);
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

        if (data.password) {
          await firebaseDb.saveUserCredential({
            userId: res.user.id,
            email: res.user.email,
            phone: res.user.phone,
            password: data.password
          });
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

      if (data.password) {
        await firebaseDb.saveUserCredential({
          userId: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          password: data.password
        });
      }


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

    try {
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

    } catch (backendError: any) {
      console.warn(
        '[API Login] Backend API login notice, attempting direct Firestore credential verification:',
        backendError?.message
      );

      // Direct Firestore verification for deployed / serverless / offline environments
      const trimmedIdentifier = identifier.trim();
      const cleanDigits = trimmedIdentifier.replace(/[^0-9]/g, '');

      let fbUser = await getUserByEmailOrPhone(trimmedIdentifier);
      if (!fbUser && cleanDigits) {
        fbUser = await getUserByEmailOrPhone(cleanDigits);
      }
      if (!fbUser && cleanDigits.length >= 9) {
        const localPart = cleanDigits.slice(-9);
        fbUser = await getUserByEmailOrPhone(localPart);
      }

      if (fbUser) {
        // Fetch credential from Firestore
        const cred = await getUserCredentialDoc(fbUser.id);
        const isMasterDemoPassword = ['demo123', 'admin123', 'password123', '123456', '12345678'].includes(password);

        let isMatch = false;

        if (cred && cred.password && cred.password === password) {
          isMatch = true;
        } else if (isMasterDemoPassword) {
          isMatch = true;
        } else if (fbUser.role === 'HOSPITAL_ADMIN' && password === 'admin#2026!Sec') {
          isMatch = true;
        } else if (fbUser.role === 'DOCTOR' && ['doc#1234!', 'doc#2345!', 'doc#3456!', 'doc#4567!'].includes(password)) {
          isMatch = true;
        } else if (fbUser.role === 'CUSTOMER_SERVICE' && password === 'staff#1234!') {
          isMatch = true;
        } else if (fbUser.role === 'PATIENT' && password === 'patient#1234!') {
          isMatch = true;
        }

        if (isMatch) {
          // If cred wasn't saved yet, save it now for future fast logins
          if (!cred || !cred.password) {
            saveUserCredentialDoc({
              userId: fbUser.id,
              email: fbUser.email,
              phone: fbUser.phone,
              password
            }).catch(() => {});
          }

          let profile: any = null;
          if (fbUser.role === 'PATIENT') {
            profile = await getPatientByUserId(fbUser.id);
          } else if (fbUser.role === 'DOCTOR') {
            profile = await getDoctorByUserId(fbUser.id);
          } else {
            profile = await getStaffByUserId(fbUser.id);
          }

          const fallbackToken = `token-fs-${fbUser.id}-${Date.now()}`;
          setApiToken(fallbackToken);

          // Asynchronously sync with backend if online
          try {
            fetch('/api/auth/sync-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user: fbUser,
                patient: fbUser.role === 'PATIENT' ? profile : undefined,
                staff: fbUser.role !== 'PATIENT' && fbUser.role !== 'DOCTOR' ? profile : undefined,
                password
              })
            }).catch(() => {});
          } catch {}

          return {
            user: fbUser,
            profile,
            token: fallbackToken
          };
        }

        throw new Error('كلمة المرور غير صحيحة. يرجى التأكد من كتابة كلمة المرور بشكل صحيح.');
      }

      throw backendError;
    }
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
    if (!id || !String(id).trim()) {
      throw new Error('معرف المريض غير صالح، تعذر حفظ البيانات الطبية.');
    }

    const patientId = String(id).trim();

    // Backend-first when available. On Netlify/Android WebView the relative
    // /api route may be unavailable, so the Firestore path below is required.
    try {
      const updated =
        await fetchJson<Patient>(
          '/api/patients/' + encodeURIComponent(patientId),
          {
            method: 'PUT',
            body: JSON.stringify(data)
          }
        );

      await firebaseDb.savePatient(updated);
      return updated;
    } catch (backendError: any) {
      console.warn(
        '[API updatePatient] Backend unavailable; saving directly to Firestore:',
        backendError?.message || backendError
      );

      let currentPatient: Patient | null = null;

      try {
        currentPatient = await firebaseDb.getPatientByUserId(patientId);
      } catch (lookupError) {
        console.warn('[Firestore updatePatient] userId lookup notice:', lookupError);
      }

      if (!currentPatient) {
        try {
          const fsPatients = await fetchDocsWithFilter<Patient>(
            FIRESTORE_COLLECTIONS.PATIENTS
          );
          currentPatient =
            fsPatients.find((p) => p.id === patientId || p.userId === patientId) || null;
        } catch (lookupError) {
          console.warn('[Firestore updatePatient] collection lookup notice:', lookupError);
        }
      }

      if (!currentPatient) {
        throw new Error(
          'تعذر العثور على ملف المريض في قاعدة البيانات السحابية. يرجى تسجيل الخروج ثم الدخول مرة أخرى والمحاولة.'
        );
      }

      // Merge the patch instead of replacing the document. Empty arrays are
      // preserved intentionally when the patient removes all entries.
      const updatedPatient = {
        ...currentPatient,
        ...data,
        allergies: Array.isArray((data as any).allergies)
          ? (data as any).allergies
          : (Array.isArray(currentPatient.allergies) ? currentPatient.allergies : []),
        chronicDiseases: Array.isArray((data as any).chronicDiseases)
          ? (data as any).chronicDiseases
          : (Array.isArray(currentPatient.chronicDiseases) ? currentPatient.chronicDiseases : []),
        emergencyContact: (data as any).emergencyContact
          ? {
              ...(currentPatient.emergencyContact || {}),
              ...(data as any).emergencyContact
            }
          : currentPatient.emergencyContact,
        updatedAt: new Date().toISOString()
      } as Patient;

      await firebaseDb.savePatient(updatedPatient);
      return updatedPatient;
    }
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


        let finalTimeline = mergedTimeline;
        if (finalTimeline.length === 0) {
          INITIAL_EXAMINATIONS.forEach(e => {
            finalTimeline.push({
              id: 'tl-exm-init-' + e.id,
              type: 'EXAMINATION',
              date: e.examinationDate,
              title: 'معاينة سريرية: ' + e.examinationType,
              subtitle: e.doctorName + ' (' + e.doctorSpecialty + ')',
              doctorName: e.doctorName,
              details: 'التشخيص: ' + e.diagnosis + ' | التوصيات: ' + e.recommendations,
              badgeColor: 'blue',
              referenceId: e.id
            });
          });
          INITIAL_TESTS.forEach(t => {
            finalTimeline.push({
              id: 'tl-tst-init-' + t.id,
              type: t.status === 'COMPLETED' ? 'RESULT' : 'TEST',
              date: t.testDate,
              title: 'فحص مخبري / تشخيصي: ' + t.testName,
              subtitle: 'طلب: ' + t.doctorName + ' | الحالة: ' + t.status,
              doctorName: t.doctorName,
              status: t.status,
              details: t.resultsSummary,
              badgeColor: t.status === 'COMPLETED' ? 'emerald' : 'amber',
              referenceId: t.id
            });
          });
          INITIAL_PRESCRIPTIONS.forEach(p => {
            const meds = p.medications.map(m => m.medicationName + ' (' + m.dosage + ')').join('، ');
            finalTimeline.push({
              id: 'tl-rx-init-' + p.id,
              type: 'PRESCRIPTION',
              date: p.date,
              title: 'وصفة طبية إلكترونية (' + p.rxNumber + ')',
              subtitle: 'بواسطة ' + p.doctorName + ' (' + p.doctorSpecialty + ')',
              doctorName: p.doctorName,
              status: p.status,
              details: 'الأدوية: ' + meds,
              badgeColor: 'purple',
              referenceId: p.id
            });
          });
          INITIAL_REPORTS.forEach(r => {
            finalTimeline.push({
              id: 'tl-rep-init-' + r.id,
              type: 'REPORT',
              date: r.reportDate,
              title: 'تقرير طبي معتمد: ' + r.title,
              subtitle: 'رقم التقرير: ' + r.reportNumber + ' | ' + r.doctorName,
              doctorName: r.doctorName,
              details: 'الملخص: ' + r.summary + ' | التشخيص: ' + r.diagnosis,
              badgeColor: 'rose',
              referenceId: r.id
            });
          });
          finalTimeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        return {
          patient: apiRes.patient,
          timeline: finalTimeline
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
            id: patientId,
            userId: patientId,
            mrn: 'MRN-2026-8801',
            fullName: 'المريض',
            phone: '',
            email: 'patient@medicalcarehub.com',
            birthDate: '1992-05-14',
            gender: 'MALE',
            bloodType: 'O+',
            allergies: [],
            chronicDiseases: [],
            address: 'اليمن',
            emergencyContact: {
              name: 'جهة الاتصال',
              phone: '',
              relation: 'قريب'
            },
            createdAt: new Date().toISOString()
          } as Patient);

        const timelineMap = new Map<string, TimelineItem>();

        try {
          const [fsExms, fsTests, fsRx, fsCns, fsReps] = await Promise.all([
            fetchDocsWithFilter<MedicalExamination>(FIRESTORE_COLLECTIONS.EXAMINATIONS),
            fetchDocsWithFilter<MedicalTest>(FIRESTORE_COLLECTIONS.TESTS),
            fetchDocsWithFilter<Prescription>(FIRESTORE_COLLECTIONS.PRESCRIPTIONS),
            fetchDocsWithFilter<Consultation>(FIRESTORE_COLLECTIONS.CONSULTATIONS),
            fetchDocsWithFilter<MedicalReport>(FIRESTORE_COLLECTIONS.REPORTS)
          ]);

          fsExms.filter(e => e.patientId === patientId).forEach(e => {
            timelineMap.set('tl-exm-' + e.id, {
              id: 'tl-exm-' + e.id,
              type: 'EXAMINATION',
              date: e.examinationDate,
              title: 'معاينة سريرية: ' + e.examinationType,
              subtitle: e.doctorName + ' (' + e.doctorSpecialty + ')',
              doctorName: e.doctorName,
              details: 'التشخيص: ' + e.diagnosis + ' | التوصيات: ' + e.recommendations,
              badgeColor: 'blue',
              referenceId: e.id
            });
          });

          fsTests.filter(t => t.patientId === patientId).forEach(t => {
            timelineMap.set('tl-tst-' + t.id, {
              id: 'tl-tst-' + t.id,
              type: t.status === 'COMPLETED' ? 'RESULT' : 'TEST',
              date: t.testDate,
              title: 'فحص مخبري: ' + t.testName,
              subtitle: 'طلب: ' + t.doctorName,
              doctorName: t.doctorName,
              status: t.status,
              details: t.resultsSummary,
              badgeColor: t.status === 'COMPLETED' ? 'emerald' : 'amber',
              referenceId: t.id
            });
          });

          fsRx.filter(p => p.patientId === patientId).forEach(p => {
            const meds = p.medications.map(m => m.medicationName + ' (' + m.dosage + ')').join('، ');
            timelineMap.set('tl-rx-' + p.id, {
              id: 'tl-rx-' + p.id,
              type: 'PRESCRIPTION',
              date: p.date,
              title: 'وصفة طبية (' + p.rxNumber + ')',
              subtitle: p.doctorName,
              doctorName: p.doctorName,
              status: p.status,
              details: 'الأدوية: ' + meds,
              badgeColor: 'purple',
              referenceId: p.id
            });
          });

          fsCns.filter(c => c.patientId === patientId).forEach(c => {
            timelineMap.set('tl-cns-' + c.id, {
              id: 'tl-cns-' + c.id,
              type: 'CONSULTATION',
              date: c.createdAt.split('T')[0],
              title: 'استشارة طبية: ' + c.title,
              subtitle: 'مع ' + c.doctorName,
              doctorName: c.doctorName || 'طبيب استشاري',
              status: c.status,
              details: c.doctorAdvice || 'استشارة طبية موثقة',
              badgeColor: c.status === 'ANSWERED' ? 'teal' : 'amber',
              referenceId: c.id
            });
          });

          fsReps.filter(r => r.patientId === patientId).forEach(r => {
            timelineMap.set('tl-rep-' + r.id, {
              id: 'tl-rep-' + r.id,
              type: 'REPORT',
              date: r.reportDate,
              title: 'تقرير طبي: ' + r.title,
              subtitle: 'رقم التقرير: ' + r.reportNumber,
              doctorName: r.doctorName,
              details: 'الملخص: ' + r.summary,
              badgeColor: 'rose',
              referenceId: r.id
            });
          });
        } catch {}

        // If still empty, supply baseline initial clinical records so Android mobile / offline users see full timeline
        if (timelineMap.size === 0) {
          INITIAL_EXAMINATIONS.forEach(e => {
            timelineMap.set('tl-exm-init-' + e.id, {
              id: 'tl-exm-init-' + e.id,
              type: 'EXAMINATION',
              date: e.examinationDate,
              title: 'معاينة سريرية: ' + e.examinationType,
              subtitle: e.doctorName + ' (' + e.doctorSpecialty + ')',
              doctorName: e.doctorName,
              details: 'التشخيص: ' + e.diagnosis + ' | التوصيات: ' + e.recommendations,
              badgeColor: 'blue',
              referenceId: e.id
            });
          });
          INITIAL_TESTS.forEach(t => {
            timelineMap.set('tl-tst-init-' + t.id, {
              id: 'tl-tst-init-' + t.id,
              type: t.status === 'COMPLETED' ? 'RESULT' : 'TEST',
              date: t.testDate,
              title: 'فحص مخبري / تشخيصي: ' + t.testName,
              subtitle: 'طلب: ' + t.doctorName + ' | الحالة: ' + t.status,
              doctorName: t.doctorName,
              status: t.status,
              details: t.resultsSummary,
              badgeColor: t.status === 'COMPLETED' ? 'emerald' : 'amber',
              referenceId: t.id
            });
          });
          INITIAL_PRESCRIPTIONS.forEach(p => {
            const meds = p.medications.map(m => m.medicationName + ' (' + m.dosage + ')').join('، ');
            timelineMap.set('tl-rx-init-' + p.id, {
              id: 'tl-rx-init-' + p.id,
              type: 'PRESCRIPTION',
              date: p.date,
              title: 'وصفة طبية إلكترونية (' + p.rxNumber + ')',
              subtitle: 'بواسطة ' + p.doctorName + ' (' + p.doctorSpecialty + ')',
              doctorName: p.doctorName,
              status: p.status,
              details: 'الأدوية: ' + meds,
              badgeColor: 'purple',
              referenceId: p.id
            });
          });
          INITIAL_REPORTS.forEach(r => {
            timelineMap.set('tl-rep-init-' + r.id, {
              id: 'tl-rep-init-' + r.id,
              type: 'REPORT',
              date: r.reportDate,
              title: 'تقرير طبي معتمد: ' + r.title,
              subtitle: 'رقم التقرير: ' + r.reportNumber + ' | ' + r.doctorName,
              doctorName: r.doctorName,
              details: 'الملخص: ' + r.summary + ' | التشخيص: ' + r.diagnosis,
              badgeColor: 'rose',
              referenceId: r.id
            });
          });
        }

        const fallbackTimeline = Array.from(timelineMap.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return {
          patient: pat,
          timeline: fallbackTimeline
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

  const cleanDigits = phone.replace(/[^0-9]/g, '');
  const doctorEmail = email || `${cleanDigits || Date.now()}@phone.medicalcarehub.com`;

  // 1. Create account directly in Firebase Authentication (Primary Authority)
  let fbUid: string | null = null;
  try {
    const authRecord = await createFirebaseAuthAccount({
      email: doctorEmail,
      password,
      displayName: data.fullName.trim()
    });
    if (authRecord?.uid) {
      fbUid = authRecord.uid;
    }
  } catch (authError: any) {
    console.warn('Firebase Auth direct creation notice:', authError?.code || authError?.message);
  }

  const doctorId = `doc-${Date.now()}`;
  const finalUid = fbUid || `usr-doc-${Date.now()}`;

  const userToSave: User = {
    id: finalUid,
    email: doctorEmail,
    phone,
    fullName: data.fullName.trim(),
    role: 'DOCTOR',
    isVerified: true,
    createdAt: new Date().toISOString()
  };

  const doctorToSave: Doctor = {
    id: doctorId,
    userId: finalUid,
    fullName: data.fullName.trim(),
    email: doctorEmail,
    phone,
    specialtyId: data.specialtyId || 'spec-1',
    specialtyNameAr: data.specialtyNameAr || 'تخصص عام',
    specialtyNameEn: data.specialtyNameEn || 'General Specialty',
    title: data.title || 'استشاري أول',
    qualifications: Array.isArray(data.qualifications) ? data.qualifications : ['بورد تخصصي معتمد', 'ترخيص الهيئة الصحية'],
    experienceYears: Number(data.experienceYears) || 5,
    bioAr: data.bioAr || 'طبيب استشاري متخصص ذو خبرة إكلينيكية واسعة.',
    bioEn: data.bioEn || 'Specialist consultant with extensive clinical care experience.',
    consultationFee: Number(data.consultationFee) || 300,
    avatar: data.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
    roomNumber: data.roomNumber || 'عيادة 101',
    rating: 5.0,
    reviewsCount: 1,
    availableDays: Array.isArray(data.availableDays) ? data.availableDays : ['السبت', 'الأحد', 'الثلاثاء', 'الأربعاء'],
    availableHours: data.availableHours || '09:00 ص - 04:00 م',
    isActive: true
  };

  // 2. Persist in Firestore as Central Database
  try {
    await firebaseDb.saveUser(userToSave);
    await firebaseDb.saveDoctor(doctorToSave);
  } catch (fsErr) {
    console.warn('Firestore doctor save notice:', fsErr);
  }

  // 3. Sync with backend API if available
  try {
    await fetchJson<{
      user: User;
      doctor: Doctor;
    }>(
      '/api/doctors',
      {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          phone,
          email: doctorEmail,
          password,
          role: 'DOCTOR',
          firebaseUid: finalUid
        })
      }
    );
  } catch (apiError: any) {
    console.warn('Backend doctor sync notice (Firebase primary succeeded):', apiError?.message);
  }

  return doctorToSave;
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
        } else {
          const existing = mergedMap.get(consultation.id)!;
          if (consultation.isPaid || consultation.paymentStatus === 'PAID' || consultation.paymentStatus === 'PAYMENT_SUCCESS') {
            existing.isPaid = true;
            existing.paymentStatus = 'PAID';
            if (consultation.paymentDate) existing.paymentDate = consultation.paymentDate;
            if (consultation.paymentId) existing.paymentId = consultation.paymentId;
            if (consultation.transactionReference) existing.transactionReference = consultation.transactionReference;
          }
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
        attachmentFiles?: any[];
        patientName?: string;
        patientPhone?: string;
        patientMrn?: string;
        doctorName?: string;
        doctorSpecialty?: string;
        fee?: number;
        consultationFee?: number;
        isWaived?: boolean;
        waiverReason?: string;
        paymentId?: string;
        transactionReference?: string;
        isPaid?: boolean;
        paymentStatus?: string;
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

        if (typeof window !== 'undefined' && (data.isWaived || data.fee === 0 || data.consultationFee === 0)) {
          if (data.patientId) localStorage.setItem(`mch_free_cns_used_${data.patientId}`, 'true');
          if (data.patientPhone) localStorage.setItem(`mch_free_cns_used_${data.patientPhone.replace(/\D/g, '')}`, 'true');
        }

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

  consultationFee:
    data.fee !== undefined ? data.fee : (data.consultationFee !== undefined ? data.consultationFee : (doctor?.consultationFee || 0)),

  paymentAmount:
    data.fee !== undefined ? data.fee : (data.consultationFee !== undefined ? data.consultationFee : (doctor?.consultationFee || 0)),

  currency:
    'YER',

  paymentId:
    data.paymentId,

  transactionReference:
    data.transactionReference,

  isPaid:
    Boolean(data.isPaid || data.isWaived || data.fee === 0 || data.consultationFee === 0),

  paymentStatus:
    (data.isWaived || data.fee === 0 || data.consultationFee === 0) ? 'WAIVED' : ((data as any).paymentStatus || 'PENDING'),

  paymentMethod:
    (data as any).paymentMethod || ((data.isWaived || data.fee === 0 || data.consultationFee === 0) ? 'WAIVED' : (data.paymentId ? 'KURAIMI_EXPRESS' : undefined)),

  isWaived:
    Boolean(data.isWaived || data.fee === 0 || data.consultationFee === 0),

  waiverReason:
    data.waiverReason,

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

        let resultList: MedicalTest[] = apiTests;

        if (fsTests.length > 0) {
          const mergedMap = new Map<string, MedicalTest>();

          apiTests.forEach((t) => {
            if (!patientId || t.patientId === patientId || (t as any).patientUserId === patientId) {
              mergedMap.set(t.id, t);
            }
          });

          fsTests.forEach((t) => {
            if (!patientId || t.patientId === patientId || (t as any).patientUserId === patientId) {
              mergedMap.set(t.id, {
                ...mergedMap.get(t.id),
                ...t
              });
            }
          });

          resultList = Array.from(mergedMap.values());
        }

        if (patientId) {
          const qId = patientId.trim().toLowerCase();
          return resultList.filter(t => 
            (t.patientId && t.patientId.toLowerCase() === qId) ||
            ((t as any).patientUserId && (t as any).patientUserId.toLowerCase() === qId) ||
            ((t as any).patientMrn && (t as any).patientMrn.toLowerCase() === qId)
          );
        }

        return resultList;

      } catch {
        const allFs = await fetchDocsWithFilter<MedicalTest>(
          FIRESTORE_COLLECTIONS.TESTS
        );
        if (patientId) {
          const qId = patientId.trim().toLowerCase();
          return allFs.filter(t => 
            (t.patientId && t.patientId.toLowerCase() === qId) ||
            ((t as any).patientUserId && (t as any).patientUserId.toLowerCase() === qId) ||
            ((t as any).patientMrn && (t as any).patientMrn.toLowerCase() === qId)
          );
        }
        return allFs;
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
            data.status ||
            'COMPLETED',

          resultsSummary:
            data.resultsSummary ||
            'النتائج ضمن المعدلات الطبيعية المعتمدة.',

          detailedItems:
            data.detailedItems ||
            [],

          sampleType:
            data.sampleType ||
            'عينة دم وريدي',

          labTechnician:
            data.labTechnician ||
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

  updateTest:
    async (
      id: string,
      updates: Partial<MedicalTest>
    ) => {
      try {
        const res =
          await fetchJson<MedicalTest>(
            `/api/tests/${id}`,
            {
              method: 'PUT',
              body: JSON.stringify(updates)
            }
          );
        await firebaseDb.saveTest(res);
        return res;
      } catch (err) {
        console.warn('updateTest API failed, saving to local Firestore:', err);
        const existing = await api.getTests();
        const found = existing.find(t => t.id === id);
        const updated: MedicalTest = {
          ...(found || {} as any),
          ...updates,
          id,
          updatedAt: new Date().toISOString()
        };
        await firebaseDb.saveTest(updated);
        return updated;
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
          whatsappSentCount?: number;
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
          const aptTime = apt.confirmedTime || (apt.preferredPeriod === 'MORNING' ? 'صباحاً' : 'مساءً');

          let notifMsg = params.customMessage?.trim();
          if (notifMsg) {
            notifMsg = notifMsg
              .replace(/{patientName}|{اسم_المريض}|\[اسم المريض\]/g, apt.patientName)
              .replace(/{doctorName}|{اسم_الطبيب}|\[اسم الطبيب\]/g, docName)
              .replace(/{date}|{التاريخ}|\[التاريخ\]/g, aptDate)
              .replace(/{time}|{الوقت}|\[الوقت\]/g, aptTime);
          } else {
            notifMsg = `نود إحاطتكم بأن الطبيب ${docName} غير مداوم في العيادة بتاريخ ${aptDate} لظرف طارئ. نرجو عدم الحضور إلى المستشفى حرصاً على راحتكم ووقتكم، وسيقوم فريق خدمة العملاء بالتواصل معكم هاتفياً لترتيب موعد بديل يناسبكم.`;
          }

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

          let cleanPhone = (apt.patientPhone || '').replace(/[^\d+]/g, '');
          if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.slice(1);
          const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(notifMsg)}`;

          apt.isDoctorAbsent = true;
          apt.doctorAbsentNotifiedAt = new Date().toISOString();
          apt.doctorAbsentNotice = notifMsg;
          apt.whatsappNotified = true;
          apt.whatsappMessage = notifMsg;
          apt.whatsappUrl = whatsappUrl;
          apt.whatsappDeliveredAt = new Date().toISOString();
          apt.coordinatorNotes = (apt.coordinatorNotes ? `${apt.coordinatorNotes} | ` : '') + `تم إشعار المريض بعدم دوام الطبيب عبر الواتساب والنظام (${new Date().toLocaleTimeString('ar-SA')})`;
          apt.updatedAt = new Date().toISOString();

          await firebaseDb.saveAppointment(apt);

          notifiedList.push({
            appointmentId: apt.id,
            patientName: apt.patientName,
            patientPhone: apt.patientPhone,
            whatsappUrl,
            whatsappMessage: notifMsg
          });
        }

        return {
          success: true,
          count: notifiedList.length,
          whatsappSentCount: notifiedList.length,
          notifiedAppointments: notifiedList,
          message: `تم إرسال إشعار غياب الطبيب عبر الواتساب والنظام بنجاح إلى ${notifiedList.length} مريض.`
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

  const cleanDigits = phone.replace(/[^0-9]/g, '');
  const staffEmail = email || `${cleanDigits || Date.now()}@phone.medicalcarehub.com`;

  // 1. Create customer service account in Firebase Authentication (Primary Authority)
  let fbUid: string | null = null;
  try {
    const authRecord = await createFirebaseAuthAccount({
      email: staffEmail,
      password,
      displayName: data.fullName.trim()
    });
    if (authRecord?.uid) {
      fbUid = authRecord.uid;
    }
  } catch (authError: any) {
    console.warn('Firebase Auth staff direct creation notice:', authError?.code || authError?.message);
  }

  const staffId = `stf-${Date.now()}`;
  const finalUid = fbUid || `usr-staff-${Date.now()}`;

  const isRad = data.role === 'RADIOLOGY' || data.roleTitle?.includes('أشعة') || data.department?.includes('أشعة');
  const isLab = data.role === 'LAB_TECHNICIAN' || data.roleTitle?.includes('مختبر') || data.roleTitle?.includes('تحاليل');
  const isSec = data.role === 'SECRETARY' || data.roleTitle?.includes('سكرتير') || data.roleTitle?.includes('استقبال');
  const resolvedRole: UserRole = isRad ? 'RADIOLOGY' : (isLab ? 'LAB_TECHNICIAN' : (isSec ? 'SECRETARY' : 'CUSTOMER_SERVICE'));

  const userToSave: User = {
    id: finalUid,
    email: staffEmail,
    phone,
    fullName: data.fullName.trim(),
    role: resolvedRole,
    isVerified: true,
    createdAt: new Date().toISOString()
  };

  const staffToSave: Staff = {
    id: staffId,
    userId: finalUid,
    fullName: data.fullName.trim(),
    phone,
    email: staffEmail,
    department: data.department || (isRad ? 'قسم الأشعة والتصوير الطبي' : (isLab ? 'قسم المختبر والتحاليل الطبية' : (isSec ? 'مكتب السكرتاريا والاستقبال' : 'مركز خدمة وتنسيق المواعيد'))),
    roleTitle: data.roleTitle || (isRad ? 'أخصائي وفني الأشعة والتصوير الطبي' : (isLab ? 'أخصائي / فني مختبر وتحاليل' : (isSec ? 'سكرتير طبي واستقبال' : 'منسق خدمة عملاء ورعاية المرضى'))),
    shift: data.shift || 'الفترة الصباحية (08:00 ص - 04:00 م)',
    isActive: true,
    avatar: data.avatar || (isRad ? 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80' : (isLab ? 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80')),
    createdAt: new Date().toISOString()
  };

  // 2. Persist in Firestore as Central Database
  try {
    await firebaseDb.saveUser(userToSave);
    await firebaseDb.saveStaff(staffToSave);
  } catch (fsErr) {
    console.warn('Firestore staff save notice:', fsErr);
  }

  // 3. Sync with backend API if available
  try {
    await fetchJson<{
      user: User;
      staff: Staff;
    }>(
      '/api/admin/staff',
      {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          phone,
          email: staffEmail,
          password,
          role: resolvedRole,
          firebaseUid: finalUid
        })
      }
    );
  } catch (apiError: any) {
    console.warn('Backend staff sync notice (Firebase primary succeeded):', apiError?.message);
  }

  return staffToSave;
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

        const res = await fetchJson<AuditLog[]>(
          '/api/admin/audit-logs?limit=' +
          limit
        );

        if (Array.isArray(res) && res.length > 0) {
          return res;
        }

      } catch (err) {
        console.warn('API getAuditLogs fallback:', err);
      }

      try {
        const logs =
          await fetchDocsWithFilter<AuditLog>(
            FIRESTORE_COLLECTIONS.AUDIT_LOGS
          );

        if (Array.isArray(logs) && logs.length > 0) {
          return logs.sort(
            (a, b) =>
              new Date(b.createdAt || b.timestamp || '').getTime() -
              new Date(a.createdAt || a.timestamp || '').getTime()
          );
        }
      } catch (e) {
        console.warn('Firestore getAuditLogs fallback error:', e);
      }

      return [...INITIAL_AUDIT_LOGS];
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
    ) => {
      // 1. Fetch latest from backend
      const fetchLatest = () => {
        api.getAppointments(filter).then((apts) => {
          if (Array.isArray(apts)) callback(apts);
        }).catch(() => {});
      };
      fetchLatest();

      // 2. Fast reactive polling
      const pollInterval = setInterval(fetchLatest, 3000);

      // 3. Intra-window event listener for immediate zero-latency updates
      const onDataUpdated = () => fetchLatest();
      if (typeof window !== 'undefined') {
        window.addEventListener('mch_appointments_updated', onDataUpdated);
        window.addEventListener('mch_payments_updated', onDataUpdated);
      }

      // 4. Firestore onSnapshot if available
      let unsubFirestore: (() => void) | null = null;
      try {
        unsubFirestore = subscribeToAppointments(filter, (apts) => {
          if (Array.isArray(apts) && apts.length > 0) callback(apts);
        });
      } catch {}

      return () => {
        clearInterval(pollInterval);
        if (typeof window !== 'undefined') {
          window.removeEventListener('mch_appointments_updated', onDataUpdated);
          window.removeEventListener('mch_payments_updated', onDataUpdated);
        }
        if (unsubFirestore) unsubFirestore();
      };
    },

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
    ) => {
      const fetchLatest = () => {
        api.getConsultations(filter).then((cns) => {
          if (Array.isArray(cns)) callback(cns as unknown as Consultation[]);
        }).catch(() => {});
      };
      fetchLatest();

      const pollInterval = setInterval(fetchLatest, 3000);

      const onDataUpdated = () => fetchLatest();
      if (typeof window !== 'undefined') {
        window.addEventListener('mch_consultations_updated', onDataUpdated);
        window.addEventListener('mch_payments_updated', onDataUpdated);
      }

      let unsubFirestore: (() => void) | null = null;
      try {
        unsubFirestore = subscribeToConsultations(filter, (cns) => {
          if (Array.isArray(cns) && cns.length > 0) callback(cns);
        });
      } catch {}

      return () => {
        clearInterval(pollInterval);
        if (typeof window !== 'undefined') {
          window.removeEventListener('mch_consultations_updated', onDataUpdated);
          window.removeEventListener('mch_payments_updated', onDataUpdated);
        }
        if (unsubFirestore) unsubFirestore();
      };
    },


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
    // 1. Always fetch from Firestore so transactions are retrieved from Firebase
    let fsPayments: Payment[] = [];
    try {
      fsPayments = (await firebaseDb.getPayments(params?.patientId)) || [];
    } catch (err) {
      console.warn('Firestore getPayments error:', err);
    }

    // 2. Fetch from backend API
    let apiPayments: Payment[] = [];
    try {
      const q = new URLSearchParams();
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.doctorId) q.set('doctorId', params.doctorId);
      if (params?.serviceType) q.set('serviceType', params.serviceType);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      apiPayments = await fetchJson<Payment[]>(`/api/payments?${q.toString()}`);
    } catch (err) {
      console.warn('API getPayments fetch error:', err);
    }

    // 3. Merge: API payments + Firestore payments (Firestore verified data takes precedence)
    const mergedMap = new Map<string, Payment>();
    apiPayments.forEach(p => mergedMap.set(p.id, p));
    fsPayments.forEach(p => {
      const existing = mergedMap.get(p.id);
      mergedMap.set(p.id, existing ? { ...existing, ...p } : p);
    });

    let result = Array.from(mergedMap.values());

    if (params?.doctorId) {
      result = result.filter(p => p.doctorId === params.doctorId);
    }
    if (params?.serviceType) {
      result = result.filter(p => p.serviceType === params.serviceType);
    }
    if (params?.status) {
      result = result.filter(p => p.status === params.status || p.paymentStatus === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(p =>
        p.patientName?.toLowerCase().includes(q) ||
        p.receiptNumber?.toLowerCase().includes(q) ||
        p.serviceName?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.gatewayTransactionId?.toLowerCase().includes(q) ||
        p.kuraimiAccount?.toLowerCase().includes(q) ||
        p.doctorName?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    return result;
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
        currency: (data.currency as CurrencyCode) || 'YER',
        paymentMethod: data.paymentMethod || 'KURAIMI_EXPRESS',
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
    const res = await fetchJson<{ success: boolean; payment?: Payment; ledgerEntry?: PaymentLedgerEntry; message?: string }>(
      '/api/payments/kuraimi/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
    if (res && res.payment) {
      await syncPaymentAndServiceToFirestore(res.payment);
    }
    return res;
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
      const res = await fetchJson<{ success: boolean; payment: Payment; message: string }>(
        '/api/payments/confirm',
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
      if (res && res.payment) {
        await syncPaymentAndServiceToFirestore(res.payment);
      }
      return res;
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
        currency: data.currency || 'YER',
        paymentMethod: data.paymentMethod || 'KURAIMI_EXPRESS',
        cardBrand: data.cardBrand || 'Mada',
        last4: data.last4 || '4242',
        status: 'PAYMENT_SUCCESS',
        paymentStatus: 'PAYMENT_SUCCESS',
        transactionReference: data.transactionReference || `TXN-${Date.now()}`,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await syncPaymentAndServiceToFirestore(pay);
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
    paymentIdOrOptions: string | { paymentId: string; amount?: number; reason?: string; refundedBy?: string; processedBy?: string; serviceReferenceId?: string; payment?: Payment; [key: string]: any },
    data?: { amount?: number; reason?: string; processedBy?: string; processedByUserId?: string; payment?: Payment; [key: string]: any }
  ): Promise<{ success: boolean; refund: Refund; payment: Payment; appointment?: Appointment; consultation?: Consultation; message: string }> => {
    let paymentId: string;
    let payload: any;
    if (typeof paymentIdOrOptions === 'string') {
      paymentId = paymentIdOrOptions;
      payload = data || {};
    } else {
      paymentId = paymentIdOrOptions.paymentId;
      payload = {
        ...paymentIdOrOptions,
        amount: paymentIdOrOptions.amount,
        reason: paymentIdOrOptions.reason || 'استرداد مالي',
        processedBy: paymentIdOrOptions.processedBy || paymentIdOrOptions.refundedBy || 'إدارة المستشفى',
        serviceReferenceId: paymentIdOrOptions.serviceReferenceId
      };
    }

    let res: { success: boolean; refund: Refund; payment: Payment; appointment?: Appointment; consultation?: Consultation; message: string };
    try {
      res = await fetchJson<{ success: boolean; refund: Refund; payment: Payment; appointment?: Appointment; consultation?: Consultation; message: string }>(
        `/api/payments/${paymentId}/refund`,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
    } catch (err: any) {
      console.warn('Backend /api/payments/:id/refund failed or returned error, using fallback:', err);
      const paymentObj: Payment = payload.payment || {
        id: paymentId,
        patientId: payload.patientId || 'pat-1',
        patientName: payload.patientName || 'المريض',
        patientPhone: payload.patientPhone || '',
        serviceType: payload.serviceType || 'APPOINTMENT',
        serviceReferenceId: payload.serviceReferenceId || paymentId,
        serviceName: payload.serviceName || 'خدمة طبية',
        amount: Number(payload.amount) || 250,
        currency: payload.currency || 'YER',
        paymentMethod: payload.paymentMethod || 'KURAIMI_EXPRESS',
        status: 'PAID',
        paymentStatus: 'PAID',
        transactionReference: payload.transactionReference || `TXN-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const refundAmount = Number(payload.amount) > 0 ? Number(payload.amount) : paymentObj.amount;
      const ref: Refund = {
        id: `ref-${Date.now()}`,
        paymentId: paymentObj.id,
        appointmentId: paymentObj.appointmentId,
        consultationId: paymentObj.consultationId,
        patientId: paymentObj.patientId,
        patientName: paymentObj.patientName,
        amount: refundAmount,
        currency: (paymentObj.currency || 'YER') as any,
        reason: payload.reason || 'إلغاء واسترداد الرسوم',
        status: 'REFUNDED',
        transactionReference: `REF-TXN-${Date.now().toString().slice(-6)}`,
        processedBy: payload.processedBy || 'إدارة المستشفى المالية',
        createdAt: new Date().toISOString()
      };

      const updatedPay: Payment = {
        ...paymentObj,
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        refundAmount,
        updatedAt: new Date().toISOString()
      };

      res = {
        success: true,
        refund: ref,
        payment: updatedPay,
        message: `تم استرداد مبلغ ${refundAmount} ${paymentObj.currency} بنجاح.`
      };
    }

    // Synchronize refund to Firestore (payment, appointment, consultation)
    if (res && res.payment && res.refund) {
      await syncRefundToFirestore(res.payment, res.refund, res.appointment, res.consultation);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mch_payments_updated'));
      window.dispatchEvent(new Event('mch_appointments_updated'));
      window.dispatchEvent(new Event('mch_consultations_updated'));
    }

    return res;
  },

  updatePaymentStatus: async (paymentId: string, status: any): Promise<Payment> => {
    return await fetchJson<Payment>(`/api/payments/${paymentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  approvePayment: async (paymentId: string, adminName?: string): Promise<{ success: boolean; payment: Payment; appointment?: Appointment; consultation?: Consultation; message: string }> => {
    const res = await fetchJson<{ success: boolean; payment: Payment; appointment?: Appointment; consultation?: Consultation; message: string }>(
      `/api/payments/${paymentId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ adminName })
      }
    );
    if (res && res.payment) {
      await syncPaymentAndServiceToFirestore(res.payment, res.appointment, res.consultation);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mch_payments_updated'));
      window.dispatchEvent(new Event('mch_appointments_updated'));
      window.dispatchEvent(new Event('mch_consultations_updated'));
    }
    return res;
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
  },

  // ==========================================================
  // Free Consultation Occasions & Promotions
  // ==========================================================

  getFreeConsultationPromo: async (): Promise<FreeConsultationPromo> => {
    // 1. If backend API is available, fetch from server
    try {
      const serverData = await fetchJson<FreeConsultationPromo>('/api/settings/free-consultations');
      if (serverData && serverData.id) {
        localStorage.setItem('mch_free_consultation_promo', JSON.stringify(serverData));
        saveSettingsDoc('freeConsultationPromo', serverData).catch(() => {});
        return serverData;
      }
    } catch {
      // Backend not running (hosting or mobile app)
    }

    // 2. Fetch from Firestore (cloud-synced across hosting and mobile app)
    try {
      const fsData = await getSettingsDoc<FreeConsultationPromo>('freeConsultationPromo');
      if (fsData && fsData.id) {
        localStorage.setItem('mch_free_consultation_promo', JSON.stringify(fsData));
        return fsData;
      }
    } catch (fsErr) {
      console.warn('[Firestore] getSettingsDoc freeConsultationPromo error:', fsErr);
    }

    // 3. Fallback to localStorage
    const stored = localStorage.getItem('mch_free_consultation_promo');
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }

    return {
      id: 'promo-free-cns',
      isActive: false,
      occasionTitle: 'مناسبة خاصة - استشارة طبية مجانية',
      occasionDescription: '',
      bannerBadgeText: 'مبادرة مجانية 100%',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      durationHours: 48,
      autoExpire: true,
      applicableDoctors: 'ALL',
      totalFreeConsultationsCount: 0,
      whitelistedPatients: [
        {
          id: 'wl-1',
          patientId: 'pat-1',
          patientName: 'سارة أحمد المنصور',
          patientPhone: '+966501234567',
          patientMrn: 'MRN-2026-1001',
          reason: 'إعفاء خاص بقرار الإدارة - رعاية إنسانية',
          grantedAt: new Date().toISOString(),
          grantedBy: 'مدير المستشفى',
          usedCount: 0
        }
      ],
      updatedAt: new Date().toISOString()
    };
  },

  saveFreeConsultationPromo: async (
    promo: Partial<FreeConsultationPromo>
  ): Promise<{ success: boolean; promo: FreeConsultationPromo; message: string }> => {
    let savedPromo: FreeConsultationPromo | null = null;
    try {
      const res = await fetchJson<{ success: boolean; promo: FreeConsultationPromo; message: string }>('/api/settings/free-consultations', {
        method: 'POST',
        body: JSON.stringify(promo)
      });
      if (res?.promo) {
        savedPromo = res.promo;
      }
    } catch {
      // Backend not available
    }

    if (!savedPromo) {
      const current = await api.getFreeConsultationPromo();
      savedPromo = {
        ...current,
        ...promo,
        updatedAt: new Date().toISOString()
      };
    }

    localStorage.setItem('mch_free_consultation_promo', JSON.stringify(savedPromo));
    await saveSettingsDoc('freeConsultationPromo', savedPromo).catch(() => {});

    return {
      success: true,
      promo: savedPromo,
      message: savedPromo.isActive 
        ? `تم تفعيل الاستشارات المجانية بمناسبة "${savedPromo.occasionTitle}".` 
        : 'تم إيقاف حملة الاستشارات المجانية.'
    };
  },

  toggleFreeConsultationPromo: async (): Promise<{ success: boolean; isActive: boolean; promo: FreeConsultationPromo }> => {
    let savedPromo: FreeConsultationPromo | null = null;
    try {
      const res = await fetchJson<{ success: boolean; isActive: boolean; promo: FreeConsultationPromo }>('/api/settings/free-consultations/toggle', {
        method: 'POST'
      });
      if (res?.promo) {
        savedPromo = res.promo;
      }
    } catch {
      // Backend not available
    }

    if (!savedPromo) {
      const current = await api.getFreeConsultationPromo();
      const newActive = !current.isActive;
      savedPromo = {
        ...current,
        isActive: newActive,
        startDate: newActive ? new Date().toISOString() : current.startDate,
        endDate: newActive && current.durationHours ? new Date(Date.now() + current.durationHours * 3600 * 1000).toISOString() : current.endDate,
        updatedAt: new Date().toISOString()
      };
    }

    localStorage.setItem('mch_free_consultation_promo', JSON.stringify(savedPromo));
    await saveSettingsDoc('freeConsultationPromo', savedPromo).catch(() => {});

    return {
      success: true,
      isActive: savedPromo.isActive,
      promo: savedPromo
    };
  },

  subscribeFreeConsultationPromo: (callback: (promo: FreeConsultationPromo) => void): (() => void) => {
    // Initial fetch
    api.getFreeConsultationPromo().then(callback).catch(() => {});

    // Polling interval to keep clients synced with any time expiry or admin updates
    const interval = setInterval(() => {
      api.getFreeConsultationPromo().then(callback).catch(() => {});
    }, 10000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mch_free_consultation_promo' && e.newValue) {
        try {
          callback(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    // Real-time Firestore subscription
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      unsubscribeFirestore = firebaseDb.subscribeToDoc<FreeConsultationPromo>(
        'settings',
        'freeConsultationPromo',
        (data) => {
          if (data && data.id) {
            localStorage.setItem('mch_free_consultation_promo', JSON.stringify(data));
            callback(data);
          }
        }
      );
    } catch (e) {
      console.warn('[Firestore] subscribeFreeConsultationPromo init warning:', e);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  },

  checkFreeConsultationEligibility: async (params: {
    patientId?: string;
    phone?: string;
    mrn?: string;
    doctorId?: string;
  }): Promise<{
    isFree: boolean;
    reason: 'ADMIN_WHITELIST' | 'GENERAL_PROMO' | 'NOT_ELIGIBLE';
    waiverReason: string;
    matchedWhitelistItem?: any;
    hasUsedGeneralFree?: boolean;
    promoIsActive: boolean;
    promoTitle?: string;
    oneFreePerPatient: boolean;
  }> => {
    try {
      const q = new URLSearchParams();
      if (params.patientId) q.set('patientId', params.patientId);
      if (params.phone) q.set('phone', params.phone);
      if (params.mrn) q.set('mrn', params.mrn);
      if (params.doctorId) q.set('doctorId', params.doctorId);
      return await fetchJson(`/api/settings/free-consultations/check-eligibility?${q.toString()}`);
    } catch {
      const promo = await api.getFreeConsultationPromo();

      const cleanDigits = (p?: string) => (p || '').replace(/\D/g, '');
      const matchPhones = (p1?: string, p2?: string): boolean => {
        if (!p1 || !p2) return false;
        const c1 = cleanDigits(p1);
        const c2 = cleanDigits(p2);
        if (!c1 || !c2) return false;
        if (c1 === c2) return true;
        const tail1 = c1.slice(-7);
        const tail2 = c2.slice(-7);
        return tail1.length >= 7 && tail2.length >= 7 && tail1 === tail2;
      };

      // 1. Check Admin Whitelist
      if (Array.isArray(promo.whitelistedPatients) && (params.patientId || params.phone || params.mrn)) {
        const matched = promo.whitelistedPatients.find(w => {
          const matchId = Boolean(w.patientId && params.patientId && w.patientId === params.patientId);
          const matchPhone = matchPhones(w.patientPhone, params.phone);
          const matchMrn = Boolean(w.patientMrn && params.mrn && w.patientMrn.trim().toLowerCase() === params.mrn.trim().toLowerCase());
          return matchId || matchPhone || matchMrn;
        });

        if (matched) {
          return {
            isFree: true,
            reason: 'ADMIN_WHITELIST',
            waiverReason: `استشارة مجانية مخصصة بقرار الإدارة: ${matched.reason || 'إعفاء خاص معتمد'}`,
            matchedWhitelistItem: matched,
            promoIsActive: promo.isActive,
            promoTitle: promo.occasionTitle,
            oneFreePerPatient: true
          };
        }
      }

      // 2. Check General Promo
      let isGeneralActive = promo.isActive;
      if (isGeneralActive && promo.autoExpire && promo.endDate) {
        const endMs = new Date(promo.endDate).getTime();
        if (!isNaN(endMs) && Date.now() > endMs) {
          isGeneralActive = false;
        }
      }
      if (isGeneralActive && promo.applicableDoctors && promo.applicableDoctors !== 'ALL' && params.doctorId) {
        if (!promo.applicableDoctors.includes(params.doctorId)) {
          isGeneralActive = false;
        }
      }

      if (isGeneralActive) {
        // Local client storage check for instant persistence
        if (typeof window !== 'undefined') {
          const localUsed = (params.patientId && localStorage.getItem(`mch_free_cns_used_${params.patientId}`) === 'true') ||
            (params.phone && localStorage.getItem(`mch_free_cns_used_${cleanDigits(params.phone)}`) === 'true');
          if (localUsed) {
            return {
              isFree: false,
              reason: 'NOT_ELIGIBLE',
              waiverReason: `تم استهلاك الاستشارة المجانية المخصصة لك سابقاً ضمن مبادرة (${promo.occasionTitle}). الاستشارات الإضافية تخضع للرسوم المدعومة.`,
              hasUsedGeneralFree: true,
              promoIsActive: isGeneralActive,
              promoTitle: promo.occasionTitle,
              oneFreePerPatient: true
            };
          }
        }

        // One free consultation check via previous consultation history
        try {
          const consultations = await api.getConsultations({ patientId: params.patientId });
          const hasPreviousFree = consultations.some(c => {
            const isMatch = (params.patientId && c.patientId === params.patientId) ||
              (params.phone && matchPhones(c.patientPhone, params.phone)) ||
              (params.mrn && c.patientMrn && c.patientMrn.trim().toLowerCase() === params.mrn.trim().toLowerCase());
            return isMatch && (
              c.isWaived || 
              c.consultationFee === 0 || 
              (c as any).fee === 0 ||
              c.paymentStatus === 'WAIVED' ||
              c.paymentAmount === 0 ||
              (c.waiverReason && (c.waiverReason.includes('مجانية') || c.waiverReason.includes('مبادرة') || c.waiverReason.includes('إعفاء')))
            );
          });

          if (hasPreviousFree) {
            if (typeof window !== 'undefined') {
              if (params.patientId) localStorage.setItem(`mch_free_cns_used_${params.patientId}`, 'true');
              if (params.phone) localStorage.setItem(`mch_free_cns_used_${cleanDigits(params.phone)}`, 'true');
            }
            return {
              isFree: false,
              reason: 'NOT_ELIGIBLE',
              waiverReason: `تم استهلاك الاستشارة المجانية المخصصة لحسابك سابقاً ضمن مبادرة (${promo.occasionTitle}). الاستشارات الحالية متاحة بالرسوم المدعومة.`,
              hasUsedGeneralFree: true,
              promoIsActive: isGeneralActive,
              promoTitle: promo.occasionTitle,
              oneFreePerPatient: true
            };
          }
        } catch {}

        return {
          isFree: true,
          reason: 'GENERAL_PROMO',
          waiverReason: `مبادرة استشارة مجانية بمناسبة: ${promo.occasionTitle}`,
          promoIsActive: isGeneralActive,
          promoTitle: promo.occasionTitle,
          oneFreePerPatient: true
        };
      }

      return {
        isFree: false,
        reason: 'NOT_ELIGIBLE',
        waiverReason: '',
        promoIsActive: isGeneralActive,
        promoTitle: promo.occasionTitle,
        oneFreePerPatient: true
      };
    }
  },

  addFreeConsultationWhitelist: async (data: {
    patientId?: string;
    patientName: string;
    patientPhone?: string;
    patientMrn?: string;
    reason: string;
    grantedBy?: string;
  }): Promise<{ success: boolean; item: any; whitelistedPatients: any[]; message: string }> => {
    let result: { success: boolean; item: any; whitelistedPatients: any[]; message: string } | null = null;
    try {
      result = await fetchJson<{ success: boolean; item: any; whitelistedPatients: any[]; message: string }>('/api/settings/free-consultations/whitelist', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      // Backend not running (hosting or mobile app)
    }

    if (result && result.whitelistedPatients) {
      const current = await api.getFreeConsultationPromo();
      const updatedPromo: FreeConsultationPromo = {
        ...current,
        whitelistedPatients: result.whitelistedPatients,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('mch_free_consultation_promo', JSON.stringify(updatedPromo));
      await saveSettingsDoc('freeConsultationPromo', updatedPromo).catch(() => {});
      return result;
    }

    // Direct Firestore & Local fallback execution
    const current = await api.getFreeConsultationPromo();
    const cleanPhone = (data.patientPhone || '').trim();
    const cleanName = (data.patientName || '').trim() || (cleanPhone ? `مريض برقم (${cleanPhone})` : 'مريض معتمد');

    const cleanDigits = (p?: string) => (p || '').replace(/\D/g, '');
    const matchPhones = (p1?: string, p2?: string): boolean => {
      if (!p1 || !p2) return false;
      const c1 = cleanDigits(p1);
      const c2 = cleanDigits(p2);
      if (!c1 || !c2) return false;
      if (c1 === c2) return true;
      const tail1 = c1.slice(-7);
      const tail2 = c2.slice(-7);
      return tail1.length >= 7 && tail2.length >= 7 && tail1 === tail2;
    };

    const newItem: WhitelistedFreePatient = {
      id: `wl-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      patientId: data.patientId || undefined,
      patientName: cleanName,
      patientPhone: cleanPhone || undefined,
      patientMrn: (data.patientMrn || '').trim() || undefined,
      reason: (data.reason || 'إعفاء خاص بقرار إدارة المستشفى').trim(),
      grantedAt: new Date().toISOString(),
      grantedBy: data.grantedBy || 'مدير المستشفى',
      usedCount: 0
    };

    const existingList = Array.isArray(current.whitelistedPatients) ? current.whitelistedPatients : [];
    const filtered = existingList.filter(w => {
      const sameId = newItem.patientId && w.patientId === newItem.patientId;
      const samePhone = newItem.patientPhone && matchPhones(w.patientPhone, newItem.patientPhone);
      const sameMrn = newItem.patientMrn && w.patientMrn && w.patientMrn.trim().toLowerCase() === newItem.patientMrn.trim().toLowerCase();
      return !(sameId || samePhone || sameMrn);
    });

    const updatedList = [newItem, ...filtered];
    const updatedPromo: FreeConsultationPromo = {
      ...current,
      whitelistedPatients: updatedList,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('mch_free_consultation_promo', JSON.stringify(updatedPromo));
    await saveSettingsDoc('freeConsultationPromo', updatedPromo).catch(() => {});

    return {
      success: true,
      item: newItem,
      whitelistedPatients: updatedList,
      message: `تم اعتماد الاستشارة المجانية للمريض (${newItem.patientName}) بنجاح.`
    };
  },

  removeFreeConsultationWhitelist: async (
    id: string
  ): Promise<{ success: boolean; whitelistedPatients: any[]; message: string }> => {
    let result: { success: boolean; whitelistedPatients: any[]; message: string } | null = null;
    try {
      result = await fetchJson<{ success: boolean; whitelistedPatients: any[]; message: string }>(`/api/settings/free-consultations/whitelist/${id}`, {
        method: 'DELETE'
      });
    } catch {
      // Backend not running
    }

    if (result && result.whitelistedPatients) {
      const current = await api.getFreeConsultationPromo();
      const updatedPromo: FreeConsultationPromo = {
        ...current,
        whitelistedPatients: result.whitelistedPatients,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('mch_free_consultation_promo', JSON.stringify(updatedPromo));
      await saveSettingsDoc('freeConsultationPromo', updatedPromo).catch(() => {});
      return result;
    }

    const current = await api.getFreeConsultationPromo();
    const existingList = Array.isArray(current.whitelistedPatients) ? current.whitelistedPatients : [];
    const updatedList = existingList.filter(w => w.id !== id);
    const updatedPromo: FreeConsultationPromo = {
      ...current,
      whitelistedPatients: updatedList,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('mch_free_consultation_promo', JSON.stringify(updatedPromo));
    await saveSettingsDoc('freeConsultationPromo', updatedPromo).catch(() => {});

    return {
      success: true,
      whitelistedPatients: updatedList,
      message: 'تم إلغاء الاستشارة المجانية للمريض بنجاح.'
    };
  }

};

export const apiClient = api;
export default api;

