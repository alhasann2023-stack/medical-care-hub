import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Stethoscope, 
  TestTube, 
  FileText, 
  Pill, 
  MessageSquare, 
  Calendar, 
  ChevronRight, 
  Download, 
  Eye, 
  Filter,
  Search,
  Sparkles,
  User,
  HeartPulse,
  Clock,
  X
} from 'lucide-react';
import { TimelineItem, Patient, MedicalReport, Prescription, MedicalTest, MedicalExamination } from '../../types/medical';
import { api } from '../../services/api';
import { AICallout } from '../common/AICallout';
import { PrintableReportModal } from '../common/PrintableReportModal';
import { PrintablePrescriptionModal } from '../common/PrintablePrescriptionModal';

interface MedicalTimelineProps {
  patientId: string;
  onOpenBooking?: () => void;
  onOpenConsultation?: () => void;
}

export const MedicalTimeline: React.FC<MedicalTimelineProps> = ({
  patientId,
  onOpenBooking,
  onOpenConsultation
}) => {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<TimelineItem | null>(null);

  useEffect(() => {
    loadTimeline();
  }, [patientId]);

  const loadTimeline = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPatientTimeline(patientId);
      setPatient(res.patient);
      setTimeline(res.timeline);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenItem = async (item: TimelineItem) => {
    if (item.type === 'REPORT') {
      try {
        const rep = await api.getReports(patientId);
        const target = rep.find(r => r.id === item.referenceId);
        if (target) setSelectedReport(target);
      } catch (e) {
        console.error(e);
      }
    } else if (item.type === 'PRESCRIPTION') {
      try {
        const rxs = await api.getPrescriptions(patientId);
        const target = rxs.find(p => p.id === item.referenceId);
        if (target) setSelectedPrescription(target);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSelectedItemDetail(item);
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'EXAMINATION':
        return {
          label: 'معاينة سريرية',
          icon: Stethoscope,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          border: 'border-blue-200'
        };
      case 'TEST':
      case 'RESULT':
        return {
          label: 'فحص ونتائج مخبرية',
          icon: TestTube,
          color: 'text-emerald-600',
          bg: 'bg-emerald-100',
          border: 'border-emerald-200'
        };
      case 'PRESCRIPTION':
        return {
          label: 'وصفة طبية',
          icon: Pill,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          border: 'border-purple-200'
        };
      case 'CONSULTATION':
        return {
          label: 'استشارة طبية',
          icon: MessageSquare,
          color: 'text-cyan-600',
          bg: 'bg-cyan-100',
          border: 'border-cyan-200'
        };
      case 'REPORT':
        return {
          label: 'تقرير طبي معتمد',
          icon: FileText,
          color: 'text-rose-600',
          bg: 'bg-rose-100',
          border: 'border-rose-200'
        };
      default:
        return {
          label: 'سجل طبي',
          icon: Activity,
          color: 'text-slate-600',
          bg: 'bg-slate-100',
          border: 'border-slate-200'
        };
    }
  };

  const filteredTimeline = timeline.filter(item => {
    if (selectedFilter !== 'ALL' && item.type !== selectedFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Patient Header & Quick Bio Bar */}
      {patient && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={patient.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={patient.fullName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-100 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-black text-lg text-slate-900">{patient.fullName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-mono">
                  {patient.mrn}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                  {patient.bloodType}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                رقم الهاتف (المعرف الأساسي): <strong className="text-slate-700 font-mono">{patient.phone}</strong> | {patient.gender === 'MALE' ? 'ذكر' : 'أنثى'} ({patient.birthDate})
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                <span className="text-slate-400">الحساسيات:</span>
                {patient.allergies.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-medium">
                    {a}
                  </span>
                ))}
                <span className="text-slate-400 mr-2">الأمراض المزمنة:</span>
                {patient.chronicDiseases.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100 font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenBooking && (
              <button
                onClick={onOpenBooking}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                حجز موعد جديد
              </button>
            )}
            {onOpenConsultation && (
              <button
                onClick={onOpenConsultation}
                className="px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold text-xs transition-colors cursor-pointer"
              >
                استشارة جديدة
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI Medical Record Summarizer Callout */}
      <AICallout patientId={patientId} patientName={patient?.fullName} />

      {/* Timeline Controls & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'EXAMINATION', label: 'المعاينات' },
            { id: 'RESULT', label: 'الفحوصات والنتائج' },
            { id: 'PRESCRIPTION', label: 'الوصفات' },
            { id: 'CONSULTATION', label: 'الاستشارات' },
            { id: 'REPORT', label: 'التقارير' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في السجل الطبي..."
            className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Chronological Stream */}
      <div className="relative border-r-2 border-slate-200 mr-4 sm:mr-6 pr-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold">
            جاري تحميل السجل الطبي...
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 p-8">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">لا توجد سجلات تطابق الفلتر المحدد.</p>
          </div>
        ) : (
          filteredTimeline.map((item) => {
            const config = getTypeConfig(item.type);
            const Icon = config.icon;

            return (
              <div key={item.id} className="relative group">
                {/* Node Bullet Icon */}
                <div
                  className={`absolute -right-[35px] top-4 w-8 h-8 rounded-full ${config.bg} ${config.color} border-2 border-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.date}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenItem(item)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <span>عرض التفاصيل الكاملة</span>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mb-2">
                    {item.subtitle}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    {item.details}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Item Details Generic Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm">{selectedItemDetail.title}</span>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs sm:text-sm text-start">
              <div>
                <span className="text-slate-400 block text-xs">التاريخ:</span>
                <strong className="text-slate-800">{selectedItemDetail.date}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">الطبيب المعالج / الجهة:</span>
                <strong className="text-slate-800">{selectedItemDetail.doctorName}</strong>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-xs mb-1">التفاصيل السريرية المسجلة:</span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                  {selectedItemDetail.details}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-200 text-end">
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <PrintableReportModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
      />

      {/* Prescription Modal */}
      <PrintablePrescriptionModal
        isOpen={!!selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
        prescription={selectedPrescription}
      />
    </div>
  );
};
