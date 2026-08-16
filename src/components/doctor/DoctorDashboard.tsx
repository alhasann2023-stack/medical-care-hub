import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Pill, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Sparkles, 
  Send, 
  Plus, 
  Search,
  Activity,
  Phone
} from 'lucide-react';
import { 
  Doctor, 
  Appointment, 
  Consultation, 
  Patient, 
  MedicalReport, 
  Prescription 
} from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ConsultationReplyModal } from './ConsultationReplyModal';
import { CreateMedicalReportModal } from './CreateMedicalReportModal';
import { CreatePrescriptionModal } from './CreatePrescriptionModal';
import { MedicalTimeline } from '../patient/MedicalTimeline';

export const DoctorDashboard: React.FC = () => {
  const { doctorProfile, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctorProfile?.id || 'doc-1');
  const [activeTab, setActiveTab] = useState<'CONSULTATIONS' | 'APPOINTMENTS' | 'PATIENTS' | 'TIMELINE'>('CONSULTATIONS');
  
  const [selectedPatientForTimeline, setSelectedPatientForTimeline] = useState<string>('pat-1');
  const [selectedConsultationForReply, setSelectedConsultationForReply] = useState<Consultation | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState<boolean>(false);
  const [targetPatientForAction, setTargetPatientForAction] = useState<string>('pat-1');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    api.getDoctors(undefined, true).then(docs => {
      setAllDoctors(docs);
      if (doctorProfile?.id) {
        setSelectedDoctorId(doctorProfile.id);
      } else if (docs.length > 0 && (!selectedDoctorId || selectedDoctorId === 'doc-1')) {
        setSelectedDoctorId(docs[0].id);
      }
    });
  }, [doctorProfile?.id]);

  const activeDoctor = allDoctors.find(d => d.id === selectedDoctorId || d.userId === selectedDoctorId) || doctorProfile || allDoctors[0];
  const currentDoctorId = activeDoctor?.id || selectedDoctorId || 'doc-1';

  useEffect(() => {
    loadDoctorData();

    // Live subscriptions for doctor's appointments and consultations
    const unsubApts = api.subscribeAppointments({ doctorId: currentDoctorId }, (liveApts) => {
      if (liveApts) {
        setAppointments(liveApts.filter(a => 
          a.doctorId === currentDoctorId || 
          (activeDoctor && a.doctorName && a.doctorName.includes(activeDoctor.fullName))
        ));
      }
    });

    const unsubCns = api.subscribeConsultations({ doctorId: currentDoctorId }, (liveCns) => {
      if (liveCns) {
        setConsultations(liveCns.filter(c => 
          c.doctorId === currentDoctorId || 
          (activeDoctor && c.doctorName && c.doctorName.includes(activeDoctor.fullName))
        ));
      }
    });

    return () => {
      unsubApts();
      unsubCns();
    };
  }, [currentDoctorId, activeDoctor?.fullName]);

  const loadDoctorData = async () => {
    setIsLoading(true);
    try {
      const [aptRes, cnsRes, patRes] = await Promise.all([
        api.getAppointments({ doctorId: currentDoctorId }),
        api.getConsultations({ doctorId: currentDoctorId }),
        api.getPatients()
      ]);
      
      const filteredApts = aptRes.filter(a => 
        a.doctorId === currentDoctorId || 
        (activeDoctor && a.doctorName && a.doctorName.includes(activeDoctor.fullName))
      );
      const filteredCns = cnsRes.filter(c => 
        c.doctorId === currentDoctorId || 
        (activeDoctor && c.doctorName && c.doctorName.includes(activeDoctor.fullName))
      );

      setAppointments(filteredApts);
      setConsultations(filteredCns);
      setPatients(patRes);
    } catch (err) {
      console.error('Doctor data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingConsultations = consultations.filter(c => c.status === 'PENDING');
  const answeredConsultations = consultations.filter(c => c.status === 'ANSWERED');

  const filteredPatients = patients.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6 text-start">
      {/* Doctor Bio Header with Dynamic Doctor Selector */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={activeDoctor?.avatar || doctorProfile?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
            alt={activeDoctor?.fullName || 'د. الطبيب'}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-300/40 shadow-md"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {activeDoctor?.fullName || doctorProfile?.fullName || user?.fullName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                {activeDoctor?.title || doctorProfile?.title || 'طبيب استشاري'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium">
              التخصص: <strong>{activeDoctor?.specialtyNameAr || doctorProfile?.specialtyNameAr}</strong> | العيادة: <strong>{activeDoctor?.roomNumber || doctorProfile?.roomNumber || 'عيادة رقم 104'}</strong>
            </p>
            <p className="text-xs text-emerald-200/80 mt-1">
              أيام الاستقبال: {activeDoctor?.availableDays ? activeDoctor.availableDays.join('، ') : 'الأحد - الخميس'} ({activeDoctor?.availableHours || '09:00 ص - 05:00 م'})
            </p>
          </div>
        </div>

        {/* Action Buttons & Doctor Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {allDoctors.length > 1 && (
            <div className="bg-emerald-950/60 border border-emerald-400/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-300" />
              <label htmlFor="doctor-select" className="text-xs text-emerald-200 font-bold whitespace-nowrap">عرض عيادة:</label>
              <select
                id="doctor-select"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="bg-emerald-900/90 text-white text-xs font-bold rounded-lg px-2.5 py-1 border border-emerald-400/40 focus:outline-none focus:ring-1 focus:ring-emerald-300 cursor-pointer"
              >
                {allDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id} className="bg-slate-900 text-white">
                    {doc.fullName} ({doc.specialtyNameAr})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              setTargetPatientForAction('pat-1');
              setIsPrescriptionModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Pill className="w-4 h-4" />
            <span>إصدار وصفة طبية</span>
          </button>
          <button
            onClick={() => {
              setTargetPatientForAction('pat-1');
              setIsReportModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-emerald-900 font-bold text-xs sm:text-sm transition-all shadow-md shadow-black/10 flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>كتابة تقرير معتمد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">استشارات بالانتظار</span>
            <strong className="text-lg font-black text-slate-900">{pendingConsultations.length}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">مواعيد العيادة</span>
            <strong className="text-lg font-black text-slate-900">{appointments.length}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">استشارات مكتملة</span>
            <strong className="text-lg font-black text-slate-900">{answeredConsultations.length}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المرضى</span>
            <strong className="text-lg font-black text-slate-900">{patients.length}</strong>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('CONSULTATIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'CONSULTATIONS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>طابور الاستشارات الطبية ({pendingConsultations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('APPOINTMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'APPOINTMENTS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>جدول مواعيد العيادة ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PATIENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PATIENTS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ملفات المرضى</span>
        </button>

        <button
          onClick={() => setActiveTab('TIMELINE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'TIMELINE'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>السجل الزمني للمريض</span>
        </button>
      </div>

      {/* Tab 1: Consultations Queue */}
      {activeTab === 'CONSULTATIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">
              طلبات الاستشارات الواردة للعيادة
            </h3>
            <span className="text-xs text-slate-500">
              قم بالرد على استفسار المريض أو تحديد الحاجة لمعاينة حضورية
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consultations.map((cns) => (
              <div
                key={cns.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  cns.status === 'PENDING'
                    ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{cns.patientName}</span>
                      <span className="text-xs text-slate-400 font-mono">({cns.patientMrn})</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      cns.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {cns.status === 'PENDING' ? 'قيد الانتظار' : 'تم الرد'}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-emerald-950 mb-1.5">{cns.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                    {cns.problemDescription}
                  </p>

                  {cns.symptoms && cns.symptoms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className="text-[11px] text-slate-400">الأعراض:</span>
                      {cns.symptoms.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {cns.doctorAdvice && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 mb-3">
                      <strong className="block text-emerald-900 mb-0.5">ردك السابق:</strong>
                      {cns.doctorAdvice}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedPatientForTimeline(cns.patientId);
                      setActiveTab('TIMELINE');
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-blue-600 cursor-pointer"
                  >
                    السجل الطبي للمريض
                  </button>

                  <button
                    onClick={() => setSelectedConsultationForReply(cns)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{cns.status === 'PENDING' ? 'كتابة الرد الطبي' : 'تعديل الرد'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Appointments List */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">
              قائمة مواعيد الكشف الطبي المحجوزة
            </h3>
            <span className="text-xs text-slate-500">منسقة عبر قسم خدمة العملاء</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">المريض</th>
                  <th className="p-3">رقم الملف (MRN)</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">سبب الزيارة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-900">{apt.patientName}</td>
                    <td className="p-3 font-mono text-slate-600">{apt.patientMrn}</td>
                    <td className="p-3">
                      <strong>{apt.confirmedDate || apt.preferredDate}</strong>
                      <span className="block text-[11px] text-slate-400 font-medium">
                        {apt.confirmedTime || (apt.preferredPeriod === 'MORNING' ? 'صباحاً' : 'مساءً')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs">{apt.reason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        apt.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {apt.status === 'CONFIRMED' ? 'مؤكد' : 'قيد التنسيق'}
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-1 space-x-reverse">
                      <button
                        onClick={() => {
                          setSelectedPatientForTimeline(apt.patientId);
                          setActiveTab('TIMELINE');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 cursor-pointer"
                        title="فتح السجل الطبي"
                      >
                        السجل
                      </button>
                      <button
                        onClick={() => {
                          setTargetPatientForAction(apt.patientId);
                          setIsPrescriptionModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 cursor-pointer"
                        title="وصفة طبية"
                      >
                        وصفة
                      </button>
                      <button
                        onClick={() => {
                          setTargetPatientForAction(apt.patientId);
                          setIsReportModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 cursor-pointer"
                        title="تقرير طبي"
                      >
                        تقرير
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Patients Directory */}
      {activeTab === 'PATIENTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-sm">دليل المرضى المسجلين بالمستشفى</h3>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف أو MRN..."
                className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={p.avatar}
                    alt={p.fullName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{p.fullName}</h4>
                    <span className="font-mono text-[11px] text-blue-700 font-bold">{p.mrn}</span>
                    <p className="text-slate-500 text-[11px] font-mono">{p.phone}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1 text-slate-600">
                  <p><strong>فصيلة الدم:</strong> <span className="text-rose-700 font-bold">{p.bloodType}</span></p>
                  <p className="truncate"><strong>الأمراض المزمنة:</strong> {p.chronicDiseases.join('، ') || 'لا يوجد'}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    onClick={() => {
                      setSelectedPatientForTimeline(p.id);
                      setActiveTab('TIMELINE');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs cursor-pointer"
                  >
                    السجل الزمني
                  </button>
                  <button
                    onClick={() => {
                      setTargetPatientForAction(p.id);
                      setIsPrescriptionModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    title="كتابة وصفة"
                  >
                    <Pill className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setTargetPatientForAction(p.id);
                      setIsReportModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    title="كتابة تقرير"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Patient Timeline Explorer */}
      {activeTab === 'TIMELINE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">استعراض السجل الزمني للمريض</h3>
            </div>
            <select
              value={selectedPatientForTimeline}
              onChange={(e) => setSelectedPatientForTimeline(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.mrn})
                </option>
              ))}
            </select>
          </div>

          <MedicalTimeline
            patientId={selectedPatientForTimeline}
            onOpenBooking={() => setActiveTab('APPOINTMENTS')}
          />
        </div>
      )}

      {/* Modals */}
      <ConsultationReplyModal
        isOpen={!!selectedConsultationForReply}
        onClose={() => setSelectedConsultationForReply(null)}
        consultation={selectedConsultationForReply}
        onSuccess={loadDoctorData}
      />

      <CreateMedicalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={loadDoctorData}
        targetPatientId={targetPatientForAction}
      />

      <CreatePrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        onSuccess={loadDoctorData}
        targetPatientId={targetPatientForAction}
      />
    </div>
  );
};
