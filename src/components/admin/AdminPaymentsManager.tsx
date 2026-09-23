// @ts-nocheck
// React is installed without its TypeScript declarations in this project.
// @ts-expect-error: allow the existing runtime-only React dependency.
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
  Building2,
  Eye,
  Loader2,
  Smartphone
} from 'lucide-react';
import { 
  Payment, 
  Refund, 
  CurrencyCode, 
  PaymentSettings, 
  PaymentLedgerEntry, 
  PaymentProviderType,
  PaymentMethod,
  HospitalPaymentAccounts,
  HospitalAccountConfig,
  KuraimiHospitalAccountConfig
} from '../../types/medical';
import { api } from '../../services/api';
import { 
  formatPaymentAmount, 
  getProviderDisplayName, 
  SUPPORTED_CURRENCIES,
  DEFAULT_PAYMENT_SETTINGS
} from '../../utils/paymentUtils';

interface AdminPaymentsManagerProps {
  onShowNotification?: (type: 'success' | 'error', text: string) => void;
  initialSubTab?: 'TRANSACTIONS' | 'LEDGER' | 'SETTINGS';
}

export const AdminPaymentsManager = ({
  onShowNotification,
  initialSubTab
}: AdminPaymentsManagerProps) => {
  // Navigation Tabs
  const [subTab, setSubTab] = useState<'TRANSACTIONS' | 'LEDGER' | 'SETTINGS'>(initialSubTab || 'TRANSACTIONS');

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
      if (initialSubTab === 'LEDGER') {
        loadLedger();
      }
    }
  }, [initialSubTab]);

  // Transactions State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PAYMENT_SUCCESS' | 'PENDING' | 'PAYMENT_REQUIRED' | 'REFUNDED' | 'FAILED' | 'WAIVED'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'YER' | 'USD' | 'SAR'>('ALL');
  const [providerFilter, setProviderFilter] = useState<'ALL' | 'KURAIMI' | 'VISA_MASTERCARD' | 'MADA' | 'APPLE_PAY' | 'CASH' | 'WAIVED'>('ALL');

  // Ledger State
  const [ledgerData, setLedgerData] = useState<{
    summaries: Record<CurrencyCode, { gross: number; fees: number; net: number; refunded: number; count: number; settledCount?: number; pendingCount?: number }>;
    entries: PaymentLedgerEntry[];
  }>({
    summaries: {
      YER: { gross: 0, fees: 0, net: 0, refunded: 0, count: 0, settledCount: 0, pendingCount: 0 },
      USD: { gross: 0, fees: 0, net: 0, refunded: 0, count: 0, settledCount: 0, pendingCount: 0 },
      SAR: { gross: 0, fees: 0, net: 0, refunded: 0, count: 0, settledCount: 0, pendingCount: 0 }
    },
    entries: []
  });
  const [isLedgerLoading, setIsLedgerLoading] = useState<boolean>(false);

  // Ledger Filters and Actions State
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>('');
  const [ledgerCurrencyFilter, setLedgerCurrencyFilter] = useState<'ALL' | 'YER' | 'USD' | 'SAR'>('ALL');
  const [ledgerSettlementFilter, setLedgerSettlementFilter] = useState<'ALL' | 'PENDING' | 'SETTLED' | 'REFUNDED'>('ALL');
  const [isSettlingId, setIsSettlingId] = useState<string | null>(null);
  const [isBatchSettling, setIsBatchSettling] = useState<boolean>(false);
  const [selectedVoucherEntry, setSelectedVoucherEntry] = useState<PaymentLedgerEntry | null>(null);
  const [showFullReportModal, setShowFullReportModal] = useState<boolean>(false);

  // Settings State
  const [settings, setSettings] = useState<PaymentSettings>({
    ...DEFAULT_PAYMENT_SETTINGS,
    hospitalAccounts: {
      ...DEFAULT_PAYMENT_SETTINGS.hospitalAccounts!
    }
  });
  const [isSettingsLoading, setIsSettingsLoading] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Helper for updating hospital accounts
  const updateHospitalAccount = <K extends keyof HospitalPaymentAccounts>(
    provider: K,
    field: string,
    value: any
  ) => {
    setSettings((prev: PaymentSettings) => {
      const currentAccounts = prev.hospitalAccounts || DEFAULT_PAYMENT_SETTINGS.hospitalAccounts!;
      const currentProviderConfig = (currentAccounts[provider] || (DEFAULT_PAYMENT_SETTINGS.hospitalAccounts as any)[provider]) as any;
      return {
        ...prev,
        hospitalAccounts: {
          ...currentAccounts,
          [provider]: {
            ...currentProviderConfig,
            [field]: value
          }
        }
      };
    });
  };

  // Refund Modal State
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState<string>('طلب المريض إلغاء الموعد بناءً على السياسة الطبية');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [isProcessingRefund, setIsProcessingRefund] = useState<boolean>(false);

  // Selected Receipt for Viewing/Printing
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  // Manual Payment Approval State (Bank Transfer Notice / Pending)
  const [approvingPaymentId, setApprovingPaymentId] = useState<string | null>(null);
  const [selectedNoticePayment, setSelectedNoticePayment] = useState<Payment | null>(null);

  const handleApprovePayment = async (payment: Payment) => {
    setApprovingPaymentId(payment.id);
    try {
      await api.approvePayment(payment.id, 'الإدارة المالية والمحاسبة', payment);
      // Optimistic update of local state so the table immediately updates
      setPayments(prev => prev.map(p => (p.id === payment.id || (payment.transactionReference && p.transactionReference === payment.transactionReference)) ? {
        ...p,
        status: 'PAYMENT_SUCCESS',
        paymentStatus: 'PAID',
        paidAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        confirmedBy: 'الإدارة المالية والمحاسبة',
        isApprovedByAdmin: true
      } : p));
      if (onShowNotification) {
        onShowNotification(
          'success',
          `تم اعتماد السداد بنجاح للعملية (${payment.transactionReference || payment.id}) للمريض ${payment.patientName || ''}. تم تحديث الحالة في واجهات الطبيب وخدمة العملاء إلى "تم التسديد ✓".`
        );
      }
      if (selectedNoticePayment?.id === payment.id) {
        setSelectedNoticePayment(null);
      }
      await loadPayments();
      await loadLedger();
    } catch (err: any) {
      console.error('Failed to approve payment:', err);
      if (onShowNotification) {
        onShowNotification('error', err.message || 'فشل اعتماد السداد، يرجى إعادة المحاولة.');
      }
    } finally {
      setApprovingPaymentId(null);
    }
  };

  useEffect(() => {
    loadPayments();
    loadLedger();
    loadSettings();

    // Real-time synchronization from Firebase and events
    const unsubscribe = api.subscribePayments({}, (updatedPayments) => {
      if (updatedPayments && updatedPayments.length > 0) {
        setPayments(updatedPayments);
      }
    });

    const handlePaymentsUpdated = () => {
      loadPayments();
      loadLedger();
    };

    window.addEventListener('mch_payments_updated', handlePaymentsUpdated);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      window.removeEventListener('mch_payments_updated', handlePaymentsUpdated);
    };
  }, []);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPayments();
      setPayments(res || []);
    } catch (err) {
      console.error('Failed to load payments for admin:', err);
    } finally {
      setIsLoading(false);
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

  const handleSettleEntry = async (entry: PaymentLedgerEntry) => {
    setIsSettlingId(entry.id);
    try {
      await api.settlePayment(entry.id);
      if (onShowNotification) {
        onShowNotification('success', `تمت تسوية القيد (${entry.id}) بنجاح ومطابقته بالحساب البنكي.`);
      }
      await loadLedger();
      await loadPayments();
    } catch (err: any) {
      console.error('Failed to settle entry:', err);
      if (onShowNotification) {
        onShowNotification('error', err.message || 'فشلت تسوية القيد.');
      }
    } finally {
      setIsSettlingId(null);
    }
  };

  const handleBatchSettle = async (pendingList: PaymentLedgerEntry[]) => {
    if (!pendingList || pendingList.length === 0) {
      if (onShowNotification) {
        onShowNotification('error', 'لا توجد قيود معلقة بحاجة للتسوية حالياً.');
      }
      return;
    }

    setIsBatchSettling(true);
    try {
      const res = await api.batchSettlePayments(pendingList.map((e) => e.id));
      if (onShowNotification) {
        onShowNotification(
          'success',
          `تمت تسوية ومطابقة ${res.settledCount} قيد محاسبي بنجاح.`
        );
      }
      await loadLedger();
      await loadPayments();
    } catch (err: any) {
      console.error('Batch settlement failed:', err);
      if (onShowNotification) {
        onShowNotification('error', 'حدث خطأ أثناء تنفيذ عملية التسوية الجماعية.');
      }
    } finally {
      setIsBatchSettling(false);
    }
  };

  const loadSettings = async () => {
    setIsSettingsLoading(true);
    try {
      const res = await api.getPaymentSettings();
      if (res && res.defaultCurrency) {
        setSettings({
          ...DEFAULT_PAYMENT_SETTINGS,
          ...res,
          hospitalAccounts: {
            ...DEFAULT_PAYMENT_SETTINGS.hospitalAccounts!,
            ...(res.hospitalAccounts || {})
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
  };

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;

    setIsProcessingRefund(true);
    try {
      await api.processRefund(refundTarget.id, {
        amount: Number(refundAmount),
        reason: refundReason,
        processedBy: 'Super Admin / Financial Controller',
        payment: refundTarget,
        paymentId: refundTarget.id,
        transactionReference: refundTarget.transactionReference,
        serviceReferenceId: refundTarget.serviceReferenceId || refundTarget.appointmentId || refundTarget.consultationId,
        serviceType: refundTarget.serviceType,
        patientId: refundTarget.patientId,
        patientName: refundTarget.patientName,
        patientPhone: refundTarget.patientPhone,
        currency: refundTarget.currency
      });

      // Optimistically update local state for immediate UI reflection
      setPayments(prev => prev.map(p => {
        if (p.id === refundTarget.id || (p.transactionReference && p.transactionReference === refundTarget.transactionReference)) {
          return {
            ...p,
            status: 'REFUNDED',
            paymentStatus: 'REFUNDED',
            refundAmount: Number(refundAmount),
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      }));

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
  const isRefunded = (p: Payment) => p.status === 'REFUNDED' || p.paymentStatus === 'REFUNDED';
  const isPaid = (p: Payment) => !isRefunded(p) && (p.status === 'PAID' || p.status === 'PAYMENT_SUCCESS' || p.paymentStatus === 'PAID' || p.paymentStatus === 'PAYMENT_SUCCESS');
  const isPending = (p: Payment) => !isRefunded(p) && (p.status === 'PENDING' || p.status === 'PAYMENT_REQUIRED' || p.paymentStatus === 'PENDING' || p.paymentStatus === 'PAYMENT_REQUIRED');

  const yerRevenue = payments
    .filter(p => isPaid(p) && (p.currency === 'YER' || !p.currency))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const usdRevenue = payments
    .filter(p => isPaid(p) && p.currency === 'USD')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const sarRevenue = payments
    .filter(p => isPaid(p) && p.currency === 'SAR')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const paidCount = payments.filter(isPaid).length;
  const pendingCount = payments.filter(isPending).length;
  const refundedCount = payments.filter(isRefunded).length;

  const filteredPayments = payments.filter(p => {
    // Status Filter
    const effectiveStatus = isRefunded(p) ? 'REFUNDED' : (p.status || p.paymentStatus || 'PAYMENT_SUCCESS');
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PAID' && effectiveStatus !== 'PAID' && effectiveStatus !== 'PAYMENT_SUCCESS') return false;
      if (statusFilter === 'PENDING' && effectiveStatus !== 'PENDING' && effectiveStatus !== 'PAYMENT_REQUIRED') return false;
      if (statusFilter === 'REFUNDED' && effectiveStatus !== 'REFUNDED') return false;
      if (statusFilter === 'WAIVED' && effectiveStatus !== 'WAIVED') return false;
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
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
            <span>بنك الكريمي -و المحافظ البنكية</span>
          </p>
        </div>

        {/* USD Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
          {/* Pending Transfer Notices Alert Banner */}
          {payments.some(p => (p.status === 'PENDING' || p.paymentStatus === 'PENDING' || p.status === 'PAYMENT_REQUIRED') && (p.paymentMethod === 'BANK_TRANSFER_NOTICE' || (p as any).bankTransferDetails)) && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-700 dark:text-amber-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950 dark:text-amber-100">
                    تنبيه إشعارات الحوالات البنكية المعلقة (بحاجة للاعتماد المالي)
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    يوجد {payments.filter(p => (p.status === 'PENDING' || p.paymentStatus === 'PENDING' || p.status === 'PAYMENT_REQUIRED') && (p.paymentMethod === 'BANK_TRANSFER_NOTICE' || (p as any).bankTransferDetails)).length} إشعار تحويل بنكي مرسل من المرضى بحاجة لمراجعة السداد والضغط على "اعتماد (تم السداد ✓)".
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                عرض الإشعارات المعلقة فقط
              </button>
            </div>
          )}

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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">سجل المعاملات والعمليات المالية الموثقة</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                إجمالي النتائج: {filteredPayments.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
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
                          {p.patientPhone && <span className="text-[10px] text-slate-400 font-mono">{p.patientPhone}</span>}
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-blue-600 dark:text-slate-200 block">{p.serviceName}</span>
                          {p.doctorName && <span className="text-[11px] text-emerald-600 block">{p.doctorName}</span>}
                        </td>

                        <td className="p-3.5">
                          <strong className="font-mono text-sm text-blue-900 dark:text-slate-100">
                            {formatPaymentAmount(p.amount, p.currency as CurrencyCode)}
                          </strong>
                          <span className="text-[10px] text-slate-400 block font-bold">
                            {p.currency || 'YER'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[11px] inline-flex items-center gap-1 text-slate-800 dark:text-slate-200">
                              {p.paymentMethod === 'BANK_TRANSFER_NOTICE' || (p as any).bankTransferDetails ? (
                                <>
                                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>إشعار تحويل بنكي</span>
                                </>
                              ) : p.paymentProvider === 'KURAIMI' || p.paymentMethod?.includes('KURAIMI') ? (
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
                            {p.bankTransferDetails?.transferNoticeNumber && (
                              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono block font-medium">
                                إشعار #{p.bankTransferDetails.transferNoticeNumber} ({p.bankTransferDetails.bankName || 'بنك'})
                              </span>
                            )}
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
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black inline-flex items-center gap-1 ${
                            p.status === 'PAID' || p.status === 'PAYMENT_SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : p.status === 'REFUNDED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : p.status === 'WAIVED'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : (p.status === 'PENDING' || p.status === 'PAYMENT_REQUIRED') && (p.paymentMethod === 'BANK_TRANSFER_NOTICE' || (p as any).bankTransferDetails)
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {(p.status === 'PAID' || p.status === 'PAYMENT_SUCCESS') && <><Check className="w-3 h-3" /> تم الدفع بنجاح (تم التسديد)</>}
                            {p.status === 'REFUNDED' && <><RotateCcw className="w-3 h-3" /> مسترد ({formatPaymentAmount(p.refundAmount || p.amount, p.currency as CurrencyCode)})</>}
                            {p.status === 'WAIVED' && <><CheckCircle2 className="w-3 h-3" /> إعفاء خيري</>}
                            {(p.status === 'PENDING' || p.status === 'PAYMENT_REQUIRED') && (
                              p.paymentMethod === 'BANK_TRANSFER_NOTICE' || (p as any).bankTransferDetails ? (
                                <><Clock className="w-3 h-3 text-amber-700" /> إشعار بانتظار الاعتماد</>
                              ) : (
                                <><Clock className="w-3 h-3" /> بانتظار السداد</>
                              )
                            )}
                            {p.status === 'FAILED' && <><X className="w-3 h-3" /> فشل الدفع</>}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Action: Approve Manual / Bank Transfer Notice */}
                            {(p.status === 'PENDING' || p.status === 'PAYMENT_REQUIRED' || p.paymentStatus === 'PENDING') && (
                              <button
                                onClick={() => handleApprovePayment(p)}
                                disabled={approvingPaymentId === p.id}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] inline-flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                title="اعتماد استلام الحوالة وتأكيد (تم السداد ✓)"
                              >
                                {approvingPaymentId === p.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>اعتماد (تم السداد ✓)</span>
                              </button>
                            )}

                            {/* View Notice Details Button */}
                            {(p.bankTransferDetails || p.paymentMethod === 'BANK_TRANSFER_NOTICE') && (
                              <button
                                onClick={() => setSelectedNoticePayment(p)}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 transition-colors cursor-pointer"
                                title="عرض تفاصيل إشعار التحويل البنكي"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedReceipt(p)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 transition-colors cursor-pointer"
                              title="معاينة وطباعة الفاتورة وسند القبض"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {(p.status === 'PAID' || p.status === 'PAYMENT_SUCCESS') && (
                              <button
                                onClick={() => handleOpenRefundModal(p)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 transition-colors cursor-pointer"
                                title="استرداد المبلغ (Refund)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
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
      {/* SUB-TAB 2: ACCOUNTING LEDGER & SETTLEMENTS */}
      {/* ========================================================= */}
      {subTab === 'LEDGER' && (() => {
        const filteredLedgerEntries = ledgerData.entries.filter((entry) => {
          if (ledgerSearchQuery.trim()) {
            const q = ledgerSearchQuery.toLowerCase();
            const matchId = entry.id?.toLowerCase().includes(q);
            const matchPatient = entry.patientName?.toLowerCase().includes(q);
            const matchRef = entry.transactionReference?.toLowerCase().includes(q) || (entry as any).serviceReferenceId?.toLowerCase().includes(q);
            const matchDesc = (entry as any).description?.toLowerCase().includes(q) || entry.serviceName?.toLowerCase().includes(q);
            if (!matchId && !matchPatient && !matchRef && !matchDesc) return false;
          }

          if (ledgerCurrencyFilter !== 'ALL' && entry.currency !== ledgerCurrencyFilter) {
            return false;
          }

          if (ledgerSettlementFilter !== 'ALL') {
            if (ledgerSettlementFilter === 'PENDING' && entry.settlementStatus !== 'PENDING') return false;
            if (ledgerSettlementFilter === 'SETTLED' && entry.settlementStatus !== 'SETTLED') return false;
            if (ledgerSettlementFilter === 'REFUNDED' && entry.settlementStatus !== 'REFUNDED' && entry.status !== 'REFUNDED') return false;
          }

          return true;
        });

        const pendingEntries = filteredLedgerEntries.filter(
          (e) => e.settlementStatus === 'PENDING' && e.status !== 'REFUNDED'
        );

        return (
          <div className="space-y-6">
            {/* Top Summary Cards Per Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['YER', 'USD', 'SAR'] as CurrencyCode[]).map((curr) => {
                const summary = ledgerData.summaries[curr] || { gross: 0, fees: 0, net: 0, refunded: 0, count: 0 };
                const info = SUPPORTED_CURRENCIES[curr];
                const currEntries = ledgerData.entries.filter(e => e.currency === curr);
                const currSettled = currEntries.filter(e => e.settlementStatus === 'SETTLED').length;
                const currPending = currEntries.filter(e => e.settlementStatus === 'PENDING' && e.status !== 'REFUNDED').length;

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
                        <strong className="font-mono text-slate-900 dark:text-slate-100 font-bold">
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

                      {/* Mini Settlement Counts */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>تمت التسوية: {currSettled}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>بانتظار التسوية: {currPending}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ledger Toolbar & Settlement Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    placeholder="بحث في دفتر الأستاذ برقم القيد، المريض، رقم المرجع، أو الخدمة..."
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-emerald-500"
                  />
                  {ledgerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLedgerSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Actions: Batch Settlement & Print */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBatchSettle(pendingEntries)}
                    disabled={isBatchSettling || pendingEntries.length === 0}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs disabled:opacity-40 cursor-pointer transition-all"
                  >
                    {isBatchSettling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>تسوية كافة المعلق ({pendingEntries.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFullReportModal(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-200" />
                    <span>طباعة كشف التسوية والمطابقة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { loadLedger(); loadPayments(); }}
                    disabled={isLedgerLoading}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    title="تحديث البيانات"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLedgerLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                {/* Currency Filter */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px] font-bold ml-1">العملة:</span>
                  {(['ALL', 'YER', 'USD', 'SAR'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setLedgerCurrencyFilter(curr)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        ledgerCurrencyFilter === curr
                          ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {curr === 'ALL' ? 'كافة العملات' : curr}
                    </button>
                  ))}
                </div>

                {/* Settlement Filter */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px] font-bold ml-1">التسوية:</span>
                  {(
                    [
                      { id: 'ALL', label: `الكل (${ledgerData.entries.length})` },
                      { id: 'PENDING', label: `بانتظار التسوية (${ledgerData.entries.filter(e => e.settlementStatus === 'PENDING' && e.status !== 'REFUNDED').length})` },
                      { id: 'SETTLED', label: `تمت التسوية (${ledgerData.entries.filter(e => e.settlementStatus === 'SETTLED').length})` },
                      { id: 'REFUNDED', label: 'مسترد' }
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLedgerSettlementFilter(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        ledgerSettlementFilter === item.id
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ledger Journal Entries Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    دفتر الأستاذ والقيود المحاسبية ومطابقة التسويات
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    المعروض: {filteredLedgerEntries.length} قيد
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5">رقم القيد والتاريخ</th>
                      <th className="p-3.5">نوع القيد</th>
                      <th className="p-3.5">المريض والخدمة</th>
                      <th className="p-3.5">المبلغ الإجمالي (Gross)</th>
                      <th className="p-3.5">العمولة (Fee)</th>
                      <th className="p-3.5">الصافي (Net)</th>
                      <th className="p-3.5">مزود الدفع</th>
                      <th className="p-3.5">حالة التسوية</th>
                      <th className="p-3.5 text-center">إجراءات التسوية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLedgerEntries.length > 0 ? (
                      filteredLedgerEntries.map((entry, idx) => (
                        <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <strong className="block font-mono text-slate-900 dark:text-slate-100">{entry.id}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(entry.createdAt).toLocaleString('ar-YE')}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              entry.entryType === 'CREDIT_COLLECTION' || entry.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {entry.entryType === 'CREDIT_COLLECTION' || entry.status === 'SUCCESS'
                                ? '+ تحصيل إيراد'
                                : '- استرداد مالي'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {entry.patientName || 'المريض'}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {(entry as any).description || entry.serviceName || 'خدمة طبية'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Ref: {entry.transactionReference || (entry as any).serviceReferenceId}
                            </span>
                          </td>

                          <td className="p-3.5 font-mono text-slate-900 dark:text-slate-100 font-bold">
                            {formatPaymentAmount(entry.grossAmount, entry.currency)}
                          </td>

                          <td className="p-3.5 font-mono text-rose-600">
                            {entry.gatewayFee || (entry as any).feeAmount
                              ? `- ${formatPaymentAmount(entry.gatewayFee || (entry as any).feeAmount, entry.currency)}`
                              : '0.00'}
                          </td>

                          <td className="p-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-black">
                            {formatPaymentAmount(entry.netAmount, entry.currency)}
                          </td>

                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-800 dark:text-slate-200">
                              {entry.provider === 'KURAIMI' ? 'بنك الكريمي' : entry.provider}
                            </span>
                          </td>

                          <td className="p-3.5">
                            {entry.settlementStatus === 'SETTLED' ? (
                              <div className="space-y-0.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>تمت التسوية</span>
                                </span>
                                {entry.settledAt && (
                                  <span className="text-[9px] text-slate-400 block font-mono">
                                    {new Date(entry.settledAt).toLocaleDateString('ar-YE')}
                                  </span>
                                )}
                              </div>
                            ) : entry.status === 'REFUNDED' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center gap-1">
                                <span>مسترد</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>قيد المقاصة</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {entry.settlementStatus !== 'SETTLED' && entry.status !== 'REFUNDED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleSettleEntry(entry)}
                                  disabled={isSettlingId === entry.id}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs cursor-pointer transition-all disabled:opacity-50"
                                >
                                  {isSettlingId === entry.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  <span>تسوية القيد</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedVoucherEntry(entry)}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200/60 flex items-center gap-1 cursor-pointer transition-all"
                                  title="عرض إشعار التسوية الرسمية"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>سند التسوية</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          {isLedgerLoading ? 'جارٍ تحميل وتحديث دفتر الأستاذ...' : 'لا توجد قيود مسجلة مطابقة لمعايير البحث الحالية.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* SUB-TAB 3: PAYMENT SETTINGS & PROVIDER GATEWAYS */}
      {/* ========================================================= */}
      {subTab === 'SETTINGS' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* General Currency & VAT Configurations */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                إعدادات العملات والسياسات المالية للمنصة
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  العملة الافتراضية للمنصة (Default Currency)
                </label>
                <select
                  value={settings.defaultCurrency}
                  onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value as CurrencyCode })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="YER">YER — الريال اليمني (الرسمي)</option>
                  <option value="USD">USD — الدولار الأمريكي</option>
                  <option value="SAR">SAR — الريال السعودي</option>
                </select>
              </div>

<div>
  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
    نسبة ضريبة القيمة المضافة (VAT %)
  </label>

  <input
    type="text"
    inputMode="decimal"
    value={String(settings.vatPercentage ?? "")}
    onChange={(e) => {
      const value = e.target.value
        .replace(/[^\d.]/g, "")
        .replace(/(\..*)\./g, "$1");

      setSettings({
        ...settings,
        vatPercentage: value === "" ? 0 : Number(value),
      });
    }}
    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-200 text-xs font-bold font-mono outline-none"
    placeholder="مثال: 15"
  />
</div>

<div>
  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
    عمولة بوابات الدفع التقديرية (Fee %)
  </label>

  <input
    type="text"
    inputMode="decimal"
    value={String(settings.gatewayFeePercentage ?? "")}
    onChange={(e) => {
      const value = e.target.value
        .replace(/[^\d.]/g, "")
        .replace(/(\..*)\./g, "$1");

      setSettings({
        ...settings,
        gatewayFeePercentage: value === "" ? 0 : Number(value),
      });
    }}
    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-200 text-xs font-bold font-mono outline-none"
    placeholder="مثال: 2.5"
  />
</div>
            </div>
          </div>

          {/* Provider 1: Al-Kuraimi Payment Integration (بنك الكريمي) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>تكامل بنك الكريمي للتمويل الأصغر الإسلامي (Kuraimi API)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      مزود الدفع المحلي المعتمد
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الربط المباشر مع خدمات حاسب، إكسبرس، والكريمي جوال للدفع الفوري بالريال اليمني والدولار والريال السعودي.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">البيئة:</span>
                <select
                  value={settings.kuraimi.environment}
                  onChange={(e) => setSettings({
                    ...settings,
                    kuraimi: { ...settings.kuraimi, environment: e.target.value as any }
                  })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-200 outline-none"
                >
                  <option value="LIVE">الإنتاج المباشر (Production LIVE)</option>
                  <option value="SANDBOX">بيئة الاختبار (Sandbox Test)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رمز التاجر لدى بنك الكريمي (Merchant Service Code / ID)
                </label>
                <input
                  type="text"
                  required
                  value={settings.kuraimi.merchantId}
                  onChange={(e) => setSettings({
                    ...settings,
                    kuraimi: { ...settings.kuraimi, merchantId: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 dark:border-slate-200 bg-slate-50 dark:bg-slate-200 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  معرف نقطة البيع / الطرفية (Terminal ID)
                </label>
                <input
                  type="text"
                  required
                  value={settings.kuraimi.terminalId}
                  onChange={(e) => setSettings({
                    ...settings,
                    kuraimi: { ...settings.kuraimi, terminalId: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 dark:border-slate-200 bg-slate-50 dark:bg-slate-200 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  مفتاح الخدمة العام (API Service Key)
                </label>
                <input
                  type="text"
                  value={settings.kuraimi.serviceKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    kuraimi: { ...settings.kuraimi, serviceKey: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 dark:border-slate-200 bg-slate-50 dark:bg-slate-200 text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  المفتاح السري المشفر (Secret Token - Server Only)
                </label>
                <input
                  type="password"
                  value={settings.kuraimi.serviceSecret}
                  onChange={(e) => setSettings({
                    ...settings,
                    kuraimi: { ...settings.kuraimi, serviceSecret: e.target.value }
                  })}
                  placeholder="••••••••••••••••••••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-200 text-xs font-mono outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * يتم حفظ المفاتيح الحساسة في طبقة الخادم فقط دون كشفها للمتصفح.
                </span>
              </div>
            </div>

            {/* Webhook notification URL preview */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  رابط الاستجابة والإشعارات الفورية (Webhook Callback Endpoint)
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-mono break-all">
                  {window.location.origin}/api/payments/webhook/KURAIMI
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyWebhook(`${window.location.origin}/api/payments/webhook/KURAIMI`, 'kuraimi_webhook')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedKey === 'kuraimi_webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'kuraimi_webhook' ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>

          {/* Dedicated Section: Hospital Official Collection Accounts (Kuraimi, OneCash, Mahfazati, Jeeb, Floosak) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-600/40 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>حسابات ومحافظ التحصيل الإلكتروني المعتمدة للعيادة</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      تظهر للمرضى عند الحجز والاستشارة
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    أرقام حسابات العيادة الرسمية التي يدخلها الأدمين وتظهر مباشرة للمرضى عند حجز موعد أو طلب استشارة للسداد عبر المحافظ (وان كاش، محفظتي، جيب، وفلوسك)، بينما يعمل بنك الكريمي عبر بوابة الدفع الإلكتروني المباشر (Kuraimi API).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. OneCash Hospital Account */}
              <div className="p-5 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500 text-white">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950 dark:text-amber-100">
                        1. محفظة وان كاش (OneCash)
                      </h4>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                        محفظة التحصيل السريع
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-800 dark:text-amber-300">
                    <input
                      type="checkbox"
                      checked={settings.hospitalAccounts?.oneCash?.isActive ?? true}
                      onChange={(e) => updateHospitalAccount('oneCash', 'isActive', e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                    />
                    <span>مفعّل للمرضى</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم حساب / هاتف وان كاش للعيادة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.hospitalAccounts?.oneCash?.accountNumber || ''}
                      onChange={(e) => updateHospitalAccount('oneCash', 'accountNumber', e.target.value)}
                      placeholder="مثال: 777123456"
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم الحساب المعتمد لدى وان كاش
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalAccounts?.oneCash?.accountName || ''}
                      onChange={(e) => updateHospitalAccount('oneCash', 'accountName', e.target.value)}
                      placeholder="مثال: عيادة د/وهاج الطبي التخصصي"
                      className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ملاحظات وتوجيهات التحويل للمريض
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalAccounts?.oneCash?.notes || ''}
                      onChange={(e) => updateHospitalAccount('oneCash', 'notes', e.target.value)}
                      placeholder="التحويل المباشر من تطبيق وان كاش لرقم المحفظة"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Mahfazati Hospital Account */}
              <div className="p-5 rounded-2xl border border-purple-300 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-purple-200 dark:border-purple-800/60">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-600 text-white">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-purple-950 dark:text-purple-100">
                        2. محفظة محفظتي (Mahfazati)
                      </h4>
                      <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold">
                        محفظة بنك اليمن الدولي
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-purple-800 dark:text-purple-300">
                    <input
                      type="checkbox"
                      checked={settings.hospitalAccounts?.mahfazati?.isActive ?? true}
                      onChange={(e) => updateHospitalAccount('mahfazati', 'isActive', e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span>مفعّل للمرضى</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم حساب / هاتف محفظتي للعيادة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.hospitalAccounts?.mahfazati?.accountNumber || ''}
                      onChange={(e) => updateHospitalAccount('mahfazati', 'accountNumber', e.target.value)}
                      placeholder="مثال: 778901234"
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم الحساب المعتمد لدى محفظتي
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalAccounts?.mahfazati?.accountName || ''}
                      onChange={(e) => updateHospitalAccount('mahfazati', 'accountName', e.target.value)}
                      placeholder="مثال: عيادة د/وهاج الطبي التخصصي"
                      className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ملاحظات وتوجيهات التحويل للمريض
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalAccounts?.mahfazati?.notes || ''}
                      onChange={(e) => updateHospitalAccount('mahfazati', 'notes', e.target.value)}
                      placeholder="التحويل المباشر من تطبيق محفظتي إلى حساب العيادة"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Jeeb Hospital Account */}
              <div className="p-5 rounded-2xl border border-sky-300 dark:border-sky-800/80 bg-sky-50/40 dark:bg-sky-950/20 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-sky-800/60">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-sky-600 text-white">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-sky-950 dark:text-sky-100">
                        3. محفظة جيب (Jeeb)
                      </h4>
                      <span className="text-[10px] text-sky-700 dark:text-sky-400 font-bold">
                        محفظة بنك التضامن
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-sky-800 dark:text-sky-300">
                    <input
                      type="checkbox"
                      checked={settings.hospitalAccounts?.jeeb?.isActive ?? true}
                      onChange={(e) => updateHospitalAccount('jeeb', 'isActive', e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <span>مفعّل للمرضى</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم حساب / هاتف محفظة جيب العيادة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.hospitalAccounts?.jeeb?.accountNumber || ''}
                      onChange={(e) => updateHospitalAccount('jeeb', 'accountNumber', e.target.value)}
                      placeholder="مثال: 773456789"
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم الحساب المعتمد لدى جيب
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalAccounts?.jeeb?.accountName || ''}
                      onChange={(e) => updateHospitalAccount('jeeb', 'accountName', e.target.value)}
                      placeholder="مثال: عيادة د/وهاج الطبي التخصصي"
                      className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ملاحظات وتوجيهات التحويل للمريض
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalAccounts?.jeeb?.notes || ''}
                      onChange={(e) => updateHospitalAccount('jeeb', 'notes', e.target.value)}
                      placeholder="التحويل المباشر من تطبيق جيب (بنك التضامن)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Floosak Hospital Account */}
              <div className="p-5 rounded-2xl border border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3.5 md:col-span-2">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-200 dark:border-indigo-800/60">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-600 text-white">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-100">
                        4. محفظة فلوسك (Floosak)
                      </h4>
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold">
                        محفظة بنك اليمن والكويت
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-800 dark:text-indigo-300">
                    <input
                      type="checkbox"
                      checked={settings.hospitalAccounts?.floosak?.isActive ?? true}
                      onChange={(e) => updateHospitalAccount('floosak', 'isActive', e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>مفعّل للمرضى</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم حساب / هاتف فلوسك للعيادة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.hospitalAccounts?.floosak?.accountNumber || ''}
                      onChange={(e) => updateHospitalAccount('floosak', 'accountNumber', e.target.value)}
                      placeholder="مثال: 774567890"
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم الحساب المعتمد لدى فلوسك
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalAccounts?.floosak?.accountName || ''}
                      onChange={(e) => updateHospitalAccount('floosak', 'accountName', e.target.value)}
                      placeholder="مثال: عيادة د/وهاج الطبي التخصصي"
                      className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ملاحظات وتوجيهات التحويل للمريض
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalAccounts?.floosak?.notes || ''}
                      onChange={(e) => updateHospitalAccount('floosak', 'notes', e.target.value)}
                      placeholder="التحويل من تطبيق فلوسك (بنك اليمن والكويت)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-400 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Provider 2: Mastercard & Visa Payment Gateway */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>بوابة البطاقات البنكية الدولية (Mastercard / Visa / Mada)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Payment Gateway & Acquirer
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    دعم الدفع الآمن عبر شبكات فيزا وماستركارد العالمية ومدى بنظام التشفير 3D Secure.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">البيئة:</span>
                <select
                  value={settings.cardGateway.environment}
                  onChange={(e) => setSettings({
                    ...settings,
                    cardGateway: { ...settings.cardGateway, environment: e.target.value as any }
                  })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-400 outline-none"
                >
                  <option value="LIVE">الإنتاج المباشر (Production LIVE)</option>
                  <option value="SANDBOX">بيئة الاختبار (Sandbox Test)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  مزود بوابة البطاقات (Acquirer / Gateway)
                </label>
                <input
                  type="text"
                  value={settings.cardGateway.gatewayProvider}
                  onChange={(e) => setSettings({
                    ...settings,
                    cardGateway: { ...settings.cardGateway, gatewayProvider: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-400 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  معرف التاجر المصرفي (Merchant ID)
                </label>
                <input
                  type="text"
                  value={settings.cardGateway.merchantId}
                  onChange={(e) => setSettings({
                    ...settings,
                    cardGateway: { ...settings.cardGateway, merchantId: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-400 text-xs font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  المفتاح العام (Publishable Key)
                </label>
                <input
                  type="text"
                  value={settings.cardGateway.publishableKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    cardGateway: { ...settings.cardGateway, publishableKey: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-400 text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  المفتاح السري للبوابة (Secret API Key)
                </label>
                <input
                  type="password"
                  value={settings.cardGateway.secretKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    cardGateway: { ...settings.cardGateway, secretKey: e.target.value }
                  })}
                  placeholder="••••••••••••••••••••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-400 text-xs font-mono outline-none"
                />
              </div>
            </div>

            {/* Webhook */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  رابط استلام نتائج المعاملات (Cards Webhook Endpoint)
                </span>
                <span className="text-xs text-blue-700 dark:text-blue-300 font-mono break-all">
                  {window.location.origin}/api/payments/webhook/STRIPE_MASTERCARD_VISA
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyWebhook(`${window.location.origin}/api/payments/webhook/STRIPE_MASTERCARD_VISA`, 'card_webhook')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedKey === 'card_webhook' ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'card_webhook' ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
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
      {/* Bank Transfer Notice Inspection Modal */}
      {selectedNoticePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                    تفاصيل إشعار التحويل البنكي
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    مراجعة إشعار السداد المرسل من المريض لحسابات العيادة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoticePayment(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم المريض:</span>
                <strong className="text-slate-900 dark:text-slate-100">{selectedNoticePayment.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الخدمة الطبية:</span>
                <strong className="text-slate-900 dark:text-slate-100">{selectedNoticePayment.serviceName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المبلغ والعملة:</span>
                <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                  {formatPaymentAmount(selectedNoticePayment.amount, selectedNoticePayment.currency as CurrencyCode)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">البنك / وسيلة التحويل:</span>
                <strong className="text-blue-600 dark:text-blue-400">
                  {selectedNoticePayment.bankTransferDetails?.bankName || 'حساب بنكي'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">اسم المودع / المرسل:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedNoticePayment.bankTransferDetails?.senderName || selectedNoticePayment.patientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الإشعار / المرجع:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {selectedNoticePayment.bankTransferDetails?.transferNoticeNumber || selectedNoticePayment.transactionReference}
                </span>
              </div>
              {selectedNoticePayment.bankTransferDetails?.senderPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">هاتف المودع:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedNoticePayment.bankTransferDetails.senderPhone}
                  </span>
                </div>
              )}
              {selectedNoticePayment.bankTransferDetails?.transferDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">تاريخ التحويل:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedNoticePayment.bankTransferDetails.transferDate}
                  </span>
                </div>
              )}
              {selectedNoticePayment.bankTransferDetails?.notes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block mb-1">ملاحظات المريض:</span>
                  <p className="p-2 bg-white dark:bg-slate-900 rounded-xl text-slate-700 dark:text-slate-300 text-[11px]">
                    {selectedNoticePayment.bankTransferDetails.notes}
                  </p>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">حالة السداد الحالية:</span>
                <span className="font-black text-amber-600 dark:text-amber-400">
                  {selectedNoticePayment.status === 'PAYMENT_SUCCESS' || selectedNoticePayment.paymentStatus === 'PAYMENT_SUCCESS'
                    ? 'معتمد (تم التسديد ✓)'
                    : 'بانتظار الاعتماد المالي'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(selectedNoticePayment.status === 'PENDING' || selectedNoticePayment.paymentStatus === 'PENDING' || selectedNoticePayment.status === 'PAYMENT_REQUIRED') && (
                <button
                  type="button"
                  onClick={() => handleApprovePayment(selectedNoticePayment)}
                  disabled={approvingPaymentId === selectedNoticePayment.id}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {approvingPaymentId === selectedNoticePayment.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>اعتماد السداد وتأكيد (تم السداد ✓)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedNoticePayment(null)}
                className="py-3 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Settlement Voucher Modal */}
      {selectedVoucherEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 mb-2">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">
                عيادة الدكتور وهاج المقطري الاستشارية
              </h3>
              <p className="text-xs text-slate-500">
                قسم الإدارة المالية والمحاسبة • إشعار تسوية ومقاصة بنكية
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[11px] font-mono font-bold">
                سند تسوية رقم: VOUCH-{selectedVoucherEntry.id}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم القيد في دفتر الأستاذ:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {selectedVoucherEntry.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المرجع المالي / العملية:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedVoucherEntry.transactionReference || (selectedVoucherEntry as any).serviceReferenceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تاريخ التسوية والمقاصة:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedVoucherEntry.settledAt
                    ? new Date(selectedVoucherEntry.settledAt).toLocaleString('ar-YE')
                    : new Date(selectedVoucherEntry.createdAt).toLocaleString('ar-YE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المريض:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedVoucherEntry.patientName || 'المريض'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الخدمة الطبية:</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {(selectedVoucherEntry as any).description || selectedVoucherEntry.serviceName || 'استشارة وخدمات طبية'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">البوابة / المزود:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedVoucherEntry.provider === 'KURAIMI' ? 'بنك الكريمي للتمويل الأصغر الإسلامي' : selectedVoucherEntry.provider}
                </span>
              </div>

              {/* Financial Breakdown */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">المبلغ الإجمالي المحصل (Gross):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatPaymentAmount(selectedVoucherEntry.grossAmount, selectedVoucherEntry.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>عمولة البوابة البنكية (Gateway Fee):</span>
                  <span className="font-mono font-bold">
                    - {formatPaymentAmount(selectedVoucherEntry.gatewayFee || (selectedVoucherEntry as any).feeAmount || 0, selectedVoucherEntry.currency)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-700 text-sm">
                  <span className="font-bold text-slate-900 dark:text-slate-100">الصافي المودع بالحساب البنكي (Net):</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {formatPaymentAmount(selectedVoucherEntry.netAmount, selectedVoucherEntry.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Stamps */}
            <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-200/50 text-[11px] text-teal-800 dark:text-teal-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-teal-600" />
              <span>تمت مطابقة هذا القيد وتسويته رسمياً وإيداع صافي المبلغ في حساب العيادة البنكي.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedVoucherEntry(null)}
                className="py-2.5 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Financial Ledger & Settlement Statement Modal */}
      {showFullReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">
                    كشف مطابقة وتسوية دفتر الأستاذ المالي الشامل
                  </h3>
                  <p className="text-xs text-slate-500">
                    عيادة الدكتور وهاج المقطري الاستشارية • تاريخ التقرير: {new Date().toLocaleDateString('ar-YE')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الكشف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullReportModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
              {/* Currency Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['YER', 'USD', 'SAR'] as CurrencyCode[]).map((c) => {
                  const s = ledgerData.summaries[c] || { gross: 0, fees: 0, net: 0, refunded: 0, count: 0 };
                  const info = SUPPORTED_CURRENCIES[c];
                  return (
                    <div key={c} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-slate-700">
                        <span>{info.flagIcon} {info.nameAr} ({c})</span>
                        <span className="font-mono text-slate-500">{s.count} عملية</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>الإجمالي:</span>
                        <span className="font-mono">{formatPaymentAmount(s.gross, c)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>العمولات:</span>
                        <span className="font-mono">- {formatPaymentAmount(s.fees, c)}</span>
                      </div>
                      <div className="flex justify-between font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span>الصافي:</span>
                        <span className="font-mono">{formatPaymentAmount(s.net, c)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Entries Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">رقم القيد</th>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">المريض والخدمة</th>
                      <th className="p-2.5">المزود</th>
                      <th className="p-2.5">الإجمالي</th>
                      <th className="p-2.5">العمولة</th>
                      <th className="p-2.5">الصافي</th>
                      <th className="p-2.5">حالة التسوية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ledgerData.entries.map((entry, idx) => (
                      <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono font-bold">{entry.id}</td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-500">
                          {new Date(entry.createdAt).toLocaleDateString('ar-YE')}
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold block">{entry.patientName || 'مريض'}</span>
                          <span className="text-[10px] text-slate-500">{(entry as any).description || entry.serviceName}</span>
                        </td>
                        <td className="p-2.5">{entry.provider === 'KURAIMI' ? 'بنك الكريمي' : entry.provider}</td>
                        <td className="p-2.5 font-mono font-bold">
                          {formatPaymentAmount(entry.grossAmount, entry.currency)}
                        </td>
                        <td className="p-2.5 font-mono text-rose-600">
                          {entry.gatewayFee ? `- ${formatPaymentAmount(entry.gatewayFee, entry.currency)}` : '0.00'}
                        </td>
                        <td className="p-2.5 font-mono font-black text-emerald-600">
                          {formatPaymentAmount(entry.netAmount, entry.currency)}
                        </td>
                        <td className="p-2.5">
                          {entry.settlementStatus === 'SETTLED' ? (
                            <span className="text-emerald-700 font-bold">تمت التسوية ✓</span>
                          ) : (
                            <span className="text-amber-600 font-bold">قيد المقاصة</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures for audit */}
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs text-slate-600 dark:text-slate-400">
                <div className="p-3 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-bold block text-slate-800 dark:text-slate-200 mb-1">المحاسب المالي</span>
                  <span className="text-[10px] text-slate-400">التوقيع والختم</span>
                </div>
                <div className="p-3 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-bold block text-slate-800 dark:text-slate-200 mb-1">المدير المالي</span>
                  <span className="text-[10px] text-slate-400">التوقيع والختم</span>
                </div>
                <div className="p-3 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-bold block text-slate-800 dark:text-slate-200 mb-1">إدارة العيادة</span>
                  <span className="text-[10px] text-slate-400">الاعتماد النهائي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
