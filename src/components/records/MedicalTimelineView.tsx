import React, { useState } from 'react';
import {
  FileText,
  Activity,
  Heart,
  Droplet,
  AlertCircle,
  FileCheck,
  Stethoscope,
  Pill,
  ScanEye,
  PlusCircle,
  Calendar,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { CURRENT_PATIENT, INITIAL_RECORDS } from '../../data/mockData';
import { Language, MedicalRecordItem } from '../../types';

interface MedicalTimelineViewProps {
  language: Language;
}

export const MedicalTimelineView: React.FC<MedicalTimelineViewProps> = ({ language }) => {
  const isAr = language === 'ar';

  const [records, setRecords] = useState<MedicalRecordItem[]>(INITIAL_RECORDS);
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New record form state
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newType, setNewType] = useState<'visit' | 'lab' | 'xray' | 'prescription'>('visit');

  const filteredRecords =
    filterType === 'all'
      ? records
      : records.filter((r) => r.type === filterType);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRec: MedicalRecordItem = {
      id: `rec-${Date.now()}`,
      type: newType,
      titleAr: newTitle,
      titleEn: newTitle,
      date: new Date().toISOString().split('T')[0],
      doctorName: isAr ? 'سجل مدخل بواسطة المريض' : 'Patient Self-Entry',
      specialty: isAr ? 'المتابعة الشخصية' : 'Personal Log',
      details: newDetails,
      statusBadge: isAr ? 'محدث حديثاً' : 'Recent Entry',
    };

    setRecords([newRec, ...records]);
    setNewTitle('');
    setNewDetails('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Patient Header Card (Electronic Health Record EHR) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {CURRENT_PATIENT.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{CURRENT_PATIENT.name}</h2>
                <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 font-bold">
                  {CURRENT_PATIENT.mrn}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {CURRENT_PATIENT.gender} • {CURRENT_PATIENT.age} {isAr ? 'سنة' : 'years'} • {CURRENT_PATIENT.phone}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddOpen(!isAddOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isAr ? 'إضافة سجل صحي جديد' : 'Add Health Record'}</span>
          </button>
        </div>

        {/* Vital Signs / Key Medical Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-xs">
            <span className="flex items-center gap-1 text-rose-700 font-bold text-[11px] mb-1">
              <Droplet className="w-3.5 h-3.5" />
              {isAr ? 'فصيلة الدم' : 'Blood Group'}
            </span>
            <div className="text-base font-black text-slate-900">{CURRENT_PATIENT.bloodType}</div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
            <span className="flex items-center gap-1 text-blue-700 font-bold text-[11px] mb-1">
              <Heart className="w-3.5 h-3.5" />
              {isAr ? 'ضغط الدم الأخير' : 'Last Blood Pressure'}
            </span>
            <div className="text-base font-black text-slate-900">125 / 82 mmHg</div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs">
            <span className="flex items-center gap-1 text-amber-700 font-bold text-[11px] mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {isAr ? 'الحساسية الدوائية' : 'Allergies'}
            </span>
            <div className="text-xs font-bold text-slate-800 truncate">
              {CURRENT_PATIENT.allergies[0]}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] mb-1">
              <Activity className="w-3.5 h-3.5" />
              {isAr ? 'الأمراض المزمنة' : 'Chronic Status'}
            </span>
            <div className="text-xs font-bold text-slate-800 truncate">
              {CURRENT_PATIENT.chronicDiseases[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Add New Record Modal / Drawer */}
      {isAddOpen && (
        <form
          onSubmit={handleAddRecord}
          className="bg-white p-5 rounded-2xl border-2 border-teal-500 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-extrabold text-slate-900">
              {isAr ? 'تسجيل فحص أو قياس صحي جديد' : 'New Health Log Entry'}
            </h3>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'نوع السجل:' : 'Record Type:'}
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
              >
                <option value="visit">{isAr ? 'زيارة أو فحص سريري' : 'Clinical Visit'}</option>
                <option value="lab">{isAr ? 'نتيجة تحليل دم أو مخبري' : 'Lab Result'}</option>
                <option value="xray">{isAr ? 'أشعة أو تصوير طبي' : 'X-Ray / Scan'}</option>
                <option value="prescription">{isAr ? 'وصفة دوائية' : 'Prescription'}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'العنوان الرئيسي:' : 'Title:'}
              </label>
              <input
                type="text"
                required
                placeholder={isAr ? 'مثال: فحص السكر بعد الإفطار، قياس الضغط' : 'e.g. Blood Sugar Check'}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'تفاصيل الملاحظات أو القيم المسجلة:' : 'Details & Measurements:'}
            </label>
            <textarea
              rows={2}
              value={newDetails}
              onChange={(e) => setNewDetails(e.target.value)}
              placeholder={isAr ? 'أدخل النتيجة، التوصيات، أو أي ملاحظات أخرى...' : 'Enter values or notes...'}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition cursor-pointer"
            >
              {isAr ? 'حفظ بالسجل' : 'Save Record'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', labelAr: 'كافة السجلات الطبية', labelEn: 'All Records' },
          { id: 'visit', labelAr: 'الزيارات والفحوصات', labelEn: 'Visits' },
          { id: 'lab', labelAr: 'التحاليل المخبرية', labelEn: 'Lab Tests' },
          { id: 'xray', labelAr: 'الأشعة والتصوير', labelEn: 'X-Rays & Imaging' },
          { id: 'prescription', labelAr: 'الوصفات والأدوية', labelEn: 'Prescriptions' },
        ].map((tab) => {
          const isSelected = filterType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isSelected
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          );
        })}
      </div>

      {/* Timeline List */}
      <div className="relative border-s-2 border-slate-200 ms-4 space-y-6">
        {filteredRecords.map((item) => {
          const getIcon = () => {
            switch (item.type) {
              case 'lab':
                return Droplet;
              case 'xray':
                return ScanEye;
              case 'prescription':
                return Pill;
              case 'visit':
              default:
                return Stethoscope;
            }
          };
          const Icon = getIcon();

          return (
            <div key={item.id} className="relative ms-6">
              {/* Timeline Marker Bullet */}
              <div className="absolute -start-10 top-1.5 w-7 h-7 rounded-full bg-white border-2 border-teal-600 text-teal-700 flex items-center justify-center shadow-xs">
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-shadow">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                      {item.specialty}
                    </span>
                    {item.statusBadge && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {item.statusBadge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.date}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mb-1">
                  {isAr ? item.titleAr : item.titleEn}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.details}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {isAr ? 'الطبيب المعتمد:' : 'Attending Consultant:'}{' '}
                    <strong className="text-slate-700 font-semibold">{item.doctorName}</strong>
                  </span>
                  <span className="text-teal-700 font-semibold cursor-pointer hover:underline">
                    {isAr ? 'عرض التفاصيل الكاملة ←' : 'View Full Details →'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
