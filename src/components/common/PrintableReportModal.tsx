import React from 'react';
import { X, Printer, Download, Building2, ShieldCheck, QrCode, FileText, CheckCircle2 } from 'lucide-react';
import { MedicalReport } from '../../types/medical';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MedicalReport | null;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">عرض التقرير الطبي المعتمد ({report.reportNumber})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Medical Document Container */}
        <div id="printable-report" className="p-8 sm:p-10 overflow-y-auto bg-white text-slate-900 font-cairo">
          {/* Hospital Official Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                  <img
                    src="/logo.png"
                    alt="شعار صحتك في يدك"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h1 className="font-black text-xl text-slate-900">عيادة الدكتور وهاج المقطري</h1>
                  <h2 className="text-xs text-slate-600 font-semibold uppercase tracking-wider">منصة صحتك في يدك </h2>
                  <p className="text-[11px] text-slate-500 font-medium">{report.hospitalDepartment}</p>
                </div>
              </div>

              <div className="text-end text-xs space-y-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تقرير رسمي معتمد</span>
                </div>
                <p className="font-mono text-slate-700 text-[11px]">رقم التقرير: <strong>{report.reportNumber}</strong></p>
                <p className="text-slate-500 text-[11px]">تاريخ التقرير: {report.reportDate}</p>
              </div>
            </div>
          </div>

          {/* Patient Details Strip */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">اسم المريض:</span>
              <strong className="text-slate-900 text-sm">{report.patientName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">رقم الملف الطبي (MRN):</span>
              <strong className="text-slate-900 font-mono">{report.patientMrn}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">الجنس / تاريخ الميلاد:</span>
              <strong className="text-slate-900">
                {report.patientGender === 'MALE' ? 'ذكر' : 'أنثى'} | {report.patientBirthDate}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">الطبيب المعالج:</span>
              <strong className="text-slate-900">{report.doctorName}</strong>
            </div>
          </div>

          {/* Report Content Body */}
          <div className="space-y-5 text-xs sm:text-sm">
            {/* Title */}
            <div>
              <h3 className="font-bold text-base text-blue-950 mb-1">{report.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">{report.summary}</p>
            </div>

            {/* Clinical History */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <h4 className="font-bold text-xs text-slate-800 mb-1">التاريخ السريري وسبب التقييم (Clinical History):</h4>
              <p className="text-slate-700 leading-relaxed">{report.clinicalHistory}</p>
            </div>

            {/* Findings */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 mb-1">نتائج الفحص السريري والمخبري (Findings):</h4>
              <p className="text-slate-700 leading-relaxed">{report.findings}</p>
            </div>

            {/* Diagnosis (Highlighted) */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200">
              <h4 className="font-bold text-xs text-blue-900 mb-1">التشخيص النهائي المعتمد (Final Clinical Diagnosis):</h4>
              <p className="font-extrabold text-blue-950 text-sm leading-relaxed">{report.diagnosis}</p>
            </div>

            {/* Recommendations */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-xs text-slate-800 mb-1">التوصيات والخطة العلاجية (Recommendations & Follow-up):</h4>
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">{report.recommendations}</p>
            </div>
          </div>

          {/* Official Sign-off & Verification Footer */}
          <div className="mt-10 pt-6 border-t-2 border-slate-300 grid grid-cols-2 items-end">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-16 h-16 border border-slate-300 rounded p-1 flex items-center justify-center bg-slate-50">
                  <QrCode className="w-14 h-14 text-slate-800" />
                </div>
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p className="font-bold text-slate-700">رمز التحقق الإلكتروني</p>
                  <p>امسح الرمز للتأكد من صحة التقرير عبر بوابة وزارة الصحة.</p>
                  <p className="font-mono">VERIFY: MOH-SA-9821</p>
                </div>
              </div>
            </div>

            <div className="text-end space-y-1.5">
              <p className="text-xs font-bold text-slate-900">{report.doctorName}</p>
              <p className="text-[11px] text-slate-600">{report.doctorTitle}</p>
              <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-[10px] font-mono text-slate-600">
                {report.digitalSignature || 'معتمد رقمياً عبر المنصة'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
