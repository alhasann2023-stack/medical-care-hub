import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  User, 
  FileText, 
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { FollowUpAppointment } from '../../types/medical';
import { api } from '../../services/api';

interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (followUp: FollowUpAppointment) => void;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  initialReason?: string;
}

export const ScheduleFollowUpModal: React.FC<ScheduleFollowUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientName,
  doctorId,
  doctorName,
  doctorSpecialty = 'العيادات التخصصية',
  initialReason = 'متابعة استجابة المريض للخطة العلاجية ونتائج الفحوصات'
}) => {
  // Default date to 7 days from now
  const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [scheduledDate, setScheduledDate] = useState<string>(defaultDate);
  const [scheduledTime, setScheduledTime] = useState<string>('04:00 م');
  const [reason, setReason] = useState<string>(initialReason);
  const [isFreeFollowUp, setIsFreeFollowUp] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      setErrorMsg('يرجى تحديد تاريخ موعد المراجعة.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const followUp = await api.createFollowUp({
        patientId,
        patientName,
        doctorId,
        doctorName,
        doctorSpecialty,
        followUpDate: scheduledDate,
        followUpTime: scheduledTime || '10:00',
        scheduledDate,
        scheduledTime,
        reason,
        isFreeFollowUp,
        notes: notes.trim() || undefined,
        status: 'SCHEDULED'
      });

      onSuccess(followUp);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'فشل جدولة موعد المراجعة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-start">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">جدولة موعد مراجعة ومتابعة (Follow-up)</h3>
              <p className="text-xs text-indigo-200">تحديد موعد متابعة مجدول في ملف المريض</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div>
              <span className="text-indigo-900 dark:text-indigo-300 font-bold block text-xs">المريض:</span>
              <strong className="text-slate-900 dark:text-slate-100 text-sm">{patientName}</strong>
            </div>
            <div className="text-end">
              <span className="text-indigo-900 dark:text-indigo-300 font-bold block text-xs">الطبيب المعالج:</span>
              <strong className="text-slate-900 dark:text-slate-100">{doctorName}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ المراجعة المقترح *
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                الوقت المفضل
              </label>
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none"
              >
                <option value="09:00 ص">09:00 ص (الفترة الصباحية)</option>
                <option value="10:30 ص">10:30 ص (الفترة الصباحية)</option>
                <option value="01:00 م">01:00 م (الفترة الصباحية)</option>
                <option value="04:00 م">04:00 م (الفترة المسائية)</option>
                <option value="06:00 م">06:00 م (الفترة المسائية)</option>
                <option value="08:00 م">08:00 م (الفترة المسائية)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              السبب الإكلينيكي للمراجعة
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: إعادة فحص الضغط، تقييم نتائج المختبر..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div>
              <strong className="block text-emerald-950 dark:text-emerald-200 font-bold">مراجعة مجانية مشمولة (Free Follow-up)</strong>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300">إعفاء المريض من رسوم الكشف للمراجعة خلال 14 يوماً</span>
            </div>
            <input
              type="checkbox"
              checked={isFreeFollowUp}
              onChange={(e) => setIsFreeFollowUp(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات وتوجيهات إضافية للمريض (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="مثال: يرجى الصيام 8 ساعات قبل الموعد لإجراء فحص السكر التراكمي..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isSubmitting ? 'جارِ الجدولة...' : 'تأكيد جدولة موعد المراجعة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
