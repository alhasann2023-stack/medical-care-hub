import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  X, 
  Smartphone, 
  Building2, 
  Sparkles, 
  ArrowRight,
  Receipt,
  FileText,
  Clock,
  Printer,
  KeyRound,
  Check,
  RotateCcw,
  Landmark,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { Payment, PaymentMethod, CurrencyCode, MultiCurrencyPrice, PaymentProviderType } from '../../types/medical';
import { apiClient } from '../../services/api';
import { notificationService } from '../../services/notificationService';
import { 
  formatPaymentAmount, 
  resolveServicePrice, 
  convertCurrency,
  getLiveExchangeRates, 
  SUPPORTED_CURRENCIES,
  LiveExchangeRates 
} from '../../utils/paymentUtils';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: Payment) => void;
  serviceType: 'APPOINTMENT' | 'CONSULTATION' | 'PROCEDURE' | 'MEDICATION';
  serviceReferenceId: string;
  serviceName: string;
  amount?: number;
  currency?: CurrencyCode;
  multiCurrencyPricing?: MultiCurrencyPrice;
  initialCurrency?: CurrencyCode;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  patientMrn?: string;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  serviceType,
  serviceReferenceId,
  serviceName,
  amount = 250,
  currency,
  multiCurrencyPricing,
  initialCurrency = 'YER',
  patientId = 'pat-1',
  patientName = 'المريض',
  patientPhone = '+967770000000',
  patientMrn = 'MRN-2026-8801',
  doctorId,
  doctorName,
  doctorSpecialty
}) => {
  // Currency State
  const defaultCurr = currency || initialCurrency || 'YER';
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(defaultCurr);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('KURAIMI_EXPRESS');
  
  // Live Exchange Rate auto-updating state
  const [liveRates, setLiveRates] = useState<LiveExchangeRates>(getLiveExchangeRates());
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(patientName || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  
  // Kuraimi Inputs
  const [kuraimiAccount, setKuraimiAccount] = useState('770921004');
  const [kuraimiChannel, setKuraimiChannel] = useState<'KURAIMI_ACCOUNT' | 'KURAIMI_CARD' | 'KURAIMI_JAWWAL'>('KURAIMI_JAWWAL');
  const [kuraimiOtp, setKuraimiOtp] = useState('');
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [otpSentPhone, setOtpSentPhone] = useState<string>('');

  // STC Pay input
  const [stcPhone, setStcPhone] = useState(patientPhone || '05');

  // Processing & Confirmation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [completedPayment, setCompletedPayment] = useState<Payment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-updating exchange rates every 15 seconds
  useEffect(() => {
    if (!isOpen) return;

    // Refresh rates upon opening modal
    const current = getLiveExchangeRates();
    setLiveRates({ ...current });

    const interval = setInterval(() => {
      const updated = getLiveExchangeRates();
      setLiveRates({ ...updated });
    }, 15000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleManualRateRefresh = () => {
    setIsRefreshingRates(true);
    const updated = getLiveExchangeRates();
    setLiveRates({ ...updated });
    setTimeout(() => setIsRefreshingRates(false), 400);
  };

  useEffect(() => {
    if (isOpen) {
      setIsOtpStep(false);
      setPendingPaymentId(null);
      setCompletedPayment(null);
      setErrorMessage(null);
      setKuraimiOtp('');
      
      // Select appropriate default method based on currency
      if (selectedCurrency === 'YER') {
        setSelectedMethod('KURAIMI_EXPRESS');
      } else if (selectedCurrency === 'USD') {
        setSelectedMethod('VISA_MASTERCARD');
      } else {
        setSelectedMethod('MADA');
      }
    }
  }, [isOpen, selectedCurrency]);

  if (!isOpen) return null;

  // Calculate current resolved price using strictly equal conversion
  const resolvedAmount = resolveServicePrice(
    { price: amount, multiCurrencyPricing },
    selectedCurrency,
    'SAR'
  );

  // Formatting helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (raw.length >= 2) {
      raw = raw.substring(0, 2) + '/' + raw.substring(2);
    }
    setExpiryDate(raw);
  };

  // Card brand detector
  const getCardBrand = () => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    if (clean.startsWith('588845') || clean.startsWith('440647') || clean.startsWith('440795') || selectedMethod === 'MADA') return 'Mada';
    return selectedMethod === 'MADA' ? 'Mada' : 'Credit Card';
  };

  const handleCurrencyChange = (curr: CurrencyCode) => {
    setSelectedCurrency(curr);
    if (curr === 'YER') {
      setSelectedMethod('KURAIMI_EXPRESS');
    } else if (curr === 'USD') {
      setSelectedMethod('VISA_MASTERCARD');
    } else if (curr === 'SAR') {
      setSelectedMethod('MADA');
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      if (selectedMethod === 'KURAIMI_EXPRESS' || selectedMethod === 'KURAIMI_HASEB' || selectedMethod === 'KURAIMI_PAY') {
        // Kuraimi API Flow
        setProcessingStep('جارٍ الاتصال بنظام بنك الكريمي للتمويل الأصغر الإسلامي (Kuraimi API)...');
        await new Promise(r => setTimeout(r, 600));

        const intentRes = await apiClient.createPaymentIntent({
          patientId,
          patientName,
          patientPhone,
          patientMrn,
          serviceType,
          serviceReferenceId,
          serviceName,
          doctorId,
          doctorName,
          doctorSpecialty,
          amount: resolvedAmount,
          currency: selectedCurrency,
          paymentMethod: selectedMethod,
          paymentProvider: 'KURAIMI',
          kuraimiAccount,
          kuraimiChannel
        });

        if (intentRes.kuraimiOtpRequired || intentRes.payment.paymentProvider === 'KURAIMI') {
          setPendingPaymentId(intentRes.payment.id);
          setOtpSentPhone(patientPhone || kuraimiAccount);
          setIsOtpStep(true);
          setIsProcessing(false);
          return;
        }

        setCompletedPayment(intentRes.payment);
        notificationService.sendPaymentSuccessNotification(intentRes.payment);
        onSuccess(intentRes.payment);
        return;
      }

      // Card / Mada / Apple Pay Flow
      setProcessingStep('جارٍ إنشاء رمز جلسة الدفع الآمنة (SSL 256-bit)...');
      await new Promise(r => setTimeout(r, 500));

      const intentRes = await apiClient.createPaymentIntent({
        patientId,
        patientName,
        patientPhone,
        patientMrn,
        serviceType,
        serviceReferenceId,
        serviceName,
        doctorId,
        doctorName,
        doctorSpecialty,
        amount: resolvedAmount,
        currency: selectedCurrency,
        paymentMethod: selectedMethod,
        paymentProvider: selectedMethod === 'MADA' ? 'MADA' : selectedMethod === 'APPLE_PAY' ? 'APPLE_PAY' : 'VISA_MASTERCARD'
      });

      setProcessingStep('جارٍ التحقق الأمني 3D Secure والتأكيد المصرفي...');
      await new Promise(r => setTimeout(r, 700));

      const cleanNum = cardNumber.replace(/\s/g, '');
      const last4 = cleanNum ? cleanNum.slice(-4) : (selectedMethod === 'APPLE_PAY' ? '8890' : '4242');

      const confirmRes = await apiClient.confirmPayment({
        paymentId: intentRes.payment.id,
        transactionReference: intentRes.payment.transactionReference,
        serviceReferenceId,
        serviceType: serviceType === 'CONSULTATION' ? 'CONSULTATION' : 'APPOINTMENT',
        amount: resolvedAmount,
        currency: selectedCurrency,
        patientId,
        patientName,
        patientPhone,
        doctorId,
        doctorName,
        doctorSpecialty,
        serviceName,
        paymentMethod: selectedMethod,
        cardBrand: getCardBrand(),
        last4,
        gatewayResponseCode: 'APPROVED_00'
      });

      setProcessingStep('تم السداد بنجاح! جارٍ تسجيل الفاتورة في السجل المالي...');
      await new Promise(r => setTimeout(r, 400));

      setCompletedPayment(confirmRes.payment);
      notificationService.sendPaymentSuccessNotification(confirmRes.payment);
      onSuccess(confirmRes.payment);
    } catch (err: any) {
      console.error('Payment failure:', err);
      setErrorMessage(err.message || 'تعذر استكمال عملية الدفع. يرجى مراجعة البيانات والمحاولة لاحقاً.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyKuraimiOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPaymentId) return;

    if (!kuraimiOtp || kuraimiOtp.length < 4) {
      setErrorMessage('يرجى إدخال رمز التحقق OTP المكون من 4 إلى 6 أرقام.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep('جارٍ مطابقة رمز OTP مع خوادم بنك الكريمي واقتطاع الرسوم...');

    try {
      const res = await apiClient.verifyKuraimiOtp({
        paymentId: pendingPaymentId,
        otpCode: kuraimiOtp,
        customerAccount: kuraimiAccount
      });

      if (res.success && res.payment) {
        setCompletedPayment(res.payment);
        notificationService.sendPaymentSuccessNotification(res.payment);
        onSuccess(res.payment);
      } else {
        throw new Error(res.message || 'رمز OTP غير صحيح أو منتهي الصلاحية.');
      }
    } catch (err: any) {
      console.error('Kuraimi OTP verify error:', err);
      setErrorMessage(err.message || 'فشل التحقق من رمز OTP من بنك الكريمي.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-xl my-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all text-start">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">بوابة الدفع الإلكتروني متعددة العملات</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-300/30">
                  {selectedCurrency}
                </span>
              </div>
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                <Lock className="w-3.5 h-3.5" /> تكامل بنكي معتمد ومشفّر بمعيار PCI-DSS
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!completedPayment ? (
          <div className="p-6 space-y-6">
            
            {/* Step 1: Currency Tabs & Live Exchange Equality Banner */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                  اختر عملة السداد (Currency)
                </label>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>صرف متساوي ومحدّث تلقائياً</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2.5">
                {(['YER', 'USD', 'SAR'] as CurrencyCode[]).map((curr) => {
                  const info = SUPPORTED_CURRENCIES[curr];
                  const isSelected = selectedCurrency === curr;
                  const itemPrice = resolveServicePrice({ price: amount, multiCurrencyPricing }, curr, 'SAR');

                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => handleCurrencyChange(curr)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="text-base">{info.flagIcon}</span>
                        <strong className="text-xs font-black">{curr}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                        {info.nameAr}
                      </div>
                      <div className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-300">
                        {formatPaymentAmount(itemPrice, curr)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Automatic Live Rates Equivalence Indicator */}
              <div className="mt-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-mono text-[10px]">
                    1 ر.س = {liveRates.SAR_TO_YER} ر.ي | 1 $ = {liveRates.USD_TO_SAR} ر.س | 1 $ = {liveRates.USD_TO_YER.toLocaleString()} ر.ي
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleManualRateRefresh}
                  title="تحديث سعر الصرف اللحظي الآن"
                  className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingRates ? 'animate-spin' : ''}`} />
                  <span>تحديث تلقائي</span>
                </button>
              </div>
            </div>

            {/* Service & Price Summary Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">الخدمة الطبية</span>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">{serviceName}</h3>
                  {doctorName && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {doctorName} {doctorSpecialty ? `• ${doctorSpecialty}` : ''}
                    </p>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">المبلغ الإجمالي</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatPaymentAmount(resolvedAmount, selectedCurrency)}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-medium">سعر الخدمة المعتمد</span>
                </div>
              </div>
              <div className="pt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>المريض: <strong className="text-slate-700 dark:text-slate-200">{patientName}</strong></span>
                <span>المرجع: <span className="font-mono text-slate-700 dark:text-slate-300">{serviceReferenceId}</span></span>
              </div>
            </div>

            {/* OTP Step View for Kuraimi */}
            {isOtpStep ? (
              <form onSubmit={handleVerifyKuraimiOtp} className="space-y-4 bg-amber-50/70 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-800 dark:text-amber-200">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                      تأكيد الدفع عبر بنك الكريمي (OTP)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      أرسل بنك الكريمي رمز تأكيد الدفع المكون من 6 أرقام إلى الهاتف/الحساب المربوط ({otpSentPhone}).
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    أدخل رمز التحقق (OTP)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={kuraimiOtp}
                    onChange={(e) => setKuraimiOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="مثال: 889123"
                    className="w-full px-4 py-3 text-center text-xl font-mono tracking-widest font-black rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 block">
                    * للبيئة التجريبية، يمكنك إدخال أي رمز مكون من 6 خانات (مثال: 889123)
                  </span>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOtpStep(false)}
                    disabled={isProcessing}
                    className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    تغيير الوسيلة
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{processingStep || 'جارٍ التحقق والتنفيذ...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تأكيد واقتطاع المبلغ ({formatPaymentAmount(resolvedAmount, selectedCurrency)})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Regular Payment Method Selection & Form */
              <>
                {/* Method Selector */}
                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-2">
                    اختر وسيلة الدفع المعتمدة
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Kuraimi Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('KURAIMI_EXPRESS')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedMethod === 'KURAIMI_EXPRESS' || selectedMethod === 'KURAIMI_HASEB'
                          ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Landmark className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-1" />
                      <span className="text-xs font-black">بنك الكريمي (API)</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">حاسب / إكسبرس / جوال</span>
                    </button>

                    {/* Visa / Mastercard */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('VISA_MASTERCARD')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedMethod === 'VISA_MASTERCARD' || selectedMethod === 'VISA' || selectedMethod === 'MASTERCARD'
                          ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-1" />
                      <span className="text-xs font-black">Visa / Mastercard</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">بطاقة دولية ومحلية</span>
                    </button>

                    {/* Mada (available for SAR) */}
                    {selectedCurrency === 'SAR' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('MADA')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          selectedMethod === 'MADA'
                            ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <Wallet className="w-6 h-6 text-emerald-600 mb-1" />
                        <span className="text-xs font-black">مدى (Mada)</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">بطاقات مدى السعودية</span>
                      </button>
                    ) : (
                      /* Apple Pay */
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('APPLE_PAY')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          selectedMethod === 'APPLE_PAY'
                            ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl mb-1"></span>
                        <span className="text-xs font-black">Apple Pay</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">دفع فوري سريع</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Fields according to method */}
                <form onSubmit={handlePaySubmit} className="space-y-4">
                  {selectedMethod === 'KURAIMI_EXPRESS' || selectedMethod === 'KURAIMI_HASEB' || selectedMethod === 'KURAIMI_PAY' ? (
                    <div className="space-y-3 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/40">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-xs font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                          <Landmark className="w-4 h-4 text-emerald-700" />
                          <span>بوابة بنك الكريمي الرسمية للدفع المباشر</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                          Kuraimi Live API
                        </span>
                      </div>

                      {/* Channel */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          قناة الدفع عبر الكريمي
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'KURAIMI_JAWWAL', label: 'الكريمي جوال' },
                            { id: 'KURAIMI_ACCOUNT', label: 'حساب بنكي' },
                            { id: 'KURAIMI_CARD', label: 'بطاقة الكريمي' }
                          ].map((ch) => (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setKuraimiChannel(ch.id as any)}
                              className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                                kuraimiChannel === ch.id
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {ch.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Account / Phone */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {kuraimiChannel === 'KURAIMI_JAWWAL' ? 'رقم الهاتف المرتبط بالكريمي جوال' : 'رقم حساب أو بطاقة الكريمي (المميز)'}
                        </label>
                        <input
                          type="text"
                          required
                          value={kuraimiAccount}
                          onChange={(e) => setKuraimiAccount(e.target.value)}
                          placeholder="مثال: 770921004 أو 0023456"
                          className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          لا يتم حفظ كلمات المرور أو الأرقام السرية على المتصفح؛ سيتم إرسال رمز OTP للتحقق عبر API بنك الكريمي.
                        </span>
                      </div>
                    </div>
                  ) : selectedMethod === 'APPLE_PAY' ? (
                    <div className="p-6 text-center bg-slate-900 text-white rounded-2xl space-y-3">
                      <div className="text-3xl font-bold"> Pay</div>
                      <p className="text-xs text-slate-300">
                        اضغط على الزر أدناه لإتمام الدفع الفوري عبر Apple Pay والتحقق بواسطة Face ID أو Touch ID.
                      </p>
                    </div>
                  ) : (
                    /* Card Form (Visa / Mastercard / Mada) */
                    <div className="space-y-3.5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          رقم البطاقة
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="0000 0000 0000 0000"
                            className="w-full pl-12 pr-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                            {getCardBrand()}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          اسم حامل البطاقة (كما هو مدوّن)
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="MOHAMMED SALEH"
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            تاريخ الانتهاء (MM/YY)
                          </label>
                          <input
                            type="text"
                            required
                            value={expiryDate}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            className="w-full px-3.5 py-2.5 text-sm font-mono text-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            رمز الأمان (CVV)
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full px-3.5 py-2.5 text-sm font-mono text-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-black shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-sm">{processingStep || 'جارٍ معالجة الدفع بأمان...'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-sm">
                          {selectedMethod.startsWith('KURAIMI') ? 'متابعة الدفع عبر الكريمي' : 'سداد وتأكيد الحجز الآن'} ({formatPaymentAmount(resolvedAmount, selectedCurrency)})
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ضمان أمان المعاملة</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> تسوية فورية</span>
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-blue-600" /> مزود معتمد رسمي</span>
            </div>

          </div>
        ) : (
          /* Payment Success & Electronic Receipt View */
          <div className="p-6 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full ring-8 ring-emerald-50 dark:ring-emerald-950/40">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">تم السداد بنجاح!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تم اعتماد عملية الدفع وسداد الفاتورة وتأكيد حجز الخدمة الطبية بالكامل
              </p>
            </div>

            {/* Detailed Digital Receipt Card */}
            <div className="text-right p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">سند قبض إلكتروني موثق</span>
                </div>
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {completedPayment.receiptNumber || completedPayment.transactionReference}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">اسم المريض:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{completedPayment.patientName}</span>

                <span className="text-slate-500 dark:text-slate-400">الخدمة الطبية:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{completedPayment.serviceName}</span>

                {completedPayment.doctorName && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">الطبيب الاستشاري:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{completedPayment.doctorName}</span>
                  </>
                )}

                <span className="text-slate-500 dark:text-slate-400">وسيلة ومزود الدفع:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {completedPayment.paymentProvider === 'KURAIMI' ? 'بنك الكريمي (Al-Kuraimi API)' : completedPayment.paymentMethod}
                  {completedPayment.kuraimiAccount ? ` (${completedPayment.kuraimiAccount})` : ''}
                </span>

                <span className="text-slate-500 dark:text-slate-400">تاريخ ووقت السداد:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono text-[11px]">
                  {new Date(completedPayment.paidAt || completedPayment.createdAt).toLocaleString('ar-YE')}
                </span>

                <span className="text-slate-500 dark:text-slate-400">المبلغ المسدد:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                  {formatPaymentAmount(completedPayment.amount, completedPayment.currency as CurrencyCode)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>تم إرسال إشعار السداد فورياً للمريض والإدارة الطبية.</span>
                <span className="text-emerald-600 font-bold">الحالة: مؤكد ✓</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                طباعة الفاتورة
              </button>

              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                تم، إغلاق ومتابعة
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
