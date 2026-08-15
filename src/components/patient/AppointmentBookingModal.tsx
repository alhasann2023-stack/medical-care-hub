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
  ChevronRight
} from 'lucide-react';
import { Doctor, MedicalService, PreferredPeriod } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

  useEffect(() => {
    if (isOpen) {
      // Set default tomorrow date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPreferredDate(tomorrow.toISOString().split('T')[0]);
      setIsSubmitted(false);
      setError(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !reason.trim()) {
      setError('يرجى اختيار الطبيب وكتابة سبب الزيارة.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.createAppointment({
        patientId: patientProfile?.id || user?.id || 'pat-1',
        doctorId: selectedDoctorId,
        serviceId: selectedServiceId || undefined,
        preferredDate,
        preferredPeriod,
        reason,
        patientNotes
      });

      setIsSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال طلب الحجز.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
              <Calendar className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">حجز موعد كشف طبي جديد</h3>
              <p className="text-xs text-blue-100 font-medium">اختر الطبيب والفترة المفضلة وسيتواصل معك منسق المواعيد</p>
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
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="font-extrabold text-xl text-slate-900">تم إرسال طلب الحجز بنجاح!</h4>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              تم استلام طلبك لعيادة <strong>{selectedDoctor?.fullName}</strong>. سيتواصل معك فريق خدمة العملاء على رقمك (<strong>{patientProfile?.phone || user?.phone}</strong>) لتأكيد الساعة والعيادة المحددة.
            </p>
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-800 font-semibold border border-blue-200">
              يمكنك متابعة حالة الطلب في قائمة مواعيدي باللوحة الرئيسية.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-start text-xs sm:text-sm">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Select Doctor */}
            <div>
              <label className="block font-bold text-slate-800 mb-2">
                1. اختر الطبيب المعالج / التخصص <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                required
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialtyNameAr} ({d.consultationFee} ر.س)
                  </option>
                ))}
              </select>

              {selectedDoctor && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={selectedDoctor.avatar}
                      alt={selectedDoctor.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-300"
                    />
                    <div>
                      <strong className="text-slate-900 block">{selectedDoctor.fullName}</strong>
                      <span className="text-slate-500 text-[11px]">{selectedDoctor.roomNumber}</span>
                    </div>
                  </div>
                  <div className="text-end text-[11px] text-slate-500">
                    <span className="block text-emerald-700 font-bold">الأيام المتاحة:</span>
                    <span>{selectedDoctor.availableDays.join('، ')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Select Medical Service */}
            <div>
              <label className="block font-bold text-slate-800 mb-2">
                2. نوع الخدمة الطبية المطلوبة
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
                <label className="block font-bold text-slate-800 mb-2">
                  3. اليوم المفضل للزيارة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-2">
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
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
              <label className="block font-bold text-slate-800 mb-2">
                5. سبب الزيارة أو الأعراض التي تشعر بها <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: فحص دوري لضغط الدم، ألم مستمر في الصدر عند المشي، تجديد وصفة دواء..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                required
              />
            </div>

            {/* Step 5: Special Patient Notes */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                ملاحظات إضافية لفريق التنسيق (اختياري)
              </label>
              <input
                type="text"
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="مثال: أحتاج كرسي متحرك عند الاستقبال، أفضل التواصل عبر الواتساب أولاً..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
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
                    <span>جاري إرسال الطلب...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وإرسال طلب الحجز</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
