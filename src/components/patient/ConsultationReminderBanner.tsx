import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Sparkles,
  Stethoscope,
  Calendar,
  MessageSquare,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { ReminderItem, localReminderService } from '../../services/localReminderService';

interface ConsultationReminderBannerProps {
  reminders: ReminderItem[];
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  onOpenConsultationOrAppointment: (reminder: ReminderItem) => void;
  onTriggerTestReminder: () => void;
}

export const ConsultationReminderBanner: React.FC<ConsultationReminderBannerProps> = ({
  reminders,
  onDismiss,
  onSnooze,
  onOpenConsultationOrAppointment,
  onTriggerTestReminder
}) => {
  const [activeReminder, setActiveReminder] = useState<ReminderItem | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30 * 60);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [showChecklist, setShowChecklist] = useState<boolean>(false);

  useEffect(() => {
    if (reminders && reminders.length > 0) {
      setActiveReminder(reminders[0]);
      setSecondsRemaining(Math.max(1, (reminders[0].timeRemainingMinutes || 30) * 60));
      
      // Play audio chime once if sound enabled
      if (!soundMuted) {
        localReminderService.playReminderChime();
      }
    } else {
      setActiveReminder(null);
    }
  }, [reminders]);

  // Live countdown ticker
  useEffect(() => {
    if (!activeReminder) return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeReminder]);

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeReminder) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 sm:p-5 text-white shadow-xl border-2 border-amber-300 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
      {/* Background glow effects */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none"></div>
      <div className="absolute left-10 -bottom-10 w-40 h-40 bg-yellow-300/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left / Main info */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-white text-amber-600 flex items-center justify-center shadow-lg font-black animate-bounce">
              <Bell className="w-6 h-6" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border border-white"></span>
            </span>
          </div>

          <div className="text-start">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/25 text-white border border-white/30 tracking-wide">
                ⏰ تذكير الموعد (قبل 30 دقيقة)
              </span>
              {activeReminder.isTest && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-100">
                  وضع التجربة الفورية
                </span>
              )}
            </div>

            <h3 className="font-black text-base sm:text-lg leading-tight">
              اقترب موعدك مع {activeReminder.doctorName}
            </h3>
            <p className="text-xs text-amber-100 font-medium mt-0.5">
              التخصص: <strong>{activeReminder.doctorSpecialty}</strong> {activeReminder.clinicRoom && `• العيادة: ${activeReminder.clinicRoom}`}
            </p>
          </div>
        </div>

        {/* Live Countdown & Actions */}
        <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end">
          {/* Countdown Clock Box */}
          <div className="px-3.5 py-2 rounded-xl bg-black/25 backdrop-blur-xs border border-white/20 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-200 animate-pulse" />
            <div className="text-start">
              <span className="text-[10px] text-amber-200 block font-semibold leading-none">متبقي على البدء</span>
              <span className="text-sm font-black font-mono tracking-wider text-white">
                {formatCountdown(secondsRemaining)} د
              </span>
            </div>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => {
              setSoundMuted(!soundMuted);
              if (soundMuted) localReminderService.playReminderChime();
            }}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            title={soundMuted ? 'تفعيل رنين التنبيه' : 'كتم رنين التنبيه'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-amber-200" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>

          {/* Action Buttons */}
          <button
            onClick={() => onOpenConsultationOrAppointment(activeReminder)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>دخول وتجهيز الموعد</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>

          <button
            onClick={() => onSnooze(activeReminder.id)}
            className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors cursor-pointer"
            title="تأجيل التنبيه 5 دقائق"
          >
            تأجيل 5 د
          </button>

          <button
            onClick={() => onDismiss(activeReminder.id)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Preparation Tips Accordion */}
      <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="flex items-center gap-1.5 font-bold text-amber-100 hover:text-white cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
          <span>{showChecklist ? 'إخفاء نصائح الاستعداد للاستشارة' : 'عرض نصائح الاستعداد السريع للاستشارة (30 دقيقة)'}</span>
        </button>

        <span className="text-[11px] text-amber-200/90 font-medium">
          يرجى التواجد في مكان هادئ وتجهيز الملفات الطبية
        </span>
      </div>

      {showChecklist && (
        <div className="mt-2.5 p-3 rounded-xl bg-black/20 text-xs space-y-1.5 text-start animate-in fade-in duration-200 border border-white/10">
          <div className="flex items-center gap-2 text-white font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>تأكد من كتابة الأعراض والأسئلة التي تود طرحها على الطبيب بوضوح.</span>
          </div>
          <div className="flex items-center gap-2 text-white font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>تجهيز آخر الفحوصات أو التحاليل المخبرية لمشاركتها فور بدء الاستشارة.</span>
          </div>
          <div className="flex items-center gap-2 text-white font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>التحقق من اتصال الإنترنت واستقرار الصوت والميكروفون.</span>
          </div>
        </div>
      )}
    </div>
  );
};
