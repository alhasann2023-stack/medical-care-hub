import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, FIRESTORE_COLLECTIONS } from './firebase';
import {
  PointsWallet,
  PointsTransaction,
  MedicalPackage,
  ActivePatientPackage,
  GiftCatalogItem,
  SentGift,
  ServiceReview,
  CommunityPost,
  PostComment,
  UserRole,
  RewardSettings
} from '../types/medical';

// ============================================================
// DEFAULT PACKAGES DATA
// ============================================================
export const DEFAULT_MEDICAL_PACKAGES: MedicalPackage[] = [
  {
    id: 'pkg-basic',
    nameAr: 'باقة الرعاية الأساسية',
    nameEn: 'Basic Health Care Package',
    badge: 'الأوفر للمتابعة الفردية',
    price: 15000,
    currency: 'YER',
    pointsBonus: 50,
    consultationsQuota: 3,
    appointmentsQuota: 2,
    validityDays: 60,
    featuresAr: [
      '3 استشارات طبية عن بعد مجانية بالكامل',
      '2 حجز كشف في العيادات التخصصية',
      '+50 نقطة هدية ترحيبية فورية',
      'أولوية الإجابة خلال أقل من ساعة',
      'سجل طبي موحد ومتابعة رقمية مستمرة'
    ],
    colorTheme: 'from-blue-600 to-cyan-600',
    isPopular: false
  },
  {
    id: 'pkg-family',
    nameAr: 'باقة الرعاية العائلية المتقدمة',
    nameEn: 'Family Advanced Care Package',
    badge: 'الأكثر طلباً واختياراً',
    price: 35000,
    currency: 'YER',
    pointsBonus: 150,
    consultationsQuota: 8,
    appointmentsQuota: 5,
    validityDays: 120,
    featuresAr: [
      '8 استشارات طبية عن بعد لكافة أفراد الأسرة',
      '5 حجوزات كشف عيادي للأطباء الاستشاريين',
      '+150 نقطة مكافأة مجانية لمحفظتك',
      'خصم 15% إضافي على الفحوصات المخبرية والتحاليل',
      'أولوية قصوى ودعم على مدار 24 ساعة'
    ],
    colorTheme: 'from-emerald-600 to-teal-700',
    isPopular: true
  },
  {
    id: 'pkg-vip',
    nameAr: 'باقة النخبة الشاملة VIP',
    nameEn: 'VIP Comprehensive Care Package',
    badge: 'خدمة كبار الشخصيات',
    price: 65000,
    currency: 'YER',
    pointsBonus: 350,
    consultationsQuota: 20,
    appointmentsQuota: 12,
    validityDays: 365,
    featuresAr: [
      '20 استشارة تخصصية مع كبار الاستشاريين',
      '12 حجز كشف مباشر بدون انتظار',
      '+350 نقطة رصيد مكافآت وهدايا',
      'طبيب استشاري منسق ومتابع دائم للملف الصحي',
      'إمكانية إرسال هدايا ودروع تكريم مجانية للأطباء',
      'خصم 25% على كافة الخدمات التشخيصية والمختبر'
    ],
    colorTheme: 'from-amber-600 via-orange-600 to-purple-700',
    isPopular: false
  }
];

// ============================================================
// DEFAULT GIFT CATALOG ITEMS
// ============================================================
export const DEFAULT_GIFT_CATALOG: GiftCatalogItem[] = [


  {
    id: 'gift-shield',
    nameAr: 'درع الشكر والوفاء 🛡️',
    icon: '🛡️',
    pointsCost: 60,
    descriptionAr: 'درع رقمي تذكاري يعتز به الطبيب ويوضع في سجل إنجازاته بالمستشفى',
    category: 'SHIELD',
    color: 'bg-blue-100 text-blue-900 border-blue-300'
  },
  {
    id: 'gift-medal',
    nameAr: 'وسام التميز الطبي 🏅',
    icon: '🏅',
    pointsCost: 100,
    descriptionAr: 'وسام شرفي رفيع يُمنح للأطباء والموظفين المتميزين الذين قدموا خدمة استثنائية',
    category: 'MEDAL',
    color: 'bg-yellow-100 text-yellow-900 border-yellow-300'
  },
  {
    id: 'gift-diamond',
    nameAr: 'تاج العطاء والإنسانية 👑',
    icon: '👑',
    pointsCost: 200,
    descriptionAr: 'أرقى درجات التكريم والتقدير المهني من مريض ممتن لإنقاذ ورعاية لا تُنسى',
    category: 'VIP',
    color: 'bg-purple-100 text-purple-900 border-purple-300'
  }
];

export const DEFAULT_REWARD_SETTINGS: RewardSettings = {
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

// ============================================================
// INITIAL SEED COMMUNITY POSTS
// ============================================================
export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    authorId: 'doc-1',
    authorName: 'د. أحمد الصالحي',
    authorRole: 'DOCTOR',
    authorTitle: 'استشاري أمراض القلب والقسطرة التداخلية',
    doctorId: 'doc-1',
    doctorSpecialty: 'أمراض القلب والشرايين',
    title: '5 إرشادات أساسية لحماية عضلة القلب وتنظيم ضغط الدم في الأجواء المتقلبة',
    content: 'أعزائي المرضى والمراجعين، مع تغير فصول السنة يواجه الكثيرون تذبذباً في قراءات ضغط الدم. أنصحكم بالآتي:\n1. قياس الضغط صباحاً ومساءً وتسجيله بالدفتر الصحي في التطبيق.\n2. تقليل ملح الطعام والإكثار من شرب الماء الدافئ.\n3. المشي الخفيف المنتظم 30 دقيقة يومياً.\n4. عدم إيقاف أدوية الضغط أو تعديل جرعاتها دون استشارة الطبيب.\n5. التواصل الفوري عبر الاستشارة عن بعد عند الشعور بأي خفقان أو ضيق تنفس.\nدمتم بصحة وعافية دائمين!',
    category: 'HEALTH_TIP',
    tags: ['صحة القلب', 'ضغط الدم', 'إرشادات طبية'],
    likesCount: 28,
    likedBy: ['pat-1', 'pat-2', 'doc-2'],
    commentsCount: 3,
    isPinned: true,
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'post-2',
    authorId: 'doc-2',
    authorName: 'د. سارة الكبسي',
    authorRole: 'DOCTOR',
    authorTitle: 'استشارية طب الأطفال وحديثي الولادة',
    doctorId: 'doc-2',
    doctorSpecialty: 'طب الأطفال وحديثي الولادة',
    title: 'تنبيه للأمهات والآباء: كيفية تقوية مناعة الأطفال والتعامل مع النزلات الشائعة',
    content: 'لاحظنا في العيادة ازدياد حالات نزلات البرد الموسمية لدى أطفالنا. تذكروا دائماً أن المضادات الحيوية لا تعالج العدوى الفيروسية، واستخدامها العشوائي يضعف مناعة الطفل. احرصوا على فيتامين C، التغذية المتوازنة، والراحة التامة، واستشيروا طبيبكم المعتمد لأي حرارة تتجاوز 38.5 درجة لأكثر من يومين.',
    category: 'DOCTOR_ARTICLE',
    tags: ['طب الأطفال', 'المناعة', 'نصائح وقائية'],
    likesCount: 19,
    likedBy: ['pat-1'],
    commentsCount: 2,
    isPinned: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'post-3',
    authorId: 'pat-1',
    authorName: 'علي محمد المنصوري',
    authorRole: 'PATIENT',
    authorTitle: 'مريض متعافي ومراجع',
    title: 'تجربتي الرائعة مع نظام الاستشارات عن بعد وسرعة استجابة الأطباء',
    content: 'أود أن أشارككم تجربتي؛ كنت أشعر بأعراض مقلقة في منتصف الليل، وأرسلت استشارة فورية مع إرفاق تخطيط القلب وفحوصاتي السابقة، وتلقيت رداً مفصلاً ومطمئناً من الدكتور أحمد خلال نصف ساعة فقط مع خطة علاجية واضحة. الخدمة ممتازة واختصرت علي عناء المشوار والطوارئ. شكراً جزيلاً للطاقم الطبي والإداري على هذا المستوى الراقي!',
    category: 'PATIENT_STORY',
    tags: ['تجربة مريض', 'شكر وتقدير', 'استشارة عن بعد'],
    likesCount: 34,
    likedBy: ['doc-1', 'doc-2', 'admin-1'],
    commentsCount: 4,
    isPinned: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'post-4',
    authorId: 'pat-2',
    authorName: 'فاطمة عبدالله الحكيمي',
    authorRole: 'PATIENT',
    authorTitle: 'مريضة ومراجعة بعيادة السكر والغدد',
    title: 'تجربتي مع تنظيم السكر التراكمي من 9.5 إلى 6.8 خلال 4 أشهر',
    content: 'السلام عليكم ورحمة الله وبركاته، أحببت مشاركة هذه التجربة لتشجيع كل من يواجه صعوبة في ضبط السكري.\nبفضل الله ثم متابعة الدكتور أحمد واستشاراته المنتظمة عبر التطبيق:\n1. استبدلت الخبز الأبيض والنشويات المكررة بالحبوب الكاملة والخضروات.\n2. امتنعت تماماً عن المشروبات الغازية والعصائر المحلاة.\n3. التزمت بالمشي 25 دقيقة يومياً بعد وجبة العشاء.\n4. تدوين قياسات السكر اليومية في التطبيق لمتابعة الاتجاه.\nالنتائج كانت مذهلة ونزل التراكمي إلى 6.8 بحمد الله. لا تيأسوا فالالتزام يصنع الفارق!',
    category: 'PATIENT_STORY',
    tags: ['السكري', 'قصة نجاح', 'حمية صحية', 'تجربة مريض'],
    likesCount: 42,
    likedBy: ['doc-1', 'doc-2', 'pat-1'],
    commentsCount: 3,
    isPinned: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 2.5).toISOString()
  },
  {
    id: 'post-5',
    authorId: 'pat-3',
    authorName: 'خالد سيف المقالح',
    authorRole: 'PATIENT',
    authorTitle: 'مريض ومراجع معتمد',
    title: 'استفسار وتجربة: متى ينصح بالعودة للرياضة الخفيفة بعد جراحة الفتق الإربي؟',
    content: 'تحية طيبة للجميع ولأطبائنا الأعزاء.\nأجريت عملية فتق إربي قبل 3 أسابيع ولله الحمد الجرح التأم تماماً ولا أشعر بألم أثناء الحركة اليومية. متى يعتبر الوقت المناسب للبدء برياضة المشي السريع أو استخدام الدراجة الثابتة؟ وهل هناك إخوة مراجعون مروا بنفس التجربة ولديهم نصائح لفترة النقاهة؟ جزاكم الله خيراً.',
    category: 'QUESTION',
    tags: ['جراحة', 'استفسار', 'تعافي', 'تمارين'],
    likesCount: 16,
    likedBy: ['pat-1'],
    commentsCount: 2,
    isPinned: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 1.8).toISOString()
  },
  {
    id: 'post-6',
    authorId: 'pat-4',
    authorName: 'أم مروان الزبيري',
    authorRole: 'PATIENT',
    authorTitle: 'أم ومراجعة لعيادة الأطفال',
    title: 'رسالة شكر وتقدير من القلب لكادر طوارئ وتمريض الأطفال بالمستشفى',
    content: 'وصلت في ساعة متأخرة مع طفلي وهو يعاني من حرارة مرتفعة مفاجئة، وكان التعامل سريعاً ومحترفاً ومطمئناً من اللحظة الأولى من قبل الدكتور وممرضي الطوارئ.\nقمت بإرسال درع شكر وهدية من نقاطي في التطبيق للدكتور وطاقم التمريض تقديراً لجهدهم الإنساني العظيم. شكراً لكل يد بيضاء تسهر على راحة أطفالنا ومرضانا!',
    category: 'GRATITUDE',
    tags: ['شكر وتقدير', 'طوارئ الأطفال', 'كادر التمريض', 'هدية نقاط'],
    likesCount: 38,
    likedBy: ['doc-1', 'doc-2', 'pat-2'],
    commentsCount: 3,
    isPinned: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString()
  }
];

export const INITIAL_POST_COMMENTS: PostComment[] = [
  {
    id: 'comment-1',
    postId: 'post-1',
    authorId: 'pat-1',
    authorName: 'علي المنصوري',
    authorRole: 'PATIENT',
    authorTitle: 'مريض ومراجع',
    content: 'جزاك الله خيراً يا دكتور أحمد، نصائح قيّمة ودائماً ما تتابع حالتي باهتمام كبير.',
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString()
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    authorId: 'doc-1',
    authorName: 'د. أحمد الصالحي',
    authorRole: 'DOCTOR',
    authorTitle: 'استشاري أمراض القلب',
    content: 'أهلاً بك أخي علي، سعيد جداً باستقرار حالتك والتزامك بالإرشادات، وأتمنى لك دوام الصحة.',
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 1.2).toISOString()
  },
  {
    id: 'comment-3',
    postId: 'post-3',
    authorId: 'doc-1',
    authorName: 'د. أحمد الصالحي',
    authorRole: 'DOCTOR',
    authorTitle: 'استشاري أمراض القلب',
    content: 'العفو أخي علي، هذا واجبنا الإنساني والمهني ونسعد دائماً بخدمتكم.',
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 0.8).toISOString()
  },
  {
    id: 'comment-4',
    postId: 'post-4',
    authorId: 'doc-1',
    authorName: 'د. أحمد الصالحي',
    authorRole: 'DOCTOR',
    authorTitle: 'استشاري أمراض القلب',
    content: 'ما شاء الله أخت فاطمة، نموذج ملهم ورائع للوعي الصحي! الاستمرار في هذه العادات يحمي القلب والشرايين بإذن الله.',
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 2.2).toISOString()
  },
  {
    id: 'comment-5',
    postId: 'post-4',
    authorId: 'pat-1',
    authorName: 'علي محمد المنصوري',
    authorRole: 'PATIENT',
    authorTitle: 'مريض ومراجع',
    content: 'تجربة تشجّع كثيراً! بارك الله فيك، سأبدأ بتطبيق خطة المشي المسائي فوراً.',
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'comment-6',
    postId: 'post-5',
    authorId: 'doc-1',
    authorName: 'د. أحمد الصالحي',
    authorRole: 'DOCTOR',
    authorTitle: 'استشاري العيادات',
    content: 'حمداً لله على سلامتك أخي خالد. المشي الخفيف مسموح به الآن، أما التمارين وحمل الأوزان يفضل الانتظار حتى اكتمال 6 أسابيع بعد مراجعة جراحك.',
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString()
  },
  {
    id: 'comment-7',
    postId: 'post-6',
    authorId: 'doc-2',
    authorName: 'د. سارة الكبسي',
    authorRole: 'DOCTOR',
    authorTitle: 'استشارية طب الأطفال',
    content: 'سلامة مروان البطل ألف سلامة! أسعدتنا هديتك وكلماتك الطيبة ونسأل الله له كامل الصحة والعافية.',
    isHidden: false,
    createdAt: new Date(Date.now() - 86400000 * 0.3).toISOString()
  }
];

// In-Memory cache with localStorage backup
const STORAGE_PREFIX = 'mch_points_v2_';

function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(STORAGE_PREFIX + key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
}

class PointsAndCommunityService {
  private memoryWallets: Map<string, PointsWallet> = new Map();
  private memoryPackages: MedicalPackage[] = [...DEFAULT_MEDICAL_PACKAGES];
  private memoryActivePackages: Map<string, ActivePatientPackage> = new Map();
  private memorySentGifts: SentGift[] = [];
  private memoryReviews: ServiceReview[] = [];
  private memoryPosts: CommunityPost[] = [];
  private memoryComments: PostComment[] = [];
  private postSubscribers: Set<(posts: CommunityPost[]) => void> = new Set();
  private commentSubscribers: Map<string, Set<(comments: PostComment[]) => void>> = new Map();
  private memoryRewardSettings: RewardSettings | null = null;
  private rewardSettingsSubscribers: Set<(settings: RewardSettings) => void> = new Set();
  private walletSubscribers: Map<string, Set<(wallet: PointsWallet) => void>> = new Map();

  private notifyWalletSubscribers(wallet: PointsWallet) {
    const subs = this.walletSubscribers.get(wallet.patientId);
    if (subs) {
      subs.forEach(cb => {
        try { cb(wallet); } catch (e) { console.warn('Wallet subscriber error:', e); }
      });
    }
  }

  constructor() {
    this.initData();
  }

  getRewardSettings(): RewardSettings {
    if (this.memoryRewardSettings) {
      return this.memoryRewardSettings;
    }
    const stored = getLocalItem<Partial<RewardSettings> | null>('reward_settings', null);
    const merged: RewardSettings = {
      ...DEFAULT_REWARD_SETTINGS,
      ...(stored || {})
    };
    this.memoryRewardSettings = merged;
    setLocalItem('reward_settings', merged);
    return merged;
  }

  async fetchRewardSettings(): Promise<RewardSettings> {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.SETTINGS, 'reward_settings');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<RewardSettings>;
        const merged: RewardSettings = {
          ...DEFAULT_REWARD_SETTINGS,
          ...data
        };
        this.memoryRewardSettings = merged;
        setLocalItem('reward_settings', merged);
        this.notifyRewardSettingsSubscribers(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Failed fetching reward_settings from Firestore:', e);
    }
    return this.getRewardSettings();
  }

  subscribeRewardSettings(callback: (settings: RewardSettings) => void): () => void {
    callback(this.getRewardSettings());
    this.rewardSettingsSubscribers.add(callback);

    // Also listen to Firestore live changes
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.SETTINGS, 'reward_settings');
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<RewardSettings>;
          const merged: RewardSettings = {
            ...DEFAULT_REWARD_SETTINGS,
            ...data
          };
          this.memoryRewardSettings = merged;
          setLocalItem('reward_settings', merged);
          callback(merged);
        }
      }, (err) => {
        console.warn('Reward settings Firestore snapshot error:', err);
      });

      return () => {
        this.rewardSettingsSubscribers.delete(callback);
        unsub();
      };
    } catch {
      return () => {
        this.rewardSettingsSubscribers.delete(callback);
      };
    }
  }

  private notifyRewardSettingsSubscribers(settings: RewardSettings) {
    this.rewardSettingsSubscribers.forEach(cb => {
      try { cb(settings); } catch {}
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mch_reward_settings_updated', { detail: settings }));
    }
  }

  saveRewardSettings(settings: RewardSettings, updatedBy?: string): RewardSettings {
    const current = this.getRewardSettings();
    const merged: RewardSettings = {
      ...DEFAULT_REWARD_SETTINGS,
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || settings.updatedBy || 'HOSPITAL_ADMIN'
    };
    this.memoryRewardSettings = merged;
    setLocalItem('reward_settings', merged);
    this.notifyRewardSettingsSubscribers(merged);

    // Save to Firestore asynchronously
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.SETTINGS, 'reward_settings');
      setDoc(docRef, merged, { merge: true }).catch(err => {
        console.warn('Failed saving reward_settings to Firestore:', err);
      });
    } catch (err) {
      console.warn('Failed saving reward_settings to Firestore:', err);
    }

    return merged;
  }

  private initData() {
    // Restore or initialize posts & comments - merge with seeds so patient posts are never lost
    const savedPosts = getLocalItem<CommunityPost[]>('posts', []);
    const mergedPosts = [...savedPosts];
    for (const initP of INITIAL_COMMUNITY_POSTS) {
      if (!mergedPosts.some(p => p.id === initP.id)) {
        mergedPosts.push(initP);
      }
    }
    this.memoryPosts = mergedPosts;
    setLocalItem('posts', mergedPosts);

    const savedComments = getLocalItem<PostComment[]>('comments', []);
    const mergedComments = [...savedComments];
    for (const initC of INITIAL_POST_COMMENTS) {
      if (!mergedComments.some(c => c.id === initC.id)) {
        mergedComments.push(initC);
      }
    }
    this.memoryComments = mergedComments;
    setLocalItem('comments', mergedComments);

    const savedGifts = getLocalItem<SentGift[]>('gifts', []);
    this.memorySentGifts = savedGifts;

    const savedReviews = getLocalItem<ServiceReview[]>('reviews', []);
    this.memoryReviews = savedReviews;

    // Load latest reward settings asynchronously from Firestore
    this.fetchRewardSettings().catch(() => {});
  }

  private notifyPostSubscribers() {
    const list = [...this.memoryPosts];
    this.postSubscribers.forEach(cb => {
      try {
        cb(list);
      } catch (err) {
        console.warn('Error in post subscriber callback:', err);
      }
    });
  }

  private notifyCommentSubscribers(postId: string) {
    const subs = this.commentSubscribers.get(postId);
    if (!subs) return;
    const list = this.memoryComments.filter(c => c.postId === postId);
    subs.forEach(cb => {
      try {
        cb(list);
      } catch (err) {
        console.warn('Error in comment subscriber callback:', err);
      }
    });
  }

  // ============================================================
  // POINTS WALLET
  // ============================================================

  async getPointsWallet(patientId: string): Promise<PointsWallet> {
    if (!patientId) patientId = 'pat-1';

    // 1. Try Firestore
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.POINTS_WALLETS, patientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as PointsWallet;
        this.memoryWallets.set(patientId, data);
        setLocalItem(`wallet_${patientId}`, data);
        return data;
      }
    } catch (e) {
      // offline / fallback
    }

    // 2. Try memory / local storage
    let wallet = this.memoryWallets.get(patientId) || getLocalItem<PointsWallet | null>(`wallet_${patientId}`, null);
    if (!wallet) {
      const welcomeReward = this.getRewardSettings().newUserRewardPoints || 150;
      wallet = {
        patientId,
        pointsBalance: welcomeReward,
        tier: 'SILVER',
        totalEarned: welcomeReward,
        totalSpent: 0,
        history: [
          {
            id: `tx-init-${Date.now()}`,
            patientId,
            type: 'REWARD',
            amount: welcomeReward,
            descriptionAr: `رصيد نقاط ترحيبي مجاني كهدية انضمام للمنصة (${welcomeReward} نقطة)`,
            createdAt: new Date().toISOString()
          }
        ],
        updatedAt: new Date().toISOString()
      };
      this.saveWallet(wallet);
    }

    return wallet;
  }

  subscribePointsWallet(patientId: string, callback: (wallet: PointsWallet) => void): () => void {
    if (!patientId) patientId = 'pat-1';

    if (!this.walletSubscribers.has(patientId)) {
      this.walletSubscribers.set(patientId, new Set());
    }
    this.walletSubscribers.get(patientId)!.add(callback);

    // Immediate callback from local
    this.getPointsWallet(patientId).then(callback);

    const onPointsUpdated = (e: any) => {
      const w = e.detail as PointsWallet | undefined;
      if (w && w.patientId === patientId) {
        callback(w);
      } else if (!w) {
        this.getPointsWallet(patientId).then(callback);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('mch_points_updated', onPointsUpdated);
    }

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.POINTS_WALLETS, patientId);
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const w = snap.data() as PointsWallet;
          this.memoryWallets.set(patientId, w);
          setLocalItem(`wallet_${patientId}`, w);
          callback(w);
        }
      }, (err) => {
        console.warn('Points wallet subscription error:', err);
      });
      return () => {
        const subs = this.walletSubscribers.get(patientId);
        if (subs) subs.delete(callback);
        if (typeof window !== 'undefined') {
          window.removeEventListener('mch_points_updated', onPointsUpdated);
        }
        unsub();
      };
    } catch {
      return () => {
        const subs = this.walletSubscribers.get(patientId);
        if (subs) subs.delete(callback);
        if (typeof window !== 'undefined') {
          window.removeEventListener('mch_points_updated', onPointsUpdated);
        }
      };
    }
  }

  async addPoints(
    patientId: string,
    amount: number,
    descriptionAr: string,
    referenceId?: string
  ): Promise<PointsWallet> {
    const wallet = await this.getPointsWallet(patientId);
    const newTx: PointsTransaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId,
      type: 'REWARD',
      amount: Math.abs(amount),
      descriptionAr,
      referenceId,
      createdAt: new Date().toISOString()
    };

    const newBalance = wallet.pointsBalance + Math.abs(amount);
    const newTotalEarned = wallet.totalEarned + Math.abs(amount);
    const tier = newTotalEarned >= 500 ? 'VIP' : newTotalEarned >= 300 ? 'GOLD' : newTotalEarned >= 150 ? 'SILVER' : 'BRONZE';

    const updatedWallet: PointsWallet = {
      ...wallet,
      pointsBalance: newBalance,
      totalEarned: newTotalEarned,
      tier,
      history: [newTx, ...wallet.history],
      updatedAt: new Date().toISOString()
    };

    await this.saveWallet(updatedWallet);
    return updatedWallet;
  }

  async deductPoints(
    patientId: string,
    amount: number,
    descriptionAr: string,
    referenceId?: string,
    type: 'SPENT' | 'GIFT_SENT' = 'SPENT'
  ): Promise<{ success: boolean; wallet: PointsWallet; error?: string }> {
    const wallet = await this.getPointsWallet(patientId);
    const needed = Math.abs(amount);

    if (wallet.pointsBalance < needed) {
      return {
        success: false,
        wallet,
        error: `رصيد النقاط غير كافٍ. المطلوب: ${needed} نقطة، رصيدك الحالي: ${wallet.pointsBalance} نقطة.`
      };
    }

    const newTx: PointsTransaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId,
      type,
      amount: -needed,
      descriptionAr,
      referenceId,
      createdAt: new Date().toISOString()
    };

    const updatedWallet: PointsWallet = {
      ...wallet,
      pointsBalance: wallet.pointsBalance - needed,
      totalSpent: wallet.totalSpent + needed,
      history: [newTx, ...wallet.history],
      updatedAt: new Date().toISOString()
    };

    await this.saveWallet(updatedWallet);
    return { success: true, wallet: updatedWallet };
  }

  async refundPoints(
    patientId: string,
    amount: number,
    descriptionAr: string,
    referenceId?: string
  ): Promise<PointsWallet> {
    if (!patientId) patientId = 'pat-1';
    const wallet = await this.getPointsWallet(patientId);
    const refundAmt = Math.abs(amount);

    const newTx: PointsTransaction = {
      id: `tx-ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId,
      type: 'REFUND',
      amount: refundAmt,
      descriptionAr: descriptionAr || 'استرداد قيمة الاستشارة/الحجز إلى رصيد النقاط',
      referenceId,
      createdAt: new Date().toISOString()
    };

    const newBalance = (wallet.pointsBalance || 0) + refundAmt;
    const newTotalSpent = Math.max(0, (wallet.totalSpent || 0) - refundAmt);

    const updatedWallet: PointsWallet = {
      ...wallet,
      pointsBalance: newBalance,
      totalSpent: newTotalSpent,
      history: [newTx, ...(wallet.history || [])],
      updatedAt: new Date().toISOString()
    };

    await this.saveWallet(updatedWallet);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mch_points_updated', { detail: updatedWallet }));
    }

    return updatedWallet;
  }

  private async saveWallet(wallet: PointsWallet): Promise<void> {
    this.memoryWallets.set(wallet.patientId, wallet);
    setLocalItem(`wallet_${wallet.patientId}`, wallet);
    this.notifyWalletSubscribers(wallet);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mch_points_updated', { detail: wallet }));
    }
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.POINTS_WALLETS, wallet.patientId);
      await setDoc(docRef, wallet, { merge: true });
    } catch (e) {
      console.warn('Failed saving wallet to Firestore:', e);
    }
  }

  // ============================================================
  // PACKAGES SYSTEM
  // ============================================================

  async getPackages(): Promise<MedicalPackage[]> {
    const saved = getLocalItem<MedicalPackage[] | null>('packages', null);
    if (saved && saved.length > 0) {
      this.memoryPackages = saved;
    }
    return this.memoryPackages;
  }

  async savePackages(packages: MedicalPackage[]): Promise<MedicalPackage[]> {
    this.memoryPackages = packages || DEFAULT_MEDICAL_PACKAGES;
    setLocalItem('packages', this.memoryPackages);
    return this.memoryPackages;
  }

  async getActivePackage(patientId: string): Promise<ActivePatientPackage | null> {
    if (!patientId) patientId = 'pat-1';

    // 1. Try Firestore
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.ACTIVE_PACKAGES, patientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const pkg = snap.data() as ActivePatientPackage;
        if (pkg.status === 'ACTIVE' && new Date(pkg.expiresAt).getTime() > Date.now()) {
          this.memoryActivePackages.set(patientId, pkg);
          setLocalItem(`active_pkg_${patientId}`, pkg);
          return pkg;
        }
      }
    } catch (e) {
      // fallback
    }

    const local = this.memoryActivePackages.get(patientId) || getLocalItem<ActivePatientPackage | null>(`active_pkg_${patientId}`, null);
    if (local && local.status === 'ACTIVE' && new Date(local.expiresAt).getTime() > Date.now()) {
      return local;
    }

    return null;
  }

  subscribeActivePackage(patientId: string, callback: (pkg: ActivePatientPackage | null) => void): () => void {
    if (!patientId) patientId = 'pat-1';
    this.getActivePackage(patientId).then(callback);

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.ACTIVE_PACKAGES, patientId);
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const pkg = snap.data() as ActivePatientPackage;
          this.memoryActivePackages.set(patientId, pkg);
          setLocalItem(`active_pkg_${patientId}`, pkg);
          callback(pkg);
        } else {
          callback(null);
        }
      });
      return unsub;
    } catch {
      return () => {};
    }
  }

  async purchasePackage(
    patientId: string,
    packageId: string,
    packageNameAr?: string
  ): Promise<{ success: boolean; activePackage: ActivePatientPackage; wallet: PointsWallet }> {
    const pkgDef = this.memoryPackages.find(p => p.id === packageId) || DEFAULT_MEDICAL_PACKAGES[0];
    const expiry = new Date(Date.now() + (pkgDef.validityDays * 24 * 60 * 60 * 1000)).toISOString();

    const activePkg: ActivePatientPackage = {
      id: `act-pkg-${Date.now()}`,
      patientId,
      packageId: pkgDef.id,
      packageNameAr: packageNameAr || pkgDef.nameAr,
      remainingConsultations: pkgDef.consultationsQuota,
      remainingAppointments: pkgDef.appointmentsQuota,
      totalConsultations: pkgDef.consultationsQuota,
      totalAppointments: pkgDef.appointmentsQuota,
      purchasedAt: new Date().toISOString(),
      expiresAt: expiry,
      status: 'ACTIVE'
    };

    // Save active package
    this.memoryActivePackages.set(patientId, activePkg);
    setLocalItem(`active_pkg_${patientId}`, activePkg);

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.ACTIVE_PACKAGES, patientId);
      await setDoc(docRef, activePkg, { merge: true });
    } catch (e) {
      console.warn('Failed saving active package to Firestore:', e);
    }

    // Award bonus points from the package!
    const wallet = await this.addPoints(
      patientId,
      pkgDef.pointsBonus,
      `مكافأة نقاط ترحيبية لاشتراكك في ${pkgDef.nameAr} (+${pkgDef.pointsBonus} نقطة)`,
      activePkg.id
    );

    return {
      success: true,
      activePackage: activePkg,
      wallet
    };
  }

  async consumePackageQuota(
    patientId: string,
    serviceType: 'CONSULTATION' | 'APPOINTMENT'
  ): Promise<{ success: boolean; remaining: number; error?: string }> {
    const active = await this.getActivePackage(patientId);
    if (!active) {
      return { success: false, remaining: 0, error: 'لا توجد باقة نشطة حالياً.' };
    }

    if (serviceType === 'CONSULTATION') {
      if (active.remainingConsultations <= 0) {
        return { success: false, remaining: 0, error: 'لقد استنفذت رصيد الاستشارات في باقتك الحالية.' };
      }
      active.remainingConsultations -= 1;
    } else {
      if (active.remainingAppointments <= 0) {
        return { success: false, remaining: 0, error: 'لقد استنفذت رصيد الحجوزات في باقتك الحالية.' };
      }
      active.remainingAppointments -= 1;
    }

    if (active.remainingConsultations === 0 && active.remainingAppointments === 0) {
      active.status = 'DEPLETED';
    }

    this.memoryActivePackages.set(patientId, active);
    setLocalItem(`active_pkg_${patientId}`, active);
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.ACTIVE_PACKAGES, patientId);
      await setDoc(docRef, active, { merge: true });
    } catch (e) {
      console.warn('Failed to update consumed package quota in Firestore:', e);
    }

    const rem = serviceType === 'CONSULTATION' ? active.remainingConsultations : active.remainingAppointments;
    return { success: true, remaining: rem };
  }

  // ============================================================
  // GIFTS SYSTEM (هدايا بالنقاط للدكتور أو الموظفين)
  // ============================================================

  getGiftCatalog(): GiftCatalogItem[] {
    return DEFAULT_GIFT_CATALOG;
  }

  async sendGift(
    data: Omit<SentGift, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; gift: SentGift; error?: string }> {
    // 1. Deduct points from patient wallet
    const deductResult = await this.deductPoints(
      data.senderPatientId,
      data.pointsAmount,
      `إرسال هدية (${data.giftNameAr}) إلى ${data.recipientName} (${data.pointsAmount} نقطة)`,
      data.recipientId,
      'GIFT_SENT'
    );

    if (!deductResult.success) {
      return {
        success: false,
        gift: null as any,
        error: deductResult.error
      };
    }

    // 2. Create sent gift record
    const gift: SentGift = {
      ...data,
      id: `gift-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };

    this.memorySentGifts = [gift, ...this.memorySentGifts];
    setLocalItem('gifts', this.memorySentGifts);

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.SENT_GIFTS, gift.id);
      await setDoc(docRef, gift);
    } catch (e) {
      console.warn('Failed saving sent gift to Firestore:', e);
    }

    const rewardAmount = this.getRewardSettings().giftRewardPoints || 0;
    if (rewardAmount > 0) {
      await this.addPoints(
        data.senderPatientId,
        rewardAmount,
        `مكافأة إرسال هدية (${gift.giftNameAr}) للعناية والامتنان (+${rewardAmount} نقطة)`,
        gift.id
      );
    }

    return {
      success: true,
      gift
    };
  }

  async getSentGifts(filter?: { patientId?: string; recipientId?: string }): Promise<SentGift[]> {
    try {
      const q = collection(db, FIRESTORE_COLLECTIONS.SENT_GIFTS);
      const snap = await getDocs(q);
      const list: SentGift[] = [];
      snap.forEach(d => {
        const data = d.data() as SentGift;
        list.push({ ...data, id: data.id || d.id });
      });
      if (list.length > 0) {
        this.memorySentGifts = list;
        setLocalItem('gifts', list);
      }
    } catch (e) {
      // fallback
    }

    let result = [...this.memorySentGifts];
    if (filter?.patientId) {
      result = result.filter(g => g.senderPatientId === filter.patientId);
    }
    if (filter?.recipientId) {
      result = result.filter(g => g.recipientId === filter.recipientId);
    }
    return result;
  }

  subscribeSentGifts(
    filter: { patientId?: string; recipientId?: string } | undefined,
    callback: (gifts: SentGift[]) => void
  ): () => void {
    this.getSentGifts(filter).then(callback);

    try {
      const colRef = collection(db, FIRESTORE_COLLECTIONS.SENT_GIFTS);
      const unsub = onSnapshot(colRef, (snap) => {
        const list: SentGift[] = [];
        snap.forEach(d => {
          const data = d.data() as SentGift;
          list.push({ ...data, id: data.id || d.id });
        });
        if (list.length > 0) {
          this.memorySentGifts = list;
          setLocalItem('gifts', list);
        }

        let filtered = list.length > 0 ? list : this.memorySentGifts;
        if (filter?.patientId) filtered = filtered.filter(g => g.senderPatientId === filter.patientId);
        if (filter?.recipientId) filtered = filtered.filter(g => g.recipientId === filter.recipientId);
        callback(filtered);
      });
      return unsub;
    } catch {
      return () => {};
    }
  }

  // ============================================================
  // SERVICE REVIEWS & RATINGS (تقييم الخدمة)
  // ============================================================

  async submitReview(review: Omit<ServiceReview, 'id' | 'createdAt'>): Promise<ServiceReview> {
    const fullReview: ServiceReview = {
      ...review,
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };

    this.memoryReviews = [fullReview, ...this.memoryReviews];
    setLocalItem('reviews', this.memoryReviews);

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.SERVICE_REVIEWS, fullReview.id);
      await setDoc(docRef, fullReview);
    } catch (e) {
      console.warn('Failed saving review to Firestore:', e);
    }

    const settings = this.getRewardSettings();
    const rewardAmount = typeof settings.reviewRewardPoints === 'number' ? settings.reviewRewardPoints : 15;
    if (rewardAmount > 0) {
      await this.addPoints(
        review.patientId,
        rewardAmount,
        `مكافأة تقديم تقييم وملاحظات قيمة لتحسين جودة الرعاية الطبية (+${rewardAmount} نقطة)`,
        fullReview.id
      );
    }

    return fullReview;
  }

  async getServiceReviews(filter?: { doctorId?: string; serviceType?: string }): Promise<ServiceReview[]> {
    try {
      const colRef = collection(db, FIRESTORE_COLLECTIONS.SERVICE_REVIEWS);
      const snap = await getDocs(colRef);
      const list: ServiceReview[] = [];
      snap.forEach(d => {
        const data = d.data() as ServiceReview;
        list.push({ ...data, id: data.id || d.id });
      });
      if (list.length > 0) {
        this.memoryReviews = list;
        setLocalItem('reviews', list);
      }
    } catch {
      // fallback
    }

    let result = [...this.memoryReviews];
    if (filter?.doctorId) {
      result = result.filter(r => r.doctorId === filter.doctorId);
    }
    if (filter?.serviceType) {
      result = result.filter(r => r.serviceType === filter.serviceType);
    }
    return result;
  }

  // ============================================================
  // COMMUNITY POSTS & COMMENTS (منشورات المجتمع العام)
  // ============================================================

  async getCommunityPosts(includeHidden: boolean = false): Promise<CommunityPost[]> {
    try {
      const colRef = collection(db, FIRESTORE_COLLECTIONS.COMMUNITY_POSTS);
      const snap = await getDocs(colRef);
      const list: CommunityPost[] = [];
      snap.forEach(d => {
        const data = d.data() as CommunityPost;
        list.push({ ...data, id: data.id || d.id });
      });
      if (list.length > 0) {
        // Merge Firestore list with existing memory posts and seed posts
        const map = new Map<string, CommunityPost>();
        for (const item of list) {
          const id = item.id || `post-${map.size}`;
          const existing = this.memoryPosts.find(p => p.id === id) || INITIAL_COMMUNITY_POSTS.find(p => p.id === id);
          map.set(id, existing ? { ...existing, ...item, id } : { ...item, id });
        }
        for (const mem of this.memoryPosts) {
          if (mem.id && !map.has(mem.id)) {
            map.set(mem.id, mem);
          }
        }
        for (const seed of INITIAL_COMMUNITY_POSTS) {
          if (!map.has(seed.id)) {
            map.set(seed.id, seed);
          }
        }
        const merged = Array.from(map.values()).sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        this.memoryPosts = merged;
        setLocalItem('posts', merged);
      }
    } catch {
      // fallback
    }

    const posts = [...this.memoryPosts];
    if (!includeHidden) {
      return posts.filter(p => !p.isHidden);
    }
    return posts;
  }

  subscribeCommunityPosts(
    callback: (posts: CommunityPost[]) => void,
    includeHidden: boolean = false
  ): () => void {
    // 1. In-memory subscriber registration
    const wrappedCb = (allPosts: CommunityPost[]) => {
      const filtered = includeHidden ? allPosts : allPosts.filter(p => !p.isHidden);
      callback(filtered);
    };
    this.postSubscribers.add(wrappedCb);

    // 2. Immediate dispatch from memory cache
    const initialList = includeHidden ? this.memoryPosts : this.memoryPosts.filter(p => !p.isHidden);
    callback(initialList);

    // 3. Background fetch and merge from Firestore
    this.getCommunityPosts(includeHidden).then(callback).catch(() => {});

    // 4.    // Real-time Firestore snapshot listener
    try {
      const colRef = collection(db, FIRESTORE_COLLECTIONS.COMMUNITY_POSTS);
      const unsub = onSnapshot(colRef, (snap) => {
        const list: CommunityPost[] = [];
        snap.forEach(d => {
          const data = d.data() as CommunityPost;
          list.push({ ...data, id: data.id || d.id });
        });
        if (list.length > 0) {
          const map = new Map<string, CommunityPost>();
          for (const item of list) {
            const id = item.id || `post-${map.size}`;
            const existing = this.memoryPosts.find(p => p.id === id) || INITIAL_COMMUNITY_POSTS.find(p => p.id === id);
            map.set(id, existing ? { ...existing, ...item, id } : { ...item, id });
          }
          for (const mem of this.memoryPosts) {
            if (mem.id && !map.has(mem.id)) {
              map.set(mem.id, mem);
            }
          }
          for (const seed of INITIAL_COMMUNITY_POSTS) {
            if (!map.has(seed.id)) {
              map.set(seed.id, seed);
            }
          }
          const merged = Array.from(map.values()).sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          this.memoryPosts = merged;
          setLocalItem('posts', merged);
        }
        const filtered = includeHidden ? this.memoryPosts : this.memoryPosts.filter(p => !p.isHidden);
        callback(filtered);
      }, (err) => {
        console.warn('Community posts onSnapshot fallback:', err);
      });

      return () => {
        this.postSubscribers.delete(wrappedCb);
        try { unsub(); } catch {}
      };
    } catch {
      return () => {
        this.postSubscribers.delete(wrappedCb);
      };
    }
  }

  async createCommunityPost(
    postData: Omit<CommunityPost, 'id' | 'createdAt' | 'likesCount' | 'likedBy' | 'commentsCount'>
  ): Promise<CommunityPost> {
    const post: CommunityPost = {
      ...postData,
      id: `post-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      likesCount: 0,
      likedBy: [],
      commentsCount: 0,
      isHidden: false,
      createdAt: new Date().toISOString()
    };

    this.memoryPosts = [post, ...this.memoryPosts];
    setLocalItem('posts', this.memoryPosts);
    this.notifyPostSubscribers();

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.COMMUNITY_POSTS, post.id);
      await setDoc(docRef, post);
    } catch (e) {
      console.warn('Failed saving post to Firestore:', e);
    }

    // If patient creates a post, give them reward points for participating in community!
    if (post.authorRole === 'PATIENT' && post.authorId) {
      const settings = this.getRewardSettings();
      const rewardAmount = typeof settings.communityPostRewardPoints === 'number' ? settings.communityPostRewardPoints : 20;
      if (rewardAmount > 0) {
        this.addPoints(
          post.authorId,
          rewardAmount,
          `مكافأة مشاركة تجربة وتدوينة إيجابية في مجتمع الرعاية الصحية (+${rewardAmount} نقطة)`,
          post.id
        ).catch(() => {});
      }
    }

    return post;
  }

  async likeCommunityPost(postId: string, userId: string): Promise<{ likesCount: number; isLiked: boolean }> {
    const post = this.memoryPosts.find(p => p.id === postId);
    if (!post) return { likesCount: 0, isLiked: false };

    const likedBy = post.likedBy || [];
    const hasLiked = likedBy.includes(userId);

    let updatedLikedBy: string[];
    let newLikesCount: number;

    if (hasLiked) {
      updatedLikedBy = likedBy.filter(id => id !== userId);
      newLikesCount = Math.max(0, (post.likesCount || 1) - 1);
    } else {
      updatedLikedBy = [...likedBy, userId];
      newLikesCount = (post.likesCount || 0) + 1;
    }

    post.likedBy = updatedLikedBy;
    post.likesCount = newLikesCount;

    setLocalItem('posts', this.memoryPosts);
    this.notifyPostSubscribers();

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.COMMUNITY_POSTS, postId);
      // Write full post object to Firestore so fields like title, content, authorRole are never wiped out
      await setDoc(docRef, post);
    } catch (e) {
      console.warn('Failed updating post likes in Firestore:', e);
    }

    return { likesCount: newLikesCount, isLiked: !hasLiked };
  }

  // Comments
  async getComments(postId: string, includeHidden: boolean = false): Promise<PostComment[]> {
    try {
      const colRef = collection(db, FIRESTORE_COLLECTIONS.POST_COMMENTS);
      const snap = await getDocs(colRef);
      const list: PostComment[] = [];
      snap.forEach(d => {
        const data = d.data() as PostComment;
        list.push({ ...data, id: data.id || d.id });
      });
      if (list.length > 0) {
        const map = new Map<string, PostComment>();
        for (const item of list) {
          const id = item.id || `comment-${map.size}`;
          const existing = this.memoryComments.find(c => c.id === id) || INITIAL_POST_COMMENTS.find(c => c.id === id);
          map.set(id, existing ? { ...existing, ...item, id } : { ...item, id });
        }
        for (const mem of this.memoryComments) {
          if (mem.id && !map.has(mem.id)) {
            map.set(mem.id, mem);
          }
        }
        for (const seed of INITIAL_POST_COMMENTS) {
          if (!map.has(seed.id)) {
            map.set(seed.id, seed);
          }
        }
        const merged = Array.from(map.values()).sort((a, b) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
        this.memoryComments = merged;
        setLocalItem('comments', merged);
      }
    } catch {
      // fallback
    }

    const comments = this.memoryComments.filter(c => c.postId === postId);
    if (!includeHidden) {
      return comments.filter(c => !c.isHidden);
    }
    return comments;
  }

  subscribeComments(
    postId: string,
    callback: (comments: PostComment[]) => void,
    includeHidden: boolean = false
  ): () => void {
    if (!this.commentSubscribers.has(postId)) {
      this.commentSubscribers.set(postId, new Set());
    }
    const wrappedCb = (comments: PostComment[]) => {
      const filtered = includeHidden ? comments : comments.filter(c => !c.isHidden);
      callback(filtered);
    };
    this.commentSubscribers.get(postId)!.add(wrappedCb);

    // Initial dispatch from memory
    const initialComments = this.memoryComments.filter(c => c.postId === postId);
    callback(includeHidden ? initialComments : initialComments.filter(c => !c.isHidden));

    this.getComments(postId, includeHidden).then(callback).catch(() => {});

    try {
      const colRef = collection(db, FIRESTORE_COLLECTIONS.POST_COMMENTS);
      const unsub = onSnapshot(colRef, (snap) => {
        const list: PostComment[] = [];
        snap.forEach(d => {
          const data = d.data() as PostComment;
          list.push({ ...data, id: data.id || d.id });
        });
        if (list.length > 0) {
          const map = new Map<string, PostComment>();
          for (const item of list) {
            const id = item.id || `comment-${map.size}`;
            const existing = this.memoryComments.find(c => c.id === id) || INITIAL_POST_COMMENTS.find(c => c.id === id);
            map.set(id, existing ? { ...existing, ...item, id } : { ...item, id });
          }
          for (const mem of this.memoryComments) {
            if (mem.id && !map.has(mem.id)) {
              map.set(mem.id, mem);
            }
          }
          for (const seed of INITIAL_POST_COMMENTS) {
            if (!map.has(seed.id)) {
              map.set(seed.id, seed);
            }
          }
          const merged = Array.from(map.values()).sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          this.memoryComments = merged;
          setLocalItem('comments', merged);
        }
        let postComments = this.memoryComments.filter(c => c.postId === postId);
        if (!includeHidden) {
          postComments = postComments.filter(c => !c.isHidden);
        }
        callback(postComments);
      }, (err) => {
        console.warn('Comments snapshot fallback:', err);
      });

      return () => {
        this.commentSubscribers.get(postId)?.delete(wrappedCb);
        try { unsub(); } catch {}
      };
    } catch {
      return () => {
        this.commentSubscribers.get(postId)?.delete(wrappedCb);
      };
    }
  }

  async addComment(commentData: Omit<PostComment, 'id' | 'createdAt'>): Promise<PostComment> {
    const comment: PostComment = {
      ...commentData,
      id: `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isHidden: false,
      createdAt: new Date().toISOString()
    };

    this.memoryComments = [...this.memoryComments, comment];
    setLocalItem('comments', this.memoryComments);

    // Update post comments count
    const post = this.memoryPosts.find(p => p.id === comment.postId);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      setLocalItem('posts', this.memoryPosts);
      this.notifyPostSubscribers();
      try {
        const postRef = doc(db, FIRESTORE_COLLECTIONS.COMMUNITY_POSTS, post.id);
        // Write the full post to Firestore to preserve all post attributes
        await setDoc(postRef, post);
      } catch (e) {
        // ignore
      }
    }

    this.notifyCommentSubscribers(comment.postId);

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.POST_COMMENTS, comment.id);
      await setDoc(docRef, comment);
    } catch (e) {
      console.warn('Failed saving comment to Firestore:', e);
    }

    return comment;
  }

  // ============================================================
  // ADMIN MODERATION ACTIONS (تحكم الأدمين بالمنشورات والتعليقات وإخفائها)
  // ============================================================

  async adminToggleHidePost(
    postId: string,
    isHidden: boolean,
    reason?: string,
    adminName?: string
  ): Promise<void> {
    const post = this.memoryPosts.find(p => p.id === postId);
    if (post) {
      post.isHidden = isHidden;
      post.hiddenReason = reason || (isHidden ? 'تم إخفاء المنشور بقرار من إدارة المنصة' : undefined);
      post.hiddenAt = isHidden ? new Date().toISOString() : undefined;
      post.hiddenBy = isHidden ? (adminName || 'إدارة المستشفى') : undefined;
      setLocalItem('posts', this.memoryPosts);
      this.notifyPostSubscribers();
    }

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.COMMUNITY_POSTS, postId);
      await setDoc(docRef, {
        isHidden,
        hiddenReason: reason || (isHidden ? 'تم إخفاء المنشور بقرار من إدارة المنصة' : null),
        hiddenAt: isHidden ? new Date().toISOString() : null,
        hiddenBy: isHidden ? (adminName || 'إدارة المستشفى') : null
      }, { merge: true });
    } catch (e) {
      console.warn('Failed updating post moderation in Firestore:', e);
    }
  }

  async adminDeletePost(postId: string): Promise<void> {
    this.memoryPosts = this.memoryPosts.filter(p => p.id !== postId);
    this.memoryComments = this.memoryComments.filter(c => c.postId !== postId);
    setLocalItem('posts', this.memoryPosts);
    setLocalItem('comments', this.memoryComments);
    this.notifyPostSubscribers();

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.COMMUNITY_POSTS, postId);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Failed deleting post in Firestore:', e);
    }
  }

  async adminTogglePinPost(postId: string, isPinned: boolean): Promise<void> {
    const post = this.memoryPosts.find(p => p.id === postId);
    if (post) {
      post.isPinned = isPinned;
      setLocalItem('posts', this.memoryPosts);
      this.notifyPostSubscribers();
    }

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.COMMUNITY_POSTS, postId);
      await setDoc(docRef, { isPinned }, { merge: true });
    } catch (e) {
      console.warn('Failed updating post pin status in Firestore:', e);
    }
  }

  async adminToggleHideComment(commentId: string, isHidden: boolean, reason?: string): Promise<void> {
    const comment = this.memoryComments.find(c => c.id === commentId);
    if (comment) {
      comment.isHidden = isHidden;
      comment.hiddenReason = reason || (isHidden ? 'تم إخفاء التعليق بواسطة الإدارة' : undefined);
      setLocalItem('comments', this.memoryComments);
      this.notifyCommentSubscribers(comment.postId);
    }

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.POST_COMMENTS, commentId);
      await setDoc(docRef, {
        isHidden,
        hiddenReason: reason || (isHidden ? 'تم إخفاء التعليق بواسطة الإدارة' : null)
      }, { merge: true });
    } catch (e) {
      console.warn('Failed updating comment moderation in Firestore:', e);
    }
  }

  async adminDeleteComment(commentId: string): Promise<void> {
    const comment = this.memoryComments.find(c => c.id === commentId);
    const postId = comment?.postId;

    this.memoryComments = this.memoryComments.filter(c => c.id !== commentId);
    setLocalItem('comments', this.memoryComments);

    if (postId) {
      const post = this.memoryPosts.find(p => p.id === postId);
      if (post && post.commentsCount > 0) {
        post.commentsCount -= 1;
        setLocalItem('posts', this.memoryPosts);
        this.notifyPostSubscribers();
      }
      this.notifyCommentSubscribers(postId);
    }

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.POST_COMMENTS, commentId);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Failed deleting comment in Firestore:', e);
    }
  }
}

export const pointsAndCommunityService = new PointsAndCommunityService();
