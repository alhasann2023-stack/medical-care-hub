import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { Doctor, MedicalService, PreferredPeriod, Payment } from '../../types/medical';
import { api, apiClient } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDoctorId?: string;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedDoctorId
}) => {
  const { user, patientProfile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(preselectedDoctorId || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [preferredDate, setPreferredDate] = useState<string>('');
  const [preferredPeriod, setPreferredPeriod] = useState<PreferredPeriod>('MORNING');
  const [reason, setReason] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Payment checkout triggers
  const [pendingAppointmentData, setPendingAppointmentData] = useState<{
    id: string;
    amount: number;
    serviceName: string;
  } | null>(null);
  const [showPaymentCheckout, setShowPaymentCheckout] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set default tomorrow date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPreferredDate(tomorrow.toISOString().split('T')[0]);
      setIsSubmitted(false);
      setError(null);
      setPendingAppointmentData(null);
      setShowPaymentCheckout(false);

      // Fetch doctors and services
      api.getDoctors(undefined, true).then(docs => {
        setDoctors(docs);
        if (!selectedDoctorId && docs.length > 0) {
          setSelectedDoctorId(preselectedDoctorId || docs[0].id);
        }
      });

      api.getServices().then(srvs => {
        setServices(srvs);
        if (srvs.length > 0) {
          setSelectedServiceId(srvs[0].id);
        }
      });
    }
  }, [isOpen, preselectedDoctorId]);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const selectedService = services.find(s => s.id === selectedServiceId);
  const calculatedFee = selectedDoctor?.consultationFee || selectedService?.price || 250;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !reason.trim()) {
      setError('يرجى اختيار الطبيب وكتابة سبب الزيارة.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apt = await api.createAppointment({
        patientId: patientProfile?.id || user?.id || 'pat-1',
        patientName: patientProfile?.fullName || user?.fullName || 'المريض',
        patientPhone: patientProfile?.phone || user?.phone || '',
        doctorId: selectedDoctorId,
        doctorName: selectedDoctor?.fullName,
        doctorSpecialty: selectedDoctor?.specialtyNameAr,
        clinicRoom: selectedDoctor?.roomNumber,
        serviceId: selectedServiceId || undefined,
        serviceName: selectedService?.nameAr || 'كشف طبي واستشارة عيادية',
        preferredDate,
        preferredPeriod,
        reason,
        patientNotes,
        fee: calculatedFee
      });

      setPendingAppointmentData({
        id: apt.id,
        amount: calculatedFee,
        serviceName: apt.serviceName || 'كشف طبي واستشارة'
      });

      // Directly open Payment Modal for immediate confirmation
      setShowPaymentCheckout(true);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال طلب الحجز.');
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
          
          {/* Modal Header */}
          <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
                <Calendar className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">حجز موعد وسداد إلكتروني فوري</h3>
                <p className="text-xs text-blue-100 font-medium">حجز مباشر ومؤكد عبر بوابات الدفع الرسمية المعتمدة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Confirmation Screen */}
          {isSubmitted ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">تم تأكيد حجز الموعد وسداده بنجاح!</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                تم اعتماد دفع رسوم الكشف لعيادة <strong>{selectedDoctor?.fullName}</strong> بنجاح. تم تسجيل الموعد في جدول العيادة وسيصلك تذكير آلي قبل الموعد.
              </p>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2">
                <Receipt className="w-4 h-4" />
                تم إرسال سند القبض الإلكتروني الضريبي ورسالة التذكير إلى هاتفك.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-start text-xs sm:text-sm">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Select Doctor */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                  1. اختر الطبيب المعالج / التخصص <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} — {d.specialtyNameAr} ({d.consultationFee} ر.س)
                    </option>
                  ))}
                </select>

                {selectedDoctor && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={selectedDoctor.avatar}
                        alt={selectedDoctor.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                      />
                      <div>
                        <strong className="text-slate-900 dark:text-slate-100 block">{selectedDoctor.fullName}</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">{selectedDoctor.roomNumber}</span>
                      </div>
                    </div>
                    <div className="text-end text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="block text-emerald-600 dark:text-emerald-400 font-bold">رسوم الكشف: {selectedDoctor.consultationFee} ر.س</span>
                      <span>الأيام: {selectedDoctor.availableDays.join('، ')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Select Medical Service */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                  2. نوع الخدمة الطبية المطلوبة
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nameAr} — {s.price} ر.س ({s.durationMinutes} دقيقة)
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Preferred Date & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                    3. اليوم المفضل للزيارة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                    4. الفترة المفضلة <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'MORNING', label: 'صباحاً', sub: '09:00 - 12:00' },
                      { id: 'AFTERNOON', label: 'ظهراً', sub: '12:00 - 04:00' },
                      { id: 'EVENING', label: 'مساءً', sub: '04:00 - 09:00' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreferredPeriod(p.id as PreferredPeriod)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          preferredPeriod === p.id
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-xs">{p.label}</span>
                        <span className="block text-[9px] opacity-80">{p.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 4: Reason for Visit */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                  5. سبب الزيارة أو الأعراض التي تشعر بها <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: فحص دوري لضغط الدم، ألم مستمر في الصدر عند المشي، تجديد وصفة دواء..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                  required
                />
              </div>

              {/* Fee Breakdown Summary Pill */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">رسوم الحجز والكشف الطبي</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">سداد إلكتروني مشفّر وآمن (مدى، فيزا، Apple Pay)</span>
                  </div>
                </div>
                <div className="text-left font-black text-emerald-600 dark:text-emerald-400 text-base">
                  {calculatedFee} <span className="text-xs font-bold">ر.س</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
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
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ إنشاء طلب الحجز...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>متابعة السداد وتأكيد الحجز ({calculatedFee} ر.س)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Payment Checkout Modal */}
      {showPaymentCheckout && pendingAppointmentData && (
        <PaymentCheckoutModal
          isOpen={showPaymentCheckout}
          onClose={() => {
            setShowPaymentCheckout(false);
            onSuccess();
            onClose();
          }}
          onSuccess={handlePaymentSuccess}
          serviceType="APPOINTMENT"
          serviceReferenceId={pendingAppointmentData.id}
          serviceName={pendingAppointmentData.serviceName}
          amount={pendingAppointmentData.amount}
          multiCurrencyPricing={selectedDoctor?.multiCurrencyPricing || selectedService?.multiCurrencyPricing}
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
