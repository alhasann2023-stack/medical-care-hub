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
  getUserByEmailOrPhone, 
  getUserByUid, 
  getPatientByUserId, 
  getDoctorByUserId,
  getDoctorsWithFilter,
  getAppointmentsWithFilter,
  getConsultationsWithFilter,
  fetchDocsWithFilter,
  fetchDocById,
  subscribeToCollection,
  subscribeToDoc,
  subscribeToUser,
  subscribeToDoctors,
  subscribeToAppointments,
  subscribeToConsultations,
  subscribeToNotifications,
  FIRESTORE_COLLECTIONS
} from './firebase';
import { firebaseDb } from './firebaseDb';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'فشل تنفيذ الطلب' }));
    throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Auth
  register: async (data: any) => {
    try {
      const res = await fetchJson<{ user: User; patient?: Patient; doctor?: Doctor; staff?: Staff; profile?: any; message: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      // Sync to Firestore
      if (res.user) {
        await firebaseDb.saveUser(res.user);
        if (res.patient) await firebaseDb.savePatient(res.patient);
        if (res.doctor) await firebaseDb.saveDoctor(res.doctor);
        if (res.staff) await firebaseDb.saveStaff(res.staff);
      }
      return res;
    } catch (err: any) {
      console.warn('API register error, creating in Firestore:', err);
      // Fallback: create directly in Firestore
      const userId = data.id || `user-${Date.now()}`;
      const newUser: User = {
        id: userId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || '+966500000000',
        role: data.role || 'PATIENT',
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      await firebaseDb.saveUser(newUser);

      let profile: any = null;
      if (newUser.role === 'PATIENT') {
        profile = {
          id: `pat-${Date.now()}`,
          userId: newUser.id,
          mrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
          fullName: newUser.fullName,
          email: newUser.email,
          phone: newUser.phone,
          gender: data.gender || 'MALE',
          birthDate: data.birthDate || '1995-01-01',
          bloodType: data.bloodType || 'O+',
          allergies: ['لا توجد حساسيات معروفة'],
          chronicConditions: ['سليم'],
          insuranceProvider: 'بوبا العربية للتأمين التعاوني',
          insurancePolicyNumber: `POL-${Math.floor(1000000 + Math.random() * 9000000)}`,
          emergencyContactName: 'أحد أفراد العائلة',
          emergencyContactPhone: '+966500000000',
          createdAt: new Date().toISOString()
        };
        await firebaseDb.savePatient(profile);
      }

      return { 
        user: newUser, 
        patient: profile as Patient, 
        doctor: undefined as Doctor | undefined,
        staff: undefined as Staff | undefined,
        profile, 
        message: 'تم التسجيل بنجاح' 
      };
    }
  },

  login: async (identifier: string, password?: string) => {
    try {
      const res = await fetchJson<{ user: User; profile: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      return res;
    } catch (err: any) {
      console.warn('API login failed, checking Firestore directly for user:', identifier);
      // Query Firestore directly by UID or Email/Phone to fix 'not registered' error
      const firestoreUser = (await getUserByUid(identifier)) || (await getUserByEmailOrPhone(identifier));
      if (firestoreUser) {
        let profile: any = null;
        if (firestoreUser.role === 'PATIENT') {
          profile = await getPatientByUserId(firestoreUser.id);
        } else if (firestoreUser.role === 'DOCTOR') {
          profile = await getDoctorByUserId(firestoreUser.id);
        } else if (firestoreUser.role === 'CUSTOMER_SERVICE') {
          profile = await fetchDocById<Staff>(FIRESTORE_COLLECTIONS.STAFF, firestoreUser.id);
        }
        return {
          user: firestoreUser,
          profile: profile || null,
          token: `mch_token_fs_${firestoreUser.id}`
        };
      }
      throw err;
    }
  },

  switchDemoUser: (role?: UserRole, userId?: string) => fetchJson<{ user: User; profile: any; token: string }>('/api/auth/switch-demo', {
    method: 'POST',
    body: JSON.stringify({ role, userId })
  }),

  // Patients & Timeline
  getPatients: async (search?: string, phone?: string, mrn?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (phone) params.append('phone', phone);
      if (mrn) params.append('mrn', mrn);
      const apiPatients = await fetchJson<Patient[]>(`/api/patients?${params.toString()}`);
      
      // Also get Firestore patients to merge any newly added ones
      const fsPatients = await fetchDocsWithFilter<Patient>(FIRESTORE_COLLECTIONS.PATIENTS);
      if (fsPatients.length > 0) {
        const mergedMap = new Map<string, Patient>();
        apiPatients.forEach(p => mergedMap.set(p.id, p));
        fsPatients.forEach(p => mergedMap.set(p.id, { ...mergedMap.get(p.id), ...p }));
        return Array.from(mergedMap.values());
      }
      return apiPatients;
    } catch (err) {
      console.warn('API getPatients fallback to Firestore:', err);
      return await fetchDocsWithFilter<Patient>(FIRESTORE_COLLECTIONS.PATIENTS);
    }
  },

  getPatient: async (id: string) => {
    try {
      return await fetchJson<Patient>(`/api/patients/${id}`);
    } catch (err) {
      const p = await getPatientByUserId(id);
      if (p) return p;
      throw err;
    }
  },

  updatePatient: async (id: string, data: Partial<Patient>) => {
    const updated = await fetchJson<Patient>(`/api/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    await firebaseDb.savePatient(updated);
    return updated;
  },

  getPatientTimeline: (patientId: string) => fetchJson<{ patient: Patient; timeline: TimelineItem[] }>(`/api/timeline/${patientId}`),

  // Doctors, Specialties & Services
  getSpecialties: async () => {
    try {
      return await fetchJson<Specialty[]>('/api/specialties');
    } catch {
      return await fetchDocsWithFilter<Specialty>(FIRESTORE_COLLECTIONS.SPECIALTIES);
    }
  },

  createSpecialty: async (data: Partial<Specialty>) => {
    const res = await fetchJson<Specialty>('/api/specialties', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res) await firebaseDb.saveSpecialty(res);
    return res;
  },

  getServices: async (specialtyId?: string) => {
    try {
      const params = specialtyId ? `?specialtyId=${specialtyId}` : '';
      const apiServices = await fetchJson<MedicalService[]>(`/api/services${params}`);
      const fsServices = await fetchDocsWithFilter<MedicalService>(FIRESTORE_COLLECTIONS.SERVICES);
      if (fsServices.length > 0) {
        const mergedMap = new Map<string, MedicalService>();
        apiServices.forEach(s => mergedMap.set(s.id, s));
        fsServices.forEach(s => {
          if (!specialtyId || s.specialtyId === specialtyId) {
            mergedMap.set(s.id, { ...mergedMap.get(s.id), ...s });
          }
        });
        return Array.from(mergedMap.values());
      }
      return apiServices;
    } catch {
      return await fetchDocsWithFilter<MedicalService>(FIRESTORE_COLLECTIONS.SERVICES);
    }
  },

  createService: async (data: Partial<MedicalService>) => {
    const res = await fetchJson<MedicalService>('/api/services', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res) await firebaseDb.saveService(res);
    return res;
  },

  updateService: async (id: string, data: Partial<MedicalService>) => {
    const res = await fetchJson<MedicalService>(`/api/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (res) await firebaseDb.saveService(res);
    return res;
  },

  deleteService: async (id: string) => {
    const res = await fetchJson<{ message: string; id: string }>(`/api/services/${id}`, {
      method: 'DELETE'
    });
    await firebaseDb.deleteService(id);
    return res;
  },

  getDoctors: async (specialtyId?: string, activeOnly?: boolean) => {
    try {
      const params = new URLSearchParams();
      if (specialtyId) params.append('specialtyId', specialtyId);
      if (activeOnly) params.append('activeOnly', 'true');
      const apiDoctors = await fetchJson<Doctor[]>(`/api/doctors?${params.toString()}`);
      
      // Query Firestore directly with getDocs to merge and include all persistent doctors
      const fsDoctors = await getDoctorsWithFilter({ specialtyId, activeOnly });
      if (fsDoctors.length > 0) {
        const mergedMap = new Map<string, Doctor>();
        apiDoctors.forEach(d => mergedMap.set(d.id, d));
        fsDoctors.forEach(d => mergedMap.set(d.id, { ...mergedMap.get(d.id), ...d }));
        return Array.from(mergedMap.values());
      }
      return apiDoctors;
    } catch (err) {
      console.warn('API getDoctors fallback to Firestore getDocs:', err);
      return await getDoctorsWithFilter({ specialtyId, activeOnly });
    }
  },

  getDoctor: async (id: string) => {
    try {
      return await fetchJson<Doctor>(`/api/doctors/${id}`);
    } catch (err) {
      const doc = await getDoctorByUserId(id);
      if (doc) return doc;
      throw err;
    }
  },

  createDoctor: async (data: any) => {
    const res = await fetchJson<Doctor>('/api/doctors', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    // Save to Firestore immediately
    await firebaseDb.saveDoctor(res);
    return res;
  },

  updateDoctor: async (id: string, data: any) => {
    const res = await fetchJson<Doctor>(`/api/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    await firebaseDb.saveDoctor(res);
    return res;
  },

  deleteDoctor: async (id: string) => {
    return await fetchJson<{ success: boolean; message: string }>(`/api/doctors/${id}`, {
      method: 'DELETE'
    });
  },

  toggleDoctorStatus: async (id: string) => {
    const res = await fetchJson<Doctor>(`/api/doctors/${id}/toggle-status`, {
      method: 'PATCH'
    });
    await firebaseDb.saveDoctor(res);
    return res;
  },

  // Appointments
  getAppointments: async (filter?: { patientId?: string; doctorId?: string; status?: string }) => {
    try {
      const params = new URLSearchParams();
      if (filter?.patientId) params.append('patientId', filter.patientId);
      if (filter?.doctorId) params.append('doctorId', filter.doctorId);
      if (filter?.status) params.append('status', filter.status);
      const apiApts = await fetchJson<Appointment[]>(`/api/appointments?${params.toString()}`);
      
      const fsApts = await getAppointmentsWithFilter(filter);
      if (fsApts.length > 0) {
        const mergedMap = new Map<string, Appointment>();
        apiApts.forEach(a => mergedMap.set(a.id, a));
        fsApts.forEach(a => mergedMap.set(a.id, { ...mergedMap.get(a.id), ...a }));
        return Array.from(mergedMap.values());
      }
      return apiApts;
    } catch (err) {
      console.warn('API getAppointments fallback to Firestore getDocs:', err);
      return await getAppointmentsWithFilter(filter);
    }
  },

  getAppointmentById: async (id: string) => {
    try {
      return await fetchJson<Appointment>(`/api/appointments/${id}`);
    } catch (err) {
      const apt = await firebaseDb.getDocument<Appointment>(FIRESTORE_COLLECTIONS.APPOINTMENTS, id);
      if (apt) return apt;
      throw err;
    }
  },

  createAppointment: async (data: {
    patientId: string;
    doctorId: string;
    serviceId?: string;
    preferredDate: string;
    preferredPeriod: string;
    reason: string;
    patientNotes?: string;
    patientName?: string;
    patientPhone?: string;
  }) => {
    const res = await fetchJson<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await firebaseDb.saveAppointment(res);
    return res;
  },

  updateAppointmentStatus: async (id: string, data: {
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
  }) => {
    try {
      const res = await fetchJson<Appointment>(`/api/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      await firebaseDb.saveAppointment(res);
      return res;
    } catch (err) {
      console.warn('API updateAppointment fallback to direct Firestore save:', err);
      const existing = await firebaseDb.getDocument<Appointment>(FIRESTORE_COLLECTIONS.APPOINTMENTS, id);
      const merged: Appointment = {
        ...(existing || {
          id,
          patientId: data.patientId || 'pat-1',
          patientName: data.patientName || 'المريض',
          patientPhone: data.patientPhone || '',
          patientMrn: 'MRN-2026-8801',
          doctorId: data.doctorId || 'doc-1',
          doctorName: data.doctorName || 'طبيب العيادة',
          doctorSpecialty: data.doctorSpecialty || 'العيادات الطبية',
          serviceName: 'استشارة وفحص طبي عام',
          preferredDate: data.confirmedDate || new Date().toISOString().split('T')[0],
          preferredPeriod: 'MORNING',
          reason: 'تنسيق موعد طبي',
          status: (data.status as any) || 'CONFIRMED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
        ...data,
        updatedAt: new Date().toISOString()
      } as Appointment;
      await firebaseDb.saveAppointment(merged);
      return merged;
    }
  },

  deleteAppointment: async (id: string) => {
    try {
      await fetchJson<{ success: boolean; message: string }>(`/api/appointments/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('API deleteAppointment fallback:', err);
    }
    await firebaseDb.deleteDocument(FIRESTORE_COLLECTIONS.APPOINTMENTS, id);
    return { success: true, message: 'تم إلغاء الموعد' };
  },

  // Consultations
  getConsultations: async (filter?: { patientId?: string; doctorId?: string; status?: string }) => {
    try {
      const params = new URLSearchParams();
      if (filter?.patientId) params.append('patientId', filter.patientId);
      if (filter?.doctorId) params.append('doctorId', filter.doctorId);
      if (filter?.status) params.append('status', filter.status);
      const apiCns = await fetchJson<Consultation[]>(`/api/consultations?${params.toString()}`);
      
      const fsCns = await getConsultationsWithFilter(filter);
      if (fsCns.length > 0) {
        const mergedMap = new Map<string, Consultation>();
        apiCns.forEach(c => mergedMap.set(c.id, c));
        fsCns.forEach(c => mergedMap.set(c.id, { ...mergedMap.get(c.id), ...c }));
        return Array.from(mergedMap.values());
      }
      return apiCns;
    } catch (err) {
      console.warn('API getConsultations fallback to Firestore getDocs:', err);
      return await getConsultationsWithFilter(filter);
    }
  },

  createConsultation: async (data: {
    patientId: string;
    doctorId: string;
    title: string;
    problemDescription: string;
    symptoms: string[];
    duration: string;
    attachments?: any[];
  }) => {
    const res = await fetchJson<Consultation>('/api/consultations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await firebaseDb.saveConsultation(res);
    return res;
  },

  replyConsultation: async (id: string, data: {
    doctorAdvice: string;
    doctorNotes?: string;
    suggestedAction?: string;
    treatmentPlan?: string;
    requireInPersonVisit?: boolean;
  }) => {
    const res = await fetchJson<Consultation>(`/api/consultations/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await firebaseDb.saveConsultation(res);
    return res;
  },

  addConsultationMessage: (id: string, data: {
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    message: string;
    attachments?: any[];
  }) => fetchJson<any>(`/api/consultations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Examinations, Tests, Reports & Prescriptions
  getExaminations: async (patientId?: string) => {
    const p = patientId ? `?patientId=${patientId}` : '';
    return fetchJson<MedicalExamination[]>(`/api/examinations${p}`).catch(async () => {
      return await fetchDocsWithFilter<MedicalExamination>(FIRESTORE_COLLECTIONS.EXAMINATIONS);
    });
  },

  createExamination: async (data: any) => {
    const res = await fetchJson<MedicalExamination>('/api/examinations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res) await firebaseDb.saveExamination(res);
    return res;
  },

  getTests: async (patientId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (status) params.append('status', status);
    try {
      const apiTests = await fetchJson<MedicalTest[]>(`/api/tests?${params.toString()}`);
      const fsTests = await fetchDocsWithFilter<MedicalTest>(FIRESTORE_COLLECTIONS.TESTS);
      if (fsTests.length > 0) {
        const mergedMap = new Map<string, MedicalTest>();
        apiTests.forEach(t => mergedMap.set(t.id, t));
        fsTests.forEach(t => {
          if (!patientId || t.patientId === patientId) {
            mergedMap.set(t.id, { ...mergedMap.get(t.id), ...t });
          }
        });
        return Array.from(mergedMap.values());
      }
      return apiTests;
    } catch {
      return await fetchDocsWithFilter<MedicalTest>(FIRESTORE_COLLECTIONS.TESTS);
    }
  },

  createTest: async (data: any) => {
    const res = await fetchJson<MedicalTest>('/api/tests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res) await firebaseDb.saveTest(res);
    return res;
  },

  getReports: async (patientId?: string) => {
    const p = patientId ? `?patientId=${patientId}` : '';
    return fetchJson<MedicalReport[]>(`/api/reports${p}`).catch(async () => {
      return await fetchDocsWithFilter<MedicalReport>(FIRESTORE_COLLECTIONS.REPORTS);
    });
  },

  createReport: async (data: any) => {
    const res = await fetchJson<MedicalReport>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await firebaseDb.saveReport(res);
    return res;
  },

  getPrescriptions: async (patientId?: string) => {
    const p = patientId ? `?patientId=${patientId}` : '';
    return fetchJson<Prescription[]>(`/api/prescriptions${p}`).catch(async () => {
      return await fetchDocsWithFilter<Prescription>(FIRESTORE_COLLECTIONS.PRESCRIPTIONS);
    });
  },

  createPrescription: async (data: any) => {
    const res = await fetchJson<Prescription>('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await firebaseDb.savePrescription(res);
    return res;
  },

  // Notifications
  getNotifications: (userId?: string) => {
    const p = userId ? `?userId=${userId}` : '';
    return fetchJson<AppNotification[]>(`/api/notifications${p}`).catch(async () => {
      return await fetchDocsWithFilter<AppNotification>(FIRESTORE_COLLECTIONS.NOTIFICATIONS);
    });
  },

  markNotificationRead: (id: string) => fetchJson<{ success: boolean }>(`/api/notifications/${id}/read`, {
    method: 'PATCH'
  }),

  markAllNotificationsRead: (userId?: string) => fetchJson<{ success: boolean }>('/api/notifications/mark-all-read', {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),

  // Admin & Staff
  getAdminStats: () => fetchJson<any>('/api/admin/stats'),
  getAdminAnalytics: () => fetchJson<any>('/api/admin/stats'),

  getStaffList: async () => {
    try {
      const apiStaff = await fetchJson<Staff[]>('/api/admin/staff');
      const fsStaff = await fetchDocsWithFilter<Staff>(FIRESTORE_COLLECTIONS.STAFF);
      if (fsStaff.length > 0) {
        const map = new Map<string, Staff>();
        apiStaff.forEach(s => map.set(s.id, s));
        fsStaff.forEach(s => map.set(s.id, { ...map.get(s.id), ...s }));
        return Array.from(map.values());
      }
      return apiStaff;
    } catch {
      return await fetchDocsWithFilter<Staff>(FIRESTORE_COLLECTIONS.STAFF);
    }
  },

  createStaff: async (data: any) => {
    const res = await fetchJson<Staff>('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await firebaseDb.saveStaff(res);
    return res;
  },

  updateStaff: async (id: string, data: Partial<Staff> & { password?: string }) => {
    try {
      const res = await fetchJson<Staff>(`/api/admin/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      await firebaseDb.saveStaff(res);
      return res;
    } catch (err) {
      console.warn('API updateStaff fallback:', err);
      const existing = await firebaseDb.getDocument<Staff>(FIRESTORE_COLLECTIONS.STAFF, id);
      const merged = { ...(existing || {}), ...data, updatedAt: new Date().toISOString() } as Staff;
      await firebaseDb.saveStaff(merged);
      return merged;
    }
  },

  deleteStaff: async (id: string) => {
    try {
      await fetchJson<{ success: boolean; message: string }>(`/api/admin/staff/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('API deleteStaff fallback:', err);
    }
    await firebaseDb.deleteDocument(FIRESTORE_COLLECTIONS.STAFF, id);
    return { success: true, message: 'تم حذف حساب الموظف بنجاح' };
  },

  toggleStaffStatus: (id: string) => fetchJson<Staff>(`/api/admin/staff/${id}/toggle-status`, {
    method: 'PATCH'
  }),

  getAuditLogs: (limit = 50) => fetchJson<AuditLog[]>(`/api/admin/audit-logs?limit=${limit}`).catch(async () => {
    return await fetchDocsWithFilter<AuditLog>(FIRESTORE_COLLECTIONS.AUDIT_LOGS);
  }),

  // AI Helpers
  summarizeRecord: (patientId: string) => fetchJson<{ summary: string; disclaimer: string; source: string }>('/api/ai/summarize-record', {
    method: 'POST',
    body: JSON.stringify({ patientId })
  }),

  draftReport: (data: any) => fetchJson<{ rawText?: string; draft?: any; disclaimer: string }>('/api/ai/draft-report', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Direct Firestore listeners and getters for components
  subscribeUser: (uid: string, callback: (u: User | null) => void) => subscribeToUser(uid, callback),
  subscribeDoctors: (callback: (docs: Doctor[]) => void, options?: { specialtyId?: string; activeOnly?: boolean }) => subscribeToDoctors(callback, options),
  subscribeAppointments: (filter: { patientId?: string; doctorId?: string; status?: string }, callback: (apts: Appointment[]) => void) => subscribeToAppointments(filter, callback),
  subscribeConsultations: (filter: { patientId?: string; doctorId?: string; status?: string }, callback: (cns: Consultation[]) => void) => subscribeToConsultations(filter, callback),
  subscribeNotifications: (userId: string, callback: (n: AppNotification[]) => void) => subscribeToNotifications(userId, callback)
};

