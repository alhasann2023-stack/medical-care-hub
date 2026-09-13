import React, { useState, useEffect, useRef } from 'react';
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
  Gift,
  CreditCard,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Doctor } from '../../types/medical';
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
  const [duration, setDuration] = useState<string>('');
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  // Free consultation promo & eligibility state
  const [freePromo, setFreePromo] = useState<any>(null);
  const [patientEligibility, setPatientEligibility] = useState<{
    isFree: boolean;
    reason: 'ADMIN_WHITELIST' | 'GENERAL_PROMO' | 'NOT_ELIGIBLE';
    waiverReason: string;
    matchedWhitelistItem?: any;
    hasUsedGeneralFree?: boolean;
    promoIsActive: boolean;
    promoTitle?: string;
    oneFreePerPatient: boolean;
  } | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setError(null);
      setAttachments([]);
      setAttachmentFiles([]);

      api.getDoctors(undefined, true).then(docs => {
        setDoctors(docs);
        if (!selectedDoctorId && docs.length > 0) {
          setSelectedDoctorId(preselectedDoctorId || docs[0].id);
        }
      });

      // Load free consultation promo info
      api.getFreeConsultationPromo().then(p => setFreePromo(p));
    }
  }, [isOpen, preselectedDoctorId]);

  // Check free consultation eligibility whenever modal is open, patient identity or selected doctor changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const evaluateEligibility = async () => {
      setIsCheckingEligibility(true);
      try {
        const result = await api.checkFreeConsultationEligibility({
          patientId: patientProfile?.id || user?.id,
          phone: patientProfile?.phone || user?.phone,
          mrn: patientProfile?.mrn,
          doctorId: selectedDoctorId || undefined
        });
        if (isMounted) {
          setPatientEligibility(result);
        }
      } catch (err) {
        console.warn('Failed to check free consultation eligibility:', err);
      } finally {
        if (isMounted) setIsCheckingEligibility(false);
      }
    };

    evaluateEligibility();

    // Subscribe to real-time promo changes
    const unsubscribe = api.subscribeFreeConsultationPromo((updatedPromo) => {
      if (isMounted) {
        setFreePromo(updatedPromo);
        evaluateEligibility();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isOpen, selectedDoctorId, patientProfile?.id, patientProfile?.phone, user?.id, user?.phone]);

  if (!isOpen) return null;

  const processSelectedFile = async (file: File) => {
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|webp|pdf|doc|docx|dcm|dicom)$/i;
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/dicom'
    ];
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (file.size > MAX_FILE_SIZE) {
      setError(`الملف "${file.name}" يتجاوز الحد المسموح به (15 ميجابايت).`);
      return;
    }
    if (file.type && !isImage && !allowedMimeTypes.includes(file.type) && !ALLOWED_EXTENSIONS.test(file.name)) {
      setError(`نوع الملف "${file.name}" غير مدعوم.`);
      return;
    }

    setAttachmentFiles(prev => [...prev, file]);

    if (isImage) {
      try {
        const rawDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        if (file.size < 600 * 1024) {
          setAttachments(prev => [...prev, { name: file.name, url: rawDataUrl, type: file.type || 'image/jpeg', size: `${Math.max(1, Math.round(file.size / 1024))} KB` }]);
          return;
        }
        const compressedUrl = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1600; let w = img.width; let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) { ctx.drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.82)); }
            else resolve(rawDataUrl);
          };
          img.onerror = () => resolve(rawDataUrl);
          img.src = rawDataUrl;
        });
        const approxSizeKb = Math.round((compressedUrl.length * 3) / 4 / 1024);
        setAttachments(prev => [...prev, { name: file.name, url: compressedUrl, type: 'image/jpeg', size: `${Math.max(1, approxSizeKb)} KB` }]);
        return;
      } catch (err) { console.warn('Canvas image compression notice:', err); }
    }

    try {
      const reader = new FileReader();
      reader.onload = event => {
        const fileUrl = (event.target?.result as string) || '';
        setAttachments(prev => [...prev, { name: file.name, url: fileUrl, type: file.type || 'application/octet-stream', size: `${Math.max(1, Math.round(file.size / 1024))} KB` }]);
      };
      reader.onerror = () => {
        setAttachments(prev => [...prev, { name: file.name, url: '', type: file.type || 'application/octet-stream', size: `${Math.max(1, Math.round(file.size / 1024))} KB` }]);
      };
      reader.readAsDataURL(file);
    } catch (e: any) { setError('تعذر قراءة الملف المحدد: ' + (e.message || '')); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessingFile(true); setError(null);
    try { for (let i = 0; i < files.length; i++) await processSelectedFile(files[i]); }
    finally { setIsProcessingFile(false); if (e.target) e.target.value = ''; }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
    setAttachmentFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const baseConsultationFee = selectedDoctor?.consultationFee || 180;
  const isFreeEligible = Boolean(patientEligibility?.isFree);
  const finalFee = isFreeEligible ? 0 : baseConsultationFee;

  const executeCreateConsultation = async (paymentDetails?: { paymentId?: string; transactionRef?: string }) => {
    setIsLoading(true);
    setError(null);

    const symptomsList = symptomsInput
      .split(/[,،]+/)
      .map(s => s.trim())
      .filter(Boolean);

    try {
      await api.createConsultation({
        patientId: patientProfile?.id || user?.id || 'pat-1',
        patientName: patientProfile?.fullName || user?.fullName || 'المريض',
        patientPhone: patientProfile?.phone || user?.phone || '',
        patientMrn: patientProfile?.mrn,
        doctorId: selectedDoctorId,
        doctorName: selectedDoctor?.fullName,
        doctorSpecialty: selectedDoctor?.specialtyNameAr,
        title,
        problemDescription,
        symptoms: symptomsList,
        duration,
        fee: finalFee,
        consultationFee: finalFee,
        isWaived: isFreeEligible,
        waiverReason: isFreeEligible ? (patientEligibility?.waiverReason || 'استشارة مجانية معتمدة') : undefined,
        paymentId: isFreeEligible ? `pay-free-${Date.now()}` : paymentDetails?.paymentId,
        transactionReference: isFreeEligible ? `FREE-${Date.now().toString().slice(-6)}` : paymentDetails?.transactionRef,
        isPaid: isFreeEligible ? true : false,
        paymentStatus: isFreeEligible ? 'WAIVED' : 'PENDING',
        attachments,
        attachmentFiles
      });

      setIsSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الاستشارة الطبية.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !title.trim() || !problemDescription.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة واختيار الطبيب.');
      return;
    }

    // If eligible for free consultation (or 0 fee), submit immediately without payment
    if (isFreeEligible || finalFee === 0) {
      await executeCreateConsultation();
    } else {
      // Patient must pay for subsequent consultations (or when promo is inactive)
      setShowPaymentModal(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`p-5 text-white flex items-center justify-between ${
          isFreeEligible 
            ? 'bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800' 
            : 'bg-gradient-to-r from-cyan-700 to-blue-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-md">
              {isFreeEligible ? <Gift className="w-6 h-6 text-amber-300 animate-pulse" /> : <Sparkles className="w-6 h-6 text-cyan-200" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  {isFreeEligible ? 'طلب استشارة طبية مجانية' : 'إرسال استشارة طبية عن بعد'}
                </h3>
                {isFreeEligible && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 shadow-xs">
                    مجاناً 100%
                  </span>
                )}
              </div>
              <p className="text-xs text-cyan-100 font-medium">احصل على استشارة وإرشادات موثوقة من أطبائنا الاستشاريين</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Promo / Whitelist / Paid Notice Banner */}
        {isFreeEligible ? (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3.5 px-5 flex items-start gap-3 text-xs text-emerald-950">
            <Gift className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">
                {patientEligibility?.reason === 'ADMIN_WHITELIST'
                  ? 'تم اعتماد استشارة مجانية خاصة لحسابك بقرار الإدارة'
                  : `مبادرة استشارة مجانية واحدة لكل مريض: ${patientEligibility?.promoTitle || freePromo?.occasionTitle || 'العرض العام'}`}
              </p>
              <p className="text-[11px] text-emerald-800/90 mt-0.5">
                {patientEligibility?.waiverReason} — هذه الاستشارة معفاة تماماً من الرسوم (0 ر.ي). بقية الاستشارات اللاحقة تكون مدفوعة.
              </p>
            </div>
          </div>
        ) : patientEligibility?.hasUsedGeneralFree ? (
          <div className="bg-amber-50 border-b border-amber-200 p-3.5 px-5 flex items-start gap-3 text-xs text-amber-950">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">
                تنويه: تم استخدام الاستشارة المجانية المخصصة لحسابك مسبقاً
              </p>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                تتيح مبادرة المستشفى استشارة مجانية واحدة فقط لكل حساب مريض. هذه الاستشارة الحالية خاضعة للرسوم الرسمية المقررة ({baseConsultationFee} ر.ي) وسيتم توجيهك للسداد الإلكتروني المباشر.
              </p>
            </div>
          </div>
        ) : null}

        {/* Emergency Disclaimer Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 px-4 flex items-center gap-2 text-[11px] text-slate-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>
            هذه الخدمة مخصصة للاستشارات غير الطارئة. في حال وجود ألم صدري حاد أو طارئ اتصل فوراً بـ 997.
          </span>
        </div>

        {/* Submission Confirmation Screen */}
        {isSubmitted ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="font-extrabold text-xl text-slate-900">تم إرسال استشارتك بنجاح!</h4>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              تم تحويل الاستشارة إلى <strong>{selectedDoctor?.fullName}</strong>. ستصلك رسالة وإشعار فوري عند مراجعة الطبيب لحالتك وتوثيق الرد.
            </p>
            <div className="p-3 bg-cyan-50 rounded-xl text-xs text-cyan-800 font-semibold border border-cyan-200">
              حالة الاستشارة الآن: [{isFreeEligible ? 'معتمدة مجاناً - قيد الانتظار PENDING' : 'مدفوعة ومؤكدة - قيد المراجعة'}]
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-2 text-start text-xs sm:text-sm">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Select Doctor */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                الطبيب المعالج المطلوب استشارته <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all"
                required
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialtyId} ({d.title}) {d.consultationFee ? `— ${d.consultationFee} ر.ي` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Consultation Title */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                عنوان المشكلة أو الاستفسار الرئيسي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تسارع نبضات القلب بعد شرب القهوة، استفسار عن جرعة دواء..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all"
                required
              />
            </div>

            {/* Symptoms & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  الأعراض المصاحبة (افصل بفاصلة)
                </label>
                <input
                  type="text"
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  placeholder="صداع، خفقان، دوخة، إجهاد..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  مدة استمرار الأعراض
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="مثال: منذ يومين، أسبوع، شهر..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all text-xs"
                />
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                شرح تفصيلي للمشكلة الصحية <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="يرجى كتابة تفاصيل متى بدأت الأعراض، وما الذي يزيدها أو يخففها، وأي أدوية قمت بتناولها..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all resize-none"
                required
              />
            </div>

            {/* Attachments Section */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                إرفاق تقارير، تحاليل، أو صور سابقة (اختياري)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-cyan-400 bg-cyan-50/50 hover:bg-cyan-50 text-cyan-800 text-xs font-bold cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>اختر ملف من جهازك</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.dcm,.dicom"
                    onChange={handleFileUpload}
                  />
                </label>
                <span className="text-[11px] text-slate-400">PDF, JPG, PNG, WEBP, DOC, DOCX, DCM حتى 15MB للملف</span>
              </div>

              {isProcessingFile && (
                <div className="mt-2 text-xs text-cyan-700 font-semibold">جاري تجهيز المرفقات...</div>
              )}

              {/* Uploaded List */}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800 truncate">{att.name}</span>
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

            {/* Fee & Payment Summary Box */}
            <div className={`p-4 rounded-xl border transition-all ${
              isFreeEligible 
                ? 'bg-emerald-50/70 border-emerald-300' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">رسوم الاستشارة:</span>
                    {isFreeEligible ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through text-xs font-mono">{baseConsultationFee} ر.ي</span>
                        <span className="text-emerald-700 font-extrabold text-base">مجاناً (0 ر.ي)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          معفاة بقرار النظام
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-900 font-extrabold text-base">{baseConsultationFee} ر.ي</span>
                        <span className="text-slate-500 text-xs">(استشارة مدفوعة)</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isFreeEligible
                      ? 'لا يتطلب أي دفع إلكتروني. سيتم إرسال الاستشارة مباشرة إلى ملف الطبيب.'
                      : 'يلزم استكمال السداد الإلكتروني لكي تصل الاستشارة للطبيب للرد عليها وتوثيق التوجيه الطبي.'}
                  </p>
                </div>

                <div className="shrink-0">
                  {isFreeEligible ? (
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                      <CreditCard className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
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
                disabled={isLoading || isCheckingEligibility}
                className={`px-6 py-2.5 rounded-xl text-white font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isFreeEligible 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
                    : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/20'
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري المعالجة...</span>
                  </>
                ) : isFreeEligible ? (
                  <>
                    <Gift className="w-4 h-4" />
                    <span>إرسال الاستشارة المجانية فوراً</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>متابعة السداد ({finalFee} ر.ي) وإرسال الاستشارة</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Payment Checkout Modal for subsequent / paid consultations */}
      {showPaymentModal && (
        <PaymentCheckoutModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={async (payment) => {
            setShowPaymentModal(false);
            await executeCreateConsultation({
              paymentId: payment.id,
              transactionRef: payment.transactionReference
            });
          }}
          serviceType="CONSULTATION"
          serviceReferenceId={`CNS-TEMP-${Date.now()}`}
          serviceName={`استشارة طبية عن بعد: ${title}`}
          amount={finalFee}
          currency="YER"
          patientId={patientProfile?.id || user?.id}
          patientName={patientProfile?.fullName || user?.fullName}
          patientPhone={patientProfile?.phone || user?.phone}
          patientMrn={patientProfile?.mrn}
          doctorId={selectedDoctorId}
          doctorName={selectedDoctor?.fullName}
          doctorSpecialty={selectedDoctor?.specialtyNameAr}
        />
      )}
    </div>
  );
};

