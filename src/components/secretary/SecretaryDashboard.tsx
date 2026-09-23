import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Calendar, 
  TestTube, 
  Pill, 
  Search, 
  Filter, 
  User, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Stethoscope, 
  Building2, 
  RefreshCw, 
  Eye, 
  Download,
  AlertCircle,
  MapPin,
  FileCheck
} from 'lucide-react';
import { Appointment, MedicalTest, Prescription } from '../../types/medical';
import { api } from '../../services/api';
import { PrintableBookingModal } from '../common/PrintableBookingModal';
import { PrintableTestResultModal } from '../common/PrintableTestResultModal';
import { PrintablePrescriptionModal } from '../common/PrintablePrescriptionModal';

export const SecretaryDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'APPOINTMENTS' | 'TESTS' | 'PRESCRIPTIONS'>('APPOINTMENTS');

  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search queries
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');
  const [testSearch, setTestSearch] = useState<string>('');
  const [prescriptionSearch, setPrescriptionSearch] = useState<string>('');

  // Modals for Printing
  const [selectedAppointmentForPrint, setSelectedAppointmentForPrint] = useState<Appointment | null>(null);
  const [selectedTestForPrint, setSelectedTestForPrint] = useState<MedicalTest | null>(null);
  const [selectedPrescriptionForPrint, setSelectedPrescriptionForPrint] = useState<Prescription | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [aptsRes, testsRes, rxRes] = await Promise.all([
        api.getAppointments().catch(() => []),
        api.getTests().catch(() => []),
        api.getPrescriptions().catch(() => [])
      ]);
      setAppointments(aptsRes || []);
      setTests(testsRes || []);
      setPrescriptions(rxRes || []);
    } catch (err) {
      console.error('Failed to load secretary data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter(a => {
    const q = appointmentSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.patientName && a.patientName.toLowerCase().includes(q)) ||
      (a.patientMrn && a.patientMrn.toLowerCase().includes(q)) ||
      (a.patientPhone && a.patientPhone.includes(q)) ||
      (a.doctorName && a.doctorName.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  });

  // Filtered Tests
  const filteredTests = tests.filter(t => {
    const q = testSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.testName && t.testName.toLowerCase().includes(q)) ||
      (t.patientName && t.patientName.toLowerCase().includes(q)) ||
      (t.patientMrn && t.patientMrn.toLowerCase().includes(q)) ||
      (t.sampleType && t.sampleType.toLowerCase().includes(q)) ||
      (t.doctorName && t.doctorName.toLowerCase().includes(q))
    );
  });

  // Filtered Prescriptions
  const filteredPrescriptions = prescriptions.filter(p => {
    const q = prescriptionSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.rxNumber && p.rxNumber.toLowerCase().includes(q)) ||
      (p.patientName && p.patientName.toLowerCase().includes(q)) ||
      (p.patientMrn && p.patientMrn.toLowerCase().includes(q)) ||
      (p.doctorName && p.doctorName.toLowerCase().includes(q)) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 text-start font-cairo">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-700/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <Printer className="w-3.5 h-3.5 text-indigo-300" />
              <span>مكتب السكرتاريا والاستقبال الطبي المعتمد</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">بوابة طباعة الحجوزات والفحوصات والروشتات</h1>
            <p className="text-xs sm:text-sm text-indigo-200">
              صلاحية السكرتير للبحث والطباعة الفورية الرسمية للتذاكر والمستندات الطبية المعتمدة للمرضى
            </p>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-lg text-amber-200 text-[11px] font-bold">
              <span>📅 أيام الدوام: السبت، الأحد، الثلاثاء، والأربعاء (الإثنين إجازة رسمية للعيادة)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>

        {/* Quick Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-indigo-700/50">
          <button
            onClick={() => setActiveTab('APPOINTMENTS')}
            className={`p-3.5 rounded-xl border transition-all text-start cursor-pointer ${
              activeTab === 'APPOINTMENTS'
                ? 'bg-white text-slate-900 shadow-md border-white'
                : 'bg-indigo-950/40 text-indigo-100 hover:bg-indigo-950/70 border-indigo-700/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">حجوزات المواعيد</span>
              <Calendar className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black mt-1 font-mono">{appointments.length}</div>
            <span className="text-[10px] opacity-80">جاهزة للطباعة والتوثيق</span>
          </button>

          <button
            onClick={() => setActiveTab('TESTS')}
            className={`p-3.5 rounded-xl border transition-all text-start cursor-pointer ${
              activeTab === 'TESTS'
                ? 'bg-white text-slate-900 shadow-md border-white'
                : 'bg-indigo-950/40 text-indigo-100 hover:bg-indigo-950/70 border-indigo-700/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">الفحوصات ونتائج المختبر</span>
              <TestTube className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black mt-1 font-mono">{tests.length}</div>
            <span className="text-[10px] opacity-80">تقارير مخبرية معتمدة</span>
          </button>

          <button
            onClick={() => setActiveTab('PRESCRIPTIONS')}
            className={`p-3.5 rounded-xl border transition-all text-start cursor-pointer ${
              activeTab === 'PRESCRIPTIONS'
                ? 'bg-white text-slate-900 shadow-md border-white'
                : 'bg-indigo-950/40 text-indigo-100 hover:bg-indigo-950/70 border-indigo-700/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">الروشتات والوصفات الطبية</span>
              <Pill className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black mt-1 font-mono">{prescriptions.length}</div>
            <span className="text-[10px] opacity-80">وصفات Rx جاهزة للطباعة</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('APPOINTMENTS')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'APPOINTMENTS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. طباعة الحجوزات والمواعيد ({filteredAppointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TESTS')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'TESTS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TestTube className="w-4 h-4" />
          <span>2. طباعة الفحوصات والتحاليل ({filteredTests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PRESCRIPTIONS')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'PRESCRIPTIONS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>3. طباعة الروشتات الطبية ({filteredPrescriptions.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: APPOINTMENTS PRINTING */}
      {/* ========================================================================= */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={appointmentSearch}
                onChange={(e) => setAppointmentSearch(e.target.value)}
                placeholder="ابحث باسم المريض، رقم MRN، الطبيب..."
                className="w-full pr-10 pl-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-medium bg-slate-50"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              إجمالي نتائج الحجوزات: <strong className="text-indigo-700">{filteredAppointments.length}</strong>
            </span>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-700 text-sm">لا توجد حجوزات مطابقة</h4>
              <p className="text-xs text-slate-400 mt-1">تأكد من كتابة اسم المريض أو رقمه الطبي بشكل صحيح</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {apt.id.slice(-8).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">{apt.patientName}</h4>
                        <span className="text-[11px] text-slate-500 font-mono">MRN: {apt.patientMrn || 'MRN-2026-8801'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        apt.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {apt.status === 'CONFIRMED' ? 'مؤكد' : 'قيد المراجعة'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-800 font-medium">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{apt.doctorName} ({apt.doctorSpecialty || 'العيادات'})</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>التاريخ: {apt.confirmedDate || apt.preferredDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>الوقت: {apt.confirmedTime || (apt.preferredPeriod === 'EVENING' ? '05:00 م' : '10:00 ص')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>الموقع: {apt.clinicRoom || 'مبنى العيادات الخارجية'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 text-[11px]">الرسوم:</span>
                      <strong className="text-emerald-700 font-black font-mono">
                        {apt.fee || 3000} ر.ي
                      </strong>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAppointmentForPrint(apt)}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة تذكرة الحجز</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MEDICAL TESTS PRINTING */}
      {/* ========================================================================= */}
      {activeTab === 'TESTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                placeholder="ابحث باسم الفحص، المريض، نوع العينة..."
                className="w-full pr-10 pl-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 font-medium bg-slate-50"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              إجمالي الفحوصات الجاهزة: <strong className="text-emerald-700">{filteredTests.length}</strong>
            </span>
          </div>

          {filteredTests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <TestTube className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-700 text-sm">لا توجد فحوصات مطابقة</h4>
              <p className="text-xs text-slate-400 mt-1">تأكد من مدخلات البحث أو أعد المحاولة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {test.id.slice(-8).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">{test.testName}</h4>
                        <span className="text-[11px] text-slate-500 font-medium">{test.patientName} (MRN: {test.patientMrn})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {test.status === 'COMPLETED' ? 'معتمد' : test.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">نوع العينة:</span>
                        <strong className="text-emerald-800 text-xs font-bold">{test.sampleType || 'عينة دم وريدي'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">تاريخ الفحص:</span>
                        <span className="text-slate-800 font-mono text-xs">{test.testDate || 'اليوم'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">الطبيب:</span>
                        <span className="text-slate-800 text-xs">{test.doctorName}</span>
                      </div>
                      {test.detailedItems && test.detailedItems.length > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                          <span className="text-slate-500 text-[11px]">المؤشرات المسجلة:</span>
                          <span className="text-indigo-700 font-bold text-xs">{test.detailedItems.length} مؤشرات</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg italic">
                      "{test.resultsSummary || 'النتائج مكتملة وضمن المعدل الطبيعي.'}"
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTestForPrint(test)}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة تقرير الفحص</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRESCRIPTIONS PRINTING */}
      {/* ========================================================================= */}
      {activeTab === 'PRESCRIPTIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={prescriptionSearch}
                onChange={(e) => setPrescriptionSearch(e.target.value)}
                placeholder="ابحث برقم الروشتة Rx، اسم المريض، الطبيب..."
                className="w-full pr-10 pl-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 font-medium bg-slate-50"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              إجمالي الروشتات الطبية: <strong className="text-purple-700">{filteredPrescriptions.length}</strong>
            </span>
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-700 text-sm">لا توجد روشتات طبية مطابقة</h4>
              <p className="text-xs text-slate-400 mt-1">تأكد من رقم الروشتة أو اسم المريض</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          {rx.rxNumber || rx.id.slice(-8).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">{rx.patientName}</h4>
                        <span className="text-[11px] text-slate-500 font-mono">MRN: {rx.patientMrn || 'MRN-2026-8801'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {rx.status === 'APPROVED' ? 'معتمدة' : rx.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">الطبيب المعالج:</span>
                        <strong className="text-slate-800 text-xs">{rx.doctorName}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">تاريخ الوصفة:</span>
                        <span className="text-slate-800 font-mono text-xs">{rx.issuedDate || 'اليوم'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">التشخيص:</span>
                        <span className="text-slate-800 text-xs font-medium">{rx.diagnosis || 'فحص سريري عام'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500 text-[11px]">عدد الأدوية المصروفة:</span>
                        <span className="text-purple-700 font-bold text-xs">{rx.items?.length || 0} أدوية</span>
                      </div>
                    </div>

                    {rx.items && rx.items.length > 0 && (
                      <div className="text-[11px] text-slate-600 bg-purple-50/40 p-2.5 rounded-lg space-y-1 border border-purple-100">
                        <strong className="block text-[10px] text-purple-800 font-bold">الأدوية الموصوفة:</strong>
                        <ul className="list-disc list-inside space-y-0.5">
                          {rx.items.slice(0, 2).map((it, idx) => (
                            <li key={idx} className="truncate">
                              {it.medicationName} ({it.strength}) - {it.frequency}
                            </li>
                          ))}
                          {rx.items.length > 2 && (
                            <li className="text-[10px] text-purple-600 font-semibold list-none">
                              + {rx.items.length - 2} أدوية أخرى...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPrescriptionForPrint(rx)}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة الروشتة (Rx)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE MODALS */}
      {/* ========================================================================= */}
      <PrintableBookingModal
        isOpen={!!selectedAppointmentForPrint}
        onClose={() => setSelectedAppointmentForPrint(null)}
        appointment={selectedAppointmentForPrint}
      />

      <PrintableTestResultModal
        isOpen={!!selectedTestForPrint}
        onClose={() => setSelectedTestForPrint(null)}
        test={selectedTestForPrint}
      />

      <PrintablePrescriptionModal
        isOpen={!!selectedPrescriptionForPrint}
        onClose={() => setSelectedPrescriptionForPrint(null)}
        prescription={selectedPrescriptionForPrint}
      />
    </div>
  );
};
