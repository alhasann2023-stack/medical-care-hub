import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  Scan,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Printer,
  RotateCcw,
  Stethoscope,
  Eye,
  Activity,
  Layers,
  HelpCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { AnalysisCategory, Language, ImageAnalysisResult } from '../../types';
import { geminiService } from '../../services/geminiService';
import { SAMPLE_MEDICAL_IMAGES } from '../../data/mockData';

interface MedicalImageAnalyzerProps {
  language: Language;
  onBookAppointmentWithSpecialty?: (specialty: string) => void;
}

export const MedicalImageAnalyzer: React.FC<MedicalImageAnalyzerProps> = ({
  language,
  onBookAppointmentWithSpecialty,
}) => {
  const isAr = language === 'ar';

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('');
  const [analysisCategory, setAnalysisCategory] = useState<AnalysisCategory>('xray');
  const [patientNote, setPatientNote] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [scanStep, setScanStep] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    {
      id: 'xray' as AnalysisCategory,
      titleAr: 'أشعة سينية وتصوير (X-Ray)',
      titleEn: 'X-Ray & Radiography',
      descAr: 'تحليل صور الأشعة للصدر، العظام، والمفاصل',
      descEn: 'Chest, bone & joint imaging analysis',
    },
    {
      id: 'skin' as AnalysisCategory,
      titleAr: 'الأمراض الجلدية (Dermatology)',
      titleEn: 'Dermatology & Rash',
      descAr: 'فحص التغيرات الجلدية، الطفح، الحساسية، والآفات',
      descEn: 'Rashes, eczema, skin spots & lesions',
    },
    {
      id: 'lab_test' as AnalysisCategory,
      titleAr: 'تقارير التحاليل (Lab Reports)',
      titleEn: 'Lab & Blood Reports',
      descAr: 'استخراج وتفسير نتائج فحوصات الدم والمختبر',
      descEn: 'Blood panels, CBC, lipid & metabolic values',
    },
    {
      id: 'prescription' as AnalysisCategory,
      titleAr: 'الوصفات الطبية (Prescriptions)',
      titleEn: 'Doctor Prescriptions',
      descAr: 'قراءة خط الروشتات، أسماء الأدوية، وتعليمات الاستخدام',
      descEn: 'Read medication names, dosages & precautions',
    },
    {
      id: 'general' as AnalysisCategory,
      titleAr: 'صورة طبية عامة (General)',
      titleEn: 'General Clinical Photo',
      descAr: 'أي أعراض أو علامات ظاهرة بالفحص البصري',
      descEn: 'General visible medical signs and symptoms',
    },
  ];

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(isAr ? 'يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)' : 'Please select a valid image file');
      return;
    }

    setFileName(file.name);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: (typeof SAMPLE_MEDICAL_IMAGES)[0]) => {
    setSelectedImage(sample.url);
    setAnalysisCategory(sample.category);
    setFileName(sample.titleAr);
    setMimeType('image/jpeg');
    setPatientNote(isAr ? sample.promptAr : '');
    setAnalysisResult(null);
  };

  const handleRunAnalysis = async () => {
    if (!selectedImage || isScanning) return;

    setIsScanning(true);
    setAnalysisResult(null);

    // Simulated scanner stages to show model progression
    setScanStep(isAr ? 'تحميل ومعالجة بيانات الصورة الطبية...' : 'Uploading and preparing image data...');
    setTimeout(() => {
      setScanStep(isAr ? 'استدعاء نموذج gemini-3.1-pro-preview للتحليل الإشعاعي الدقيق...' : 'Calling gemini-3.1-pro-preview model for clinical reasoning...');
    }, 900);
    setTimeout(() => {
      setScanStep(isAr ? 'استخلاص العلامات السريرية وصياغة التقرير...' : 'Extracting clinical signs and formatting diagnostic report...');
    }, 2200);

    try {
      // Model specification: MUST use gemini-3.1-pro-preview
      const res = await geminiService.analyzeMedicalImage({
        image: selectedImage,
        mimeType,
        analysisType: analysisCategory,
        prompt: patientNote,
        model: 'gemini-3.1-pro-preview',
      });

      setAnalysisResult({
        id: `analysis-${Date.now()}`,
        imageUrl: selectedImage,
        category: analysisCategory,
        modelUsed: res.modelUsed || 'gemini-3.1-pro-preview',
        analysisText: res.analysis,
        timestamp: new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        userPrompt: patientNote,
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      alert(
        isAr
          ? 'تعذر إتمام التحليل الطبي. يرجى المحاولة مرة أخرى أو فحص الصورة.'
          : 'Failed to analyze the medical image. Please try again.'
      );
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setPatientNote('');
    setFileName('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-cyan-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 end-0 -mt-8 -me-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-300 text-xs font-bold mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini 3.1 Pro Preview</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-2">
            {isAr
              ? 'نظام الفحص والتشخيص البصري للأشعة والصور الطبية'
              : 'Medical Image & Radiographic Understanding'}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {isAr
              ? 'ارفع صورة أشعة سينية، فحصاً جلدياً، تقرير تحاليل مخبرية، أو روشتة علاجية للحصول على تحليل سريري فوري ودقيق مدعوم بأحدث نماذج الرؤية الحاسوبية من Gemini.'
              : 'Upload radiological X-rays, dermatology scans, lab sheets, or prescriptions to receive instantaneous clinical explanations and insights powered by Gemini 3.1 Pro.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload and Setup Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. Category Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              {isAr ? '1. اختر نوع الصورة الطبية:' : '1. Select Medical Image Type:'}
            </label>
            <div className="space-y-1.5">
              {categories.map((cat) => {
                const isSelected = analysisCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setAnalysisCategory(cat.id)}
                    className={`w-full text-start p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{isAr ? cat.titleAr : cat.titleEn}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {isAr ? cat.descAr : cat.descEn}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Upload Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              {isAr ? '2. رفع الصورة أو الفحص الطبي:' : '2. Upload Medical Image:'}
            </label>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
                  : selectedImage
                  ? 'border-teal-300 bg-teal-50/30'
                  : 'border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />

              {selectedImage ? (
                <div className="space-y-3">
                  <div className="relative inline-block group">
                    <img
                      src={selectedImage}
                      alt="Medical scan"
                      className="max-h-48 rounded-xl object-contain shadow-md mx-auto border border-slate-200"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                      {isAr ? 'تغيير الصورة' : 'Change Image'}
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 truncate max-w-xs mx-auto">
                    {fileName || (isAr ? 'صورة طبية محددة' : 'Selected Medical Image')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {isAr ? 'اسحب الصورة وأفلتها هنا' : 'Drag & drop your medical scan'}
                  </div>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'أو انقر لاختيار ملف من جهازك (JPG, PNG, WebP)' : 'or click to browse from device'}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Sample Scans for Testing */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 block mb-2">
                {isAr ? 'أو جرب إحدى العينات الطبية الجاهزة:' : 'Or try a sample medical scan:'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_MEDICAL_IMAGES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:border-teal-400 bg-white hover:bg-teal-50/50 text-start text-xs font-medium transition cursor-pointer"
                  >
                    <img
                      src={sample.url}
                      alt={sample.titleAr}
                      className="w-9 h-9 rounded-lg object-cover shrink-0"
                    />
                    <span className="truncate text-[11px] font-bold text-slate-700">
                      {isAr ? sample.titleAr : sample.titleEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Notes input */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'ملاحظة سريرية أو سؤال محدد (اختياري):' : 'Clinical Note or Specific Question (Optional):'}
              </label>
              <textarea
                value={patientNote}
                onChange={(e) => setPatientNote(e.target.value)}
                rows={2}
                placeholder={
                  isAr
                    ? 'مثال: يشكو المريض من ألم صدري منذ 3 أيام، أو ظهور طفح جلدي بعد تناول دواء...'
                    : 'e.g. Chest pain for 3 days, rash started yesterday...'
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden bg-slate-50/50 focus:bg-white"
              />
            </div>

            {/* Submit Action Button */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleRunAnalysis}
                disabled={!selectedImage || isScanning}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-700/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <Scan className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري الفحص السريري...' : 'Analyzing Scan...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isAr
                        ? 'بدء الفحص والتحليل عبر Gemini 3.1 Pro'
                        : 'Analyze with Gemini 3.1 Pro'}
                    </span>
                  </>
                )}
              </button>

              {selectedImage && (
                <button
                  onClick={handleReset}
                  className="p-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title={isAr ? 'إعادة ضبط' : 'Reset'}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scan Visualizer & Diagnostic Report (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs h-full flex flex-col">
            
            {/* Header / Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {isAr ? 'التقرير التشخيصي والاستشاري' : 'Clinical Diagnostic Report'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'مدعوم بنموذج gemini-3.1-pro-preview المخصص للفهم البصري الطبي'
                      : 'Powered by gemini-3.1-pro-preview specialized medical vision'}
                  </p>
                </div>
              </div>

              {analysisResult && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isAr ? 'طباعة التقرير' : 'Print'}</span>
                </button>
              )}
            </div>

            {/* Scanning State (Laser HUD Animation) */}
            {isScanning && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-5">
                <div className="relative w-64 h-64 rounded-2xl overflow-hidden border-2 border-teal-500 shadow-xl bg-slate-950">
                  {selectedImage && (
                    <img
                      src={selectedImage}
                      alt="Scanning Target"
                      className="w-full h-full object-cover opacity-70 filter contrast-125"
                    />
                  )}
                  {/* Laser Scan HUD Line */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-400 shadow-[0_0_15px_#2dd4bf] animate-[bounce_2s_infinite]"></div>
                  
                  {/* Grid Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f766e15_1px,transparent_1px),linear-gradient(to_bottom,#0f766e15_1px,transparent_1px)] bg-[size:16px_16px]"></div>

                  {/* Corner Targets */}
                  <div className="absolute top-2 start-2 w-4 h-4 border-t-2 border-s-2 border-teal-400"></div>
                  <div className="absolute top-2 end-2 w-4 h-4 border-t-2 border-e-2 border-teal-400"></div>
                  <div className="absolute bottom-2 start-2 w-4 h-4 border-b-2 border-s-2 border-teal-400"></div>
                  <div className="absolute bottom-2 end-2 w-4 h-4 border-b-2 border-e-2 border-teal-400"></div>

                  <div className="absolute bottom-3 inset-x-0 text-[10px] font-mono font-bold text-teal-300 tracking-wider">
                    SCANNING AI MODEL: GEMINI 3.1 PRO
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-extrabold text-slate-800">
                    {isAr ? 'جاري الفحص المجهري والإشعاعي للصورة...' : 'Analyzing Medical Scan...'}
                  </div>
                  <p className="text-xs text-teal-700 font-medium animate-pulse">
                    {scanStep || (isAr ? 'معالجة البيانات...' : 'Processing...')}
                  </p>
                </div>
              </div>
            )}

            {/* Empty State when no scan completed */}
            {!isScanning && !analysisResult && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Scan className="w-8 h-8" />
                </div>
                <div className="max-w-sm">
                  <h4 className="text-sm font-bold text-slate-700 mb-1">
                    {isAr ? 'بانتظار رفع صورة لبدء التحليل' : 'Awaiting image for analysis'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'حدد نوع الفحص وارفع صورة الأشعة أو التقرير من اللوحة الجانبية، ثم اضغط على "بدء الفحص والتحليل".'
                      : 'Select the category, upload your scan, and click start analysis to receive a full diagnostic breakdown.'}
                  </p>
                </div>
              </div>
            )}

            {/* Completed Analysis Report Display */}
            {analysisResult && !isScanning && (
              <div className="flex-1 overflow-y-auto space-y-4 text-slate-800 pr-1">
                
                {/* Meta summary badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">
                      {isAr ? 'النوع:' : 'Category:'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold">
                      {categories.find((c) => c.id === analysisResult.category)?.titleAr || analysisResult.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">
                      {isAr ? 'النموذج المستخدم:' : 'Model:'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-bold text-[11px]">
                      {analysisResult.modelUsed}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{analysisResult.timestamp}</span>
                </div>

                {/* Structured Text Analysis */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800 shadow-2xs">
                  {analysisResult.analysisText}
                </div>

                {/* Next Steps CTA */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-teal-900">
                      {isAr ? 'هل تود مناقشة هذه النتائج مع استشاري معتمد؟' : 'Discuss these findings with a consultant?'}
                    </div>
                    <p className="text-[11px] text-teal-700">
                      {isAr
                        ? 'احجز موعداً في العيادة المناسبة لمراجعة التقرير وتأكيد خطة العلاج.'
                        : 'Book a clinic appointment to review results and confirm your treatment plan.'}
                    </p>
                  </div>
                  {onBookAppointmentWithSpecialty && (
                    <button
                      onClick={() => onBookAppointmentWithSpecialty(analysisResult.category)}
                      className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حجز موعد بالعيادة' : 'Book Appointment'}</span>
                    </button>
                  )}
                </div>

                {/* Medical Safety Disclaimer */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">
                      {isAr ? 'ضمان الدقة والأمان الطبي:' : 'Safety Notice:'}{' '}
                    </span>
                    {isAr
                      ? 'هذا التقرير هو تحليل استرشادي مدعوم بالذكاء الاصطناعي ويخضع للمراجعة الطبية المباشرة، ولا يُعد تشخيصاً نهائياً أو بديلاً عن رأي الطبيب المعالج.'
                      : 'This automated report is an AI-assisted analytical impression and does not replace an in-person clinical evaluation.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
