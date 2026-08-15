import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  ShieldCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Patient, Doctor } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CreateMedicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetPatientId?: string;
}

export const CreateMedicalReportModal: React.FC<CreateMedicalReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetPatientId
}) => {
  const { doctorProfile, user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(targetPatientId || '');
  
  const [title, setTitle] = useState<string>('تقرير تقييم طبي واستشارة سريرية');
  const [hospitalDepartment, setHospitalDepartment] = useState<string>(doctorProfile?.specialtyNameAr || 'مركز أمراض وجراحة القلب');
  const [clinicalHistory, setClinicalHistory] = useState<string>('مراجعة العيادة لمتابعة حالة خفقان متكررة مع بذل مجهود خفيف.');
  const [findings, setFindings] = useState<string>('العلامات الحيوية: ضغط الدم 125/82، نبض 76 د/د، الفحص الصدري طبيعي.');
  const [diagnosis, setDiagnosis] = useState<string>('خفقان جيبي حميد استجابة للإجهاد (Sinus Tachycardia - Benign)');
  const [recommendations, setRecommendations] = useState<string>('1. تجنب المنبهات والكافيين.\n2. إجراء نشاط رياضي معتدل 30 دقيقة يومياً.\n3. مراجعة العيادة بعد شهرين.');
  const [summary, setSummary] = useState<string>('');
  
  const [isAiDrafting, setIsAiDrafting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      api.getPatients().then(pts => {
        setPatients(pts);
        if (!selectedPatientId && pts.length > 0) {
          setSelectedPatientId(targetPatientId || pts[0].id);
        }
      });
    }
  }, [isOpen, targetPatientId]);

  if (!isOpen) return null;

  const handleAiDraft = async () => {
    setIsAiDrafting(true);
    try {
      const res = await api.draftReport({
        patientId: selectedPatientId,
        clinicalHistory,
        findings,
        preliminaryDiagnosis: diagnosis
      });
      if (res.draft) {
        setDiagnosis(res.draft.diagnosis || diagnosis);
        setRecommendations(res.draft.recommendations || recommendations);
        setSummary(res.draft.summary || summary);
      } else if (res.rawText) {
        setSummary(res.rawText);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !title.trim() || !diagnosis.trim()) {
      setError('يرجى اختيار المريض وتعبئة حقول التقرير والتشخيص.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.createReport({
        patientId: selectedPatientId,
        doctorId: doctorProfile?.id || user?.id || 'doc-1',
        title,
        hospitalDepartment,
        clinicalHistory,
        findings,
        diagnosis,
        recommendations,
        summary: summary || `${title} للمريض المذكور مع توصيات المتابعة.`
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ وإصدار التقرير الطبي.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10">
              <FileText className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">إصدار تقرير طبي رسمي معتمد</h3>
              <p className="text-xs text-slate-300 font-medium">توثيق التشخيص السريري، النتائج، والتوصيات الطبية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-start text-xs sm:text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Drafting Assistant Trigger */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
              <div>
                <strong className="text-blue-900 block text-xs">صياغة مسودة التقرير بالذكاء الاصطناعي</strong>
                <span className="text-[11px] text-blue-700">توليد التوصيات والملخص وصياغة التشخيص طبياً</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAiDraft}
              disabled={isAiDrafting}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isAiDrafting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>توليد المسودة</span>
            </button>
          </div>

          {/* Patient Selection & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                المريض <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.mrn}) — {p.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                القسم الطبي / العيادة
              </label>
              <input
                type="text"
                value={hospitalDepartment}
                onChange={(e) => setHospitalDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Report Title */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              عنوان التقرير الطبي <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
              required
            />
          </div>

          {/* Clinical History & Findings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                التاريخ السريري (Clinical History)
              </label>
              <textarea
                rows={3}
                value={clinicalHistory}
                onChange={(e) => setClinicalHistory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                نتائج الفحص والعلامات (Findings)
              </label>
              <textarea
                rows={3}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
              />
            </div>
          </div>

          {/* Final Diagnosis */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              التشخيص النهائي المعتمد (Final Diagnosis) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-blue-50/50 text-blue-950 font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white"
              required
            />
          </div>

          {/* Recommendations */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              التوصيات الطبية والمتابعة (Recommendations)
            </label>
            <textarea
              rows={3}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري الإصدار والاعتماد...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وإصدار التقرير الطبي</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
