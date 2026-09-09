import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  TestTube, 
  Search, 
  Filter, 
  Plus, 
  Printer, 
  User, 
  Calendar, 
  Clock, 
  Stethoscope, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Building2, 
  Send, 
  X, 
  RefreshCw, 
  Check, 
  ChevronDown, 
  Paperclip, 
  Trash2,
  Phone,
  FileCheck,
  Scan,
  Eye,
  Camera,
  Upload,
  Image as ImageIcon,
  ShieldCheck
} from 'lucide-react';
import { MedicalTest, Patient, Doctor, Appointment, MedicalTestItem } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PrintableTestResultModal } from '../common/PrintableTestResultModal';

// Pre-defined Quick Test Templates (Laboratory & Radiology)
const TEST_TEMPLATES: Record<string, {
  category: 'LABORATORY' | 'RADIOLOGY' | 'CARDIOLOGY' | 'PATHOLOGY';
  sampleType: string;
  summary: string;
  items: MedicalTestItem[];
}> = {
  'أشعة سينية للصدر (Chest X-Ray)': {
    category: 'RADIOLOGY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'Lung Fields & Parenchyma', value: 'Clear', unit: '-', referenceRange: 'Clear bilateral', flag: 'NORMAL' },
      { parameter: 'Cardiothoracic Ratio (CTR)', value: '46%', unit: '%', referenceRange: '< 50%', flag: 'NORMAL' },
      { parameter: 'Costophrenic Angles', value: 'Sharp', unit: '-', referenceRange: 'Sharp', flag: 'NORMAL' },
      { parameter: 'Bony Cage & Ribs', value: 'Intact', unit: '-', referenceRange: 'Intact', flag: 'NORMAL' }
    ]
  },
  'أشعة تلفزيونية للبطن والحوض (Abdominal Ultrasound)': {
    category: 'RADIOLOGY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'Liver Size & Echotexture', value: 'Normal', unit: '-', referenceRange: 'Normal homogeneic', flag: 'NORMAL' },
      { parameter: 'Gallbladder', value: 'Calculus Free', unit: '-', referenceRange: 'Thin-walled, no stones', flag: 'NORMAL' },
      { parameter: 'Kidneys Corticomedullary', value: 'Preserved', unit: '-', referenceRange: 'Normal bilateral', flag: 'NORMAL' },
      { parameter: 'Free Pelvic Fluid', value: 'Absent', unit: '-', referenceRange: 'Absent', flag: 'NORMAL' }
    ]
  },
  'أشعة مقطعية محورية (CT Scan)': {
    category: 'RADIOLOGY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'Structural Morphology', value: 'Normal', unit: '-', referenceRange: 'Normal anatomy', flag: 'NORMAL' },
      { parameter: 'Focal Lesions', value: 'None', unit: '-', referenceRange: 'Negative', flag: 'NORMAL' }
    ]
  },
  'رنين مغناطيسي (MRI Scan)': {
    category: 'RADIOLOGY',
    sampleType: '',
    summary: ' ',
    items: [
      { parameter: 'Signal Intensity', value: 'Normal', unit: '-', referenceRange: 'Isointense', flag: 'NORMAL' },
      { parameter: 'Disc Alignment', value: 'Preserved', unit: '-', referenceRange: 'Intact lordosis', flag: 'NORMAL' }
    ]
  },
  'صورة الدم الكاملة (CBC)': {
    category: 'LABORATORY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'Hemoglobin (Hb)', value: '14.5', unit: 'g/dL', referenceRange: '13.0 - 17.5', flag: 'NORMAL' },
      { parameter: 'RBC (Red Blood Cells)', value: '4.8', unit: 'x10^12/L', referenceRange: '4.5 - 5.9', flag: 'NORMAL' },
      { parameter: 'WBC (White Blood Cells)', value: '6.7', unit: 'x10^9/L', referenceRange: '4.0 - 11.0', flag: 'NORMAL' },
      { parameter: 'Platelets (PLT)', value: '250', unit: 'x10^9/L', referenceRange: '150 - 450', flag: 'NORMAL' },
      { parameter: 'Hematocrit (HCT)', value: '43.2', unit: '%', referenceRange: '40.0 - 52.0', flag: 'NORMAL' }
    ]
  },
  'فحص السكر التراكمي (HbA1c)': {
    category: 'LABORATORY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'HbA1c (Glycated Hemoglobin)', value: '5.6', unit: '%', referenceRange: '4.0 - 5.6', flag: 'NORMAL' },
      { parameter: 'Estimated Avg Glucose (eAG)', value: '114', unit: 'mg/dL', referenceRange: '70 - 126', flag: 'NORMAL' }
    ]
  },
  'فحص وظائف الكبد (LFT)': {
    category: 'LABORATORY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'ALT (Alanine Aminotransferase)', value: '28', unit: 'U/L', referenceRange: '7 - 56', flag: 'NORMAL' },
      { parameter: 'AST (Aspartate Aminotransferase)', value: '24', unit: 'U/L', referenceRange: '10 - 40', flag: 'NORMAL' },
      { parameter: 'Total Bilirubin', value: '0.8', unit: 'mg/dL', referenceRange: '0.2 - 1.2', flag: 'NORMAL' },
      { parameter: 'Albumin', value: '4.3', unit: 'g/dL', referenceRange: '3.4 - 5.4', flag: 'NORMAL' }
    ]
  },
  'فحص وظائف الكلى (RFT)': {
    category: 'LABORATORY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.6 - 1.2', flag: 'NORMAL' },
      { parameter: 'Blood Urea Nitrogen (BUN)', value: '14', unit: 'mg/dL', referenceRange: '7 - 20', flag: 'NORMAL' },
      { parameter: 'eGFR', value: '98', unit: 'mL/min/1.73m²', referenceRange: '> 90', flag: 'NORMAL' }
    ]
  },
  'فحص دهون الدم الشامل (Lipid Profile)': {
    category: 'LABORATORY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'Total Cholesterol', value: '175', unit: 'mg/dL', referenceRange: '< 200', flag: 'NORMAL' },
      { parameter: 'Triglycerides', value: '130', unit: 'mg/dL', referenceRange: '< 150', flag: 'NORMAL' },
      { parameter: 'HDL (Good Cholesterol)', value: '52', unit: 'mg/dL', referenceRange: '> 40', flag: 'NORMAL' },
      { parameter: 'LDL (Bad Cholesterol)', value: '97', unit: 'mg/dL', referenceRange: '< 100', flag: 'NORMAL' }
    ]
  },
  'فحص البول العام (Urinalysis)': {
    category: 'LABORATORY',
    sampleType: '',
    summary: '',
    items: [
      { parameter: 'Color & Appearance', value: 'Yellow / Clear', unit: '-', referenceRange: 'Yellow / Clear', flag: 'NORMAL' },
      { parameter: 'pH', value: '6.0', unit: '-', referenceRange: '4.6 - 8.0', flag: 'NORMAL' },
      { parameter: 'Specific Gravity', value: '1.018', unit: '-', referenceRange: '1.005 - 1.030', flag: 'NORMAL' },
      { parameter: 'Protein', value: 'Negative', unit: 'mg/dL', referenceRange: 'Negative', flag: 'NORMAL' },
      { parameter: 'Glucose', value: 'Negative', unit: 'mg/dL', referenceRange: 'Negative', flag: 'NORMAL' }
    ]
  }
};

export const LabDashboard: React.FC = () => {
  const { user } = useAuth();

  // Data lists
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');

  // Print modal state
  const [printingTest, setPrintingTest] = useState<MedicalTest | null>(null);

  const isRadiologyUser = user?.role === 'RADIOLOGY' || user?.department === 'RADIOLOGY' || user?.roleTitle?.includes('أشعة');

  // Attachment & Image State for Radiology / Lab
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // New Test Modal State
  const [isNewTestModalOpen, setIsNewTestModalOpen] = useState<boolean>(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [testName, setTestName] = useState<string>(isRadiologyUser ? 'أشعة سينية للصدر (Chest X-Ray)' : 'صورة الدم الكاملة (CBC)');
  const [testCategory, setTestCategory] = useState<'LABORATORY' | 'RADIOLOGY' | 'CARDIOLOGY' | 'PATHOLOGY'>(isRadiologyUser ? 'RADIOLOGY' : 'LABORATORY');
  const [sampleType, setSampleType] = useState<string>(isRadiologyUser ? 'صورة أشعة سينية رقمية (Digital X-Ray)' : 'عينة دم وريدي (EDTA)');
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [resultsSummary, setResultsSummary] = useState<string>('');
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [detailedItems, setDetailedItems] = useState<MedicalTestItem[]>([]);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File Upload Processor supporting Android WebView and image compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 25 * 1024 * 1024) {
      setNotificationMsg({ type: 'error', text: 'حجم صورة الأشعة أو الملف يتجاوز الحد المسموح به (25 ميجابايت).' });
      return;
    }

    setIsProcessingFile(true);
    try {
      if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
        const rawDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Compact images (< 800KB) can be stored directly
        if (file.size < 800 * 1024) {
          setAttachmentUrl(rawDataUrl);
          setAttachmentName(file.name);
          return;
        }

        // Compress large camera/radiology image to max dimension 1920px
        const compressed = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1920;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(rawDataUrl);
            }
          };
          img.onerror = () => resolve(rawDataUrl);
          img.src = rawDataUrl;
        });

        setAttachmentUrl(compressed);
        setAttachmentName(file.name);
      } else {
        // PDF or document
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachmentUrl((event.target?.result as string) || '');
          setAttachmentName(file.name);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: 'تعذر قراءة أو ضغط الملف المحدد.' });
    } finally {
      setIsProcessingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentUrl('');
    setAttachmentName('');
  };

  // Load all lab data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [testsRes, patientsRes, doctorsRes, appointmentsRes] = await Promise.all([
        api.getTests().catch(() => []),
        api.getPatients().catch(() => []),
        api.getDoctors().catch(() => []),
        api.getAppointments().catch(() => [])
      ]);

      setTests(testsRes || []);
      setPatients(patientsRes || []);
      setDoctors(doctorsRes || []);
      setAppointments(appointmentsRes || []);
    } catch (err) {
      console.error('Failed to load lab data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When opening new test modal, load default template
  const handleOpenNewTestModal = (fromAppt?: Appointment) => {
    if (fromAppt) {
      setSelectedAppointmentId(fromAppt.id);
      setSelectedPatientId(fromAppt.patientId);
      setSelectedDoctorId(fromAppt.doctorId);
    } else {
      setSelectedAppointmentId('');
      if (patients.length > 0) setSelectedPatientId(patients[0].id);
      if (doctors.length > 0) setSelectedDoctorId(doctors[0].id);
    }

    setAttachmentUrl('');
    setAttachmentName('');

    // Apply default template based on department
    if (isRadiologyUser) {
      applyTemplate('أشعة سينية للصدر (Chest X-Ray)');
    } else {
      applyTemplate('صورة الدم الكاملة (CBC)');
    }
    setIsNewTestModalOpen(true);
  };

  // Apply a test template
  const applyTemplate = (name: string) => {
    setTestName(name);
    const tmpl = TEST_TEMPLATES[name];
    if (tmpl) {
      setTestCategory(tmpl.category);
      setSampleType(tmpl.sampleType);
      setResultsSummary(tmpl.summary);
      setDetailedItems([...tmpl.items]);
    } else {
      setDetailedItems([
        { parameter: 'النتيجة الرئيسية', value: '', unit: '', referenceRange: '', flag: 'NORMAL' }
      ]);
    }
  };

  // Handle appointment selection change
  const handleAppointmentChange = (apptId: string) => {
    setSelectedAppointmentId(apptId);
    const appt = appointments.find(a => a.id === apptId);
    if (appt) {
      setSelectedPatientId(appt.patientId);
      setSelectedDoctorId(appt.doctorId);
    }
  };

  // Detailed items management
  const handleAddItem = () => {
    setDetailedItems(prev => [
      ...prev,
      { parameter: '', value: '', unit: '', referenceRange: '', flag: 'NORMAL' }
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof MedicalTestItem, val: any) => {
    setDetailedItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setDetailedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit test and send to doctor
  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) {
      setNotificationMsg({ type: 'error', text: 'يرجى إدخال اسم الفحص أو الأشعة.' });
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId) || patients[0];
    const doctor = doctors.find(d => d.id === selectedDoctorId) || doctors[0];

    if (!patient || !doctor) {
      setNotificationMsg({ type: 'error', text: 'يرجى تحديد المريض والطبيب المعالج بدقة.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createTest({
        patientId: patient.id,
        patientName: patient.fullName,
        patientMrn: patient.mrn,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        testName: testName.trim(),
        category: testCategory,
        sampleType,
        testDate,
        status: 'COMPLETED',
        resultsSummary: resultsSummary.trim() || (isRadiologyUser ? 'تم فحص صورة الأشعة بنجاح والتأكد من سلامة المؤشرات.' : 'النتائج معتمدة وضمن المعدلات السريرية.'),
        detailedItems: detailedItems.filter(i => i.parameter.trim().length > 0),
        notes: doctorNotes.trim(),
        labTechnician: user?.fullName || (isRadiologyUser ? 'أخصائي وفني قسم الأشعة والتصوير' : 'أخصائي وفني المختبر والتحاليل'),
        attachmentUrl: attachmentUrl || '#',
        attachmentName: attachmentName || `${testName.replace(/\s+/g, '_')}_${patient.mrn}.pdf`
      });

      setNotificationMsg({
        type: 'success',
        text: `تم اعتماد وإرسال تقرير ومرفقات "${testName}" للمريض ${patient.fullName} وإلى الطبيب المعالج د. ${doctor.fullName} بنجاح!`
      });

      setIsNewTestModalOpen(false);
      await loadData();

      // Offer instant preview/print
      if (created) {
        setPrintingTest(created);
      }
    } catch (err: any) {
      console.error(err);
      setNotificationMsg({ type: 'error', text: err.message || 'فشل إرسال الفحص الطبي.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered tests
  const filteredTests = tests.filter(test => {
    const matchesSearch = 
      (test.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (test.patientMrn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (test.testName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (test.doctorName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || test.category === categoryFilter;
    const matchesDoctor = selectedDoctorFilter === 'ALL' || test.doctorId === selectedDoctorFilter;

    return matchesSearch && matchesCategory && matchesDoctor;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-cairo text-slate-800 pb-16">
      {/* Top Banner / Navigation */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                isRadiologyUser 
                  ? 'bg-indigo-500/20 border border-indigo-400/30 text-indigo-400' 
                  : 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-400'
              }`}>
                {isRadiologyUser ? <Scan className="w-6 h-6" /> : <FlaskConical className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight">
                    {isRadiologyUser ? 'بوابة قسم الأشعة والتصوير الطبي المركزي' : 'بوابة المختبر والتحاليل الطبية المركزية'}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    isRadiologyUser ? 'bg-indigo-400 text-slate-950' : 'bg-cyan-400 text-slate-950'
                  }`}>
                    {isRadiologyUser ? 'إرفاق الأشعة والتحاليل الفورية' : 'نظام الربط الطبي الفوري'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  أهلاً بك، <span className="text-white font-bold">{user?.fullName || (isRadiologyUser ? 'أخصائي الأشعة' : 'أخصائي المختبر')}</span> • إرفاق صور وتقارير الفحوصات وإرسالها للمريض وللطبيب المعالج
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => loadData()}
                disabled={isLoading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => handleOpenNewTestModal()}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                  isRadiologyUser 
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20' 
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                }`}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{isRadiologyUser ? 'إجراء وإرفاق صور أشعة جديدة للمريض والطبيب' : 'إجراء وإرسال فحص جديد للطبيب المعالج'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Toast Alert */}
        {notificationMsg && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all shadow-sm ${
            notificationMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {notificationMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{notificationMsg.text}</span>
            </div>
            <button 
              onClick={() => setNotificationMsg(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Statistical KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">إجمالي الفحوصات المنجزة</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{tests.length}</h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">سجل رقمي معتمد</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TestTube className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">مُرسلة للأطباء المعالجين</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {tests.filter(t => t.status === 'COMPLETED').length}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-1">متصلة بملف المريض</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">المرضى المراجعين</p>
              <h3 className="text-2xl font-black text-indigo-600 mt-1">{patients.length}</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-1">ملفات طبية مسجلة</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">الأطباء والعيادات المرتبطة</p>
              <h3 className="text-2xl font-black text-cyan-700 mt-1">{doctors.length}</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-1">استشاريون معتمدون</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Quick Incoming Patient Appointments Banner */}
        {appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'NEW').length > 0 && (
          <div className="bg-cyan-50/80 border border-cyan-200 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-cyan-950">
                    مواعيد وحجوزات اليوم المؤكدة لدى الأطباء (جاهزة لسحب العينات والفحص)
                  </h4>
                  <p className="text-[11px] text-cyan-800">
                    يمكنك بنقرة زر واحدة بدء الفحص المخبري للمريض وإرسال النتيجة مباشرة إلى طبيبه المعالج.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
                {appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'NEW').slice(0, 3).map(appt => (
                  <button
                    key={appt.id}
                    onClick={() => handleOpenNewTestModal(appt)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-cyan-100/50 border border-cyan-300 text-cyan-950 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs shrink-0 transition-colors"
                  >
                    <span>{appt.patientName}</span>
                    <span className="text-[10px] text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded">
                      د. {appt.doctorName}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-cyan-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tests Management Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث باسم المريض، رقم الملف الطبي (MRN)، اسم الفحص، أو الطبيب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-700">التصنيف:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">جميع الفحوصات</option>
                  <option value="LABORATORY">مختبرية (Lab)</option>
                  <option value="RADIOLOGY">أشعة وتصوير (Radiology)</option>
                  <option value="CARDIOLOGY">قلب (Cardiology)</option>
                  <option value="PATHOLOGY">أنسجة (Pathology)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-700">الطبيب المعالج:</span>
                <select
                  value={selectedDoctorFilter}
                  onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                  className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer max-w-[150px] truncate"
                >
                  <option value="ALL">جميع الأطباء</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>د. {d.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tests Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">رمز التقرير والفحص</th>
                  <th className="p-3.5">المريض ورقم الملف (MRN)</th>
                  <th className="p-3.5">الطبيب المعالج والمستلم</th>
                  <th className="p-3.5">نوع العينة وتاريخ الإجراء</th>
                  <th className="p-3.5">حالة النتائج والتسليم</th>
                  <th className="p-3.5 text-center">الإجراءات والطباعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <TestTube className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
                      <p className="font-bold">لا توجد فحوصات مطابقة لبحثك الحالي</p>
                      <button
                        onClick={() => handleOpenNewTestModal()}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إجراء فحص مخبري جديد الآن</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                            test.category === 'RADIOLOGY' 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : 'bg-cyan-50 text-cyan-700'
                          }`}>
                            {test.category === 'RADIOLOGY' ? <Scan className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900 block">{test.testName}</span>
                              {test.category === 'RADIOLOGY' && (
                                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold">
                                  أشعة
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {test.id.startsWith('tst-') ? (test.category === 'RADIOLOGY' ? `RAD-${test.id.slice(-6).toUpperCase()}` : `LAB-${test.id.slice(-6).toUpperCase()}`) : test.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{test.patientName}</div>
                        <div className="text-[11px] font-mono text-cyan-700 font-semibold">{test.patientMrn}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{test.doctorName}</span>
                        </div>
                        <span className="block text-[10px] text-slate-400">
                          تم تسليم النتيجة للطبيب المعالج
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600">
                        <div className="font-semibold text-slate-800">{test.sampleType || 'عينة فحص'}</div>
                        <div className="text-[10px] text-slate-400">{test.testDate}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>تم إرسالها للمريض والطبيب</span>
                        </span>
                        {test.attachmentUrl && test.attachmentUrl !== '#' && (
                          <div className="mt-1.5 flex items-center gap-1">
                            {test.attachmentUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|webp)$/i.test(test.attachmentUrl || '') || /\.(jpg|jpeg|png|webp)$/i.test(test.attachmentName || '') ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(test.attachmentUrl!)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 cursor-pointer transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                <span>معاينة صورة الأشعة</span>
                              </button>
                            ) : (
                              <a
                                href={test.attachmentUrl}
                                download={test.attachmentName || 'medical-file.pdf'}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200 transition-colors"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span>تحميل الملف المرفق</span>
                              </a>
                            )}
                          </div>
                        )}
                        {test.detailedItems && test.detailedItems.length > 0 && !test.attachmentUrl && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {test.detailedItems.length} مؤشر تحليلي مسجل
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setPrintingTest(test)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 hover:border-cyan-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          title="معاينة وطباعة التقرير الطبي الرسمي"
                        >
                          <Printer className="w-3.5 h-3.5 text-cyan-700" />
                          <span>طباعة التقرير</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* New Lab Test Modal */}
      {isNewTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">إجراء وإرسال فحص مخبري إلى الطبيب المعالج</h3>
                  <p className="text-[11px] text-cyan-200">
                    يتم إدراج النتائج والتحاليل فوراً في السجل الطبي للمريض وإشعار الطبيب المعالج بنتيجة الفحص
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTestModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitTest} className="p-6 overflow-y-auto space-y-6 text-xs text-start">
              
              {/* Section 1: Patient & Doctor Selection */}
              <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-cyan-950 text-xs">
                  <User className="w-4 h-4 text-cyan-700" />
                  <span>تحديد المريض والطبيب المعالج المستلم لنتائج الفحص *</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Patient */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">المريض المطلوب فحصه *</label>
                    <select
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:border-cyan-600 outline-none"
                    >
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.mrn}) - هاتف: {p.phone}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Treating Doctor */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      الطبيب المعالج (الذي حجز عنده المريض ويستلم النتائج) *
                    </label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:border-cyan-600 outline-none"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          د. {d.fullName} ({d.specialtyNameAr || 'استشاري العيادات'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Link from Active Bookings */}
                {appointments.length > 0 && (
                  <div className="pt-2 border-t border-cyan-200/60">
                    <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                      أو اختر موعداً حالياً للمريض لربطه بالطبيب تلقائياً:
                    </label>
                    <select
                      value={selectedAppointmentId}
                      onChange={(e) => handleAppointmentChange(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-cyan-300 bg-white text-[11px] text-cyan-950 font-semibold outline-none"
                    >
                      <option value="">-- ربط بموعد محدد اختياري --</option>
                      {appointments.map(a => (
                        <option key={a.id} value={a.id}>
                          المريض: {a.patientName} ⬅️ حجز لدى د. {a.doctorName} ({a.appointmentDate} - {a.appointmentTime})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Section 2: Test Metadata & Quick Templates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-slate-800 text-xs">نماذج التحاليل المخبرية السريعة الشائعة:</label>
                  <span className="text-[10px] text-cyan-700 font-bold">تعبئة تلقائية للقيم المرجعية</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {Object.keys(TEST_TEMPLATES).map((tplName) => (
                    <button
                      key={tplName}
                      type="button"
                      onClick={() => applyTemplate(tplName)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        testName === tplName
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {tplName}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم الفحص المخبري *</label>
                    <input
                      type="text"
                      required
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      placeholder="مثال: فحص صورة الدم الكاملة CBC"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-cyan-600 outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تصنيف الفحص *</label>
                    <select
                      value={testCategory}
                      onChange={(e) => setTestCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:border-cyan-600 outline-none"
                    >
                      <option value="LABORATORY">فحص مخبري (Laboratory)</option>
                      <option value="RADIOLOGY">أشعة وتصوير طبي (Radiology)</option>
                      <option value="CARDIOLOGY">تخطيط وتشخيص قلب (Cardiology)</option>
                      <option value="PATHOLOGY">علم الأمراض والأنسجة (Pathology)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">نوع العينة المسحوبة *</label>
                    <input
                      type="text"
                      required
                      value={sampleType}
                      onChange={(e) => setSampleType(e.target.value)}
                      placeholder="مثال: عينة دم وريدي، مصل، بول..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-cyan-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Detailed Parameters Table */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">المؤشرات والبارامترات التحليلية المفصلة (Parameters)</h4>
                    <p className="text-[10px] text-slate-500">سجل القيم العددية والمجالات المرجعية لتظهر في تقرير الطبيب</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-100 text-cyan-800 hover:bg-cyan-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مؤشر / بارامتر</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {detailedItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="col-span-4 sm:col-span-3">
                        <input
                          type="text"
                          placeholder="المؤشر (مثال: Hb)"
                          value={item.parameter}
                          onChange={(e) => handleUpdateItem(idx, 'parameter', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-800 text-xs outline-none"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="text"
                          placeholder="القيمة"
                          value={item.value}
                          onChange={(e) => handleUpdateItem(idx, 'value', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold text-cyan-700 text-xs outline-none"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-2">
                        <input
                          type="text"
                          placeholder="الوحدة"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11px] outline-none"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-3">
                        <input
                          type="text"
                          placeholder="المجال المرجعي"
                          value={item.referenceRange}
                          onChange={(e) => handleUpdateItem(idx, 'referenceRange', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11px] outline-none font-mono"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-2 flex items-center gap-1 justify-end">
                        <select
                          value={item.flag || 'NORMAL'}
                          onChange={(e) => handleUpdateItem(idx, 'flag', e.target.value)}
                          className={`text-[10px] font-extrabold px-1.5 py-1 rounded-lg border outline-none ${
                            item.flag === 'HIGH' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            item.flag === 'LOW' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            item.flag === 'CRITICAL' ? 'bg-red-600 text-white border-red-700' :
                            'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <option value="NORMAL">سليم (Normal)</option>
                          <option value="HIGH">مرتفع (High)</option>
                          <option value="LOW">منخفض (Low)</option>
                          <option value="CRITICAL">حرج (Critical)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Summary & Clinical Notes for Doctor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ملخص النتائج والتشخيص المخبري العام *</label>
                  <textarea
                    rows={3}
                    required
                    value={resultsSummary}
                    onChange={(e) => setResultsSummary(e.target.value)}
                    placeholder="اكتب خلاصة الفحص والتقييم المخبري..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-cyan-600 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ملاحظات وتوصيات خاصة موجهة للطبيب المعالج (اختياري)
                  </label>
                  <textarea
                    rows={3}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="مثال: يرجى متابعة مستوى الهيموجلوبين بعد أسبوع، العينة كانت خالية من التجلط..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-cyan-600 outline-none text-xs"
                  />
                </div>
              </div>

              {/* Section 5: Attach Radiology Image or Test Report (For Patient & Doctor) */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-indigo-950">
                        إرفاق صورة أو ملف من الأشعة والتحاليل الطبية (للمريض وللطبيب المعالج)
                      </h4>
                      <p className="text-[11px] text-indigo-700">
                        يمكن إرفاق صور الأشعة السينية (X-Ray)، الرنين المغناطيسي (MRI)، الموجات الصوتية، أو ملفات PDF
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    متاح للمريض والطبيب فوراً
                  </span>
                </div>

                {/* Upload Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Hidden inputs compatible with Android WebView */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-100/70 border border-indigo-300 text-indigo-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isProcessingFile ? 'جاري قراءة الملف...' : 'اختيار صورة أو ملف من الجهاز'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-100/70 border border-indigo-300 text-indigo-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>التقاط صورة الأشعة بالكاميرا مباشرة</span>
                  </button>
                </div>

                {/* Attached File Preview Card */}
                {attachmentUrl && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {attachmentUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|webp)$/i.test(attachmentName) ? (
                        <div 
                          onClick={() => setPreviewImage(attachmentUrl)}
                          className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 cursor-pointer relative group bg-slate-100"
                          title="انقر لتكبير صورة الأشعة"
                        >
                          <img 
                            src={attachmentUrl} 
                            alt="Radiology preview" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}

                      <div className="truncate text-xs">
                        <span className="font-bold text-slate-800 block truncate">
                          {attachmentName || 'ملف_الأشعة_المرفق'}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>جاهز للاعتماد والإرسال للمريض وللطبيب</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {attachmentUrl.startsWith('data:image/') && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(attachmentUrl)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="حذف المرفق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>يتم حفظ ملف وصورة الأشعة فوراً في السجل السري للمريض وربطه بالطبيب المعالج.</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>سيتم إرسال إشعار فوري إلى الطبيب المعالج وتسجيل العملية في سجل التدقيق الأمني</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewTestModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold flex items-center gap-2 shadow-md shadow-cyan-600/20 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري الاعتماد والإرسال...' : 'اعتماد وإرسال الفحص للطبيب المعالج'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Official Printable Report Modal */}
      {printingTest && (
        <PrintableTestResultModal
          isOpen={!!printingTest}
          onClose={() => setPrintingTest(null)}
          test={printingTest}
        />
      )}

      {/* Fullscreen Image / Radiology Scan Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">معاينة صورة الأشعة / الفحص الطبي بدقة عالية</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black/60 max-h-[80vh]">
              <img 
                src={previewImage} 
                alt="Radiology full view" 
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>الصورة معتمدة ومرفقة بالسجل الطبي للمريض وللطبيب المعالج.</span>
              <a
                href={previewImage}
                download="radiology_scan.jpg"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 rotate-180" />
                <span>تحميل الصورة</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
