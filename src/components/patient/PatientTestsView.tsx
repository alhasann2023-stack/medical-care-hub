import React, { useState, useEffect } from 'react';
import { 
  TestTube, 
  Download, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  Search,
  Filter,
  Eye,
  X
} from 'lucide-react';
import { MedicalTest } from '../../types/medical';
import { api } from '../../services/api';

interface PatientTestsViewProps {
  patientId: string;
}

export const PatientTestsView: React.FC<PatientTestsViewProps> = ({ patientId }) => {
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTest, setSelectedTest] = useState<MedicalTest | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadTests();
  }, [patientId]);

  const loadTests = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTests(patientId);
      setTests(res);
    } catch (err) {
      console.error('Failed to load tests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTests = tests.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.testName.toLowerCase().includes(q) ||
      t.doctorName.toLowerCase().includes(q) ||
      t.resultsSummary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TestTube className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">سجل الفحوصات والتحاليل المخبرية</h2>
            <p className="text-xs text-slate-500">
              نتائج تحاليل الدم، الأشعة، وتخطيط القلب المعتمدة من المختبر المركزي
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم التحليل أو الطبيب..."
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Tests Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs font-semibold">
          جاري تحميل الفحوصات الطبية...
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 text-slate-400">
          <TestTube className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold">لا توجد نتائج فحوصات مسجلة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {test.category === 'LABORATORY' ? 'تحليل مخبري' : test.category === 'CARDIOLOGY' ? 'فحص قلب' : 'أشعة تشخيصية'}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 mt-1.5">{test.testName}</h3>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مكتمل</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 mb-4">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>الطبيب الطالب: <strong>{test.doctorName}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>تاريخ الفحص: <strong>{test.testDate}</strong></span>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed mb-4">
                  <strong className="block text-slate-900 mb-0.5">ملخص النتيجة:</strong>
                  {test.resultsSummary}
                </div>

                {/* Micro preview of parameters */}
                {test.detailedItems && test.detailedItems.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    {test.detailedItems.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                        <span className="text-slate-600 truncate max-w-[180px]">{item.parameter}</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-mono">{item.value} {item.unit}</strong>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            item.flag === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.flag === 'NORMAL' ? 'طبيعي' : 'مرتفع'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedTest(test)}
                  className="flex-1 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>عرض التفاصيل والجداول</span>
                </button>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert('جاري تحميل التقرير المخبري المعتمد بصيغة PDF.'); }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="تحميل الملف المرفق"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Test Modal */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
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

            <div className="p-6 space-y-5 text-start text-xs sm:text-sm">
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ الفحص:</span>
                  <strong className="text-slate-900">{selectedTest.testDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الطبيب المشرف:</span>
                  <strong className="text-slate-900">{selectedTest.doctorName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">فني المختبر:</span>
                  <strong className="text-slate-900">{selectedTest.labTechnician || 'المختبر المعتمد'}</strong>
                </div>
              </div>

              {/* Results Summary */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <strong className="block text-emerald-950 font-bold mb-1">التقرير السريري العام:</strong>
                <p className="text-emerald-900 leading-relaxed">{selectedTest.resultsSummary}</p>
              </div>

              {/* Detailed Parameters Table */}
              {selectedTest.detailedItems && selectedTest.detailedItems.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">المعايير والمؤشرات التفصيلية:</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">المؤشر المخبري</th>
                          <th className="p-3">النتيجة</th>
                          <th className="p-3">المعدل الطبيعي (Ref Range)</th>
                          <th className="p-3 text-center">التقييم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTest.detailedItems.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{item.parameter}</td>
                            <td className="p-3 font-bold font-mono text-slate-900">{item.value} {item.unit}</td>
                            <td className="p-3 text-slate-500 font-mono">{item.referenceRange}</td>
                            <td className="p-3 text-center">
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

              {/* Lab Technician Notes */}
              {selectedTest.notes && (
                <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg">
                  ملاحظات المختبر: {selectedTest.notes}
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedTest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer"
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
