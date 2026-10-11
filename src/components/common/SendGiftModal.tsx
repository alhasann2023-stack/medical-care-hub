import React, { useState, useEffect } from 'react';
import {
  Gift,
  Heart,
  X,
  Stethoscope,
  Users,
  Coins,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { GiftCatalogItem, Doctor } from '../../types/medical';
import { api } from '../../services/api';
import { playSuccessSound } from '../../utils/sound';

interface SendGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  preselectedDoctorId?: string;
  preselectedDoctorName?: string;
  preselectedSpecialty?: string;
}

export const SendGiftModal: React.FC<SendGiftModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  preselectedDoctorId,
  preselectedDoctorName,
  preselectedSpecialty
}) => {
  const [catalog, setCatalog] = useState<GiftCatalogItem[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftCatalogItem | null>(null);
  const [recipientType, setRecipientType] = useState<'DOCTOR' | 'STAFF'>('DOCTOR');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(preselectedDoctorId || '');
  const [staffRecipientName, setStaffRecipientName] = useState<string>('طاقم التمريض والاستقبال');
  const [giftMessage, setGiftMessage] = useState<string>('شكراً جزيلاً لكم على الرعاية والاهتمام الطبي المتميز 🌹');
  const [currentPoints, setCurrentPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const cat = api.getGiftCatalog();
    setCatalog(cat);
    if (cat.length > 0) setSelectedGift(cat[1] || cat[0]);

    // Wallet
    api.getPointsWallet(patientId).then(w => setCurrentPoints(w.pointsBalance)).catch(() => {});
    const unsub = api.subscribePointsWallet(patientId, w => setCurrentPoints(w.pointsBalance));

    // Doctors
    api.getDoctors(undefined, true).then(docs => {
      setDoctors(docs);
      if (!selectedDoctorId && docs.length > 0) {
        setSelectedDoctorId(preselectedDoctorId || docs[0].id);
      }
    }).catch(() => {});

    return () => unsub();
  }, [isOpen, patientId, preselectedDoctorId]);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  const handleSend = async () => {
    if (!selectedGift) return;
    setIsLoading(true);
    setError(null);

    const recName = recipientType === 'DOCTOR'
      ? (selectedDoctor?.fullName || preselectedDoctorName || 'الطبيب المعالج')
      : staffRecipientName;

    const recId = recipientType === 'DOCTOR'
      ? (selectedDoctor?.id || preselectedDoctorId || 'doc-1')
      : 'staff-general';

    try {
      const res = await api.sendGift({
        senderPatientId: patientId,
        senderName: patientName || 'مريض ممتن',
        recipientType,
        recipientId: recId,
        recipientName: recName,
        recipientTitleOrSpecialty: recipientType === 'DOCTOR' ? (selectedDoctor?.specialtyNameAr || preselectedSpecialty) : 'فريق الرعاية والتمريض',
        giftItemId: selectedGift.id,
        giftNameAr: selectedGift.nameAr,
        giftIcon: selectedGift.icon,
        pointsAmount: selectedGift.pointsCost,
        message: giftMessage
      });

      if (!res.success) {
        setError(res.error || 'تعذر إرسال الهدية بالنقاط.');
        setIsLoading(false);
        return;
      }

      playSuccessSound();
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (e: any) {
      setError(e?.message || 'فشل إرسال الهدية.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-pink-700 to-purple-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Gift className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base">إرسال هدية وتقدير من النقاط</h3>
              <p className="text-xs text-rose-100">عبّر عن امتنانك لطبيبك أو الطاقم الطبي بهدية تذكارية راقية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {success ? (
            <div className="p-6 text-center space-y-3 bg-emerald-50 border border-emerald-300 rounded-2xl animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-sm text-emerald-900">تم إرسال هديتك بنجاح!</h4>
              <p className="text-xs text-emerald-700">شكراً لمبادرتك الطيبة، لقد أضفت لمسة سعادة وامتنان إلى فريق العمل.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Recipient */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">إلى من تود الإهداء؟</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientType('DOCTOR')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      recipientType === 'DOCTOR'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-rose-600" />
                    <span>طبيب استشاري</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientType('STAFF')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      recipientType === 'STAFF'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4 text-rose-600" />
                    <span>طاقم التمريض / الاستقبال</span>
                  </button>
                </div>
              </div>

              {/* Doctor select if doctor */}
              {recipientType === 'DOCTOR' && (
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">اختر الطبيب:</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.specialtyNameAr || 'استشاري'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Gifts Catalog */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">اختر الهدية التقديرية:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {catalog.map((gift) => {
                    const isSelected = selectedGift?.id === gift.id;
                    return (
                      <div
                        key={gift.id}
                        onClick={() => setSelectedGift(gift)}
                        className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/90 ring-1 ring-rose-400'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xl">{gift.icon}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                            {gift.pointsCost} نقطة
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-900">{gift.nameAr}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{gift.descriptionAr}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dedication */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700">كلمة إهداء:</label>
                <textarea
                  rows={2}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>

              {/* Submit */}
              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span>رصيدك: <strong className="text-amber-800">{currentPoints} نقطة</strong></span>
                </div>
                <button
                  type="button"
                  disabled={isLoading || !selectedGift}
                  onClick={handleSend}
                  className="py-2.5 px-5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>إرسال الهدية ({selectedGift?.pointsCost || 0} نقطة)</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
