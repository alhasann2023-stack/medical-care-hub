import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Receipt, 
  Download, 
  CheckCircle2, 
  Clock, 
  X, 
  Search, 
  Printer, 
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Payment } from '../../types/medical';
import { apiClient } from '../../services/api';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';

interface PatientInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

export const PatientInvoicesModal: React.FC<PatientInvoicesModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedPaymentToPay, setSelectedPaymentToPay] = useState<Payment | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const list = await apiClient.getPayments({ patientId });
      setPayments(list);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPayments();
    }
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const filtered = payments.filter(p => {
    const matchesSearch = 
      p.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
      p.transactionReference?.toLowerCase().includes(search.toLowerCase()) ||
      p.doctorName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus || p.paymentStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = payments
    .filter(p => p.status === 'PAYMENT_SUCCESS' || p.paymentStatus === 'PAYMENT_SUCCESS')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingCount = payments.filter(p => p.status === 'PAYMENT_REQUIRED' || p.paymentStatus === 'PAYMENT_REQUIRED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-4xl my-8 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl backdrop-blur-md border border-emerald-500/30">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">سجل المدفوعات والفواتير الضريبية</h2>
              <p className="text-xs text-slate-300">
                استعراض وطباعة جميع سندات الدفع الإلكترونية ورسوم الحجوزات والاستشارات
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">إجمالي المدفوعات المعتمدة</span>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{totalPaid} <span className="text-xs">ر.س</span></div>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">فواتير بانتظار السداد</span>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400">{pendingCount} <span className="text-xs">فاتورة</span></div>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">إجمالي العمليات</span>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200">{payments.length} <span className="text-xs">عملية</span></div>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث بالخدمة أو رقم المعاملة..."
              className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'PAYMENT_SUCCESS', label: 'مدفوع ومؤكد' },
              { id: 'PAYMENT_REQUIRED', label: 'بانتظار السداد' },
              { id: 'REFUNDED', label: 'مسترد' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  filterStatus === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">جارٍ تحميل سجل الفواتير...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs">لا توجد معاملات مالية مطابقة للبحث.</p>
            </div>
          ) : (
            filtered.map(payment => {
              const isSuccess = payment.status === 'PAYMENT_SUCCESS' || payment.paymentStatus === 'PAYMENT_SUCCESS';
              const isPending = payment.status === 'PAYMENT_REQUIRED' || payment.paymentStatus === 'PAYMENT_REQUIRED';
              const isRefunded = payment.status === 'REFUNDED' || payment.paymentStatus === 'REFUNDED';

              return (
                <div 
                  key={payment.id}
                  className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{payment.serviceName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSuccess ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' :
                        isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' :
                        isRefunded ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {isSuccess ? 'مدفوع ومؤكد ✓' : isPending ? 'بانتظار السداد' : isRefunded ? 'مسترد' : payment.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {payment.doctorName && <span>الطبيب: <strong className="text-slate-700 dark:text-slate-200">{payment.doctorName}</strong></span>}
                      <span>رقم المعاملة: <span className="font-mono text-slate-700 dark:text-slate-300">{payment.transactionReference}</span></span>
                      <span>التاريخ: <span className="font-mono">{new Date(payment.paidAt || payment.createdAt).toLocaleDateString('ar-SA')}</span></span>
                      {payment.paymentMethod && <span>وسيلة الدفع: <span className="font-semibold">{payment.paymentMethod}</span></span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700">
                    <div className="text-left">
                      <div className="text-base font-black text-slate-900 dark:text-slate-100">
                        {payment.amount} <span className="text-xs font-normal text-slate-500">ر.س</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">شامل الضريبة 15%</span>
                    </div>

                    {isPending ? (
                      <button
                        onClick={() => setSelectedPaymentToPay(payment)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        سداد الآن
                      </button>
                    ) : (
                      <button
                        onClick={() => window.print()}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors title='طباعة السند'"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>جميع السندات المالية معتمدة ومطابقة لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA).</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>

      {/* Embedded Checkout if patient chooses to pay an unpaid invoice */}
      {selectedPaymentToPay && (
        <PaymentCheckoutModal
          isOpen={Boolean(selectedPaymentToPay)}
          onClose={() => setSelectedPaymentToPay(null)}
          onSuccess={() => {
            setSelectedPaymentToPay(null);
            fetchPayments();
          }}
          serviceType={selectedPaymentToPay.serviceType}
          serviceReferenceId={selectedPaymentToPay.serviceReferenceId}
          serviceName={selectedPaymentToPay.serviceName}
          amount={selectedPaymentToPay.amount}
          currency={selectedPaymentToPay.currency}
          patientId={patientId}
          patientName={patientName}
          doctorId={selectedPaymentToPay.doctorId}
          doctorName={selectedPaymentToPay.doctorName}
          doctorSpecialty={selectedPaymentToPay.doctorSpecialty}
        />
      )}
    </div>
  );
};
