import React, { useState } from 'react';
import { 
  X, 
  AlertCircle, 
  Heart, 
  Phone, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Save, 
  Droplet, 
  User, 
  Sparkles 
} from 'lucide-react';
import { Patient } from '../../types/medical';
import { api } from '../../services/api';

interface PatientMedicalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess: (updatedPatient: Patient) => void;
}

const COMMON_ALLERGIES = [
  'حساسية البنسلين (Penicillin)',
  'حساسية السلفا (Sulfa)',
  'حساسية الأسبرين (Aspirin)',
  'حساسية الفول السوداني (Peanuts)',
  'حساسية اللاكتوز / الحليب',
  'حساسية البيض',
  'حساسية الأسماك والمأكولات البحرية',
  'حساسية الصبغات الإشعاعية (Contrast)'
];

const COMMON_CHRONIC_DISEASES = [
  'مرض السكري (النوع الثاني)',
  'مرض السكري (النوع الأول)',
  'ارتفاع ضغط الدم الشرياني',
  'الربو الشعبي وحساسية الصدر',
  'أمراض الشرايين والقلب',
  'قصور الغدة الدرقية',
  'ارتفاع كوليسترول الدم',
  'أمراض الكلى المزمنة'
];

export const PatientMedicalProfileModal: React.FC<PatientMedicalProfileModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSuccess
}) => {
  const [allergies, setAllergies] = useState<string[]>(patient?.allergies || []);
  const [newAllergyInput, setNewAllergyInput] = useState<string>('');

  const [chronicDiseases, setChronicDiseases] = useState<string[]>(patient?.chronicDiseases || []);
  const [newDiseaseInput, setNewDiseaseInput] = useState<string>('');

  const [emergencyName, setEmergencyName] = useState<string>(patient?.emergencyContact?.name || '');
  const [emergencyRelation, setEmergencyRelation] = useState<string>(patient?.emergencyContact?.relation || 'قريب');
  const [emergencyPhone, setEmergencyPhone] = useState<string>(patient?.emergencyContact?.phone || '+966509998877');

  const [bloodType, setBloodType] = useState<string>(patient?.bloodType || 'O+');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState<boolean>(false);

  if (!isOpen) return null;

  // Add Allergy handler
  const handleAddAllergy = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (allergies.includes(trimmed)) return;
    setAllergies(prev => [...prev, trimmed]);
    setNewAllergyInput('');
  };

  const handleRemoveAllergy = (idx: number) => {
    setAllergies(prev => prev.filter((_, i) => i !== idx));
  };

  // Add Chronic Disease handler
  const handleAddDisease = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (chronicDiseases.includes(trimmed)) return;
    setChronicDiseases(prev => [...prev, trimmed]);
    setNewDiseaseInput('');
  };

  const handleRemoveDisease = (idx: number) => {
    setChronicDiseases(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.id) {
      setError('تعذر تحديد هوية المريض.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedData: Partial<Patient> = {
        allergies,
        chronicDiseases,
        bloodType: bloodType as any,
        emergencyContact: {
          name: emergencyName.trim() || 'جهة اتصال الطوارئ',
          relation: emergencyRelation.trim() || 'قريب',
          phone: emergencyPhone.trim() || '+966509998877'
        }
      };

      const res = await api.updatePatient(patient.id, updatedData);
      setIsSavedSuccessfully(true);
      setTimeout(() => {
        onSuccess(res);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'فشل تحديث البيانات الطبية، يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-start">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-inner">
              <Heart className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">تحديث البيانات الطبية والحيوية للطوارئ</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                سجل الحساسية، الأمراض المزمنة، وجهة الاتصال في حالات الطوارئ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSavedSuccessfully ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">تم حفظ وتحديث بياناتك الطبية بنجاح!</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تم تحديث ملفك الطبي لدى الأطباء والاستشاريين المعالجين فورياً.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs sm:text-sm">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Drug & Food Allergies */}
            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>1. الحساسية الدوائية والغذائية</span>
                </label>
                <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold">
                  {allergies.length > 0 ? `${allergies.length} مسجلة` : 'لا توجد حساسية'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                حدد أي أدوية أو أطعمة تسبب لك حساسية ليتم تنبيه الطبيب والصيدلي فوراً قبل وصف أي علاج.
              </p>

              {/* Input for custom allergy */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAllergyInput}
                  onChange={(e) => setNewAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAllergy(newAllergyInput);
                    }
                  }}
                  placeholder="اكتب اسم الحساسية (مثال: حساسية البنسلين، حساسية الفراولة...)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleAddAllergy(newAllergyInput)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>

              {/* Quick Suggestion Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">اقتراحات شائعة سريعة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_ALLERGIES.map((item, idx) => {
                    const isAdded = allergies.includes(item);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => isAdded ? handleRemoveAllergy(allergies.indexOf(item)) : handleAddAllergy(item)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                          isAdded
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-800'
                        }`}
                      >
                        {item} {isAdded ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Allergies List */}
              <div className="pt-2 border-t border-rose-200 dark:border-rose-900/30">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">الحساسية المسجلة حالياً:</span>
                {allergies.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 text-center text-xs text-rose-700/80 font-medium">
                    لا توجد حساسية مسجلة للمريض.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs font-bold"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergy(idx)}
                          className="text-rose-600 hover:text-rose-900 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Chronic Diseases & Conditions */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2 text-xs sm:text-sm">
                  <Heart className="w-4 h-4 text-amber-600" />
                  <span>2. الأمراض والحالات المزمنة</span>
                </label>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                  {chronicDiseases.length > 0 ? `${chronicDiseases.length} مسجلة` : 'لا توجد أمراض مزمنة'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                سجل أي أمراض مزمنة تتابع علاجها لمساعدة الأطباء في اتخاذ قرارات التشخيص بدقة.
              </p>

              {/* Input for custom chronic disease */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDiseaseInput}
                  onChange={(e) => setNewDiseaseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDisease(newDiseaseInput);
                    }
                  }}
                  placeholder="اكتب اسم المرض المزمن (مثال: ارتفاع ضغط الدم، السكري، الربو...)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleAddDisease(newDiseaseInput)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>

              {/* Quick Suggestion Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">اقتراحات شائعة سريعة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CHRONIC_DISEASES.map((item, idx) => {
                    const isAdded = chronicDiseases.includes(item);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => isAdded ? handleRemoveDisease(chronicDiseases.indexOf(item)) : handleAddDisease(item)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                          isAdded
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 hover:text-amber-800'
                        }`}
                      >
                        {item} {isAdded ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Chronic Diseases List */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-900/30">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">الأمراض المزمنة المسجلة:</span>
                {chronicDiseases.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 text-center text-xs text-amber-700/80 font-medium">
                    لا توجد أمراض مزمنة مسجلة.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {chronicDiseases.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDisease(idx)}
                          className="text-amber-600 hover:text-amber-900 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Emergency Contact & Blood Type */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2 text-xs sm:text-sm">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span>3. جهة الاتصال في حالات الطوارئ</span>
                </label>
                <span className="text-[11px] text-blue-700 dark:text-blue-400 font-bold">للطوارئ والتدخل السريع</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الاسم:
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="مثال: جهة اتصال الطوارئ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الصلة:
                  </label>
                  <input
                    type="text"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    placeholder="مثال: قريب، أخ، أب، زوجة..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الهاتف:
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+966509998877"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 text-start"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              {/* Blood Type */}
              <div className="pt-2 border-t border-blue-200 dark:border-blue-900/30 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-rose-500" />
                  <span>فصيلة الدم (Blood Type):</span>
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs focus:ring-2 focus:ring-blue-500"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جارٍ حفظ التحديثات...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ البيانات الطبية</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
