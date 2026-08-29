import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore, 
  Firestore, 
  doc, 
  getDoc,
  getDocFromServer,
  getDocs, 
  setDoc,
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Unsubscribe,
  QueryConstraint,
  limit as limitTo
} from 'firebase/firestore';
import { getAuth, Auth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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

// Initialize Firebase App instance
export const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Initialize Firestore with custom database ID from config and resilient WebChannel polling
export const db: Firestore = (() => {
  try {
    const databaseId = firebaseConfig.firestoreDatabaseId || undefined;
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: false
    }, databaseId);
  } catch (e) {
    console.warn('Firestore custom initialization fallback:', e);
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
})();

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Collection Names Constants
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
  AUDIT_LOGS: 'auditLogs'
} as const;

// Test Firestore Connection Helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or database is unreachable:', error.message);
    }
    return false;
  }
}

// ----------------------------------------------------
// ASYNC FIRESTORE RETRIEVAL FUNCTIONS (getDocs / getDoc)
// ----------------------------------------------------

/**
 * Fetch a single document by collection and ID
 */
export async function fetchDocById<T>(collectionName: string, docId: string): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as unknown as T;
    }
    return null;
  } catch (err) {
    console.warn(`[Firestore] fetchDocById error (${collectionName}/${docId}):`, err);
    return null;
  }
}

/**
 * Fetch documents from a collection with query constraints (where, orderBy, limit)
 */
export async function fetchDocsWithFilter<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
  } catch (err) {
    console.warn(`[Firestore] fetchDocsWithFilter error in ${collectionName}:`, err);
    return [];
  }
}

/**
 * Retrieve user by specific UID (checks both docId and uid field)
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  if (!uid) return null;
  try {
    // 1. Direct doc ID lookup
    const userDoc = await fetchDocById<User>(FIRESTORE_COLLECTIONS.USERS, uid);
    if (userDoc) return userDoc;

    // 2. Query by 'id' or 'uid' field
    const colRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
    const q = query(colRef, where('id', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as unknown as User;
    }

    const qUid = query(colRef, where('uid', '==', uid));
    const snapUid = await getDocs(qUid);
    if (!snapUid.empty) {
      const d = snapUid.docs[0];
      return { id: d.id, ...d.data() } as unknown as User;
    }

    return null;
  } catch (err) {
    console.warn('[Firestore] getUserByUid error:', err);
    return null;
  }
}

/**
 * Retrieve user by email or phone identifier
 */
export async function getUserByEmailOrPhone(identifier: string): Promise<User | null> {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();
  try {
    const colRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
    
    // Check email
    const emailQuery = query(colRef, where('email', '==', cleanId));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const d = emailSnap.docs[0];
      return { id: d.id, ...d.data() } as unknown as User;
    }

    // Check phone
    const trimmedPhone = identifier.trim();
    const phoneQuery = query(colRef, where('phone', '==', trimmedPhone));
    const phoneSnap = await getDocs(phoneQuery);
    if (!phoneSnap.empty) {
      const d = phoneSnap.docs[0];
      return { id: d.id, ...d.data() } as unknown as User;
    }

    // Check phone digits variation
    const digits = trimmedPhone.replace(/[^0-9]/g, '');
    if (digits && digits !== trimmedPhone) {
      const digitQuery = query(colRef, where('phone', '==', digits));
      const digitSnap = await getDocs(digitQuery);
      if (!digitSnap.empty) {
        const d = digitSnap.docs[0];
        return { id: d.id, ...d.data() } as unknown as User;
      }
    }

    return null;
  } catch (err) {
    console.warn('[Firestore] getUserByEmailOrPhone error:', err);
    return null;
  }
}

/**
 * Retrieve patient profile by user ID or patient ID
 */
export async function getPatientByUserId(userId: string): Promise<Patient | null> {
  if (!userId) return null;
  try {
    const directDoc = await fetchDocById<Patient>(FIRESTORE_COLLECTIONS.PATIENTS, userId);
    if (directDoc) return directDoc;

    const colRef = collection(db, FIRESTORE_COLLECTIONS.PATIENTS);
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as unknown as Patient;
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] getPatientByUserId error:', err);
    return null;
  }
}

/**
 * Retrieve doctor profile by user ID or doctor ID
 */
export async function getDoctorByUserId(userId: string): Promise<Doctor | null> {
  if (!userId) return null;
  try {
    const directDoc = await fetchDocById<Doctor>(FIRESTORE_COLLECTIONS.DOCTORS, userId);
    if (directDoc) return directDoc;

    const colRef = collection(db, FIRESTORE_COLLECTIONS.DOCTORS);
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as unknown as Doctor;
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] getDoctorByUserId error:', err);
    return null;
  }
}

/**
 * Retrieve all doctors with optional filters
 */
export async function getDoctorsWithFilter(options?: { specialtyId?: string; activeOnly?: boolean }): Promise<Doctor[]> {
  try {
    const constraints: QueryConstraint[] = [];
    if (options?.specialtyId) {
      constraints.push(where('specialtyId', '==', options.specialtyId));
    }
    if (options?.activeOnly) {
      constraints.push(where('isActive', '==', true));
    }
    return await fetchDocsWithFilter<Doctor>(FIRESTORE_COLLECTIONS.DOCTORS, constraints);
  } catch (err) {
    console.warn('[Firestore] getDoctorsWithFilter error:', err);
    return [];
  }
}

/**
 * Retrieve appointments with filter constraints
 */
export async function getAppointmentsWithFilter(filter?: { patientId?: string; doctorId?: string; status?: string }): Promise<Appointment[]> {
  try {
    const all = await fetchDocsWithFilter<Appointment>(FIRESTORE_COLLECTIONS.APPOINTMENTS);
    let list = all;
    if (filter?.patientId) {
      list = list.filter(a => a.patientId === filter.patientId || (a as any).patientUserId === filter.patientId || a.patientPhone === filter.patientId);
    }
    if (filter?.doctorId) {
      list = list.filter(a => a.doctorId === filter.doctorId || (a as any).doctorUserId === filter.doctorId);
    }
    if (filter?.status) {
      list = list.filter(a => a.status === filter.status);
    }
    list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    return list;
  } catch (err) {
    console.warn('[Firestore] getAppointmentsWithFilter error:', err);
    return [];
  }
}

/**
 * Retrieve consultations with filter constraints
 */
export async function getConsultationsWithFilter(filter?: { 
  patientId?: string; 
  patientUserId?: string;
  patientPhone?: string;
  doctorId?: string; 
  status?: string 
}): Promise<Consultation[]> {
  try {
    const all = await fetchDocsWithFilter<Consultation>(FIRESTORE_COLLECTIONS.CONSULTATIONS);
    let list = all;
    if (filter?.patientId || filter?.patientUserId || filter?.patientPhone) {
      const pId = (filter.patientId || '').toLowerCase().trim();
      const pUserId = (filter.patientUserId || '').toLowerCase().trim();
      const pPhone = (filter.patientPhone || '').replace(/\D/g, '');

      list = list.filter(c => {
        const cPatId = (c.patientId || '').toLowerCase().trim();
        const cPatUserId = ((c as any).patientUserId || '').toLowerCase().trim();
        const cPhone = (c.patientPhone || '').replace(/\D/g, '');

        if (pId && (cPatId === pId || cPatUserId === pId)) return true;
        if (pUserId && (cPatId === pUserId || cPatUserId === pUserId)) return true;
        if (pPhone && cPhone && (cPhone.includes(pPhone) || pPhone.includes(cPhone))) return true;
        // Demo patient fallback matching
        if ((pId === 'pat-1' || pUserId === 'usr-pat-1') && (cPatId === 'pat-1' || cPatId === 'usr-pat-1')) return true;
        return false;
      });
    }
    if (filter?.doctorId) {
      list = list.filter(c => c.doctorId === filter.doctorId || (c as any).doctorUserId === filter.doctorId);
    }
    if (filter?.status) {
      list = list.filter(c => c.status === filter.status);
    }
    list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    return list;
  } catch (err) {
    console.warn('[Firestore] getConsultationsWithFilter error:', err);
    return [];
  }
}

// ----------------------------------------------------
// REALTIME SNAPSHOT SUBSCRIPTIONS (onSnapshot)
// ----------------------------------------------------

/**
 * Realtime subscription to a collection with optional filters
 */
export function subscribeToCollection<T>(
  collectionName: string,
  callback: (items: T[]) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe {
  try {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...constraints);
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
        callback(items);
      },
      (error) => {
        console.warn(`[Firestore onSnapshot] ${collectionName} subscription error:`, error);
      }
    );
  } catch (err) {
    console.warn(`[Firestore onSnapshot setup] error in ${collectionName}:`, err);
    return () => {};
  }
}

/**
 * Realtime subscription to a single document
 */
export function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  callback: (item: T | null) => void
): Unsubscribe {
  if (!docId) return () => {};
  try {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback({ id: snapshot.id, ...snapshot.data() } as unknown as T);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn(`[Firestore onSnapshot doc] ${collectionName}/${docId} error:`, error);
      }
    );
  } catch (err) {
    console.warn(`[Firestore onSnapshot doc setup] error:`, err);
    return () => {};
  }
}

/**
 * Realtime subscription to user profile by UID
 */
export function subscribeToUser(uid: string, callback: (user: User | null) => void): Unsubscribe {
  return subscribeToDoc<User>(FIRESTORE_COLLECTIONS.USERS, uid, callback);
}

/**
 * Realtime subscription to doctors list
 */
export function subscribeToDoctors(
  callback: (doctors: Doctor[]) => void,
  options?: { specialtyId?: string; activeOnly?: boolean }
): Unsubscribe {
  const constraints: QueryConstraint[] = [];
  if (options?.specialtyId) constraints.push(where('specialtyId', '==', options.specialtyId));
  if (options?.activeOnly) constraints.push(where('isActive', '==', true));
  return subscribeToCollection<Doctor>(FIRESTORE_COLLECTIONS.DOCTORS, callback, constraints);
}

/**
 * Realtime subscription to patient appointments
 */
export function subscribeToAppointments(
  filter: { patientId?: string; doctorId?: string; status?: string },
  callback: (apts: Appointment[]) => void
): Unsubscribe {
  return subscribeToCollection<Appointment>(
    FIRESTORE_COLLECTIONS.APPOINTMENTS,
    (allItems) => {
      let list = allItems;
      if (filter.patientId) {
        list = list.filter(a => a.patientId === filter.patientId || (a as any).patientUserId === filter.patientId || a.patientPhone === filter.patientId);
      }
      if (filter.doctorId) {
        list = list.filter(a => a.doctorId === filter.doctorId || (a as any).doctorUserId === filter.doctorId);
      }
      if (filter.status) {
        list = list.filter(a => a.status === filter.status);
      }
      list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      callback(list);
    }
  );
}

/**
 * Realtime subscription to consultations
 */
export function subscribeToConsultations(
  filter: { 
    patientId?: string; 
    patientUserId?: string;
    patientPhone?: string;
    doctorId?: string; 
    status?: string 
  },
  callback: (cns: Consultation[]) => void
): Unsubscribe {
  return subscribeToCollection<Consultation>(
    FIRESTORE_COLLECTIONS.CONSULTATIONS,
    (allItems) => {
      let list = allItems;
      if (filter.patientId || filter.patientUserId || filter.patientPhone) {
        const pId = (filter.patientId || '').toLowerCase().trim();
        const pUserId = (filter.patientUserId || '').toLowerCase().trim();
        const pPhone = (filter.patientPhone || '').replace(/\D/g, '');

        list = list.filter(c => {
          const cPatId = (c.patientId || '').toLowerCase().trim();
          const cPatUserId = ((c as any).patientUserId || '').toLowerCase().trim();
          const cPhone = (c.patientPhone || '').replace(/\D/g, '');

          if (pId && (cPatId === pId || cPatUserId === pId)) return true;
          if (pUserId && (cPatId === pUserId || cPatUserId === pUserId)) return true;
          if (pPhone && cPhone && (cPhone.includes(pPhone) || pPhone.includes(cPhone))) return true;
          // Demo patient fallback matching
          if ((pId === 'pat-1' || pUserId === 'usr-pat-1') && (cPatId === 'pat-1' || cPatId === 'usr-pat-1')) return true;
          return false;
        });
      }
      if (filter.doctorId) {
        list = list.filter(c => c.doctorId === filter.doctorId || (c as any).doctorUserId === filter.doctorId);
      }
      if (filter.status) {
        list = list.filter(c => c.status === filter.status);
      }
      list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      callback(list);
    }
  );
}

/**
 * Realtime subscription to payments
 */
export function subscribeToPayments(
  filter: {
    patientId?: string;
    doctorId?: string;
    status?: string;
  },
  callback: (payments: Payment[]) => void
): Unsubscribe {
  return subscribeToCollection<Payment>(
    FIRESTORE_COLLECTIONS.PAYMENTS,
    (allPayments) => {
      let list = [...allPayments];
      if (filter.patientId) {
        list = list.filter(p => p.patientId === filter.patientId || (p as any).patientUserId === filter.patientId);
      }
      if (filter.doctorId) {
        list = list.filter(p => p.doctorId === filter.doctorId);
      }
      if (filter.status) {
        list = list.filter(p => p.paymentStatus === filter.status || p.status === filter.status);
      }
      list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      callback(list);
    }
  );
}

/**
 * Realtime subscription to follow-up appointments
 */
export function subscribeToFollowUps(
  filter: {
    patientId?: string;
    doctorId?: string;
  },
  callback: (followUps: FollowUpAppointment[]) => void
): Unsubscribe {
  return subscribeToCollection<FollowUpAppointment>(
    FIRESTORE_COLLECTIONS.FOLLOW_UPS,
    (allFollowUps) => {
      let list = [...allFollowUps];
      if (filter.patientId) {
        list = list.filter(f => f.patientId === filter.patientId);
      }
      if (filter.doctorId) {
        list = list.filter(f => f.doctorId === filter.doctorId);
      }
      list.sort((a, b) => new Date(a.followUpDate || '').getTime() - new Date(b.followUpDate || '').getTime());
      callback(list);
    }
  );
}

/**
 * Realtime subscription to notifications by user ID
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifs: AppNotification[]) => void
): Unsubscribe {
  const constraints: QueryConstraint[] = [];
  if (userId) constraints.push(where('userId', '==', userId));
  return subscribeToCollection<AppNotification>(FIRESTORE_COLLECTIONS.NOTIFICATIONS, callback, constraints);
}

/**
 * Creates a Firebase Authentication user on the client side
 * using an isolated secondary app instance so the currently logged-in admin session is NOT signed out.
 */
export async function createFirebaseAuthAccount(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ uid: string; email: string }> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const tempAppName = `temp_creator_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let tempApp: FirebaseApp | null = null;
  
  try {
    tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    const credential = await createUserWithEmailAndPassword(
      tempAuth,
      normalizedEmail,
      params.password.trim()
    );
    
    if (credential.user && params.displayName) {
      try {
        await updateProfile(credential.user, {
          displayName: params.displayName.trim()
        });
      } catch (profileErr) {
        console.warn('Could not update displayName in Firebase Auth:', profileErr);
      }
    }
    
    const uid = credential.user.uid;
    const email = credential.user.email || normalizedEmail;
    return { uid, email };
  } catch (error: any) {
    console.error('Firebase createFirebaseAuthAccount failed:', error?.code, error?.message);
    throw error;
  } finally {
    if (tempApp) {
      try {
        await deleteApp(tempApp);
      } catch (delErr) {
        console.warn('Could not delete temporary secondary Firebase app:', delErr);
      }
    }
  }
}

export { firebaseConfig };
export default { 
  app, 
  db, 
  auth, 
  firebaseConfig, 
  testFirestoreConnection,
  createFirebaseAuthAccount,
  fetchDocById,
  fetchDocsWithFilter,
  getUserByUid,
  getUserByEmailOrPhone,
  getPatientByUserId,
  getDoctorByUserId,
  getDoctorsWithFilter,
  getAppointmentsWithFilter,
  getConsultationsWithFilter,
  subscribeToCollection,
  subscribeToDoc,
  subscribeToUser,
  subscribeToDoctors,
  subscribeToAppointments,
  subscribeToConsultations,
  subscribeToPayments,
  subscribeToFollowUps,
  subscribeToNotifications
};

