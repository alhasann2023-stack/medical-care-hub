import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Sparkles, 
  TestTube, 
  FileText, 
  Pill, 
  Activity, 
  Clock, 
  ChevronLeft, 
  PlusCircle, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  MessageSquare,
  Building2,
  Heart,
  Phone,
  Bell,
  Volume2,
  Settings,
  Trash2,
  Stethoscope,
  CheckCheck
} from 'lucide-react';
import { 
  Patient, 
  Doctor,
  Appointment, 
  Consultation, 
  MedicalTest, 
  MedicalReport, 
  Prescription 
} from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AICallout } from '../common/AICallout';
import { PrintableReportModal } from '../common/PrintableReportModal';
import { PrintablePrescriptionModal } from '../common/PrintablePrescriptionModal';
import { ConsultationReminderBanner } from './ConsultationReminderBanner';
import { localReminderService, ReminderItem } from '../../services/localReminderService';

interface PatientDashboardProps {
  onOpenBooking: () => void;
  onOpenConsultation: () => void;
  onNavigateToTimeline: () => void;
  onNavigateToTests: () => void;
  onNavigateToReports: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  onOpenBooking,
  onOpenConsultation,
  onNavigateToTimeline,
  onNavigateToTests,
  onNavigateToReports
}) => {
  const { user, patientProfile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Local Reminders State (30 minutes alert)
  const [activeReminders, setActiveReminders] = useState<ReminderItem[]>([]);
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState<boolean>(false);
  const [reminderSettings, setReminderSettings] = useState(localReminderService.getSettings());

  // Modals
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [showAllConsultationsModal, setShowAllConsultationsModal] = useState<boolean>(false);

  const patientId = patientProfile?.id || user?.id || 'pat-1';

  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time updates for patient's appointments and consultations
    const unsubApts = api.subscribeAppointments({ patientId }, (liveApts) => {
      if (liveApts) {
        setAppointments(liveApts);
        checkForReminders(liveApts, consultations, doctorsList);
      }
    });

    const unsubCns = api.subscribeConsultations({ 
      patientId,
      patientUserId: user?.id,
      patientPhone: patientProfile?.phone || user?.phone
    }, (liveCns) => {
      if (liveCns) {
        setConsultations(liveCns);
        checkForReminders(appointments, liveCns, doctorsList);
      }
    });

    // Check reminders every 30 seconds
    const interval = setInterval(() => {
      checkForReminders(appointments, consultations, doctorsList);
    }, 30000);

    return () => {
      unsubApts();
      unsubCns();
      clearInterval(interval);
    };
  }, [patientId, user?.id, patientProfile?.phone, user?.phone]);

  const checkForReminders = (apts: Appointment[], cns: Consultation[], docs: Doctor[] = doctorsList) => {
    const found = localReminderService.findUpcomingReminders(
      apts, 
      cns, 
      reminderSettings.leadTimeMinutes || 30,
      docs
    );
    setActiveReminders(prev => {
      // Keep any active test reminders
      const testReminders = prev.filter(r => r.isTest);
      return [...testReminders, ...found.filter(f => !testReminders.some(t => t.id === f.id))];
    });
  };

  const handleDismissReminder = (id: string) => {
    localReminderService.dismissReminder(id);
    setActiveReminders(prev => prev.filter(r => r.id !== id));
  };

  const handleSnoozeReminder = (id: string) => {
    localReminderService.snoozeReminder(id, 5);
    setActiveReminders(prev => prev.filter(r => r.id !== id));
  };

  const handleTriggerTestReminder = () => {
    // Determine the doctor selected by the patient:
    // 1. From patient's latest appointment
    // 2. From patient's latest consultation
    // 3. Or from the registered hospital specialist doctors
    const selectedApt = appointments.find(a => a.doctorName);
    const selectedCns = consultations.find(c => c.doctorName);
    const fallbackDoc = doctorsList[0];

    const targetDoctorName = selectedApt?.doctorName || selectedCns?.doctorName || fallbackDoc?.fullName || 'د. فيصل العتيبي';
    const targetDoctorSpecialty = selectedApt?.doctorSpecialty || selectedCns?.doctorSpecialty || fallbackDoc?.specialtyNameAr || 'أمراض القلب والأوعية الدموية';
    const targetClinicRoom = selectedApt?.clinicRoom || fallbackDoc?.roomNumber || 'عيادة 201 - جناح القلب';

    const testItem: ReminderItem = {
      id: `test-remind-${Date.now()}`,
      type: selectedCns && !selectedApt ? 'CONSULTATION' : 'APPOINTMENT',
      title: `موعد استشارة: ${targetDoctorName} (تنبيه تجريبي)`,
      doctorName: targetDoctorName,
      doctorSpecialty: targetDoctorSpecialty,
      targetDateTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeRemainingMinutes: 30,
      clinicRoom: targetClinicRoom,
      status: 'CONFIRMED',
      notes: 'تذكير طبي مسبق: يرجى تجهيز قائمة الاستفسارات ونتائج الفحوصات قبل بدء الاستشارة.',
      isTest: true
    };

    localReminderService.playReminderChime();
    localReminderService.sendBrowserNotification(
      'تذكير بموعد الاستشارة (قبل 30 دقيقة)',
      `موعد استشارتك الطبية مع ${targetDoctorName} سيبدأ خلال 30 دقيقة.`
    );

    setActiveReminders(prev => [testItem, ...prev.filter(r => r.id !== testItem.id)]);
  };

  const handleClearAllMockData = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في مسح كافة البيانات التجريبية والبدء بصفحة نظيفة تماماً؟')) {
      return;
    }
    setIsClearing(true);
    try {
      await api.clearAllData();
      localReminderService.clearDismissedReminders();
      setActiveReminders([]);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [aptRes, cnsRes, tstRes, repRes, rxRes, docsRes] = await Promise.all([
        api.getAppointments({ patientId }),
        api.getConsultations({ 
          patientId,
          patientUserId: user?.id,
          patientPhone: patientProfile?.phone || user?.phone
        }),
        api.getTests(patientId),
        api.getReports(patientId),
        api.getPrescriptions(patientId),
        api.getDoctors(undefined, true)
      ]);

      setAppointments(aptRes);
      setConsultations(cnsRes);
      setTests(tstRes);
      setReports(repRes);
      setPrescriptions(rxRes);
      setDoctorsList(docsRes);
      checkForReminders(aptRes, cnsRes, docsRes);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingAppointment = appointments.find(
    a => a.status === 'CONFIRMED' || a.status === 'NEW' || a.status === 'PENDING' || a.status === 'CONTACTED'
  );

  const answeredConsultations = consultations.filter(
    c => c.status === 'ANSWERED' || Boolean(c.doctorAdvice)
  );
  const latestAnsweredConsultation = answeredConsultations[0];
  const sortedConsultations = [
    ...consultations.filter(c => c.status === 'ANSWERED' || Boolean(c.doctorAdvice)),
    ...consultations.filter(c => c.status !== 'ANSWERED' && !c.doctorAdvice)
  ];
  const recentConsultation = sortedConsultations[0] || consultations[0];
  const activePrescription = prescriptions.find(p => p.status === 'ACTIVE') || prescriptions[0];

  const handleOpenReminderTarget = (reminder: ReminderItem) => {
    if (reminder.type === 'CONSULTATION') {
      onOpenConsultation();
    } else {
      onNavigateToTimeline();
    }
  };

  const handleSaveSettings = (newSettings: any) => {
    const saved = localReminderService.saveSettings(newSettings);
    setReminderSettings(saved);
    setIsReminderSettingsOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 30-Minute Local Consultation / Appointment Reminder Banner */}
      {activeReminders.length > 0 && (
        <ConsultationReminderBanner
          reminders={activeReminders}
          onDismiss={handleDismissReminder}
          onSnooze={handleSnoozeReminder}
          onOpenConsultationOrAppointment={handleOpenReminderTarget}
          onTriggerTestReminder={handleTriggerTestReminder}
        />
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background decorative pulse circles */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute left-1/3 -top-10 w-40 h-40 bg-cyan-400/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={patientProfile?.avatar || user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={patientProfile?.fullName || user?.fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  أهلاً بك، {patientProfile?.fullName || user?.fullName || 'عزيزي المريض'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">
                  {patientProfile?.bloodType || 'O+'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 font-medium">
                رقم الملف الطبي: <strong className="font-mono text-white">{patientProfile?.mrn || 'غير محدد'}</strong> | رقم الهاتف الأساسي: <strong className="font-mono text-white">{patientProfile?.phone || user?.phone || 'غير مسجل'}</strong>
              </p>
              <p className="text-xs text-blue-200/80 mt-1">
                صحتك وسلامتك أولويتنا. جميع خدماتك الطبية ومواعيدك تحت سقف واحد.
              </p>
            </div>
          </div>

          {/* Primary Quick Action Buttons & Reminder Trigger */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTriggerTestReminder}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
              title="تجربة نظام التنبيه قبل الموعد بـ 30 دقيقة ورنين التذكير"
            >
              <Bell className="w-4 h-4 text-yellow-300 animate-pulse" />
              <span>تجربة تنبيه (30 دقيقة)</span>
            </button>
            <button
              onClick={() => setIsReminderSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="إعدادات تنبيهات المواعيد"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearAllMockData}
              disabled={isClearing}
              className="px-3 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white font-bold text-xs transition-all border border-rose-400/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="مسح وتصفير كافة السجلات والبيانات التجريبية"
            >
              <Trash2 className="w-4 h-4 text-rose-300" />
              <span>{isClearing ? 'جارِ التصفير...' : 'تصفير البيانات التجريبية'}</span>
            </button>
            <button
              onClick={onOpenConsultation}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>استشر طبيباً</span>
            </button>
            <button
              onClick={onOpenBooking}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-black/10 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-700" />
              <span>احجز موعداً</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Feature Shortcut Cards (فحوصاتي، تقاريري، السجل الزمني، أدويتي) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={onOpenBooking}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-start group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">حجز موعد</h3>
          <p className="text-xs text-slate-500 mt-0.5">{appointments.length} مواعيد مسجلة</p>
        </button>

        <button
          onClick={onOpenConsultation}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-cyan-300 hover:shadow-md transition-all text-start group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">استشارة طبيب</h3>
          <p className="text-xs text-slate-500 mt-0.5">{consultations.length} استشارات</p>
        </button>

        <button
          onClick={onNavigateToTests}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all text-start group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <TestTube className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">فحوصاتي</h3>
          <p className="text-xs text-slate-500 mt-0.5">{tests.length} نتائج تحاليل</p>
        </button>

        <button
          onClick={onNavigateToReports}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-md transition-all text-start group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">تقاريري الطبية</h3>
          <p className="text-xs text-slate-500 mt-0.5">{reports.length} تقارير رسمية</p>
        </button>
      </div>

      {/* Main Grid: Upcoming Appointment & Recent Consultation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Answered Consultant Response, Upcoming Appointment & Prescriptions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Prominent Answered Consultant Response Showcase Card */}
          {latestAnsweredConsultation && (
            <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-emerald-500/30 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute right-1/4 -top-10 w-40 h-40 bg-teal-400/10 rounded-full blur-xl pointer-events-none"></div>

              <div className="relative z-10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
                      <Sparkles className="w-5 h-5 text-emerald-300 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-white">رد الطبيب الاستشاري المعتمد</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-400 text-slate-950 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                          <span>تم اعتماد الرد ✓</span>
                        </span>
                      </div>
                      <p className="text-xs text-emerald-200/80 font-medium mt-0.5">
                        موضوع الاستشارة: <strong className="text-white">{latestAnsweredConsultation.title}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {latestAnsweredConsultation.answeredAt && (
                      <span className="text-[11px] text-emerald-200/70 font-mono">
                        تاريخ الاعتماد: {new Date(latestAnsweredConsultation.answeredAt).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedConsultation(latestAnsweredConsultation)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1 cursor-pointer"
                    >
                      <span>عرض الاستشارة كاملة</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
                    </button>
                  </div>
                </div>

                {/* Doctor Info & Patient Query preview */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-emerald-300 text-[11px] block font-semibold">الطبيب الاستشاري المجيب:</span>
                      <strong className="text-white text-sm">{latestAnsweredConsultation.doctorName}</strong>
                      <span className="text-emerald-200/70 text-xs block">{latestAnsweredConsultation.doctorSpecialty || 'العيادات التخصصية'}</span>
                    </div>
                  </div>

                  {latestAnsweredConsultation.problemDescription && (
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-300 max-w-md w-full md:w-auto">
                      <span className="text-slate-400 block font-medium">سؤال واستفسار المريض:</span>
                      <p className="line-clamp-2 text-slate-200 font-medium mt-0.5">{latestAnsweredConsultation.problemDescription}</p>
                    </div>
                  )}
                </div>

                {/* Primary Clinical Advice from Consultant */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 border border-emerald-400/30 text-start space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-emerald-300 text-xs sm:text-sm font-black flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>توجيه ورأي الطبيب الاستشاري:</span>
                    </strong>
                  </div>
                  <div className="text-white text-xs sm:text-sm leading-relaxed font-medium bg-slate-950/50 p-4 rounded-xl border border-emerald-400/25 shadow-inner">
                    {latestAnsweredConsultation.doctorAdvice}
                  </div>
                </div>

                {/* Treatment Plan if available */}
                {latestAnsweredConsultation.treatmentPlan && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1.5">
                    <strong className="text-emerald-300 font-bold block">الخطة العلاجية والتوصيات:</strong>
                    <p className="text-slate-200 leading-relaxed text-xs">
                      {latestAnsweredConsultation.treatmentPlan}
                    </p>
                  </div>
                )}

                {/* In-Person Visit Recommendation */}
                {latestAnsweredConsultation.requireInPersonVisit && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>يوصي الطبيب بحجز موعد حضوري في العيادة لمتابعة الفحص السريري المباشر.</span>
                    </div>
                    <button
                      onClick={onOpenBooking}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
                    >
                      احجز موعد عيادة الآن
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Appointment Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="font-extrabold text-base text-slate-900">الموعد الطبي القادم</h2>
              </div>

              {upcomingAppointment && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  upcomingAppointment.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : upcomingAppointment.status === 'CONTACTED'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {upcomingAppointment.status === 'CONFIRMED'
                    ? 'موعد مؤكد'
                    : upcomingAppointment.status === 'CONTACTED'
                    ? 'تم التواصل'
                    : 'قيد التنسيق'}
                </span>
              )}
            </div>

            {upcomingAppointment ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{upcomingAppointment.doctorName}</h3>
                    <p className="text-xs text-blue-700 font-semibold">{upcomingAppointment.doctorSpecialty}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{upcomingAppointment.serviceName}</p>
                  </div>

                  <div className="text-start sm:text-end">
                    <span className="text-xs text-slate-500 block">التاريخ والوقت:</span>
                    <strong className="text-sm font-bold text-slate-900">
                      {upcomingAppointment.confirmedDate || upcomingAppointment.preferredDate}
                    </strong>
                    <span className="block text-xs font-semibold text-blue-700">
                      {upcomingAppointment.confirmedTime || (upcomingAppointment.preferredPeriod === 'MORNING' ? 'الفترة الصباحية' : 'الفترة المسائية')}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                  <span>العيادة: <strong>{upcomingAppointment.clinicRoom || 'سيتم تحديد الغرفة عند التأكيد'}</strong></span>
                  {upcomingAppointment.coordinatorNotes && (
                    <span className="text-slate-500 italic truncate max-w-sm">
                      ملاحظة التنسيق: {upcomingAppointment.coordinatorNotes}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold text-slate-600">لا يوجد موعد قادم مجدول حالياً</p>
                <button
                  onClick={onOpenBooking}
                  className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  احجز موعد جديد الآن
                </button>
              </div>
            )}
          </div>

          {/* Active Prescription Quick Banner */}
          {activePrescription && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900">الوصفة الدوائية الفعالة ({activePrescription.rxNumber})</h2>
                    <p className="text-xs text-slate-500">الطبيب المعالج: {activePrescription.doctorName}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPrescription(activePrescription)}
                  className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  عرض الوصفة كاملة
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePrescription.medications.map((med, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900">{med.medicationName}</strong>
                      <span className="font-mono text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                        {med.strength}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{med.dosage} — {med.frequency}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Clinical Assistant Widget */}
          <AICallout patientId={patientId} patientName={patientProfile?.fullName} />
        </div>

        {/* Right 1 Col: Recent Consultation & Fast Navigation */}
        <div className="space-y-6">
          {/* Recent Consultation Response */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-slate-900">استشاراتي الطبية</h2>
                  <span className="text-[11px] text-slate-400 font-medium">مزامنة فورية مع قاعدة البيانات</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {consultations.length > 1 && (
                  <button
                    onClick={() => setShowAllConsultationsModal(true)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    عرض الكل ({consultations.length})
                  </button>
                )}
                <button
                  onClick={onOpenConsultation}
                  className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  + استشارة جديدة
                </button>
              </div>
            </div>

            {sortedConsultations.length > 0 ? (
              <div className="space-y-3">
                {sortedConsultations.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConsultation(c)}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-xs space-y-2.5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'ANSWERED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {c.status === 'ANSWERED' ? 'تم الرد من الطبيب ✓' : 'قيد المراجعة الطبية'}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : ''}
                      </span>
                    </div>

                    <div>
                      <strong className="block text-slate-900 text-xs sm:text-sm font-bold group-hover:text-cyan-800 transition-colors">
                        {c.title}
                      </strong>
                      <p className="text-slate-500 text-xs">مع {c.doctorName || 'طبيب العيادة'}</p>
                    </div>

                    {c.doctorAdvice ? (
                      <div className="p-3 rounded-lg bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs leading-relaxed">
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-emerald-900 font-bold">توجيه الطبيب:</strong>
                          <span className="text-[10px] text-emerald-700 font-medium">انقر لعرض التفاصيل الكاملة</span>
                        </div>
                        <p className="line-clamp-2 text-[11px] text-emerald-900">{c.doctorAdvice}</p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 text-[11px]">
                        استشارتك قيد المراجعة لدى الطبيب المختص وسيصلك إشعار بالرد فور اعتماده.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                لا توجد استشارات سابقة. اضغط على "+ استشارة جديدة" للبدء.
              </div>
            )}
          </div>

          {/* Quick Medical Timeline Access Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md text-start">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-cyan-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">السجل الزمني الطبي</h3>
                <p className="text-xs text-slate-400">سلسلة المعاينات والتحاليل والتقارير</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              استعرض كافة الإجراءات الطبية مرتبة زمنياً من أحدث فحص إلى أقدم معاينة سريرية.
            </p>
            <button
              onClick={onNavigateToTimeline}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>فتح السجل الزمني الكامل</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Prescription Modal */}
      <PrintablePrescriptionModal
        isOpen={!!selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
        prescription={selectedPrescription}
      />

      {/* Consultation Details Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-start">
            <div className="p-5 bg-gradient-to-r from-cyan-800 to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-cyan-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">{selectedConsultation.title}</h3>
                  <p className="text-xs text-cyan-100">
                    مع {selectedConsultation.doctorName} • {selectedConsultation.doctorSpecialty || 'العيادة التخصصية'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">حالة الاستشارة:</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedConsultation.status === 'ANSWERED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {selectedConsultation.status === 'ANSWERED' ? 'تم الرد من الطبيب المعالج ✓' : 'قيد المراجعة السريرية'}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-xs">
                  {selectedConsultation.createdAt ? new Date(selectedConsultation.createdAt).toLocaleDateString('ar-SA') : ''}
                </span>
              </div>

              {/* Patient Query & Symptoms */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <strong className="block text-slate-900 font-bold text-xs">وصف المشكلة والأعراض المقدمة من طرفك:</strong>
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {selectedConsultation.problemDescription}
                </p>
                {selectedConsultation.symptoms && selectedConsultation.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedConsultation.symptoms.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 text-[11px] font-medium border border-cyan-100">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Doctor Clinical Response */}
              {selectedConsultation.doctorAdvice ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs sm:text-sm">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>توجيه الطبيب والاستشارة السريرية:</span>
                    </div>
                    {selectedConsultation.answeredAt && (
                      <span className="text-[11px] text-emerald-700 font-mono">
                        {new Date(selectedConsultation.answeredAt).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 rounded-xl bg-white text-emerald-950 text-xs sm:text-sm leading-relaxed border border-emerald-200 shadow-xs">
                    {selectedConsultation.doctorAdvice}
                  </div>

                  {selectedConsultation.treatmentPlan && (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <strong className="block text-emerald-900 font-bold text-xs mb-1">الخطة العلاجية والتوصيات:</strong>
                      <p className="text-xs text-emerald-900 leading-relaxed bg-emerald-100/60 p-2.5 rounded-lg">
                        {selectedConsultation.treatmentPlan}
                      </p>
                    </div>
                  )}

                  {selectedConsultation.requireInPersonVisit && (
                    <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 flex items-center gap-2 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>يوصي الطبيب بحجز موعد حضوري في العيادة لإجراء فحص سريري مباشر.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center space-y-1">
                  <p className="font-bold">استشارتك قيد المعاينة والمراجعة الطبية</p>
                  <p className="text-amber-700 text-[11px]">سيتم تحديث هذه الصفحة فور قيام الطبيب بإدخال التوجيه الطبي والعلاجي.</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedConsultation(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Consultations Modal */}
      {showAllConsultationsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-start">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">سجل الاستشارات الطبية</h3>
                  <p className="text-xs text-slate-300">كافة استشاراتك المسجلة والردود السريرية المعتمدة</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllConsultationsModal(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {consultations.length > 0 ? (
                consultations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setShowAllConsultationsModal(false);
                      setSelectedConsultation(c);
                    }}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs space-y-2 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'ANSWERED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {c.status === 'ANSWERED' ? 'تم الرد من الطبيب ✓' : 'قيد الانتظار'}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : ''}
                      </span>
                    </div>

                    <strong className="block text-slate-900 text-sm font-bold">{c.title}</strong>
                    <p className="text-slate-500 text-xs">مع الطبيب: {c.doctorName || 'طبيب العيادة'}</p>

                    {c.doctorAdvice && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-950 text-xs line-clamp-2 border border-emerald-100">
                        <strong className="text-emerald-900">الرد: </strong>{c.doctorAdvice}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  لا توجد استشارات سابقة.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setShowAllConsultationsModal(false);
                  onOpenConsultation();
                }}
                className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                + استشارة جديدة
              </button>
              <button
                type="button"
                onClick={() => setShowAllConsultationsModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-100"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Settings Modal */}
      {isReminderSettingsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-start">
            <div className="p-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">إعدادات تذكير الاستشارات والمواعيد</h3>
                  <p className="text-[11px] text-amber-100">نظام التنبيهات المحلي الذكي</p>
                </div>
              </div>
              <button
                onClick={() => setIsReminderSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-950 space-y-1">
                <strong className="block font-bold">تنبيهات الاستشارة المباشرة:</strong>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  يقوم النظام بإرسال إشعار مرئي وتشغيل نغمة تنبيه لطيفة قبل موعد الاستشارة بـ 30 دقيقة لمساعدتك على الاستعداد والتواجد في الموعد المحدد.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <strong className="block text-slate-900">تفعيل نظام التنبيهات المحلي</strong>
                    <span className="text-[11px] text-slate-500">إظهار شريط التنبيه عند اقتراب موعد الاستشارة</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminderSettings.enabled}
                    onChange={(e) => setReminderSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <strong className="block text-slate-900">وقت التذكير المسبق</strong>
                    <span className="text-[11px] text-slate-500">المدة الزمنية قبل بدء الاستشارة</span>
                  </div>
                  <select
                    value={reminderSettings.leadTimeMinutes}
                    onChange={(e) => setReminderSettings(prev => ({ ...prev, leadTimeMinutes: Number(e.target.value) }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs outline-none"
                  >
                    <option value={15}>قبل 15 دقيقة</option>
                    <option value={30}>قبل 30 دقيقة (الموصى به)</option>
                    <option value={45}>قبل 45 دقيقة</option>
                    <option value={60}>قبل ساعة كاملة</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <strong className="block text-slate-900">نغمة التنبيه الصوتية (Audio Chime)</strong>
                    <span className="text-[11px] text-slate-500">تشغيل نغمة هادئة فور حلول وقت التذكير</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => localReminderService.playReminderChime()}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      title="تجربة النغمة"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>تجربة</span>
                    </button>
                    <input
                      type="checkbox"
                      checked={reminderSettings.soundEnabled}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <strong className="block text-slate-900">إشعارات المتصفح (Browser Push)</strong>
                    <span className="text-[11px] text-slate-500">استقبال تنبيه حتى في حال تصغير النافذة</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const granted = await localReminderService.requestNotificationPermission();
                      setReminderSettings(prev => ({ ...prev, browserNotifications: granted }));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                  >
                    {reminderSettings.browserNotifications ? 'مفعلة ✓' : 'طلب الإذن'}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTriggerTestReminder}
                  className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>تجربة التنبيه الآن</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReminderSettingsOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSettings(reminderSettings)}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    حفظ الإعدادات
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
