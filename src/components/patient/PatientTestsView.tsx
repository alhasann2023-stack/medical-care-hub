import React, { useState, useEffect } from 'react';
import { 
  TestTube, 
  Calendar, 
  User, 
  CheckCircle2, 
  Search, 
  Eye, 
  X,
  FileCheck, 
  ExternalLink, 
  Printer, 
  Building2,
  ShieldCheck
} from 'lucide-react';
import { MedicalTest } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PrintableTestResultModal } from '../common/PrintableTestResultModal';

interface PatientTestsViewProps {
  patientId: string;
}

export const PatientTestsView: React.FC<PatientTestsViewProps> = ({ patientId }) => {
  const { user, patientProfile } = useAuth();
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTest, setSelectedTest] = useState<MedicalTest | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [testForPrint, setTestForPrint] = useState<MedicalTest | null>(null);

  const effectivePatientId = patientProfile?.id || patientId || user?.id;

  useEffect(() => {
    loadTests();
  }, [effectivePatientId, patientId, user?.id, patientProfile?.id]);

  const loadTests = async () => {
    setIsLoading(true);
    try {
      const targetId = patientProfile?.id || patientId || user?.id;
      const res = await api.getTests(targetId);

      // Strict privacy enforcement for patients:
      // A patient must NEVER see another patient's medical tests or confidential records.
      if (user?.role === 'PATIENT') {
        const allowedIds = new Set(
          [
            patientProfile?.id,
            patientProfile?.userId,
            patientProfile?.mrn,
            user?.id,
            user?.phone,
            patientProfile?.phone,
            patientId
          ]
            .filter(Boolean)
            .map(id => String(id).toLowerCase().trim())
        );

        const patientOnlyTests = res.filter(t => {
          const tPatId = (t.patientId || '').toLowerCase().trim();
          const tUserId = ((t as any).patientUserId || '').toLowerCase().trim();
          const tMrn = (t.patientMrn || '').toLowerCase().trim();
          return (
            (tPatId && allowedIds.has(tPatId)) ||
            (tUserId && allowedIds.has(tUserId)) ||
            (tMrn && allowedIds.has(tMrn))
          );
        });

        setTests(patientOnlyTests);
      } else {
        setTests(res);
      }
    } catch (err) {
      console.error('Failed to load tests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isImageFile = (url?: string, name?: string) => {
    if (!url || url === '#') return false;
    return (
      url.startsWith('data:image/') ||
      url.startsWith('blob:') ||
      (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url)) ||
      (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name || ''))
    );
  };

  const filteredTests = tests.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.testName.toLowerCase().includes(q) ||
      t.doctorName.toLowerCase().includes(q) ||
      t.resultsSummary.toLowerCase().includes(q) ||
      (t.sampleType && t.sampleType.toLowerCase().includes(q)) ||
      (t.attachmentName && t.attachmentName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-3 text-start font-cairo">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-300 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <TestTube className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">سجل الفحوصات والتحاليل المخبرية والأشعة</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                <span>خاص وسري للمريض</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              نتائج تحاليلك وصور الأشعة الخاصة بك المعتمدة سريرياً مع المؤشرات التفصيلية وإمكانية المعاينة والطباعة
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم التحليل أو العينة..."
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
          />
        </div>
      </div>

      {/* Tests Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs font-semibold">
          جاري تحميل الفحوصات والملفات الطبية...
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 text-slate-400">
          <TestTube className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold text-slate-700">لا توجد نتائج فحوصات مسجلة حالياً.</p>
          <p className="text-xs text-slate-400 mt-1">سيتم إدراج نتائج الفحوصات والتحاليل والأشعة فور اعتمادها من قِبل فني المختبر والطبيب.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTests.map((test) => {
            const hasAttachment = Boolean(test.attachmentUrl && test.attachmentUrl !== '#');
            const isImg = isImageFile(test.attachmentUrl, test.attachmentName);

            return (
              <div
                key={test.id}
                className="bg-white rounded-2xl p-5 border border-green-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {test.category === 'LABORATORY' ? 'تحليل مخبري' : test.category === 'CARDIOLOGY' ? 'فحص قلب' : 'أشعة وتصوير طبي'}
                        </span>
                        {test.sampleType && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            عينة: {test.sampleType}
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 mt-1.5">{test.testName}</h3>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{test.status === 'COMPLETED' ? 'مكتمل ومعتمد' : test.status}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>الطبيب: <strong>{test.doctorName}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>تاريخ الفحص: <strong>{test.testDate}</strong></span>
                    </div>
                    {test.labTechnician && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>أخصائي/فني المختبر: <strong>{test.labTechnician}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Summary Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed mb-3">
                    <strong className="block text-slate-900 mb-0.5 font-bold">خلاصة النتيجة المخبرية:</strong>
                    {test.resultsSummary}
                  </div>

                  {/* Attached File Card / Thumbnail preview */}
                  {hasAttachment && (
                    <div className="mb-3 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isImg ? (
                          <div 
                            onClick={() => setPreviewImage(test.attachmentUrl!)}
                            className="relative group w-12 h-12 rounded-lg bg-slate-900 overflow-hidden cursor-pointer shrink-0 border border-emerald-300 shadow-2xs"
                            title="انقر لمشاهدة الملف وصورة الأشعة بالحجم الكامل"
                          >
                            <img
                              src={test.attachmentUrl}
                              alt={test.attachmentName || test.testName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <FileCheck className="w-5 h-5" />
                          </div>
                        )}
                        <div className="text-xs truncate">
                          <span className="font-bold text-emerald-950 block truncate">
                            {test.attachmentName || 'ملف الفحص / الأشعة المرفق'}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium">
                            {isImg ? 'صورة أشعة تشخيصية (اضغط للمعاينة)' : 'مستند وتقرير فحص طبي'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isImg ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(test.attachmentUrl!)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>مشاهدة</span>
                          </button>
                        ) : (
                          <a
                            href={test.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>فتح الملف</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Micro preview of lab parameters */}
                  {test.detailedItems && test.detailedItems.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                        <span>المؤشرات المخبرية ({test.detailedItems.length}):</span>
                        <span className="text-emerald-700 font-bold">القيم المسجلة</span>
                      </div>
                      {test.detailedItems.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-700 font-medium truncate max-w-[180px]">{item.parameter}</span>
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 font-mono">{item.value} {item.unit}</strong>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              item.flag === 'NORMAL' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : item.flag === 'HIGH' 
                                ? 'bg-rose-100 text-rose-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.flag === 'NORMAL' ? 'طبيعي' : item.flag === 'HIGH' ? 'مرتفع ↑' : 'منخفض ↓'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {test.detailedItems.length > 3 && (
                        <p className="text-[10px] text-slate-400 text-center font-medium">
                          + {test.detailedItems.length - 3} مؤشرات أخرى مسجلة
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setTestForPrint(test)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="طباعة تقرير الفحص المخبري الرسمي"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة النتيجة</span>
                  </button>

                  <button
                    onClick={() => setSelectedTest(test)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>التفاصيل الكاملة</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED TEST DETAILS VIEW MODAL                                          */}
      {/* ========================================================================= */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube className="w-5 h-5 text-emerald-300" />
                <span className="font-bold text-sm">{selectedTest.testName}</span>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="p-1 rounded-lg hover:bg-emerald-700 text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-start text-xs sm:text-sm max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ الفحص:</span>
                  <strong className="text-slate-900">{selectedTest.testDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">نوع العينة:</span>
                  <strong className="text-emerald-800">{selectedTest.sampleType || 'عينة دم وريدي'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">فني / أخصائي المختبر:</span>
                  <strong className="text-slate-900">{selectedTest.labTechnician || 'قسم المختبر'}</strong>
                </div>
              </div>

              {/* Results Summary */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <strong className="block text-emerald-950 font-bold mb-1">التقرير السريري العام:</strong>
                <p className="text-emerald-900 leading-relaxed font-medium">{selectedTest.resultsSummary}</p>
              </div>

              {/* Detailed Parameters Table */}
              {selectedTest.detailedItems && selectedTest.detailedItems.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">المعايير والمؤشرات التفصيلية:</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">المؤشر المخبري</th>
                          <th className="p-2.5 text-center">النتيجة</th>
                          <th className="p-2.5 text-center">المعدل الطبيعي</th>
                          <th className="p-2.5 text-center">التقييم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTest.detailedItems.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-slate-800">{item.parameter}</td>
                            <td className="p-2.5 font-bold font-mono text-center text-slate-900">{item.value} {item.unit}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-center">{item.referenceRange}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.flag === 'NORMAL'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.flag === 'NORMAL' ? 'ضمن الطبيعي' : 'يحتاج مراجعة'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Lab Notes */}
              {selectedTest.notes && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <strong className="block text-slate-800 font-bold mb-0.5">توصيات المختبر:</strong>
                  {selectedTest.notes}
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    const t = selectedTest;
                    setSelectedTest(null);
                    setTestForPrint(t);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة تقرير الفحص المعتمد</span>
                </button>

                <button
                  onClick={() => setSelectedTest(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Test Result Sheet Modal */}
      <PrintableTestResultModal
        isOpen={!!testForPrint}
        onClose={() => setTestForPrint(null)}
        test={testForPrint}
      />

      {/* Fullscreen Lightbox for Images */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-950/80 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-400" />
                <span className="font-extrabold text-sm">مشاهدة ملف الأشعة / الفحص الطبي</span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
              <img
                src={previewImage}
                alt="الفحص الطبي"
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
