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
  AlertCircle,
  UserX,
  Copy,
  Gift,
  Timer,
  ToggleLeft,
  ToggleRight,
  FlaskConical,
  ClipboardList,
  FileText,
  RefreshCw,
  Filter,
  Scan
} from 'lucide-react';
import { Doctor, MedicalService, AuditLog, Staff, FreeConsultationPromo, Patient } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AdminPaymentsManager } from './AdminPaymentsManager';
import { Receipt, CreditCard } from 'lucide-react';
import { INITIAL_DOCTORS, INITIAL_STAFF, INITIAL_SERVICES, INITIAL_PATIENTS } from '../../data/seedData';

export const HospitalAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [services, setServices] = useState<MedicalService[]>(INITIAL_SERVICES);
  const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PAYMENTS' | 'DOCTORS' | 'STAFF' | 'SERVICES' | 'AUDIT_LOGS'>('OVERVIEW');
  const [accountsSubTab, setAccountsSubTab] = useState<'DOCTORS' | 'CS' | 'SECRETARY' | 'ALL_STAFF'>('DOCTORS');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Free Consultations Promotion State
  const [freePromo, setFreePromo] = useState<FreeConsultationPromo | null>(null);
  const [promoTitle, setPromoTitle] = useState<string>('مناسبة خاصة - استشارات مجانية');
  const [promoDesc, setPromoDesc] = useState<string>('');
  const [promoBadge, setPromoBadge] = useState<string>('مبادرة مجانية 100%');
  const [promoHours, setPromoHours] = useState<number>(48);
  const [isSavingPromo, setIsSavingPromo] = useState<boolean>(false);

  // Admin-Defined Specific Whitelisted Patients for Free Consultation
  const [whitelistName, setWhitelistName] = useState<string>('');
  const [whitelistPhone, setWhitelistPhone] = useState<string>('');
  const [whitelistMrn, setWhitelistMrn] = useState<string>('');
  const [whitelistReason, setWhitelistReason] = useState<string>('إعفاء خاص بقرار الإدارة');
  const [isAddingWhitelist, setIsAddingWhitelist] = useState<boolean>(false);
  const [isRemovingWhitelistId, setIsRemovingWhitelistId] = useState<string | null>(null);

  // Search filter for doctors
  const [doctorSearchQuery, setDoctorSearchQuery] = useState<string>('');

  // New Doctor Modal State
  const [isNewDoctorModalOpen, setIsNewDoctorModalOpen] = useState<boolean>(false);
  const [docFullName, setDocFullName] = useState<string>('');
  const [docEmail, setDocEmail] = useState<string>('');
  const [docPassword, setDocPassword] = useState<string>('');
  const [showDocPassword, setShowDocPassword] = useState<boolean>(false);
  const [docPhone, setDocPhone] = useState<string>('');
  const [docSpecialtyId, setDocSpecialtyId] = useState<string>('أمراض القلب والأوعية الدموية');
  const [docTitle, setDocTitle] = useState<string>('استشاري أول');
const [docFee, setDocFee] = useState<number | ''>(300);
  const [docRoom, setDocRoom] = useState<string>('عيادة 105');
const [docExperience, setDocExperience] = useState('10');
  const [docBio, setDocBio] = useState<string>('استشاري معتمد ذو خبرة إكلينيكية واسعة.');

  // Edit Doctor Modal State
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editDocFullName, setEditDocFullName] = useState<string>('');
  const [editDocEmail, setEditDocEmail] = useState<string>('');
  const [editDocPassword, setEditDocPassword] = useState<string>('');
  const [showEditDocPassword, setShowEditDocPassword] = useState<boolean>(false);
  const [editDocPhone, setEditDocPhone] = useState<string>('');
  const [editDocSpecialtyId, setEditDocSpecialtyId] = useState<string>('');
  const [editDocTitle, setEditDocTitle] = useState<string>('استشاري أول');
const [editDocFee, setEditDocFee] = useState<number | ''>(300);
  const [editDocRoom, setEditDocRoom] = useState<string>('عيادة 105');

const [editDocExperience, setEditDocExperience] = useState<string>("10");
  const [editDocBio, setEditDocBio] = useState<string>('');
  const [editDocIsActive, setEditDocIsActive] = useState<boolean>(true);

  // Delete Doctor Confirmation State
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // New Staff (Secretary / Lab / Radiology / Customer Service) Modal State
  const [isNewStaffModalOpen, setIsNewStaffModalOpen] = useState<boolean>(false);
  const [staffAccountType, setStaffAccountType] = useState<'SECRETARY' | 'LAB_TECHNICIAN' | 'RADIOLOGY' | 'CUSTOMER_SERVICE'>('SECRETARY');
  const [staffCategoryFilter, setStaffCategoryFilter] = useState<'ALL' | 'SECRETARY' | 'LAB_TECHNICIAN' | 'RADIOLOGY' | 'CUSTOMER_SERVICE'>('ALL');
  const [staffFullName, setStaffFullName] = useState<string>('');
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [staffPhone, setStaffPhone] = useState<string>('');
  const [staffRoleTitle, setStaffRoleTitle] = useState<string>('سكرتير طبي واستقبال العيادات');
  const [staffDepartment, setStaffDepartment] = useState<string>('مكتب السكرتاريا والاستقبال العام');
  const [staffShift, setStaffShift] = useState<string>('الفترة الصباحية (08:00 ص - 04:00 م)');
  const [staffPassword, setStaffPassword] = useState<string>('');
  const [showStaffPassword, setShowStaffPassword] = useState<boolean>(false);
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState<{
    fullName: string;
    phone: string;
    password: string;
    roleTitle: string;
    shift: string;
    roleType?: string;
  } | null>(null);
  const [copiedStaffCreds, setCopiedStaffCreds] = useState<boolean>(false);

  const handleSelectStaffRole = (type: 'SECRETARY' | 'LAB_TECHNICIAN' | 'RADIOLOGY' | 'CUSTOMER_SERVICE') => {
    setStaffAccountType(type);
    if (type === 'SECRETARY') {
      setStaffRoleTitle('سكرتير طبي واستقبال العيادات');
      setStaffDepartment('مكتب السكرتاريا والاستقبال العام');
    } else if (type === 'LAB_TECHNICIAN') {
      setStaffRoleTitle('أخصائي وفني مختبر وتحاليل');
      setStaffDepartment('قسم المختبر والتحاليل الطبية');
    } else if (type === 'RADIOLOGY') {
      setStaffRoleTitle('أخصائي وفني قسم الأشعة والتصوير الطبي');
      setStaffDepartment('قسم الأشعة والتصوير الطبي والتحاليل');
    } else {
      setStaffRoleTitle('منسق خدمة عملاء ورعاية المرضى');
      setStaffDepartment('مركز خدمة وتنسيق المواعيد');
    }
  };

  const handleOpenNewSecretaryModal = () => {
    handleSelectStaffRole('SECRETARY');
    setStaffFullName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffPassword('');
    setIsNewStaffModalOpen(true);
  };

  const handleOpenNewLabModal = () => {
    handleSelectStaffRole('LAB_TECHNICIAN');
    setStaffFullName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffPassword('');
    setIsNewStaffModalOpen(true);
  };

  const handleOpenNewRadiologyModal = () => {
    handleSelectStaffRole('RADIOLOGY');
    setStaffFullName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffPassword('');
    setIsNewStaffModalOpen(true);
  };

  const handleOpenNewCSModal = () => {
    handleSelectStaffRole('CUSTOMER_SERVICE');
    setStaffFullName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffPassword('');
    setIsNewStaffModalOpen(true);
  };

  // Audit Logs Filtering & Helpers
  const [auditLogSearchQuery, setAuditLogSearchQuery] = useState<string>('');
  const [auditLogRoleFilter, setAuditLogRoleFilter] = useState<string>('ALL');
  const [isRefreshingLogs, setIsRefreshingLogs] = useState<boolean>(false);

  const handleRefreshAuditLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      const logs = await api.getAuditLogs(100);
      setAuditLogs(logs);
      showNotification('success', 'تم تحديث وتوثيق سجل التدقيق والعمليات بنجاح.');
    } catch (e) {
      console.warn('Failed to refresh audit logs:', e);
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return { label: 'تسجيل دخول', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'ADD_STAFF':
        return { label: 'إنشاء حساب موظف', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'SEND_LAB_TEST':
      case 'ADD_TEST_RESULT':
      case 'UPDATE_TEST_RESULT':
        return { label: 'فحوصات ومختبر', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'CONFIRM_APPOINTMENT':
      case 'CREATE_APPOINTMENT':
        return { label: 'حجز واستقبال', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'UPDATE_DOCTOR':
      case 'ADD_DOCTOR':
        return { label: 'إدارة الاستشاريين', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'CREATE_PRESCRIPTION':
        return { label: 'وصفة علاجية', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'CREATE_REPORT':
        return { label: 'تقرير طبي', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'SAVE_PROMO':
        return { label: 'مبادرة مجانية', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'PAYMENT':
        return { label: 'عملية دفع', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      default:
        return { label: action, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'HOSPITAL_ADMIN':
        return { label: 'المدير العام', color: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'DOCTOR':
        return { label: 'طبيب استشاري', color: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'LAB_TECHNICIAN':
        return { label: 'فني مختبر', color: 'bg-cyan-100 text-cyan-900 border-cyan-300' };
      case 'RADIOLOGY':
        return { label: 'قسم الأشعة والتصوير', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      case 'SECRETARY':
        return { label: 'سكرتاريا واستقبال', color: 'bg-teal-100 text-teal-900 border-teal-300' };
      case 'CUSTOMER_SERVICE':
        return { label: 'خدمة عملاء', color: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'PATIENT':
        return { label: 'مريض', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      default:
        return { label: role || 'نظام', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editStaffFullName, setEditStaffFullName] = useState<string>('');
  const [editStaffEmail, setEditStaffEmail] = useState<string>('');
  const [editStaffPhone, setEditStaffPhone] = useState<string>('');
  const [editStaffRoleTitle, setEditStaffRoleTitle] = useState<string>('منسق خدمة عملاء وحجوزات طبية');
  const [editStaffDepartment, setEditStaffDepartment] = useState<string>('مركز خدمة وتنسيق المواعيد');
  const [editStaffShift, setEditStaffShift] = useState<string>('الفترة الصباحية (08:00 ص - 04:00 م)');
  const [editStaffPassword, setEditStaffPassword] = useState<string>('');
  const [showEditStaffPassword, setShowEditStaffPassword] = useState<boolean>(false);
  const [editStaffIsActive, setEditStaffIsActive] = useState<boolean>(true);

  // Delete Staff Confirmation State
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState<boolean>(false);

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

    const unsubscribePromo = api.subscribeFreeConsultationPromo((promo) => {
      setFreePromo(promo);
    });

    const unsubscribeStaff = api.subscribeStaff((liveStaff) => {
      if (liveStaff && liveStaff.length > 0) {
        setStaffList(liveStaff);
      }
    });

    return () => {
      unsubscribeDoctors();
      unsubscribePromo();
      unsubscribeStaff();
    };
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [anlRes, docRes, srvRes, logRes, stfRes, promoRes, patRes] = await Promise.all([
        api.getAdminAnalytics().catch(() => null),
        api.getDoctors().catch(() => []),
        api.getServices().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getStaffList().catch(() => []),
        api.getFreeConsultationPromo().catch(() => null),
        api.getPatients().catch(() => [])
      ]);
      if (anlRes) setAnalytics(anlRes);
      if (Array.isArray(docRes) && docRes.length > 0) {
        setDoctors(docRes);
      } else if (INITIAL_DOCTORS.length > 0) {
        setDoctors(INITIAL_DOCTORS);
      }

      if (Array.isArray(srvRes) && srvRes.length > 0) {
        setServices(srvRes);
      } else if (INITIAL_SERVICES.length > 0) {
        setServices(INITIAL_SERVICES);
      }

      if (Array.isArray(logRes)) setAuditLogs(logRes);

      if (Array.isArray(stfRes) && stfRes.length > 0) {
        setStaffList(stfRes);
      } else if (INITIAL_STAFF.length > 0) {
        setStaffList(INITIAL_STAFF);
      }

      if (Array.isArray(patRes) && patRes.length > 0) {
        setPatients(patRes);
      } else if (INITIAL_PATIENTS.length > 0) {
        setPatients(INITIAL_PATIENTS);
      }
      if (promoRes) {
        setFreePromo(promoRes);
        setPromoTitle(promoRes.occasionTitle || '');
        setPromoDesc(promoRes.occasionDescription || '');
        setPromoBadge(promoRes.bannerBadgeText || 'مبادرة مجانية 100%');
        setPromoHours(promoRes.durationHours || 48);
      }
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFreePromo = async () => {
    try {
      const res = await api.toggleFreeConsultationPromo();
      setFreePromo(res.promo);
      showNotification(
        'success',
        res.isActive
          ? `تم تفعيل الاستشارات المجانية بنجاح بمناسبة: ${res.promo.occasionTitle}!`
          : 'تم إيقاف حملة الاستشارات المجانية والعودة للرسوم الاعتيادية.'
      );
    } catch (err: any) {
      showNotification('error', err.message || 'فشل تغيير حالة الاستشارات المجانية.');
    }
  };

  const handleSaveFreePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim()) {
      showNotification('error', 'يرجى كتابة عنوان المناسبة.');
      return;
    }
    setIsSavingPromo(true);
    try {
      const hours = Number(promoHours) || 48;
      const now = new Date();
      const endDate = new Date(now.getTime() + hours * 3600 * 1000).toISOString();

      const res = await api.saveFreeConsultationPromo({
        occasionTitle: promoTitle.trim(),
        occasionDescription: promoDesc.trim(),
        bannerBadgeText: promoBadge.trim() || 'مبادرة مجانية 100%',
        durationHours: hours,
        startDate: now.toISOString(),
        endDate: endDate,
        autoExpire: true,
        applicableDoctors: 'ALL'
      });

      setFreePromo(res.promo);
      showNotification('success', res.message || 'تم حفظ إعدادات المناسبة والاستشارات المجانية بنجاح!');
    } catch (err: any) {
      showNotification('error', err.message || 'فشل حفظ إعدادات المناسبة.');
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitelistPhone.trim() && !whitelistName.trim() && !whitelistMrn.trim()) {
      showNotification('error', 'يرجى إدخال رقم هاتف المريض أو اسمه لتحديد المستفيد من الاستشارة المجانية.');
      return;
    }
    setIsAddingWhitelist(true);
    try {
      // Find patient by phone if registered
      const cleanPhone = whitelistPhone.trim().replace(/\D/g, '');
      const matchedByPhone = patients.find((p: Patient) => p.phone && p.phone.replace(/\D/g, '').includes(cleanPhone.slice(-7)));
      
      const res = await api.addFreeConsultationWhitelist({
        patientId: matchedByPhone?.id,
        patientName: whitelistName.trim() || matchedByPhone?.fullName || (whitelistPhone.trim() ? `مريض برقم (${whitelistPhone.trim()})` : 'مريض معتمد'),
        patientPhone: whitelistPhone.trim() || matchedByPhone?.phone || undefined,
        patientMrn: whitelistMrn.trim() || matchedByPhone?.mrn || undefined,
        reason: whitelistReason.trim() || 'إعفاء خاص بقرار إدارة المستشفى',
        grantedBy: user?.fullName || 'مدير المستشفى'
      });
      if (res.whitelistedPatients) {
        setFreePromo(prev => ({
          ...(prev || {
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
            updatedAt: new Date().toISOString(),
            whitelistedPatients: []
          }),
          whitelistedPatients: res.whitelistedPatients
        }));
      }
      setWhitelistName('');
      setWhitelistPhone('');
      setWhitelistMrn('');
      setWhitelistReason('إعفاء خاص بقرار الإدارة');
      showNotification('success', res.message || 'تم اعتماد الاستشارة المجانية للمريض بنجاح!');
    } catch (err: any) {
      showNotification('error', err.message || 'فشل اعتماد الاستشارة المجانية للمريض.');
    } finally {
      setIsAddingWhitelist(false);
    }
  };

  const handleRemoveWhitelist = async (id: string) => {
    setIsRemovingWhitelistId(id);
    try {
      const res = await api.removeFreeConsultationWhitelist(id);
      if (res.whitelistedPatients) {
        setFreePromo(prev => prev ? { ...prev, whitelistedPatients: res.whitelistedPatients } : null);
      }
      showNotification('success', res.message || 'تم إلغاء الاستشارة المجانية للمريض.');
    } catch (err: any) {
      showNotification('error', err.message || 'فشل إلغاء الإعفاء.');
    } finally {
      setIsRemovingWhitelistId(null);
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFullName.trim() || !docPhone.trim()) {
      showNotification('error', 'يرجى إدخال اسم الطبيب ورقم الهاتف.');
      return;
    }

    if (!docPassword.trim() || docPassword.trim().length < 6) {
      showNotification('error', 'يرجى إدخال كلمة مرور فريدة للطبيب (6 خانات على الأقل).');
      return;
    }

    try {
      await api.createDoctor({
        fullName: docFullName.trim(),
        email: docEmail.trim() || undefined,
        phone: docPhone.trim(),
        password: docPassword.trim(),
        specialtyId: docSpecialtyId.trim() || 'spec-general',
        specialtyNameAr: docSpecialtyId.trim() || 'طب عام',
        title: docTitle,
consultationFee: docFee === '' ? 0 : docFee,
        roomNumber: docRoom,
        experienceYears: Number(docExperience) || 0,
        bioAr: docBio,
        qualifications: ['بورد تخصصي معتمد', 'ترخيص الهيئة السعودية للتخصصات الصحية SCFHS']
      });

      showNotification('success', `تم إنشاء حساب الاستشاري ${docFullName} مع بيانات الدخول بنجاح! يستطيع الطبيب تسجيل الدخول الآن برقم الهاتف.`);
      setIsNewDoctorModalOpen(false);
      setDocFullName('');
      setDocEmail('');
      setDocPassword('');
      setDocPhone('');
      setDocSpecialtyId('أمراض القلب والأوعية الدموية');
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
    setEditDocPhone(doctor.phone || '');
    setEditDocSpecialtyId(doctor.specialtyNameAr || doctor.specialtyId || '');
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
    if (!editDocFullName.trim() || !editDocPhone.trim()) {
      showNotification('error', 'الاسم ورقم الهاتف مطلوبان.');
      return;
    }

    try {
      await api.updateDoctor(editingDoctor.id, {
        fullName: editDocFullName.trim(),
        password: editDocPassword.trim() ? editDocPassword.trim() : undefined,
        phone: editDocPhone.trim(),
        specialtyId: editDocSpecialtyId.trim() || 'spec-general',
        specialtyNameAr: editDocSpecialtyId.trim() || 'طب عام',
        title: editDocTitle,
consultationFee: editDocFee === '' ? 0 : editDocFee,
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

  const generateStaffPassword = () => {
    const generated = `Staff@${Math.floor(1000 + Math.random() * 9000)}`;
    setStaffPassword(generated);
    setShowStaffPassword(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffPhone.trim()) {
      showNotification('error', 'يرجى إدخال اسم الموظف ورقم الهاتف.');
      return;
    }

    const assignedPassword = staffPassword.trim() || `Staff@${Math.floor(1000 + Math.random() * 9000)}`;
    if (assignedPassword.length < 6) {
      showNotification('error', 'يجب ألا تقل كلمة المرور عن 6 خانات.');
      return;
    }

    const roleAr = staffAccountType === 'SECRETARY' 
      ? 'السكرتارية والاستقبال' 
      : (staffAccountType === 'LAB_TECHNICIAN' 
        ? 'أخصائي وفني المختبر والتحاليل' 
        : (staffAccountType === 'RADIOLOGY' ? 'قسم الأشعة والتصوير الطبي' : 'خدمة العملاء والتنسيق'));

    try {
      await api.createStaff({
        fullName: staffFullName.trim(),
        email: staffEmail.trim() || undefined,
        phone: staffPhone.trim(),
        role: staffAccountType,
        roleTitle: staffRoleTitle,
        department: staffDepartment,
        shift: staffShift,
        password: assignedPassword
      });

      setCreatedStaffCredentials({
        fullName: staffFullName.trim(),
        phone: staffPhone.trim(),
        password: assignedPassword,
        roleTitle: staffRoleTitle,
        shift: staffShift,
        roleType: staffAccountType
      });
      setCopiedStaffCreds(false);

      showNotification('success', `تم إنشاء حساب ${roleAr} (${staffFullName}) وتوليد بيانات الدخول بنجاح!`);
      setIsNewStaffModalOpen(false);
      setStaffFullName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPassword('');
      setShowStaffPassword(false);
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

  const handleOpenEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setEditStaffFullName(staff.fullName);
    setEditStaffEmail(staff.email);
    setEditStaffPhone(staff.phone || '');
    setEditStaffRoleTitle(staff.roleTitle || 'منسق خدمة عملاء وحجوزات طبية');
    setEditStaffDepartment(staff.department || 'مركز خدمة وتنسيق المواعيد');
    setEditStaffShift(staff.shift || 'الفترة الصباحية (08:00 ص - 04:00 م)');
    setEditStaffPassword('');
    setEditStaffIsActive(staff.isActive);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!editStaffFullName.trim() || !editStaffPhone.trim()) {
      showNotification('error', 'يرجى إدخال اسم الموظف ورقم الهاتف.');
      return;
    }

    try {
      await api.updateStaff(editingStaff.id, {
        fullName: editStaffFullName.trim(),
        phone: editStaffPhone.trim(),
        roleTitle: editStaffRoleTitle,
        department: editStaffDepartment,
        shift: editStaffShift,
        isActive: editStaffIsActive,
        ...(editStaffPassword.trim() ? { password: editStaffPassword.trim() } : {})
      });

      showNotification('success', `تم تحديث بيانات موظف خدمة العملاء ${editStaffFullName} بنجاح.`);
      setEditingStaff(null);
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل تحديث بيانات الموظف.');
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!deletingStaff) return;

    try {
      setIsDeletingStaff(true);
      await api.deleteStaff(deletingStaff.id);
      showNotification('success', `تم حذف حساب موظف خدمة العملاء ${deletingStaff.fullName} وإلغاء صلاحياته نهائياً.`);
      setDeletingStaff(null);
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'فشل حذف حساب الموظف.');
    } finally {
      setIsDeletingStaff(false);
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

  const filteredServices = services.filter((srv: MedicalService) => {
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

  const filteredDoctors = doctors.filter((doc: Doctor) => {
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
              الرقم والهاتف المعتمد للمسؤول: <strong className="text-amber-300 font-mono">776458925</strong>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              الجهة المخولة حصراً بإضافة الاستشاريين وتعيين كلمات المرور وتعديل وحذف الحسابات الطبية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={handleOpenNewSecretaryModal}
            className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            title="إنشاء حساب سكرتير واستقبال العيادات"
          >
            <ClipboardList className="w-4 h-4 text-white" />
            <span>+ إنشاء حساب سكرتير (استقبال)</span>
          </button>

          <button
            onClick={handleOpenNewLabModal}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            title="إنشاء حساب أخصائي مختبر وفني تحاليل"
          >
            <FlaskConical className="w-4 h-4 text-white" />
            <span>+ إنشاء حساب مختبري (تحاليل)</span>
          </button>

          <button
            onClick={() => setIsNewDoctorModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>+ إضافة استشاري طبي</span>
          </button>

          <button
            onClick={handleOpenNewCSModal}
            className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Headphones className="w-4 h-4 text-white" />
            <span>+ إضافة خدمة عملاء</span>
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
          onClick={() => setActiveTab('PAYMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PAYMENTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-emerald-800 border border-emerald-300/60 hover:bg-emerald-50'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>المدفوعات وسندات القبض (الفواتير)</span>
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
          <Users className="w-4 h-4" />
          <span>إدارة الكوادر: السكرتارية والمختبر وخدمة العملاء ({staffList.length})</span>
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
        <div className="space-y-6">
          {/* Free Consultations Promotion Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
              freePromo?.isActive
                ? 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800'
                : 'bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  freePromo?.isActive ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-white/10 text-slate-300'
                }`}>
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg">مبادرة الاستشارات الطبية المجانية للمناسبات</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      freePromo?.isActive
                        ? 'bg-emerald-300 text-emerald-950 animate-pulse'
                        : 'bg-white/20 text-slate-300'
                    }`}>
                      {freePromo?.isActive ? 'مفعلة ونشطة حالياً ⚡' : 'متوقفة (رسوم اعتيادية)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-0.5">
                    إمكانية فتح الاستشارات الطبية مجاناً 100% لجميع المرضى في المناسبات والأعياد لفترة زمنية محددة.
                  </p>
                </div>
              </div>

              {/* Instant Toggle Button */}
              <button
                type="button"
                onClick={handleToggleFreePromo}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-md cursor-pointer shrink-0 ${
                  freePromo?.isActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                }`}
              >
                {freePromo?.isActive ? (
                  <>
                    <Power className="w-4 h-4" />
                    <span>إيقاف المبادرة المجانية</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>تفعيل الاستشارات المجانية الآن</span>
                  </>
                )}
              </button>
            </div>

            {/* Promo Settings Form & Metrics */}
            <form onSubmit={handleSaveFreePromo} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Occasion Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    عنوان المناسبة أو المبادرة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={promoTitle}
                    onChange={(e) => setPromoTitle(e.target.value)}
                    placeholder="مثال: بمناسبة اليوم الوطني، عيد الفطر، مبادرة أمل..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                {/* Badge text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نص الشارة الترويجية (Badge)
                  </label>
                  <input
                    type="text"
                    value={promoBadge}
                    onChange={(e) => setPromoBadge(e.target.value)}
                    placeholder="مثال: مبادرة مجانية 100%، هدية المستشفى..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Duration in Hours */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    مدة العرض والفتح المجاني
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={promoHours}
                      onChange={(e) => setPromoHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    >
                      <option value={12}>12 ساعة (نصف يوم)</option>
                      <option value={24}>24 ساعة (يوم كامل)</option>
                      <option value={48}>48 ساعة (يومان)</option>
                      <option value={72}>72 ساعة (3 أيام)</option>
                      <option value={168}>168 ساعة (أسبوع كامل)</option>
                      <option value={720}>30 يوماً (شهر)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description / Announcement written by Admin */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    رسالة الإعلان والتوضيح للمرضى (يقوم الآدمن بكتابتها فقط)
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">تظهر للمرضى في لوحة التحكم والبانر التعريفي</span>
                </div>
                <textarea
                  rows={3}
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  placeholder="اكتب هنا نص الإعلان والرسالة التوضيحية للمرضى بمناسبة الاستشارات المجانية (مثال: يسر إدارة المجمع تقديم استشارات طبية مجانية لجميع المرضى مع نخبة الاستشاريين...)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Status and Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>المدة المحددة: <strong>{promoHours} ساعة</strong></span>
                  </div>
                  {freePromo?.isActive && freePromo.endDate && (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <Timer className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span>ينتهي التفعيل تلقائياً في: {new Date(freePromo.endDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingPromo}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isSavingPromo ? 'جارٍ الحفظ...' : 'حفظ إعدادات المناسبة'}</span>
                </button>
              </div>
            </form>

            {/* One Free Consultation per Patient Policy Banner */}
            <div className="mx-5 sm:mx-6 mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <strong className="font-extrabold text-emerald-950">قاعدة الحوكمة: استشارة مجانية واحدة لكل مريض فقط</strong>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">مفعلة وتلقائية</span>
                </div>
                <p className="text-emerald-800 mt-0.5 leading-relaxed">
                  عند تفعيل المبادرة المجانية، يحصل كل مريض على استشارة واحدة فقط مجاناً (0 ر.ي). إذا أرسل المريض استشارة ثانية أو لاحقة، يتم تحويلها تلقائياً إلى استشارة مدفوعة بالرسوم المعتمدة للطبيب لحماية وقت الاستشاريين.
                </p>
              </div>
            </div>

            {/* Admin-Defined Free Consultations Whitelist Section */}
            <div className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      استشارات مجانية لأشخاص محددين (اعتماد خاص بقرار الإدارة)
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800">
                      {freePromo?.whitelistedPatients?.length || 0} مرضى معتمدين
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    يمكن للآدمن تحديد أشخاص أو حالات خاصة بالاسم أو رقم الهاتف أو الملف لمنحهم استشارة طبية مجانية استثنائية حتى خارج فترات المبادرات العامة.
                  </p>
                </div>
              </div>

              {/* Add Whitelist Patient Form */}
              <form onSubmit={handleAddWhitelist} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم هاتف المريض <span className="text-blue-600 font-bold">(المحدد الأساسي) *</span>
                    </label>
                    <input
                      type="text"
                      value={whitelistPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWhitelistPhone(val);
                        // Auto-fill name/mrn if matching existing patient
                        const clean = val.replace(/\D/g, '');
                        if (clean.length >= 7) {
                          const matched = patients.find(p => p.phone && p.phone.replace(/\D/g, '').includes(clean.slice(-7)));
                          if (matched && !whitelistName) {
                            setWhitelistName(matched.fullName);
                            if (matched.mrn && !whitelistMrn) setWhitelistMrn(matched.mrn);
                          }
                        }
                      }}
                      placeholder="مثال: 776123456 أو 0501234567"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-blue-50/30 text-slate-900 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    {whitelistPhone && (() => {
                      const clean = whitelistPhone.replace(/\D/g, '');
                      const matched = patients.find(p => p.phone && p.phone.replace(/\D/g, '').includes(clean.slice(-7)));
                      return matched ? (
                        <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>مرتبط بـ: {matched.fullName} ({matched.mrn})</span>
                        </p>
                      ) : null;
                    })()}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      اسم المريض
                    </label>
                    <input
                      type="text"
                      value={whitelistName}
                      onChange={(e) => setWhitelistName(e.target.value)}
                      placeholder="اسم المريض أو اللقب"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم الملف الطبي (MRN)
                    </label>
                    <input
                      type="text"
                      value={whitelistMrn}
                      onChange={(e) => setWhitelistMrn(e.target.value)}
                      placeholder="مثال: MRN-2026-1001"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      سبب الإعفاء المعتمد <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={whitelistReason}
                      onChange={(e) => setWhitelistReason(e.target.value)}
                      placeholder="مثال: رعاية إنسانية، قرار إدارة..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">أسباب شائعة:</span>
                    <button
                      type="button"
                      onClick={() => setWhitelistReason('إعفاء إنساني خاص بقرار الإدارة')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      إعفاء إنساني
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhitelistReason('متابعة علاجية مجانية خاصة')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      متابعة علاجية
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhitelistReason('منسوب مستشفى أو عائلة')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      منسوب مستشفى
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingWhitelist}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAddingWhitelist ? 'جارٍ الاعتماد...' : 'اعتماد استشارة مجانية للمريض'}</span>
                  </button>
                </div>
              </form>

              {/* Whitelisted Patients Table / List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                {(!freePromo?.whitelistedPatients || freePromo.whitelistedPatients.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    لا يوجد حالياً مرضى مضافون لقائمة الاستشارات المجانية الخاصة. يمكنك إضافة مريض من النموذج أعلاه.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">المريض</th>
                          <th className="py-2.5 px-3">الهاتف / الملف</th>
                          <th className="py-2.5 px-3">سبب الإعفاء</th>
                          <th className="py-2.5 px-3">تاريخ الاعتماد</th>
                          <th className="py-2.5 px-3 text-center">الحالة</th>
                          <th className="py-2.5 px-3 text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {freePromo.whitelistedPatients.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {item.patientName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                              {item.patientPhone || item.patientMrn || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/60 font-medium">
                                {item.reason}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {new Date(item.grantedAt).toLocaleDateString('ar-SA')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {(item.usedCount || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  تم الاستخدام ({item.usedCount})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  متاحة للاستخدام
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveWhitelist(item.id)}
                                disabled={isRemovingWhitelistId === item.id}
                                className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                title="إلغاء الإعفاء المجاني"
                              >
                                {isRemovingWhitelistId === item.id ? 'جارٍ الحذف...' : 'إلغاء الإعفاء'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                    <span className="text-amber-800">إضافة الطبيب، تعيين الهاتف وكلمة السر، التعديل والحذف حصرياً للمدير (776458925)</span>
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
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>آخر النشاطات الإدارية والعمليات</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    {auditLogs.length} عملية مسجلة
                  </span>
                </h3>
                <button
                  onClick={() => setActiveTab('AUDIT_LOGS')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>عرض السجل الكامل</span>
                  <span>←</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <p className="text-xs">لا توجد سجلات تدقيق حالياً.</p>
                  </div>
                ) : (
                  auditLogs.slice(0, 6).map((log) => {
                    const actionBadge = getActionBadge(log.action);
                    const roleBadge = getRoleBadge(log.actorRole || log.userRole);
                    const actorName = log.actorName || log.userName || 'مستخدم النظام';
                    const timeStr = new Date(log.createdAt || log.timestamp || Date.now()).toLocaleTimeString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const dateStr = new Date(log.createdAt || log.timestamp || Date.now()).toLocaleDateString('ar-SA', {
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${actionBadge.color}`}>
                              {actionBadge.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${roleBadge.color}`}>
                              {roleBadge.label}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">
                              {actorName}
                            </span>
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed font-sans pt-0.5">
                            {log.details}
                          </p>
                        </div>
                        <div className="text-left shrink-0 text-[11px] text-slate-400 font-mono flex sm:flex-col items-center sm:items-end gap-1 sm:gap-0">
                          <span>{timeStr}</span>
                          <span className="text-[10px] text-slate-400">{dateStr}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {auditLogs.length > 6 && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setActiveTab('AUDIT_LOGS')}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>عرض سجل التدقيق الأمني والعمليات الكامل ({auditLogs.length})</span>
                    <span>←</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Financial & Payments Management */}
      {activeTab === 'PAYMENTS' && (
        <AdminPaymentsManager onShowNotification={showNotification} />
      )}

      {/* Tab 2: Doctors & Staff Accounts Management */}
      {activeTab === 'DOCTORS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                <span>إدارة حسابات الاستشاريين وصلاحيات الدخول</span>
              </h3>
              <p className="text-xs text-slate-500">إدارة حسابات الأطباء الاستشاريين، موظفي خدمة العملاء، والسكرتارية والاستقبال</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={accountsSubTab === 'DOCTORS' ? "بحث باسم الطبيب، البريد، التخصص..." : "بحث باسم الموظف، الهاتف، القسم..."}
                  value={doctorSearchQuery}
                  onChange={(e) => setDoctorSearchQuery(e.target.value)}
                  className="pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none w-56 sm:w-64"
                />
              </div>

              {accountsSubTab === 'DOCTORS' ? (
                <button
                  type="button"
                  onClick={() => setIsNewDoctorModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة طبيب استشاري جديد</span>
                </button>
              ) : accountsSubTab === 'CS' ? (
                <button
                  type="button"
                  onClick={handleOpenNewCSModal}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Headphones className="w-4 h-4" />
                  <span>+ إنشاء حساب خدمة عملاء</span>
                </button>
              ) : accountsSubTab === 'SECRETARY' ? (
                <button
                  type="button"
                  onClick={handleOpenNewSecretaryModal}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>+ إنشاء حساب سكرتير واستقبال</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenNewCSModal}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>+ خدمة عملاء</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenNewSecretaryModal}
                    className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>+ سكرتير</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-Tabs bar to seamlessly switch between Doctors, Customer Service, and Secretary */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAccountsSubTab('DOCTORS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountsSubTab === 'DOCTORS'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>الأطباء الاستشاريون ({doctors.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountsSubTab('CS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountsSubTab === 'CS'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-purple-500" />
              <span>موظفو خدمة العملاء ({staffList.filter(s => !s.roleTitle?.includes('سكرتير') && !s.roleTitle?.includes('مختبر') && !s.roleTitle?.includes('تحاليل') && !s.roleTitle?.includes('أشعة') && !s.department?.includes('سكرتاريا') && !s.department?.includes('مختبر') && !s.department?.includes('أشعة')).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountsSubTab('SECRETARY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountsSubTab === 'SECRETARY'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-teal-500" />
              <span>السكرتارية والاستقبال ({staffList.filter(s => s.roleTitle?.includes('سكرتير') || s.department?.includes('سكرتاريا')).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountsSubTab('ALL_STAFF')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountsSubTab === 'ALL_STAFF'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>جميع الكوادر والموظفين ({staffList.length})</span>
            </button>
          </div>

          {/* Render Doctors Table */}
          {accountsSubTab === 'DOCTORS' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">الطبيب الاستشاري</th>
                    <th className="p-3.5">بيانات الدخول (رقم الهاتف)</th>
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
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{d.phone}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          <span className="font-bold text-slate-900 block">{d.specialtyNameAr}</span>
                          <span className="text-[10px] text-emerald-700 font-medium">{d.title}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-900 font-medium">{d.roomNumber}</div>
                          <span className="text-xs font-bold font-mono text-emerald-700">{d.consultationFee} ر.ي</span>
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
          ) : (
            /* Render Staff Table (Customer Service, Secretary, etc.) */
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">الموظف / الكادر</th>
                    <th className="p-3.5">نوع الحساب والصلاحية</th>
                    <th className="p-3.5">رقم الهاتف (بيانات الدخول)</th>
                    <th className="p-3.5">المسمى والجهة التابعة</th>
                    <th className="p-3.5">فترة العمل</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList
                    .filter(stf => {
                      const isSec = stf.roleTitle?.includes('سكرتير') || stf.department?.includes('سكرتاريا');
                      const isRad = stf.roleTitle?.includes('أشعة') || stf.department?.includes('أشعة');
                      const isLab = !isRad && (stf.roleTitle?.includes('مختبر') || stf.roleTitle?.includes('تحاليل') || stf.department?.includes('مختبر'));
                      const isCS = !isSec && !isLab && !isRad;

                      if (accountsSubTab === 'CS' && !isCS) return false;
                      if (accountsSubTab === 'SECRETARY' && !isSec) return false;

                      if (!doctorSearchQuery.trim()) return true;
                      const q = doctorSearchQuery.toLowerCase();
                      return (
                        stf.fullName.toLowerCase().includes(q) ||
                        (stf.email && stf.email.toLowerCase().includes(q)) ||
                        stf.phone.toLowerCase().includes(q) ||
                        (stf.roleTitle && stf.roleTitle.toLowerCase().includes(q)) ||
                        (stf.department && stf.department.toLowerCase().includes(q))
                      );
                    })
                    .map((stf) => {
                      const isSec = stf.roleTitle?.includes('سكرتير') || stf.department?.includes('سكرتاريا');
                      const isRad = stf.roleTitle?.includes('أشعة') || stf.department?.includes('أشعة');
                      const isLab = !isRad && (stf.roleTitle?.includes('مختبر') || stf.roleTitle?.includes('تحاليل') || stf.department?.includes('مختبر'));

                      return (
                        <tr key={stf.id} className="hover:bg-slate-50">
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <img
                                src={stf.avatar || (isRad ? 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80')}
                                alt={stf.fullName}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                              />
                              <div>
                                <span>{stf.fullName}</span>
                                <span className="block text-[10px] text-slate-400 font-mono">{stf.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            {isSec ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                                <ClipboardList className="w-3 h-3" />
                                <span>سكرتير طبي واستقبال</span>
                              </span>
                            ) : isRad ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                <Scan className="w-3 h-3" />
                                <span>قسم الأشعة والتصوير</span>
                              </span>
                            ) : isLab ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                <FlaskConical className="w-3 h-3" />
                                <span>فني وأخصائي مختبر</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                                <Headphones className="w-3 h-3" />
                                <span>خدمة عملاء وتنسيق</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{stf.phone}</span>
                            </div>
                          </td>

                          <td className="p-3.5 text-slate-700">
                            <strong>{stf.roleTitle}</strong>
                            <span className="block text-[10px] text-slate-400">{stf.department}</span>
                          </td>

                          <td className="p-3.5 text-slate-600">{stf.shift}</td>

                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              stf.isActive 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {stf.isActive ? 'نشط ومصرح' : 'معطل'}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditStaff(stf)}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="تعديل بيانات وصلاحيات الموظف"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStaffStatus(stf)}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                  stf.isActive 
                                    ? 'text-amber-600 hover:bg-amber-50' 
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={stf.isActive ? 'تعطيل الحساب مؤقتاً' : 'تفعيل الحساب'}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingStaff(stf)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="حذف حساب الموظف نهائياً"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Staff Management (Secretary, Lab, Customer Service) */}
      {activeTab === 'STAFF' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          {/* Header & Quick Action Buttons */}
          <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm">إدارة الكوادر الطبية والإدارية</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white">
                  السكرتارية • المختبر • خدمة العملاء
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                إنشاء وتعيين حسابات السكرتارية والاستقبال، فنيي وأخصائيي المختبر، ومنسقي خدمة العملاء
              </p>
            </div>

            {/* Prominent Creation Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenNewSecretaryModal}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <ClipboardList className="w-4 h-4" />
                <span>+ إنشاء حساب سكرتير واستقبال</span>
              </button>

              <button
                onClick={handleOpenNewLabModal}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <FlaskConical className="w-4 h-4" />
                <span>+ إنشاء حساب مختبري / فني تحاليل</span>
              </button>

              <button
                onClick={handleOpenNewRadiologyModal}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Scan className="w-4 h-4" />
                <span>+ إنشاء حساب قسم الأشعة</span>
              </button>

              <button
                onClick={handleOpenNewCSModal}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Headphones className="w-4 h-4" />
                <span>+ إنشاء حساب خدمة عملاء</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStaffCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                staffCategoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              جميع الكوادر ({staffList.length})
            </button>
            <button
              onClick={() => setStaffCategoryFilter('SECRETARY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                staffCategoryFilter === 'SECRETARY'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>السكرتارية والاستقبال ({staffList.filter(s => s.roleTitle?.includes('سكرتير') || s.department?.includes('سكرتاريا')).length})</span>
            </button>
            <button
              onClick={() => setStaffCategoryFilter('LAB_TECHNICIAN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                staffCategoryFilter === 'LAB_TECHNICIAN'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>فنيو وأخصائيو المختبر ({staffList.filter(s => !s.roleTitle?.includes('أشعة') && !s.department?.includes('أشعة') && (s.roleTitle?.includes('مختبر') || s.roleTitle?.includes('تحاليل') || s.department?.includes('مختبر'))).length})</span>
            </button>
            <button
              onClick={() => setStaffCategoryFilter('RADIOLOGY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                staffCategoryFilter === 'RADIOLOGY'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>قسم الأشعة والتصوير ({staffList.filter(s => s.roleTitle?.includes('أشعة') || s.department?.includes('أشعة')).length})</span>
            </button>
            <button
              onClick={() => setStaffCategoryFilter('CUSTOMER_SERVICE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                staffCategoryFilter === 'CUSTOMER_SERVICE'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>خدمة العملاء ({staffList.filter(s => !s.roleTitle?.includes('سكرتير') && !s.roleTitle?.includes('مختبر') && !s.roleTitle?.includes('تحاليل') && !s.roleTitle?.includes('أشعة') && !s.department?.includes('سكرتاريا') && !s.department?.includes('مختبر') && !s.department?.includes('أشعة')).length})</span>
            </button>
          </div>

          {/* Staff Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الموظف / الكادر</th>
                  <th className="p-3.5">نوع الحساب والصلاحية</th>
                  <th className="p-3.5">رقم الهاتف (بيانات الدخول)</th>
                  <th className="p-3.5">المسمى والجهة التابعة</th>
                  <th className="p-3.5">فترة العمل</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList
                  .filter(stf => {
                    const isSec = stf.roleTitle?.includes('سكرتير') || stf.department?.includes('سكرتاريا');
                    const isRad = stf.roleTitle?.includes('أشعة') || stf.department?.includes('أشعة');
                    const isLab = !isRad && (stf.roleTitle?.includes('مختبر') || stf.roleTitle?.includes('تحاليل') || stf.department?.includes('مختبر'));
                    if (staffCategoryFilter === 'SECRETARY') return isSec;
                    if (staffCategoryFilter === 'LAB_TECHNICIAN') return isLab;
                    if (staffCategoryFilter === 'RADIOLOGY') return isRad;
                    if (staffCategoryFilter === 'CUSTOMER_SERVICE') return !isSec && !isLab && !isRad;
                    return true;
                  })
                  .map((stf) => {
                    const isSec = stf.roleTitle?.includes('سكرتير') || stf.department?.includes('سكرتاريا');
                    const isRad = stf.roleTitle?.includes('أشعة') || stf.department?.includes('أشعة');
                    const isLab = !isRad && (stf.roleTitle?.includes('مختبر') || stf.roleTitle?.includes('تحاليل') || stf.department?.includes('مختبر'));

                    return (
                      <tr key={stf.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <img
                              src={stf.avatar || (isRad ? 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80')}
                              alt={stf.fullName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                            />
                            <div>
                              <span>{stf.fullName}</span>
                              <span className="block text-[10px] text-slate-400 font-mono">{stf.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          {isSec ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                              <ClipboardList className="w-3 h-3" />
                              <span>سكرتير طبي واستقبال</span>
                            </span>
                          ) : isRad ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <Scan className="w-3 h-3" />
                              <span>قسم الأشعة والتصوير</span>
                            </span>
                          ) : isLab ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200">
                              <FlaskConical className="w-3 h-3" />
                              <span>فني وأخصائي مختبر</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                              <Headphones className="w-3 h-3" />
                              <span>خدمة عملاء وتنسيق</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{stf.phone}</span>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          <strong>{stf.roleTitle}</strong>
                          <span className="block text-[10px] text-slate-400">{stf.department}</span>
                        </td>

                        <td className="p-3.5 text-slate-600">{stf.shift}</td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            stf.isActive 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {stf.isActive ? 'نشط ومصرح' : 'معطل'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditStaff(stf)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="تعديل بيانات وصلاحيات الموظف"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStaffStatus(stf)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                stf.isActive 
                                  ? 'text-amber-600 hover:bg-amber-50' 
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={stf.isActive ? 'تعطيل الحساب مؤقتاً' : 'تفعيل الحساب'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingStaff(stf)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف حساب الموظف نهائياً"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                      <td className="p-3.5 font-black font-mono text-emerald-700 text-sm">{s.price} ر.ي</td>
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
        <div className="space-y-4">
          {/* Audit Controls & Filters Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    سجل التدقيق الأمني والعمليات الشامل (Audit Logs Trail)
                  </h3>
                  <p className="text-xs text-slate-500">
                    توثيق لكافة العمليات الإدارية، المخبرية، السكرتارية، الاستشارات الطبية، وإجراءات الدخول
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshAuditLogs}
                  disabled={isRefreshingLogs}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="تحديث ومزامنة أحدث العمليات"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                  <span>تحديث السجل</span>
                </button>
              </div>
            </div>

            {/* Search and Role Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={auditLogSearchQuery}
                  onChange={(e) => setAuditLogSearchQuery(e.target.value)}
                  placeholder="بحث باسم المنفذ، نوع العملية، أو التفاصيل..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Role filter buttons */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {[
                  { id: 'ALL', label: 'الكل' },
                  { id: 'HOSPITAL_ADMIN', label: 'الإدارة العامة' },
                  { id: 'LAB_TECHNICIAN', label: 'المختبر والتحاليل' },
                  { id: 'SECRETARY', label: 'السكرتاريا والاستقبال' },
                  { id: 'DOCTOR', label: 'الاستشاريون' },
                  { id: 'CUSTOMER_SERVICE', label: 'خدمة العملاء' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAuditLogRoleFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      auditLogRoleFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Logs Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-44">الوقت والتاريخ</th>
                    <th className="p-3.5 w-48">المستخدم المنفذ والرتبة</th>
                    <th className="p-3.5 w-36">نوع العملية</th>
                    <th className="p-3.5 w-32">المعرف / الهدف</th>
                    <th className="p-3.5">تفاصيل العملية وتوثيق الإجراء</th>
                    <th className="p-3.5 w-24 text-center">عنوان IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = auditLogs.filter((log) => {
                      const actor = (log.actorName || log.userName || '').toLowerCase();
                      const role = (log.actorRole || log.userRole || '').toLowerCase();
                      const action = (log.action || '').toLowerCase();
                      const details = (log.details || '').toLowerCase();
                      const entity = (log.entityId || log.targetId || '').toLowerCase();
                      const q = auditLogSearchQuery.toLowerCase().trim();

                      const matchesQuery = !q || actor.includes(q) || role.includes(q) || action.includes(q) || details.includes(q) || entity.includes(q);
                      if (!matchesQuery) return false;

                      if (auditLogRoleFilter === 'ALL') return true;
                      if (auditLogRoleFilter === 'HOSPITAL_ADMIN') return (log.actorRole || log.userRole) === 'HOSPITAL_ADMIN';
                      if (auditLogRoleFilter === 'LAB_TECHNICIAN') return (log.actorRole || log.userRole) === 'LAB_TECHNICIAN' || log.action?.includes('LAB') || log.details?.includes('مختبر');
                      if (auditLogRoleFilter === 'SECRETARY') return (log.actorRole || log.userRole) === 'SECRETARY' || log.details?.includes('سكرتير') || log.details?.includes('استقبال');
                      if (auditLogRoleFilter === 'DOCTOR') return (log.actorRole || log.userRole) === 'DOCTOR' || log.action?.includes('PRESCRIPTION') || log.action?.includes('REPORT');
                      if (auditLogRoleFilter === 'CUSTOMER_SERVICE') return (log.actorRole || log.userRole) === 'CUSTOMER_SERVICE';
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-slate-400">
                            <div className="max-w-xs mx-auto space-y-2">
                              <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="font-bold text-slate-700 text-sm">لا توجد عمليات مطابقة</p>
                              <p className="text-xs text-slate-400">لم يتم العثور على سجلات تطابق معايير البحث أو التصفية الحالية.</p>
                              {(auditLogSearchQuery || auditLogRoleFilter !== 'ALL') && (
                                <button
                                  onClick={() => {
                                    setAuditLogSearchQuery('');
                                    setAuditLogRoleFilter('ALL');
                                  }}
                                  className="mt-2 text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                                >
                                  إعادة ضبط التصفية
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((log) => {
                      const actionBadge = getActionBadge(log.action);
                      const roleBadge = getRoleBadge(log.actorRole || log.userRole);
                      const actorName = log.actorName || log.userName || 'المدير المعتمد';
                      const created = log.createdAt || log.timestamp || new Date().toISOString();

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                            <span className="block font-bold text-slate-800">
                              {new Date(created).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="text-slate-400">
                              {new Date(created).toLocaleTimeString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block text-xs">
                              {actorName}
                            </span>
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${roleBadge.color}`}>
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] border ${actionBadge.color}`}>
                              {actionBadge.label}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                            {log.entityId || log.targetId || '-'}
                          </td>
                          <td className="p-3.5 text-slate-700 leading-relaxed max-w-md">
                            {log.details}
                          </td>
                          <td className="p-3.5 text-center text-slate-400 font-mono text-[11px]">
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
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
                  placeholder="مثال: د. الحسن نشوان    "
                  value={docFullName}
                  onChange={(e) => setDocFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none font-medium"
                />
              </div>

              {/* Login Credentials Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>بيانات اعتماد تسجيل دخول الطبيب (رقم الهاتف وكلمة المرور)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الهاتف (لتسجيل الدخول) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 0501234567"
                      value={docPhone}
                      onChange={(e) => setDocPhone(e.target.value)}
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
                  * سيتمكن الطبيب من استخدام رقم الهاتف هذا وكلمة المرور لتسجيل الدخول مباشرة إلى حسابه وإدارة جدول العيادة والمواعيد.
                </p>
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


              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  التخصص الطبي <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="doctor-specialties-options"
                  required
                  value={docSpecialtyId}
                  onChange={(e) => setDocSpecialtyId(e.target.value)}
                  placeholder="اختر أو اكتب التخصص الطبي (مثال: أمراض القلب، باطنية...)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                />
                <datalist id="doctor-specialties-options">
                  <option value="أمراض القلب والأوعية الدموية" />
                  <option value="طب الباطنة والجهاز الهضمي" />
                  <option value="طب وجراحة العيون" />
                  <option value="طب الأطفال وحديثي الولادة" />
                  <option value="جراحة العظام والمفاصل" />
                  <option value="طب النساء والولادة" />
                  <option value="طب وجراحة المسالك البولية" />
                  <option value="طب وجراحة الأنف والأذن والحنجرة" />
                  <option value="طب وجراحة الفم والأسنان" />
                  <option value="الأمراض الجلدية والتناسلية" />
                  <option value="طب وجراحة المخ والأعصاب" />
                  <option value="الطب النفسي والعصبي" />
                  <option value="الجراحة العامة وجراحة المناظير" />
                  <option value="طب الأسرة والرعاية الأولية" />
                </datalist>
              </div>



  <div className="grid grid-cols-3 gap-2">
  <div>
    <label className="block font-bold text-slate-700 mb-1">
      رسوم الكشف (ر.ي)
    </label>

    <input
      type="number"
      inputMode="decimal"
      value={docFee}
      onChange={(e) => {
        const value = e.target.value;
        setDocFee(value === '' ? '' : Number(value));
      }}
      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
      placeholder="300"
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
  <label className="block font-bold text-slate-700 mb-1">
    سنوات الخبرة
  </label>

  <input
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    value={docExperience}
    onChange={(e) => {
      setDocExperience(e.target.value.replace(/[^0-9]/g, ''));
    }}
    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
    placeholder="مثال: 10"
    autoComplete="off"
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
                  <span>تعديل بيانات الدخول (رقم الهاتف وكلمة المرور)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الهاتف (لتسجيل الدخول) *</label>
                    <input
                      type="tel"
                      required
                      value={editDocPhone}
                      onChange={(e) => setEditDocPhone(e.target.value)}
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


              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  التخصص الطبي <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="edit-doctor-specialties-options"
                  required
                  value={editDocSpecialtyId}
                  onChange={(e) => setEditDocSpecialtyId(e.target.value)}
                  placeholder="اختر أو اكتب التخصص الطبي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                />
                <datalist id="edit-doctor-specialties-options">
                  <option value="أمراض القلب والأوعية الدموية" />
                  <option value="طب الباطنة والجهاز الهضمي" />
                  <option value="طب وجراحة العيون" />
                  <option value="طب الأطفال وحديثي الولادة" />
                  <option value="جراحة العظام والمفاصل" />
                  <option value="طب النساء والولادة" />
                  <option value="طب وجراحة المسالك البولية" />
                  <option value="طب وجراحة الأنف والأذن والحنجرة" />
                  <option value="طب وجراحة الفم والأسنان" />
                  <option value="الأمراض الجلدية والتناسلية" />
                  <option value="طب وجراحة المخ والأعصاب" />
                  <option value="الطب النفسي والعصبي" />
                  <option value="الجراحة العامة وجراحة المناظير" />
                  <option value="طب الأسرة والرعاية الأولية" />
                </datalist>
              </div>

              <div className="grid grid-cols-3 gap-2">
<div>
  <label className="block font-bold text-slate-700 mb-1">
    رسوم الكشف
  </label>

  <input
    type="number"
    inputMode="decimal"
    min="0"
    value={editDocFee}
    onChange={(e) => {
      const value = e.target.value;
      setEditDocFee(value === '' ? '' : Number(value));
    }}
    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
    placeholder="مثال: 300"
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
  <label className="block font-bold text-slate-700 mb-1">
    سنوات الخبرة
  </label>

  <input
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    value={editDocExperience}
    onChange={(e) => {
      const value = e.target.value;

      // السماح بالأرقام فقط
      if (/^\d*$/.test(value)) {
        setEditDocExperience(value);
      }
    }}
    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
    placeholder="مثال: 10"
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
                  <span className="text-[11px] text-slate-500 font-mono">{deletingDoctor.phone}</span>
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

      {/* CREATE STAFF MODAL (SECRETARY / LAB / CUSTOMER SERVICE) */}
      {isNewStaffModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Dynamic Modal Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              staffAccountType === 'SECRETARY' 
                ? 'bg-gradient-to-r from-teal-800 to-emerald-900' 
                : staffAccountType === 'LAB_TECHNICIAN'
                ? 'bg-gradient-to-r from-cyan-900 via-slate-900 to-cyan-950'
                : staffAccountType === 'RADIOLOGY'
                ? 'bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950'
                : 'bg-gradient-to-r from-purple-800 to-indigo-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  {staffAccountType === 'SECRETARY' ? (
                    <ClipboardList className="w-5 h-5 text-teal-300" />
                  ) : staffAccountType === 'LAB_TECHNICIAN' ? (
                    <FlaskConical className="w-5 h-5 text-cyan-300" />
                  ) : staffAccountType === 'RADIOLOGY' ? (
                    <Scan className="w-5 h-5 text-indigo-300" />
                  ) : (
                    <Headphones className="w-5 h-5 text-purple-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">
                    {staffAccountType === 'SECRETARY' 
                      ? 'إنشاء حساب سكرتير طبي واستقبال العيادات' 
                      : staffAccountType === 'LAB_TECHNICIAN'
                      ? 'إنشاء حساب أخصائي / فني مختبر وتحاليل'
                      : staffAccountType === 'RADIOLOGY'
                      ? 'إنشاء حساب قسم الأشعة والتصوير الطبي'
                      : 'إضافة موظف خدمة عملاء ورعاية المرضى'}
                  </h3>
                  <p className="text-[11px] opacity-80">
                    {staffAccountType === 'SECRETARY' 
                      ? 'استقبال المراجعين، تأكيد الحجوزات، وطباعة الفحوصات والوصفات'
                      : staffAccountType === 'LAB_TECHNICIAN'
                      ? 'إجراء الفحوصات المخبرية وإرسال النتائج للأطباء المعالجين والمرضى'
                      : staffAccountType === 'RADIOLOGY'
                      ? 'إرفاق صور وملفات الأشعة والتحاليل للمريض وللطبيب المعالج'
                      : 'الرد على استفسارات المرضى وتنسيق المواعيد العامة'}
                  </p>
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
              {/* Role Type Switcher Cards */}
              <div>
                <label className="block font-extrabold text-slate-800 mb-2">اختر نوع الحساب والصلاحية المطلوبة: *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectStaffRole('SECRETARY')}
                    className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                      staffAccountType === 'SECRETARY'
                        ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList className={`w-4 h-4 ${staffAccountType === 'SECRETARY' ? 'text-teal-600' : 'text-slate-500'}`} />
                      <span className="font-extrabold text-xs text-slate-900">سكرتير طبي</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">استقبال وتأكيد حجوزات</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectStaffRole('LAB_TECHNICIAN')}
                    className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                      staffAccountType === 'LAB_TECHNICIAN'
                        ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FlaskConical className={`w-4 h-4 ${staffAccountType === 'LAB_TECHNICIAN' ? 'text-cyan-600' : 'text-slate-500'}`} />
                      <span className="font-extrabold text-xs text-slate-900">فني مختبر</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">إجراء وإرسال التحاليل</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectStaffRole('RADIOLOGY')}
                    className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                      staffAccountType === 'RADIOLOGY'
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Scan className={`w-4 h-4 ${staffAccountType === 'RADIOLOGY' ? 'text-indigo-600' : 'text-slate-500'}`} />
                      <span className="font-extrabold text-xs text-slate-900">قسم الأشعة</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">إرفاق صور وملفات الأشعة</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectStaffRole('CUSTOMER_SERVICE')}
                    className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                      staffAccountType === 'CUSTOMER_SERVICE'
                        ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Headphones className={`w-4 h-4 ${staffAccountType === 'CUSTOMER_SERVICE' ? 'text-purple-600' : 'text-slate-500'}`} />
                      <span className="font-extrabold text-xs text-slate-900">خدمة عملاء</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">تنسيق ورعاية المرضى</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الموظف / الكادر الثلاثي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: منى بنت فهد الحربي"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-cyan-600 outline-none"
                />
              </div>

              {/* Login Credentials Box */}
              <div className={`p-3.5 rounded-2xl border space-y-3 ${
                staffAccountType === 'SECRETARY'
                  ? 'bg-teal-50/70 border-teal-200/80 text-teal-950'
                  : staffAccountType === 'LAB_TECHNICIAN'
                  ? 'bg-cyan-50/70 border-cyan-200/80 text-cyan-950'
                  : staffAccountType === 'RADIOLOGY'
                  ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950'
                  : 'bg-purple-50/70 border-purple-200/80 text-purple-950'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <KeyRound className="w-4 h-4 text-slate-700" />
                    <span>بيانات اعتماد تسجيل دخول الحساب (Credentials)</span>
                  </div>
                  <button
                    type="button"
                    onClick={generateStaffPassword}
                    className="px-2 py-1 rounded-lg bg-white/80 hover:bg-white text-slate-800 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs border border-slate-200"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>توليد كلمة سر</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الهاتف (اسم المستخدم للدخول) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 0561234567"
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-cyan-600 outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">كلمة المرور للحساب *</label>
                    <div className="relative">
                      <input
                        type={showStaffPassword ? 'text' : 'password'}
                        required
                        placeholder="أدخل كلمة المرور (6+ خانات)"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-cyan-600 outline-none font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showStaffPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showStaffPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  {staffAccountType === 'SECRETARY' 
                    ? '* سيتمكن السكرتير من تسجيل الدخول برقم الهاتف هذا ومتابعة حجوزات المرضى وطباعة الفحوصات والوصفات الطبية.'
                    : staffAccountType === 'LAB_TECHNICIAN'
                    ? '* سيتمكن فني المختبر من تسجيل الدخول بهذه البيانات للوصول إلى بوابة الفحوصات المخبرية وإرسال النتائج للأطباء المعالجين.'
                    : staffAccountType === 'RADIOLOGY'
                    ? '* سيتمكن كادر قسم الأشعة من تسجيل الدخول برقم الهاتف هذا لإرفاق ورفع صور وملفات الأشعة والتحاليل للمريض وللطبيب.'
                    : '* سيتمكن موظف خدمة العملاء من تسجيل الدخول للرد على استفسارات المرضى وتنسيق المواعيد.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={staffRoleTitle}
                    onChange={(e) => setStaffRoleTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">القسم / الإدارة</label>
                  <input
                    type="text"
                    value={staffDepartment}
                    onChange={(e) => setStaffDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">فترة المناوبة (Shift)</label>
                <select
                  value={staffShift}
                  onChange={(e) => setStaffShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none text-xs"
                >
                  <option value="الفترة الصباحية (08:00 ص - 04:00 م)">الفترة الصباحية (08:00 ص - 04:00 م)</option>
                  <option value="الفترة المسائية (04:00 م - 12:00 ص)">الفترة المسائية (04:00 م - 12:00 ص)</option>
                  <option value="فترة الطوارئ الليلية">فترة الطوارئ الليلية</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-white font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                    staffAccountType === 'SECRETARY'
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : staffAccountType === 'LAB_TECHNICIAN'
                      ? 'bg-cyan-600 hover:bg-cyan-700'
                      : staffAccountType === 'RADIOLOGY'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {staffAccountType === 'SECRETARY'
                      ? 'اعتماد وتفعيل حساب السكرتير'
                      : staffAccountType === 'LAB_TECHNICIAN'
                      ? 'اعتماد وتفعيل حساب فني المختبر'
                      : staffAccountType === 'RADIOLOGY'
                      ? 'اعتماد وتفعيل حساب قسم الأشعة'
                      : 'اعتماد وتفعيل حساب الموظف'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATED STAFF CREDENTIALS MODAL */}
      {createdStaffCredentials && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">تم إنشاء الحساب وتوليد بيانات الدخول</h3>
                  <p className="text-[11px] text-slate-300">انسخ بيانات الدخول وسلمها للموظف</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedStaffCredentials(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-start">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">اسم الحساب:</span>
                  <span className="font-extrabold text-slate-900">{createdStaffCredentials.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">المسمى الوظيفي:</span>
                  <span className="font-bold text-slate-800">{createdStaffCredentials.roleTitle}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">رقم الهاتف (اسم المستخدم):</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200">
                      {createdStaffCredentials.phone}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">كلمة المرور:</span>
                    <span className="font-mono font-black text-cyan-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                      {createdStaffCredentials.password}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {createdStaffCredentials.roleType === 'SECRETARY'
                  ? 'يمكن للموظف الآن التوجه إلى شاشة تسجيل الدخول وكتابة رقم الهاتف هذا وكلمة المرور للدخول المباشر إلى واجهة السكرتارية والاستقبال.'
                  : createdStaffCredentials.roleType === 'LAB_TECHNICIAN'
                  ? 'يمكن لفني المختبر الآن التوجه إلى شاشة تسجيل الدخول وكتابة رقم الهاتف هذا وكلمة المرور للدخول إلى بوابة الفحوصات والتحاليل المخبرية.'
                  : createdStaffCredentials.roleType === 'RADIOLOGY'
                  ? 'يمكن لكادر قسم الأشعة الآن التوجه إلى شاشة تسجيل الدخول وكتابة رقم الهاتف هذا وكلمة المرور للدخول المباشر لإرفاق صور وملفات الأشعة والتحاليل.'
                  : 'يمكن للموظف الآن التوجه إلى شاشة تسجيل الدخول وكتابة رقم الهاتف هذا وكلمة المرور للدخول المباشر إلى واجهة خدمة العملاء وتنسيق المواعيد.'}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const portalName = createdStaffCredentials.roleType === 'SECRETARY'
                      ? 'بوابة السكرتارية والاستقبال'
                      : createdStaffCredentials.roleType === 'LAB_TECHNICIAN'
                      ? 'بوابة المختبر والتحاليل'
                      : createdStaffCredentials.roleType === 'RADIOLOGY'
                      ? 'بوابة قسم الأشعة والتصوير'
                      : 'منصة خدمة العملاء';
                    const text = `بيانات الدخول إلى ${portalName}:\nالاسم: ${createdStaffCredentials.fullName}\nالمسمى: ${createdStaffCredentials.roleTitle}\nرقم الهاتف: ${createdStaffCredentials.phone}\nكلمة المرور: ${createdStaffCredentials.password}`;
                    navigator.clipboard.writeText(text);
                    setCopiedStaffCreds(true);
                    setTimeout(() => setCopiedStaffCreds(false), 2500);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    copiedStaffCreds
                      ? 'bg-emerald-600 text-white'
                      : createdStaffCredentials.roleType === 'SECRETARY'
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : createdStaffCredentials.roleType === 'LAB_TECHNICIAN'
                      ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                      : createdStaffCredentials.roleType === 'RADIOLOGY'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {copiedStaffCreds ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم نسخ البيانات!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ بيانات الدخول</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedStaffCredentials(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-indigo-800 to-purple-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">تعديل بيانات موظف خدمة العملاء</h3>
                  <p className="text-[11px] text-indigo-200">{editingStaff.fullName} ({editingStaff.phone})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="p-6 space-y-4 text-xs text-start">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الموظف الثلاثي *</label>
                <input
                  type="text"
                  required
                  value={editStaffFullName}
                  onChange={(e) => setEditStaffFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              {/* Edit Login Credentials */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs">
                  <KeyRound className="w-4 h-4 text-indigo-700" />
                  <span>تعديل بيانات الدخول (رقم الهاتف وكلمة المرور)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الهاتف (لتسجيل الدخول) *</label>
                    <input
                      type="tel"
                      required
                      value={editStaffPhone}
                      onChange={(e) => setEditStaffPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-indigo-600 outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input
                        type={showEditStaffPassword ? 'text' : 'password'}
                        placeholder="اتركها فارغة للإبقاء على الحالية"
                        value={editStaffPassword}
                        onChange={(e) => setEditStaffPassword(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-indigo-600 outline-none font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditStaffPassword(!showEditStaffPassword)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showEditStaffPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showEditStaffPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                <input
                  type="text"
                  value={editStaffRoleTitle}
                  onChange={(e) => setEditStaffRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">فترة المناوبة (Shift)</label>
                  <select
                    value={editStaffShift}
                    onChange={(e) => setEditStaffShift(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  >
                    <option value="الفترة الصباحية (08:00 ص - 04:00 م)">الفترة الصباحية (08:00 ص - 04:00 م)</option>
                    <option value="الفترة المسائية (04:00 م - 12:00 ص)">الفترة المسائية (04:00 م - 12:00 ص)</option>
                    <option value="فترة الطوارئ الليلية">فترة الطوارئ الليلية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة الحساب والصلاحية</label>
                  <select
                    value={editStaffIsActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditStaffIsActive(e.target.value === 'active')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                  >
                    <option value="active">نشط ومصرح له بالعمل</option>
                    <option value="inactive">معطل وموقوف الصلاحية</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE STAFF CONFIRMATION MODAL */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">تأكيد حذف موظف خدمة العملاء</h3>
                  <p className="text-[11px] text-rose-100">إلغاء حساب الدخول وسحب الصلاحيات</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingStaff(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-start">
              <p className="text-slate-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف حساب الموظف <strong>{deletingStaff.fullName}</strong> ({deletingStaff.phone}) نهائياً؟
              </p>
              <p className="text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium">
                تنبيه: سيتم إلغاء صلاحيات الدخول فوراً ولن يتمكن الموظف من الوصول للوحة التحكم وتنسيق المواعيد.
              </p>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingStaff(null)}
                  disabled={isDeletingStaff}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteStaff}
                  disabled={isDeletingStaff}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingStaff ? 'جاري الحذف...' : 'نعم، احذف الموظف نهائياً'}</span>
                </button>
              </div>
            </div>
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
                  <label className="block font-bold text-slate-800 mb-1.5">السعر (ر.ي)</label>
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
    </div>
  );
};
