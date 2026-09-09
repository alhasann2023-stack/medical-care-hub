import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Receipt, 
  Printer, 
  Download, 
  ArrowUpRight, 
  ShieldCheck, 
  Calendar, 
  User, 
  DollarSign,
  FileText,
  Percent,
  Check,
  X,
  ChevronDown,
  Landmark,
  Wallet,
  Settings,
  BookOpen,
  Copy,
  Save,
  KeyRound,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  Smartphone,
  Send,
  Phone
} from 'lucide-react';
import { 
  Payment, 
  Refund, 
  CurrencyCode, 
  PaymentSettings, 
  PaymentLedgerEntry, 
  PaymentProviderType,
  PaymentMethod,
  ManualPaymentAccounts
} from '../../types/medical';
import { api } from '../../services/api';
import { 
  formatPaymentAmount, 
  getProviderDisplayName, 
  SUPPORTED_CURRENCIES,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_MANUAL_ACCOUNTS
} from '../../utils/paymentUtils';
import { INITIAL_PAYMENTS } from '../../data/seedData';

interface AdminPaymentsManagerProps {
  onShowNotification?: (type: 'success' | 'error', text: string) => void;
}

export const AdminPaymentsManager: React.FC<AdminPaymentsManagerProps> = ({
  onShowNotification
}) => {
  // Navigation Tabs
  const [subTab, setSubTab] = useState<'TRANSACTIONS' | 'LEDGER' | 'SETTINGS'>('TRANSACTIONS');

  // Transactions State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PAYMENT_SUCCESS' | 'PENDING' | 'PAYMENT_REQUIRED' | 'REFUNDED' | 'FAILED' | 'WAIVED'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'YER' | 'USD' | 'SAR'>('ALL');
  const [providerFilter, setProviderFilter] = useState<'ALL' | 'KURAIMI' | 'VISA_MASTERCARD' | 'MADA' | 'APPLE_PAY' | 'CASH' | 'WAIVED'>('ALL');

  // Ledger State
  const [ledgerData, setLedgerData] = useState<{
    summaries: Record<CurrencyCode, { gross: number; fees: number; net: number; refunded: number; count: number }>;
    entries: PaymentLedgerEntry[];
  }>({
    summaries: {
      YER: { gross: 0, fees: 0, net: 0, refunded: 0, count: 0 },
      USD: { gross: 0, fees: 0, net: 0, refunded: 0, count: 0 },
      SAR: { gross: 0, fees: 0, net: 0, refunded: 0, count: 0 }
    },
    entries: []
  });
  const [isLedgerLoading, setIsLedgerLoading] = useState<boolean>(false);

  // Settings State
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [isSettingsLoading, setIsSettingsLoading] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Refund Modal State
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState<string>('طلب المريض إلغاء الموعد بناءً على السياسة الطبية');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [isProcessingRefund, setIsProcessingRefund] = useState<boolean>(false);

  // Mark As Paid & Copy Account States
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [copiedPatientAccount, setCopiedPatientAccount] = useState<string | null>(null);

  // Selected Receipt for Viewing/Printing
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  useEffect(() => {
    loadPayments();
    loadLedger();
    loadSettings();

    // Subscribe to real-time payments directly from Firestore
    const unsubscribe = api.subscribePayments({}, (livePayments) => {
      if (Array.isArray(livePayments) && livePayments.length > 0) {
        setPayments(livePayments);
        setIsLoading(false);
      }
    });

    // Continuous automatic sync from Firestore every 4 seconds to guarantee permanent fresh data
    const syncInterval = setInterval(() => {
      loadPayments(false);
      loadLedger();
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, []);

  // Helper to extract patient's account number / wallet / phone
  const getPatientRefundAccount = (payment: Payment): string => {
    return payment.kuraimiAccount || 
           payment.kuraimiDetails?.customerAccount || 
           (payment as any).patientAccount || 
           (payment as any).patientBankAccount || 
           (payment as any).accountNumber || 
           payment.patientPhone || 
           '';
  };

  const handleCopyPatientAccount = (account: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopiedPatientAccount(account);
    if (onShowNotification) {
      onShowNotification('info', `تم نسخ رقم حساب المريض (${account}) بنجاح لتحويل واسترداد المبلغ.`);
    }
    setTimeout(() => setCopiedPatientAccount(null), 3000);
  };

  const handleMarkAsPaid = async (payment: Payment) => {
    setMarkingPaidId(payment.id);
    try {
      await api.markPaymentAsPaid(payment.id, 'تم تأكيد السداد وإرسال رسوم الاستشارة والحجز من قبل إدارة المستشفى');
      if (onShowNotification) {
        onShowNotification('success', `تم تأكيد سداد رسوم الاستشارة والحجز بنجاح للعملية (${payment.receiptNumber || payment.id}).`);
      }
      await loadPayments();
      await loadLedger();
    } catch (err: any) {
      console.error('Failed to mark payment as paid:', err);
      if (onShowNotification) {
        onShowNotification('error', err.message || 'فشل تأكيد عملية السداد.');
      }
    } finally {
      setMarkingPaidId(null);
    }
  };

  const loadPayments = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // 1. Direct fetch from Firestore first as primary authoritative source
      const directFs = await api.getFirestorePayments().catch(() => []);
      if (directFs && directFs.length > 0) {
        setPayments(directFs);
      }

      // 2. Fetch from API endpoint to ensure complete synchronized ledger state
      const res = await api.getPayments();
      if (res && res.length > 0) {
        setPayments(res);
      } else if (!directFs || directFs.length === 0) {
        if (INITIAL_PAYMENTS && INITIAL_PAYMENTS.length > 0) {
          setPayments(INITIAL_PAYMENTS);
        } else {
          setPayments([]);
        }
      }
    } catch (err) {
      console.error('Failed to load payments for admin:', err);
      const directFs = await api.getFirestorePayments().catch(() => []);
      if (directFs && directFs.length > 0) {
        setPayments(directFs);
      } else if (INITIAL_PAYMENTS && INITIAL_PAYMENTS.length > 0) {
        setPayments(INITIAL_PAYMENTS);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadLedger = async () => {
    setIsLedgerLoading(true);
    try {
      const res = await api.getPaymentLedger();
      if (res && res.summaries) {
        setLedgerData(res);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const loadSettings = async () => {
    setIsSettingsLoading(true);
    try {
      const res = await api.getPaymentSettings();
      if (res && res.defaultCurrency) {
        setSettings({
          ...res,
          manualAccounts: {
            ...DEFAULT_MANUAL_ACCOUNTS,
            ...(res.manualAccounts || {})
          }
        });
      }
    } catch (err) {
      console.error('Failed to load payment settings:', err);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const handleOpenRefundModal = (payment: Payment) => {
    setRefundTarget(payment);
    setRefundAmount(payment.amount);
    setRefundReason('إلغاء الموعد / استرداد الرسوم بموجب اللائحة الإدارية');
    const account = getPatientRefundAccount(payment);
    if (account) {
      navigator.clipboard.writeText(account);
      setCopiedPatientAccount(account);
      if (onShowNotification) {
        onShowNotification('info', `تم نسخ رقم حساب المريض (${account}) تلقائياً لرد وتحويل المبلغ إليه.`);
      }
      setTimeout(() => setCopiedPatientAccount(null), 3500);
    }
  };

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;

    setIsProcessingRefund(true);
    try {
      await api.processRefund(refundTarget.id, {
        amount: Number(refundAmount),
        reason: refundReason,
        processedBy: 'Super Admin / Financial Controller'
      });

      if (onShowNotification) {
        onShowNotification('success', `تم تنفيذ استرداد مبلغ ${formatPaymentAmount(refundAmount, refundTarget.currency as CurrencyCode)} للعملية (${refundTarget.receiptNumber || refundTarget.id}) بنجاح.`);
      }
      setRefundTarget(null);
      await loadPayments();
      await loadLedger();
    } catch (err: any) {
      console.error(err);
      if (onShowNotification) {
        onShowNotification('error', err.message || 'فشل تنفيذ عملية الاسترداد.');
      }
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await api.updatePaymentSettings(settings, 'المسؤول الأعلى / المدير المالي');
      if (res && res.settings) {
        setSettings(res.settings);
      }
      if (onShowNotification) {
        onShowNotification('success', 'تم حفظ وتفعيل إعدادات بوابات الدفع بنجاح على الخادم.');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      if (onShowNotification) {
        onShowNotification('error', err.message || 'فشل حفظ إعدادات بوابات الدفع.');
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCopyWebhook = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Calculations for Metrics across Currencies
  const isPaymentPaid = (p: Payment) => 
    p.status === 'PAID' || 
    p.status === 'PAYMENT_SUCCESS' || 
    p.status === 'SUCCESS' || 
    p.paymentStatus === 'PAID' || 
    p.paymentStatus === 'PAYMENT_SUCCESS' || 
    p.paymentStatus === 'SUCCESS';

  const yerRevenue = payments
    .filter(p => isPaymentPaid(p) && (p.currency === 'YER' || !p.currency))
    .reduce((sum, p) => sum + p.amount, 0);

  const usdRevenue = payments
    .filter(p => isPaymentPaid(p) && p.currency === 'USD')
    .reduce((sum, p) => sum + p.amount, 0);

  const sarRevenue = payments
    .filter(p => isPaymentPaid(p) && p.currency === 'SAR')
    .reduce((sum, p) => sum + p.amount, 0);

  const paidCount = payments.filter(p => isPaymentPaid(p)).length;
  const pendingCount = payments.filter(p => p.status === 'PENDING' || p.status === 'PAYMENT_REQUIRED' || p.paymentStatus === 'PENDING' || p.paymentStatus === 'PAYMENT_REQUIRED').length;
  const refundedCount = payments.filter(p => p.status === 'REFUNDED' || p.paymentStatus === 'REFUNDED').length;

  const filteredPayments = payments.filter(p => {
    // Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PAID' && !isPaymentPaid(p)) return false;
      if (statusFilter === 'PENDING' && p.status !== 'PENDING' && p.status !== 'PAYMENT_REQUIRED' && p.paymentStatus !== 'PENDING' && p.paymentStatus !== 'PAYMENT_REQUIRED') return false;
      if (statusFilter === 'REFUNDED' && p.status !== 'REFUNDED' && p.paymentStatus !== 'REFUNDED') return false;
      if (statusFilter === 'WAIVED' && p.status !== 'WAIVED' && p.paymentStatus !== 'WAIVED') return false;
    }

    // Currency Filter
    if (currencyFilter !== 'ALL') {
      const pCurr = p.currency || 'YER';
      if (pCurr !== currencyFilter) return false;
    }

    // Provider Filter
    if (providerFilter !== 'ALL') {
      if (providerFilter === 'KURAIMI' && p.paymentProvider !== 'KURAIMI' && !p.paymentMethod?.includes('KURAIMI')) return false;
      if (providerFilter === 'VISA_MASTERCARD' && p.paymentProvider !== 'VISA_MASTERCARD' && !['VISA', 'MASTERCARD', 'VISA_MASTERCARD'].includes(p.paymentMethod || '')) return false;
      if (providerFilter === 'MADA' && p.paymentProvider !== 'MADA' && p.paymentMethod !== 'MADA') return false;
      if (providerFilter === 'APPLE_PAY' && p.paymentProvider !== 'APPLE_PAY' && p.paymentMethod !== 'APPLE_PAY') return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.patientName?.toLowerCase().includes(q) ||
        p.receiptNumber?.toLowerCase().includes(q) ||
        p.serviceName?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.gatewayTransactionId?.toLowerCase().includes(q) ||
        p.kuraimiAccount?.toLowerCase().includes(q) ||
        p.doctorName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 text-start">
      {/* Top Sub-tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('TRANSACTIONS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'TRANSACTIONS'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>سجل المعاملات والمدفوعات ({payments.length})</span>
          </button>

          <button
            onClick={() => { setSubTab('LEDGER'); loadLedger(); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'LEDGER'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>سجل الأستاذ المالي والتسويات (Ledger)</span>
          </button>

          <button
            onClick={() => { setSubTab('SETTINGS'); loadSettings(); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'SETTINGS'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إعدادات بوابات الدفع والربط البنكي (Gateways)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadPayments(); loadLedger(); loadSettings(); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Multi-Currency Revenue Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* YER Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-300 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <span>🇾🇪</span>
              <span>إيرادات الريال اليمني (YER)</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <strong className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {formatPaymentAmount(yerRevenue, 'YER')}
          </strong>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>بنك الكريمي (Al-Kuraimi API) & نقدي</span>
          </p>
        </div>

        {/* USD Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-300 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <span>🇺🇸</span>
              <span>إيرادات الدولار الأمريكي (USD)</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <strong className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {formatPaymentAmount(usdRevenue, 'USD')}
          </strong>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Visa / Mastercard الدولية</span>
          </p>
        </div>

        {/* SAR Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-300 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <span>🇸🇦</span>
              <span>إيرادات الريال السعودي (SAR)</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <strong className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {formatPaymentAmount(sarRevenue, 'SAR')}
          </strong>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>مدى / STC Pay / Apple Pay</span>
          </p>
        </div>

        {/* System Operations Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-300 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">حالة الربط والعمليات</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <strong className="text-sm font-black text-slate-900 dark:text-slate-100">
              {paidCount} مؤكدة • {pendingCount} معلقة
            </strong>
          </div>
          <p className="text-[11px] text-rose-500 font-semibold mt-1">
            <span>{refundedCount} عمليات استرجاع مالي</span>
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: TRANSACTIONS LIST */}
      {/* ========================================================= */}
      {subTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          {/* Control Bar: Filters & Search */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث برقم السند، اسم المريض، حساب الكريمي، رقم المعاملة، أو الطبيب..."
                  className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                />
              </div>

              {/* Currency Selector Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">العملة:</span>
                {(['ALL', 'YER', 'USD', 'SAR'] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setCurrencyFilter(curr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currencyFilter === curr
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {curr === 'ALL' ? 'كل العملات' : curr}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">الحالة:</span>
                {(['ALL', 'PAID', 'PENDING', 'REFUNDED', 'WAIVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' && 'الكل'}
                    {st === 'PAID' && 'المدفوعة'}
                    {st === 'PENDING' && 'المعلقة'}
                    {st === 'REFUNDED' && 'المستردة'}
                    {st === 'WAIVED' && 'المعفاة'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">سجل المعاملات والعمليات المالية الموثقة</h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  جلب تلقائي ودائم من فايربيس
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadPayments(true)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  title="تحديث المعاملات فورياً من قاعدة بيانات فايربيس"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>تحديث فوري</span>
                </button>
                <span className="text-xs font-mono font-bold text-slate-500">
                  إجمالي النتائج: {filteredPayments.length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">رقم السند والمعاملة</th>
                    <th className="p-3.5">المريض</th>
                    <th className="p-3.5">الخدمة الطبية / الطبيب</th>
                    <th className="p-3.5">المبلغ والعملة</th>
                    <th className="p-3.5">مزود ووسيلة الدفع</th>
                    <th className="p-3.5">التاريخ والوقت</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <strong className="block font-mono text-slate-900 dark:text-slate-100">
                            {p.receiptNumber || `INV-${p.id.slice(-6).toUpperCase()}`}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            TX: {p.gatewayTransactionId ? p.gatewayTransactionId.slice(-10) : p.transactionReference || p.id}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <strong className="block text-slate-900 dark:text-slate-100">{p.patientName || 'المريض'}</strong>
                          {p.patientPhone && <span className="text-[10px] text-slate-400 font-mono block">{p.patientPhone}</span>}
                          {getPatientRefundAccount(p) && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                                حساب: {getPatientRefundAccount(p)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPatientAccount(getPatientRefundAccount(p), e)}
                                className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded text-emerald-600 dark:text-emerald-300 transition-colors cursor-pointer"
                                title="نسخ رقم حساب المريض لرد المبلغ"
                              >
                                {copiedPatientAccount === getPatientRefundAccount(p) ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400" />
                                )}
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.serviceName}</span>
                          {p.doctorName && <span className="text-[11px] text-emerald-600 block">{p.doctorName}</span>}
                        </td>

                        <td className="p-3.5">
                          <strong className="font-mono text-sm text-slate-900 dark:text-slate-100">
                            {formatPaymentAmount(p.amount, p.currency as CurrencyCode)}
                          </strong>
                          <span className="text-[10px] text-slate-400 block font-bold">
                            {p.currency || 'YER'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[11px] inline-flex items-center gap-1 text-slate-800 dark:text-slate-200">
                              {p.paymentProvider === 'KURAIMI' || p.paymentMethod?.includes('KURAIMI') ? (
                                <>
                                  <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>بنك الكريمي</span>
                                </>
                              ) : p.paymentMethod === 'MADA' ? (
                                <>
                                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>مدى (Mada)</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{p.paymentMethod || 'بطاقة بنكية'}</span>
                                </>
                              )}
                            </span>
                            {p.kuraimiAccount && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono block">
                                حساب: {p.kuraimiAccount}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {p.paidAt || p.createdAt ? new Date(p.paidAt || p.createdAt).toLocaleDateString('ar-YE') : 'اليوم'}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {p.paidAt || p.createdAt ? new Date(p.paidAt || p.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            p.status === 'PAID' || p.status === 'PAYMENT_SUCCESS' || p.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : p.status === 'REFUNDED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : p.status === 'WAIVED'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {(p.status === 'PAID' || p.status === 'PAYMENT_SUCCESS' || p.status === 'SUCCESS') && <><Check className="w-3 h-3" /> تم الدفع بنجاح</>}
                            {p.status === 'REFUNDED' && <><RotateCcw className="w-3 h-3" /> مسترد ({formatPaymentAmount(p.refundAmount || p.amount, p.currency as CurrencyCode)})</>}
                            {p.status === 'WAIVED' && <><CheckCircle2 className="w-3 h-3" /> إعفاء خيري</>}
                            {(p.status === 'PENDING' || p.status === 'PAYMENT_REQUIRED') && <><Clock className="w-3 h-3" /> بانتظار السداد</>}
                            {p.status === 'FAILED' && <><X className="w-3 h-3" /> فشل الدفع</>}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* زر تم السداد: بعد إرسال رسوم الاستشارة والحجز */}
                            {p.status !== 'PAID' && p.status !== 'PAYMENT_SUCCESS' && p.status !== 'SUCCESS' && p.status !== 'REFUNDED' ? (
                              <button
                                onClick={() => handleMarkAsPaid(p)}
                                disabled={markingPaidId === p.id}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50"
                                title="تأكيد تم السداد بعد إرسال رسوم الاستشارة والحجز"
                              >
                                {markingPaidId === p.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>تم السداد</span>
                              </button>
                            ) : (
                              (p.status === 'PAID' || p.status === 'PAYMENT_SUCCESS' || p.status === 'SUCCESS') && (
                                <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>تم السداد</span>
                                </span>
                              )
                            )}

                            {/* زر استرداد المبلغ لكي ينسخ رقم حساب المريض الذي سوف ترد إليه المبلغ */}
                            {(p.status === 'PAID' || p.status === 'PAYMENT_SUCCESS' || p.status === 'SUCCESS') && (
                              <button
                                onClick={() => handleOpenRefundModal(p)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap border border-rose-200 dark:border-rose-800/50"
                                title="استرداد المبلغ ونسخ رقم حساب المريض لرد المبلغ إليه"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>استرداد المبلغ</span>
                              </button>
                            )}

                            {/* زر سريع لنسخ رقم حساب المريض */}
                            {getPatientRefundAccount(p) && (
                              <button
                                onClick={(e) => handleCopyPatientAccount(getPatientRefundAccount(p), e)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                  copiedPatientAccount === getPatientRefundAccount(p)
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-200'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                }`}
                                title={`نسخ رقم حساب المريض (${getPatientRefundAccount(p)}) لرد المبلغ إليه`}
                              >
                                {copiedPatientAccount === getPatientRefundAccount(p) ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-[10px]">تم نسخ الحساب</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-[10px]">نسخ الحساب</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* معاينة وطباعة الفاتورة وسند القبض */}
                            <button
                              onClick={() => setSelectedReceipt(p)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                              title="معاينة وطباعة الفاتورة وسند القبض"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        {isLoading ? 'جارٍ تحميل سجل المعاملات المالية...' : 'لا توجد معاملات مطابقة للفلترة الحالية.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: ACCOUNTING LEDGER */}
      {/* ========================================================= */}
      {subTab === 'LEDGER' && (
        <div className="space-y-6">
          {/* Summary Cards Per Currency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['YER', 'USD', 'SAR'] as CurrencyCode[]).map((curr) => {
              const summary = ledgerData.summaries[curr] || { gross: 0, fees: 0, net: 0, refunded: 0, count: 0 };
              const info = SUPPORTED_CURRENCIES[curr];

              return (
                <div key={curr} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.flagIcon}</span>
                      <div>
                        <strong className="text-sm font-black text-slate-900 dark:text-slate-100">{info.nameAr}</strong>
                        <span className="text-[10px] text-slate-400 block font-mono">{curr}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      {summary.count} حركة
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>إجمالي التحصيل الإجمالي (Gross):</span>
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {formatPaymentAmount(summary.gross, curr)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>رسوم وعمولات البوابات (Fees):</span>
                      <span className="font-mono text-rose-600">
                        - {formatPaymentAmount(summary.fees, curr)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>المبالغ المستردة (Refunds):</span>
                      <span className="font-mono text-amber-600">
                        - {formatPaymentAmount(summary.refunded, curr)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                      <strong className="font-bold text-slate-900 dark:text-slate-100">صافي التسوية البنكية (Net):</strong>
                      <strong className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {formatPaymentAmount(summary.net, curr)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ledger Journal Entries Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  دفتر الأستاذ والقيود المحاسبية الآلية (Financial Journal)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                إجمالي القيود: {ledgerData.entries.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-400 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">رقم القيد والتاريخ</th>
                    <th className="p-3.5">نوع القيد</th>
                    <th className="p-3.5">المرجع والخدمة</th>
                    <th className="p-3.5">المبلغ الإجمالي (Gross)</th>
                    <th className="p-3.5">عمولة البوابة (Fee)</th>
                    <th className="p-3.5">الصافي المالي (Net)</th>
                    <th className="p-3.5">مزود الدفع</th>
                    <th className="p-3.5">حالة التسوية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledgerData.entries.length > 0 ? (
                    ledgerData.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <strong className="block font-mono text-slate-900 dark:text-slate-100">{entry.id}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(entry.createdAt).toLocaleString('ar-YE')}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            entry.entryType === 'CREDIT_COLLECTION'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {entry.entryType === 'CREDIT_COLLECTION' ? '+ تحصيل إيراد' : '- استرداد مالي'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{entry.description}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ref: {entry.serviceReferenceId}</span>
                        </td>

                        <td className="p-3.5 font-mono text-slate-900 dark:text-slate-100 font-bold">
                          {formatPaymentAmount(entry.grossAmount, entry.currency)}
                        </td>

                        <td className="p-3.5 font-mono text-rose-600">
                          - {formatPaymentAmount(entry.feeAmount, entry.currency)}
                        </td>

                        <td className="p-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-black">
                          {formatPaymentAmount(entry.netAmount, entry.currency)}
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                            {entry.provider === 'KURAIMI' ? 'بنك الكريمي' : entry.provider}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>{entry.settlementStatus === 'SETTLED' ? 'تمت التسوية' : 'قيد المقاصة'}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        {isLedgerLoading ? 'جارٍ تحميل دفتر الأستاذ...' : 'لا توجد قيود مسجلة حتى الآن.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: PAYMENT SETTINGS & PROVIDER GATEWAYS */}
      {/* ========================================================= */}
      {subTab === 'SETTINGS' && (
        <form onSubmit={handleSaveSettings} className="space-y-2">
          {/* Manual Payment Accounts for Appointments & Consultations */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    أرقام حسابات التحويل والمحافظ الإلكترونية (للمرضى بعد طلب استشارة أو حجز موعد)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    هذه الأرقام تظهر مباشرة للمريض لنسخها وسداد الرسوم وإرسال إشعار الدفع عبر واتساب الإدارة
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs self-start sm:self-auto">
                إشعار تأكيد الدفع الفوري
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Kuraimi */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  رقم حساب الكريمي (بنك الكريمي) *
                </label>
                <input
                  type="text"
                  value={settings.manualAccounts?.kuraimiAccount ?? DEFAULT_MANUAL_ACCOUNTS.kuraimiAccount}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualAccounts: {
                      ...DEFAULT_MANUAL_ACCOUNTS,
                      ...(settings.manualAccounts || {}),
                      kuraimiAccount: e.target.value
                    }
                  })}
                  placeholder="مثال: 3055489211"
                  className="w-full px-3 py-2 rounded-lg border border-blue-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Jawwali */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  رقم حساب جوالي (Jawwali) *
                </label>
                <input
                  type="text"
                  value={settings.manualAccounts?.jawwaliAccount ?? DEFAULT_MANUAL_ACCOUNTS.jawwaliAccount}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualAccounts: {
                      ...DEFAULT_MANUAL_ACCOUNTS,
                      ...(settings.manualAccounts || {}),
                      jawwaliAccount: e.target.value
                    }
                  })}
                  placeholder="مثال: 778901234"
                  className="w-full px-3 py-2 rounded-lg border border-blue-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* OneCash */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  رقم حساب وان كاش (OneCash) *
                </label>
                <input
                  type="text"
                  value={settings.manualAccounts?.oneCashAccount ?? DEFAULT_MANUAL_ACCOUNTS.oneCashAccount}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualAccounts: {
                      ...DEFAULT_MANUAL_ACCOUNTS,
                      ...(settings.manualAccounts || {}),
                      oneCashAccount: e.target.value
                    }
                  })}
                  placeholder="مثال: 733456789"
                  className="w-full px-3 py-2 rounded-lg border border-blue-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Jeeb */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  رقم حساب جيب (Jeeb) *
                </label>
                <input
                  type="text"
                  value={settings.manualAccounts?.jeebAccount ?? DEFAULT_MANUAL_ACCOUNTS.jeebAccount}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualAccounts: {
                      ...DEFAULT_MANUAL_ACCOUNTS,
                      ...(settings.manualAccounts || {}),
                      jeebAccount: e.target.value
                    }
                  })}
                  placeholder="مثال: 711234567"
                  className="w-full px-3 py-2 rounded-lg border border-blue-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Floosak */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  رقم حساب فلوسك (Floosak) *
                </label>
                <input
                  type="text"
                  value={settings.manualAccounts?.floosakAccount ?? DEFAULT_MANUAL_ACCOUNTS.floosakAccount}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualAccounts: {
                      ...DEFAULT_MANUAL_ACCOUNTS,
                      ...(settings.manualAccounts || {}),
                      floosakAccount: e.target.value
                    }
                  })}
                  placeholder="مثال: 770123456"
                  className="w-full px-3 py-2 rounded-lg border border-blue-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Admin WhatsApp */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>رقم واتساب الإدارة لاستلام السند *</span>
                </label>
                <input
                  type="text"
                  value={settings.manualAccounts?.adminWhatsapp ?? DEFAULT_MANUAL_ACCOUNTS.adminWhatsapp}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualAccounts: {
                      ...DEFAULT_MANUAL_ACCOUNTS,
                      ...(settings.manualAccounts || {}),
                      adminWhatsapp: e.target.value
                    }
                  })}
                  placeholder="مثال: 967770000000"
                  className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Beneficiary Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم المستفيد المعتمد على الحسابات
                </label>
                <input
                  type="text"
                  value={settings.manualAccounts?.beneficiaryName ?? DEFAULT_MANUAL_ACCOUNTS.beneficiaryName}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualAccounts: {
                      ...DEFAULT_MANUAL_ACCOUNTS,
                      ...(settings.manualAccounts || {}),
                      beneficiaryName: e.target.value
                    }
                  })}
                  placeholder="مثال: مستشفى العناية الطبية التخصصي"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Instruction Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نص التوجيه والتعليمات المعروض للمريض
                </label>
                <input
                  type="text"
                  value={settings.manualAccounts?.instructionsText ?? DEFAULT_MANUAL_ACCOUNTS.instructionsText}
                  onChange={(e) => setSettings({
                    ...settings,
                    manualAccounts: {
                      ...DEFAULT_MANUAL_ACCOUNTS,
                      ...(settings.manualAccounts || {}),
                      instructionsText: e.target.value
                    }
                  })}
                  placeholder="انسخ رقم الحساب لإرسال قيمة الاستشارة أو الحجز لكي يتم تأكيده..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>


          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingSettings ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارٍ حفظ الإعدادات على الخادم...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ وتفعيل إعدادات بوابات الدفع</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* MODAL: REFUND PROCESSING */}
      {/* ========================================================= */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-start">
            <div className="p-5 bg-gradient-to-r from-rose-700 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">استرداد مالي (Process Refund)</h3>
                  <p className="text-xs text-rose-100">إرجاع المبلغ للعميل بنفس العملة وقيد العملية محاسبياً</p>
                </div>
              </div>
              <button
                onClick={() => setRefundTarget(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteRefund} className="p-6 space-y-4">
              {/* بطاقة رقم حساب المريض للاسترداد مع زر النسخ المباشر */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    <span>رقم حساب المريض لتحويل ورد المبلغ:</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                    {refundTarget.kuraimiAccount ? 'حساب بنك الكريمي' : 'رقم حساب / هاتف العميل'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-bold">رقم الحساب / المحفظة المعتمد:</span>
                    <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300 tracking-wider">
                      {getPatientRefundAccount(refundTarget) || 'غير مسجل في العملية'}
                    </span>
                  </div>
                  {getPatientRefundAccount(refundTarget) && (
                    <button
                      type="button"
                      onClick={() => handleCopyPatientAccount(getPatientRefundAccount(refundTarget))}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      {copiedPatientAccount === getPatientRefundAccount(refundTarget) ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>تم النسخ بنجاح!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>نسخ رقم الحساب</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  يرجى نسخ رقم حساب المريض أعلاه لتحويل وإرجاع المبلغ إليه مباشرة عبر تطبيق الكريمي أو المحفظة.
                </p>
              </div>

              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">المريض:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{refundTarget.patientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الخدمة الطبية:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{refundTarget.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المبلغ المدفوع أصلاً:</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    {formatPaymentAmount(refundTarget.amount, refundTarget.currency as CurrencyCode)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ المطلوب استرداده ({refundTarget.currency || 'YER'})
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={refundTarget.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب الاسترداد والتوثيق الإداري
                </label>
                <textarea
                  rows={3}
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  disabled={isProcessingRefund}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingRefund ? 'جارٍ تنفيذ الاسترداد...' : 'اعتماد وتنفيذ الاسترداد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RECEIPT VIEW & PRINT */}
      {/* ========================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-start">
            <div className="p-5 bg-gradient-to-r from-emerald-700 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">سند قبض إلكتروني ضريبي</h3>
                  <p className="text-xs text-emerald-100">وثيقة إثبات سداد معتمدة من المنصة الطبية</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-bold">رقم السند:</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                    {selectedReceipt.receiptNumber || selectedReceipt.transactionReference || selectedReceipt.id}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">اسم المريض:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{selectedReceipt.patientName}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">الخدمة الطبية:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReceipt.serviceName}</span>
                </div>

                {selectedReceipt.doctorName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">الطبيب الاستشاري:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReceipt.doctorName}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">مزود ووسيلة السداد:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedReceipt.paymentProvider === 'KURAIMI' ? 'بنك الكريمي (Al-Kuraimi API)' : selectedReceipt.paymentMethod}
                    {selectedReceipt.kuraimiAccount ? ` (${selectedReceipt.kuraimiAccount})` : ''}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">تاريخ ووقت التحصيل:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(selectedReceipt.paidAt || selectedReceipt.createdAt).toLocaleString('ar-YE')}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
                  <strong className="text-slate-900 dark:text-slate-100">المبلغ الإجمالي المحصل:</strong>
                  <strong className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {formatPaymentAmount(selectedReceipt.amount, selectedReceipt.currency as CurrencyCode)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
