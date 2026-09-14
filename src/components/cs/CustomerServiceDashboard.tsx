import React, { useState, useEffect } from 'react';
import { 
  Headphones, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  Clock, 
  X, 
  Search, 
  UserPlus, 
  AlertCircle, 
  Edit3, 
  Send,
  MessageSquare,
  Building2,
  CalendarCheck,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Stethoscope,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Layers,
  ClipboardList,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Appointment, Patient, AppointmentStatus, MedicalService, Doctor } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export const CustomerServiceDashboard: React.FC = () => {
  const { staffProfile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'APPOINTMENTS' | 'SERVICES'>('APPOINTMENTS');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchPhoneOrMrn, setSearchPhoneOrMrn] = useState<string>('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Doctor Absence Notification Modal State
  const [isDoctorAbsentModalOpen, setIsDoctorAbsentModalOpen] = useState<boolean>(false);
  const [selectedAbsentDoctorId, setSelectedAbsentDoctorId] = useState<string>('');
  const [absentDate, setAbsentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAppointmentIdsForAbsence, setSelectedAppointmentIdsForAbsence] = useState<string[]>([]);
  const [absentCustomMessage, setAbsentCustomMessage] = useState<string>('');
  const [isSendingAbsentNotice, setIsSendingAbsentNotice] = useState<boolean>(false);
  const [notifiedWhatsappBatch, setNotifiedWhatsappBatch] = useState<{
    id: string;
    patientName: string;
    patientPhone: string;
    whatsappUrl: string;
    message: string;
  }[] | null>(null);

  // Coordination Edit Modal
  const [coordinatingAppointment, setCoordinatingAppointment] = useState<Appointment | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  const [confirmedTime, setConfirmedTime] = useState<string>('10:30 AM');
  const [clinicRoom, setClinicRoom] = useState<string>('عيادة 104 - الطابق الأول');
  const [coordinatorNotes, setCoordinatorNotes] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<AppointmentStatus>('CONFIRMED');

  // Quick Register Modal
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState<boolean>(false);
  const [regFullName, setRegFullName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regGender, setRegGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [regBirthDate, setRegBirthDate] = useState<string>('1990-01-01');

  // New Service Modal
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState<boolean>(false);
  const [newServiceNameAr, setNewServiceNameAr] = useState<string>('');
  const [newServiceNameEn, setNewServiceNameEn] = useState<string>('');
const [newServicePrice, setNewServicePrice] = useState<number>(250);
const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServiceCategory, setNewServiceCategory] = useState<string>('قسم العيادات التخصصية');
  const [newServiceDescAr, setNewServiceDescAr] = useState<string>('');

  // Edit Service Modal State
  const [editingService, setEditingService] = useState<MedicalService | null>(null);
  const [editServiceNameAr, setEditServiceNameAr] = useState<string>('');
  const [editServiceNameEn, setEditServiceNameEn] = useState<string>('');
  const [editServicePrice, setEditServicePrice] = useState<number>(250);
  const [editServiceDuration, setEditServiceDuration] = useState<number>(30);
  const [editServiceCategory, setEditServiceCategory] = useState<string>('قسم العيادات التخصصية');
  const [editServiceDescAr, setEditServiceDescAr] = useState<string>('');
  const [editServiceIsActive, setEditServiceIsActive] = useState<boolean>(true);

  // Delete Service Confirmation State
  const [deletingService, setDeletingService] = useState<MedicalService | null>(null);
  const [isDeletingService, setIsDeletingService] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('mch_payments_updated', handleUpdate);
    window.addEventListener('mch_appointments_updated', handleUpdate);
    window.addEventListener('mch_consultations_updated', handleUpdate);

    // Real-time synchronization for Customer Service Dashboard
    const unsubApts = api.subscribeAppointments({}, (liveApts) => {
      if (liveApts) {
        setAppointments(liveApts);
        setCoordinatingAppointment((prev: Appointment | null) => {
          if (!prev) return null;
          const updated = liveApts.find(a => a.id === prev.id);
          return updated || prev;
        });
      }
    });

    return () => {
      window.removeEventListener('mch_payments_updated', handleUpdate);
      window.removeEventListener('mch_appointments_updated', handleUpdate);
      window.removeEventListener('mch_consultations_updated', handleUpdate);
      unsubApts();
    };
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [aptRes, patRes, srvRes, docRes] = await Promise.all([
        api.getAppointments(),
        api.getPatients(),
        api.getServices(),
        api.getDoctors()
      ]);
      setAppointments(aptRes);
      setPatients(patRes);
      setServices(srvRes);
      setDoctors(docRes);
    } catch (err) {
      console.error('CS load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDocName = (docId: string) => {
    const doc = doctors.find((d: Doctor) => d.id === docId || d.userId === docId);
    return doc?.fullName || appointments.find((a: Appointment) => a.doctorId === docId)?.doctorName || 'طبيب العيادة';
  };

  const getDoctorAppointmentsForDate = (docId: string, targetDate: string) => {
    const doc = doctors.find(d => d.id === docId || d.userId === docId);
    return appointments.filter(a => {
      const matchDoc = a.doctorId === docId ||
        (doc && (a.doctorId === doc.id || a.doctorId === doc.userId || a.doctorName === doc.fullName));
      const matchDate = (a.confirmedDate === targetDate || a.preferredDate === targetDate);
      return matchDoc && matchDate && a.status !== 'CANCELLED' && a.status !== 'COMPLETED';
    });
  };

  const getDefaultAbsentDraft = (docName: string, dateStr: string) => {
    return `السلام عليكم ورحمة الله وبركاته،
عزيزنا المريض: {اسم_المريض} المحترم،

نود إحاطتكم علماً باعتذار الطبيب: {اسم_الطبيب} عن الدوام في العيادة بتاريخ: {التاريخ} لظرف طارئ خارج عن الإرادة.
حرصاً على راحتكم ووقتكم الثمين، نرجو عدم الحضور إلى المستشفى.
📞 سيقوم فريق خدمة العملاء بالتواصل معكم لتأكيد موعد بديل يناسبكم في أقرب وقت.

مع تمنياتنا لكم بدوام الصحة والعافية.`;
  };

  const handleOpenDoctorAbsentModal = (specificApt?: Appointment) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (specificApt) {
      const docId = specificApt.doctorId;
      setSelectedAbsentDoctorId(docId);
      const dateStr = specificApt.confirmedDate || specificApt.preferredDate || todayStr;
      setAbsentDate(dateStr);
      
      const aptsForDocAndDate = getDoctorAppointmentsForDate(docId, dateStr);
      const allIds = Array.from(new Set([
        specificApt.id,
        ...aptsForDocAndDate.map((a: Appointment) => a.id)
      ]));
      setSelectedAppointmentIdsForAbsence(allIds);

      const docName = specificApt.doctorName || getDocName(docId);
      setAbsentCustomMessage(getDefaultAbsentDraft(docName, dateStr));
    } else {
      const initialDocId = doctors[0]?.id || appointments[0]?.doctorId || 'doc-1';
      setSelectedAbsentDoctorId(initialDocId);
      setAbsentDate(todayStr);

      const matchingApts = getDoctorAppointmentsForDate(initialDocId, todayStr);
      setSelectedAppointmentIdsForAbsence(matchingApts.map(a => a.id));

      const docName = getDocName(initialDocId);
      setAbsentCustomMessage(getDefaultAbsentDraft(docName, todayStr));
    }
    setIsDoctorAbsentModalOpen(true);
  };

  const handleDoctorChangeInAbsentModal = (newDocId: string) => {
    setSelectedAbsentDoctorId(newDocId);
    const docName = getDocName(newDocId);
    const matchingApts = getDoctorAppointmentsForDate(newDocId, absentDate);
    setSelectedAppointmentIdsForAbsence(matchingApts.map((a: Appointment) => a.id));
    
    // Update message if using default templates
    setAbsentCustomMessage(prev => {
      if (!prev || prev.includes('{اسم_الطبيب}') || prev.includes('الطبيب')) {
        return getDefaultAbsentDraft(docName, absentDate);
      }
      return prev;
    });
  };

  const handleDateChangeInAbsentModal = (newDate: string) => {
    setAbsentDate(newDate);
    const docName = getDocName(selectedAbsentDoctorId);
    const matchingApts = getDoctorAppointmentsForDate(selectedAbsentDoctorId, newDate);
    setSelectedAppointmentIdsForAbsence(matchingApts.map(a => a.id));
    
    setAbsentCustomMessage(prev => {
      if (!prev || prev.includes('{التاريخ}')) {
        return getDefaultAbsentDraft(docName, newDate);
      }
      return prev;
    });
  };

  const handleToggleAppointmentSelection = (aptId: string) => {
    setSelectedAppointmentIdsForAbsence(prev =>
      prev.includes(aptId) ? prev.filter(id => id !== aptId) : [...prev, aptId]
    );
  };

  const handleSelectAllAppointmentsForAbsence = (aptsToToggle: Appointment[]) => {
    const allIds = aptsToToggle.map(a => a.id);
    const allSelected = allIds.every(id => selectedAppointmentIdsForAbsence.includes(id));
    if (allSelected) {
      setSelectedAppointmentIdsForAbsence(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedAppointmentIdsForAbsence(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleSendDoctorAbsentNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAppointmentIdsForAbsence.length === 0) {
      showNotification('error', 'يرجى اختيار مريض واحد على الأقل لإرسال الإشعار إليه.');
      return;
    }

    const doc = doctors.find(d => d.id === selectedAbsentDoctorId || d.userId === selectedAbsentDoctorId);
    const docName = doc?.fullName || appointments.find(a => a.doctorId === selectedAbsentDoctorId)?.doctorName || 'طبيب العيادة';

    setIsSendingAbsentNotice(true);
    try {
      const res = await api.sendDoctorAbsentNotification({
        appointmentIds: selectedAppointmentIdsForAbsence,
        doctorId: selectedAbsentDoctorId,
        doctorName: docName,
        date: absentDate,
        customMessage: absentCustomMessage.trim(),
        coordinatorName: staffProfile?.fullName || user?.fullName || 'خدمة العملاء'
      });

      playSuccessSound();
      if (res.notifiedAppointments && res.notifiedAppointments.length > 0) {
        setNotifiedWhatsappBatch(res.notifiedAppointments);
      }
      showNotification('success', `تم بنجاح إرسال إشعار عدم دوام الطبيب (${docName}) إلى ${selectedAppointmentIdsForAbsence.length} مريض وتجهيز روابط رسائل واتساب.`);
      setIsDoctorAbsentModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل إرسال إشعار غياب الطبيب.');
    } finally {
      setIsSendingAbsentNotice(false);
    }
  };

  const handleOpenCoordination = (apt: Appointment) => {
    setCoordinatingAppointment(apt);
    setConfirmedDate(apt.confirmedDate || apt.preferredDate);
    setConfirmedTime(apt.confirmedTime || '10:00 AM');
    setClinicRoom(apt.clinicRoom || 'عيادة 104 - الطابق الأول');
    setCoordinatorNotes(apt.coordinatorNotes || 'تم الاتصال بالمريض وتأكيد الموعد');
    setActionStatus(apt.status === 'NEW' ? 'CONFIRMED' : apt.status);
  };

  const handleSaveCoordination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinatingAppointment) return;

    setIsSaving(true);
    try {
      await api.updateAppointmentStatus(coordinatingAppointment.id, {
        status: actionStatus,
        confirmedDate,
        confirmedTime,
        clinicRoom,
        coordinatorNotes,
        doctorId: coordinatingAppointment.doctorId,
        patientId: coordinatingAppointment.patientId,
        patientName: coordinatingAppointment.patientName,
        patientPhone: coordinatingAppointment.patientPhone,
        doctorName: coordinatingAppointment.doctorName,
        doctorSpecialty: coordinatingAppointment.doctorSpecialty
      });

      showNotification('success', `تم تحديث وتأكيد موعد المريض (${coordinatingAppointment.patientName}) بنجاح.`);
      playSuccessSound();
      await loadData();
      setCoordinatingAppointment(null);
    } catch (err) {
      console.error(err);
      showNotification('error', 'فشل تحديث وتنسيق الموعد.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regPhone.trim()) {
      showNotification('error', 'يرجى كتابة الاسم ورقم الهاتف.');
      return;
    }

    setIsSaving(true);
    try {
      await api.register({
        phone: regPhone,
        fullName: regFullName,
        gender: regGender,
        birthDate: regBirthDate
      });

      await loadData();
      setIsQuickRegisterOpen(false);
      setRegFullName('');
      setRegPhone('');
      showNotification('success', 'تم فتح الملف الطبي وتوليد MRN للمريض بنجاح!');
    } catch (err: any) {
      showNotification('error', err.message || 'فشل تسجيل المريض.');
    } finally {
      setIsSaving(false);
    }
  };

  // Service Handlers
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceNameAr.trim()) {
      showNotification('error', 'يرجى إدخال اسم الخدمة باللغة العربية.');
      return;
    }

    try {
      await api.createService({
        nameAr: newServiceNameAr.trim(),
        nameEn: newServiceNameEn.trim() || newServiceNameAr.trim(),
        specialtyId: 'spec-1',
        price: Number(newServicePrice),
        durationMinutes: Number(newServiceDuration),
        descriptionAr: newServiceDescAr.trim() || `خدمة طبية مقدمة في عيادات ${newServiceNameAr.trim()}`,
        descriptionEn: `Medical Service for ${newServiceNameEn.trim() || newServiceNameAr.trim()}`
      });

      showNotification('success', 'تمت إضافة الخدمة الطبية بنجاح إلى دليل الخدمات والأسعار.');
      await loadData();
      setIsNewServiceModalOpen(false);
      setNewServiceNameAr('');
      setNewServiceNameEn('');
      setNewServiceDescAr('');
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل إنشاء الخدمة.');
    }
  };

  const handleOpenEditService = (service: MedicalService) => {
    setEditingService(service);
    setEditServiceNameAr(service.nameAr || '');
    setEditServiceNameEn(service.nameEn || service.nameAr || '');
    setEditServicePrice(service.price || 200);
    setEditServiceDuration(service.durationMinutes || 30);
    setEditServiceCategory(service.category || 'قسم العيادات التخصصية');
    setEditServiceDescAr(service.descriptionAr || '');
    setEditServiceIsActive(service.isActive !== false);
  };

  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    if (!editServiceNameAr.trim()) {
      showNotification('error', 'يرجى إدخال اسم الخدمة الطبية باللغة العربية.');
      return;
    }

    try {
      await api.updateService(editingService.id, {
        nameAr: editServiceNameAr.trim(),
        nameEn: editServiceNameEn.trim() || editServiceNameAr.trim(),
        price: Number(editServicePrice),
        durationMinutes: Number(editServiceDuration),
        descriptionAr: editServiceDescAr.trim() || `خدمة ${editServiceNameAr.trim()}`,
        category: editServiceCategory,
        isActive: editServiceIsActive
      });

      showNotification('success', `تم تعديل بيانات خدمة "${editServiceNameAr}" بنجاح.`);
      setEditingService(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل تعديل بيانات الخدمة.');
    }
  };

  const handleOpenDeleteService = (service: MedicalService) => {
    setDeletingService(service);
  };

  const handleConfirmDeleteService = async () => {
    if (!deletingService) return;
    setIsDeletingService(true);
    try {
      await api.deleteService(deletingService.id);
      showNotification('success', `تم حذف خدمة "${deletingService.nameAr}" من دليل الخدمات بنجاح.`);
      setDeletingService(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل حذف الخدمة الطبية.');
    } finally {
      setIsDeletingService(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (selectedStatus !== 'ALL' && apt.status !== selectedStatus) return false;
    if (searchPhoneOrMrn) {
      const q = searchPhoneOrMrn.toLowerCase();
      const pat = patients.find(p => p.id === apt.patientId);
      return (
        apt.patientName.toLowerCase().includes(q) ||
        apt.patientMrn.toLowerCase().includes(q) ||
        pat?.phone.includes(q)
      );
    }
    return true;
  });

  const filteredServices = services.filter(srv => {
    if (!serviceSearchQuery.trim()) return true;
    const q = serviceSearchQuery.toLowerCase();
    return (
      srv.nameAr.toLowerCase().includes(q) ||
      (srv.nameEn && srv.nameEn.toLowerCase().includes(q)) ||
      (srv.category && srv.category.toLowerCase().includes(q)) ||
      (srv.descriptionAr && srv.descriptionAr.toLowerCase().includes(q)) ||
      String(srv.price).includes(q)
    );
  });

  const newAppointmentsCount = appointments.filter(a => a.status === 'NEW' || a.status === 'PENDING').length;
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;

  return (
    <div className="space-y-6 text-start">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className={`p-4 rounded-2xl border shadow-lg text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in ${
          notificationMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {notificationMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-purple-300 border border-white/20">
            <Headphones className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              مركز خدمة العملاء وتنسيق المواعيد والخدمات
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 font-medium">
              المنسق: <strong>{staffProfile?.fullName || user?.fullName || 'فريق خدمة العملاء'}</strong> | قسم التنسيق وخدمة المرضى
            </p>
            <p className="text-xs text-purple-300/80 mt-1">
              إدارة وتنسيق مواعيد العيادات، فتح الملفات الطبية، والتحكم في دليل الخدمات والأسعار
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenDoctorAbsentModal()}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>إشعار غياب طبيب للمرضى</span>
          </button>

          <button
            onClick={() => setIsNewServiceModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-purple-300" />
            <span>إضافة خدمة طبية</span>
          </button>

          <button
            onClick={() => setIsQuickRegisterOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>فتح ملف مريض سريع</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">طلبات جديدة للتنسيق</span>
            <strong className="text-lg font-black text-slate-900">{newAppointmentsCount}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">مواعيد مؤكدة</span>
            <strong className="text-lg font-black text-slate-900">{confirmedCount}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">دليل الخدمات والأسعار</span>
            <strong className="text-lg font-black text-slate-900">{services.length} خدمة</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">مرضى مسجلين</span>
            <strong className="text-lg font-black text-slate-900">{patients.length}</strong>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('APPOINTMENTS')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'APPOINTMENTS'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>مركز تنسيق المواعيد ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'SERVICES'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>دليل وإدارة الخدمات والأسعار ({services.length})</span>
        </button>
      </div>

      {/* Tab 1: Appointments Coordination */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="space-y-4">
          {/* Filters & Patient Phone Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Status filters */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'NEW', label: 'جديدة (تتطلب اتصال)' },
                { id: 'CONFIRMED', label: 'مؤكدة' },
                { id: 'CANCELLED', label: 'ملغاة' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedStatus(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedStatus === f.id
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search by phone or MRN */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchPhoneOrMrn}
                onChange={(e) => setSearchPhoneOrMrn(e.target.value)}
                placeholder="بحث برقم الهاتف أو MRN..."
                className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Main Coordination Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                طابور طلبات حجز المواعيد وتنسيق العيادات
              </h3>
              <span className="text-xs text-slate-500">
                انقر على "تنسيق وتأكيد" لجدولة الساعة والعيادة والتواصل مع المريض
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">المريض / الهاتف</th>
                    <th className="p-3.5">الطبيب والعيادة</th>
                    <th className="p-3.5">التاريخ / الفترة المطلوبة</th>
                    <th className="p-3.5">سبب الزيارة</th>
                    <th className="p-3.5">حالة التنسيق</th>
                    <th className="p-3.5 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        لا توجد مواعيد مطابقة للفلتر المحدد
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt) => {
                      const patient = patients.find(p => p.id === apt.patientId);
                      return (
                        <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <strong className="text-slate-900 block text-xs sm:text-sm">{apt.patientName}</strong>
                            <span className="font-mono text-purple-700 font-bold block">{patient?.phone || '0501234567'}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{apt.patientMrn}</span>
                          </td>
                          <td className="p-3.5">
                            <strong className="text-slate-900 block">{apt.doctorName}</strong>
                            <span className="text-slate-500">{apt.doctorSpecialty}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{apt.serviceName}</span>
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">
                                {apt.confirmedDate || apt.preferredDate}
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                apt.confirmedTime ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {apt.confirmedTime || (apt.preferredPeriod === 'MORNING' ? 'الفترة الصباحية' : 'الفترة المسائية')}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <p className="text-slate-700 leading-snug line-clamp-2">{apt.reason}</p>
                            {apt.patientNotes && (
                              <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded block mt-1">
                                ملاحظة المريض: {apt.patientNotes}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
<div className="flex flex-col gap-1 items-start">
  {(() => {
    const isRefunded =
      apt.paymentStatus === 'REFUNDED' ||
      apt.paymentStatus === 'REFUND_SUCCESS' ||
      (apt as any).refundStatus === 'REFUNDED' ||
      (apt as any).isRefunded === true;

    const isAptPaid = Boolean(
      !isRefunded &&
      (
        apt.isPaid === true ||
        apt.paymentStatus === 'PAID' ||
        apt.paymentStatus === 'PAYMENT_SUCCESS' ||
        (apt as any).isApprovedByAdmin === true
      )
    );

    return (
      <>
        {/* Appointment status badge */}
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
            isRefunded
              ? 'bg-rose-100 text-rose-800'
              : apt.status === 'CONFIRMED'
                ? 'bg-emerald-100 text-emerald-800'
                : apt.status === 'CONTACTED'
                  ? 'bg-purple-100 text-purple-800'
                  : apt.status === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800 animate-pulse'
          }`}
        >
          {isRefunded
            ? 'ملغي'
            : apt.status === 'CONFIRMED'
              ? 'مؤكد'
              : apt.status === 'CONTACTED'
                ? 'تم الاتصال'
                : apt.status === 'CANCELLED'
                  ? 'ملغي'
                  : 'طلب جديد'}
        </span>

        {/* Payment status badge */}
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
            isRefunded
              ? 'bg-purple-100 text-purple-800 border border-purple-300'
              : isAptPaid
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <CheckCircle2
            className={`w-3 h-3 ${
              isRefunded
                ? 'text-purple-600'
                : isAptPaid
                  ? 'text-emerald-600'
                  : 'text-amber-500'
            }`}
          />

          <span>
            {isRefunded
              ? 'المبلغ مسترد'
              : isAptPaid
                ? 'تم السداد'
                : 'انتظار السداد'}
          </span>
        </span>

        {apt.isDoctorAbsent && (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
            <span>تم إشعار المريض بالغياب</span>
          </span>
        )}
      </>
    );
  })()}
</div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenCoordination(apt)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تنسيق</span>
                              </button>
                              <button
                                onClick={() => handleOpenDoctorAbsentModal(apt)}
                                title="إرسال إشعار للمريض بغياب الطبيب عن العيادة"
                                className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>إبلاغ بالغياب</span>
                              </button>
                              {(apt.whatsappUrl || apt.isDoctorAbsent || apt.patientPhone) && (
                                <a
                                  href={
                                    apt.whatsappUrl ||
                                    `https://wa.me/${(apt.patientPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                                      `السلام عليكم ورحمة الله، الأخ/ت المريض: ${apt.patientName}، نفيدكم بعناية من إدارة العيادات بأن ${apt.doctorName} لن يتمكن من الدوام بتاريخ ${apt.confirmedDate || apt.preferredDate} لظرف طارئ. نرجو التواصل لترتيب موعد بديل يناسبكم.`
                                    )}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="فتح محادثة واتساب المريض لإشعاره بالغياب"
                                  className={`px-2 py-1.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-colors ${
                                    apt.isDoctorAbsent
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                  }`}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>واتساب</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Medical Services & Pricing Catalog */}
      {activeTab === 'SERVICES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                دليل الخدمات الطبية والأسعار الرسمية
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة أسعار الخدمات، مدد الكشوفات، والتعديل والحذف المباشر لخدمات العيادات
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  placeholder="بحث باسم الخدمة أو السعر..."
                  className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-700"
                />
              </div>

              <button
                onClick={() => setIsNewServiceModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة خدمة</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">اسم الخدمة الطبية</th>
                  <th className="p-3.5">القسم / التخصص</th>
                  <th className="p-3.5">المدة التقديرية</th>
                  <th className="p-3.5">السعر الرسمي</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا توجد خدمات مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <strong className="font-bold text-slate-900 block text-xs sm:text-sm">{s.nameAr}</strong>
                        {s.nameEn && <span className="text-[10px] text-slate-400 font-mono">{s.nameEn}</span>}
                        {s.descriptionAr && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{s.descriptionAr}</p>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{s.category || 'قسم العيادات التخصصية'}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-700">{s.durationMinutes} دقيقة</td>
                      <td className="p-3.5 font-black font-mono text-purple-700 text-sm">{s.price} ر.ي</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {s.isActive !== false ? 'مفعلة للحجز' : 'معطلة'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditService(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="تعديل الخدمة والأسعار"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>تعديل</span>
                          </button>
                          <button
                            onClick={() => handleOpenDeleteService(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="حذف الخدمة"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coordination Action Modal */}
      {coordinatingAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-300" />
                <span className="font-bold text-sm">تنسيق وتأكيد موعد ({coordinatingAppointment.patientName})</span>
              </div>
              <button
                onClick={() => setCoordinatingAppointment(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoordination} className="p-6 space-y-4 text-start text-xs sm:text-sm">
              {/* Call Prompt Strip & Payment Status */}
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-purple-800 block">رقم هاتف المريض للاتصال والتأكيد:</span>
                  <strong className="text-purple-950 text-sm font-mono">
                    {patients.find(p => p.id === coordinatingAppointment.patientId)?.phone || '0501234567'}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const isCoordinatingPaid = Boolean(
                      coordinatingAppointment.isPaid === true ||
                      coordinatingAppointment.paymentStatus === 'PAID' ||
                      coordinatingAppointment.paymentStatus === 'PAYMENT_SUCCESS' ||
                      (coordinatingAppointment as any).isApprovedByAdmin === true
                    );
                    return (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isCoordinatingPaid
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {isCoordinatingPaid ? 'تم السداد' : 'انتظار السداد'}
                      </span>
                    );
                  })()}
                  <a
                    href={`tel:${patients.find(p => p.id === coordinatingAppointment.patientId)?.phone}`}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-purple-700"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  حالة الموعد بعد التواصل
                </label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as AppointmentStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold"
                >
                  <option value="CONFIRMED">تأكيد الموعد (CONFIRMED)</option>
                  <option value="CONTACTED">تم الاتصال ولم يرد (CONTACTED)</option>
                  <option value="RESCHEDULED">إعادة جدولة (RESCHEDULED)</option>
                  <option value="CANCELLED">إلغاء الموعد بناءً على طلب المريض (CANCELLED)</option>
                </select>
              </div>

              {/* Confirmed Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">التاريخ المؤكد</label>
                  <input
                    type="date"
                    value={confirmedDate}
                    onChange={(e) => setConfirmedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">الساعة المحددة</label>
                  <input
                    type="text"
                    value={confirmedTime}
                    placeholder="مثال: 11:30 AM"
                    onChange={(e) => setConfirmedTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Clinic Room */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">العيادة وموقع الاستقبال</label>
                <input
                  type="text"
                  value={clinicRoom}
                  onChange={(e) => setClinicRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                  required
                />
              </div>

              {/* Coordinator Notes */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">ملاحظات التنسيق وسجل التواصل</label>
                <textarea
                  rows={2}
                  value={coordinatorNotes}
                  onChange={(e) => setCoordinatorNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 resize-none text-xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCoordinatingAppointment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ وإشعار المريض</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Patient Registration Modal */}
      {isQuickRegisterOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-300" />
                <span className="font-bold text-sm">تسجيل مريض جديد (فتح ملف سريع)</span>
              </div>
              <button
                onClick={() => setIsQuickRegisterOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickRegister} className="p-6 space-y-4 text-start text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">اسم المريض الثلاثي <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="مثال: فيصل فهد القحطاني"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  رقم الهاتف (المعرف الفريد) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">الجنس</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                  >
                    <option value="MALE">ذكر</option>
                    <option value="FEMALE">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuickRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>توليد MRN وفتح الملف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Service Modal */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-300" />
                <span className="font-bold text-sm">إضافة خدمة طبية جديدة لدليل الأسعار</span>
              </div>
              <button
                onClick={() => setIsNewServiceModalOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-white/80 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-6 space-y-4 text-xs sm:text-sm text-start">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">اسم الخدمة باللغة العربية <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newServiceNameAr}
                  onChange={(e) => setNewServiceNameAr(e.target.value)}
                  placeholder="مثال: فحص وظائف الرئة الشامل"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">اسم الخدمة بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  value={newServiceNameEn}
                  onChange={(e) => setNewServiceNameEn(e.target.value)}
                  placeholder="مثال: Pulmonary Function Test"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block font-bold text-slate-800 mb-1.5">
      السعر (ر.ي)
    </label>

    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={String(newServicePrice)}
      onChange={(e) => {
        const value = e.target.value.replace(/\D/g, "");
        setNewServicePrice(value === "" ? 0 : Number(value));
      }}
      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
      placeholder="أدخل السعر"
      required
    />
  </div>

  <div>
    <label className="block font-bold text-slate-800 mb-1.5">
      المدة (دقيقة)
    </label>

    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={String(newServiceDuration)}
      onChange={(e) => {
        const value = e.target.value.replace(/\D/g, "");
        setNewServiceDuration(value === "" ? 0 : Number(value));
      }}
      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
      placeholder="مثال: 30"
      required
    />
  </div>
</div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">القسم / العيادة</label>
                <input
                  type="text"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">وصف ومحتوى الخدمة</label>
                <textarea
                  rows={2}
                  value={newServiceDescAr}
                  onChange={(e) => setNewServiceDescAr(e.target.value)}
                  placeholder="وصف تفاصيل الخدمة والفحوصات المرفقة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewServiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer shadow-md"
                >
                  حفظ الخدمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-300" />
                <span className="font-bold text-sm">تعديل بيانات الخدمة الطبية والأسعار</span>
              </div>
              <button
                onClick={() => setEditingService(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditService} className="p-6 space-y-4 text-xs sm:text-sm text-start">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">اسم الخدمة باللغة العربية <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={editServiceNameAr}
                  onChange={(e) => setEditServiceNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">اسم الخدمة بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  value={editServiceNameEn}
                  onChange={(e) => setEditServiceNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">السعر الرسمي (ر.ي) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={editServicePrice}
                    onChange={(e) => setEditServicePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-blue-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">المدة التقديرية (دقيقة) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={editServiceDuration}
                    onChange={(e) => setEditServiceDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">القسم / التخصص التابع</label>
                <input
                  type="text"
                  value={editServiceCategory}
                  onChange={(e) => setEditServiceCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">وصف ومحتوى الخدمة الطبية</label>
                <textarea
                  rows={2}
                  value={editServiceDescAr}
                  onChange={(e) => setEditServiceDescAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">حالة الخدمة الطبية</span>
                  <span className="text-[11px] text-slate-500">عند التعطيل، لن تظهر في قائمة الحجز للمرضى</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editServiceIsActive}
                    onChange={(e) => setEditServiceIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Service Confirmation Modal */}
      {deletingService && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span className="font-bold text-sm">تأكيد حذف الخدمة الطبية</span>
              </div>
              <button
                onClick={() => setDeletingService(null)}
                className="p-1 rounded-lg hover:bg-rose-700 text-rose-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-start text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>هل أنت متأكد من رغبتك في حذف هذه الخدمة؟</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  سيتم حذف خدمة <strong>{deletingService.nameAr}</strong> بسعر ({deletingService.price} ر.ي) نهائياً من دليل الخدمات وقوائم الأسعار بالمستشفى.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingService(null)}
                  disabled={isDeletingService}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteService}
                  disabled={isDeletingService}
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingService ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Absent Notification Modal */}
      {isDoctorAbsentModalOpen && (() => {
        const currentDocAppointments = getDoctorAppointmentsForDate(selectedAbsentDoctorId, absentDate);
        const currentDocName = getDocName(selectedAbsentDoctorId);
        const sampleApt = currentDocAppointments.find(a => selectedAppointmentIdsForAbsence.includes(a.id)) || currentDocAppointments[0];
        const previewPatientName = sampleApt?.patientName || 'أحمد محمد';
        const previewTime = sampleApt?.confirmedTime || (sampleApt?.preferredPeriod === 'MORNING' ? 'الفترة الصباحية (09:30 ص)' : 'الفترة المسائية (05:00 م)') || '10:00 صباحاً';

        // Simulated resolved message for the live preview bubble
        const resolvedPreviewMessage = absentCustomMessage
          .replace(/{patientName}|{اسم_المريض}|\[اسم المريض\]/g, previewPatientName)
          .replace(/{doctorName}|{اسم_الطبيب}|\[اسم الطبيب\]/g, currentDocName)
          .replace(/{date}|{التاريخ}|\[التاريخ\]/g, absentDate)
          .replace(/{time}|{الوقت}|\[الوقت\]/g, previewTime);

        const handleSetQuickDate = (offsetDays: number) => {
          const d = new Date();
          d.setDate(d.getDate() + offsetDays);
          const dateStr = d.toISOString().split('T')[0];
          handleDateChangeInAbsentModal(dateStr);
        };

        const handleInsertVariable = (variableTag: string) => {
          setAbsentCustomMessage(prev => prev + ' ' + variableTag);
        };

        const handleApplyTemplate = (templateType: 'formal' | 'reschedule' | 'brief') => {
          if (templateType === 'formal') {
            setAbsentCustomMessage(
              `السلام عليكم ورحمة الله وبركاته،\nعزيزنا المريض: {اسم_المريض} المحترم،\n\nنود إحاطتكم علماً باعتذار الطبيب: {اسم_الطبيب} عن الدوام في العيادة بتاريخ: {التاريخ} لظرف طارئ خارج عن الإرادة.\nحرصاً على راحتكم ووقتكم الثمين، نرجو عدم الحضور إلى المستشفى.\n📞 سيقوم فريق خدمة العملاء بالتواصل معكم هاتفياً لتنسيق موعد بديل يناسبكم في أقرب وقت.\n\nمع تمنياتنا لكم بدوام الصحة والعافية.`
            );
          } else if (templateType === 'reschedule') {
            setAbsentCustomMessage(
              `عزيزنا المريض {اسم_المريض} المحترم،\nنفيدكم باعتذار الطبيب {اسم_الطبيب} عن الحضور للعيادة بتاريخ {التاريخ}. نرجو عدم الحضور إلى المستشفى في هذا الموعد، وسيقوم فريق المواعيد بالتواصل معكم هاتفياً لإعادة الجدولة في أقرب وقت متاح.\nشكراً لتفهمكم.`
            );
          } else if (templateType === 'brief') {
            setAbsentCustomMessage(
              `تنبيه هام من المستشفى: نعتذر منكم عن عدم دوام د. {اسم_الطبيب} بتاريخ {التاريخ}. يرجى عدم الحضور إلى العيادة وسنتواصل معكم هاتفياً لترتيب موعدكم البديل.`
            );
          }
        };

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/15 text-rose-100 shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">إشعار غياب الطبيب وتنبيه المرضى عبر واتساب</h3>
                    <p className="text-xs text-rose-150">تحديد الطبيب ويوم الغياب لعرض المرضى المحجوزين وصياغة الرسالة الموجهة لهم</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDoctorAbsentModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-rose-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendDoctorAbsentNotice} className="p-6 space-y-5 text-start text-xs sm:text-sm max-h-[85vh] overflow-y-auto">
                {/* Notice Info Box */}
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    حدد الطبيب واليوم الذي لم يداوم فيه لعرض جميع المرضى الذين حجزوا موعداً لديه في ذلك اليوم، وصِغ نص رسالة الواتساب كما ترغب لإبلاغهم قبل حضورهم للمستشفى.
                  </p>
                </div>

                {/* Step 1: Select Doctor and Absence Day */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-rose-600" />
                      <span>اختيار الطبيب الذي لم يداوم <span className="text-rose-500">*</span></span>
                    </label>
                    <select
                      value={selectedAbsentDoctorId}
                      onChange={(e) => handleDoctorChangeInAbsentModal(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-rose-500"
                      required
                    >
                      {doctors.map(doc => {
                        const countForDate = appointments.filter(a =>
                          (a.doctorId === doc.id || a.doctorId === doc.userId || a.doctorName === doc.fullName) &&
                          (a.confirmedDate === absentDate || a.preferredDate === absentDate) &&
                          a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
                        ).length;
                        return (
                          <option key={doc.id} value={doc.id}>
                            {doc.fullName} ({doc.specialty}) {countForDate > 0 ? `• [${countForDate} حجز]` : ''}
                          </option>
                        );
                      })}
                      {doctors.length === 0 && (
                        <option value="doc-1">د. عبدالله الشمري (استشاري جراحة القلب)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-rose-600" />
                        <span>في أي يوم (تاريخ الغياب) <span className="text-rose-500">*</span></span>
                      </label>
                      {/* Quick Day Selectors */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetQuickDate(0)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        >
                          اليوم
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickDate(1)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        >
                          غداً
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickDate(2)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        >
                          بعد غد
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={absentDate}
                      onChange={(e) => handleDateChangeInAbsentModal(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                </div>

                {/* Step 2: Display Patients Booked With This Doctor On That Day */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-800">
                        المرضى الذين حجزوا عند الطبيب في تاريخ ({absentDate}):
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        {currentDocAppointments.length} مريض
                      </span>
                    </div>

                    {currentDocAppointments.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllAppointmentsForAbsence(currentDocAppointments)}
                          className="text-xs font-bold text-rose-700 hover:text-rose-900 cursor-pointer flex items-center gap-1"
                        >
                          <span>{selectedAppointmentIdsForAbsence.length === currentDocAppointments.length ? 'إلغاء تحديد الكل' : 'تحديد جميع المرضى'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {currentDocAppointments.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center space-y-1.5">
                      <div className="inline-flex p-2.5 rounded-full bg-slate-100 text-slate-500">
                        <CalendarCheck className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 text-xs sm:text-sm">
                        لا يوجد أي مريض حجز موعداً مع ({currentDocName}) في تاريخ ({absentDate}).
                      </p>
                      <p className="text-[11px] text-slate-500">
                        يمكنك تغيير التاريخ في الأعلى أو اختيار طبيب آخر لعرض المرضى المحجوزين لديه وإشعارهم.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 space-y-2">
                      {currentDocAppointments.map(apt => {
                        const isSelected = selectedAppointmentIdsForAbsence.includes(apt.id);
                        const cleanPhone = (apt.patientPhone || '').replace(/[^\d+]/g, '');
                        const singleWhatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone.replace('+', '')}&text=${encodeURIComponent(
                          absentCustomMessage
                            .replace(/{patientName}|{اسم_المريض}|\[اسم المريض\]/g, apt.patientName)
                            .replace(/{doctorName}|{اسم_الطبيب}|\[اسم الطبيب\]/g, currentDocName)
                            .replace(/{date}|{التاريخ}|\[التاريخ\]/g, absentDate)
                            .replace(/{time}|{الوقت}|\[الوقت\]/g, apt.confirmedTime || 'الموعد المحدد')
                        )}`;

                        return (
                          <div
                            key={apt.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-rose-50/80 border-rose-300 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div
                              onClick={() => handleToggleAppointmentSelection(apt.id)}
                              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleAppointmentSelection(apt.id)}
                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <strong className="font-extrabold text-slate-900 text-xs sm:text-sm">{apt.patientName}</strong>
                                  <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                    {apt.patientPhone || 'لا يوجد هاتف'}
                                  </span>
                                  {apt.isDoctorAbsent && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                      أُرسل إشعار مسبقاً
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1 flex-wrap">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{apt.confirmedTime || (apt.preferredPeriod === 'MORNING' ? 'صباحاً' : 'مساءً')}</span>
                                  </span>
                                  <span>•</span>
                                  <span className="text-blue-700 font-medium">{apt.serviceName || 'استشارة طبية'}</span>
                                  {apt.mrn && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-400 text-[10px]">الملف: {apt.mrn}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Direct individual WhatsApp preview/chat trigger */}
                            {cleanPhone && (
                              <a
                                href={singleWhatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="إرسال رسالة واتساب مباشرة لهذا المريض"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">واتساب مباشر</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 3: Employee Crafts and Customizes the Sent WhatsApp Message */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-emerald-600" />
                      <span>صياغة نص رسالة الواتساب والإشعار (بإمكان الموظف كتابة وتعديل النص بحرية):</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {absentCustomMessage.length} حرف
                    </span>
                  </div>

                  {/* Ready Message Templates */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600 ml-1">نماذج مقترحة:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('formal')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      اعتذار رسمي مع بديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('reschedule')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      طلب إعادة الجدولة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('brief')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      إشعار مقتضب
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbsentCustomMessage(getDefaultAbsentDraft(currentDocName, absentDate))}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>استعادة النص الأصلي</span>
                    </button>
                  </div>

                  {/* Variable Insertion Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-600 ml-1">إدراج متغير تلقائي:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{اسم_المريض}')}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-mono cursor-pointer"
                      title="يتم استبداله تلقائياً باسم كل مريض"
                    >
                      + {'{اسم_المريض}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{اسم_الطبيب}')}
                      className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-mono cursor-pointer"
                      title="يتم استبداله باسم الطبيب الغائب"
                    >
                      + {'{اسم_الطبيب}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{التاريخ}')}
                      className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-mono cursor-pointer"
                      title="يتم استبداله بتاريخ الموعد"
                    >
                      + {'{التاريخ}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{الوقت}')}
                      className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-mono cursor-pointer"
                      title="يتم استبداله بوقت حجز المريض"
                    >
                      + {'{الوقت}'}
                    </button>
                  </div>

                  {/* Editable Textarea */}
                  <textarea
                    rows={4}
                    value={absentCustomMessage}
                    onChange={(e) => setAbsentCustomMessage(e.target.value)}
                    placeholder="اكتب هنا نص رسالة الواتساب والإشعار بالكامل..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 font-sans shadow-2xs"
                    required
                  />

                  {/* Live WhatsApp Bubble Preview */}
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>معاينة حية لشكل الرسالة على تطبيق واتساب للمريض ({previewPatientName}):</span>
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#EFEAE2] border border-slate-300">
                      <div className="max-w-md bg-[#DCF8C6] text-slate-900 rounded-xl p-3 shadow-xs border border-emerald-200 text-xs leading-relaxed whitespace-pre-line relative">
                        {resolvedPreviewMessage}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 font-mono">
                          <span>{new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                          <Check className="w-3 h-3 text-blue-500 inline" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDoctorAbsentModalOpen(false)}
                    disabled={isSendingAbsentNotice}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingAbsentNotice || selectedAppointmentIdsForAbsence.length === 0 || !absentCustomMessage.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSendingAbsentNotice
                        ? 'جاري إرسال الإشعارات وتجهيز الواتساب...'
                        : `إرسال وتجهيز واتساب لـ (${selectedAppointmentIdsForAbsence.length}) مريض`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* WhatsApp Dispatched Batch Modal */}
      {notifiedWhatsappBatch && notifiedWhatsappBatch.length > 0 && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/15 text-emerald-100">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">روابط إرسال واتساب لمرضى الطبيب الغائب</h3>
                  <p className="text-xs text-emerald-100">تم تجهيز نص الرسالة وتوجيهه لأرقام هواتف المرضى</p>
                </div>
              </div>
              <button
                onClick={() => setNotifiedWhatsappBatch(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-start text-xs sm:text-sm">
              <p className="text-xs text-slate-600">
                انقر على زر <strong>إرسال عبر واتساب</strong> بجوار كل مريض لفتح المحادثة وإرسال التنبيه فوراً عبر تطبيق WhatsApp:
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl border border-slate-200 p-2 bg-slate-50/50">
                {notifiedWhatsappBatch.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{item.patientName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.patientPhone || 'لا يوجد هاتف'}</div>
                    </div>
                    <a
                      href={item.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>إرسال عبر واتساب</span>
                    </a>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (absentCustomMessage) {
                      navigator.clipboard.writeText(absentCustomMessage);
                      showNotification('success', 'تم نسخ نص الرسالة إلى الحافظة بنجاح.');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>نسخ نص الرسالة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifiedWhatsappBatch(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
