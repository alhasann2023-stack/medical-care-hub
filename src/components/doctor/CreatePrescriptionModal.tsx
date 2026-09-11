import React, { useState, useEffect } from 'react';
import { 
  X, 
  Pill, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Building2,
  AlertCircle
} from 'lucide-react';
import { Patient, PrescriptionItem } from '../../types/medical';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CreatePrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetPatientId?: string;
  targetPatientName?: string;
  targetPatientMrn?: string;
}

export const CreatePrescriptionModal: React.FC<CreatePrescriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetPatientId,
  targetPatientName,
  targetPatientMrn
}) => {
  const { doctorProfile, user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(targetPatientId || '');
  
  const [diagnosis, setDiagnosis] = useState<string>('متابعة ارتفاع ضغط الدم والدهون');
  const [instructions, setInstructions] = useState<string>('تناول الأدوية بانتظام بعد الإفطار، والالتزام بحمية قليلة الملح.');
  const [medications, setMedications] = useState<PrescriptionItem[]>([
    {
      medicationName: 'Concor (Bisoprolol)',
      dosage: '5mg',
      form: 'Tablet',
      frequency: 'مرة واحدة يومياً صباحاً',
      duration: '30 يوماً',
      strength: '5mg',
      instructions: 'بعد الإفطار مباشرة مع كوب ماء'
    }
  ]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (targetPatientId) {
        setSelectedPatientId(targetPatientId);
      }
      api.getPatients().then(pts => {
        let list = [...pts];
        if (targetPatientId && !list.some(p => p.id === targetPatientId)) {
          list.unshift({
            id: targetPatientId,
            userId: targetPatientId,
            fullName: targetPatientName || 'المريض المحدد',
            mrn: targetPatientMrn || 'MRN-2026',
            phone: '+966501112233',
            email: 'patient@medicalcarehub.com',
            birthDate: '1992-05-14',
            gender: 'MALE',
            bloodType: 'O+',
            allergies: [],
            chronicDiseases: [],
            address: 'المملكة العربية السعودية',
            emergencyContact: { name: 'جهة الاتصال', phone: '+966509998877', relation: 'قريب' },
            createdAt: new Date().toISOString()
          });
        }
        setPatients(list);
        if (targetPatientId) {
          setSelectedPatientId(targetPatientId);
        } else if (!selectedPatientId && list.length > 0) {
          setSelectedPatientId(list[0].id);
        }
      });
    }
  }, [isOpen, targetPatientId, targetPatientName, targetPatientMrn]);

  if (!isOpen) return null;

  const handleAddMedication = () => {
    setMedications(prev => [
      ...prev,
      {
        medicationName: '',
        dosage: '',
        form: 'Tablet',
        frequency: 'مرة واحدة يومياً',
        duration: '30 يوماً',
        strength: '',
        instructions: ''
      }
    ]);
  };

  const handleRemoveMedication = (idx: number) => {
    if (medications.length <= 1) return;
    setMedications(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMedChange = (idx: number, field: keyof PrescriptionItem, val: string) => {
    setMedications(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || medications.some(m => !m.medicationName.trim())) {
      setError('يرجى اختيار المريض وكتابة أسماء جميع الأدوية المدخلة.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      await api.createPrescription({
        patientId: selectedPatientId,
        patientName: selectedPatient?.fullName || targetPatientName || 'المريض',
        patientMrn: selectedPatient?.mrn || targetPatientMrn,
        doctorId: doctorProfile?.id || user?.id || 'doc-1',
        doctorName: doctorProfile?.fullName || user?.fullName || 'الطبيب الاستشاري',
        doctorSpecialty: doctorProfile?.specialtyNameAr,
        diagnosis,
        instructions,
        medications
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إصدار الوصفة الطبية.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10">
              <Pill className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">إصدار وصفة طبية إلكترونية (E-Prescription)</h3>
              <p className="text-xs text-emerald-100 font-medium">تسجيل الأدوية، الجرعات، وإرشادات الصيدلية للمريض</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-start text-xs sm:text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Selection & Diagnosis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                المريض <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.mrn}) — {p.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                التشخيص السريري للوصفة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Medications Dynamic Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800">
                الأدوية والجرعات المقررة ({medications.length})
              </label>
              <button
                type="button"
                onClick={handleAddMedication}
                className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة دواء آخر</span>
              </button>
            </div>

            <div className="space-y-3">
              {medications.map((med, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 relative space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-700">الدواء رقم #{idx + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="حذف هذا الدواء"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="اسم الدواء العلمي/التجاري"
                        value={med.medicationName}
                        onChange={(e) => handleMedChange(idx, 'medicationName', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="العيار (مثال: 500mg)"
                        value={med.strength}
                        onChange={(e) => handleMedChange(idx, 'strength', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="المدة (مثال: 10 أيام)"
                        value={med.duration}
                        onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="التكرار (مثال: مرتين يومياً بعد الأكل)"
                        value={med.frequency}
                        onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="إرشادات الاستخدام الخاصة"
                        value={med.instructions || ''}
                        onChange={(e) => handleMedChange(idx, 'instructions', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Pharmacy Instructions */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              تعليمات الصيدلية وتوجيهات المريض
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري اعتماد الوصفة...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وإرسال الوصفة للصرف</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
