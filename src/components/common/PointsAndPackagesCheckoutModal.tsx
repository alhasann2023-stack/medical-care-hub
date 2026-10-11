import { useState, useEffect } from 'react';
import {
  Sparkles,
  Coins,
  Package,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Gift,
  Zap,
  Clock,
  Check
} from 'lucide-react';
import {
  Payment,
  CurrencyCode,
  PointsWallet,
  ActivePatientPackage,
  MedicalPackage
} from '../../types/medical';
import { api } from '../../services/api';
import { playSuccessSound } from '../../utils/sound';

interface PointsAndPackagesCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: Payment, usedMethod: 'POINTS' | 'PACKAGE' | 'DIRECT') => void;
  serviceType: 'CONSULTATION' | 'APPOINTMENT';
  serviceReferenceId: string;
  serviceName: string;
  amount?: number; // e.g. 180 YER or similar
  patientId: string;
  patientName: string;
  patientPhone?: string;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
}

export const PointsAndPackagesCheckoutModal = ({
  isOpen,
  onClose,
  onSuccess,
  serviceType,
  serviceReferenceId,
  serviceName,
  amount = 180,
  patientId,
  patientName,
  patientPhone,
  doctorId,
  doctorName,
  doctorSpecialty
}: PointsAndPackagesCheckoutModalProps) => {
  const [activeTab, setActiveTab] = useState<'POINTS' | 'PACKAGE' | 'DIRECT'>('POINTS');
  const [wallet, setWallet] = useState<PointsWallet | null>(null);
  const [activePackage, setActivePackage] = useState<ActivePatientPackage | null>(null);
  const [packages, setPackages] = useState<MedicalPackage[]>([]);
  const [selectedPackageToBuy, setSelectedPackageToBuy] = useState<MedicalPackage | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Required points calculation
  // Uses the exact consultation/checkup fee in points passed from doctor profile as entered by admin!
  const pointsCost = amount !== undefined && amount > 0 
    ? amount 
    : (serviceType === 'CONSULTATION' ? 40 : 50);

  useEffect(() => {
    if (!isOpen) return;

    // Load wallet
    api.getPointsWallet(patientId).then(setWallet).catch(() => {});
    const unsubWallet = api.subscribePointsWallet(patientId, setWallet);

    // Load active package
    api.getActivePackage(patientId).then(setActivePackage).catch(() => {});
    const unsubPkg = api.subscribeActivePackage(patientId, setActivePackage);

    // Load packages catalog
    api.getMedicalPackages().then(pkgs => {
      setPackages(pkgs);
      if (pkgs.length > 0) setSelectedPackageToBuy(pkgs[1] || pkgs[0]);
    }).catch(() => {});

    return () => {
      unsubWallet();
      unsubPkg();
    };
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const currentPoints = wallet?.pointsBalance ?? 0;
  const hasEnoughPoints = currentPoints >= pointsCost;

  const hasRemainingPackageQuota = activePackage && (
    serviceType === 'CONSULTATION'
      ? activePackage.remainingConsultations > 0
      : activePackage.remainingAppointments > 0
  );

  // 1. Handle Payment with Points
  const handlePayWithPoints = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const deductResult = await api.deductPoints(
        patientId,
        pointsCost,
        `سداد رسوم ${serviceType === 'CONSULTATION' ? 'استشارة طبية عن بعد' : 'حجز موعد عيادي'} (${serviceName})`,
        serviceReferenceId,
        'SPENT'
      );

      if (!deductResult.success) {
        setError(deductResult.error || 'تعذر الخصم من النقاط.');
        setIsLoading(false);
        return;
      }

      // Record successful payment
      const mockPayment: Payment = {
        id: `pay-pts-${Date.now()}`,
        patientId,
        patientName,
        patientPhone,
        serviceType,
        serviceReferenceId,
        serviceName,
        amount: pointsCost,
        currency: 'PTS',
        paymentMethod: 'POINTS',
        paymentStatus: 'PAID',
        status: 'PAID',
        transactionReference: `PTS-${Date.now().toString().slice(-6)}`,
        notes: `تم السداد بالنقاط (${pointsCost} نقطة)`,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString()
      };

      playSuccessSound();
      setIsSuccess(true);
      setSuccessMessage(`تم سداد ${pointsCost} نقطة بنجاح وتأكيد الطلب!`);

      setTimeout(() => {
        onSuccess(mockPayment, 'POINTS');
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'فشلت عملية السداد بالنقاط.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Payment with Active Package Quota
  const handlePayWithPackage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const quotaResult = await api.consumePackageQuota(patientId, serviceType);

      if (!quotaResult.success) {
        setError(quotaResult.error || 'تعذر الخصم من الباقة النشطة.');
        setIsLoading(false);
        return;
      }

      const mockPayment: Payment = {
        id: `pay-pkg-${Date.now()}`,
        patientId,
        patientName,
        patientPhone,
        serviceType,
        serviceReferenceId,
        serviceName,
        amount: 0,
        currency: 'YER',
        paymentMethod: 'PACKAGE',
        paymentStatus: 'PAID',
        status: 'PAID',
        transactionReference: `PKG-${Date.now().toString().slice(-6)}`,
        notes: `تم الخصم من ${activePackage?.packageNameAr} (المتبقي: ${quotaResult.remaining})`,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString()
      };

      playSuccessSound();
      setIsSuccess(true);
      setSuccessMessage(`تم خصم الخدمة من باقتك (${activePackage?.packageNameAr}) بنجاح! متبقي: ${quotaResult.remaining}`);

      setTimeout(() => {
        onSuccess(mockPayment, 'PACKAGE');
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'فشلت عملية الخصم من الباقة.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Purchase a Package and Pay Instantly
  const handleBuyPackageAndPay = async () => {
    if (!selectedPackageToBuy) return;
    setIsLoading(true);
    setError(null);

    try {
      // Purchase package
      const purchaseRes = await api.purchasePackage(
        patientId,
        selectedPackageToBuy.id,
        selectedPackageToBuy.nameAr
      );

      // Consume 1 quota for this service
      await api.consumePackageQuota(patientId, serviceType);

      const mockPayment: Payment = {
        id: `pay-pkg-new-${Date.now()}`,
        patientId,
        patientName,
        patientPhone,
        serviceType,
        serviceReferenceId,
        serviceName,
        amount: selectedPackageToBuy.price,
        currency: selectedPackageToBuy.currency,
        paymentMethod: 'PACKAGE',
        paymentStatus: 'PAID',
        status: 'PAID',
        transactionReference: `PKG-BUY-${Date.now().toString().slice(-6)}`,
        notes: `اشتراك جديد في ${selectedPackageToBuy.nameAr} وسداد الطلب الحالي`,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString()
      };

      playSuccessSound();
      setIsSuccess(true);
      setSuccessMessage(`تم تفعيل ${selectedPackageToBuy.nameAr} وسداد الخدمة فورياً مع إضافة ${selectedPackageToBuy.pointsBonus} نقطة هدية!`);

      setTimeout(() => {
        onSuccess(mockPayment, 'PACKAGE');
      }, 1400);
    } catch (err: any) {
      setError(err?.message || 'فشل شراء الباقة وتفعيل الخدمة.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Quick Top-up Points
  const handleQuickTopUp = async (pts: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.addPoints(patientId, pts, `شحن رصيد نقاط فوري (+${pts} نقطة)`);
      playSuccessSound();
      setIsLoading(false);
    } catch (e: any) {
      setError('تعذر شحن النقاط.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">سداد الرسوم عبر النقاط والباقات</h3>
              <p className="text-xs text-teal-100 font-medium">سداد فوري ومباشر دون الحاجة لبطاقات أو انتظار</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Service Summary Card */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 font-medium">الخدمة المطلوبة: </span>
              <span className="font-bold text-slate-800">{serviceName}</span>
              {doctorName && (
                <div className="text-xs text-slate-500 mt-0.5">
                  مع: <span className="font-semibold text-slate-700">{doctorName}</span> ({doctorSpecialty || 'استشاري'})
                </div>
              )}
            </div>
            <div className="text-left shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-800 rounded-full font-bold text-xs">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                تكلفة الخدمة: {pointsCost} نقطة
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('POINTS')}
            className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'POINTS'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>رصيد النقاط ({currentPoints})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PACKAGE')}
            className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PACKAGE'
                ? 'border-teal-600 text-teal-800 bg-teal-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-teal-600" />
            <span>باقات الرعاية {hasRemainingPackageQuota && '⭐ نشطة'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-sm flex items-center gap-2.5 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* TAB 1: POINTS PAYMENT */}
          {activeTab === 'POINTS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Coins className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs text-amber-900 font-bold">محفظة نقاط المريض</div>
                      <div className="text-[11px] text-amber-700">المستوى: {wallet?.tier || 'فضي'}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-amber-900">{currentPoints}</span>
                    <span className="text-xs text-amber-700 mr-1 font-bold">نقطة</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-amber-200/60 text-xs">
                  <span className="text-slate-600">المطلوب لسداد هذه الخدمة:</span>
                  <span className="font-extrabold text-slate-900">{pointsCost} نقطة</span>
                </div>
              </div>

              {hasEnoughPoints ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isLoading || isSuccess}
                    onClick={handlePayWithPoints}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>سداد فوري وتأكيد الطلب ({pointsCost} نقطة)</span>
                  </button>
                  <p className="text-center text-[11px] text-slate-500">
                    سيتم خصم {pointsCost} نقطة من رصيدك ويبقى لك {currentPoints - pointsCost} نقطة
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-950 space-y-2">
                    <div className="flex items-center gap-2 font-black text-rose-800 text-sm">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>تنبيه: رصيد نقاطك غير كافٍ لإتمام {serviceType === 'CONSULTATION' ? 'إرسال هذه الاستشارة' : 'حجز هذا الموعد'}</span>
                    </div>
                    <p className="text-rose-900 leading-relaxed font-medium">
                      المطلوب لهذه الخدمة: <strong className="font-extrabold text-rose-950">{pointsCost} نقطة</strong>، بينما رصيدك المتوفر حالياً: <strong className="font-extrabold text-rose-950">{currentPoints} نقطة</strong> (ينقصك {pointsCost - currentPoints} نقطة).
                    </p>
                    <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200 text-[11px] text-slate-800 font-semibold space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span>طريقة شحن الرصيد:</span>
                      </div>
                      <p>
                        يتم شحن رصيد النقاط أو تفعيل الباقات الطبية عبر <strong>إدارة المستشفى</strong> من لوحة التحكم (سعر النقطة المقرّر: <strong>50 ر.ي</strong>). يرجى مراجعة إدارة المستشفى لتعبئة رصيدك لتتمكن من إرسال الطلب فوراً.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="w-full py-3 px-4 bg-slate-200 text-slate-500 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                    <span>لا يمكن الإرسال — رصيد النقاط غير كافٍ ({currentPoints} / {pointsCost} نقطة)</span>
                  </button>

                  {packages.length > 0 && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('PACKAGE')}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5 text-teal-600" />
                        <span>أو استكشف باقات الرعاية الصحية الشاملة المتوفرة</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PACKAGES PAYMENT */}
          {activeTab === 'PACKAGE' && (
            <div className="space-y-4">
              {/* If user has an active package with quota */}
              {hasRemainingPackageQuota ? (
                <div className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-500 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
                        <Package className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-teal-900">{activePackage?.packageNameAr}</div>
                        <div className="text-[11px] text-teal-700">باقة نشطة ومفعلة</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-200 text-teal-900">
                      صالحة للاستخدام
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-teal-200">
                    <div className="bg-white/80 p-2 rounded-xl text-center">
                      <div className="text-slate-500 text-[11px]">استشارات متبقية</div>
                      <div className="font-black text-teal-800 text-base">{activePackage?.remainingConsultations}</div>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl text-center">
                      <div className="text-slate-500 text-[11px]">مواعيد متبقية</div>
                      <div className="font-black text-teal-800 text-base">{activePackage?.remainingAppointments}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading || isSuccess}
                    onClick={handlePayWithPackage}
                    className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>استخدام رصيد {serviceType === 'CONSULTATION' ? 'استشارة' : 'موعد'} من الباقة</span>
                  </button>
                </div>
              ) : (
                /* No active package -> Show packages catalog to subscribe */
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>اختر باقة رعاية للاشتراك (تواصل مع الادارة)وسداد هذه الخدمة فوراً:</span>
                    <span className="text-[11px] text-teal-700 font-semibold">تشمل رصيد + نقاط هدية</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {packages.map(pkg => {
                      const isSelected = selectedPackageToBuy?.id === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackageToBuy(pkg)}
                          className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/60 shadow-xs'
                              : 'border-slate-200 hover:border-teal-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-400'}`}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              <span className="font-bold text-xs text-slate-900">{pkg.nameAr}</span>
                            </div>
                            <span className="font-black text-xs text-teal-800">
                              {pkg.price.toLocaleString()} {pkg.currency}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-600 mr-5">
                            <span>{pkg.consultationsQuota} استشارات</span>
                            <span>•</span>
                            <span>{pkg.appointmentsQuota} مواعيد</span>
                            <span>•</span>
                            <span className="text-amber-700 font-bold">+{pkg.pointsBonus} نقطة هدية</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>


                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>نظام دفع آمن ومشفر 100% مع ضمان فوري</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
};
