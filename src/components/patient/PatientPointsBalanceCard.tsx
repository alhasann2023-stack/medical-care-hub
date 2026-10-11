import React, { useState, useEffect } from 'react';
import {
  Coins,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Gift,
  Clock,
  History,
  PlusCircle,
  CheckCircle2,
  X,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { PointsWallet, PointsTransaction } from '../../types/medical';
import { api } from '../../services/api';
import { playSuccessSound } from '../../utils/sound';

interface PatientPointsBalanceCardProps {
  patientId: string;
  onSendGift?: () => void;
  onOpenPackages?: () => void;
  className?: string;
}

export const PatientPointsBalanceCard: React.FC<PatientPointsBalanceCardProps> = ({
  patientId,
  onSendGift,
  onOpenPackages,
  className = ''
}) => {
  const [wallet, setWallet] = useState<PointsWallet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState<boolean>(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(50);
  const [isTopUpProcessing, setIsTopUpProcessing] = useState<boolean>(false);
  const [topUpSuccessMsg, setTopUpSuccessMsg] = useState<string>('');

  const loadWallet = async () => {
    try {
      const data = await api.getPointsWallet(patientId);
      if (data) {
        setWallet(data);
      }
    } catch (err) {
      console.warn('Failed to fetch patient points wallet:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadWallet();

    // 1. Subscribe to real-time wallet changes from Firestore & local
    const unsub = api.subscribePointsWallet(patientId, (updatedWallet) => {
      if (updatedWallet) {
        setWallet(updatedWallet);
        setIsLoading(false);
      }
    });

    // 2. Listen to custom window events triggered when consultations or appointments are created
    const handleEvents = (e?: Event) => {
      const customEvent = e as CustomEvent<PointsWallet>;
      if (customEvent && customEvent.detail && customEvent.detail.patientId === patientId) {
        setWallet(customEvent.detail);
      } else {
        loadWallet();
      }
    };

    window.addEventListener('mch_points_updated', handleEvents);
    window.addEventListener('mch_payments_updated', handleEvents);
    window.addEventListener('mch_consultations_updated', handleEvents);
    window.addEventListener('mch_appointments_updated', handleEvents);

    return () => {
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('mch_points_updated', handleEvents);
      window.removeEventListener('mch_payments_updated', handleEvents);
      window.removeEventListener('mch_consultations_updated', handleEvents);
      window.removeEventListener('mch_appointments_updated', handleEvents);
    };
  }, [patientId]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadWallet();
  };

  const handleQuickTopUp = async (pts: number) => {
    setIsTopUpProcessing(true);
    setTopUpSuccessMsg('');
    try {
      const updated = await api.addPoints(
        patientId,
        pts,
        `شحن رصيد نقاط فوري (+${pts} نقطة)`
      );
      if (updated) {
        setWallet(updated);
      }
      playSuccessSound();
      setTopUpSuccessMsg(`تم شحن ${pts} نقطة بنجاح إلى رصيدك!`);
      setTimeout(() => {
        setIsTopUpModalOpen(false);
        setTopUpSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Failed top-up:', err);
    } finally {
      setIsTopUpProcessing(false);
    }
  };

  const points = wallet?.pointsBalance ?? 0;
  const tier = wallet?.tier || 'SILVER';
  const tierLabel = tier === 'VIP' ? 'بلاتيني VIP' : tier === 'GOLD' ? 'ذهبي' : 'فضي';
  const tierBadgeColor = tier === 'VIP' 
    ? 'bg-purple-500/20 text-purple-200 border-purple-400/30' 
    : tier === 'GOLD' 
    ? 'bg-amber-400/20 text-amber-200 border-amber-300/30' 
    : 'bg-white/20 text-slate-100 border-white/20';

  return (
    <>
      <div 
        className={`bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-teal-500/30 relative overflow-hidden text-start transition-all ${className}`}
        dir="rtl"
      >
        {/* Glow ambient effects */}
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 font-black">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg">رصيد النقاط الحالي</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border backdrop-blur-md ${tierBadgeColor}`}>
                  المستوى: {tierLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  محدث تلقائياً
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                تُخصم الرسوم تلقائياً من هذا الرصيد فور إرسال الاستشارات أو حجز المواعيد
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="self-end sm:self-auto p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
            title="تحديث الرصيد الآن"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Balance Display & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-5 relative z-10 items-center">
          {/* Main Large Points Number */}
          <div className="md:col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-teal-200/90 font-bold mb-1">الرصيد المتاح للخدمات</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400">
                {isLoading ? '...' : points.toLocaleString('ar-YE')}
              </span>
              <span className="text-sm font-extrabold text-amber-300">نقطة</span>
            </div>
            <span className="text-[11px] text-emerald-300 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              جاهز للسداد المباشر فوراً
            </span>
          </div>

          {/* Points Breakdown Details */}
          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-xs text-teal-200/90 font-bold mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
                <span>إجمالي النقاط المكتسبة</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white">
                {(wallet?.totalEarned ?? 0).toLocaleString('ar-YE')}
                <span className="text-xs font-normal text-teal-200/80 mr-1.5">نقطة</span>
              </div>
              <span className="text-[10px] text-slate-400">من المكافآت والشحن والباقات</span>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-xs text-amber-200/90 font-bold mb-1">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <span>المستخدم في الاستشارات والمواعيد</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white">
                {(wallet?.totalSpent ?? 0).toLocaleString('ar-YE')}
                <span className="text-xs font-normal text-amber-200/80 mr-1.5">نقطة</span>
              </div>
              <span className="text-[10px] text-slate-400">سداد فوري معتمد</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 relative z-10">
          <div className="flex flex-wrap items-center gap-2">


            {onOpenPackages && (
              <button
                type="button"
                onClick={onOpenPackages}
                className="py-2.5 px-4 rounded-xl bg-teal-600/80 hover:bg-teal-600 text-white font-bold text-xs border border-teal-400/30 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>باقات الرعاية (خصم + نقاط هدية)</span>
              </button>
            )}

            {onSendGift && (
              <button
                type="button"
                onClick={onSendGift}
                className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-rose-200 font-bold text-xs border border-white/15 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Gift className="w-4 h-4 text-rose-400" />
                <span>إهداء طبيب 🎁</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <History className="w-4 h-4 text-teal-300" />
            <span>سجل حركات النقاط</span>
          </button>
        </div>
      </div>

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-start animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="p-5 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl">
                  <Coins className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">سجل حركات وعمليات النقاط</h3>
                  <p className="text-xs text-teal-200">الرصيد الحالي: {points} نقطة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-2.5 text-xs">
              {wallet && wallet.history && wallet.history.length > 0 ? (
                wallet.history.map((tx: PointsTransaction) => {
                  const isDeduction = tx.amount < 0 || tx.type === 'SPENT';
                  return (
                    <div 
                      key={tx.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${isDeduction ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                          {isDeduction ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{tx.descriptionAr}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(tx.createdAt).toLocaleString('ar-YE')}
                          </span>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        <span className={`text-sm font-black font-mono ${isDeduction ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isDeduction ? `${tx.amount}` : `+${tx.amount}`}
                        </span>
                        <span className="text-[10px] text-slate-400 block">نقطة</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Coins className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>لا توجد حركات مسجلة حالياً في محفظة النقاط.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Top-Up Modal */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-start animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="p-5 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Coins className="w-5 h-5 text-yellow-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">شحن رصيد نقاط فوري</h3>
                  <p className="text-xs text-amber-100">سداد أسهل للاستشارات والمواعيد بدون بطاقات</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {topUpSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{topUpSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">اختر باقة النقاط المناسبة:</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { pts: 50, label: '50 نقطة', desc: 'استشارة واحدة' },
                    { pts: 100, label: '100 نقطة', desc: 'استشارتان' },
                    { pts: 200, label: '200 نقطة', desc: 'باقة مكثفة' }
                  ].map(item => (
                    <button
                      key={item.pts}
                      type="button"
                      onClick={() => setTopUpAmount(item.pts)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        topUpAmount === item.pts
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-black shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="block font-mono text-sm">{item.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-bold">الرصيد بعد الشحن:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                  {(points + topUpAmount).toLocaleString('ar-YE')} نقطة
                </span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isTopUpProcessing}
                  onClick={() => handleQuickTopUp(topUpAmount)}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isTopUpProcessing ? 'جارٍ الشحن...' : `تأكيد شحن +${topUpAmount} نقطة`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
