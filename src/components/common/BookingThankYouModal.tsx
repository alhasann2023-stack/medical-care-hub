import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Gift,
  Heart,
  Star,
  Send,
  MessageSquare,
  CheckCircle2,
  X,
  Coins,
  Stethoscope,
  Users,
  Award,
  Share2,
  Smile,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  Doctor,
  Staff,
  GiftCatalogItem,
  SentGift,
  ServiceReview,
  CommunityPost,
  RewardSettings
} from '../../types/medical';
import { api } from '../../services/api';
import { playSuccessSound } from '../../utils/sound';

interface BookingThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceType: 'CONSULTATION' | 'APPOINTMENT';
  serviceReferenceId?: string;
  serviceTitle: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  onOpenCommunity?: () => void;
}

export const BookingThankYouModal: React.FC<BookingThankYouModalProps> = ({
  isOpen,
  onClose,
  serviceType,
  serviceReferenceId,
  serviceTitle,
  patientId,
  patientName,
  doctorId,
  doctorName,
  doctorSpecialty,
  onOpenCommunity
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GIFT' | 'REVIEW' | 'POST'>('OVERVIEW');
  const [giftCatalog, setGiftCatalog] = useState<GiftCatalogItem[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftCatalogItem | null>(null);
  const [giftRecipientType, setGiftRecipientType] = useState<'DOCTOR' | 'STAFF'>('DOCTOR');
  const [giftRecipientStaff, setGiftRecipientStaff] = useState<string>('طاقم التمريض والاستقبال');
  const [giftMessage, setGiftMessage] = useState<string>('شكراً جزيلاً لكم على حسن الرعاية والاهتمام الطبي المتميز 🌹');

  // Rating State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  // Community Post State
  const [postTitle, setPostTitle] = useState<string>(
    serviceType === 'CONSULTATION' 
      ? 'تجربتي مع طلب استشارة طبية متخصصة عن بعد' 
      : 'تجربتي الإيجابية في حجز موعد عيادي بكل سهولة'
  );
  const [postContent, setPostContent] = useState<string>(
    `سعيد جداً بالخدمة وسرعة التجاوب من مستشفى الرعاية الطبية${doctorName ? ` مع ${doctorName}` : ''}. منصة ممتازة توفر الوقت وتقدم رعاية احترافية بكل سلاسة!`
  );
  const [postSubmitted, setPostSubmitted] = useState<boolean>(false);

  // Action status
  const [isSendingGift, setIsSendingGift] = useState<boolean>(false);
  const [giftSuccessMsg, setGiftSuccessMsg] = useState<string | null>(null);
  const [giftErrorMsg, setGiftErrorMsg] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<number>(150);
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>(() => {
    return api.getRewardSettingsSync ? api.getRewardSettingsSync() : {
      consultationRewardPoints: 40,
      appointmentRewardPoints: 50,
      communityPostRewardPoints: 20,
      reviewRewardPoints: 15,
      giftRewardPoints: 10,
      newUserRewardPoints: 150,
      pointValueYer: 50,
      updatedAt: new Date().toISOString(),
      updatedBy: 'SYSTEM'
    };
  });

  useEffect(() => {
    if (!isOpen) return;

    // Load reward settings
    api.getRewardSettings().then(setRewardSettings).catch(() => {});
    const unsubSettings = api.subscribeRewardSettings(setRewardSettings);

    // Load gift catalog
    const catalog = api.getGiftCatalog();
    setGiftCatalog(catalog);
    if (catalog.length > 0) setSelectedGift(catalog[1] || catalog[0]); // default to flowers or coffee

    // Load points wallet
    api.getPointsWallet(patientId).then((w) => {
      setCurrentPoints(w.pointsBalance);
    }).catch(() => {});

    // Subscribe to points wallet
    const unsubWallet = api.subscribePointsWallet(patientId, (w) => {
      setCurrentPoints(w.pointsBalance);
    });

    return () => {
      unsubSettings();
      unsubWallet();
    };
  }, [isOpen, patientId, serviceType]);

  const earnedReward = serviceType === 'CONSULTATION' 
    ? (rewardSettings.consultationRewardPoints ?? 40)
    : (rewardSettings.appointmentRewardPoints ?? 50);

  const reviewReward = rewardSettings.reviewRewardPoints ?? 15;
  const communityReward = rewardSettings.communityPostRewardPoints ?? 20;
  const giftReward = rewardSettings.giftRewardPoints ?? 10;

  if (!isOpen) return null;

  // Send Gift Handler
  const handleSendGift = async () => {
    if (!selectedGift) return;
    setIsSendingGift(true);
    setGiftErrorMsg(null);
    setGiftSuccessMsg(null);

    const recipientName = giftRecipientType === 'DOCTOR' 
      ? (doctorName || 'طبيبك المعالج')
      : giftRecipientStaff;

    const recipientId = giftRecipientType === 'DOCTOR'
      ? (doctorId || 'doc-1')
      : 'staff-general';

    try {
      const res = await api.sendGift({
        senderPatientId: patientId,
        senderName: patientName || 'مريض ممتن',
        recipientType: giftRecipientType,
        recipientId,
        recipientName,
        recipientTitleOrSpecialty: giftRecipientType === 'DOCTOR' ? doctorSpecialty : 'فريق التمريض والرعاية',
        giftItemId: selectedGift.id,
        giftNameAr: selectedGift.nameAr,
        giftIcon: selectedGift.icon,
        pointsAmount: selectedGift.pointsCost,
        message: giftMessage,
        serviceType,
        serviceId: serviceReferenceId
      });

      if (!res.success) {
        setGiftErrorMsg(res.error || 'تعذر إرسال الهدية بالنقاط.');
        setIsSendingGift(false);
        return;
      }

      playSuccessSound();
      setGiftSuccessMsg(`تم إرسال ${selectedGift.nameAr} إلى ${recipientName} بنجاح! شكراً لمشاعرك الكريمة.`);
      setIsSendingGift(false);
    } catch (err: any) {
      setGiftErrorMsg(err?.message || 'فشل إرسال الهدية.');
      setIsSendingGift(false);
    }
  };

  // Submit Review Handler
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);

    try {
      await api.submitServiceReview({
        patientId,
        patientName: patientName || 'مريض',
        doctorId,
        doctorName,
        serviceType,
        serviceId: serviceReferenceId,
        rating,
        comment: reviewComment || 'خدمة طبية ممتازة وتنسيق رائع وسريع.',
        aspects: {
          doctorCare: rating,
          speed: rating,
          clarity: rating
        }
      });

      playSuccessSound();
      setReviewSubmitted(true);
    } catch (err) {
      console.warn('Review submission error:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Submit Community Post Handler
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    setIsSubmittingPost(true);
    try {
      await api.createCommunityPost({
        authorId: patientId,
        authorName: patientName || 'مريض ومراجع',
        authorRole: 'PATIENT',
        authorTitle: 'مريض ومراجع معتمد',
        title: postTitle,
        content: postContent,
        category: 'PATIENT_STORY',
        tags: ['تجربة مريض', serviceType === 'CONSULTATION' ? 'استشارة عن بعد' : 'حجز موعد', 'شكر وتقدير']
      });

      playSuccessSound();
      setPostSubmitted(true);
    } catch (err) {
      console.warn('Post creation error:', err);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Celebration Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 text-white p-6 relative overflow-hidden text-center">
          <div className="absolute top-2 left-2 flex gap-1 opacity-20">
            <Sparkles className="w-12 h-12" />
          </div>
          
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 mx-auto mb-1 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 shadow-lg">
            <Gift className="w-9 h-9 text-amber-300 animate-bounce" />
          </div>

          <h2 className="text-x sm:text-2xl font-black mb-0">
            شكراً لثقتكم بنا! 🎉
          </h2>
          <p className="text-xs sm:text-sm text-teal-100 max-w-md mx-auto">
            تم استلام طلبك بنجاح ({serviceTitle}). يسعدنا دوماً تقديم أفضل رعاية طبية متكاملة تليق بكم.
          </p>

          {/* Patient Reward Badge */}
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-md text-xs font-black shadow-inner">
            <Coins className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span>هدية شكر فورية: أضفنا +{earnedReward} نقطة مكافأة لمحفظتك! (رصيدك: {currentPoints} نقطة)</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 py-3 px-2 border-b-2 text-center transition-all cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'border-teal-600 text-teal-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mx-auto mb-1 text-teal-600" />
            <span>الخيارات والمكافآت</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GIFT')}
            className={`flex-1 py-3 px-2 border-b-2 text-center transition-all cursor-pointer ${
              activeTab === 'GIFT'
                ? 'border-amber-500 text-amber-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5 mx-auto mb-1 text-rose-500" />
            <span>إرسال هدية للطبيب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REVIEW')}
            className={`flex-1 py-3 px-2 border-b-2 text-center transition-all cursor-pointer ${
              activeTab === 'REVIEW'
                ? 'border-yellow-500 text-yellow-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star className="w-3.5 h-3.5 mx-auto mb-1 text-yellow-500" />
            <span>تقييم الخدمة (+{reviewReward})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('POST')}
            className={`flex-1 py-3 px-2 border-b-2 text-center transition-all cursor-pointer ${
              activeTab === 'POST'
                ? 'border-blue-600 text-blue-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 mx-auto mb-1 text-blue-600" />
            <span>نشر في المجتمع (+{communityReward})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-2">
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-teal-900">رصيدك المتاح من النقاط</div>
                  <div className="text-[11px] text-teal-700">يمكنك استخدامها لإرسال هدايا ودروع تكريم للأطباء أو لسداد استشارات قادمة</div>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-2xl font-black text-amber-600">{currentPoints}</span>
                  <span className="text-xs font-bold text-slate-600 mr-1">نقطة</span>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Send Gift Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('GIFT')}
                  className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-right transition-all group cursor-pointer shadow-xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-xs">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-xs text-rose-950 mb-1">إرسال هدية بالنقاط</h4>
                  <p className="text-[11px] text-rose-800 line-clamp-2">
                    أهدِ طبيبك أو موظفي الرعاية باقة ورد أو درع شكر تقديراً لجهودهم
                  </p>
                </button>

                {/* 2. Rate Service Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('REVIEW')}
                  className="p-4 rounded-2xl border border-yellow-200 bg-yellow-50/40 hover:bg-yellow-50 text-right transition-all group cursor-pointer shadow-xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-xs">
                    <Star className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-xs text-amber-950 mb-1">تقييم الخدمة</h4>
                  <p className="text-[11px] text-amber-800 line-clamp-2">
                    شاركنا رأيك وساعدنا على الارتقاء بمستوى الخدمة (+{reviewReward} نقطة)
                  </p>
                </button>

                {/* 3. Community Post Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('POST')}
                  className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-right transition-all group cursor-pointer shadow-xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-xs text-blue-950 mb-1">منشور في المجتمع</h4>
                  <p className="text-[11px] text-blue-800 line-clamp-2">
                    شارك تجربتك مع زملائك المرضى والعامة واستقبل تعليقاتهم (+{communityReward} نقطة)
                  </p>
                </button>
              </div>

              {doctorName && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-black shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">الطبيب المشرف: </span>
                    <span className="font-extrabold text-slate-800">{doctorName}</span>
                    <div className="text-[11px] text-slate-500">{doctorSpecialty || 'استشاري العيادات'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEND GIFT WITH POINTS */}
          {activeTab === 'GIFT' && (
            <div className="space-y-4">
              {giftSuccessMsg ? (
                <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-sm text-emerald-900">{giftSuccessMsg}</h4>
                  <p className="text-xs text-emerald-700">
                    تم إشعار المستلم بهديتك الجميلة وسيظهر تقديرك في لوحة تكريم الكوادر الطبية!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setGiftSuccessMsg(null);
                      setActiveTab('OVERVIEW');
                    }}
                    className="py-2 px-4 bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    العودة للقائمة الرئيسية
                  </button>
                </div>
              ) : (
                <>
                  {giftErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{giftErrorMsg}</span>
                    </div>
                  )}

                  {/* Recipient Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">إلى من تود إرسال الهدية؟</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGiftRecipientType('DOCTOR')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          giftRecipientType === 'DOCTOR'
                            ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <Stethoscope className="w-4 h-4 text-rose-600" />
                        <span>الطبيب ({doctorName || 'المعالج'})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGiftRecipientType('STAFF')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          giftRecipientType === 'STAFF'
                            ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <Users className="w-4 h-4 text-rose-600" />
                        <span>طاقم التمريض / الموظفين</span>
                      </button>
                    </div>
                  </div>

                  {/* Gift Items Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">اختر الهدية التقديرية:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {giftCatalog.map((gift) => {
                        const isSelected = selectedGift?.id === gift.id;
                        return (
                          <div
                            key={gift.id}
                            onClick={() => setSelectedGift(gift)}
                            className={`p-2 rounded-xl border text-right cursor-pointer transition-all ${
                              isSelected
                                ? 'border-rose-500 bg-rose-50/80 shadow-xs ring-1 ring-rose-400'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0">
                              <span className="text-12">{gift.icon}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
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

                  {/* Dedication Message */}
                  <div className="space-y-0">
                    <label className="text-xs font-extrabold text-slate-700">كلمة شكر وتقدير ترفقها مع الهدية:</label>
                    <textarea
                      rows={2}
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="اكتب كلمة شكر نابعة من القلب..."
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>

                  {/* Send Action */}
                  <div className="pt-1 flex items-center justify-between">
                    <div className="text-xs text-slate-600 font-semibold">
                      رصيدك: <span className="font-bold text-amber-700">{currentPoints} نقطة</span>
                    </div>
                    <button
                      type="button"
                      disabled={isSendingGift || !selectedGift}
                      onClick={handleSendGift}
                      className="py-2 px-5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Heart className="w-4 h-4 fill-white" />
                      <span>إرسال الهدية ({selectedGift?.pointsCost || 0} نقطة)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: RATE SERVICE */}
          {activeTab === 'REVIEW' && (
            <div className="space-y-2">
              {reviewSubmitted ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-1 animate-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-sm text-emerald-900">تم تسجيل تقييمك بنجاح!</h4>
                  <p className="text-xs text-emerald-700">
                    شكراً لوقتك وملاحظاتك القيمة، تمت إضافة +{reviewReward} نقطة مجانية إلى محفظتك كمكافأة تقييم!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('OVERVIEW')}
                    className="py-2 px-4 bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    العودة للقائمة
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="text-center p-3 bg-yellow-50/60 border border-yellow-200 rounded-2xl">
                    <div className="text-xs font-bold text-amber-900 mb-2">كيف تقيم تجربتك الإجمالية؟</div>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = (hoverRating || rating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="p-1 transition-transform hover:scale-125 cursor-pointer"
                          >
                            <Star
                              className={`w-7 h-7 ${
                                isFilled
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[11px] text-amber-700 mt-1 font-semibold">
                      {rating === 5 ? 'ممتاز جداً 🌟' : rating === 4 ? 'جيد جداً 👍' : rating === 3 ? 'مقبول' : 'يحتاج لتحسين'}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">اكتب رأيك أو مقترحاتك:</label>
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="ما الذي أعجبك وما الذي يمكننا تحسينه لخدمتك مستقبلاً؟"
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Star className="w-4 h-4 fill-white" />
                    <span>إرسال التقييم واستلام +{reviewReward} نقطة مكافأة</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: COMMUNITY POST */}
          {activeTab === 'POST' && (
            <div className="space-y-4">
              {postSubmitted ? (
                <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-sm text-emerald-900">تم نشر مشاركتك في المجتمع بنجاح!</h4>
                  <p className="text-xs text-emerald-700">
                    منشورك الآن ظاهر للعامة ويمكن للمرضى الآخرين قراءته والتعليق عليه والتفاعل معه. تمت إضافة +{communityReward} نقطة لمشاركتك الفعالة!
                  </p>
                  <div className="flex gap-2 justify-center pt-2">
                    {onOpenCommunity && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCommunity();
                        }}
                        className="py-2 px-4 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        الانتقال لمجتمع المرضى
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('OVERVIEW')}
                      className="py-2 px-4 bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePostSubmit} className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                    شارك تجربتك أو نصيحتك مع مجتمع المرضى والعامة، وسيتمكن الجميع من التفاعل والتعليق عليها!
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">عنوان المنشور:</label>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">محتوى المنشور:</label>
                    <textarea
                      rows={3}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPost}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>نشر المنشور للعامة (+{communityReward} نقطة مكافأة)</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-xs">
          <span className="text-slate-500">مجمع الرعاية الطبية الافتراضي • صحتكم أمانتنا</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            متابعة إلى لوحة التحكم
          </button>
        </div>

      </div>
    </div>
  );
};
