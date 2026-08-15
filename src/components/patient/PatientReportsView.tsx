import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  User, 
  Eye, 
  ShieldCheck, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { MedicalReport } from '../../types/medical';
import { api } from '../../services/api';
import { PrintableReportModal } from '../common/PrintableReportModal';

interface PatientReportsViewProps {
  patientId: string;
}

export const PatientReportsView: React.FC<PatientReportsViewProps> = ({ patientId }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadReports();
  }, [patientId]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReports(patientId);
      setReports(res);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = reports.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.doctorName.toLowerCase().includes(q) ||
      r.reportNumber.toLowerCase().includes(q) ||
      r.diagnosis.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">التقارير الطبية الرسمية المعتمدة</h2>
            <p className="text-xs text-slate-500">
              تقارير الخروج، تقارير المعاينات الاستشارية، والفحوصات الشاملة الموثقة بختم المستشفى
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
            placeholder="بحث برقم التقرير أو الطبيب..."
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs font-semibold">
          جاري تحميل التقارير الطبية...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold">لا توجد تقارير طبية مسجلة حتى الآن.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                      {report.reportNumber}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 mt-1.5 leading-snug">
                      {report.title}
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>معتمد</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 mb-4">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>الطبيب: <strong>{report.doctorName}</strong> ({report.doctorSpecialty})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>تاريخ الإصدار: <strong>{report.reportDate}</strong></span>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed mb-4">
                  <strong className="block text-slate-900 mb-0.5">التشخيص المعتمد:</strong>
                  <p className="font-bold text-blue-900 mb-1">{report.diagnosis}</p>
                  <p className="text-slate-600 line-clamp-2">{report.summary}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedReport(report)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>معاينة وتحميل التقرير (PDF)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Report Modal */}
      <PrintableReportModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
      />
    </div>
  );
};
