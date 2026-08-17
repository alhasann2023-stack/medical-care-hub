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
  ClipboardList
} from 'lucide-react';
import { Appointment, Patient, AppointmentStatus, MedicalService } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export const CustomerServiceDashboard: React.FC = () => {
  const { staffProfile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'APPOINTMENTS' | 'SERVICES'>('APPOINTMENTS');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchPhoneOrMrn, setSearchPhoneOrMrn] = useState<string>('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

    // Real-time synchronization for Customer Service Dashboard
    const unsubApts = api.subscribeAppointments({}, (liveApts) => {
      if (liveApts) {
        setAppointments(liveApts);
      }
    });

    return () => {
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
      const [aptRes, patRes, srvRes] = await Promise.all([
        api.getAppointments(),
        api.getPatients(),
        api.getServices()
      ]);
      setAppointments(aptRes);
      setPatients(patRes);
      setServices(srvRes);
    } catch (err) {
      console.error('CS load error:', err);
    } finally {
      setIsLoading(false);
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
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              apt.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'CONTACTED'
                                ? 'bg-purple-100 text-purple-800'
                                : apt.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}>
                              {apt.status === 'CONFIRMED' ? 'مؤكد' : apt.status === 'CONTACTED' ? 'تم الاتصال' : apt.status === 'CANCELLED' ? 'ملغي' : 'طلب جديد'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleOpenCoordination(apt)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs mx-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تنسيق وتأكيد</span>
                            </button>
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
                      <td className="p-3.5 font-black font-mono text-purple-700 text-sm">{s.price} ر.س</td>
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
              {/* Call Prompt Strip */}
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-purple-800 block">رقم هاتف المريض للاتصال والتأكيد:</span>
                  <strong className="text-purple-950 text-sm font-mono">
                    {patients.find(p => p.id === coordinatingAppointment.patientId)?.phone || '0501234567'}
                  </strong>
                </div>
                <a
                  href={`tel:${patients.find(p => p.id === coordinatingAppointment.patientId)?.phone}`}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-purple-700"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>اتصال</span>
                </a>
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
                  <label className="block font-bold text-slate-800 mb-1.5">السعر الرسمي (ر.س) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-purple-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">المدة التقديرية (دقيقة) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono"
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
                  <label className="block font-bold text-slate-800 mb-1.5">السعر الرسمي (ر.س) <span className="text-rose-500">*</span></label>
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
                  سيتم حذف خدمة <strong>{deletingService.nameAr}</strong> بسعر ({deletingService.price} ر.س) نهائياً من دليل الخدمات وقوائم الأسعار بالمستشفى.
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
    </div>
  );
};
