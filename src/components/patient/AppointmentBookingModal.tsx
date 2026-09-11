import React, { useState, useEffect, useRef } from 'react';

import {
  X,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  Receipt,
  Upload,
  Eye,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

import {
  Doctor,
  MedicalService,
  PreferredPeriod,
  Payment
} from '../../types/medical';

import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDoctorId?: string;
}

interface AttachmentPreview {
  name: string;
  url: string;
  type: string;
  size: string;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedDoctorId
}) => {
  const { user, patientProfile } = useAuth();

  // ============================================================
  // IMPORTANT:
  // ALL HOOKS MUST BE DECLARED BEFORE "if (!isOpen) return null;"
  // ============================================================

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    preselectedDoctorId || ''
  );

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [preferredDate, setPreferredDate] = useState<string>('');
  const [preferredPeriod, setPreferredPeriod] =
    useState<PreferredPeriod>('MORNING');

  const [reason, setReason] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');

  // Preview metadata shown in UI
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);

  // REAL File objects.
  // These are the files that will actually be uploaded to /api/uploads.
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Payment checkout
  const [pendingAppointmentPayload, setPendingAppointmentPayload] =
    useState<any | null>(null);

  const [showPaymentCheckout, setShowPaymentCheckout] =
    useState<boolean>(false);

  const [checkoutRef, setCheckoutRef] = useState<string>('');

  // File input refs MUST be before the early return
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isProcessingFile, setIsProcessingFile] =
    useState<boolean>(false);

  // ============================================================
  // OPEN / LOAD DATA
  // ============================================================

  useEffect(() => {
    if (!isOpen) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setPreferredDate(
      tomorrow.toISOString().split('T')[0]
    );

    setIsSubmitted(false);
    setError(null);
    setPendingAppointmentPayload(null);
    setShowPaymentCheckout(false);
    setCheckoutRef('');

    // Release old preview URLs
    setAttachments(prev => {
      prev.forEach(att => {
        if (att.url.startsWith('blob:')) {
          URL.revokeObjectURL(att.url);
        }
      });

      return [];
    });

    setAttachmentFiles([]);
    setPreviewImage(null);

    // Fetch doctors
    api.getDoctors(undefined, true).then(docs => {
      setDoctors(docs);

      if (!selectedDoctorId && docs.length > 0) {
        setSelectedDoctorId(
          preselectedDoctorId || docs[0].id
        );
      }
    }).catch(err => {
      console.error('Failed to load doctors:', err);
      setError('تعذر تحميل قائمة الأطباء.');
    });

    // Fetch services
    api.getServices().then(srvs => {
      setServices(srvs);

      if (srvs.length > 0) {
        setSelectedServiceId(srvs[0].id);
      }
    }).catch(err => {
      console.error('Failed to load services:', err);
      setError('تعذر تحميل الخدمات الطبية.');
    });
  }, [isOpen, preselectedDoctorId]);

  // ============================================================
  // CLEANUP PREVIEW URLS WHEN COMPONENT IS UNMOUNTED
  // ============================================================

  useEffect(() => {
    return () => {
      attachments.forEach(att => {
        if (att.url.startsWith('blob:')) {
          URL.revokeObjectURL(att.url);
        }
      });
    };
  }, [attachments]);

  // ============================================================
  // EARLY RETURN IS NOW SAFE
  // ============================================================

  if (!isOpen) return null;

  // ============================================================
  // SELECTED DATA
  // ============================================================

  const selectedDoctor = doctors.find(
    d => d.id === selectedDoctorId
  );

  const selectedService =
    services.find(
      s =>
        s.id === selectedServiceId ||
        s.nameAr === selectedServiceId
    ) || services[0];

  const calculatedFee =
    selectedService?.price ??
    (services.length > 0 ? services[0].price : 200);

  // ============================================================
  // FILE PROCESSING
  // ============================================================

  const processSelectedFile = async (file: File) => {
    const MAX_FILE_SIZE = 15 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `حجم الملف "${file.name}" يتجاوز الحد المسموح به وهو 15 ميجابايت.`
      );
      return;
    }

    const allowedExtensions =
      /\.(jpg|jpeg|png|webp|pdf|doc|docx|dcm|dicom)$/i;

    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/dicom'
    ];

    const isImage = file.type.startsWith('image/');
    const isAllowedMime = allowedMimeTypes.includes(file.type);
    const isAllowedExtension = allowedExtensions.test(file.name);

    if (!isImage && !isAllowedMime && !isAllowedExtension) {
      setError(
        `نوع الملف "${file.name}" غير مدعوم.`
      );
      return;
    }

    // ==========================================================
    // IMPORTANT:
    // Store the ORIGINAL File object.
    // Do not replace it with Base64.
    // ==========================================================

    setAttachmentFiles(prev => [
      ...prev,
      file
    ]);

    // ==========================================================
    // IMAGE PREVIEW
    // ==========================================================

    if (isImage) {
      const previewUrl = URL.createObjectURL(file);

      setAttachments(prev => [
        ...prev,
        {
          name: file.name,
          url: previewUrl,
          type: file.type || 'image/jpeg',
          size: `${Math.max(
            1,
            Math.round(file.size / 1024)
          )} KB`
        }
      ]);

      return;
    }

    // ==========================================================
    // DOCUMENT PREVIEW
    // ==========================================================

    const previewUrl = URL.createObjectURL(file);

    setAttachments(prev => [
      ...prev,
      {
        name: file.name,
        url: previewUrl,
        type:
          file.type ||
          'application/octet-stream',
        size: `${Math.max(
          1,
          Math.round(file.size / 1024)
        )} KB`
      }
    ]);
  };

  // ============================================================
  // FILE INPUT
  // ============================================================

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    if (!files || files.length === 0) {
      return;
    }

    setIsProcessingFile(true);
    setError(null);

    try {
      const MAX_FILES = 5;

      const currentCount = attachmentFiles.length;

      const incomingFiles = Array.from(files) as File[];

      if (
        currentCount + incomingFiles.length >
        MAX_FILES
      ) {
        setError(
          `يمكن إرفاق ${MAX_FILES} ملفات كحد أقصى.`
        );

        return;
      }

      for (const file of incomingFiles) {
        await processSelectedFile(file);
      }
    } catch (err: any) {
      console.error(
        'Attachment processing error:',
        err
      );

      setError(
        err?.message ||
        'تعذر معالجة الملف المحدد.'
      );
    } finally {
      setIsProcessingFile(false);

      // Required for Android WebView:
      // allows selecting the same file again.
      e.target.value = '';
    }
  };

  // ============================================================
  // REMOVE ATTACHMENT
  // ============================================================

  const handleRemoveAttachment = (
    idx: number
  ) => {
    setAttachments(prev => {
      const removed = prev[idx];

      if (
        removed?.url &&
        removed.url.startsWith('blob:')
      ) {
        URL.revokeObjectURL(removed.url);
      }

      return prev.filter(
        (_, i) => i !== idx
      );
    });

    setAttachmentFiles(prev =>
      prev.filter(
        (_, i) => i !== idx
      )
    );

    if (previewImage) {
      setPreviewImage(null);
    }
  };

  // ============================================================
  // SUBMIT APPOINTMENT
  // ============================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !selectedDoctorId ||
      !reason.trim()
    ) {
      setError(
        'يرجى اختيار الطبيب وكتابة سبب الزيارة.'
      );

      return;
    }

    setError(null);

    // ==========================================================
    // WORKING DAYS
    // Saturday = 6
    // Sunday   = 0
    // Tuesday  = 2
    // Wednesday= 3
    // Monday   = 1 holiday
    // ==========================================================

    if (preferredDate) {
      const selectedDay =
        new Date(
          preferredDate + 'T00:00:00'
        ).getDay();

      if (selectedDay === 1) {
        setError(
          'تنبيه: يوم الإثنين إجازة رسمية للمستشفى. أيام الدوام المعتمدة لاستقبال المرضى هي السبت، الأحد، الثلاثاء، والأربعاء فقط.'
        );

        return;
      }

      if (
        ![6, 0, 2, 3].includes(
          selectedDay
        )
      ) {
        setError(
          'أيام الدوام المعتمدة للعيادات هي السبت، الأحد، الثلاثاء، والأربعاء فقط (الإثنين إجازة رسمية، والخميس والجمعة عطلة أسبوعية).'
        );

        return;
      }
    }

    // ==========================================================
    // PAYLOAD
    //
    // attachmentFiles is intentionally included.
    //
    // api.createAppointment() will:
    // 1. Upload attachmentFiles to /api/uploads
    // 2. Merge returned URLs with attachments
    // 3. Remove attachmentFiles before JSON request
    // ==========================================================

    const payload = {
      patientId:
        patientProfile?.id ||
        user?.id ||
        'pat-1',

      patientName:
        patientProfile?.fullName ||
        user?.fullName ||
        'المريض',

      patientPhone:
        patientProfile?.phone ||
        user?.phone ||
        '',

      doctorId:
        selectedDoctorId,

      doctorName:
        selectedDoctor?.fullName,

      doctorSpecialty:
        selectedDoctor?.specialtyNameAr,

      clinicRoom:
        selectedDoctor?.roomNumber,

      serviceId:
        selectedServiceId ||
        undefined,

      serviceName:
        selectedService?.nameAr ||
        'كشف طبي واستشارة عيادية',

      preferredDate,

      preferredPeriod,

      reason,

      patientNotes,

      // Preview metadata
      attachments,

      // ORIGINAL File objects
      attachmentFiles,

      fee:
        calculatedFee
    };

    // ==========================================================
    // FREE APPOINTMENT
    // ==========================================================

    if (calculatedFee <= 0) {
      setIsLoading(true);

      try {
        await api.createAppointment(
          payload
        );

        setIsSubmitted(true);

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2500);
      } catch (err: any) {
        console.error(
          'Create appointment error:',
          err
        );

        setError(
          err?.message ||
          'فشل إرسال طلب الحجز.'
        );
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // ==========================================================
    // PAYMENT
    //
    // DO NOT create appointment yet.
    // Keep the entire payload INCLUDING attachmentFiles.
    // ==========================================================

    const tempRef =
      `REF-APT-${Date.now()}`;

    setCheckoutRef(tempRef);

    setPendingAppointmentPayload(
      payload
    );

    setShowPaymentCheckout(true);
  };

  // ============================================================
  // PAYMENT SUCCESS
  // ============================================================

  const handlePaymentSuccess = async (
    payment: Payment
  ) => {
    if (
      !pendingAppointmentPayload
    ) {
      return;
    }

    setShowPaymentCheckout(false);
    setIsLoading(true);
    setError(null);

    try {
      // ========================================================
      // IMPORTANT:
      // pendingAppointmentPayload still contains attachmentFiles
      // so api.createAppointment() can upload them NOW.
      // ========================================================

      await api.createAppointment({
        ...pendingAppointmentPayload,

        paymentId:
          payment.id,

        paymentStatus:
          'PAYMENT_SUCCESS',

        transactionReference:
          payment.transactionReference,

        isPaid:
          true
      });

      setIsSubmitted(true);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error(
        'Appointment confirmation after payment error:',
        err
      );

      setError(
        'تم السداد بنجاح ولكن تعذر تأكيد الموعد: ' +
        (
          err?.message ||
          'يرجى مراجعة الدعم'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
                <Calendar className="w-6 h-6 text-cyan-300" />
              </div>

              <div>
                <h3 className="font-extrabold text-base sm:text-lg">
                  حجز موعد وسداد إلكتروني فوري
                </h3>

                <p className="text-xs text-blue-100 font-medium">
                  حجز مباشر ومؤكد عبر بوابات الدفع الرسمية المعتمدة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ================================================= */}
          {/* SUCCESS */}
          {/* ================================================= */}

          {isSubmitted ? (
            <div className="p-8 text-center space-y-4">

              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h4 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">
                تم تأكيد حجز الموعد وسداده بنجاح!
              </h4>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                تم اعتماد دفع رسوم الكشف لعيادة{' '}
                <strong>
                  {selectedDoctor?.fullName}
                </strong>{' '}
                بنجاح. تم تسجيل الموعد ومرفقات الأشعة في جدول العيادة وسيصلك تذكير آلي قبل الموعد.
              </p>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2">
                <Receipt className="w-4 h-4" />
                تم إرسال سند القبض الإلكتروني الضريبي ورسالة التذكير إلى هاتفك.
              </div>
            </div>
          ) : (

            <form
              onSubmit={handleSubmit}
              className="p-4 space-y-2 text-start text-xs sm:text-sm"
            >

              {/* ================================================= */}
              {/* ERROR */}
              {/* ================================================= */}

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-3 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* ================================================= */}
              {/* DOCTOR */}
              {/* ================================================= */}

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  1. اختر الطبيب المعالج / التخصص{' '}
                  <span className="text-rose-500">*</span>
                </label>

                <select
                  value={selectedDoctorId}
                  onChange={e =>
                    setSelectedDoctorId(
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                >
                  {doctors.map(d => (
                    <option
                      key={d.id}
                      value={d.id}
                    >
                      {d.fullName} — {d.specialtyNameAr}
                    </option>
                  ))}
                </select>

                {selectedDoctor && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">

                    <div className="flex items-center gap-2.5">
                      <img
                        src={selectedDoctor.avatar}
                        alt={selectedDoctor.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                      />

                      <div>
                        <strong className="text-slate-900 dark:text-slate-100 block text-xs">
                          {selectedDoctor.fullName}
                        </strong>

                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                          {selectedDoctor.roomNumber}{' '}
                          ({selectedDoctor.specialtyNameAr})
                        </span>
                      </div>
                    </div>

                    <div className="text-end text-[11px]">
                      <span className="block text-slate-600 dark:text-slate-300 font-medium">
                        الأيام:{' '}
                        {selectedDoctor.availableDays?.join('، ') ||
                          'السبت، الأحد، الثلاثاء، الأربعاء'}
                      </span>

                      <span className="text-blue-600 dark:text-blue-400 text-[10px]">
                        رسوم استشارة الطبيب:{' '}
                        {selectedDoctor.consultationFee} ر.ي
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ================================================= */}
              {/* SERVICE */}
              {/* ================================================= */}

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  2. نوع الخدمة الطبية المطلوبة (السعر الرسمي){' '}
                  <span className="text-rose-500">*</span>
                </label>

                <select
                  value={selectedServiceId}
                  onChange={e =>
                    setSelectedServiceId(
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                >
                  {services.map(s => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.nameAr} — السعر الرسمي: {s.price} ر.ي{' '}
                      {s.durationMinutes
                        ? `(${s.durationMinutes} دقيقة)`
                        : ''}
                    </option>
                  ))}
                </select>

                {selectedService && (
                  <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                    <span className="text-emerald-900 dark:text-emerald-200 font-medium">
                      سعر الخدمة الطبية المعتمد:
                    </span>

                    <strong className="text-emerald-700 dark:text-emerald-400 font-black">
                      {selectedService.price} ر.ي
                    </strong>
                  </div>
                )}
              </div>

              {/* ================================================= */}
              {/* DATE + PERIOD */}
              {/* ================================================= */}

              <div className="space-y-1">

                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5 font-bold">
                  <span>📅 أيام الدوام المعتمدة:</span>
                  <span className="font-semibold">
                    السبت، الأحد، الثلاثاء، والأربعاء (الإثنين إجازة رسمية)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      3. اليوم المفضل للزيارة{' '}
                      <span className="text-rose-500">*</span>
                    </label>

                    <input
                      type="date"
                      value={preferredDate}
                      min={
                        new Date()
                          .toISOString()
                          .split('T')[0]
                      }
                      onChange={e =>
                        setPreferredDate(
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      4. الفترة المفضلة{' '}
                      <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        {
                          id: 'MORNING',
                          label: 'صباحاً',
                          sub: '09:00 - 12:00'
                        },
                        {
                          id: 'AFTERNOON',
                          label: 'ظهراً',
                          sub: '12:00 - 04:00'
                        },
                        {
                          id: 'EVENING',
                          label: 'مساءً',
                          sub: '04:00 - 09:00'
                        }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setPreferredPeriod(
                              p.id as PreferredPeriod
                            )
                          }
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            preferredPeriod === p.id
                              ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block text-xs">
                            {p.label}
                          </span>

                          <span className="block text-[9px] opacity-80">
                            {p.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* ================================================= */}
              {/* REASON */}
              {/* ================================================= */}

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  5. سبب الزيارة أو الأعراض التي تشعر بها{' '}
                  <span className="text-rose-500">*</span>
                </label>

                <textarea
                  rows={2}
                  value={reason}
                  onChange={e =>
                    setReason(
                      e.target.value
                    )
                  }
                  placeholder="مثال: فحص دوري لضغط الدم، ألم مستمر في الصدر عند المشي، استشارة نتائج سابقة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  required
                />
              </div>

              {/* ================================================= */}
              {/* ATTACHMENTS */}
              {/* ================================================= */}

              <div className="p-3 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 space-y-2">

                <div className="flex items-center justify-between">

                  <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />

                    <span>
                      إرفاق صور الأشعة والتقارير الطبية للموعد
                    </span>
                  </label>

                  <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">
                    {attachments.length > 0
                      ? `${attachments.length} مرفق`
                      : 'اختياري'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  يمكنك إرفاق صور الأشعة السابقة (X-Ray / MRI / CT) ليتسنى للطبيب الاطلاع عليها مسبقاً قبل وصولك للعيادة.
                </p>

                <div className="flex flex-wrap items-center gap-2">

                  {/* FILE BUTTON */}

                  <button
                    type="button"
                    disabled={
                      isProcessingFile ||
                      attachmentFiles.length >= 5
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-blue-500 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 text-blue-800 dark:text-blue-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />

                    <span>
                      اختيار صور الأشعة أو الملفات
                    </span>
                  </button>

                  {/* CAMERA BUTTON */}

                  <button
                    type="button"
                    disabled={
                      isProcessingFile ||
                      attachmentFiles.length >= 5
                    }
                    onClick={() =>
                      cameraInputRef.current?.click()
                    }
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-cyan-500 bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-slate-750 text-cyan-800 dark:text-cyan-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-4 h-4 text-cyan-600" />

                    <span>
                      التقاط بالكاميرا
                    </span>
                  </button>

                  {/* STANDARD FILE INPUT */}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.dcm,.dicom"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={
                      handleFileUpload
                    }
                  />

                  {/* CAMERA INPUT */}

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={
                      handleFileUpload
                    }
                  />

                  {/* PROCESSING */}

                  {isProcessingFile ? (
                    <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">

                      <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />

                      <span>
                        جارٍ معالجة الملف...
                      </span>

                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      صور أو مستندات حتى 15MB
                    </span>
                  )}
                </div>

                {/* ================================================= */}
                {/* ATTACHMENT LIST */}
                {/* ================================================= */}

                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">

                    {attachments.map(
                      (att, idx) => {

                        const isImg =
                          att.type?.startsWith(
                            'image/'
                          ) ||
                          att.url?.startsWith(
                            'blob:'
                          ) ||
                          att.url?.startsWith(
                            'data:image/'
                          ) ||
                          /\.(jpg|jpeg|png|webp)$/i.test(
                            att.name
                          );

                        return (
                          <div
                            key={`${att.name}-${idx}`}
                            className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                          >

                            <div className="flex items-center gap-2 min-w-0">

                              {isImg ? (
                                <div
                                  onClick={() =>
                                    setPreviewImage(
                                      att.url
                                    )
                                  }
                                  className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 cursor-pointer relative group"
                                  title="اضغط لتكبير ومعاينة صورة الأشعة"
                                >
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="w-full h-full object-cover"
                                  />

                                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <Eye className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-lg shrink-0 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                                  <FileText className="w-4 h-4" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate text-[11px]">
                                  {att.name}
                                </span>

                                <span className="text-[10px] text-slate-400 font-mono">
                                  {att.size}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">

                              {isImg && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage(
                                      att.url
                                    )
                                  }
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded-md cursor-pointer"
                                  title="معاينة"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveAttachment(
                                    idx
                                  )
                                }
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                title="حذف"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </div>

              {/* ================================================= */}
              {/* FEE */}
              {/* ================================================= */}

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <CreditCard className="w-5 h-5 text-emerald-600" />

                  <div>
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                      سعر الخدمة الطبية للموعد (السعر الرسمي)
                    </span>

                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      لا يتم إرسال طلب الحجز للعيادة إلا بعد اكتمال السداد الإلكتروني
                    </span>
                  </div>

                </div>

                <div className="text-left font-black text-emerald-600 dark:text-emerald-400 text-base">
                  {calculatedFee}{' '}
                  <span className="text-xs font-bold">
                    ر.ي
                  </span>
                </div>

              </div>

              {/* ================================================= */}
              {/* FOOTER */}
              {/* ================================================= */}

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
                  disabled={
                    isLoading ||
                    isProcessingFile
                  }
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >

                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                      <span>
                        جارٍ المعالجة...
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />

                      <span>
                        متابعة السداد الإلكتروني وتأكيد الحجز ({calculatedFee} ر.ي)
                      </span>
                    </>
                  )}

                </button>

              </div>

            </form>
          )}

        </div>
      </div>

      {/* ======================================================= */}
      {/* IMAGE LIGHTBOX */}
      {/* ======================================================= */}

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() =>
            setPreviewImage(null)
          }
        >

          <div
            className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden border border-slate-800 p-2 shadow-2xl"
            onClick={e =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              onClick={() =>
                setPreviewImage(null)
              }
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={previewImage}
              alt="صورة الأشعة"
              className="max-h-[85vh] w-auto max-w-full object-contain mx-auto rounded-lg"
            />

            <div className="text-center text-xs text-slate-300 py-1.5">
              معاينة صورة الأشعة المرفقة
            </div>

          </div>

        </div>
      )}

      {/* ======================================================= */}
      {/* PAYMENT CHECKOUT */}
      {/* ======================================================= */}

      {showPaymentCheckout &&
        pendingAppointmentPayload && (
          <PaymentCheckoutModal
            isOpen={
              showPaymentCheckout
            }

            onClose={() => {
              // Cancel checkout only.
              // Appointment is NOT created.
              setShowPaymentCheckout(
                false
              );
            }}

            onSuccess={
              handlePaymentSuccess
            }

            serviceType="APPOINTMENT"

            serviceReferenceId={
              checkoutRef
            }

            serviceName={
              selectedService?.nameAr ||
              pendingAppointmentPayload.serviceName ||
              'خدمة طبية عيادية'
            }

            amount={
              calculatedFee
            }

            multiCurrencyPricing={
              selectedService?.multiCurrencyPricing ||
              selectedDoctor?.multiCurrencyPricing
            }

            initialCurrency="YER"

            patientId={
              patientProfile?.id ||
              user?.id ||
              'pat-1'
            }

            patientName={
              patientProfile?.fullName ||
              user?.fullName ||
              'المريض'
            }

            patientPhone={
              patientProfile?.phone ||
              user?.phone ||
              ''
            }

            patientMrn={
              patientProfile?.mrn ||
              'MRN-2026-8801'
            }

            doctorId={
              selectedDoctorId
            }

            doctorName={
              selectedDoctor?.fullName
            }

            doctorSpecialty={
              selectedDoctor?.specialtyNameAr
            }
          />
        )}
    </>
  );
};