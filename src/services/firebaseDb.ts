import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  writeBatch,
  onSnapshot,
  Unsubscribe,
  QueryConstraint
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  db, 
  auth, 
  FIRESTORE_COLLECTIONS,
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
  subscribeToNotifications
} from './firebase';
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
} from '../types/medical';
import {
  INITIAL_USERS,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_SPECIALTIES,
  INITIAL_SERVICES
} from '../data/seedData';

// Firestore collection names
export const COLLECTIONS = FIRESTORE_COLLECTIONS;

export const firebaseDb = {
  // Auth Operations
  registerWithEmail: async (email: string, pass: string) => {
    return await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  },

  loginWithEmail: async (email: string, pass: string) => {
    return await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  },

  signOutUser: async () => {
    return await fbSignOut(auth);
  },

  // Document Operations
  saveDocument: async (collectionName: string, docId: string, data: any) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      console.warn(`Firestore save error in ${collectionName}:`, error);
      return false;
    }
  },

  deleteDocument: async (collectionName: string, docId: string) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.warn(`Firestore delete error in ${collectionName}:`, error);
      return false;
    }
  },

  getDocument: async <T>(collectionName: string, docId: string): Promise<T | null> => {
    return await fetchDocById<T>(collectionName, docId);
  },

  // Entity Specific Savers
  saveUser: async (user: User) => {
    return await firebaseDb.saveDocument(COLLECTIONS.USERS, user.id, user);
  },

  savePatient: async (patient: Patient) => {
    return await firebaseDb.saveDocument(COLLECTIONS.PATIENTS, patient.id, patient);
  },

  saveDoctor: async (doctor: Doctor) => {
    return await firebaseDb.saveDocument(COLLECTIONS.DOCTORS, doctor.id, doctor);
  },

  deleteDoctor: async (doctorId: string) => {
    return await firebaseDb.deleteDocument(COLLECTIONS.DOCTORS, doctorId);
  },

  saveStaff: async (staff: Staff) => {
    return await firebaseDb.saveDocument(COLLECTIONS.STAFF, staff.id, staff);
  },

  saveSpecialty: async (specialty: Specialty) => {
    return await firebaseDb.saveDocument(COLLECTIONS.SPECIALTIES, specialty.id, specialty);
  },

  saveService: async (service: MedicalService) => {
    return await firebaseDb.saveDocument(COLLECTIONS.SERVICES, service.id, service);
  },

  deleteService: async (serviceId: string) => {
    return await firebaseDb.deleteDocument(COLLECTIONS.SERVICES, serviceId);
  },

  saveAppointment: async (appointment: Appointment) => {
    return await firebaseDb.saveDocument(COLLECTIONS.APPOINTMENTS, appointment.id, appointment);
  },

  saveConsultation: async (consultation: Consultation) => {
    return await firebaseDb.saveDocument(COLLECTIONS.CONSULTATIONS, consultation.id, consultation);
  },

  saveExamination: async (examination: MedicalExamination) => {
    return await firebaseDb.saveDocument(COLLECTIONS.EXAMINATIONS, examination.id, examination);
  },

  saveTest: async (test: MedicalTest) => {
    return await firebaseDb.saveDocument(COLLECTIONS.TESTS, test.id, test);
  },

  saveReport: async (report: MedicalReport) => {
    return await firebaseDb.saveDocument(COLLECTIONS.REPORTS, report.id, report);
  },

  savePrescription: async (prescription: Prescription) => {
    return await firebaseDb.saveDocument(COLLECTIONS.PRESCRIPTIONS, prescription.id, prescription);
  },

  saveNotification: async (notification: AppNotification) => {
    return await firebaseDb.saveDocument(COLLECTIONS.NOTIFICATIONS, notification.id, notification);
  },

  saveAuditLog: async (auditLog: AuditLog) => {
    return await firebaseDb.saveDocument(COLLECTIONS.AUDIT_LOGS, auditLog.id, auditLog);
  },

  // Collection Query Helpers with getDocs and constraints
  getCollection: async <T>(collectionName: string, constraints: QueryConstraint[] = []): Promise<T[]> => {
    return await fetchDocsWithFilter<T>(collectionName, constraints);
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    return await getUserByEmailOrPhone(email);
  },

  getUserByUid: async (uid: string): Promise<User | null> => {
    return await getUserByUid(uid);
  },

  getPatientByUserId: async (userId: string): Promise<Patient | null> => {
    return await getPatientByUserId(userId);
  },

  getDoctorByUserId: async (userId: string): Promise<Doctor | null> => {
    return await getDoctorByUserId(userId);
  },

  getDoctors: async (options?: { specialtyId?: string; activeOnly?: boolean }): Promise<Doctor[]> => {
    return await getDoctorsWithFilter(options);
  },

  getAppointments: async (filter?: { patientId?: string; doctorId?: string; status?: string }): Promise<Appointment[]> => {
    return await getAppointmentsWithFilter(filter);
  },

  getConsultations: async (filter?: { patientId?: string; doctorId?: string; status?: string }): Promise<Consultation[]> => {
    return await getConsultationsWithFilter(filter);
  },

  // Initial Seeder to guarantee Firestore database has all default structures and data
  seedInitialDataIfEmpty: async (): Promise<boolean> => {
    try {
      // 1. Check & Seed Specialties
      const existingSpecialties = await fetchDocsWithFilter<Specialty>(COLLECTIONS.SPECIALTIES);
      if (existingSpecialties.length === 0) {
        console.log('[Firestore] Seeding initial medical specialties into Firestore...');
        for (const spec of INITIAL_SPECIALTIES) {
          await firebaseDb.saveSpecialty(spec);
        }
      }

      // 2. Check & Seed Services
      const existingServices = await fetchDocsWithFilter<MedicalService>(COLLECTIONS.SERVICES);
      if (existingServices.length === 0) {
        console.log('[Firestore] Seeding initial medical services into Firestore...');
        for (const srv of INITIAL_SERVICES) {
          await firebaseDb.saveService(srv);
        }
      }

      // 3. Check & Seed Doctors
      const existingDoctors = await fetchDocsWithFilter<Doctor>(COLLECTIONS.DOCTORS);
      if (existingDoctors.length === 0) {
        console.log('[Firestore] Seeding initial doctors into Firestore...');
        for (const doc of INITIAL_DOCTORS) {
          await firebaseDb.saveDoctor(doc);
        }
      }

      // 4. Check & Seed Users & Profiles
      for (const u of INITIAL_USERS) {
        const existingU = await getUserByEmailOrPhone(u.email);
        if (!existingU) {
          await firebaseDb.saveUser(u);
        }
      }

      // 5. Check & Seed Default Patient
      const existingPatients = await fetchDocsWithFilter<Patient>(COLLECTIONS.PATIENTS);
      if (existingPatients.length === 0) {
        for (const pat of INITIAL_PATIENTS) {
          await firebaseDb.savePatient(pat);
        }
      }

      return true;
    } catch (e) {
      console.warn('[Firestore] Seed check warning:', e);
      return false;
    }
  },

  // Real-time Subscriptions
  subscribeToDoc: <T>(collectionName: string, docId: string, callback: (data: T | null) => void): Unsubscribe => {
    return subscribeToDoc<T>(collectionName, docId, callback);
  },

  subscribeToCollection: <T>(collectionName: string, callback: (data: T[]) => void, constraints: QueryConstraint[] = []): Unsubscribe => {
    return subscribeToCollection<T>(collectionName, callback, constraints);
  },

  subscribeToUser: (uid: string, callback: (user: User | null) => void): Unsubscribe => {
    return subscribeToUser(uid, callback);
  },

  subscribeToDoctors: (callback: (doctors: Doctor[]) => void, options?: { specialtyId?: string; activeOnly?: boolean }): Unsubscribe => {
    return subscribeToDoctors(callback, options);
  },

  subscribeToAppointments: (filter: { patientId?: string; doctorId?: string; status?: string }, callback: (apts: Appointment[]) => void): Unsubscribe => {
    return subscribeToAppointments(filter, callback);
  },

  subscribeToConsultations: (filter: { patientId?: string; doctorId?: string; status?: string }, callback: (cns: Consultation[]) => void): Unsubscribe => {
    return subscribeToConsultations(filter, callback);
  },

  subscribeToNotifications: (userId: string, callback: (notifs: AppNotification[]) => void): Unsubscribe => {
    return subscribeToNotifications(userId, callback);
  }
};


