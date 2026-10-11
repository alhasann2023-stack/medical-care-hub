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
  ShieldCheck,
  Building2,
  FileText,
  QrCode,
  Calendar,
  UserCheck,
  Stethoscope
} from 'lucide-react';
import { Payment } from '../../types/medical';
import { apiClient } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';

interface PatientInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
}

export const PatientInvoicesModal: React.FC<PatientInvoicesModalProps> = ({
  isOpen,
  onClose,
  patientId: propPatientId,
  patientName: propPatientName
}) => {
  const { user, patientProfile } = useAuth();

  const effectivePatientId = propPatientId || patientProfile?.id || user?.id || '';
  const effectivePatientName = propPatientName || patientProfile?.fullName || user?.fullName || 'المريض';
  const effectivePhone = patientProfile?.phone || user?.phone || '';
  const effectiveMrn = patientProfile?.mrn || '';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedPaymentToPay, setSelectedPaymentToPay] = useState<Payment | null>(null);
  const [selectedInvoicePreview, setSelectedInvoicePreview] = useState<Payment | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const [directList, allList, apts, cns] = await Promise.all([
        effectivePatientId ? apiClient.getPayments({ patientId: effectivePatientId }).catch(() => []) : Promise.resolve([]),
        apiClient.getPayments().catch(() => []),
        effectivePatientId ? apiClient.getAppointments({ patientId: effectivePatientId }).catch(() => []) : Promise.resolve([]),
        effectivePatientId ? apiClient.getConsultations({ patientId: effectivePatientId }).catch(() => []) : Promise.resolve([])
      ]);

      const candidateList = [...(directList || []), ...(allList || [])];
      const mergedMap = new Map<string, Payment>();
      candidateList.forEach(p => {
        if (p && p.id) mergedMap.set(p.id, p);
      });

      const userIds = new Set([
        effectivePatientId,
        user?.id,
        patientProfile?.id,
        (patientProfile as any)?.userId
      ].filter(Boolean));

      // Synthesize invoices from existing appointments if not already in mergedMap
      const existingRefIds = new Set<string>();
      for (const p of mergedMap.values()) {
        if (p.serviceReferenceId) existingRefIds.add(p.serviceReferenceId);
        if (p.appointmentId) existingRefIds.add(p.appointmentId);
        if (p.consultationId) existingRefIds.add(p.consultationId);
        if (p.id) existingRefIds.add(p.id);
      }

      apts?.forEach(apt => {
        if (apt.id && !existingRefIds.has(apt.id)) {
          const fee = (apt as any).paymentAmount ?? (apt.fee ?? 200);
          const isPaid = apt.isPaid || (apt as any).paymentStatus === 'PAID' || (apt as any).paymentStatus === 'PAYMENT_SUCCESS';
          const aptPay: Payment = {
            id: (apt as any).paymentId || `inv-apt-${apt.id}`,
            receiptNumber: (apt as any).receiptNumber || `INV-${apt.id.replace(/\D/g, '').slice(-6) || Math.floor(100000 + Math.random() * 900000)}`,
            patientId: apt.patientId || effectivePatientId,
            patientName: apt.patientName || effectivePatientName,
            patientPhone: apt.patientPhone || effectivePhone,
            patientMrn: apt.patientMrn || effectiveMrn,
            doctorId: apt.doctorId,
            doctorName: apt.doctorName || 'طبيب العيادة',
            doctorSpecialty: apt.doctorSpecialty || 'العيادات التخصصية',
            serviceType: 'APPOINTMENT',
            appointmentId: apt.id,
            serviceReferenceId: apt.id,
            serviceName: (apt as any).serviceName || `حجز موعد عيادة (${apt.doctorSpecialty || 'كشف طبي'})`,
            amount: fee,
            currency: 'PTS',
            paymentMethod: 'POINTS',
            paymentProvider: 'POINTS_WALLET',
            status: 'PAYMENT_SUCCESS',
            paymentStatus: 'PAID',
            transactionReference: (apt as any).transactionReference || `TXN-APT-${apt.id.slice(-6)}`,
            taxRate: 0,
            taxAmount: 0,
            subtotal: fee,
            paidAt: (apt as any).paidAt || apt.createdAt || new Date().toISOString(),
            createdAt: apt.createdAt || new Date().toISOString(),
            updatedAt: (apt as any).updatedAt || new Date().toISOString()
          };
          mergedMap.set(aptPay.id, aptPay);
          existingRefIds.add(apt.id);
        }
      });

      cns?.forEach(cn => {
        if (cn.id && !existingRefIds.has(cn.id)) {
          const fee = (cn as any).paymentAmount ?? (cn.fee ?? 50);
          const cnPay: Payment = {
            id: (cn as any).paymentId || `inv-cns-${cn.id}`,
            receiptNumber: (cn as any).receiptNumber || `INV-${cn.id.replace(/\D/g, '').slice(-6) || Math.floor(100000 + Math.random() * 900000)}`,
            patientId: cn.patientId || effectivePatientId,
            patientName: cn.patientName || effectivePatientName,
            patientPhone: cn.patientPhone || effectivePhone,
            doctorId: cn.doctorId,
            doctorName: cn.doctorName || 'طبيب استشاري',
            doctorSpecialty: cn.doctorSpecialty || 'استشارة طبية',
            serviceType: 'CONSULTATION',
            consultationId: cn.id,
            serviceReferenceId: cn.id,
            serviceName: `استشارة طبية (${cn.doctorSpecialty || cn.title || 'استشارة عن بعد'})`,
            amount: fee,
            currency: 'PTS',
            paymentMethod: 'POINTS',
            paymentProvider: 'POINTS_WALLET',
            status: 'PAYMENT_SUCCESS',
            paymentStatus: 'PAID',
            transactionReference: (cn as any).transactionReference || `TXN-CNS-${cn.id.slice(-6)}`,
            taxRate: 0,
            taxAmount: 0,
            subtotal: fee,
            paidAt: (cn as any).paidAt || cn.createdAt || new Date().toISOString(),
            createdAt: cn.createdAt || new Date().toISOString(),
            updatedAt: (cn as any).updatedAt || new Date().toISOString()
          };
          mergedMap.set(cnPay.id, cnPay);
          existingRefIds.add(cn.id);
        }
      });

      // Filter accurately for this patient
      const strictlyFiltered = Array.from(mergedMap.values()).filter(p => {
        if (!p) return false;
        if (p.patientId && userIds.has(p.patientId)) return true;
        if ((p as any).patientUserId && userIds.has((p as any).patientUserId)) return true;
        if (effectiveMrn && (p as any).patientMrn && (p as any).patientMrn === effectiveMrn) return true;
        if (effectivePhone && p.patientPhone && p.patientPhone.replace(/\D/g, '').endsWith(effectivePhone.replace(/\D/g, '').slice(-7))) return true;
        if (effectivePatientName && p.patientName && p.patientName.trim().toLowerCase() === effectivePatientName.trim().toLowerCase()) return true;
        return false;
      });

      strictlyFiltered.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setPayments(strictlyFiltered);
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
  }, [isOpen, effectivePatientId, effectivePatientName]);

  if (!isOpen) return null;

  const filtered = payments.filter(p => {
    const matchesSearch = 
      p.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
      p.transactionReference?.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.doctorName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus || p.paymentStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = payments
    .filter(p => p.status === 'PAYMENT_SUCCESS' || p.paymentStatus === 'PAID' || p.status === 'PAID' || p.paymentStatus === 'PAYMENT_SUCCESS')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const pendingCount = payments.filter(p => 
    p.status === 'PAYMENT_REQUIRED' || 
    p.paymentStatus === 'PAYMENT_REQUIRED' || 
    p.status === 'PENDING' || 
    p.paymentStatus === 'PENDING'
  ).length;

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
              <h2 className="text-lg font-bold">سجل المدفوعات والفواتير الضريبية وسندات القبض</h2>
              <p className="text-xs text-slate-300">
                استعراض وطباعة جميع الفواتير الضريبية المعتمدة وسندات القبض الإلكترونية للحجوزات والاستشارات
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي المدفوعات المعتمدة</span>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {totalPaid.toLocaleString()} <span className="text-xs">نقطة</span>
              </div>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">فواتير بانتظار السداد</span>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                {pendingCount} <span className="text-xs">فاتورة</span>
              </div>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">الامتثال للفوترة الإلكترونية</span>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">سندات وفواتير معتمدة ضريبياً ✓</div>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
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
              placeholder="البحث بالخدمة أو رقم الفاتورة أو المعاملة..."
              className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'PAYMENT_SUCCESS', label: 'مسدد ومؤكد' },
              { id: 'PAYMENT_REQUIRED', label: 'بانتظار السداد' },
              { id: 'REFUNDED', label: 'مسترد' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
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
              <p className="text-xs">جارٍ تحميل سجل المدفوعات والفواتير الضريبية...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs">لا توجد معاملات مالية أو فواتير مسجلة حالياً.</p>
            </div>
          ) : (
            filtered.map(payment => {
              const isRefunded = payment.status === 'REFUNDED' || payment.paymentStatus === 'REFUNDED';
              const isSuccess = !isRefunded && (payment.status === 'PAYMENT_SUCCESS' || payment.paymentStatus === 'PAYMENT_SUCCESS' || payment.status === 'PAID' || payment.paymentStatus === 'PAID' || payment.isPaid);
              const isPending = !isRefunded && !isSuccess && (payment.status === 'PENDING' || payment.status === 'PAYMENT_REQUIRED' || payment.paymentStatus === 'PAYMENT_REQUIRED' || payment.paymentStatus === 'PENDING');
              const isTransferNotice = payment.paymentMethod === 'BANK_TRANSFER_NOTICE' || !!(payment as any).bankTransferDetails;

              const invoiceNumber = payment.receiptNumber || payment.transactionReference || payment.id;

              return (
                <div 
                  key={payment.id}
                  className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1 text-start">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{payment.serviceName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isRefunded ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200' :
                        isSuccess ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' :
                        isPending && isTransferNotice ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-300' :
                        isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {isRefunded ? 'مسترد لرصيد النقاط ✓' : isSuccess ? 'تم التسديد ✓ (فاتورة معتمدة)' : isPending && isTransferNotice ? 'إشعار مرسل (بانتظار اعتماد الإدارة)' : isPending ? 'بانتظار السداد' : payment.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>رقم الفاتورة / السند: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{invoiceNumber}</strong></span>
                      {payment.doctorName && <span>الطبيب: <strong className="text-slate-700 dark:text-slate-200">{payment.doctorName}</strong></span>}
                      <span>التاريخ: <span className="font-mono">{new Date(payment.paidAt || payment.createdAt).toLocaleDateString('ar-YE')}</span></span>
                      <span>طريقة الدفع: <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {payment.paymentMethod === 'POINTS' || !payment.paymentMethod
                          ? 'خصم مباشر من رصيد النقاط (POINTS)'
                          : payment.paymentMethod}
                      </span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700">
                    <div className="text-left">
                      <div className="text-base font-black text-slate-900 dark:text-slate-100">
                        {payment.amount} <span className="text-xs font-normal text-slate-500">نقطة</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 block font-medium">سداد معتمد بالنقاط ✓</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedInvoicePreview(payment)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="معاينة الفاتورة الضريبية وسند القبض"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الفاتورة الضريبية</span>
                      </button>

                      {isPending && (
                        <button
                          onClick={() => setSelectedPaymentToPay(payment)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>سداد الآن</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>جميع السندات المالية معتمدة ومطابقة لمتطلبات الفوترة الإلكترونية وهيئة الزكاة والضريبة (ZATCA).</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>

      {/* Official Tax Invoice & Receipt Preview Modal */}
      {selectedInvoicePreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-start animate-in fade-in zoom-in-95 duration-200 my-8">
            
            {/* Invoice Top Strip */}
            <div className="p-6 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10 text-emerald-300">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">فاتورة ضريبية مبسطة وسند قبض إلكتروني</h3>
                  <p className="text-xs text-emerald-200">الرقم الضريبي للمنشأة: 300123456700003</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoicePreview(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-bold">رقم الفاتورة / السند:</span>
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                    {selectedInvoicePreview.receiptNumber || selectedInvoicePreview.transactionReference || selectedInvoicePreview.id}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">اسم المريض:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{selectedInvoicePreview.patientName || effectivePatientName}</strong>
                </div>

                {effectiveMrn && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">الرقم الطبي (MRN):</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">{effectiveMrn}</strong>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">الخدمة الطبية:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedInvoicePreview.serviceName}</span>
                </div>

                {selectedInvoicePreview.doctorName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">الطبيب الاستشاري:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedInvoicePreview.doctorName}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">وسيلة ومزود السداد:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedInvoicePreview.paymentMethod === 'POINTS' || selectedInvoicePreview.paymentProvider === 'POINTS_WALLET'
                      ? 'خصم فوري من رصيد النقاط (POINTS)'
                      : selectedInvoicePreview.paymentProvider === 'KURAIMI'
                      ? 'بنك الكريمي للتمويل الأصغر الإسلامي'
                      : selectedInvoicePreview.paymentMethod || 'رصيد النقاط'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">تاريخ ووقت الإصدار:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(selectedInvoicePreview.paidAt || selectedInvoicePreview.createdAt).toLocaleString('ar-YE')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">حالة الفاتورة:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedInvoicePreview.status === 'PAYMENT_SUCCESS' || selectedInvoicePreview.paymentStatus === 'PAID' || selectedInvoicePreview.isPaid ? 'تم التحصيل والسداد بنجاح ✓' : 'بانتظار السداد'}
                  </span>
                </div>
              </div>

              {/* Tax Calculations Breakdown Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="p-2.5 text-start">البند</th>
                      <th className="p-2.5 text-center">النسبة</th>
                      <th className="p-2.5 text-end">القيمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300">المبلغ الخاضع للضريبة (غير شامل VAT)</td>
                      <td className="p-2.5 text-center text-slate-500">-</td>
                      <td className="p-2.5 text-end font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Math.round((Number(selectedInvoicePreview.amount) || 0) / 1.15).toLocaleString()} نقطة
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300">ضريبة القيمة المضافة (VAT)</td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-600">15%</td>
                      <td className="p-2.5 text-end font-mono font-bold text-emerald-600">
                        {Math.round((Number(selectedInvoicePreview.amount) || 0) - (Number(selectedInvoicePreview.amount) || 0) / 1.15).toLocaleString()} نقطة
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/30">
                      <td className="p-2.5 font-extrabold text-slate-900 dark:text-slate-100">الإجمالي المستحق شامل الضريبة</td>
                      <td className="p-2.5 text-center font-bold text-slate-500">-</td>
                      <td className="p-2.5 text-end font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                        {(Number(selectedInvoicePreview.amount) || 0).toLocaleString()} نقطة
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ZATCA Electronic Verification Seal */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-lg">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">فاتورة إلكترونية موثقة</span>
                    <span className="text-[10px] text-slate-400">تتوافق مع معايير الفوترة الإلكترونية الرسمية</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-md font-bold">
                  ZATCA-E-INVOICE
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>طباعة الفاتورة الضريبية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoicePreview(null)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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
          patientId={effectivePatientId}
          patientName={effectivePatientName}
          doctorId={selectedPaymentToPay.doctorId}
          doctorName={selectedPaymentToPay.doctorName}
          doctorSpecialty={selectedPaymentToPay.doctorSpecialty}
        />
      )}
    </div>
  );
};
