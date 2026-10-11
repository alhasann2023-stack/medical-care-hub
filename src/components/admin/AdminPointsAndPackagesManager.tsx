import React, { useState, useEffect } from 'react';
import {
  Coins,
  Package,
  Plus,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  User,
  Phone,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  Gift,
  RefreshCw,
  Award
} from 'lucide-react';
import { Patient, PointsWallet, ActivePatientPackage, MedicalPackage, RewardSettings } from '../../types/medical';
import { api } from '../../services/api';
import { DEFAULT_MEDICAL_PACKAGES, DEFAULT_REWARD_SETTINGS } from '../../services/pointsAndCommunityService';
import { playSuccessSound } from '../../utils/sound';

interface AdminPointsAndPackagesManagerProps {
  patients: Patient[];
  onRefreshPatients?: () => void;
}

export const AdminPointsAndPackagesManager: React.FC<AdminPointsAndPackagesManagerProps> = ({
  patients,
  onRefreshPatients
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [walletsMap, setWalletsMap] = useState<Record<string, PointsWallet>>({});
  const [packagesMap, setPackagesMap] = useState<Record<string, ActivePatientPackage | null>>({});
  const [packagesCatalog, setPackagesCatalog] = useState<MedicalPackage[]>(DEFAULT_MEDICAL_PACKAGES);
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>(DEFAULT_REWARD_SETTINGS);
  const [isLoadingWallets, setIsLoadingWallets] = useState<boolean>(true);
  const [newPackageForm, setNewPackageForm] = useState({
    nameAr: 'باقة رعاية مخصصة',
    nameEn: 'Custom Care Package',
    badge: 'أولوية إضافية للمرضى',
    price: 25000,
    pointsBonus: 120,
    consultationsQuota: 5,
    appointmentsQuota: 3,
    validityDays: 90,
    featuresAr: ['استشارة طبية إضافية', 'حجز عيادي مرن', 'مكافآت نقاط مميزة']
  });

  // Recharge Points Modal
  const [selectedPatientForRecharge, setSelectedPatientForRecharge] = useState<Patient | null>(null);
  const [rechargePointsAmount, setRechargePointsAmount] = useState<number>(100);
  const [rechargeReceiptRef, setRechargeReceiptRef] = useState<string>('');
  const [rechargeNotes, setRechargeNotes] = useState<string>('');
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState<boolean>(false);

  // Grant Package Modal
  const [selectedPatientForPackage, setSelectedPatientForPackage] = useState<Patient | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('pkg-2');
  const [packageReceiptRef, setPackageReceiptRef] = useState<string>('');
  const [isSubmittingPackage, setIsSubmittingPackage] = useState<boolean>(false);

  // Deduct Points Modal
  const [selectedPatientForDeduct, setSelectedPatientForDeduct] = useState<Patient | null>(null);
  const [deductPointsAmount, setDeductPointsAmount] = useState<number>(20);
  const [deductReason, setDeductReason] = useState<string>('تسوية إدارية');
  const [isSubmittingDeduct, setIsSubmittingDeduct] = useState<boolean>(false);

  // Toast / Status Message
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Official Conversion Rate: 1 Point = 50 YER
  const POINT_PRICE_YER = 50;

  // Load Wallets and Active Packages for Patients
  const loadWalletsAndPackages = async () => {
    setIsLoadingWallets(true);
    try {
      const wMap: Record<string, PointsWallet> = {};
      const pMap: Record<string, ActivePatientPackage | null> = {};

      for (const p of patients) {
        try {
          const w = await api.getPointsWallet(p.id);
          wMap[p.id] = w;
        } catch {
          // ignore
        }
        try {
          const actPkg = await api.getActivePackage(p.id);
          pMap[p.id] = actPkg;
        } catch {
          // ignore
        }
      }

      setWalletsMap(wMap);
      setPackagesMap(pMap);
    } catch (err) {
      console.warn('Failed loading wallets:', err);
    } finally {
      setIsLoadingWallets(false);
    }
  };

  useEffect(() => {
    if (patients.length > 0) {
      loadWalletsAndPackages();
    }
    api.getMedicalPackages().then(pkgs => {
      if (pkgs && pkgs.length > 0) setPackagesCatalog(pkgs);
    }).catch(() => {});
    api.getRewardSettings().then(settings => {
      setRewardSettings(settings);
    }).catch(() => {});
  }, [patients]);

  // Filter Patients
  const filteredPatients = patients.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      (p.mrn && p.mrn.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const totalCirculatingPoints: number = (Object.values(walletsMap) as PointsWallet[]).reduce(
    (sum: number, w: PointsWallet) => sum + (w?.pointsBalance || 0),
    0
  );
  const activePackagesCount = Object.values(packagesMap).filter(Boolean).length;

  // Handle Recharge Points
  const handleConfirmRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForRecharge || rechargePointsAmount <= 0) return;

    setIsSubmittingRecharge(true);
    const costInYer = rechargePointsAmount * POINT_PRICE_YER;
    const ref = rechargeReceiptRef.trim() || `RCP-PTS-${Date.now().toString().slice(-6)}`;
    const desc = `شحن رصيد نقدي عبر الإدارة: ${rechargePointsAmount} نقطة بقيمة ${costInYer.toLocaleString('ar-YE')} ر.ي ${rechargeNotes ? `(${rechargeNotes})` : ''}`;

    try {
      const updatedWallet = await api.addPoints(
        selectedPatientForRecharge.id,
        rechargePointsAmount,
        desc,
        ref
      );

      setWalletsMap(prev => ({
        ...prev,
        [selectedPatientForRecharge.id]: updatedWallet
      }));

      playSuccessSound();
      setActionMessage({
        type: 'success',
        text: `تم شحن ${rechargePointsAmount} نقطة للمريض (${selectedPatientForRecharge.fullName}) بنجاح! المبلغ المحصل: ${costInYer.toLocaleString('ar-YE')} ر.ي`
      });

      setSelectedPatientForRecharge(null);
      setRechargeReceiptRef('');
      setRechargeNotes('');
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'فشلت عملية شحن النقاط.'
      });
    } finally {
      setIsSubmittingRecharge(false);
    }
  };

  // Handle Grant Package
  const handleConfirmGrantPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForPackage || !selectedPackageId) return;

    const targetPkg = packagesCatalog.find(pkg => pkg.id === selectedPackageId);
    if (!targetPkg) return;

    setIsSubmittingPackage(true);
    try {
      const actPkg = await api.purchasePackage(
        selectedPatientForPackage.id,
        targetPkg.id,
        targetPkg.nameAr
      );

      setPackagesMap(prev => ({
        ...prev,
        [selectedPatientForPackage.id]: actPkg
      }));

      // Refresh wallet because package gives bonus points
      const updatedW = await api.getPointsWallet(selectedPatientForPackage.id);
      setWalletsMap(prev => ({
        ...prev,
        [selectedPatientForPackage.id]: updatedW
      }));

      playSuccessSound();
      setActionMessage({
        type: 'success',
        text: `تم تفعيل (${targetPkg.nameAr}) للمريض (${selectedPatientForPackage.fullName}) بنجاح مع إضافة ${targetPkg.pointsBonus} نقطة هدية!`
      });

      setSelectedPatientForPackage(null);
      setPackageReceiptRef('');
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'فشل تفعيل الباقة للمريض.'
      });
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  // Handle Deduct Points
  const handleConfirmDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForPatient || deductPointsAmount <= 0) return;

    setIsSubmittingDeduct(true);
    try {
      const res = await api.deductPoints(
        selectedPatientForDeduct!.id,
        deductPointsAmount,
        deductReason.trim() || 'تسوية إدارية بقرار الإدارة',
        `DED-${Date.now().toString().slice(-6)}`,
        'SPENT'
      );

      if (!res.success) {
        setActionMessage({
          type: 'error',
          text: res.error || 'تعذر خصم النقاط (الرصيد غير كافٍ).'
        });
      } else {
        const updatedW = await api.getPointsWallet(selectedPatientForDeduct!.id);
        setWalletsMap(prev => ({
          ...prev,
          [selectedPatientForDeduct!.id]: updatedW
        }));
        playSuccessSound();
        setActionMessage({
          type: 'success',
          text: `تم خصم ${deductPointsAmount} نقطة من رصيد المريض بنجاح.`
        });
        setSelectedPatientForDeduct(null);
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'فشلت عملية الخصم.'
      });
    } finally {
      setIsSubmittingDeduct(false);
    }
  };

  const selectedPatientForPatient = selectedPatientForDeduct;

  const handleSaveRewardSettings = async () => {
    try {
      const saved = await api.saveRewardSettings(rewardSettings, 'HOSPITAL_ADMIN');
      setRewardSettings(saved);
      setActionMessage({
        type: 'success',
        text: 'تم حفظ إعدادات مكافآت النقاط بنجاح.'
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'فشل حفظ إعدادات المكافآت.'
      });
    }
  };

  const handleCreatePackage = async () => {
    if (!newPackageForm.nameAr.trim() || !newPackageForm.nameEn.trim()) {
      setActionMessage({
        type: 'error',
        text: 'يرجى إدخال اسم الباقة بالعربية والإنجليزية.'
      });
      return;
    }

    const newPackage: MedicalPackage = {
      id: `pkg-${Date.now()}`,
      nameAr: newPackageForm.nameAr.trim(),
      nameEn: newPackageForm.nameEn.trim(),
      badge: newPackageForm.badge.trim() || 'باقة مخصصة',
      price: Number(newPackageForm.price) || 15000,
      currency: 'YER',
      pointsBonus: Number(newPackageForm.pointsBonus) || 50,
      consultationsQuota: Number(newPackageForm.consultationsQuota) || 1,
      appointmentsQuota: Number(newPackageForm.appointmentsQuota) || 1,
      validityDays: Number(newPackageForm.validityDays) || 30,
      featuresAr: newPackageForm.featuresAr.length ? newPackageForm.featuresAr : ['استشارة', 'حجز', 'مكافآت نقاط'],
      colorTheme: 'from-violet-600 to-indigo-700',
      isPopular: false
    };

    try {
      const updated = [newPackage, ...packagesCatalog];
      await api.saveMedicalPackages(updated);
      setPackagesCatalog(updated);
      setActionMessage({
        type: 'success',
        text: `تم إنشاء باقة ${newPackage.nameAr} بنجاح.`
      });
      setNewPackageForm({
        nameAr: 'باقة رعاية مخصصة',
        nameEn: 'Custom Care Package',
        badge: 'أولوية إضافية للمرضى',
        price: 25000,
        pointsBonus: 120,
        consultationsQuota: 5,
        appointmentsQuota: 3,
        validityDays: 90,
        featuresAr: ['استشارة طبية إضافية', 'حجز عيادي مرن', 'مكافآت نقاط مميزة']
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'فشل إنشاء الباقة.'
      });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Toast Banner */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-sm animate-in fade-in duration-200 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
            : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner & Pricing Rule */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
                <Coins className="w-6 h-6 text-amber-200 animate-pulse" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black">لوحة شحن نقاط وباقات المرضى</h2>
            </div>
            <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
              تتحكم إدارة المستشفى حصرياً بمنح وشحن أرصدة النقاط وتفعيل باقات الرعاية الصحية للمرضى. 
              يستخدم المرضى هذه النقاط لسداد رسوم الاستشارات الطبية وحجوزات المواعيد العيادية.
            </p>
          </div>

          {/* Pricing Highlight Pill */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-xs space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-2">
              <span className="text-amber-200 font-bold">سعر النقطة الرسمي:</span>
              <span className="font-black text-amber-300 text-sm">50 ر.ي / نقطة</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-100 font-medium">
              <div>🩺 الاستشارة: <strong>40 نقطة</strong> (2,000 ر.ي)</div>
              <div>🏥 حجز الموعد: <strong>50 نقطة</strong> (2,500 ر.ي)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">إجمالي النقاط الموزعة</div>
            <div className="text-xl font-black text-slate-900">{totalCirculatingPoints.toLocaleString('ar-YE')} <span className="text-xs font-bold text-amber-700">نقطة</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">الباقات الطبية النشطة</div>
            <div className="text-xl font-black text-slate-900">{activePackagesCount} <span className="text-xs font-bold text-teal-700">باقة مفعلة</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">القيمة المالية المعادلة</div>
            <div className="text-xl font-black text-slate-900">{(totalCirculatingPoints * POINT_PRICE_YER).toLocaleString('ar-YE')} <span className="text-xs font-bold text-emerald-700">ر.ي</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">إجمالي المرضى المسجلين</div>
            <div className="text-xl font-black text-slate-900">{patients.length} <span className="text-xs font-bold text-blue-700">مريض</span></div>
          </div>
        </div>
      </div>

      {/* Reward Settings & Package Builder */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">إعدادات مكافآت النقاط</h3>
            <button
              type="button"
              onClick={handleSaveRewardSettings}
              className="px-3 py-2 rounded-xl bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 cursor-pointer"
            >
              حفظ الإعدادات
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'consultationRewardPoints', label: 'مكافأة الاستشارة', suffix: 'نقطة' },
              { key: 'appointmentRewardPoints', label: 'مكافأة الحجز', suffix: 'نقطة' },
              { key: 'communityPostRewardPoints', label: 'مكافأة النشر في المجتمع', suffix: 'نقطة' },
              { key: 'reviewRewardPoints', label: 'مكافأة التقييم', suffix: 'نقطة' },
              { key: 'giftRewardPoints', label: 'مكافأة الهدايا', suffix: 'نقطة' },
              { key: 'newUserRewardPoints', label: 'مكافأة تسجيل الحساب الجديد', suffix: 'نقطة' }
            ].map((field) => (
              <label key={field.key} className="space-y-1.5 text-xs font-bold text-slate-600">
                <span>{field.label}</span>
                <input
                  type="number"
                  min={0}
                  value={(rewardSettings as any)[field.key]}
                  onChange={(e) => setRewardSettings(prev => ({
                    ...prev,
                    [field.key]: Number(e.target.value || 0)
                  }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </label>
            ))}
          </div>
          <label className="block text-xs font-bold text-slate-600">
            <span>القيمة الرسمية للنقطة (ريال يمني)</span>
            <input
              type="number"
              min={1}
              value={rewardSettings.pointValueYer}
              onChange={(e) => setRewardSettings(prev => ({
                ...prev,
                pointValueYer: Number(e.target.value || 1)
              }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">إنشاء باقة جديدة</h3>
            <button
              type="button"
              onClick={handleCreatePackage}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700 cursor-pointer"
            >
              إضافة الباقة
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <input
              value={newPackageForm.nameAr}
              onChange={(e) => setNewPackageForm(prev => ({ ...prev, nameAr: e.target.value }))}
              placeholder="اسم الباقة بالعربية"
              className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-900"
            />
            <input
              value={newPackageForm.nameEn}
              onChange={(e) => setNewPackageForm(prev => ({ ...prev, nameEn: e.target.value }))}
              placeholder="Package name in English"
              className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-900"
            />
            <input
              value={newPackageForm.badge}
              onChange={(e) => setNewPackageForm(prev => ({ ...prev, badge: e.target.value }))}
              placeholder="شعار أو وصف مختصر للمزايا"
              className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-900"
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={newPackageForm.price} onChange={(e) => setNewPackageForm(prev => ({ ...prev, price: Number(e.target.value || 0) }))} placeholder="السعر" className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-900" />
              <input type="number" value={newPackageForm.pointsBonus} onChange={(e) => setNewPackageForm(prev => ({ ...prev, pointsBonus: Number(e.target.value || 0) }))} placeholder="نقاط المكافأة" className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-900" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={newPackageForm.consultationsQuota} onChange={(e) => setNewPackageForm(prev => ({ ...prev, consultationsQuota: Number(e.target.value || 0) }))} placeholder="استشارات" className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-900" />
              <input type="number" value={newPackageForm.appointmentsQuota} onChange={(e) => setNewPackageForm(prev => ({ ...prev, appointmentsQuota: Number(e.target.value || 0) }))} placeholder="حجوزات" className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-900" />
              <input type="number" value={newPackageForm.validityDays} onChange={(e) => setNewPackageForm(prev => ({ ...prev, validityDays: Number(e.target.value || 0) }))} placeholder="أيام" className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، رقم الهاتف، أو رقم الملف الطبي (MRN)..."
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium"
          />
        </div>

        <button
          onClick={() => { loadWalletsAndPackages(); }}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWallets ? 'animate-spin' : ''}`} />
          <span>تحديث الأرصدة الحالية</span>
        </button>
      </div>

      {/* Patients Points & Packages Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <span>سجل المرضى وحسابات النقاط والباقات</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {filteredPatients.length} مريض
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 pr-6">المريض والملف الطبي</th>
                <th className="p-4">الهاتف</th>
                <th className="p-4">رصيد النقاط الحالي</th>
                <th className="p-4">المستوى (Tier)</th>
                <th className="p-4">الباقة الطبية المفعلة</th>
                <th className="p-4 text-center pl-6">إجراءات الإدارة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    لا يوجد مرضى مطابقين للبحث.
                  </td>
                </tr>
              ) : (
                filteredPatients.map(patient => {
                  const wallet = walletsMap[patient.id];
                  const actPackage = packagesMap[patient.id];
                  const balance = wallet?.pointsBalance ?? 0;
                  const tier = wallet?.tier || 'فضي';

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 pr-6">
                        <div className="font-bold text-slate-900 text-sm">{patient.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {patient.mrn || `MRN-${patient.id.slice(-6)}`}
                        </div>
                      </td>

                      <td className="p-4 font-mono text-slate-600">
                        {patient.phone || 'غير مسجل'}
                      </td>

                      <td className="p-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 font-black">
                          <Coins className="w-4 h-4 text-amber-600" />
                          <span className="text-sm">{balance}</span>
                          <span className="text-[10px] text-amber-700 font-bold">نقطة</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          يعادل: {(balance * POINT_PRICE_YER).toLocaleString('ar-YE')} ر.ي
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          tier === 'بلاتيني'
                            ? 'bg-purple-100 text-purple-800'
                            : tier === 'ذهبي'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {tier}
                        </span>
                      </td>

                      <td className="p-4">
                        {actPackage ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
                              <Package className="w-3.5 h-3.5 text-teal-600" />
                              {actPackage.packageNameAr}
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium">
                              متبقي: {actPackage.remainingConsultations} استشارات • {actPackage.remainingAppointments} مواعيد
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">لا توجد باقة نشطة</span>
                        )}
                      </td>

                      <td className="p-4 pl-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatientForRecharge(patient);
                              setRechargePointsAmount(100);
                            }}
                            className="py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                            title="شحن رصيد نقاط نقدي للمريض"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>شحن نقاط</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatientForPackage(patient);
                              setSelectedPackageId('pkg-2');
                            }}
                            className="py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            title="منح وتفعيل باقة رعاية صحية"
                          >
                            <Package className="w-3.5 h-3.5 text-teal-600" />
                            <span>منح باقة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatientForDeduct(patient);
                              setDeductPointsAmount(20);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="خصم أو تعديل نقاط"
                          >
                            <ArrowDownLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: RECHARGE POINTS (شحن رصيد نقاط) */}
      {/* ========================================================= */}
      {selectedPatientForRecharge && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Coins className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">شحن رصيد نقاط للمريض</h3>
                  <p className="text-xs text-amber-100 font-medium">
                    {selectedPatientForRecharge.fullName} ({selectedPatientForRecharge.mrn || 'مريض معتمد'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientForRecharge(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRecharge} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-amber-900 font-bold block">الرصيد المتوفر حالياً:</span>
                  <span className="text-slate-500 font-medium">سعر شحن النقطة المعتمد: 50 ر.ي</span>
                </div>
                <div className="text-left font-black text-amber-900 text-base">
                  {walletsMap[selectedPatientForRecharge.id]?.pointsBalance || 0} نقطة
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">اختر عدد النقاط المطلوب شحنها:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[50, 100, 200, 500].map(amt => {
                    const price = amt * POINT_PRICE_YER;
                    const isSelected = rechargePointsAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRechargePointsAmount(amt)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-400/40'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="text-sm font-extrabold">{amt} نقطة</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{price.toLocaleString('ar-YE')} ر.ي</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Points Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">أو أدخل عدد نقاط مخصص:</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={rechargePointsAmount}
                  onChange={(e) => setRechargePointsAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Total Calculation Display */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">إجمالي المبلغ المحصل نقداً:</span>
                  <span className="text-[11px] text-amber-300 font-medium">
                    ({rechargePointsAmount} نقطة × 50 ر.ي)
                  </span>
                </div>
                <div className="text-xl font-black text-amber-400">
                  {(rechargePointsAmount * POINT_PRICE_YER).toLocaleString('ar-YE')} ر.ي
                </div>
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم سند القبض / المرجع:</label>
                  <input
                    type="text"
                    value={rechargeReceiptRef}
                    onChange={(e) => setRechargeReceiptRef(e.target.value)}
                    placeholder="مثال: RCP-1049"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ملاحظات المحاسبة:</label>
                  <input
                    type="text"
                    value={rechargeNotes}
                    onChange={(e) => setRechargeNotes(e.target.value)}
                    placeholder="مثال: نقداً في صندوق الاستقبال"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPatientForRecharge(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRecharge}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingRecharge ? 'جاري الشحن...' : `تأكيد شحن ${rechargePointsAmount} نقطة`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: GRANT MEDICAL PACKAGE (منح باقة صحية) */}
      {/* ========================================================= */}
      {selectedPatientForPackage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Package className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">منح وتفعيل باقة رعاية صحية</h3>
                  <p className="text-xs text-teal-100 font-medium">{selectedPatientForPackage.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientForPackage(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmGrantPackage} className="p-5 space-y-4 text-xs sm:text-sm">
              <label className="block font-bold text-slate-800 mb-1">اختر الباقة الطبية المطلوب تفعيلها للمريض:</label>
              
              <div className="space-y-2.5">
                {packagesCatalog.map(pkg => {
                  const isSelected = selectedPackageId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/70 shadow-xs ring-2 ring-teal-400/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <Package className={`w-4 h-4 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`} />
                          <span>{pkg.nameAr}</span>
                        </div>
                        <span className="font-black text-teal-800 text-sm">
                          {pkg.price.toLocaleString('ar-YE')} ر.ي
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                        {pkg.descriptionAr}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700 bg-white/80 p-2 rounded-xl border border-slate-100">
                        <span>💬 {pkg.consultationsQuota} استشارات عن بعد</span>
                        <span>🏥 {pkg.appointmentsQuota} كشوفات عيادية</span>
                        <span className="text-amber-700">🎁 +{pkg.pointsBonus} نقطة هدية</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPatientForPackage(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPackage}
                  className="py-2.5 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingPackage ? 'جاري التفعيل...' : 'تأكيد تفعيل الباقة فوراً'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DEDUCT POINTS (خصم / تعديل نقاط) */}
      {/* ========================================================= */}
      {selectedPatientForDeduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-rose-700 to-rose-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <ArrowDownLeft className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">خصم نقاط من رصيد المريض</h3>
                  <p className="text-xs text-rose-100">{selectedPatientForDeduct.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientForDeduct(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeduct} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-800 mb-1">عدد النقاط المراد خصمها:</label>
                <input
                  type="number"
                  min="1"
                  max={walletsMap[selectedPatientForDeduct.id]?.pointsBalance || 1000}
                  value={deductPointsAmount}
                  onChange={(e) => setDeductPointsAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  الرصيد المتاح: {walletsMap[selectedPatientForDeduct.id]?.pointsBalance || 0} نقطة
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">سبب الخصم / التعديل:</label>
                <input
                  type="text"
                  value={deductReason}
                  onChange={(e) => setDeductReason(e.target.value)}
                  placeholder="مثال: إلغاء خدمة، تعديل رصيد خاطئ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPatientForDeduct(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeduct}
                  className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDeduct ? 'جاري الخصم...' : 'تأكيد خصم النقاط'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
