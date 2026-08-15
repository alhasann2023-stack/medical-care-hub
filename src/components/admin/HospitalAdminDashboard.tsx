import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Stethoscope, 
  Calendar, 
  DollarSign, 
  Activity, 
  ShieldCheck, 
  Lock, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  TrendingUp,
  Clock,
  Sparkles,
  UserPlus,
  Headphones,
  Mail,
  Phone,
  Award,
  KeyRound,
  Check,
  Power,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  X,
  UserX
} from 'lucide-react';
import { Doctor, MedicalService, AuditLog, Staff } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const HospitalAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOCTORS' | 'STAFF' | 'SERVICES' | 'AUDIT_LOGS'>('OVERVIEW');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search filter for doctors
  const [doctorSearchQuery, setDoctorSearchQuery] = useState<string>('');

  // New Doctor Modal State
  const [isNewDoctorModalOpen, setIsNewDoctorModalOpen] = useState<boolean>(false);
  const [docFullName, setDocFullName] = useState<string>('');
  const [docEmail, setDocEmail] = useState<string>('');
  const [docPassword, setDocPassword] = useState<string>('');
  const [showDocPassword, setShowDocPassword] = useState<boolean>(false);
  const [docPhone, setDocPhone] = useState<string>('');
  const [docSpecialtyId, setDocSpecialtyId] = useState<string>('spec-1');
  const [docTitle, setDocTitle] = useState<string>('استشاري أول');
  const [docFee, setDocFee] = useState<number>(300);
  const [docRoom, setDocRoom] = useState<string>('عيادة 105');
  const [docExperience, setDocExperience] = useState<number>(10);
  const [docBio, setDocBio] = useState<string>('استشاري معتمد ذو خبرة إكلينيكية واسعة.');

  // Edit Doctor Modal State
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editDocFullName, setEditDocFullName] = useState<string>('');
  const [editDocEmail, setEditDocEmail] = useState<string>('');
  const [editDocPassword, setEditDocPassword] = useState<string>('');
  const [showEditDocPassword, setShowEditDocPassword] = useState<boolean>(false);
  const [editDocPhone, setEditDocPhone] = useState<string>('');
  const [editDocSpecialtyId, setEditDocSpecialtyId] = useState<string>('spec-1');
  const [editDocTitle, setEditDocTitle] = useState<string>('استشاري أول');
  const [editDocFee, setEditDocFee] = useState<number>(300);
  const [editDocRoom, setEditDocRoom] = useState<string>('عيادة 105');
  const [editDocExperience, setEditDocExperience] = useState<number>(10);
  const [editDocBio, setEditDocBio] = useState<string>('');
  const [editDocIsActive, setEditDocIsActive] = useState<boolean>(true);

  // Delete Doctor Confirmation State
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // New Staff (Customer Service) Modal State
  const [isNewStaffModalOpen, setIsNewStaffModalOpen] = useState<boolean>(false);
  const [staffFullName, setStaffFullName] = useState<string>('');
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [staffPhone, setStaffPhone] = useState<string>('');
  const [staffRoleTitle, setStaffRoleTitle] = useState<string>('منسق خدمة عملاء وحجوزات طبية');
  const [staffDepartment, setStaffDepartment] = useState<string>('مركز خدمة وتنسيق المواعيد');
  const [staffShift, setStaffShift] = useState<string>('الفترة الصباحية (08:00 ص - 04:00 م)');

  // New Service Modal
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState<boolean>(false);
  const [newServiceNameAr, setNewServiceNameAr] = useState<string>('');
  const [newServiceNameEn, setNewServiceNameEn] = useState<string>('');
  const [newServicePrice, setNewServicePrice] = useState<number>(250);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServiceCategory, setNewServiceCategory] = useState<string>('قسم العيادات التخصصية');
  const [newServiceDescAr, setNewServiceDescAr] = useState<string>('');

  // Service Search Filter
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');

  // Edit Service Modal State
  const [editingService, setEditingService] = useState<MedicalService | null>(null);
  const [editServiceNameAr, setEditServiceNameAr] = useState<string>('');
  const [editServiceNameEn, setEditServiceNameEn] = useState<string>('');
  const [editServicePrice, setEditServicePrice] = useState<number>(250);
  const [editServiceDuration, setEditServiceDuration] = useState<number>(30);
  const [editServiceCategory, setNewEditServiceCategory] = useState<string>('قسم العيادات التخصصية');
  const [editServiceDescAr, setEditServiceDescAr] = useState<string>('');
  const [editServiceIsActive, setEditServiceIsActive] = useState<boolean>(true);

  // Delete Service Confirmation State
  const [deletingService, setDeletingService] = useState<MedicalService | null>(null);
  const [isDeletingService, setIsDeletingService] = useState<boolean>(false);

  useEffect(() => {
    loadAdminData();
    // Real-time listener for doctors so newly created or edited doctors reflect immediately
    const unsubscribeDoctors = api.subscribeDoctors((liveDocs) => {
      if (liveDocs && liveDocs.length > 0) {
        setDoctors(liveDocs);
      }
    });

    return () => {
      unsubscribeDoctors();
    };
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [anlRes, docRes, srvRes, logRes, stfRes] = await Promise.all([
        api.getAdminAnalytics(),
        api.getDoctors(),
        api.getServices(),
        api.getAuditLogs(),
        api.getStaffList().catch(() => [])
      ]);
      setAnalytics(anlRes);
      setDoctors(docRes);
      setServices(srvRes);
      setAuditLogs(logRes);
      setStaffList(stfRes);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFullName.trim() || !docEmail.trim()) {
      showNotification('error', 'يرجى إدخال اسم الطبيب والبريد الإلكتروني.');
      return;
    }

    if (!docPassword.trim() || docPassword.trim().length < 6) {
      showNotification('error', 'يرجى إدخال كلمة مرور فريدة للطبيب (6 خانات على الأقل).');
      return;
    }

    try {
      await api.createDoctor({
        fullName: docFullName.trim(),
        email: docEmail.trim(),
        password: docPassword.trim(),
        phone: docPhone.trim() || '+966500000000',
        specialtyId: docSpecialtyId,
        title: docTitle,
        consultationFee: Number(docFee),
        roomNumber: docRoom,
        experienceYears: Number(docExperience),
        bioAr: docBio,
        qualifications: ['بورد تخصصي معتمد', 'ترخيص الهيئة السعودية للتخصصات الصحية SCFHS']
      });

      showNotification('success', `تم إنشاء حساب الاستشاري ${docFullName} مع بيانات الدخول بنجاح! يستطيع الطبيب تسجيل الدخول الآن.`);
      setIsNewDoctorModalOpen(false);
      setDocFullName('');
      setDocEmail('');
      setDocPassword('');
      setDocPhone('');
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل إنشاء حساب الطبيب.');
    }
  };

  const handleOpenEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setEditDocFullName(doctor.fullName);
    setEditDocEmail(doctor.email || `dr.${doctor.id}@medicalcarehub.com`);
    setEditDocPassword('');
    setShowEditDocPassword(false);
    setEditDocPhone(doctor.phone || '+966500000000');
    setEditDocSpecialtyId(doctor.specialtyId || 'spec-1');
    setEditDocTitle(doctor.title || 'استشاري أول');
    setEditDocFee(doctor.consultationFee || 300);
    setEditDocRoom(doctor.roomNumber || 'عيادة 105');
    setEditDocExperience(doctor.experienceYears || 10);
    setEditDocBio(doctor.bioAr || '');
    setEditDocIsActive(doctor.isActive ?? true);
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    if (!editDocFullName.trim() || !editDocEmail.trim()) {
      showNotification('error', 'الاسم والبريد الإلكتروني مطلوبان.');
      return;
    }

    try {
      await api.updateDoctor(editingDoctor.id, {
        fullName: editDocFullName.trim(),
        email: editDocEmail.trim(),
        password: editDocPassword.trim() ? editDocPassword.trim() : undefined,
        phone: editDocPhone.trim(),
        specialtyId: editDocSpecialtyId,
        title: editDocTitle,
        consultationFee: Number(editDocFee),
        roomNumber: editDocRoom,
        experienceYears: Number(editDocExperience),
        bioAr: editDocBio,
        isActive: editDocIsActive
      });

      showNotification('success', `تم تحديث بيانات وحساب الطبيب ${editDocFullName} بنجاح.`);
      setEditingDoctor(null);
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل تحديث بيانات الطبيب.');
    }
  };

  const handleConfirmDeleteDoctor = async () => {
    if (!deletingDoctor) return;
    setIsDeleting(true);
    try {
      await api.deleteDoctor(deletingDoctor.id);
      showNotification('success', `تم حذف حساب الطبيب ${deletingDoctor.fullName} وإلغاء صلاحياته نهائياً.`);
      setDeletingDoctor(null);
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل حذف حساب الطبيب.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffEmail.trim()) {
      showNotification('error', 'يرجى إدخال اسم الموظف والبريد الإلكتروني.');
      return;
    }

    try {
      await api.createStaff({
        fullName: staffFullName.trim(),
        email: staffEmail.trim(),
        phone: staffPhone.trim() || '+966560000000',
        roleTitle: staffRoleTitle,
        department: staffDepartment,
        shift: staffShift
      });

      showNotification('success', `تم إنشاء حساب موظف خدمة العملاء ${staffFullName} ومنحه الصلاحيات بنجاح!`);
      setIsNewStaffModalOpen(false);
      setStaffFullName('');
      setStaffEmail('');
      setStaffPhone('');
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل إنشاء حساب الموظف.');
    }
  };

  const handleToggleDoctorStatus = async (doctor: Doctor) => {
    try {
      await api.toggleDoctorStatus(doctor.id);
      showNotification('success', `تم تحديث حالة الطبيب ${doctor.fullName}.`);
      await loadAdminData();
    } catch (err: any) {
      showNotification('error', 'فشل تعديل حالة الطبيب.');
    }
  };

  const handleToggleStaffStatus = async (staff: Staff) => {
    try {
      await api.toggleStaffStatus(staff.id);
      showNotification('success', `تم تحديث حالة الموظف ${staff.fullName}.`);
      await loadAdminData();
    } catch (err: any) {
      showNotification('error', 'فشل تعديل حالة الموظف.');
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceNameAr.trim()) return;

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

      showNotification('success', 'تمت إضافة الخدمة بنجاح إلى الدليل الرسمي.');
      await loadAdminData();
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
    setNewEditServiceCategory(service.category || 'قسم العيادات التخصصية');
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
      await loadAdminData();
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
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل حذف الخدمة الطبية.');
    } finally {
      setIsDeletingService(false);
    }
  };

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

  const filteredDoctors = doctors.filter(doc => {
    if (!doctorSearchQuery.trim()) return true;
    const q = doctorSearchQuery.toLowerCase();
    return (
      doc.fullName.toLowerCase().includes(q) ||
      (doc.email && doc.email.toLowerCase().includes(q)) ||
      doc.specialtyNameAr.toLowerCase().includes(q) ||
      (doc.roomNumber && doc.roomNumber.toLowerCase().includes(q))
    );
  });

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
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/20">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                لوحة الإدارة والحوكمة ومنح الصلاحيات
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-300/30">
                المسؤول الأعلى (Super Admin)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              البريد المعتمد للمسؤول: <strong className="text-amber-300 font-mono">alhasann2023@gmail.com</strong>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              الجهة المخولة حصراً بإضافة الاستشاريين وتعيين كلمات المرور وتعديل وحذف الحسابات الطبية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setIsNewDoctorModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>إضافة استشاري مع كلمة المرور</span>
          </button>

          <button
            onClick={() => setIsNewStaffModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Headphones className="w-4 h-4 text-white" />
            <span>إضافة موظف خدمة عملاء</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">إجمالي المرضى المسجلين</span>
              <strong className="text-xl font-black text-slate-900">{analytics.totalPatients}</strong>
              <span className="text-[10px] text-emerald-600 font-bold block">تسجيل ذاتي معتمد</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">الأطباء الاستشاريون</span>
              <strong className="text-xl font-black text-slate-900">{doctors.length}</strong>
              <span className="text-[10px] text-emerald-700 font-bold block">معتمدين عبر الإدارة</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-700">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">فريق خدمة وتنسيق المواعيد</span>
              <strong className="text-xl font-black text-slate-900">{staffList.length}</strong>
              <span className="text-[10px] text-purple-700 font-bold block">موظف منسق</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">عمليات التدقيق الأمني</span>
              <strong className="text-xl font-black text-slate-900">{auditLogs.length}</strong>
              <span className="text-[10px] text-slate-400 block">حركات موثقة بالكامل</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>مؤشرات الأداء والحوكمة</span>
        </button>

        <button
          onClick={() => setActiveTab('DOCTORS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'DOCTORS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>إدارة وحسابات الاستشاريين ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'STAFF'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>إدارة خدمة العملاء والمنسقين ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'SERVICES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>دليل الخدمات والأسعار ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'AUDIT_LOGS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>سجل التدقيق الأمني (Audit Logs)</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>حوكمة الصلاحيات والأمان الطبي</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <strong className="text-amber-950 block">التحكم الكامل بحسابات الاستشاريين</strong>
                  <span className="text-amber-800">إضافة الطبيب، تعيين البريد وكلمة السر، التعديل والحذف حصرياً للمدير: alhasann2023@gmail.com</span>
                </div>
                <span className="px-2 py-1 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">مطبق</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <strong className="text-blue-950 block">دخول فوري ومباشر للأطباء</strong>
                  <span className="text-blue-800">بمجرد إنشاء الحساب، يستطيع الطبيب تسجيل الدخول فوراً عبر بريده وكلمة المرور</span>
                </div>
                <span className="px-2 py-1 rounded bg-blue-200 text-blue-900 font-bold text-[10px]">مفعل</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <strong className="text-emerald-950 block">التشفير وسجل التدقيق الشامل</strong>
                  <span className="text-emerald-800">توثيق كافة عمليات الإضافة، التعديل والحذف تلقائياً</span>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-200 text-emerald-900 font-bold text-[10px]">نشط</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>آخر النشاطات الإدارية والعمليات</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between">
                  <div>
                    <strong className="text-slate-900 block">{log.action}</strong>
                    <span className="text-slate-500">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString('ar-SA')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Doctors Management */}
      {activeTab === 'DOCTORS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                <span>إدارة حسابات الاستشاريين وصلاحيات الدخول</span>
              </h3>
              <p className="text-xs text-slate-500">إضافة الطبيب مع البريد وكلمة المرور، وإمكانية تعديل البيانات أو الحذف بالكامل</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث باسم الطبيب، البريد، التخصص..."
                  value={doctorSearchQuery}
                  onChange={(e) => setDoctorSearchQuery(e.target.value)}
                  className="pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none w-56 sm:w-64"
                />
              </div>

              <button
                onClick={() => setIsNewDoctorModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة طبيب استشاري جديد</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الطبيب الاستشاري</th>
                  <th className="p-3.5">بيانات الدخول (البريد والهاتف)</th>
                  <th className="p-3.5">التخصص / المسمى</th>
                  <th className="p-3.5">العيادة والرسوم</th>
                  <th className="p-3.5">الحالة والصلاحية</th>
                  <th className="p-3.5 text-center">الإجراءات والتحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا يوجد أطباء مطابقين للبحث.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={d.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'} 
                            alt={d.fullName} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                          />
                          <div>
                            <strong className="text-slate-900 text-xs block">{d.fullName}</strong>
                            <span className="text-[10px] text-slate-500 font-medium">خبرة {d.experienceYears} سنوات</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{d.email || `dr.${d.id}@medicalcarehub.com`}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{d.phone || '+966500000000'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">
                        <span className="font-bold text-slate-900 block">{d.specialtyNameAr}</span>
                        <span className="text-[10px] text-emerald-700 font-medium">{d.title}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-900 font-medium">{d.roomNumber}</div>
                        <span className="text-xs font-bold font-mono text-emerald-700">{d.consultationFee} ر.س</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          d.isActive 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${d.isActive ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                          {d.isActive ? 'مفعل ومصرح' : 'معطل مؤقتاً'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditDoctor(d)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="تعديل بيانات وحساب الطبيب"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleDoctorStatus(d)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              d.isActive 
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={d.isActive ? 'تعطيل الحساب مؤقتاً' : 'تفعيل الحساب'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingDoctor(d)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="حذف حساب الطبيب نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Tab 3: Staff Management */}
      {activeTab === 'STAFF' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">فريق خدمة العملاء وتنسيق المواعيد</h3>
              <p className="text-xs text-slate-500">إدارة صلاحيات موظفي الاستقبال وخدمة الحجوزات</p>
            </div>
            <button
              onClick={() => setIsNewStaffModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة موظف خدمة عملاء</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الموظف / المنسق</th>
                  <th className="p-3.5">البريد الإلكتروني</th>
                  <th className="p-3.5">المسمى الوظيفي والجهة</th>
                  <th className="p-3.5">فترة العمل</th>
                  <th className="p-3.5">الحالة والصلاحية</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((stf) => (
                  <tr key={stf.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div>
                        <span>{stf.fullName}</span>
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">{stf.phone}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">{stf.email}</td>
                    <td className="p-3.5 text-slate-700">
                      <strong>{stf.roleTitle}</strong>
                      <span className="block text-[10px] text-slate-400">{stf.department}</span>
                    </td>
                    <td className="p-3.5 text-slate-600">{stf.shift}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        stf.isActive 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {stf.isActive ? 'نشط ومصرح' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleToggleStaffStatus(stf)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          stf.isActive 
                            ? 'text-rose-600 hover:bg-rose-50' 
                            : 'text-purple-600 hover:bg-purple-50'
                        }`}
                        title={stf.isActive ? 'تعطيل الصلاحية' : 'تفعيل الصلاحية'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Services Catalog */}
      {activeTab === 'SERVICES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">دليل الخدمات الطبية وأسعار الكشوفات</h3>
              <p className="text-xs text-slate-500 mt-0.5">إدارة تسعير الخدمات، مدة الكشوفات، وتفعيل أو حذف الخدمات من النظام</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  placeholder="بحث باسم الخدمة أو السعر..."
                  className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                onClick={() => setIsNewServiceModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-xs"
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
                  <th className="p-3.5">القسم</th>
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
                      لا توجد خدمات مطابقة لبحثك في الدليل الطبي
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
                      <td className="p-3.5 font-black font-mono text-emerald-700 text-sm">{s.price} ر.س</td>
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
                            title="تعديل بيانات الخدمة والأسعار"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>تعديل</span>
                          </button>
                          <button
                            onClick={() => handleOpenDeleteService(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="حذف الخدمة الطبية"
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

      {/* Tab 5: Audit Logs */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">سجل التدقيق الأمني (Audit Logs Trail)</h3>
            </div>
            <span className="text-xs text-slate-500">توثيق العمليات الحساسة وتعديلات السجلات</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الوقت والتاريخ</th>
                  <th className="p-3.5">المستخدم المنفذ</th>
                  <th className="p-3.5">نوع العملية</th>
                  <th className="p-3.5">الجهة / المعرف</th>
                  <th className="p-3.5">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 font-mono">
                    <td className="p-3.5 text-slate-500">{new Date(log.createdAt).toLocaleString('ar-SA')}</td>
                    <td className="p-3.5 font-bold text-slate-900 font-sans">{log.actorName} ({log.actorRole})</td>
                    <td className="p-3.5 font-bold text-blue-700 font-sans">{log.action}</td>
                    <td className="p-3.5 text-slate-600">{log.entityId}</td>
                    <td className="p-3.5 text-slate-700 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE DOCTOR MODAL WITH EMAIL & PASSWORD */}
      {isNewDoctorModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">إضافة طبيب استشاري جديد وتعيين بيانات الدخول</h3>
                  <p className="text-[11px] text-emerald-200">منح الصلاحيات وتحديد كلمة المرور لتسجيل الدخول الفوري</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewDoctorModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="p-6 space-y-4 text-xs text-start max-h-[78vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم الكامل للطبيب / الاستشاري *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: د. عبد العزيز بن فيصل السبيعي"
                  value={docFullName}
                  onChange={(e) => setDocFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none font-medium"
                />
              </div>

              {/* Login Credentials Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>بيانات اعتماد تسجيل دخول الطبيب (Credentials)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني المهني *</label>
                    <input
                      type="email"
                      required
                      placeholder="doctor@medicalcarehub.com"
                      value={docEmail}
                      onChange={(e) => setDocEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">كلمة المرور للحساب *</label>
                    <div className="relative">
                      <input
                        type={showDocPassword ? 'text' : 'password'}
                        required
                        placeholder="أدخل كلمة المرور"
                        value={docPassword}
                        onChange={(e) => setDocPassword(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 outline-none font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDocPassword(!showDocPassword)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showDocPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-800">
                  * سيتمكن الطبيب من استخدام هذا البريد وكلمة المرور لتسجيل الدخول إلى حسابه والاطلاع على جدول العيادة والمواعيد.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الجوال المهني</label>
                  <input
                    type="tel"
                    placeholder="0501234567"
                    value={docPhone}
                    onChange={(e) => setDocPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرتبة والمسمى الوظيفي</label>
                  <select
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  >
                    <option value="استشاري أول">استشاري أول</option>
                    <option value="استشاري">استشاري</option>
                    <option value="أخصائي أول">أخصائي أول</option>
                    <option value="أخصائي">أخصائي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">التخصص الطبي</label>
                <select
                  value={docSpecialtyId}
                  onChange={(e) => setDocSpecialtyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                >
                  <option value="spec-1">طب وجراحة القلب والشرايين</option>
                  <option value="spec-2">طب الأسرة والباطنة</option>
                  <option value="spec-3">طب وجراحة العيون</option>
                  <option value="spec-4">طب الأطفال وحديثي الولادة</option>
                  <option value="spec-5">طب وجراحة العظام والمفاصل</option>
                  <option value="spec-6">الأمراض الجلدية والتجميل</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رسوم الكشف (ر.س)</label>
                  <input
                    type="number"
                    value={docFee}
                    onChange={(e) => setDocFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم العيادة</label>
                  <input
                    type="text"
                    value={docRoom}
                    onChange={(e) => setDocRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">سنوات الخبرة</label>
                  <input
                    type="number"
                    value={docExperience}
                    onChange={(e) => setDocExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نبذة تعريفية ومجالات الخبرة</label>
                <textarea
                  rows={2}
                  value={docBio}
                  onChange={(e) => setDocBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewDoctorModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد وإنشاء الحساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCTOR MODAL */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">تعديل بيانات وحساب الاستشاري</h3>
                  <p className="text-[11px] text-blue-200">تعديل الاسم، البريد، كلمة المرور، أو التفاصيل المهنية</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDoctor(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDoctor} className="p-6 space-y-4 text-xs text-start max-h-[78vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم الكامل للطبيب *</label>
                <input
                  type="text"
                  required
                  value={editDocFullName}
                  onChange={(e) => setEditDocFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none font-medium"
                />
              </div>

              {/* Login Credentials Box */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs">
                  <KeyRound className="w-4 h-4 text-blue-700" />
                  <span>تعديل بيانات الدخول (البريد وكلمة المرور)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      required
                      value={editDocEmail}
                      onChange={(e) => setEditDocEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-blue-600 outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input
                        type={showEditDocPassword ? 'text' : 'password'}
                        placeholder="اتركها فارغة للإبقاء على الحالية"
                        value={editDocPassword}
                        onChange={(e) => setEditDocPassword(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-blue-600 outline-none font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditDocPassword(!showEditDocPassword)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showEditDocPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    value={editDocPhone}
                    onChange={(e) => setEditDocPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرتبة والمسمى</label>
                  <select
                    value={editDocTitle}
                    onChange={(e) => setEditDocTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  >
                    <option value="استشاري أول">استشاري أول</option>
                    <option value="استشاري">استشاري</option>
                    <option value="أخصائي أول">أخصائي أول</option>
                    <option value="أخصائي">أخصائي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">التخصص الطبي</label>
                <select
                  value={editDocSpecialtyId}
                  onChange={(e) => setEditDocSpecialtyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                >
                  <option value="spec-1">طب وجراحة القلب والشرايين</option>
                  <option value="spec-2">طب الأسرة والباطنة</option>
                  <option value="spec-3">طب وجراحة العيون</option>
                  <option value="spec-4">طب الأطفال وحديثي الولادة</option>
                  <option value="spec-5">طب وجراحة العظام والمفاصل</option>
                  <option value="spec-6">الأمراض الجلدية والتجميل</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رسوم الكشف</label>
                  <input
                    type="number"
                    value={editDocFee}
                    onChange={(e) => setEditDocFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم العيادة</label>
                  <input
                    type="text"
                    value={editDocRoom}
                    onChange={(e) => setEditDocRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">سنوات الخبرة</label>
                  <input
                    type="number"
                    value={editDocExperience}
                    onChange={(e) => setEditDocExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نبذة تعريفية</label>
                <textarea
                  rows={2}
                  value={editDocBio}
                  onChange={(e) => setEditDocBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="editDocIsActiveCheckbox"
                  checked={editDocIsActive}
                  onChange={(e) => setEditDocIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="editDocIsActiveCheckbox" className="font-bold text-slate-800 cursor-pointer">
                  حساب الطبيب مفعل ويستقبل حجوزات المرضى
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DOCTOR CONFIRMATION MODAL */}
      {deletingDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">تأكيد حذف حساب الاستشاري</h3>
                  <p className="text-[11px] text-rose-100">إجراء أمني نهائي لا يمكن التراجع عنه</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingDoctor(null)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-start">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-950 block text-xs mb-1">تحذير حذف الحساب الطبي:</strong>
                  <p className="text-rose-800 text-[11px] leading-relaxed">
                    أنت على وشك حذف حساب الاستشاري <strong className="text-rose-950">{deletingDoctor.fullName}</strong> ({deletingDoctor.specialtyNameAr}). سيتم تعطيل وصوله وإلغاء صلاحيات دخوله للنظام فوراً.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <img 
                  src={deletingDoctor.avatar} 
                  alt={deletingDoctor.fullName} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-300" 
                />
                <div>
                  <strong className="text-slate-900 block">{deletingDoctor.fullName}</strong>
                  <span className="text-[11px] text-slate-500 font-mono">{deletingDoctor.email || 'doctor@medicalcarehub.com'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingDoctor(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteDoctor}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'جاري الحذف...' : 'نعم، احذف الحساب نهائياً'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      {isNewStaffModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">إضافة موظف خدمة عملاء وحجوزات</h3>
                  <p className="text-[11px] text-purple-200">منح صلاحيات تنسيق المواعيد وإدارة اتصالات المرضى</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewStaffModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4 text-xs text-start">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الموظف الثلاثي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: منى بنت فهد الحربي"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني المهني *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@hospital.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    placeholder="0561234567"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-purple-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={staffRoleTitle}
                    onChange={(e) => setStaffRoleTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">فترة المناوبة (Shift)</label>
                  <select
                    value={staffShift}
                    onChange={(e) => setStaffShift(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  >
                    <option value="الفترة الصباحية (08:00 ص - 04:00 م)">الفترة الصباحية (08:00 ص - 04:00 م)</option>
                    <option value="الفترة المسائية (04:00 م - 12:00 ص)">الفترة المسائية (04:00 م - 12:00 ص)</option>
                    <option value="فترة الطوارئ الليلية">فترة الطوارئ الليلية</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد الموظف ومنح الصلاحية</span>
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
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm">إضافة خدمة طبية جديدة</span>
              <button
                onClick={() => setIsNewServiceModalOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-6 space-y-4 text-xs sm:text-sm text-start">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">اسم الخدمة باللغة العربية</label>
                <input
                  type="text"
                  value={newServiceNameAr}
                  onChange={(e) => setNewServiceNameAr(e.target.value)}
                  placeholder="مثال: فحص إجهاد القلب بالمجهود"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">السعر (ر.س)</label>
                  <input
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">المدة (دقيقة)</label>
                  <input
                    type="number"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                    required
                  />
                </div>
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
                  className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
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
                  onChange={(e) => setNewEditServiceCategory(e.target.value)}
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
