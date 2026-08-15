import React from 'react';
import { X, Printer, Pill, Building2, QrCode, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Prescription } from '../../types/medical';

interface PrintablePrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: Prescription | null;
}

export const PrintablePrescriptionModal: React.FC<PrintablePrescriptionModalProps> = ({
  isOpen,
  onClose,
  prescription
}) => {
  if (!isOpen || !prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">الوصفة الطبية الإلكترونية ({prescription.rxNumber})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الوصفة</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Rx Sheet */}
        <div id="printable-report" className="p-8 overflow-y-auto bg-white text-slate-900 font-cairo">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-900">مستشفى مركز الرعاية الطبية</h1>
                <p className="text-xs text-slate-500 font-semibold">قسم الصيدلية والوصفات الإلكترونية (E-Prescription)</p>
              </div>
            </div>

            <div className="text-end text-xs">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>وصفة معتمدة للصرف</span>
              </div>
              <p className="font-mono text-slate-800 text-xs font-bold">رقم الوصفة: {prescription.rxNumber}</p>
              <p className="text-slate-500 text-[11px]">التاريخ: {prescription.date}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-6 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">المريض:</span>
              <strong className="text-slate-900">{prescription.patientName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">رقم الملف الطبي:</span>
              <strong className="text-slate-900 font-mono">{prescription.patientMrn}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">الطبيب المعالج:</span>
              <strong className="text-slate-900">{prescription.doctorName}</strong>
            </div>
          </div>

          {/* Rx Big Symbol & Diagnosis */}
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-3xl font-black font-mono text-emerald-800">℞</span>
            <div className="text-end text-xs">
              <span className="text-slate-500">التشخيص السريري: </span>
              <strong className="text-slate-900">{prescription.diagnosis}</strong>
            </div>
          </div>

          {/* Medications Table */}
          <div className="space-y-3 mb-6">
            {prescription.medications.map((med, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <span className="font-bold text-sm text-slate-900">{idx + 1}. {med.medicationName}</span>
                    <span className="mr-2 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                      {med.strength} - {med.form}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                    المدة: {med.duration}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-0.5 mt-2">
                  <p><strong>الجرعة والتكرار:</strong> {med.dosage} — {med.frequency}</p>
                  {med.instructions && (
                    <p className="text-emerald-700"><strong>إرشادات الاستخدام:</strong> {med.instructions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Instructions Box */}
          {prescription.instructions && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-6">
              <strong className="block mb-0.5">تعليمات الطبيب الصيدلانية:</strong>
              <p>{prescription.instructions}</p>
            </div>
          )}

          {/* Footer with QR */}
          <div className="border-t-2 border-slate-200 pt-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 border border-slate-300 rounded p-1 flex items-center justify-center bg-slate-50">
                <QrCode className="w-10 h-10 text-slate-800" />
              </div>
              <div className="text-[10px] text-slate-500">
                <p className="font-bold text-slate-700">صرف الوصفة الإلكتروني</p>
                <p>مقبول لدى كافة صيدليات الرعاية المعتمدة</p>
              </div>
            </div>

            <div className="text-end">
              <p className="font-bold text-slate-900">{prescription.doctorName}</p>
              <p className="text-[10px] text-slate-500 font-mono">التوقيع الإلكتروني المعتمد</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
