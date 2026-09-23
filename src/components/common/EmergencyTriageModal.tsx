import type { FC } from 'react';
import { PhoneCall, AlertOctagon, X, Bot } from 'lucide-react';
import type { Language } from '../../types';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface EmergencyTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchAITriage: () => void;
  language: Language;
}

export const EmergencyTriageModal: FC<EmergencyTriageModalProps> = ({
  isOpen,
  onClose,
  onLaunchAITriage,
  language,
}) => {
  if (!isOpen) return null;
  const isAr = language === 'ar';

  const redFlags = [
    isAr ? 'ألم أو ضغط شديد في الصدر يمتد للذراع، الرقبة أو الفك' : 'Severe chest pressure radiating to arm, neck or jaw',
    isAr ? 'صعوبة شديدة ومفاجئة في التنفس أو زرقة في الشفتين' : 'Sudden shortness of breath or bluish lips',
    isAr ? 'فقدان مفاجئ للوعي أو ارتباك شديد وتلعثم في الكلام' : 'Sudden loss of consciousness or speech difficulty',
    isAr ? 'نزيف حاد مستمر لا يتوقف بالضغط المباشر' : 'Heavy uncontrolled bleeding',
    isAr ? 'تشنجات نوبية مستمرة أو هبوط حاد في العلامات الحيوية' : 'Seizures or critical drop in vitals',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-rose-500 relative space-y-5">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Heading */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-rose-900">
              {isAr ? 'فرز الحالات الطارئة والإنقاذ' : 'Emergency Triage & Red Flags'}
            </h3>
            <p className="text-xs text-rose-700 font-semibold">
              {isAr ? 'تقييم فوري للعلامات الحيوية المنذرة بالخطر' : 'Immediate life-threatening assessment'}
            </p>
          </div>
        </div>

        {/* Emergency Call Numbers */}
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <PhoneCall className="w-5 h-5 text-rose-600 animate-bounce" />
            <div>
              <div className="text-xs font-bold text-rose-900">
                {isAr ? 'رقم طوارئ الإسعاف المباشر:' : 'Emergency Medical Hotline:'}
              </div>
              <div className="text-lg font-black text-rose-700 font-mono">
                997 / 911
              </div>
            </div>
          </div>
          <a
            href="tel:997"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition"
          >
            {isAr ? 'اتصال فوري' : 'Call Now'}
          </a>
        </div>

        {/* Red Flags Checklist */}
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">
            {isAr ? 'إذا كنت تعاني من أي من هذه الأعراض، اطلب الإسعاف فوراً:' : 'Seek immediate emergency care if you have:'}
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {redFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* AI Triage Bot Handoff */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              onClose();
              onLaunchAITriage();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 transition cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>{isAr ? 'تقييم الأعراض مع طبيب الفرز الذكي' : 'Check Symptoms with AI Triage Bot'}</span>
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
