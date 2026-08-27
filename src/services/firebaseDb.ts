import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  where,
  QueryConstraint,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut
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
  Payment,
  FollowUpAppointment,
  Refund,
  ReminderSchedule,
  MedicalExamination,
  MedicalTest,
  MedicalReport,
  Prescription,
  AppNotification,
  AuditLog
} from '../types/medical';

import {
  INITIAL_USERS,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_STAFF,
  INITIAL_SPECIALTIES,
  INITIAL_SERVICES,
  INITIAL_PAYMENTS,
  INITIAL_FOLLOW_UPS,
  INITIAL_REFUNDS,
  INITIAL_REMINDERS
} from '../data/seedData';

// ============================================================
// FIRESTORE COLLECTIONS
// ============================================================

export const COLLECTIONS = FIRESTORE_COLLECTIONS;

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * إزالة undefined بشكل عميق من objects و arrays.
 * هذا يمنع Firestore من رفض البيانات بسبب:
 * "Unsupported field value: undefined"
 */
function removeUndefined<T>(value: T): T {
  if (value === undefined) {
    return undefined as T;
  }

  if (value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => removeUndefined(item)) as T;
  }

  if (typeof value === 'object') {
    const source = value as Record<string, any>;
    const cleaned: Record<string, any> = {};

    for (const [key, item] of Object.entries(source)) {
      if (item !== undefined) {
        cleaned[key] = removeUndefined(item);
      }
    }

    return cleaned as T;
  }

  return value;
}

/**
 * التحقق من صلاحية اسم المجموعة.
 */
function isValidCollectionName(collectionName: unknown): collectionName is string {
  return (
    typeof collectionName === 'string' &&
    collectionName.trim().length > 0
  );
}

/**
 * التحقق من صلاحية معرف المستند.
 */
function isValidDocumentId(docId: unknown): docId is string {
  return (
    typeof docId === 'string' &&
    docId.trim().length > 0
  );
}

/**
 * تنظيف معرفات Firestore.
 */
function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

// ============================================================
// FIREBASE DB SERVICE
// ============================================================

export const firebaseDb = {

  // ==========================================================
  // AUTH OPERATIONS
  // ==========================================================

  registerWithEmail: async (
    email: string,
    pass: string
  ) => {
    return await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      pass
    );
  },

  loginWithEmail: async (
    email: string,
    pass: string
  ) => {
    return await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      pass
    );
  },

  signOutUser: async () => {
    return await fbSignOut(auth);
  },

  // ==========================================================
  // DOCUMENT OPERATIONS
  // ==========================================================

  saveDocument: async (
    collectionName: string,
    docId: string,
    data: any
  ) => {

    try {

      // حماية من collectionName === undefined
      if (!isValidCollectionName(collectionName)) {
        console.error(
          '[Firestore] saveDocument aborted: collectionName is undefined or empty.',
          {
            collectionName,
            docId
          }
        );

        return false;
      }

      // حماية من docId === undefined
      if (!isValidDocumentId(docId)) {
        console.error(
          '[Firestore] saveDocument aborted: docId is undefined or empty.',
          {
            collectionName,
            docId
          }
        );

        return false;
      }

      const cleanCollectionName = collectionName.trim();
      const cleanDocId = docId.trim();

      const docRef = doc(
        db,
        cleanCollectionName,
        cleanDocId
      );

      // تنظيف undefined بشكل عميق
      const cleanData = removeUndefined(
        data || {}
      );

      await setDoc(
        docRef,
        {
          ...cleanData,
          updatedAt: new Date().toISOString()
        },
        {
          merge: true
        }
      );

      return true;

    } catch (error) {

      console.error(
        `[Firestore] saveDocument error in ${collectionName}/${docId}:`,
        error
      );

      return false;
    }
  },

  deleteDocument: async (
    collectionName: string,
    docId: string
  ) => {

    try {

      if (!isValidCollectionName(collectionName)) {
        console.error(
          '[Firestore] deleteDocument aborted: invalid collectionName.',
          collectionName
        );

        return false;
      }

      if (!isValidDocumentId(docId)) {
        console.error(
          '[Firestore] deleteDocument aborted: invalid docId.',
          docId
        );

        return false;
      }

      const docRef = doc(
        db,
        collectionName.trim(),
        docId.trim()
      );

      await deleteDoc(docRef);

      return true;

    } catch (error) {

      console.warn(
        `Firestore delete error in ${collectionName}/${docId}:`,
        error
      );

      return false;
    }
  },

  getDocument: async <T>(
    collectionName: string,
    docId: string
  ): Promise<T | null> => {

    if (!isValidCollectionName(collectionName)) {
      console.error(
        '[Firestore] getDocument aborted: invalid collectionName.',
        collectionName
      );

      return null;
    }

    if (!isValidDocumentId(docId)) {
      console.error(
        '[Firestore] getDocument aborted: invalid docId.',
        docId
      );

      return null;
    }

    return await fetchDocById<T>(
      collectionName,
      docId
    );
  },

  // ==========================================================
  // ENTITY SAVERS
  // ==========================================================

  saveUser: async (
    user: User
  ) => {

    const id = normalizeId(user?.id);

    if (!id) {
      console.error(
        '[Firestore] saveUser aborted: invalid user id.',
        user
      );

      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.USERS,
      id,
      user
    );
  },

  savePatient: async (
    patient: Patient
  ) => {

    const id = normalizeId(patient?.id);

    if (!id) {
      console.error(
        '[Firestore] savePatient aborted: invalid patient id.',
        patient
      );

      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.PATIENTS,
      id,
      patient
    );
  },

  saveDoctor: async (
    doctor: Doctor
  ) => {

    const id = normalizeId(doctor?.id);

    if (!id) {
      console.error(
        '[Firestore] saveDoctor aborted: invalid doctor id.',
        doctor
      );

      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.DOCTORS,
      id,
      doctor
    );
  },

  deleteDoctor: async (
    doctorId: string
  ) => {

    return await firebaseDb.deleteDocument(
      COLLECTIONS.DOCTORS,
      doctorId
    );
  },

  saveStaff: async (
    staff: Staff
  ) => {

    const id = normalizeId(staff?.id);

    if (!id) {
      console.error(
        '[Firestore] saveStaff aborted: invalid staff id.',
        staff
      );

      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.STAFF,
      id,
      staff
    );
  },

  saveSpecialty: async (
    specialty: Specialty
  ) => {

    const id = normalizeId(specialty?.id);

    if (!id) {
      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.SPECIALTIES,
      id,
      specialty
    );
  },

  saveService: async (
    service: MedicalService
  ) => {

    const id = normalizeId(service?.id);

    if (!id) {
      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.SERVICES,
      id,
      service
    );
  },

  deleteService: async (
    serviceId: string
  ) => {

    return await firebaseDb.deleteDocument(
      COLLECTIONS.SERVICES,
      serviceId
    );
  },

  saveAppointment: async (
    appointment: Appointment
  ) => {

    const id = normalizeId(appointment?.id);

    if (!id) {
      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.APPOINTMENTS,
      id,
      appointment
    );
  },

  saveConsultation: async (
    consultation: Consultation
  ) => {

    const id = normalizeId(consultation?.id);

    if (!id) {
      console.error(
        '[Firestore] saveConsultation aborted: invalid consultation id.',
        consultation
      );

      return false;
    }

    const cleanConsultation =
      removeUndefined(consultation);

    return await firebaseDb.saveDocument(
      COLLECTIONS.CONSULTATIONS,
      id,
      cleanConsultation
    );
  },

  saveExamination: async (
    examination: MedicalExamination
  ) => {

    const id = normalizeId(examination?.id);

    if (!id) {
      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.EXAMINATIONS,
      id,
      examination
    );
  },

  saveTest: async (
    test: MedicalTest
  ) => {

    const id = normalizeId(test?.id);

    if (!id) {
      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.TESTS,
      id,
      test
    );
  },

  saveReport: async (
    report: MedicalReport
  ) => {

    const id = normalizeId(report?.id);

    if (!id) {
      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.REPORTS,
      id,
      report
    );
  },

  savePrescription: async (
    prescription: Prescription
  ) => {

    const id = normalizeId(prescription?.id);

    if (!id) {
      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.PRESCRIPTIONS,
      id,
      prescription
    );
  },

  saveNotification: async (
    notification: AppNotification
  ) => {

    const id = normalizeId(notification?.id);
    const userId = normalizeId(notification?.userId);

    /**
     * مهم:
     * Firestore يرفض notification بدون userId.
     *
     * لذلك:
     * - إذا userId موجود: نحفظ الإشعار.
     * - إذا userId غير موجود: لا نحاول الكتابة ونطبع تحذير واضح.
     */
    if (!userId) {

      console.warn(
        '[Firestore] Notification skipped because userId is missing:',
        notification
      );

      return false;
    }

    if (!id) {

      console.warn(
        '[Firestore] Notification skipped because id is missing:',
        notification
      );

      return false;
    }

    const cleanNotification: AppNotification =
      removeUndefined({
        ...notification,
        id,
        userId
      });

    return await firebaseDb.saveDocument(
      COLLECTIONS.NOTIFICATIONS,
      id,
      cleanNotification
    );
  },

  saveAuditLog: async (
    auditLog: AuditLog
  ) => {

    const id = normalizeId(auditLog?.id);

    if (!id) {
      return false;
    }

    return await firebaseDb.saveDocument(
      COLLECTIONS.AUDIT_LOGS,
      id,
      auditLog
    );
  },

  // ==========================================================
  // COLLECTION HELPERS
  // ==========================================================

  getCollection: async <T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> => {

    if (!isValidCollectionName(collectionName)) {
      console.error(
        '[Firestore] getCollection aborted: invalid collectionName.',
        collectionName
      );

      return [];
    }

    return await fetchDocsWithFilter<T>(
      collectionName,
      constraints
    );
  },

  // ==========================================================
  // USER HELPERS
  // ==========================================================

  getUserByEmail: async (
    email: string
  ): Promise<User | null> => {

    if (!email?.trim()) {
      return null;
    }

    return await getUserByEmailOrPhone(
      email
    );
  },

  getUserByUid: async (
    uid: string
  ): Promise<User | null> => {

    if (!uid?.trim()) {
      return null;
    }

    return await getUserByUid(uid);
  },

  getPatientByUserId: async (
    userId: string
  ): Promise<Patient | null> => {

    if (!userId?.trim()) {
      return null;
    }

    return await getPatientByUserId(
      userId
    );
  },

  getDoctorByUserId: async (
    userId: string
  ): Promise<Doctor | null> => {

    if (!userId?.trim()) {
      return null;
    }

    return await getDoctorByUserId(
      userId
    );
  },

  getDoctors: async (
    options?: {
      specialtyId?: string;
      activeOnly?: boolean;
    }
  ): Promise<Doctor[]> => {

    return await getDoctorsWithFilter(
      options
    );
  },

  getAppointments: async (
    filter?: {
      patientId?: string;
      doctorId?: string;
      status?: string;
    }
  ): Promise<Appointment[]> => {

    return await getAppointmentsWithFilter(
      filter
    );
  },

  getConsultations: async (
    filter?: {
      patientId?: string;
      doctorId?: string;
      status?: string;
    }
  ): Promise<Consultation[]> => {

    return await getConsultationsWithFilter(
      filter
    );
  },

  // ==========================================================
  // INITIAL SEEDER
  // ==========================================================

  seedInitialDataIfEmpty:
    async (): Promise<boolean> => {

      try {

        // ------------------------------------------------------
        // 1. Specialties
        // ------------------------------------------------------

        const existingSpecialties =
          await fetchDocsWithFilter<Specialty>(
            COLLECTIONS.SPECIALTIES
          );

        if (
          existingSpecialties.length === 0
        ) {

          console.log(
            '[Firestore] Seeding specialties...'
          );

          for (
            const spec of INITIAL_SPECIALTIES
          ) {
            await firebaseDb.saveSpecialty(
              spec
            );
          }
        }

        // ------------------------------------------------------
        // 2. Services
        // ------------------------------------------------------

        const existingServices =
          await fetchDocsWithFilter<MedicalService>(
            COLLECTIONS.SERVICES
          );

        if (
          existingServices.length === 0
        ) {

          console.log(
            '[Firestore] Seeding services...'
          );

          for (
            const service of INITIAL_SERVICES
          ) {
            await firebaseDb.saveService(
              service
            );
          }
        }

        // ------------------------------------------------------
        // 3. Doctors
        // ------------------------------------------------------

        const existingDoctors =
          await fetchDocsWithFilter<Doctor>(
            COLLECTIONS.DOCTORS
          );

        if (
          existingDoctors.length === 0
        ) {

          console.log(
            '[Firestore] Seeding doctors...'
          );

          for (
            const doctor of INITIAL_DOCTORS
          ) {
            await firebaseDb.saveDoctor(
              doctor
            );
          }
        }

        // ------------------------------------------------------
        // 4. Users
        // ------------------------------------------------------

        for (
          const user of INITIAL_USERS
        ) {

          if (!user?.email) {
            continue;
          }

          const existingUser =
            await getUserByEmailOrPhone(
              user.email
            );

          if (!existingUser) {

            await firebaseDb.saveUser(
              user
            );
          }
        }

        // ------------------------------------------------------
        // 5. Patients
        // ------------------------------------------------------

        const existingPatients =
          await fetchDocsWithFilter<Patient>(
            COLLECTIONS.PATIENTS
          );

        if (
          existingPatients.length === 0
        ) {

          for (
            const patient of INITIAL_PATIENTS
          ) {
            await firebaseDb.savePatient(
              patient
            );
          }
        }

        // ------------------------------------------------------
        // 6. Staff
        // ------------------------------------------------------

        const existingStaff =
          await fetchDocsWithFilter<Staff>(
            COLLECTIONS.STAFF
          );

        if (
          existingStaff.length === 0
        ) {

          for (
            const staff of INITIAL_STAFF
          ) {
            await firebaseDb.saveStaff(
              staff
            );
          }
        }

        return true;

      } catch (error) {

        console.warn(
          '[Firestore] Seed check warning:',
          error
        );

        return false;
      }
    },

  // ==========================================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================================

  subscribeToDoc: <T>(
    collectionName: string,
    docId: string,
    callback: (
      data: T | null
    ) => void
  ): Unsubscribe => {

    if (!isValidCollectionName(collectionName)) {
      console.error(
        '[Firestore] subscribeToDoc aborted: invalid collectionName.',
        collectionName
      );

      return () => {};
    }

    if (!isValidDocumentId(docId)) {
      console.error(
        '[Firestore] subscribeToDoc aborted: invalid docId.',
        docId
      );

      return () => {};
    }

    return subscribeToDoc<T>(
      collectionName,
      docId,
      callback
    );
  },

  subscribeToCollection: <T>(
    collectionName: string,
    callback: (
      data: T[]
    ) => void,
    constraints: QueryConstraint[] = []
  ): Unsubscribe => {

    if (!isValidCollectionName(collectionName)) {
      console.error(
        '[Firestore] subscribeToCollection aborted: invalid collectionName.',
        collectionName
      );

      return () => {};
    }

    return subscribeToCollection<T>(
      collectionName,
      callback,
      constraints
    );
  },

  subscribeToUser: (
    uid: string,
    callback: (
      user: User | null
    ) => void
  ): Unsubscribe => {

    if (!uid?.trim()) {
      return () => {};
    }

    return subscribeToUser(
      uid,
      callback
    );
  },

  subscribeToDoctors: (
    callback: (
      doctors: Doctor[]
    ) => void,
    options?: {
      specialtyId?: string;
      activeOnly?: boolean;
    }
  ): Unsubscribe => {

    return subscribeToDoctors(
      callback,
      options
    );
  },

  subscribeToAppointments: (
    filter: {
      patientId?: string;
      doctorId?: string;
      status?: string;
    },
    callback: (
      appointments: Appointment[]
    ) => void
  ): Unsubscribe => {

    return subscribeToAppointments(
      filter,
      callback
    );
  },

  subscribeToConsultations: (
    filter: {
      patientId?: string;
      doctorId?: string;
      status?: string;
    },
    callback: (
      consultations: Consultation[]
    ) => void
  ): Unsubscribe => {

    return subscribeToConsultations(
      filter,
      callback
    );
  },

  subscribeToNotifications: (
    userId: string,
    callback: (
      notifications: AppNotification[]
    ) => void
  ): Unsubscribe => {

    if (!userId?.trim()) {
      return () => {};
    }

    return subscribeToNotifications(
      userId,
      callback
    );
  },

  // ==========================================================
  // PAYMENT OPERATIONS
  // ==========================================================

  getPayments: async (
    patientId?: string
  ): Promise<Payment[]> => {

    try {

      if (patientId?.trim()) {

        return await fetchDocsWithFilter<Payment>(
          COLLECTIONS.PAYMENTS,
          [
            where(
              'patientId',
              '==',
              patientId.trim()
            )
          ]
        );
      }

      const snapshot =
        await getDocs(
          collection(
            db,
            COLLECTIONS.PAYMENTS
          )
        );

      return snapshot.docs.map(
        (paymentDoc) => ({
          id: paymentDoc.id,
          ...paymentDoc.data()
        } as Payment)
      );

    } catch (error) {

      console.warn(
        '[Firestore] getPayments fallback:',
        error
      );

      return INITIAL_PAYMENTS;
    }
  },

  getPayment: async (
    paymentId: string
  ): Promise<Payment | null> => {

    try {

      if (!paymentId?.trim()) {
        return null;
      }

      return await fetchDocById<Payment>(
        COLLECTIONS.PAYMENTS,
        paymentId
      );

    } catch {

      return (
        INITIAL_PAYMENTS.find(
          payment =>
            payment.id === paymentId
        ) || null
      );
    }
  },

  createPayment: async (
    payment: Payment
  ): Promise<Payment> => {

    try {

      const id = normalizeId(
        payment?.id
      );

      if (!id) {
        console.warn(
          '[Firestore] createPayment skipped: invalid payment id.'
        );

        return payment;
      }

      const success =
        await firebaseDb.saveDocument(
          COLLECTIONS.PAYMENTS,
          id,
          payment
        );

      return success
        ? payment
        : payment;

    } catch (error) {

      console.warn(
        '[Firestore] createPayment fallback:',
        error
      );

      return payment;
    }
  },

  // ==========================================================
  // FOLLOW UP OPERATIONS
  // ==========================================================

  getFollowUps: async (
    patientId?: string
  ): Promise<FollowUpAppointment[]> => {

    try {

      if (patientId?.trim()) {

        return await fetchDocsWithFilter<FollowUpAppointment>(
          COLLECTIONS.FOLLOW_UPS,
          [
            where(
              'patientId',
              '==',
              patientId.trim()
            )
          ]
        );
      }

      const snapshot =
        await getDocs(
          collection(
            db,
            COLLECTIONS.FOLLOW_UPS
          )
        );

      return snapshot.docs.map(
        (followDoc) => ({
          id: followDoc.id,
          ...followDoc.data()
        } as FollowUpAppointment)
      );

    } catch (error) {

      console.warn(
        '[Firestore] getFollowUps fallback:',
        error
      );

      return INITIAL_FOLLOW_UPS;
    }
  },

  createFollowUp: async (
    followUp: FollowUpAppointment
  ): Promise<FollowUpAppointment> => {

    try {

      const id = normalizeId(
        followUp?.id
      );

      if (!id) {
        console.warn(
          '[Firestore] createFollowUp skipped: invalid id.'
        );

        return followUp;
      }

      await firebaseDb.saveDocument(
        COLLECTIONS.FOLLOW_UPS,
        id,
        followUp
      );

      return followUp;

    } catch (error) {

      console.warn(
        '[Firestore] createFollowUp fallback:',
        error
      );

      return followUp;
    }
  },

  // ==========================================================
  // REFUNDS
  // ==========================================================

  getRefunds: async (
    paymentId?: string
  ): Promise<Refund[]> => {

    try {

      if (paymentId?.trim()) {

        return await fetchDocsWithFilter<Refund>(
          COLLECTIONS.REFUNDS,
          [
            where(
              'paymentId',
              '==',
              paymentId.trim()
            )
          ]
        );
      }

      const snapshot =
        await getDocs(
          collection(
            db,
            COLLECTIONS.REFUNDS
          )
        );

      return snapshot.docs.map(
        (refundDoc) => ({
          id: refundDoc.id,
          ...refundDoc.data()
        } as Refund)
      );

    } catch (error) {

      console.warn(
        '[Firestore] getRefunds fallback:',
        error
      );

      return INITIAL_REFUNDS;
    }
  },

  createRefund: async (
    refund: Refund
  ): Promise<Refund> => {

    try {

      const id = normalizeId(
        refund?.id
      );

      if (!id) {
        console.warn(
          '[Firestore] createRefund skipped: invalid id.'
        );

        return refund;
      }

      await firebaseDb.saveDocument(
        COLLECTIONS.REFUNDS,
        id,
        refund
      );

      return refund;

    } catch (error) {

      console.warn(
        '[Firestore] createRefund fallback:',
        error
      );

      return refund;
    }
  },

  // ==========================================================
  // REMINDERS
  // ==========================================================

  getReminderSchedules: async (
    userId?: string
  ): Promise<ReminderSchedule[]> => {

    try {

      if (userId?.trim()) {

        return await fetchDocsWithFilter<ReminderSchedule>(
          COLLECTIONS.REMINDERS,
          [
            where(
              'userId',
              '==',
              userId.trim()
            )
          ]
        );
      }

      const snapshot =
        await getDocs(
          collection(
            db,
            COLLECTIONS.REMINDERS
          )
        );

      return snapshot.docs.map(
        (reminderDoc) => ({
          id: reminderDoc.id,
          ...reminderDoc.data()
        } as ReminderSchedule)
      );

    } catch (error) {

      console.warn(
        '[Firestore] getReminderSchedules fallback:',
        error
      );

      return INITIAL_REMINDERS;
    }
  },

  createReminderSchedule: async (
    reminder: ReminderSchedule
  ): Promise<ReminderSchedule> => {

    try {

      const id = normalizeId(
        reminder?.id
      );

      if (!id) {
        console.warn(
          '[Firestore] createReminderSchedule skipped: invalid id.'
        );

        return reminder;
      }

      await firebaseDb.saveDocument(
        COLLECTIONS.REMINDERS,
        id,
        reminder
      );

      return reminder;

    } catch (error) {

      console.warn(
        '[Firestore] createReminderSchedule fallback:',
        error
      );

      return reminder;
    }
  }
};