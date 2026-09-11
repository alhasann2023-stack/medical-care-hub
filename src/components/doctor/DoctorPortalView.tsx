import React, { useState } from 'react';
import {
  Stethoscope,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSignature,
  Pill,
  Search,
  ChevronLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { DOCTORS } from '../../data/mockData';
import { Language } from '../../types';

interface DoctorPortalViewProps {
  language: Language;
}

export const DoctorPortalView: React.FC<DoctorPortalViewProps> = ({ language }) => {
  const isAr = language === 'ar';

  const [activeDoctor, setActiveDoctor] = useState(DOCTORS[0]);
  const [activeTab, setActiveTab] = useState<'queue' | 'triage' | 'prescribe'>('queue');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('p1');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [prescribedMed, setPrescribedMed] = useState<string>('');
  const [successNote, setSuccessNote] = useState<string | null>(null);

  // Simulated queue of patients
  const patientQueue = [
    {
      id: 'p1',
      name: 'محمد عبدالله الشمري',
      mrn: 'MRN-849201',
      time: '10:30 ص',
      reason: 'متابعة ضغط الدم ومراجعة فحص الدهون الشامل',
      status: 'في الانتظار',
      triageLevel: 'معتدل',
      aiSummary: 'المريض أجرى فحص دهون مؤخراً ويشير إلى استقرار عام، بحاجة لمراجعة نمط الحياة.',
    },
    {
      id: 'p2',
      name: 'سارة خالد العتيبي',
      mrn: 'MRN-921045',
      time: '11:00 ص',
      reason: 'خفقان متكرر وضيق تنفس عند بذل الجهد',
      status: 'حالة عاجلة',
      triageLevel: 'أولوية قصوى',
      aiSummary: 'فرز Gemini: خفقان متكرر، موصى بإجراء تخطيط قلب فوري (ECG) وقياس إنزيمات القلب.',
    },
    {
      id: 'p3',
      name: 'عبدالعزيز إبراهيم الدوسري',
      mrn: 'MRN-334182',
      time: '11:30 ص',
      reason: 'تجديد وصفة علاجية واستشارة وقائية',
      status: 'مجدول',
      triageLevel: 'روتيني',
      aiSummary: 'متابعة دورية مستقرة.',
    },
  ];

  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessNote(
      isAr
        ? 'تم حفظ التقرير الطبي والوصفة بنجاح واعتمادها في السجل الصحي للمريض.'
        : 'Clinical assessment and prescription saved successfully.'
    );
    setTimeout(() => setSuccessNote(null), 3000);
    setClinicalNotes('');
    setPrescribedMed('');
  };

  const selectedPatient = patientQueue.find((p) => p.id === selectedPatientId) || patientQueue[0];

  return (
    <div className="space-y-6">
      
      {/* Doctor Profile Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={activeDoctor.avatar}
            alt={activeDoctor.nameAr}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-500 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                {isAr ? activeDoctor.nameAr : activeDoctor.nameEn}
              </h2>
              <span className="text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                {isAr ? 'طبيب ممارس معتمد' : 'Verified Physician'}
              </span>
            </div>
            <p className="text-xs text-teal-700 font-semibold mt-0.5">
              {isAr ? activeDoctor.specialtyAr : activeDoctor.specialtyEn}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {activeDoctor.clinicRoom} • {isAr ? 'العيادة الافتراضية نشطة' : 'Virtual Clinic Active'}
            </p>
          </div>
        </div>

        {/* Doctor Switcher for Demo */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">{isAr ? 'تبديل الطبيب:' : 'Switch Doctor:'}</span>
          <select
            value={activeDoctor.id}
            onChange={(e) => {
              const found = DOCTORS.find((d) => d.id === e.target.value);
              if (found) setActiveDoctor(found);
            }}
            className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800 focus:outline-hidden"
          >
            {DOCTORS.map((d) => (
              <option key={d.id} value={d.id}>
                {isAr ? d.nameAr : d.nameEn} - {isAr ? d.specialtyAr : d.specialtyEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Doctor Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Patient Queue (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'قائمة المرضى في العيادة' : 'Patient Clinic Queue'}</span>
            </h3>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              {patientQueue.length} {isAr ? 'حالات' : 'cases'}
            </span>
          </div>

          <div className="space-y-2">
            {patientQueue.map((patient) => {
              const isSelected = selectedPatientId === patient.id;
              const isUrgent = patient.triageLevel.includes('قصوى');
              return (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-extrabold text-xs text-slate-900">{patient.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{patient.time}</span>
                  </div>

                  <p className="text-xs text-slate-600 truncate">{patient.reason}</p>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100/80 text-[10px]">
                    <span className="font-mono text-slate-400">{patient.mrn}</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded-sm ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {patient.triageLevel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Clinical Encounter & Gemini AI Summary (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Active Patient Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedPatient.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedPatient.mrn} • {isAr ? 'الموعد المجدول:' : 'Scheduled:'} {selectedPatient.time}
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                {selectedPatient.status}
              </span>
            </div>

            {/* AI Triage & Clinical Summary generated by Gemini */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50/70 to-blue-50/70 border border-teal-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'ملخص الفرز الأولي الذكي (Gemini Clinical Summary):' : 'AI Clinical Triage Summary:'}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                {selectedPatient.aiSummary}
              </p>
              <div className="text-[11px] text-teal-700 font-medium">
                {isAr
                  ? 'تم استخلاص الملاحظات بناءً على الأعراض المدخلة من المريض عبر واجهة المحادثة والتشخيص.'
                  : 'Extracted automatically from patient conversation and diagnostic inputs.'}
              </div>
            </div>

            {/* Clinical Notes & Prescription Form */}
            <form onSubmit={handleSaveAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'التشخيص الطبي وتدوين الكشف السريري:' : 'Clinical Diagnosis & Notes:'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'أدخل التقييم السريري، ضغط الدم، التشخيص المعتمد، والتوصيات...'
                      : 'Enter physical findings, diagnosis, and recommendations...'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'الوصفة الدوائية أو الفحوصات المطلوبة:' : 'Prescription & Diagnostic Orders:'}
                </label>
                <textarea
                  rows={2}
                  value={prescribedMed}
                  onChange={(e) => setPrescribedMed(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: أملوديبين 5 ملغ حبة يومياً، أو طلب تصوير إشعاعي للصدر...'
                      : 'e.g. Amlodipine 5mg once daily, order ECG & blood tests...'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                />
              </div>

              {successNote && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{successNote}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileSignature className="w-4 h-4" />
                  <span>{isAr ? 'اعتماد التقرير وصرف الوصفة' : 'Sign Assessment & Prescribe'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
