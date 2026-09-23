import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  Landmark, 
  Wallet, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../../services/api';
import { DEFAULT_MANUAL_ACCOUNTS } from '../../utils/paymentUtils';
import type { ManualPaymentAccounts, PaymentSettings } from '../../types/medical';

interface ManualPaymentInstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'APPOINTMENT' | 'CONSULTATION';
  patientName?: string;
  doctorName?: string;
  amount?: number;
  currency?: string;
  referenceNumber?: string;
  targetDate?: string;
  targetTime?: string;
}

export const ManualPaymentInstructionModal: React.FC<ManualPaymentInstructionModalProps> = ({
  isOpen,
  onClose,
  type,
  patientName = 'المريض',
  doctorName = 'طبيب العيادة',
  amount = 0,
  currency = 'YER',
  referenceNumber,
  targetDate,
  targetTime
}) => {
  const [accounts, setAccounts] = useState<ManualPaymentAccounts>(DEFAULT_MANUAL_ACCOUNTS);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    api.getPaymentSettings()
      .then((settings: PaymentSettings) => {
        if (isMounted && settings?.manualAccounts) {
          setAccounts(prev => ({
            ...prev,
            ...settings.manualAccounts
          }));
        }
      })
      .catch((err) => {
        console.warn('Could not fetch custom payment settings, using defaults:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldKey ? null : curr));
    }, 2000);
  };

  const cleanWaNumber = (accounts.adminWhatsapp || '967770000000').replace(/[^0-9]/g, '');

  const typeLabel = type === 'APPOINTMENT' ? 'حجز موعد عيادي' : 'طلب استشارة طبية';
  const orderRef = referenceNumber || `${type === 'APPOINTMENT' ? 'APT' : 'CNS'}-${Date.now().toString().slice(-6)}`;

  const messageText = `السلام عليكم ورحمة الله وبركاته،
تحية طيبة، لقد قمت بتقديم طلب (${typeLabel}) وأرغب في تأكيده:
- اسم المريض: ${patientName}
- الطبيب المعالج: د. ${doctorName}
${targetDate ? `- موعد الكشف: ${targetDate} ${targetTime ? `(${targetTime})` : ''}\n` : ''}- رقم الطلب: ${orderRef}
- المبلغ المطلوب: ${amount.toLocaleString('ar-YE')} ${currency === 'YER' ? 'ريال يمني' : currency}
مرفق لكم إشعار وسند التحويل المالي لتأكيد الحجز/الاستشارة في النظام. شكراً لكم.`;

  const waUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(messageText)}`;

  const accountList = [
    {
      id: 'kuraimi',
      title: 'بنك الكريمي (حساب الكريمي)',
      accountNumber: accounts.kuraimiAccount || '3055489211',
      icon: Landmark,
      badge: 'حساب بنكي / حاسب / الكريمي جوال',
      color: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-950'
    },
    {
      id: 'jawwali',
      title: 'محفظة جوالي (Jawwali)',
      accountNumber: accounts.jawwaliAccount || '778901234',
      icon: Smartphone,
      badge: 'محفظة إلكترونية فورية',
      color: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-950'
    },
    {
      id: 'oneCash',
      title: 'محفظة وان كاش (OneCash)',
      accountNumber: accounts.oneCashAccount || '733456789',
      icon: Wallet,
      badge: 'محفظة إلكترونية سريعة',
      color: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-950'
    },
    {
      id: 'jeeb',
      title: 'محفظة جيب (Jeeb)',
      accountNumber: accounts.jeebAccount || '711234567',
      icon: Smartphone,
      badge: 'محفظة إلكترونية',
      color: 'border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-950'
    },
    {
      id: 'floosak',
      title: 'محفظة فلوسك (Floosak)',
      accountNumber: accounts.floosakAccount || '770123456',
      icon: Wallet,
      badge: 'محفظة بنك اليمن والكويت',
      color: 'border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-teal-950'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-start" dir="rtl">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 border border-white/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                تم تسجيل طلب {type === 'APPOINTMENT' ? 'الموعد' : 'الاستشارة'} بنجاح!
              </h3>
              <p className="text-xs text-emerald-200">
                يرجى إرسال قيمة الطلب لإتمامه وتأكيده
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Main Requested Notice Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 space-y-1 shadow-xs">
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>انسخ رقم الحساب لإرسال قيمة {type === 'APPOINTMENT' ? 'الحجز' : 'الاستشارة'} لكي يتم تأكيده</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 leading-relaxed ps-6">
              انسخ رقم الحساب المناسب لك أدناه، وحوّل المبلغ عبر تطبيق الدفع الخاص بك، ثم اضغط زر الواتساب لإرسال إشعار وسند التحويل مباشرة لإدارة العيادة.
            </p>
          </div>

          {/* Order Details Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">نوع الطلب</span>
              <strong className="text-slate-900 dark:text-slate-100 font-bold">{typeLabel}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">الطبيب المعالج</span>
              <strong className="text-slate-900 dark:text-slate-100 font-bold">د. {doctorName}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">المبلغ المطلوب سداده</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-black font-mono text-sm">
                {amount > 0 ? `${amount.toLocaleString('ar-YE')} ${currency === 'YER' ? 'ر.ي' : currency}` : 'مجاني / معفي'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">رقم الطلب</span>
              <strong className="text-slate-700 dark:text-slate-300 font-mono text-xs">{orderRef}</strong>
            </div>
          </div>

          {/* Beneficiary Name */}
          {accounts.beneficiaryName && (
            <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 px-1 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>اسم المستفيد المعتمد:</span>
              <strong className="text-slate-900 dark:text-slate-100">{accounts.beneficiaryName}</strong>
            </div>
          )}

          {/* Accounts List */}
          <div className="space-y-2.5 pt-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              أرقام الحسابات والمحافظ المعتمدة (اضغط نسخ):
            </span>

            {accountList.map((acc) => {
              const IconComp = acc.icon;
              const isCopied = copiedField === acc.id;

              return (
                <div
                  key={acc.id}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${acc.color}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <IconComp className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                          {acc.title}
                        </h4>
                      </div>
                      <div className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-wider">
                        {acc.accountNumber}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(acc.accountNumber, acc.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرقم</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action: Send Receipt to Admin WhatsApp */}
          <div className="pt-3 space-y-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>إرسال إشعار وسند التحويل عبر واتساب الإدارة</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center"
            >
              تم النسخ وإرسال السند • متابعة وإغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
