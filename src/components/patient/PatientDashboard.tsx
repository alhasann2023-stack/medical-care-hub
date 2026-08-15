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
  Phone
} from 'lucide-react';
import { 
  Patient, 
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
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const patientId = patientProfile?.id || user?.id || 'pat-1';

  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time updates for patient's appointments and consultations
    const unsubApts = api.subscribeAppointments({ patientId }, (liveApts) => {
      if (liveApts) setAppointments(liveApts);
    });

    const unsubCns = api.subscribeConsultations({ patientId }, (liveCns) => {
      if (liveCns) setConsultations(liveCns);
    });

    return () => {
      unsubApts();
      unsubCns();
    };
  }, [patientId]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [aptRes, cnsRes, tstRes, repRes, rxRes] = await Promise.all([
        api.getAppointments({ patientId }),
        api.getConsultations({ patientId }),
        api.getTests(patientId),
        api.getReports(patientId),
        api.getPrescriptions(patientId)
      ]);

      setAppointments(aptRes);
      setConsultations(cnsRes);
      setTests(tstRes);
      setReports(repRes);
      setPrescriptions(rxRes);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingAppointment = appointments.find(
    a => a.status === 'CONFIRMED' || a.status === 'NEW' || a.status === 'PENDING' || a.status === 'CONTACTED'
  );

  const recentConsultation = consultations[0];
  const activePrescription = prescriptions.find(p => p.status === 'ACTIVE') || prescriptions[0];

  return (
    <div className="space-y-6">
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

          {/* Primary Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
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
        {/* Left 2 Cols: Upcoming Appointment & Prescriptions */}
        <div className="lg:col-span-2 space-y-6">
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
                <h2 className="font-extrabold text-base text-slate-900">استشاراتي الطبية</h2>
              </div>
              <button
                onClick={onOpenConsultation}
                className="text-xs font-bold text-cyan-700 hover:underline cursor-pointer"
              >
                + جديدة
              </button>
            </div>

            {recentConsultation ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    recentConsultation.status === 'ANSWERED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {recentConsultation.status === 'ANSWERED' ? 'تم الرد' : 'قيد الانتظار'}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {recentConsultation.createdAt.split('T')[0]}
                  </span>
                </div>

                <div>
                  <strong className="block text-slate-900 text-xs sm:text-sm mb-0.5">
                    {recentConsultation.title}
                  </strong>
                  <p className="text-slate-500 text-xs">مع {recentConsultation.doctorName}</p>
                </div>

                {recentConsultation.doctorAdvice ? (
                  <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs leading-relaxed">
                    <strong className="block text-emerald-900 mb-0.5">توجيه الطبيب:</strong>
                    {recentConsultation.doctorAdvice}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
                    استشارتك قيد المراجعة لدى الطبيب المختص وسيصلك إشعار بالرد.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                لا توجد استشارات سابقة.
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
    </div>
  );
};
