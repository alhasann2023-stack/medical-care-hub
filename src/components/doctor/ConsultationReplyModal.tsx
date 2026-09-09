import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  MessageSquare, 
  User, 
  Clock, 
  Paperclip, 
  AlertTriangle, 
  CheckCircle2,
  FileText,
  Download,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { Consultation } from '../../types/medical';
import { api } from '../../services/api';
import { playSuccessSound } from '../../utils/sound';

interface ConsultationReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: Consultation | null;
  onSuccess: () => void;
}

export const ConsultationReplyModal: React.FC<ConsultationReplyModalProps> = ({
  isOpen,
  onClose,
  consultation,
  onSuccess
}) => {
  if (!isOpen || !consultation) return null;

  const [doctorAdvice, setDoctorAdvice] = useState<string>(consultation.doctorAdvice || '');
  const [treatmentPlan, setTreatmentPlan] = useState<string>(consultation.treatmentPlan || '');
  const [requireInPerson, setRequireInPerson] = useState<boolean>(consultation.requireInPersonVisit || false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorAdvice.trim()) {
      setError('يرجى كتابة التوجيه الطبي والاستشارة السريرية.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.replyConsultation(consultation.id, {
        doctorAdvice,
        treatmentPlan,
        requireInPersonVisit: requireInPerson
      });

      playSuccessSound();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الرد على الاستشارة.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10">
              <MessageSquare className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">الرد على الاستشارة الطبية</h3>
              <p className="text-xs text-emerald-100 font-medium">تقديم التوجيه السريري والخطة العلاجية للمريض</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-start text-xs sm:text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Patient Complaint Info Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-900">{consultation.patientName}</span>
                <span className="text-slate-400">({consultation.patientMrn})</span>
              </div>
              <span className="text-slate-400 text-[11px] font-mono">
                {new Date(consultation.createdAt).toLocaleDateString('ar-SA')}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-1">{consultation.title}</h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                {consultation.problemDescription}
              </p>
            </div>

            {consultation.symptoms && consultation.symptoms.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">الأعراض المصاحبة:</span>
                {consultation.symptoms.map((sym, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium text-[11px]">
                    {sym}
                  </span>
                ))}
              </div>
            )}

            {consultation.attachments && Array.isArray(consultation.attachments) && consultation.attachments.length > 0 && (
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    صور الأشعة والمرفقات الطبية ({consultation.attachments.length}):
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">انقر على صورة الأشعة لتكبيرها وفحصها</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {consultation.attachments.map((att, i) => {
                    const hasValidUrl = att && att.url && att.url !== '#' && att.url !== '';
                    const isImg = att?.type?.startsWith('image/') || att?.url?.startsWith('data:image/') || /\.(jpg|jpeg|png|webp)$/i.test(att?.name || '');
                    
                    return (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs hover:border-emerald-300 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          {isImg && hasValidUrl ? (
                            <div 
                              onClick={() => setPreviewImage(att.url)}
                              className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-300 bg-slate-200 cursor-pointer relative group"
                              title="انقر لتكبير صورة الأشعة"
                            >
                              <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg shrink-0 bg-emerald-100 text-emerald-700 flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate text-[11px]">{att.name || 'ملف مرفق'}</span>
                            {att.size && <span className="text-[10px] text-slate-400 font-mono">{att.size}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isImg && hasValidUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(att.url)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 cursor-pointer"
                              title="تكبير ومعاينة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasValidUrl && (
                            <a
                              href={att.url}
                              download={att.name || `radiology-${i + 1}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                              title="تنزيل الملف"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Doctor Advice Textarea */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              التوجيه والرد السريري المباشر (Doctor Clinical Advice) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={doctorAdvice}
              onChange={(e) => setDoctorAdvice(e.target.value)}
              placeholder="اكتب التوجيهات الطبية، تفسير الحالة، والنصائح الإرشادية للمريض..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
              required
            />
          </div>

          {/* Treatment Plan */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              الخطة العلاجية أو التوصيات الدوائية (اختياري)
            </label>
            <input
              type="text"
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="مثال: راحة تامة لمدة يومين مع شرب سوائل دافئة ومراقبة النبض..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* In-Person Visit Checkbox */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="requireInPerson"
                checked={requireInPerson}
                onChange={(e) => setRequireInPerson(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="requireInPerson" className="text-xs font-bold text-amber-900 cursor-pointer">
                تتطلب الحالة زيارة حضورية للعيادة لإجراء فحص سريري دقيق
              </label>
            </div>
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري حفظ الرد...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال الرد الطبي للمريض</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Full-Screen Radiology Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden border border-slate-800 p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImage} 
              alt="صورة الأشعة" 
              className="max-h-[85vh] w-auto max-w-full object-contain mx-auto rounded-lg"
            />
            <div className="text-center text-xs text-slate-300 py-1.5 flex items-center justify-center gap-4">
              <span>معاينة صورة الأشعة المرفقة بدقة عالية</span>
              <a 
                href={previewImage} 
                download="radiology-scan" 
                className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                تحميل الصورة
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
