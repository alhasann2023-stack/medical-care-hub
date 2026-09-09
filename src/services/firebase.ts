<<<<<<< HEAD
import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { 
=======

import {
  initializeApp,
  getApps,
  getApp,
  deleteApp,
  FirebaseApp
} from 'firebase/app';

import {
>>>>>>> 7a37a2c (update)
  initializeFirestore,
  getFirestore,
  Firestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  QueryConstraint
} from 'firebase/firestore';

import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

import firebaseConfig from '../../firebase-applet-config.json';

import {
  User,
  Doctor,
  Patient,
  Staff,
  Appointment,
  Consultation,
  Payment,
  FollowUpAppointment,
  Refund,
  ReminderSchedule,
  MedicalReport,
  MedicalTest,
  MedicalExamination,
  Prescription,
  AppNotification,
  AuditLog,
  Specialty,
  MedicalService
} from '../types/medical';

// ============================================================
// FIREBASE APP
// ============================================================

export const app: FirebaseApp =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// ============================================================
// FIRESTORE
// ============================================================

<<<<<<< HEAD
// Initialize Firebase Analytics (conditionally in browser environment)
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        console.warn('Firebase Analytics initialization notice:', err);
      }
    }
  }).catch(() => {});
}

// Initialize Firestore with custom database ID from config and resilient WebChannel polling
=======
>>>>>>> 7a37a2c (update)
export const db: Firestore = (() => {
  try {
    const databaseId =
      firebaseConfig.firestoreDatabaseId || undefined;

    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        experimentalForceLongPolling: false
      },
      databaseId
    );

  } catch (e) {

    console.warn(
      'Firestore custom initialization fallback:',
      e
    );

    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(
          app,
          firebaseConfig.firestoreDatabaseId
        )
      : getFirestore(app);
  }
})();

// ============================================================
// FIREBASE AUTHENTICATION
// ============================================================

export const auth: Auth =
  getAuth(app);

// ============================================================
// FIRESTORE COLLECTION NAMES
// ============================================================

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  PATIENTS: 'patients',
  DOCTORS: 'doctors',
  STAFF: 'staff',
  SPECIALTIES: 'specialties',
  SERVICES: 'services',
  PAYMENTS: 'payments',
  APPOINTMENTS: 'appointments',
  CONSULTATIONS: 'consultations',
  FOLLOW_UPS: 'followUpAppointments',
  REFUNDS: 'refunds',
  REMINDERS: 'reminderSchedules',
  EXAMINATIONS: 'examinations',
  TESTS: 'tests',
  REPORTS: 'reports',
  PRESCRIPTIONS: 'prescriptions',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
<<<<<<< HEAD
  USER_CREDENTIALS: 'userCredentials'
=======
  USER_CREDENTIALS: 'userCredentials',
  SETTINGS: 'settings'
>>>>>>> 7a37a2c (update)
} as const;

// ============================================================
// FIRESTORE CONNECTION TEST
// ============================================================

export async function testFirestoreConnection(): Promise<boolean> {

  try {

    await getDocFromServer(
      doc(
        db,
        'test',
        'connection'
      )
    );

    return true;

  } catch (error: any) {

    if (
      error instanceof Error &&
      error.message.includes(
        'the client is offline'
      )
    ) {

      console.warn(
        'Firebase client is offline or database is unreachable:',
        error.message
      );
    }

    return false;
  }
}

// ============================================================
// ASYNC FIRESTORE RETRIEVAL
// ============================================================

/**
 * Fetch a single document by collection and ID.
 */
export async function fetchDocById<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {

  try {

    const docRef =
      doc(
        db,
        collectionName,
        docId
      );

    const snap =
      await getDoc(docRef);

    if (snap.exists()) {

      return {
        id: snap.id,
        ...snap.data()
      } as unknown as T;
    }

    return null;

  } catch (err) {

    console.warn(
      `[Firestore] fetchDocById error (${collectionName}/${docId}):`,
      err
    );

    return null;
  }
}

/**
 * Fetch documents from a collection.
 */
export async function fetchDocsWithFilter<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {

  try {

    const colRef =
      collection(
        db,
        collectionName
      );

    const q =
      query(
        colRef,
        ...constraints
      );

    const snap =
      await getDocs(q);

    return snap.docs.map(
      (d) => ({
        id: d.id,
        ...d.data()
      } as unknown as T)
    );

  } catch (err) {

    console.warn(
      `[Firestore] fetchDocsWithFilter error in ${collectionName}:`,
      err
    );

    return [];
  }
}

// ============================================================
// USER RETRIEVAL
// ============================================================

/**
 * Retrieve user by UID.
 */
export async function getUserByUid(
  uid: string
): Promise<User | null> {

  if (!uid) {
    return null;
  }

  try {

    // Direct document ID lookup.
    const userDoc =
      await fetchDocById<User>(
        FIRESTORE_COLLECTIONS.USERS,
        uid
      );

    if (userDoc) {
      return userDoc;
    }

    // Query by id field.
    const colRef =
      collection(
        db,
        FIRESTORE_COLLECTIONS.USERS
      );

    const q =
      query(
        colRef,
        where(
          'id',
          '==',
          uid
        )
      );

    const snap =
      await getDocs(q);

    if (!snap.empty) {

      const d =
        snap.docs[0];

      return {
        id: d.id,
        ...d.data()
      } as unknown as User;
    }

    // Query by uid field.
    const qUid =
      query(
        colRef,
        where(
          'uid',
          '==',
          uid
        )
      );

    const snapUid =
      await getDocs(qUid);

    if (!snapUid.empty) {

      const d =
        snapUid.docs[0];

      return {
        id: d.id,
        ...d.data()
      } as unknown as User;
    }

    return null;

  } catch (err) {

    console.warn(
      '[Firestore] getUserByUid error:',
      err
    );

    return null;
  }
}

/**
 * Retrieve user by email or phone.
 */
export async function getUserByEmailOrPhone(
  identifier: string
): Promise<User | null> {

  if (!identifier) {
    return null;
  }

  const cleanId =
    identifier.trim().toLowerCase();

  try {

    const colRef =
      collection(
        db,
        FIRESTORE_COLLECTIONS.USERS
      );

    // Email.
    const emailQuery =
      query(
        colRef,
        where(
          'email',
          '==',
          cleanId
        )
      );

    const emailSnap =
      await getDocs(emailQuery);

    if (!emailSnap.empty) {

      const d =
        emailSnap.docs[0];

      return {
        id: d.id,
        ...d.data()
      } as unknown as User;
    }

    // Phone.
    const trimmedPhone =
      identifier.trim();

    const phoneQuery =
      query(
        colRef,
        where(
          'phone',
          '==',
          trimmedPhone
        )
      );

    const phoneSnap =
      await getDocs(phoneQuery);

    if (!phoneSnap.empty) {

      const d =
        phoneSnap.docs[0];

      return {
        id: d.id,
        ...d.data()
      } as unknown as User;
    }

    // Phone digits variation.
    const digits =
      trimmedPhone.replace(
        /[^0-9]/g,
        ''
      );

    if (
      digits &&
      digits !== trimmedPhone
    ) {

      const digitQuery =
        query(
          colRef,
          where(
            'phone',
            '==',
            digits
          )
        );

      const digitSnap =
        await getDocs(digitQuery);

      if (!digitSnap.empty) {

        const d =
          digitSnap.docs[0];

        return {
          id: d.id,
          ...d.data()
        } as unknown as User;
      }
    }

    return null;

  } catch (err) {

    console.warn(
      '[Firestore] getUserByEmailOrPhone error:',
      err
    );

    return null;
  }
}

// ============================================================
// PATIENT
// ============================================================

export async function getPatientByUserId(
  userId: string
): Promise<Patient | null> {

  if (!userId) {
    return null;
  }

  try {

    const directDoc =
      await fetchDocById<Patient>(
        FIRESTORE_COLLECTIONS.PATIENTS,
        userId
      );

    if (directDoc) {
      return directDoc;
    }

    const colRef =
      collection(
        db,
        FIRESTORE_COLLECTIONS.PATIENTS
      );

    const q =
      query(
        colRef,
        where(
          'userId',
          '==',
          userId
        )
      );

    const snap =
      await getDocs(q);

    if (!snap.empty) {

      const d =
        snap.docs[0];

      return {
        id: d.id,
        ...d.data()
      } as unknown as Patient;
    }

    return null;

  } catch (err) {

    console.warn(
      '[Firestore] getPatientByUserId error:',
      err
    );

    return null;
  }
}

// ============================================================
// DOCTOR
// ============================================================

export async function getDoctorByUserId(
  userId: string
): Promise<Doctor | null> {

  if (!userId) {
    return null;
  }

  try {

    const directDoc =
      await fetchDocById<Doctor>(
        FIRESTORE_COLLECTIONS.DOCTORS,
        userId
      );

    if (directDoc) {
      return directDoc;
    }

    const colRef =
      collection(
        db,
        FIRESTORE_COLLECTIONS.DOCTORS
      );

    const q =
      query(
        colRef,
        where(
          'userId',
          '==',
          userId
        )
      );

    const snap =
      await getDocs(q);

    if (!snap.empty) {

      const d =
        snap.docs[0];

      return {
        id: d.id,
        ...d.data()
      } as unknown as Doctor;
    }

    return null;

  } catch (err) {

    console.warn(
      '[Firestore] getDoctorByUserId error:',
      err
    );

    return null;
  }
}

<<<<<<< HEAD
/**
 * Retrieve staff profile by user ID or staff ID
 */
export async function getStaffByUserId(userId: string): Promise<Staff | null> {
  if (!userId) return null;
  try {
    const directDoc = await fetchDocById<Staff>(FIRESTORE_COLLECTIONS.STAFF, userId);
    if (directDoc) return directDoc;

    const colRef = collection(db, FIRESTORE_COLLECTIONS.STAFF);
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as unknown as Staff;
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] getStaffByUserId error:', err);
    return null;
  }
}

/**
 * Retrieve user credential record by userId, email, or phone
 */
export async function getUserCredentialDoc(userIdOrIdentifier: string): Promise<{ userId: string; password?: string; email?: string; phone?: string } | null> {
  if (!userIdOrIdentifier) return null;
  const clean = userIdOrIdentifier.trim();
  try {
    // 1. Direct doc lookup by userId
    const direct = await fetchDocById<{ userId: string; password?: string; email?: string; phone?: string }>(FIRESTORE_COLLECTIONS.USER_CREDENTIALS, clean);
    if (direct && direct.password) return direct;

    const colRef = collection(db, FIRESTORE_COLLECTIONS.USER_CREDENTIALS);
    // 2. Query by userId
    const qUser = query(colRef, where('userId', '==', clean));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      return snapUser.docs[0].data() as any;
    }

    // 3. Query by email
    const qEmail = query(colRef, where('email', '==', clean.toLowerCase()));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return snapEmail.docs[0].data() as any;
    }

    // 4. Query by phone
    const qPhone = query(colRef, where('phone', '==', clean));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) {
      return snapPhone.docs[0].data() as any;
    }

    // 5. Query by digits
    const digits = clean.replace(/[^0-9]/g, '');
    if (digits && digits !== clean) {
      const qDigits = query(colRef, where('phone', '==', digits));
      const snapDigits = await getDocs(qDigits);
      if (!snapDigits.empty) {
        return snapDigits.docs[0].data() as any;
      }
    }

    return null;
  } catch (err) {
    console.warn('[Firestore] getUserCredentialDoc error:', err);
    return null;
  }
}

/**
 * Persist user credential to Firestore
 */
export async function saveUserCredentialDoc(cred: { userId: string; password?: string; email?: string; phone?: string }): Promise<boolean> {
  if (!cred || !cred.userId) return false;
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.USER_CREDENTIALS, cred.userId.trim());
    await setDoc(docRef, {
      ...cred,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] saveUserCredentialDoc error:', err);
    return false;
  }
}

/**
 * Retrieve all doctors with optional filters
 */
export async function getDoctorsWithFilter(options?: { specialtyId?: string; activeOnly?: boolean }): Promise<Doctor[]> {
=======
// ============================================================
// STAFF
// ============================================================

export async function getStaffByUserId(
  userId: string
): Promise<Staff | null> {

  if (!userId) {
    return null;
  }

>>>>>>> 7a37a2c (update)
  try {

    const directDoc =
      await fetchDocById<Staff>(
        FIRESTORE_COLLECTIONS.STAFF,
        userId
      );

    if (directDoc) {
      return directDoc;
    }

    const colRef =
      collection(
        db,
        FIRESTORE_COLLECTIONS.STAFF
      );

    const q =
      query(
        colRef,
        where(
          'userId',
          '==',
          userId
        )
      );

    const snap =
      await getDocs(q);

    if (!snap.empty) {

      const d =
        snap.docs[0];

      return {
        id: d.id,
        ...d.data()
      } as unknown as Staff;
    }

    return null;

  } catch (err) {

    console.warn(
      '[Firestore] getStaffByUserId error:',
      err
    );

    return null;
  }
}

// ============================================================
// USER CREDENTIALS
// ============================================================

export async function getUserCredentialDoc(
  userIdOrIdentifier: string
): Promise<{
  userId: string;
  password?: string;
  email?: string;
  phone?: string;
} | null> {

  if (!userIdOrIdentifier) {
    return null;
  }

  const clean =
    userIdOrIdentifier.trim();

  try {
<<<<<<< HEAD
    const all = await fetchDocsWithFilter<Appointment>(FIRESTORE_COLLECTIONS.APPOINTMENTS);
    let list = all;
    if (filter?.patientId) {
      const qPat = filter.patientId.toLowerCase().trim();
      list = list.filter(a => 
        (a.patientId && a.patientId.toLowerCase().trim() === qPat) || 
        ((a as any).patientUserId && (a as any).patientUserId.toLowerCase().trim() === qPat) || 
        (a.patientPhone && a.patientPhone.replace(/\D/g, '') === qPat.replace(/\D/g, ''))
      );
    }
    if (filter?.doctorId) {
      const qDoc = filter.doctorId.toLowerCase().trim();
      list = list.filter(a => 
        (a.doctorId && a.doctorId.toLowerCase().trim() === qDoc) || 
        ((a as any).doctorUserId && (a as any).doctorUserId.toLowerCase().trim() === qDoc)
      );
=======

    // Direct lookup.
    const direct =
      await fetchDocById<{
        userId: string;
        password?: string;
        email?: string;
        phone?: string;
      }>(
        FIRESTORE_COLLECTIONS.USER_CREDENTIALS,
        clean
      );

    if (
      direct &&
      direct.password
    ) {
      return direct;
    }

    const colRef =
      collection(
        db,
        FIRESTORE_COLLECTIONS.USER_CREDENTIALS
      );

    // User ID.
    const qUser =
      query(
        colRef,
        where(
          'userId',
          '==',
          clean
        )
      );

    const snapUser =
      await getDocs(qUser);

    if (!snapUser.empty) {
      return snapUser.docs[0].data() as any;
>>>>>>> 7a37a2c (update)
    }

    // Email.
    const qEmail =
      query(
        colRef,
        where(
          'email',
          '==',
          clean.toLowerCase()
        )
      );

    const snapEmail =
      await getDocs(qEmail);

    if (!snapEmail.empty) {
      return snapEmail.docs[0].data() as any;
    }

    // Phone.
    const qPhone =
      query(
        colRef,
        where(
          'phone',
          '==',
          clean
        )
      );

    const snapPhone =
      await getDocs(qPhone);

    if (!snapPhone.empty) {
      return snapPhone.docs[0].data() as any;
    }

    // Digits.
    const digits =
      clean.replace(
        /[^0-9]/g,
        ''
      );

    if (
      digits &&
      digits !== clean
    ) {

      const qDigits =
        query(
          colRef,
          where(
            'phone',
            '==',
            digits
          )
        );

      const snapDigits =
        await getDocs(qDigits);

      if (!snapDigits.empty) {
        return snapDigits.docs[0].data() as any;
      }
    }

    return null;

  } catch (err) {

    console.warn(
      '[Firestore] getUserCredentialDoc error:',
      err
    );

    return null;
  }
}

export async function saveUserCredentialDoc(
  cred: {
    userId: string;
    password?: string;
    email?: string;
    phone?: string;
  }
): Promise<boolean> {

  if (
    !cred ||
    !cred.userId
  ) {
    return false;
  }

  try {

    const docRef =
      doc(
        db,
        FIRESTORE_COLLECTIONS.USER_CREDENTIALS,
        cred.userId.trim()
      );

    await setDoc(
      docRef,
      {
        ...cred,
        updatedAt:
          new Date().toISOString()
      },
      {
        merge: true
      }
    );

    return true;

  } catch (err) {

    console.warn(
      '[Firestore] saveUserCredentialDoc error:',
      err
    );

    return false;
  }
}

// ============================================================
// SETTINGS
// ============================================================

export async function saveSettingsDoc<
  T extends Record<string, any>
>(
  settingId: string,
  data: T
): Promise<boolean> {

  if (
    !settingId ||
    !data
  ) {
    return false;
  }

  try {

    const docRef =
      doc(
        db,
        FIRESTORE_COLLECTIONS.SETTINGS,
        settingId.trim()
      );

    await setDoc(
      docRef,
      {
        ...data,
        updatedAt:
          new Date().toISOString()
      },
      {
        merge: true
      }
    );

    return true;

  } catch (err) {

    console.warn(
      `[Firestore] saveSettingsDoc error (${settingId}):`,
      err
    );

    return false;
  }
}

export async function getSettingsDoc<T>(
  settingId: string
): Promise<T | null> {

  if (!settingId) {
    return null;
  }

  return await fetchDocById<T>(
    FIRESTORE_COLLECTIONS.SETTINGS,
    settingId.trim()
  );
}

// ============================================================
// GENERIC DOCUMENT OPERATIONS
// ============================================================

export async function saveDocument<
  T extends Record<string, any>
>(
  collectionName: string,
  docId: string,
  data: T
): Promise<boolean> {

  if (
    !collectionName ||
    !docId ||
    !data
  ) {
    return false;
  }

  try {

    const docRef =
      doc(
        db,
        collectionName.trim(),
        docId.trim()
      );

    await setDoc(
      docRef,
      {
        ...data,
        updatedAt:
          new Date().toISOString()
      },
      {
        merge: true
      }
    );

    return true;

  } catch (err) {

    console.warn(
      `[Firestore] saveDocument error in ${collectionName}/${docId}:`,
      err
    );

    return false;
  }
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<boolean> {

  if (
    !collectionName ||
    !docId
  ) {
    return false;
  }

  try {

    const docRef =
      doc(
        db,
        collectionName.trim(),
        docId.trim()
      );

    await deleteDoc(docRef);

    return true;

  } catch (err) {

    console.warn(
      `[Firestore] deleteDocument error in ${collectionName}/${docId}:`,
      err
    );

    return false;
  }
}

// ============================================================
// DOCTORS
// ============================================================

export async function getDoctorsWithFilter(
  options?: {
    specialtyId?: string;
    activeOnly?: boolean;
  }
): Promise<Doctor[]> {

  try {

    const constraints:
      QueryConstraint[] = [];

    if (
      options?.specialtyId
    ) {

      constraints.push(
        where(
          'specialtyId',
          '==',
          options.specialtyId
        )
      );
    }

    if (
      options?.activeOnly
    ) {

      constraints.push(
        where(
          'isActive',
          '==',
          true
        )
      );
    }

    return await fetchDocsWithFilter<Doctor>(
      FIRESTORE_COLLECTIONS.DOCTORS,
      constraints
    );

  } catch (err) {

    console.warn(
      '[Firestore] getDoctorsWithFilter error:',
      err
    );

    return [];
  }
}

// ============================================================
// APPOINTMENTS
// ============================================================

export async function getAppointmentsWithFilter(
  filter?: {
    patientId?: string;
    doctorId?: string;
    status?: string;
  }
): Promise<Appointment[]> {

  try {

    const all =
      await fetchDocsWithFilter<Appointment>(
        FIRESTORE_COLLECTIONS.APPOINTMENTS
      );

    let list = all;

    if (
      filter?.patientId
    ) {

      const qPat =
        filter.patientId
          .toLowerCase()
          .trim();

      list =
        list.filter(
          (a) =>
            (
              a.patientId &&
              a.patientId
                .toLowerCase()
                .trim() === qPat
            ) ||
            (
              (a as any).patientUserId &&
              (a as any).patientUserId
                .toLowerCase()
                .trim() === qPat
            ) ||
            (
              a.patientPhone &&
              a.patientPhone.replace(
                /\D/g,
                ''
              ) ===
                qPat.replace(
                  /\D/g,
                  ''
                )
            )
        );
    }

    if (
      filter?.doctorId
    ) {

      const qDoc =
        filter.doctorId
          .toLowerCase()
          .trim();

      list =
        list.filter(
          (a) =>
            (
              a.doctorId &&
              a.doctorId
                .toLowerCase()
                .trim() === qDoc
            ) ||
            (
              (a as any).doctorUserId &&
              (a as any).doctorUserId
                .toLowerCase()
                .trim() === qDoc
            )
        );
    }

    if (
      filter?.status
    ) {

      list =
        list.filter(
          (a) =>
            a.status ===
            filter.status
        );
    }

    list.sort(
      (a, b) =>
        new Date(
          b.createdAt || ''
        ).getTime() -
        new Date(
          a.createdAt || ''
        ).getTime()
    );

    return list;

  } catch (err) {

    console.warn(
      '[Firestore] getAppointmentsWithFilter error:',
      err
    );

    return [];
  }
}

// ============================================================
// CONSULTATIONS
// ============================================================

export async function getConsultationsWithFilter(
  filter?: {
    patientId?: string;
    patientUserId?: string;
    patientPhone?: string;
    doctorId?: string;
    status?: string;
  }
): Promise<Consultation[]> {

  try {

    const all =
      await fetchDocsWithFilter<Consultation>(
        FIRESTORE_COLLECTIONS.CONSULTATIONS
      );

    let list = all;

    if (
      filter?.patientId ||
      filter?.patientUserId ||
      filter?.patientPhone
    ) {

      const pId =
        (
          filter.patientId ||
          ''
        )
          .toLowerCase()
          .trim();

      const pUserId =
        (
          filter.patientUserId ||
          ''
        )
          .toLowerCase()
          .trim();

      const pPhone =
        (
          filter.patientPhone ||
          ''
        ).replace(
          /\D/g,
          ''
        );

      list =
        list.filter(
          (c) => {

            const cPatId =
              (
                c.patientId ||
                ''
              )
                .toLowerCase()
                .trim();

            const cPatUserId =
              (
                (c as any).patientUserId ||
                ''
              )
                .toLowerCase()
                .trim();

            const cPhone =
              (
                c.patientPhone ||
                ''
              ).replace(
                /\D/g,
                ''
              );

            if (
              pId &&
              (
                cPatId === pId ||
                cPatUserId === pId
              )
            ) {
              return true;
            }

            if (
              pUserId &&
              (
                cPatId === pUserId ||
                cPatUserId === pUserId
              )
            ) {
              return true;
            }

            if (
              pPhone &&
              cPhone &&
              (
                cPhone.includes(pPhone) ||
                pPhone.includes(cPhone)
              )
            ) {
              return true;
            }

            return false;
          }
        );
    }

    if (
      filter?.doctorId
    ) {

      list =
        list.filter(
          (c) =>
            c.doctorId ===
              filter.doctorId ||
            (c as any).doctorUserId ===
              filter.doctorId
        );
    }

    if (
      filter?.status
    ) {

      list =
        list.filter(
          (c) =>
            c.status ===
            filter.status
        );
    }

    list.sort(
      (a, b) =>
        new Date(
          b.createdAt || ''
        ).getTime() -
        new Date(
          a.createdAt || ''
        ).getTime()
    );

    return list;

  } catch (err) {

    console.warn(
      '[Firestore] getConsultationsWithFilter error:',
      err
    );

    return [];
  }
}

// ============================================================
// PAYMENTS
// ============================================================

export async function getPaymentsWithFilter(
  filter?: {
    patientId?: string;
    doctorId?: string;
    status?: string;
    search?: string;
  }
): Promise<Payment[]> {

  try {

    const all =
      await fetchDocsWithFilter<Payment>(
        FIRESTORE_COLLECTIONS.PAYMENTS
      );

    let list = all;

    if (
      filter?.patientId
    ) {

      list =
        list.filter(
          (p) =>
            p.patientId ===
              filter.patientId ||
            (p as any).patientUserId ===
              filter.patientId
        );
    }

    if (
      filter?.doctorId
    ) {

      list =
        list.filter(
          (p) =>
            p.doctorId ===
            filter.doctorId
        );
    }

    if (
      filter?.status
    ) {

      list =
        list.filter(
          (p) =>
            p.paymentStatus ===
              filter.status ||
            p.status ===
              filter.status
        );
    }

    if (
      filter?.search
    ) {

      const q =
        filter.search
          .toLowerCase();

      list =
        list.filter(
          (p) =>
            (
              p.patientName &&
              p.patientName
                .toLowerCase()
                .includes(q)
            ) ||
            (
              p.receiptNumber &&
              p.receiptNumber
                .toLowerCase()
                .includes(q)
            ) ||
            (
              p.transactionReference &&
              p.transactionReference
                .toLowerCase()
                .includes(q)
            ) ||
            (
              p.serviceName &&
              p.serviceName
                .toLowerCase()
                .includes(q)
            )
        );
    }

    list.sort(
      (a, b) =>
        new Date(
          b.createdAt || ''
        ).getTime() -
        new Date(
          a.createdAt || ''
        ).getTime()
    );

    return list;

  } catch (err) {

    console.warn(
      '[Firestore] getPaymentsWithFilter error:',
      err
    );

    return [];
  }
}

// ============================================================
// REALTIME SNAPSHOT
// ============================================================

export function subscribeToCollection<T>(
  collectionName: string,
  callback: (
    items: T[]
  ) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe {

  try {

    const colRef =
      collection(
        db,
        collectionName
      );

    const q =
      query(
        colRef,
        ...constraints
      );

    return onSnapshot(
      q,

      (snapshot) => {

        const items =
          snapshot.docs.map(
            (d) =>
              ({
                id: d.id,
                ...d.data()
              } as unknown as T)
          );

        callback(items);
      },

      (error) => {

        console.warn(
          `[Firestore onSnapshot] ${collectionName} subscription error:`,
          error
        );
      }
    );

  } catch (err) {

    console.warn(
      `[Firestore onSnapshot setup] error in ${collectionName}:`,
      err
    );

    return () => {};
  }
}

export function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  callback: (
    item: T | null
  ) => void
): Unsubscribe {

  if (!docId) {
    return () => {};
  }

  try {

    const docRef =
      doc(
        db,
        collectionName,
        docId
      );

    return onSnapshot(
      docRef,

      (snapshot) => {

        if (snapshot.exists()) {

          callback(
            {
              id: snapshot.id,
              ...snapshot.data()
            } as unknown as T
          );

        } else {

          callback(null);
        }
      },

      (error) => {

        console.warn(
          `[Firestore onSnapshot doc] ${collectionName}/${docId} error:`,
          error
        );
      }
    );

  } catch (err) {

    console.warn(
      `[Firestore onSnapshot doc setup] error:`,
      err
    );

    return () => {};
  }
}

export function subscribeToUser(
  uid: string,
  callback: (
    user: User | null
  ) => void
): Unsubscribe {

  return subscribeToDoc<User>(
    FIRESTORE_COLLECTIONS.USERS,
    uid,
    callback
  );
}

export function subscribeToDoctors(
  callback: (
    doctors: Doctor[]
  ) => void,
  options?: {
    specialtyId?: string;
    activeOnly?: boolean;
  }
): Unsubscribe {

  const constraints:
    QueryConstraint[] = [];

  if (
    options?.specialtyId
  ) {

    constraints.push(
      where(
        'specialtyId',
        '==',
        options.specialtyId
      )
    );
  }

  if (
    options?.activeOnly
  ) {

    constraints.push(
      where(
        'isActive',
        '==',
        true
      )
    );
  }

  return subscribeToCollection<Doctor>(
    FIRESTORE_COLLECTIONS.DOCTORS,
    callback,
    constraints
  );
}

export function subscribeToAppointments(
  filter: {
    patientId?: string;
    doctorId?: string;
    status?: string;
  },
  callback: (
    apts: Appointment[]
  ) => void
): Unsubscribe {

  return subscribeToCollection<Appointment>(
    FIRESTORE_COLLECTIONS.APPOINTMENTS,

    (allItems) => {
<<<<<<< HEAD
      let list = allItems;
      if (filter.patientId) {
        const qPat = filter.patientId.toLowerCase().trim();
        list = list.filter(a => 
          (a.patientId && a.patientId.toLowerCase().trim() === qPat) || 
          ((a as any).patientUserId && (a as any).patientUserId.toLowerCase().trim() === qPat) || 
          (a.patientPhone && a.patientPhone.replace(/\D/g, '') === qPat.replace(/\D/g, ''))
        );
      }
      if (filter.doctorId) {
        const qDoc = filter.doctorId.toLowerCase().trim();
        list = list.filter(a => 
          (a.doctorId && a.doctorId.toLowerCase().trim() === qDoc) || 
          ((a as any).doctorUserId && (a as any).doctorUserId.toLowerCase().trim() === qDoc)
        );
=======

      let list =
        allItems;

      if (
        filter.patientId
      ) {

        const qPat =
          filter.patientId
            .toLowerCase()
            .trim();

        list =
          list.filter(
            (a) =>
              (
                a.patientId &&
                a.patientId
                  .toLowerCase()
                  .trim() === qPat
              ) ||
              (
                (a as any).patientUserId &&
                (a as any).patientUserId
                  .toLowerCase()
                  .trim() === qPat
              ) ||
              (
                a.patientPhone &&
                a.patientPhone.replace(
                  /\D/g,
                  ''
                ) ===
                  qPat.replace(
                    /\D/g,
                    ''
                  )
              )
          );
      }

      if (
        filter.doctorId
      ) {

        const qDoc =
          filter.doctorId
            .toLowerCase()
            .trim();

        list =
          list.filter(
            (a) =>
              (
                a.doctorId &&
                a.doctorId
                  .toLowerCase()
                  .trim() === qDoc
              ) ||
              (
                (a as any).doctorUserId &&
                (a as any).doctorUserId
                  .toLowerCase()
                  .trim() === qDoc
              )
          );
>>>>>>> 7a37a2c (update)
      }

      if (
        filter.status
      ) {

        list =
          list.filter(
            (a) =>
              a.status ===
              filter.status
          );
      }

      list.sort(
        (a, b) =>
          new Date(
            b.createdAt || ''
          ).getTime() -
          new Date(
            a.createdAt || ''
          ).getTime()
      );

      callback(list);
    }
  );
}

export function subscribeToConsultations(
  filter: {
    patientId?: string;
    patientUserId?: string;
    patientPhone?: string;
    doctorId?: string;
    status?: string;
  },
  callback: (
    cns: Consultation[]
  ) => void
): Unsubscribe {

  return subscribeToCollection<Consultation>(
    FIRESTORE_COLLECTIONS.CONSULTATIONS,

    (allItems) => {

      let list =
        allItems;

      if (
        filter.patientId ||
        filter.patientUserId ||
        filter.patientPhone
      ) {

        const pId =
          (
            filter.patientId ||
            ''
          )
            .toLowerCase()
            .trim();

        const pUserId =
          (
            filter.patientUserId ||
            ''
          )
            .toLowerCase()
            .trim();

        const pPhone =
          (
            filter.patientPhone ||
            ''
          ).replace(
            /\D/g,
            ''
          );

        list =
          list.filter(
            (c) => {

              const cPatId =
                (
                  c.patientId ||
                  ''
                )
                  .toLowerCase()
                  .trim();

              const cPatUserId =
                (
                  (c as any).patientUserId ||
                  ''
                )
                  .toLowerCase()
                  .trim();

              const cPhone =
                (
                  c.patientPhone ||
                  ''
                ).replace(
                  /\D/g,
                  ''
                );

              if (
                pId &&
                (
                  cPatId === pId ||
                  cPatUserId === pId
                )
              ) {
                return true;
              }

              if (
                pUserId &&
                (
                  cPatId === pUserId ||
                  cPatUserId === pUserId
                )
              ) {
                return true;
              }

              if (
                pPhone &&
                cPhone &&
                (
                  cPhone.includes(pPhone) ||
                  pPhone.includes(cPhone)
                )
              ) {
                return true;
              }

              return false;
            }
          );
      }

      if (
        filter.doctorId
      ) {

        list =
          list.filter(
            (c) =>
              c.doctorId ===
                filter.doctorId ||
              (c as any).doctorUserId ===
                filter.doctorId
          );
      }

      if (
        filter.status
      ) {

        list =
          list.filter(
            (c) =>
              c.status ===
              filter.status
          );
      }

      list.sort(
        (a, b) =>
          new Date(
            b.createdAt || ''
          ).getTime() -
          new Date(
            a.createdAt || ''
          ).getTime()
      );

      callback(list);
    }
  );
}

export function subscribeToPayments(
  filter: {
    patientId?: string;
    doctorId?: string;
    status?: string;
  },
  callback: (
    payments: Payment[]
  ) => void
): Unsubscribe {

  return subscribeToCollection<Payment>(
    FIRESTORE_COLLECTIONS.PAYMENTS,

    (allPayments) => {

      let list =
        [...allPayments];

      if (
        filter.patientId
      ) {

        list =
          list.filter(
            (p) =>
              p.patientId ===
                filter.patientId ||
              (p as any).patientUserId ===
                filter.patientId
          );
      }

      if (
        filter.doctorId
      ) {

        list =
          list.filter(
            (p) =>
              p.doctorId ===
              filter.doctorId
          );
      }

      if (
        filter.status
      ) {

        list =
          list.filter(
            (p) =>
              p.paymentStatus ===
                filter.status ||
              p.status ===
                filter.status
          );
      }

      list.sort(
        (a, b) =>
          new Date(
            b.createdAt || ''
          ).getTime() -
          new Date(
            a.createdAt || ''
          ).getTime()
      );

      callback(list);
    }
  );
}

export function subscribeToFollowUps(
  filter: {
    patientId?: string;
    doctorId?: string;
  },
  callback: (
    followUps: FollowUpAppointment[]
  ) => void
): Unsubscribe {

  return subscribeToCollection<FollowUpAppointment>(
    FIRESTORE_COLLECTIONS.FOLLOW_UPS,

    (allFollowUps) => {

      let list =
        [...allFollowUps];

      if (
        filter.patientId
      ) {

        list =
          list.filter(
            (f) =>
              f.patientId ===
              filter.patientId
          );
      }

      if (
        filter.doctorId
      ) {

        list =
          list.filter(
            (f) =>
              f.doctorId ===
              filter.doctorId
          );
      }

      list.sort(
        (a, b) =>
          new Date(
            a.followUpDate || ''
          ).getTime() -
          new Date(
            b.followUpDate || ''
          ).getTime()
      );

      callback(list);
    }
  );
}

export function subscribeToStaff(
  callback: (
    staff: Staff[]
  ) => void
): Unsubscribe {

  return subscribeToCollection<Staff>(
    FIRESTORE_COLLECTIONS.STAFF,

    (allStaff) => {

      const list =
        [...allStaff].sort(
          (a, b) =>
            new Date(
              b.createdAt || ''
            ).getTime() -
            new Date(
              a.createdAt || ''
            ).getTime()
        );

      callback(list);
    }
  );
}

export function subscribeToNotifications(
  userId: string,
  callback: (
    notifs: AppNotification[]
  ) => void
): Unsubscribe {

  const constraints:
    QueryConstraint[] = [];

  if (userId) {

    constraints.push(
      where(
        'userId',
        '==',
        userId
      )
    );
  }

  return subscribeToCollection<AppNotification>(
    FIRESTORE_COLLECTIONS.NOTIFICATIONS,
    callback,
    constraints
  );
}

// ============================================================
// FIREBASE AUTH ACCOUNT CREATION
// ============================================================

export async function createFirebaseAuthAccount(
  params: {
    email: string;
    password: string;
    displayName: string;
  }
): Promise<{
  uid: string;
  email: string;
}> {

  const normalizedEmail =
    params.email
      .trim()
      .toLowerCase();

  const tempAppName =
    `temp_creator_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;

  let tempApp:
    FirebaseApp | null = null;

  try {

    tempApp =
      initializeApp(
        firebaseConfig,
        tempAppName
      );

    const tempAuth =
      getAuth(tempApp);

    let uid = '';
    let email =
      normalizedEmail;

    try {

      const credential =
        await createUserWithEmailAndPassword(
          tempAuth,
          normalizedEmail,
          params.password.trim()
        );

      if (
        credential.user &&
        params.displayName
      ) {

        try {

          await updateProfile(
            credential.user,
            {
              displayName:
                params.displayName.trim()
            }
          );

        } catch (profileErr) {

          console.warn(
            'Could not update displayName in Firebase Auth:',
            profileErr
          );
        }
      }

      uid =
        credential.user.uid;

      email =
        credential.user.email ||
        normalizedEmail;

    } catch (createErr: any) {

      if (
        createErr?.code ===
        'auth/email-already-in-use'
      ) {

        try {

          const signInCred =
            await signInWithEmailAndPassword(
              tempAuth,
              normalizedEmail,
              params.password.trim()
            );

          uid =
            signInCred.user.uid;

          email =
            signInCred.user.email ||
            normalizedEmail;

        } catch (signInErr) {

          const existingUserDoc =
            await getUserByEmailOrPhone(
              normalizedEmail
            );

          if (
            existingUserDoc &&
            existingUserDoc.id
          ) {

            uid =
              existingUserDoc.id;

          } else {

            throw createErr;
          }
        }

      } else {

        throw createErr;
      }
    }

    return {
      uid,
      email
    };

  } catch (error: any) {

    console.error(
      'Firebase createFirebaseAuthAccount notice:',
      error?.code,
      error?.message
    );

    throw error;

  } finally {

    if (tempApp) {

      try {

        await deleteApp(
          tempApp
        );

      } catch (delErr) {

        console.warn(
          'Could not delete temporary secondary Firebase app:',
          delErr
        );
      }
    }
  }
}

<<<<<<< HEAD
export { firebaseConfig };
export default { 
  app, 
  analytics,
  db, 
  auth, 
  firebaseConfig, 
=======
// ============================================================
// EXPORTS
// ============================================================

export {
  firebaseConfig
};

export default {
  app,
  db,
  auth,
  firebaseConfig,

>>>>>>> 7a37a2c (update)
  testFirestoreConnection,

  createFirebaseAuthAccount,

  fetchDocById,
  fetchDocsWithFilter,

  saveSettingsDoc,
  getSettingsDoc,

  saveDocument,
  deleteDocument,

  getUserByUid,
  getUserByEmailOrPhone,

  getPatientByUserId,
  getDoctorByUserId,

  getDoctorsWithFilter,
  getAppointmentsWithFilter,
  getConsultationsWithFilter,
  getPaymentsWithFilter,

  subscribeToCollection,
  subscribeToDoc,
  subscribeToUser,
  subscribeToDoctors,
  subscribeToAppointments,
  subscribeToConsultations,
  subscribeToPayments,
  subscribeToStaff,
  subscribeToFollowUps,
  subscribeToNotifications
};
