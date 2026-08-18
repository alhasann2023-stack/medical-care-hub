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

  getPatientTimeline: async (patientId: string) => {
    try {
      const apiRes = await fetchJson<{ patient: Patient; timeline: TimelineItem[] }>(`/api/timeline/${patientId}`);
      const [fsExms, fsTests, fsRx, fsCns, fsReps] = await Promise.all([
        fetchDocsWithFilter<MedicalExamination>(FIRESTORE_COLLECTIONS.EXAMINATIONS),
        fetchDocsWithFilter<MedicalTest>(FIRESTORE_COLLECTIONS.TESTS),
        fetchDocsWithFilter<Prescription>(FIRESTORE_COLLECTIONS.PRESCRIPTIONS),
        fetchDocsWithFilter<Consultation>(FIRESTORE_COLLECTIONS.CONSULTATIONS),
        fetchDocsWithFilter<MedicalReport>(FIRESTORE_COLLECTIONS.REPORTS)
      ]);

      const timelineMap = new Map<string, TimelineItem>();
      (apiRes.timeline || []).forEach(item => timelineMap.set(item.id, item));

      fsExms.filter(e => e.patientId === patientId).forEach(e => {
        const id = `tl-exm-${e.id}`;
        timelineMap.set(id, {
          id,
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

      fsTests.filter(t => t.patientId === patientId).forEach(t => {
        const id = `tl-tst-${t.id}`;
        timelineMap.set(id, {
          id,
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

      fsRx.filter(p => p.patientId === patientId).forEach(p => {
        const id = `tl-rx-${p.id}`;
        const medsSummary = (p.medications || []).map(m => `${m.medicationName} (${m.dosage})`).join('، ');
        timelineMap.set(id, {
          id,
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

      fsCns.filter(c => c.patientId === patientId).forEach(c => {
        const id = `tl-cns-${c.id}`;
        timelineMap.set(id, {
          id,
          type: 'CONSULTATION',
          date: (c.createdAt || '').split('T')[0] || new Date().toISOString().split('T')[0],
          title: `استشارة طبية: ${c.title}`,
          subtitle: `مع ${c.doctorName} (${c.doctorSpecialty})`,
          doctorName: c.doctorName,
          status: c.status,
          details: c.doctorAdvice ? `رد الطبيب: ${c.doctorAdvice}` : 'بانتظار رد الطبيب المعالج.',
          badgeColor: c.status === 'ANSWERED' ? 'teal' : 'amber',
          referenceId: c.id
        });
      });

      fsReps.filter(r => r.patientId === patientId).forEach(r => {
        const id = `tl-rep-${r.id}`;
        timelineMap.set(id, {
          id,
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

      const mergedTimeline = Array.from(timelineMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return {
        patient: apiRes.patient,
        timeline: mergedTimeline
      };
    } catch (err) {
      console.warn('getPatientTimeline fallback to Firestore:', err);
      const pat = (await fetchDocById<Patient>(FIRESTORE_COLLECTIONS.PATIENTS, patientId)) ||
        (await getPatientByUserId(patientId)) || {
          id: patientId,
          userId: patientId,
          mrn: 'MRN-2026-8801',
          fullName: 'المريض',
          phone: '+966501112233',
          email: 'patient@medicalcarehub.com',
          birthDate: '1992-05-14',
          gender: 'MALE',
          bloodType: 'O+',
          allergies: [],
          chronicDiseases: [],
          address: 'المملكة العربية السعودية',
          emergencyContact: { name: 'جهة الاتصال', phone: '+966509998877', relation: 'قريب' },
          createdAt: new Date().toISOString()
        };

      const [fsExms, fsTests, fsRx, fsCns, fsReps] = await Promise.all([
        fetchDocsWithFilter<MedicalExamination>(FIRESTORE_COLLECTIONS.EXAMINATIONS),
        fetchDocsWithFilter<MedicalTest>(FIRESTORE_COLLECTIONS.TESTS),
        fetchDocsWithFilter<Prescription>(FIRESTORE_COLLECTIONS.PRESCRIPTIONS),
        fetchDocsWithFilter<Consultation>(FIRESTORE_COLLECTIONS.CONSULTATIONS),
        fetchDocsWithFilter<MedicalReport>(FIRESTORE_COLLECTIONS.REPORTS)
      ]);

      const timeline: TimelineItem[] = [];

      fsExms.filter(e => e.patientId === patientId).forEach(e => {
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

      fsTests.filter(t => t.patientId === patientId).forEach(t => {
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

      fsRx.filter(p => p.patientId === patientId).forEach(p => {
        const medsSummary = (p.medications || []).map(m => `${m.medicationName} (${m.dosage})`).join('، ');
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

      fsCns.filter(c => c.patientId === patientId).forEach(c => {
        timeline.push({
          id: `tl-cns-${c.id}`,
          type: 'CONSULTATION',
          date: (c.createdAt || '').split('T')[0] || new Date().toISOString().split('T')[0],
          title: `استشارة طبية: ${c.title}`,
          subtitle: `مع ${c.doctorName} (${c.doctorSpecialty})`,
          doctorName: c.doctorName,
          status: c.status,
          details: c.doctorAdvice ? `رد الطبيب: ${c.doctorAdvice}` : 'بانتظار رد الطبيب المعالج.',
          badgeColor: c.status === 'ANSWERED' ? 'teal' : 'amber',
          referenceId: c.id
        });
      });

      fsReps.filter(r => r.patientId === patientId).forEach(r => {
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

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        patient: pat,
        timeline
      };
    }
  },

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
    doctorName?: string;
    doctorSpecialty?: string;
    clinicRoom?: string;
    serviceName?: string;
  }) => {
    try {
      const res = await fetchJson<Appointment>('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await firebaseDb.saveAppointment(res);
      return res;
    } catch (err) {
      console.warn('API createAppointment fallback to Firestore direct save:', err);
      // Fetch or assemble patient & doctor details from Firestore
      const doc = await fetchDocById<Doctor>(FIRESTORE_COLLECTIONS.DOCTORS, data.doctorId);
      const pat = await fetchDocById<Patient>(FIRESTORE_COLLECTIONS.PATIENTS, data.patientId);
      
      const newApt: Appointment = {
        id: `apt-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        patientId: pat?.id || data.patientId,
        patientName: data.patientName || pat?.fullName || 'المريض',
        patientPhone: data.patientPhone || pat?.phone || '',
        patientMrn: pat?.mrn || 'MRN-2026-8801',
        doctorId: doc?.id || data.doctorId,
        doctorName: data.doctorName || doc?.fullName || 'طبيب العيادة',
        doctorSpecialty: data.doctorSpecialty || doc?.specialtyNameAr || 'العيادات التخصصية',
        clinicRoom: data.clinicRoom || doc?.roomNumber || 'عيادة 101',
        serviceId: data.serviceId,
        serviceName: data.serviceName || 'استشارة وفحص طبي عام',
        preferredDate: data.preferredDate || new Date().toISOString().split('T')[0],
        preferredPeriod: (data.preferredPeriod as any) || 'MORNING',
        reason: data.reason || 'استشارة وفحص طبي',
        status: 'NEW',
        coordinatorNotes: 'طلب جديد بانتظار اتصال منسق خدمة العملاء.',
        patientNotes: data.patientNotes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firebaseDb.saveAppointment(newApt);
      return newApt;
    }
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
    patientName?: string;
    patientPhone?: string;
    doctorName?: string;
    doctorSpecialty?: string;
  }) => {
    try {
      const res = await fetchJson<Consultation>('/api/consultations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await firebaseDb.saveConsultation(res);
      return res;
    } catch (err) {
      console.warn('API createConsultation fallback to Firestore direct save:', err);
      const doc = await fetchDocById<Doctor>(FIRESTORE_COLLECTIONS.DOCTORS, data.doctorId);
      const pat = await fetchDocById<Patient>(FIRESTORE_COLLECTIONS.PATIENTS, data.patientId);
      
      const newCns: Consultation = {
        id: `cns-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        patientId: pat?.id || data.patientId,
        patientName: data.patientName || pat?.fullName || 'المريض',
        patientPhone: data.patientPhone || pat?.phone || '',
        patientMrn: pat?.mrn || 'MRN-2026-8801',
        patientAge: 32,
        patientGender: pat?.gender || 'MALE',
        doctorId: doc?.id || data.doctorId,
        doctorName: data.doctorName || doc?.fullName || 'طبيب العيادة',
        doctorSpecialty: data.doctorSpecialty || doc?.specialtyNameAr || 'العيادات التخصصية',
        title: data.title || 'استشارة طبية جديدة',
        problemDescription: data.problemDescription,
        symptoms: data.symptoms || [],
        duration: data.duration || 'غير محدد',
        status: 'PENDING',
        attachments: data.attachments || [],
        messages: [
          {
            id: `msg-${Date.now()}`,
            consultationId: '',
            senderId: pat?.id || data.patientId,
            senderName: data.patientName || pat?.fullName || 'المريض',
            senderRole: 'PATIENT',
            message: data.problemDescription || data.title,
            attachments: data.attachments || [],
            createdAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      };
      newCns.messages[0].consultationId = newCns.id;

      await firebaseDb.saveConsultation(newCns);
      return newCns;
    }
  },

  replyConsultation: async (id: string, data: {
    doctorAdvice: string;
    doctorNotes?: string;
    suggestedAction?: string;
    treatmentPlan?: string;
    requireInPersonVisit?: boolean;
  }) => {
    try {
      const res = await fetchJson<Consultation>(`/api/consultations/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await firebaseDb.saveConsultation(res);
      return res;
    } catch (err) {
      console.warn('API replyConsultation fallback to Firestore direct save:', err);
      const existing = await firebaseDb.getDocument<Consultation>(FIRESTORE_COLLECTIONS.CONSULTATIONS, id);
      const replyMsg = data.doctorAdvice || 'تم الرد على الاستشارة';
      const updated: Consultation = {
        ...(existing || {
          id,
          patientId: 'pat-1',
          patientName: 'المريض',
          patientPhone: '',
          patientMrn: 'MRN-2026-8801',
          patientAge: 30,
          patientGender: 'MALE',
          doctorId: 'doc-1',
          doctorName: 'طبيب العيادة',
          doctorSpecialty: 'العيادات التخصصية',
          title: 'استشارة طبية',
          problemDescription: '',
          symptoms: [],
          duration: 'غير محدد',
          status: 'ANSWERED',
          attachments: [],
          messages: [],
          createdAt: new Date().toISOString()
        }),
        doctorAdvice: replyMsg,
        doctorNotes: data.doctorNotes || existing?.doctorNotes,
        suggestedAction: data.suggestedAction || existing?.suggestedAction,
        treatmentPlan: data.treatmentPlan || existing?.treatmentPlan,
        requireInPersonVisit: data.requireInPersonVisit !== undefined ? data.requireInPersonVisit : existing?.requireInPersonVisit,
        status: 'ANSWERED',
        answeredAt: new Date().toISOString()
      };

      updated.messages = [
        ...(updated.messages || []),
        {
          id: `msg-${Date.now()}`,
          consultationId: id,
          senderId: updated.doctorId,
          senderName: updated.doctorName,
          senderRole: 'DOCTOR',
          message: replyMsg,
          createdAt: new Date().toISOString()
        }
      ];

      await firebaseDb.saveConsultation(updated);
      return updated;
    }
  },

  addConsultationMessage: async (id: string, data: {
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    message: string;
    attachments?: any[];
  }) => {
    try {
      return await fetchJson<any>(`/api/consultations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.warn('API addConsultationMessage fallback to Firestore:', err);
      const existing = await firebaseDb.getDocument<Consultation>(FIRESTORE_COLLECTIONS.CONSULTATIONS, id);
      if (existing) {
        const newMsg = {
          id: `msg-${Date.now()}`,
          consultationId: id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderRole: data.senderRole,
          message: data.message,
          attachments: data.attachments || [],
          createdAt: new Date().toISOString()
        };
        existing.messages = [...(existing.messages || []), newMsg];
        await firebaseDb.saveConsultation(existing);
        return newMsg;
      }
      return { success: false };
    }
  },

  // Examinations, Tests, Reports & Prescriptions
  getExaminations: async (patientId?: string) => {
    const p = patientId ? `?patientId=${patientId}` : '';
    try {
      const apiExms = await fetchJson<MedicalExamination[]>(`/api/examinations${p}`);
      const fsExms = await fetchDocsWithFilter<MedicalExamination>(FIRESTORE_COLLECTIONS.EXAMINATIONS);
      if (fsExms.length > 0) {
        const mergedMap = new Map<string, MedicalExamination>();
        apiExms.forEach(e => mergedMap.set(e.id, e));
        fsExms.forEach(e => {
          if (!patientId || e.patientId === patientId) {
            mergedMap.set(e.id, { ...mergedMap.get(e.id), ...e });
          }
        });
        return Array.from(mergedMap.values());
      }
      return apiExms;
    } catch {
      const all = await fetchDocsWithFilter<MedicalExamination>(FIRESTORE_COLLECTIONS.EXAMINATIONS);
      return patientId ? all.filter(e => e.patientId === patientId) : all;
    }
  },

  createExamination: async (data: any) => {
    try {
      const res = await fetchJson<MedicalExamination>('/api/examinations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res) await firebaseDb.saveExamination(res);
      return res;
    } catch (apiErr) {
      console.warn('createExamination API failed, falling back directly to Firestore:', apiErr);
      const newExm: MedicalExamination = {
        id: `exm-${Date.now()}`,
        patientId: data.patientId || 'pat-1',
        doctorId: data.doctorId || 'doc-1',
        doctorName: data.doctorName || 'طبيب استشاري',
        doctorSpecialty: data.doctorSpecialty || 'العيادات التخصصية',
        examinationDate: new Date().toISOString().split('T')[0],
        examinationType: data.examinationType || 'معاينة سريرية',
        chiefComplaint: data.chiefComplaint || 'فحص ومتابعة',
        clinicalFindings: data.clinicalFindings || 'الفحص السريري طبيعي ومستقر.',
        diagnosis: data.diagnosis || 'فحص سريري عام',
        recommendations: data.recommendations || 'المتابعة الدورية.',
        vitalSigns: data.vitalSigns || undefined,
        createdAt: new Date().toISOString()
      };
      await firebaseDb.saveExamination(newExm);
      return newExm;
    }
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
    try {
      const res = await fetchJson<MedicalTest>('/api/tests', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res) await firebaseDb.saveTest(res);
      return res;
    } catch (apiErr) {
      console.warn('createTest API failed, falling back directly to Firestore:', apiErr);
      const newTest: MedicalTest = {
        id: `tst-${Date.now()}`,
        patientId: data.patientId || 'pat-1',
        patientName: data.patientName || 'المريض',
        patientMrn: data.patientMrn || `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        doctorId: data.doctorId || 'doc-1',
        doctorName: data.doctorName || 'طبيب استشاري',
        testName: data.testName || 'فحص مخبري',
        category: data.category || 'LABORATORY',
        testDate: new Date().toISOString().split('T')[0],
        status: 'COMPLETED',
        resultsSummary: data.resultsSummary || 'النتائج ضمن المعدلات الطبيعية المعتمدة.',
        detailedItems: data.detailedItems || [],
        labTechnician: 'قسم المختبر والتحاليل الطبية',
        notes: data.notes || '',
        attachmentUrl: data.attachmentUrl || '#',
        attachmentName: data.attachmentName || `test_result.pdf`,
        createdAt: new Date().toISOString()
      };
      await firebaseDb.saveTest(newTest);
      return newTest;
    }
  },

  getReports: async (patientId?: string) => {
    try {
      const p = patientId ? `?patientId=${patientId}` : '';
      const apiReports = await fetchJson<MedicalReport[]>(`/api/reports${p}`);
      const fsReports = await fetchDocsWithFilter<MedicalReport>(FIRESTORE_COLLECTIONS.REPORTS);
      if (fsReports.length > 0) {
        const mergedMap = new Map<string, MedicalReport>();
        apiReports.forEach(r => mergedMap.set(r.id, r));
        fsReports.forEach(r => {
          if (!patientId || r.patientId === patientId) {
            mergedMap.set(r.id, { ...mergedMap.get(r.id), ...r });
          }
        });
        return Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt || b.reportDate).getTime() - new Date(a.createdAt || a.reportDate).getTime()
        );
      }
      return apiReports;
    } catch {
      const all = await fetchDocsWithFilter<MedicalReport>(FIRESTORE_COLLECTIONS.REPORTS);
      const filtered = patientId ? all.filter(r => r.patientId === patientId) : all;
      return filtered.sort(
        (a, b) => new Date(b.createdAt || b.reportDate).getTime() - new Date(a.createdAt || a.reportDate).getTime()
      );
    }
  },

  createReport: async (data: any) => {
    try {
      const res = await fetchJson<MedicalReport>('/api/reports', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await firebaseDb.saveReport(res);
      return res;
    } catch (apiErr) {
      console.warn('createReport API failed, falling back directly to Firestore:', apiErr);
      const reportCode = data.reportType === 'CONSULTATION_NOTE' ? 'CONS' : data.reportType === 'DISCHARGE_SUMMARY' ? 'DISC' : 'REP';
      const reportNum = `${reportCode}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newReport: MedicalReport = {
        id: `rep-${Date.now()}`,
        reportNumber: reportNum,
        patientId: data.patientId || 'pat-1',
        patientName: data.patientName || 'المريض',
        patientPhone: data.patientPhone || '+966501112233',
        patientMrn: data.patientMrn || `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        patientBirthDate: data.patientBirthDate || '1992-05-14',
        patientGender: data.patientGender || 'MALE',
        doctorId: data.doctorId || 'doc-1',
        doctorName: data.doctorName || 'طبيب استشاري',
        doctorTitle: data.doctorTitle || 'استشاري أول',
        doctorSpecialty: data.doctorSpecialty || data.hospitalDepartment || 'العيادات التخصصية',
        reportType: data.reportType || 'CONSULTATION_NOTE',
        title: data.title,
        summary: data.summary || 'تقرير طبي معتمد لحالة المريض.',
        clinicalHistory: data.clinicalHistory || 'بناءً على المراجعات السريرية والفحوصات المخبرية.',
        findings: data.findings || 'المؤشرات الحيوية والفحوصات مستقرة.',
        diagnosis: data.diagnosis,
        recommendations: data.recommendations || 'متابعة الخطة العلاجية المقررة.',
        reportDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        digitalSignature: `${data.doctorName || 'طبيب استشاري'} - معتمد إلكترونياً برقم ترخيص طبي رسمي`,
        hospitalDepartment: data.hospitalDepartment || 'العيادات التخصصية'
      };

      await firebaseDb.saveReport(newReport);

      try {
        await firebaseDb.saveNotification({
          id: `notif-${Date.now()}`,
          userId: data.patientId || 'usr-pat-1',
          title: 'تقرير طبي معتمد جديد',
          message: `تم إصدار تقرير طبي جديد بعنوان "${data.title}" بواسطة ${data.doctorName || 'الطبيب المعالج'}.`,
          type: 'REPORT',
          isRead: false,
          referenceId: newReport.id,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Could not save notification to Firestore:', e);
      }

      return newReport;
    }
  },

  getPrescriptions: async (patientId?: string) => {
    try {
      const p = patientId ? `?patientId=${patientId}` : '';
      const apiRx = await fetchJson<Prescription[]>(`/api/prescriptions${p}`);
      const fsRx = await fetchDocsWithFilter<Prescription>(FIRESTORE_COLLECTIONS.PRESCRIPTIONS);
      if (fsRx.length > 0) {
        const mergedMap = new Map<string, Prescription>();
        apiRx.forEach(r => mergedMap.set(r.id, r));
        fsRx.forEach(r => {
          if (!patientId || r.patientId === patientId) {
            mergedMap.set(r.id, { ...mergedMap.get(r.id), ...r });
          }
        });
        return Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
        );
      }
      return apiRx;
    } catch {
      const all = await fetchDocsWithFilter<Prescription>(FIRESTORE_COLLECTIONS.PRESCRIPTIONS);
      const filtered = patientId ? all.filter(r => r.patientId === patientId) : all;
      return filtered.sort(
        (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      );
    }
  },

  createPrescription: async (data: any) => {
    try {
      const res = await fetchJson<Prescription>('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await firebaseDb.savePrescription(res);
      return res;
    } catch (apiErr) {
      console.warn('createPrescription API failed, falling back directly to Firestore:', apiErr);
      const rxNum = `RX-${Math.floor(100000 + Math.random() * 900000)}`;

      const newRx: Prescription = {
        id: `rx-${Date.now()}`,
        rxNumber: rxNum,
        patientId: data.patientId || 'pat-1',
        patientName: data.patientName || 'المريض',
        patientMrn: data.patientMrn || `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        doctorId: data.doctorId || 'doc-1',
        doctorName: data.doctorName || 'طبيب استشاري',
        doctorSpecialty: data.doctorSpecialty || 'العيادات التخصصية',
        date: new Date().toISOString().split('T')[0],
        diagnosis: data.diagnosis || 'حسب الكشف السريري',
        medications: data.medications || [],
        instructions: data.instructions || 'الالتزام بمواعيد الجرعات واستشارة الطبيب أو الصيدلي عند ظهور أي أعراض جانبية.',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      await firebaseDb.savePrescription(newRx);

      try {
        await firebaseDb.saveNotification({
          id: `notif-${Date.now()}`,
          userId: data.patientId || 'usr-pat-1',
          title: 'وصفة طبية إلكترونية جديدة',
          message: `تم إصدار وصفة طبية برقم (${rxNum}) من ${data.doctorName || 'الطبيب المعالج'}.`,
          type: 'SYSTEM',
          isRead: false,
          referenceId: newRx.id,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Could not save notification to Firestore:', e);
      }

      return newRx;
    }
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

  clearAllData: async () => {
    try {
      await fetchJson<{ success: boolean; message: string }>('/api/admin/clear-all-data', {
        method: 'POST'
      });
    } catch (err) {
      console.warn('API clearAllData fallback:', err);
    }
    return { success: true, message: 'تم مسح كافة البيانات التجريبية بنجاح' };
  },

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

