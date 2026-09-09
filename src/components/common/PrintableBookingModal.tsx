import React from 'react';
import { X, Printer, Calendar, Clock, MapPin, User, CheckCircle2, ShieldCheck, QrCode, Stethoscope, Building2, Phone } from 'lucide-react';
import { Appointment } from '../../types/medical';

interface PrintableBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export const PrintableBookingModal: React.FC<PrintableBookingModalProps> = ({
  isOpen,
  onClose,
  appointment
}) => {
  if (!isOpen || !appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  const bookingCode = appointment.id.startsWith('apt-') 
    ? `BK-${appointment.id.replace('apt-', '').slice(-6).toUpperCase()}`
    : `BK-${appointment.id.slice(-6).toUpperCase()}`;

  const visitDate = appointment.confirmedDate || appointment.preferredDate;
  const visitTime = appointment.confirmedTime || (appointment.preferredPeriod === 'EVENING' ? '05:00 م' : '10:00 ص');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-cairo">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm">تذكرة حجز موعد طبي معتمد ({bookingCode})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الحجز</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div id="printable-report" className="p-8 overflow-y-auto bg-white text-slate-900 text-start text-xs sm:text-sm">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                <img
                  src="/logo.png"
                  alt="شعار المستشفى"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-900 leading-tight">مستشفى الرعاية الطبية الحديث</h1>
                <p className="text-xs font-bold text-indigo-700">قسم الاستقبال وتنسيق المواعيد والعيادات الخارجية</p>
                <p className="text-[11px] text-slate-500 font-mono">Modern Medical Care Hospital • Outpatient Booking Ticket</p>
              </div>
            </div>

            <div className="text-end">
              <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 font-black text-xs rounded-lg mb-1">
                تذكرة مراجعة عيادة معتمدة
              </span>
              <p className="text-[11px] text-slate-500 font-mono font-bold">رقم الحجز: {bookingCode}</p>
              <p className="text-[11px] text-slate-500">تاريخ الإصدار: {new Date().toLocaleDateString('ar-YE')}</p>
            </div>
          </div>

          {/* Patient Details & Ticket Barcode */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-5">
            <div>
              <span className="block text-[11px] text-slate-500 font-semibold">اسم المريض:</span>
              <strong className="text-slate-900 text-xs font-bold">{appointment.patientName}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-semibold">الرقم الطبي (MRN):</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{appointment.patientMrn || 'MRN-2026-8801'}</span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-semibold">رقم الهاتف:</span>
              <span className="font-mono text-slate-800 text-xs">{appointment.patientPhone || 'غير مسجل'}</span>
            </div>
          </div>

          {/* Appointment Core Box */}
          <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-5 mb-5 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{appointment.doctorName}</h3>
                  <p className="text-xs text-indigo-700 font-medium">{appointment.doctorSpecialty || 'العيادات التخصصية'}</p>
                </div>
              </div>
              <div className="text-end">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {appointment.status === 'CONFIRMED' ? 'موعد مؤكد رسمياً' : 'حجز قيد المراجعة'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-indigo-100">
                <span className="block text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  يوم وتاريخ الموعد:
                </span>
                <strong className="text-slate-900 text-xs">{visitDate}</strong>
              </div>

              <div className="p-3 bg-white rounded-lg border border-indigo-100">
                <span className="block text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  وقت / فترة الحضور:
                </span>
                <strong className="text-slate-900 text-xs font-mono">{visitTime}</strong>
              </div>

              <div className="p-3 bg-white rounded-lg border border-indigo-100">
                <span className="block text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  موقع العيادة والغرفة:
                </span>
                <strong className="text-indigo-700 text-xs">{appointment.clinicRoom || 'مبنى العيادات الخارجية'}</strong>
              </div>
            </div>

            <div className="text-xs pt-1 flex items-center justify-between">
              <span className="text-slate-600 font-medium">الخدمة الطبية: <strong className="text-slate-900">{appointment.serviceName || 'كشف واستشارة طبية'}</strong></span>
              <span className="text-slate-600 font-medium">سبب الزيارة: <span className="text-slate-800">{appointment.reason || 'مراجعة دورية'}</span></span>
            </div>
          </div>

          {/* Financial Summary (in Yemeni Rial) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-5 flex items-center justify-between text-xs">
            <div>
              <span className="block text-slate-500 text-[11px]">حالة سداد رسوم الكشف:</span>
              <strong className="text-slate-900 font-bold">
                {appointment.paymentStatus === 'PAYMENT_SUCCESS' || appointment.isPaid ? 'مسدد بالكامل' : 'معفى / نقدي عند الحضور'}
              </strong>
              {appointment.transactionReference && (
                <span className="block text-[10px] text-slate-500 font-mono">المرجع: {appointment.transactionReference}</span>
              )}
            </div>

            <div className="text-end">
              <span className="block text-slate-500 text-[11px]">المبلغ المعتمد:</span>
              <span className="text-base font-black font-mono text-emerald-700">
                {appointment.fee || 3000} ر.ي
              </span>
            </div>
          </div>

          {/* Important Patient Instructions */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1 mb-6">
            <h5 className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              تعليمات هامة للمريض:
            </h5>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800 pr-1 leading-relaxed">
              <li>يرجى التواجد في قسم الاستقبال قبل 15 دقيقة من موعد العيادة لتأكيد الوصول.</li>
              <li>أيام الدوام المعتمدة: السبت، الأحد، الثلاثاء، والأربعاء فقط (يوم الإثنين إجازة رسمية للمستشفى).</li>
              <li>يرجى إبراز هذه التذكرة المطبوعة أو الإلكترونية  لموظف السكرتاريا والاستقبال.</li>
            </ul>
          </div>

          {/* Footer & Official Hospital Stamp */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <div className="p-1 border border-slate-300 rounded bg-white">
                <QrCode className="w-12 h-12 text-slate-800" />
              </div>
              <div>
                <p className="font-mono text-[10px] text-slate-600">ID: {appointment.id}</p>
                <p className="font-bold text-slate-700">تذكرة إلكترونية مصدقة آلياً</p>
                <p className="text-[10px]">قسم السكرتاريا الطبية والاستقبال العام</p>
              </div>
            </div>

            <div className="w-48 text-center border-t-2 border-dashed border-slate-300 pt-2">
              <p className="font-bold text-slate-700">ختم وتوقيع السكرتير الطبي</p>
              <div className="h-10 flex items-center justify-center text-[10px] text-slate-400 italic">
                (معتمد من مكتب الاستقبال)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
