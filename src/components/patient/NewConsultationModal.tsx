import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Stethoscope, 
  AlertTriangle, 
  Upload, 
  Paperclip, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  CreditCard,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { Doctor, Payment } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';

interface NewConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDoctorId?: string;
}

export const NewConsultationModal: React.FC<NewConsultationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedDoctorId
}) => {
  const { user, patientProfile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(preselectedDoctorId || '');
  const [title, setTitle] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [symptomsInput, setSymptomsInput] = useState<string>('خفقان، إجهاد خفيف');
  const [duration, setDuration] = useState<string>('منذ 4 أيام');
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Payment triggers
  const [pendingConsultationData, setPendingConsultationData] = useState<{
    id: string;
    amount: number;
    title: string;
  } | null>(null);
  const [showPaymentCheckout, setShowPaymentCheckout] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setError(null);
      setPendingConsultationData(null);
      setShowPaymentCheckout(false);

      api.getDoctors(undefined, true).then(docs => {
        setDoctors(docs);
        if (!selectedDoctorId && docs.length > 0) {
          setSelectedDoctorId(preselectedDoctorId || docs[0].id);
        }
      });
    }
  }, [isOpen, preselectedDoctorId]);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const consultationFee = selectedDoctor?.consultationFee || 180;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      // 10MB limit check
      if (file.size > 10 * 1024 * 1024) {
        setError('حجم الملف يتجاوز الحد المسموح به (10 ميجابايت).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileUrl = (event.target?.result as string) || '';
        setAttachments(prev => [
          ...prev,
          {
            name: file.name,
            url: fileUrl,
            type: file.type || 'application/pdf',
            size: `${Math.round(file.size / 1024)} KB`
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !title.trim() || !problemDescription.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة واختيار الطبيب.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const symptomsList = symptomsInput
      .split(/[,،]+/)
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const cns = await api.createConsultation({
        patientId: patientProfile?.id || user?.id || 'pat-1',
        patientName: patientProfile?.fullName || user?.fullName || 'المريض',
        patientPhone: patientProfile?.phone || user?.phone || '',
        doctorId: selectedDoctorId,
        doctorName: selectedDoctor?.fullName,
        doctorSpecialty: selectedDoctor?.specialtyNameAr,
        title,
        problemDescription,
        symptoms: symptomsList,
        duration,
        attachments,
        fee: consultationFee
      });

      setPendingConsultationData({
        id: cns.id,
        amount: consultationFee,
        title: cns.title
      });

      setShowPaymentCheckout(true);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الاستشارة الطبية.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (payment: Payment) => {
    setShowPaymentCheckout(false);
    setIsSubmitted(true);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-cyan-700 via-teal-700 to-emerald-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
                <Sparkles className="w-6 h-6 text-cyan-200" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">إرسال استشارة طبية وسداد فوري</h3>
                <p className="text-xs text-cyan-100 font-medium">استشارة طبية موثوقة مع أطبائنا الاستشاريين</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Emergency Disclaimer Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 p-3 px-5 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              هذه الخدمة مخصصة للاستشارات غير الطارئة. في حال وجود ألم صدري حاد أو ضيق تنفس شديد اتصل فوراً بـ 997.
            </span>
          </div>

          {/* Submission Confirmation Screen */}
          {isSubmitted ? (
            <div className="p-4 text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">تم إرسال استشارتك وسداد الرسوم بنجاح!</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                تم تحويل الاستشارة إلى <strong>{selectedDoctor?.fullName}</strong>. ستصلك رسالة وإشعار فوري عند مراجعة الطبيب لحالتك وتوثيق الرد.
              </p>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2">
                <Receipt className="w-4 h-4" />
                سند القبض الإلكتروني معتمد ومسجل في سجل الفواتير.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-2 text-start text-xs sm:text-sm">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Select Doctor */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-900 mb-1.5">
                  الطبيب المعالج المطلوب استشارته <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-300 dark:bg-slate-800 text-slate-900 dark:text-slate-500 font-medium focus:ring-2 focus:ring-cyan-500  transition-all"
                  required
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} — {d.specialtyNameAr} ({d.consultationFee} ر.س)
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultation Title */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  عنوان المشكلة أو الاستفسار الرئيسي <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: تسارع نبضات القلب بعد شرب القهوة، استفسار عن جرعة دواء..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500  transition-all"
                  required
                />
              </div>

              {/* Symptoms & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    الأعراض المصاحبة (افصل بفاصلة)
                  </label>
                  <input
                    type="text"
                    value={symptomsInput}
                    onChange={(e) => setSymptomsInput(e.target.value)}
                    placeholder="صداع، خفقان، دوخة، إجهاد..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500  transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    مدة استمرار الأعراض
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="مثال: منذ يومين، أسبوع، شهر..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500  transition-all text-xs"
                  />
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  شرح تفصيلي للمشكلة الصحية <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="يرجى كتابة تفاصيل متى بدأت الأعراض، وما الذي يزيدها أو يخففها، وأي أدوية قمت بتناولها..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500  transition-all resize-none"
                  required
                />
              </div>

              {/* Attachments Section */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  إرفاق تقارير، تحاليل، أو صور سابقة (اختياري)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-50 text-cyan-800 dark:text-cyan-200 text-xs font-bold cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>اختر ملف من جهازك</span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">PDF, JPG, PNG حتى 10MB</span>
                </div>

                {/* Uploaded List */}
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{att.name}</span>
                          <span className="text-[10px] text-slate-400">({att.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fee summary pill */}
              <div className="p-3.5 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold text-cyan-950 dark:text-cyan-200 block">رسوم الاستشارة الطبية المعتمدة</span>
                    <span className="text-[11px] text-cyan-700 dark:text-cyan-400">شامل المراجعة الطبية والرد الطبي الموثق</span>
                  </div>
                </div>
                <div className="text-left font-black text-cyan-700 dark:text-cyan-400 text-base">
                  {consultationFee} <span className="text-xs font-bold">ر.س</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ معالجة الاستشارة...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>متابعة السداد وإرسال الاستشارة ({consultationFee} ر.س)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Payment Checkout Modal */}
      {showPaymentCheckout && pendingConsultationData && (
        <PaymentCheckoutModal
          isOpen={showPaymentCheckout}
          onClose={() => {
            setShowPaymentCheckout(false);
            onSuccess();
            onClose();
          }}
          onSuccess={handlePaymentSuccess}
          serviceType="CONSULTATION"
          serviceReferenceId={pendingConsultationData.id}
          serviceName={`استشارة طبية: ${pendingConsultationData.title}`}
          amount={pendingConsultationData.amount}
          multiCurrencyPricing={selectedDoctor?.multiCurrencyPricing}
          initialCurrency="YER"
          patientId={patientProfile?.id || user?.id || 'pat-1'}
          patientName={patientProfile?.fullName || user?.fullName || 'المريض'}
          patientPhone={patientProfile?.phone || user?.phone || ''}
          patientMrn={patientProfile?.mrn || 'MRN-2026-8801'}
          doctorId={selectedDoctorId}
          doctorName={selectedDoctor?.fullName}
          doctorSpecialty={selectedDoctor?.specialtyNameAr}
        />
      )}
    </>
  );
};
