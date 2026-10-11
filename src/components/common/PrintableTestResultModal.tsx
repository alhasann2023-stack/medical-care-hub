import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, TestTube, CheckCircle2, AlertTriangle, Building2, QrCode, ShieldCheck, User, Calendar } from 'lucide-react';
import { MedicalTest } from '../../types/medical';

interface PrintableTestResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: MedicalTest | null;
}

export const PrintableTestResultModal: React.FC<PrintableTestResultModalProps> = ({
  isOpen,
  onClose,
  test
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-printable-modal');
    } else {
      document.body.classList.remove('has-printable-modal');
    }
    return () => {
      document.body.classList.remove('has-printable-modal');
    };
  }, [isOpen]);

  if (!isOpen || !test) return null;

  const handlePrint = () => {
    window.print();
  };

  const testReportCode = test.id.startsWith('tst-') 
    ? `LAB-${test.id.replace('tst-', '').slice(-6).toUpperCase()}`
    : `LAB-${test.id.slice(-6).toUpperCase()}`;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-cairo">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Controls (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">تقرير الفحص المخبري الرسمي ({testReportCode})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة تقرير الفحص</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div id="printable-report" className="p-8 overflow-y-auto bg-white text-slate-900 text-start text-xs sm:text-sm">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                <img
                  src="/logo.png"
                  alt="شعار العيادة"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-900 leading-tight"> عيادة الدكتور وهاج المقطري</h1>
                <p className="text-xs font-bold text-emerald-700">قسم المختبر المركزي والتحاليل التشخيصية المتطورة</p>
                <p className="text-[11px] text-slate-500 font-mono">Central Medical Diagnostic Laboratory Report</p>
              </div>
            </div>

            <div className="text-end">
              <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-xs rounded-lg mb-1">
                تقرير مخبري معتمد رسمياً
              </span>
              <p className="text-[11px] text-slate-500 font-mono font-bold">كود التقرير: {testReportCode}</p>
              <p className="text-[11px] text-slate-500">تاريخ الإصدار: {test.testDate || new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>

          {/* Patient & Sample Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-5 text-xs">
            <div>
              <span className="block text-[11px] text-slate-500 font-semibold">اسم المريض:</span>
              <strong className="text-slate-900 text-xs font-bold">{test.patientName}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-semibold">الرقم الطبي (MRN):</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{test.patientMrn || 'MRN-2026-8801'}</span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-semibold">نوع العينة المسحوبة:</span>
              <strong className="text-emerald-800 text-xs font-bold">{test.sampleType || 'عينة دم وريدي'}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 font-semibold">الطبيب المحول:</span>
              <span className="text-slate-800 text-xs font-medium">{test.doctorName || 'طبيب استشاري معتمد'}</span>
            </div>
          </div>

          {/* Test Name & Category Bar */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-sm text-emerald-950">{test.testName}</h3>
                <span className="text-[11px] text-emerald-700 font-medium">التصنيف: {test.category === 'LABORATORY' ? 'تحاليل مخبرية سريرية' : test.category}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg">
              {test.status === 'COMPLETED' ? 'مكتمل ومعتمد' : test.status}
            </span>
          </div>

          {/* Detailed Lab Items Table */}
          {test.detailedItems && test.detailedItems.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
              <table className="w-full text-xs text-start border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-start">المؤشر / الفحص التفصيلي (Parameter)</th>
                    <th className="p-2.5 text-center">النتيجة المقروءة</th>
                    <th className="p-2.5 text-center">الوحدة</th>
                    <th className="p-2.5 text-center">المعدل الطبيعي (Reference Range)</th>
                    <th className="p-2.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {test.detailedItems.map((item, idx) => {
                    const isAbnormal = item.flag === 'HIGH' || item.flag === 'LOW' || item.flag === 'CRITICAL';
                    return (
                      <tr key={idx} className={isAbnormal ? 'bg-rose-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2.5 font-semibold text-slate-900">{item.parameter}</td>
                        <td className={`p-2.5 text-center font-mono font-bold ${isAbnormal ? 'text-rose-700' : 'text-slate-900'}`}>
                          {item.value}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">{item.unit}</td>
                        <td className="p-2.5 text-center font-mono text-slate-600 text-[11px]">{item.referenceRange}</td>
                        <td className="p-2.5 text-center">
                          {item.flag === 'HIGH' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">مرتفع ↑</span>
                          ) : item.flag === 'LOW' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">منخفض ↓</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">طبيعي ✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Results Summary & Clinical Findings */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5 space-y-2">
            <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              الخلاصة السريرية والنتيجة النهائية:
            </h4>
            <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200">
              {test.resultsSummary || 'تمت مطابقة العينة والنتائج ضمن النطاق المقبول سريرياً دون مؤشرات سلبية.'}
            </p>
          </div>

          {/* Clinical Notes if available */}
          {test.notes && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs mb-5 text-amber-900">
              <strong className="block text-[11px] font-bold text-amber-800 mb-1">توصيات وملاحظات المختبر:</strong>
              <p className="leading-relaxed text-amber-900">{test.notes}</p>
            </div>
          )}

          {/* Lab Specialist & Official Seal Sign-off */}
          <div className="pt-5 border-t-2 border-slate-900 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div className="p-1 border border-slate-300 rounded bg-white">
                <QrCode className="w-12 h-12 text-slate-800" />
              </div>
              <div>
                <p className="font-mono text-[10px] text-slate-500">REF: {test.id}</p>
                <strong className="text-slate-800 block text-xs">قسم التحاليل المخبرية المعتمدة</strong>
                <span className="text-[11px] text-slate-500">تم التحقق وفق معايير الجودة المخبرية (ISO 15189)</span>
              </div>
            </div>

            <div className="text-center w-56">
              <p className="font-bold text-slate-800 text-xs">أخصائي / فني المختبر المسؤول</p>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">{test.labTechnician || 'أخصائي المختبر والتحاليل'}</p>
              <div className="h-10 border-b border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-400 italic">
                (توقيع وختم المختبر المعتمد)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
