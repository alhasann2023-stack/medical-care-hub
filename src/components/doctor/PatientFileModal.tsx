import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  FileText, 
  Pill, 
  Activity, 
  FlaskConical, 
  MessageSquare, 
  Clock, 
  Download, 
  Printer, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  Phone, 
  ShieldCheck, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  Eye,
  FileCheck,
  Search,
  Sparkles,
  Stethoscope,
  Paperclip
} from 'lucide-react';
import { 
  Patient, 
  MedicalReport, 
  MedicalTest, 
  Prescription, 
  MedicalExamination, 
  Consultation, 
  TimelineItem 
} from '../../types/medical';
import { api } from '../../services/api';
import { PrintableReportModal } from '../common/PrintableReportModal';
import { PrintablePrescriptionModal } from '../common/PrintablePrescriptionModal';

interface PatientFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  initialTab?: 'OVERVIEW' | 'REPORTS' | 'TESTS' | 'PRESCRIPTIONS' | 'EXAMINATIONS' | 'CONSULTATIONS' | 'TIMELINE';
  onOpenNewPrescription?: (patient: Patient) => void;
  onOpenNewReport?: (patient: Patient) => void;
}

export const PatientFileModal: React.FC<PatientFileModalProps> = ({
  isOpen,
  onClose,
  patientId,
  initialTab = 'OVERVIEW',
  onOpenNewPrescription,
  onOpenNewReport
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'REPORTS' | 'TESTS' | 'PRESCRIPTIONS' | 'EXAMINATIONS' | 'CONSULTATIONS' | 'TIMELINE'>(initialTab);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [examinations, setExaminations] = useState<MedicalExamination[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected for print previews
  const [selectedReportForPrint, setSelectedReportForPrint] = useState<MedicalReport | null>(null);
  const [selectedPrescriptionForPrint, setSelectedPrescriptionForPrint] = useState<Prescription | null>(null);

  // Quick Examination Form State
  const [isAddingExam, setIsAddingExam] = useState<boolean>(false);
  const [newExamType, setNewExamType] = useState<string>('معاينة سريرية روتينية');
  const [newExamComplaint, setNewExamComplaint] = useState<string>('');
  const [newExamDiagnosis, setNewExamDiagnosis] = useState<string>('');
  const [newExamRecommendations, setNewExamRecommendations] = useState<string>('');
  const [newExamBP, setNewExamBP] = useState<string>('120/80');
  const [newExamHR, setNewExamHR] = useState<string>('72');
  const [newExamTemp, setNewExamTemp] = useState<string>('37.0');
  const [newExamO2, setNewExamO2] = useState<string>('99');
  const [isSavingExam, setIsSavingExam] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && patientId) {
      loadAllPatientData();
    }
  }, [isOpen, patientId]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadAllPatientData = async () => {
    setIsLoading(true);
    try {
      // 1. Load patient profile & timeline
      const timelineRes = await api.getPatientTimeline(patientId);
      if (timelineRes?.patient) {
        setPatient(timelineRes.patient);
      }
      if (timelineRes?.timeline) {
        setTimeline(timelineRes.timeline);
      }

      // 2. Parallel fetch of all collections
      const [reps, tsts, rxs, exms, cns] = await Promise.all([
        api.getReports(patientId),
        api.getTests(patientId),
        api.getPrescriptions(patientId),
        api.getExaminations(patientId),
        api.getConsultations({ patientId })
      ]);

      setReports(reps || []);
      setTests(tsts || []);
      setPrescriptions(rxs || []);
      setExaminations(exms || []);
      setConsultations(cns || []);
    } catch (err) {
      console.error('Error loading full patient file:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExamination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamDiagnosis.trim()) return;
    setIsSavingExam(true);
    try {
      await api.createExamination({
        patientId: patient?.id || patientId,
        doctorId: 'doc-1',
        doctorName: 'طبيب العيادة الاستشاري',
        doctorSpecialty: 'العيادات التخصصية',
        examinationType: newExamType,
        chiefComplaint: newExamComplaint || 'مراجعة وتقييم سريري',
        clinicalFindings: `العلامات الحيوية: الضغط ${newExamBP}، النبض ${newExamHR}، الحرارة ${newExamTemp}°C، الأكسجين ${newExamO2}%.`,
        diagnosis: newExamDiagnosis,
        recommendations: newExamRecommendations || 'المتابعة الدورية والالتزام بالخطة العلاجية.',
        vitalSigns: {
          bloodPressure: newExamBP,
          heartRate: parseInt(newExamHR) || 72,
          temperature: parseFloat(newExamTemp) || 37.0,
          oxygenSaturation: parseInt(newExamO2) || 98,
          weightKg: 70,
          heightCm: 170
        }
      });
      setIsAddingExam(false);
      setNewExamComplaint('');
      setNewExamDiagnosis('');
      setNewExamRecommendations('');
      await loadAllPatientData();
    } catch (err) {
      console.error('Error saving exam:', err);
    } finally {
      setIsSavingExam(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-start font-cairo">
        
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/40 p-1 flex items-center justify-center shrink-0">
              <img
                src={patient?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(patient?.fullName || 'Patient')}`}
                alt={patient?.fullName || 'المريض'}
                className="w-full h-full rounded-xl object-cover"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="font-extrabold text-lg sm:text-xl text-white">
                  {patient?.fullName || 'الملف الطبي للمريض'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {patient?.mrn || 'MRN-2026'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  فصيلة الدم: {patient?.bloodType || 'O+'}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-3">
                <span>الهاتف: <strong className="font-mono text-white">{patient?.phone || '+966501112233'}</strong></span>
                <span>•</span>
                <span>تاريخ الميلاد: {patient?.birthDate || '1992-05-14'}</span>
                <span>•</span>
                <span>الجنس: {patient?.gender === 'MALE' ? 'ذكر' : 'أنثى'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onOpenNewPrescription && patient && (
              <button
                onClick={() => onOpenNewPrescription(patient)}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Pill className="w-3.5 h-3.5" />
                <span>إصدار وصفة</span>
              </button>
            )}

            {onOpenNewReport && patient && (
              <button
                onClick={() => onOpenNewReport(patient)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>كتابة تقرير</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>البيانات الطبية والحيوية</span>
          </button>

          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'REPORTS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>التقارير الطبية المعتمدة ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TESTS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TESTS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>نتائج الفحوصات والتحاليل ({tests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PRESCRIPTIONS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PRESCRIPTIONS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>الوصفات والأدوية ({prescriptions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('EXAMINATIONS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'EXAMINATIONS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>المعاينات السريرية ({examinations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CONSULTATIONS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CONSULTATIONS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>الاستشارات السابقة ({consultations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TIMELINE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>السجل الزمني</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-bold">جاري تحميل ملفات وسجلات المريض الطبية...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & VITALS */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Medical Alerts & Critical Health Facts */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
                      <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>الحساسية الدوائية والغذائية</span>
                      </div>
                      <div className="text-xs text-rose-950 font-medium">
                        {patient?.allergies && patient.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {patient.allergies.map((a, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-900 font-bold text-[11px]">
                                {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-rose-700/80">لا توجد حساسية مسجلة للمريض.</span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs">
                        <Heart className="w-4 h-4 text-amber-600" />
                        <span>الأمراض والحالات المزمنة</span>
                      </div>
                      <div className="text-xs text-amber-950 font-medium">
                        {patient?.chronicDiseases && patient.chronicDiseases.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {patient.chronicDiseases.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-bold text-[11px]">
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-amber-700/80">لا توجد أمراض مزمنة مسجلة.</span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-800 font-extrabold text-xs">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span>جهة الاتصال في حالات الطوارئ</span>
                      </div>
                      <div className="text-xs text-blue-950 space-y-0.5">
                        <p><strong>الاسم:</strong> {patient?.emergencyContact?.name || 'غير محدد'}</p>
                        <p><strong>الصلة:</strong> {patient?.emergencyContact?.relation || 'قريب'}</p>
                        <p><strong>الهاتف:</strong> <span className="font-mono">{patient?.emergencyContact?.phone || '+966509998877'}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Vitals & Summary Strip */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>العلامات الحيوية الأخيرة المسجلة</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block font-bold">ضغط الدم (BP)</span>
                        <strong className="text-base text-slate-900 font-mono">120/80</strong>
                        <span className="text-[10px] text-emerald-600 block font-semibold">طبيعي (mmHg)</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block font-bold">معدل النبض (HR)</span>
                        <strong className="text-base text-slate-900 font-mono">72</strong>
                        <span className="text-[10px] text-emerald-600 block font-semibold">نبضة / دقيقة</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block font-bold">درجة الحرارة (Temp)</span>
                        <strong className="text-base text-slate-900 font-mono">37.0°C</strong>
                        <span className="text-[10px] text-emerald-600 block font-semibold">حرارة طبيعية</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 block font-bold">تشبع الأكسجين (SpO2)</span>
                        <strong className="text-base text-slate-900 font-mono">99%</strong>
                        <span className="text-[10px] text-emerald-600 block font-semibold">ممتاز</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary of Medical Records Counts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => setActiveTab('REPORTS')}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all text-start cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-5 h-5 text-rose-600" />
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                      </div>
                      <span className="text-2xl font-black text-slate-900 block">{reports.length}</span>
                      <span className="text-xs text-slate-500 font-bold">تقارير طبية معتمدة</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('TESTS')}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all text-start cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <FlaskConical className="w-5 h-5 text-emerald-600" />
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                      </div>
                      <span className="text-2xl font-black text-slate-900 block">{tests.length}</span>
                      <span className="text-xs text-slate-500 font-bold">فحوصات وتحاليل</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('PRESCRIPTIONS')}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all text-start cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Pill className="w-5 h-5 text-purple-600" />
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                      </div>
                      <span className="text-2xl font-black text-slate-900 block">{prescriptions.length}</span>
                      <span className="text-xs text-slate-500 font-bold">وصفات طبية مسجلة</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('EXAMINATIONS')}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all text-start cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                      </div>
                      <span className="text-2xl font-black text-slate-900 block">{examinations.length}</span>
                      <span className="text-xs text-slate-500 font-bold">معاينات سريرية</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDICAL REPORTS */}
              {activeTab === 'REPORTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900">
                      ملفات التقارير الطبية الرسمية للمريض ({reports.length})
                    </h3>
                    {onOpenNewReport && patient && (
                      <button
                        onClick={() => onOpenNewReport(patient)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>كتابة تقرير جديد</span>
                      </button>
                    )}
                  </div>

                  {reports.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                      لا توجد تقارير طبية مسجلة لهذا المريض حالياً.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {reports.map((rep) => (
                        <div key={rep.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                {rep.reportType}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 font-bold">{rep.reportNumber}</span>
                            </div>

                            <h4 className="font-extrabold text-sm text-slate-900 mb-1">{rep.title}</h4>
                            <p className="text-xs text-slate-600 line-clamp-2 mb-2">{rep.summary || rep.findings}</p>
                            
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1 text-slate-700">
                              <p><strong>التشخيص المعتمد:</strong> {rep.diagnosis}</p>
                              <p><strong>الطبيب المعالج:</strong> {rep.doctorName} ({rep.doctorSpecialty})</p>
                              <p className="text-slate-400">التاريخ: {rep.reportDate}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              معتمد وموقع رقمياً
                            </span>
                            <button
                              onClick={() => setSelectedReportForPrint(rep)}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>عرض وطباعة التقرير</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TESTS & LAB RESULTS */}
              {activeTab === 'TESTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900">
                      ملفات الفحوصات والتحاليل المخبرية والأشعة ({tests.length})
                    </h3>
                  </div>

                  {tests.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                      لا توجد فحوصات مخبرية أو أشعة مسجلة لهذا المريض.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tests.map((t) => (
                        <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                                <FlaskConical className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-900">{t.testName}</h4>
                                <span className="text-[11px] text-slate-500">
                                  التصنيف: <strong>{t.category}</strong> | تاريخ الفحص: {t.testDate}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {t.status === 'COMPLETED' ? 'مكتمل ومعتمد' : 'قيد المعالجة بالمختبر'}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800">
                            <strong>ملخص النتيجة التشخيصية:</strong>
                            <p className="mt-1 leading-relaxed">{t.resultsSummary}</p>
                          </div>

                          {/* Detailed Lab Items Table */}
                          {t.detailedItems && t.detailedItems.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-xs text-start">
                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2.5">المؤشر المخبري</th>
                                    <th className="p-2.5">النتيجة المقاسة</th>
                                    <th className="p-2.5">الوحدة</th>
                                    <th className="p-2.5">المعدل المرجعي الطبيعي</th>
                                    <th className="p-2.5 text-center">التقييم</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {t.detailedItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-bold text-slate-900">{item.parameter}</td>
                                      <td className="p-2.5 font-mono font-bold text-slate-900">{item.value}</td>
                                      <td className="p-2.5 text-slate-500">{item.unit}</td>
                                      <td className="p-2.5 font-mono text-slate-600">{item.referenceRange}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          item.flag === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' :
                                          item.flag === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                                          item.flag === 'LOW' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {item.flag || 'NORMAL'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                            <span>الفني المسؤول: {t.labTechnician || 'قسم المختبر المركزي'}</span>
                            <span className="text-[11px] font-mono text-emerald-700 font-bold">نتائج معتمدة إلكترونياً</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PRESCRIPTIONS & MEDICATIONS */}
              {activeTab === 'PRESCRIPTIONS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900">
                      سجل الوصفات الطبية الإلكترونية والأدوية ({prescriptions.length})
                    </h3>
                    {onOpenNewPrescription && patient && (
                      <button
                        onClick={() => onOpenNewPrescription(patient)}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إصدار وصفة جديدة</span>
                      </button>
                    )}
                  </div>

                  {prescriptions.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                      لا توجد وصفات طبية مسجلة لهذا المريض حالياً.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {prescriptions.map((p) => (
                        <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                وصفة نشطة ومصرحة
                              </span>
                              <span className="text-[11px] font-mono text-slate-600 font-bold">{p.rxNumber}</span>
                            </div>

                            <h4 className="font-bold text-xs text-slate-500 mb-2">
                              بواسطة: <strong className="text-slate-900">{p.doctorName}</strong> ({p.doctorSpecialty}) - {p.date}
                            </h4>

                            <div className="space-y-2">
                              {p.medications.map((m, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900">{m.medicationName}</strong>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">{m.strength}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600">
                                    الجرعة: {m.dosage} • {m.frequency} • المدة: {m.duration}
                                  </p>
                                  {m.instructions && (
                                    <p className="text-[10px] text-emerald-800 font-medium">تعليمات: {m.instructions}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-purple-700 font-bold">صادرة للصيدلية المركزية</span>
                            <button
                              onClick={() => setSelectedPrescriptionForPrint(p)}
                              className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة الروشتة</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CLINICAL EXAMINATIONS */}
              {activeTab === 'EXAMINATIONS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900">
                      سجل المعاينات والملاحظات السريرية ({examinations.length})
                    </h3>
                    <button
                      onClick={() => setIsAddingExam(!isAddingExam)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingExam ? 'إلغاء' : 'تسجيل معاينة جديدة'}</span>
                    </button>
                  </div>

                  {/* Add Examination Inline Card */}
                  {isAddingExam && (
                    <form onSubmit={handleCreateExamination} className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-4">
                      <h4 className="font-extrabold text-sm text-blue-900 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-blue-700" />
                        <span>تسجيل تقرير معاينة سريرية فورية</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">نوع المعاينة:</label>
                          <input
                            type="text"
                            value={newExamType}
                            onChange={(e) => setNewExamType(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                            placeholder="معاينة سريرية، فحص دوري..."
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">الشكوى الرئيسية:</label>
                          <input
                            type="text"
                            value={newExamComplaint}
                            onChange={(e) => setNewExamComplaint(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                            placeholder="سبب الزيارة أو الأعراض الحالية..."
                          />
                        </div>
                      </div>

                      {/* Vitals inputs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">الضغط (BP):</label>
                          <input
                            type="text"
                            value={newExamBP}
                            onChange={(e) => setNewExamBP(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">النبض (HR):</label>
                          <input
                            type="text"
                            value={newExamHR}
                            onChange={(e) => setNewExamHR(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">الحرارة (°C):</label>
                          <input
                            type="text"
                            value={newExamTemp}
                            onChange={(e) => setNewExamTemp(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">الأكسجين (SpO2%):</label>
                          <input
                            type="text"
                            value={newExamO2}
                            onChange={(e) => setNewExamO2(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">التشخيص السريري:</label>
                          <input
                            type="text"
                            required
                            value={newExamDiagnosis}
                            onChange={(e) => setNewExamDiagnosis(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold"
                            placeholder="التشخيص النهائي أو المبدئي..."
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">التوصيات والخطة:</label>
                          <textarea
                            value={newExamRecommendations}
                            onChange={(e) => setNewExamRecommendations(e.target.value)}
                            rows={2}
                            className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                            placeholder="التعليمات، المتابعة، والراحة..."
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingExam(false)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingExam}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          {isSavingExam ? 'جاري الحفظ...' : 'حفظ المعاينة بالملف'}
                        </button>
                      </div>
                    </form>
                  )}

                  {examinations.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                      لا توجد معاينات سريرية مسجلة لهذا المريض حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {examinations.map((exm) => (
                        <div key={exm.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-900 text-sm">{exm.examinationType}</span>
                            <span className="text-slate-400 font-mono">{exm.examinationDate}</span>
                          </div>
                          <p className="text-xs text-slate-600"><strong>الشكوى:</strong> {exm.chiefComplaint}</p>
                          <div className="p-2.5 rounded-xl bg-slate-50 text-xs space-y-1">
                            <p><strong>التشخيص:</strong> <span className="font-bold text-blue-900">{exm.diagnosis}</span></p>
                            <p><strong>النتائج والتوصيات:</strong> {exm.recommendations}</p>
                            {exm.vitalSigns && (
                              <p className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-200">
                                العلامات: الضغط: {exm.vitalSigns.bloodPressure} | النبض: {exm.vitalSigns.heartRate} | الحرارة: {exm.vitalSigns.temperature}°C | SpO2: {exm.vitalSigns.oxygenSaturation}%
                              </p>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">الطبيب: {exm.doctorName} ({exm.doctorSpecialty})</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: CONSULTATIONS */}
              {activeTab === 'CONSULTATIONS' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    الاستشارات الطبية والردود السابقة ({consultations.length})
                  </h3>

                  {consultations.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                      لا توجد استشارات سابقة مسجلة للمريض.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {consultations.map((cns) => {
                        const isAnswered = cns.status === 'ANSWERED' || Boolean(cns.doctorAdvice);
                        return (
                          <div key={cns.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-sm text-slate-900">{cns.title}</h4>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isAnswered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isAnswered ? 'تم الرد' : 'قيد المراجعة'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">{cns.problemDescription}</p>
                            {cns.attachments && Array.isArray(cns.attachments) && cns.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {cns.attachments.map((att: any, attIdx: number) => {
                                  const hasValidUrl = att && att.url && att.url !== '#' && att.url !== '';
                                  return (
                                    <a
                                      key={attIdx}
                                      href={hasValidUrl ? att.url : undefined}
                                      download={att.name || `attachment-${attIdx + 1}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        if (!hasValidUrl) e.preventDefault();
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-900 text-[11px] font-bold border border-cyan-200 transition-colors shadow-2xs"
                                      title={hasValidUrl ? 'فتح/تنزيل الملف' : 'ملف مرفق'}
                                    >
                                      <Paperclip className="w-3 h-3 text-cyan-600 shrink-0" />
                                      <span className="truncate max-w-[130px]">{att.name || 'ملف مرفق'}</span>
                                      {att.size && <span className="text-[10px] text-cyan-600 font-normal">({att.size})</span>}
                                      {hasValidUrl && <Download className="w-2.5 h-2.5 text-cyan-600 shrink-0" />}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                            {cns.doctorAdvice && (
                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                                <strong className="block text-emerald-900 mb-1">رد وتوجيه الطبيب:</strong>
                                {cns.doctorAdvice}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                              <span>مع الطبيب: {cns.doctorName}</span>
                              <span>التاريخ: {cns.createdAt?.split('T')[0]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: TIMELINE */}
              {activeTab === 'TIMELINE' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    السجل الزمني للأحداث الطبية للمريض ({timeline.length})
                  </h3>

                  <div className="space-y-3 relative before:absolute before:inset-0 before:right-4 before:w-0.5 before:bg-slate-200">
                    {timeline.map((item) => (
                      <div key={item.id} className="relative flex items-start gap-4 pr-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs z-10 ${
                          item.type === 'REPORT' ? 'bg-rose-500' :
                          item.type === 'TEST' || item.type === 'RESULT' ? 'bg-emerald-500' :
                          item.type === 'PRESCRIPTION' ? 'bg-purple-500' :
                          item.type === 'EXAMINATION' ? 'bg-blue-500' : 'bg-teal-500'
                        }`}>
                          <Activity className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <strong className="font-extrabold text-slate-900">{item.title}</strong>
                            <span className="text-slate-400 font-mono">{item.date}</span>
                          </div>
                          <p className="text-xs text-slate-500">{item.subtitle}</p>
                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl mt-2">{item.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            ملف رقمي موحد معتمد لدى مركز الرعاية الطبية
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            إغلاق الملف
          </button>
        </div>
      </div>

      {/* Printable Preview Modals */}
      <PrintableReportModal
        isOpen={!!selectedReportForPrint}
        onClose={() => setSelectedReportForPrint(null)}
        report={selectedReportForPrint}
      />

      <PrintablePrescriptionModal
        isOpen={!!selectedPrescriptionForPrint}
        onClose={() => setSelectedPrescriptionForPrint(null)}
        prescription={selectedPrescriptionForPrint}
      />
    </div>
  );
};
