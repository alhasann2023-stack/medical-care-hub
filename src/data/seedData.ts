import {
  User,
  Patient,
  Doctor,
  Staff,
  Specialty,
  MedicalService,
  Appointment,
  Consultation,
  Payment,
  FollowUpAppointment,
  Refund,
  ReminderSchedule,
  MedicalExamination,
  MedicalTest,
  MedicalReport,
  Prescription,
  AppNotification,
  AuditLog
} from '../types/medical';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@medicalcarehub.com',
    phone: '776458925',
    fullName: 'المدير العام (الإدارة العليا)',
    role: 'HOSPITAL_ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T10:00:00Z'
  },
  {
    id: 'usr-doc-1',
    email: 'dr.alkubsi@medicalcarehub.com',
    phone: '771122331',
    fullName: 'د. أحمد الكبسي',
    role: 'DOCTOR',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T09:00:00Z'
  },
  {
    id: 'usr-doc-2',
    email: 'dr.alyafei@medicalcarehub.com',
    phone: '771122332',
    fullName: 'د. منى اليافعي',
    role: 'DOCTOR',
    avatar: 'https://images.unsplash.com/photo-1594824813576-6351d451b682?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T09:15:00Z'
  },
  {
    id: 'usr-doc-3',
    email: 'dr.subaie@medicalcarehub.com',
    phone: '771122333',
    fullName: 'د. عبد العزيز السبيعي',
    role: 'DOCTOR',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T09:30:00Z'
  },
  {
    id: 'usr-doc-4',
    email: 'dr.reem@medicalcarehub.com',
    phone: '771122334',
    fullName: 'د. ريم القحطاني',
    role: 'DOCTOR',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T09:45:00Z'
  },
  {
    id: 'usr-sec-1',
    email: 'secretary@medicalcarehub.com',
    phone: '772233441',
    fullName: 'أ. سارة أحمد - سكرتارية واستقبال',
    role: 'SECRETARY',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T08:30:00Z'
  },
  {
    id: 'usr-cs-1',
    email: 'cs@medicalcarehub.com',
    phone: '772233442',
    fullName: 'منسق خدمة العملاء والرعاية',
    role: 'CUSTOMER_SERVICE',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T08:45:00Z'
  },
  {
    id: 'usr-lab-1',
    email: 'lab@medicalcarehub.com',
    phone: '772233443',
    fullName: 'أ. رامي المنصوري - فني وأخصائي المختبر',
    role: 'LAB_TECHNICIAN',
    avatar: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T08:00:00Z'
  },
  {
    id: 'usr-pat-1',
    email: 'patient@medicalcarehub.com',
    phone: '+966501112233',
    fullName: 'أحمد صالح محمد',
    role: 'PATIENT',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: '2026-01-01T08:00:00Z',
    lastLoginAt: '2026-02-28T10:30:00Z'
  }
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    userId: 'usr-pat-1',
    fullName: 'أحمد صالح محمد',
    phone: '+966501112233',
    mrn: 'MRN-2026-8801',
    email: 'patient@medicalcarehub.com',
    birthDate: '1992-05-14',
    gender: 'MALE',
    bloodType: 'O+',
    emergencyContact: {
      name: 'صالح محمد (الوالد)',
      relation: 'والد',
      phone: '+966509998877'
    },
    address: 'صنعاء - شارع الستين الغربي',
    allergies: ['لا توجد حساسية دوائية مسجلة'],
    chronicDiseases: [],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z'
  }
];

export const INITIAL_SPECIALTIES: Specialty[] = [
  {
    id: 'spec-internal',
    nameAr: 'أمراض الباطنية والجهاز الهضمي',
    nameEn: 'Internal Medicine & Gastroenterology',
    descriptionAr: 'تشخيص وعلاج أمراض الباطنة العامة، أمراض الجهاز الهضمي، الكبد، والمناظير الهضمية.',
    descriptionEn: 'Diagnosis and treatment of general internal diseases, digestive system, and liver.',
    iconName: 'Activity',
    code: 'INT-MED'
  },
  {
    id: 'spec-cardio',
    nameAr: 'أمراض القلب والأوعية الدموية',
    nameEn: 'Cardiology & Vascular',
    descriptionAr: 'علاج اعتلال عضلة القلب، الشرايين التاجية، ارتفاع ضغط الدم، والقسطرة التشخيصية والعلاجية.',
    descriptionEn: 'Treatment of heart conditions, coronary arteries, hypertension, and catheterization.',
    iconName: 'Heart',
    code: 'CARD'
  },
  {
    id: 'spec-ortho',
    nameAr: 'طب وجراحة العظام والمفاصل',
    nameEn: 'Orthopedics & Joint Surgery',
    descriptionAr: 'جراحة العظام، استبدال المفاصل، علاج الكسور، وإصابات الملاعب الرياضية بالمنظار.',
    descriptionEn: 'Orthopedic surgery, joint replacement, fracture management, and sports injuries.',
    iconName: 'Bone',
    code: 'ORTH'
  },
  {
    id: 'spec-pediatrics',
    nameAr: 'طب الأطفال وحديثي الولادة',
    nameEn: 'Pediatrics & Neonatology',
    descriptionAr: 'رعاية صحة المواليد، متابعة مراحل النمو والتطور الحركي، وتطعيمات وعلاج أمراض الطفولة.',
    descriptionEn: 'Newborn care, developmental monitoring, vaccinations, and pediatric medicine.',
    iconName: 'Baby',
    code: 'PED'
  }
];

export const INITIAL_SERVICES: MedicalService[] = [
  {
    id: 'srv-1',
    specialtyId: 'spec-internal',
    nameAr: 'كشف استشاري حضوري بالعيادة',
    nameEn: 'In-Clinic Consultant Examination',
    descriptionAr: 'فحص سريري شامل لدى الطبيب الاستشاري مع مراجعة السجل المرضي وقياس المؤشرات الحيوية.',
    descriptionEn: 'Comprehensive physical examination by the consultant.',
    price: 300,
    multiCurrencyPricing: { YER: 300, USD: 1.2, SAR: 4.5 },
    durationMinutes: 30,
    category: 'CONSULTATION',
    isActive: true
  },
  {
    id: 'srv-2',
    specialtyId: 'spec-internal',
    nameAr: 'استشارة طبية تخصصية عن بُعد',
    nameEn: 'Telehealth Medical Consultation',
    descriptionAr: 'استشارة طبية رقمية فورية مع الاستشاري مع إمكانية إرفاق التقارير والوصفة الطبية.',
    descriptionEn: 'Digital telehealth consultation with prescription review.',
    price: 200,
    multiCurrencyPricing: { YER: 200, USD: 0.8, SAR: 3.0 },
    durationMinutes: 20,
    category: 'TELEHEALTH',
    isActive: true
  },
  {
    id: 'srv-3',
    specialtyId: 'spec-cardio',
    nameAr: 'تخطيط كهربائي للقلب رقمي (ECG)',
    nameEn: 'Digital ECG Test',
    descriptionAr: 'رسم وتخطيط كهربية القلب 12-Lead مع قراءة سريرية معتمدة من استشاري القلب.',
    descriptionEn: '12-lead electrocardiogram with official clinical report.',
    price: 150,
    multiCurrencyPricing: { YER: 150, USD: 0.6, SAR: 2.2 },
    durationMinutes: 15,
    category: 'DIAGNOSTICS',
    isActive: true
  }
];

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    userId: 'usr-doc-1',
    fullName: 'د. أحمد الكبسي',
    email: 'dr.alkubsi@medicalcarehub.com',
    phone: '771122331',
    specialtyId: 'spec-internal',
    specialtyNameAr: 'أمراض الباطنية والجهاز الهضمي',
    specialtyNameEn: 'Internal Medicine & Gastroenterology',
    title: 'استشاري أول',
    qualifications: ['البورد الطبي المعتمد', 'زمالة الكلية الملكية للأمراض الباطنية (MRCP)', 'دبلوم مناظير الجهاز الهضمي المتقدم'],
    experienceYears: 15,
    bioAr: 'استشاري أمراض الباطنية والجهاز الهضمي والمناظير، متخصص في علاج اعتلالات القولون والكبد والأمراض الباطنية المزمنة.',
    bioEn: 'Senior Consultant in Internal Medicine & Gastroenterology with 15+ years of clinical experience.',
    consultationFee: 300,
    multiCurrencyPricing: { YER: 300, USD: 1.2, SAR: 4.5 },
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    roomNumber: 'A-101',
    rating: 4.9,
    reviewsCount: 48,
    availableDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    availableHours: '09:00 ص - 05:00 م',
    isActive: true
  },
  {
    id: 'doc-2',
    userId: 'usr-doc-2',
    fullName: 'د. منى اليافعي',
    email: 'dr.alyafei@medicalcarehub.com',
    phone: '771122332',
    specialtyId: 'spec-cardio',
    specialtyNameAr: 'أمراض القلب والأوعية الدموية',
    specialtyNameEn: 'Cardiology & Vascular',
    title: 'استشارية أولى',
    qualifications: ['البورد الأمريكي في أمراض القلب', 'زمالة القسطرة القلبية التداخلية', 'عضوية جمعية القلب الأوروبية'],
    experienceYears: 12,
    bioAr: 'استشارية طب وجراحة القلب والأوعية الدموية وقسطرة الشرايين التاجية ومتابعة ضغط الدم واعتلال الصمامات.',
    bioEn: 'Senior Consultant Cardiologist and Interventional Catheterization Specialist.',
    consultationFee: 350,
    multiCurrencyPricing: { YER: 350, USD: 1.4, SAR: 5.2 },
    avatar: 'https://images.unsplash.com/photo-1594824813576-6351d451b682?w=150&auto=format&fit=crop&q=80',
    roomNumber: 'B-204',
    rating: 4.9,
    reviewsCount: 36,
    availableDays: ['السبت', 'الإثنين', 'الأربعاء'],
    availableHours: '10:00 ص - 04:00 م',
    isActive: true
  },
  {
    id: 'doc-3',
    userId: 'usr-doc-3',
    fullName: 'د. عبد العزيز السبيعي',
    email: 'dr.subaie@medicalcarehub.com',
    phone: '771122333',
    specialtyId: 'spec-ortho',
    specialtyNameAr: 'طب وجراحة العظام والمفاصل',
    specialtyNameEn: 'Orthopedics & Joint Surgery',
    title: 'استشاري أول',
    qualifications: ['البورد الكندي لجراحة العظام', 'زمالة جراحة المفاصل الصناعية والركبة', 'عضوية الجمعية العالمية للكسور (AO)'],
    experienceYears: 14,
    bioAr: 'استشاري جراحة العظام والمفاصل، متخصص في استبدال المفاصل بالروبوت وعلاج الإصابات الرياضية وترميم الأربطة.',
    bioEn: 'Senior Orthopedic Surgeon specializing in joint arthroplasty and sports injuries.',
    consultationFee: 300,
    multiCurrencyPricing: { YER: 300, USD: 1.2, SAR: 4.5 },
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    roomNumber: 'C-105',
    rating: 4.8,
    reviewsCount: 29,
    availableDays: ['الأحد', 'الثلاثاء', 'الخميس'],
    availableHours: '08:30 ص - 03:30 م',
    isActive: true
  },
  {
    id: 'doc-4',
    userId: 'usr-doc-4',
    fullName: 'د. ريم القحطاني',
    email: 'dr.reem@medicalcarehub.com',
    phone: '771122334',
    specialtyId: 'spec-pediatrics',
    specialtyNameAr: 'طب الأطفال وحديثي الولادة',
    specialtyNameEn: 'Pediatrics & Neonatology',
    title: 'استشارية طب الأطفال',
    qualifications: ['البورد العربي لطب الأطفال', 'دبلوم العناية المركزة لحديثي الولادة (NICU)', 'زمالة تغذية الأطفال السريرية'],
    experienceYears: 11,
    bioAr: 'استشارية طب الأطفال ورعاية حديثي الولادة والمبتسرين ومتابعة مؤشرات النمو السليم والتحسس عند الرضع.',
    bioEn: 'Consultant Pediatrician and Neonatal Intensive Care Specialist.',
    consultationFee: 250,
    multiCurrencyPricing: { YER: 250, USD: 1.0, SAR: 3.7 },
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    roomNumber: 'D-302',
    rating: 5.0,
    reviewsCount: 42,
    availableDays: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء'],
    availableHours: '09:00 ص - 02:00 م',
    isActive: true
  }
];

export const INITIAL_STAFF: Staff[] = [
  {
    id: 'stf-sec-1',
    userId: 'usr-sec-1',
    fullName: 'أ. سارة أحمد - سكرتارية واستقبال',
    phone: '772233441',
    email: 'secretary@medicalcarehub.com',
    department: 'مكتب السكرتاريا والاستقبال العام',
    roleTitle: 'سكرتير طبي واستقبال العيادات',
    shift: 'صباحي (08:00 ص - 04:00 م)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'stf-cs-1',
    userId: 'usr-cs-1',
    fullName: 'منسق خدمة العملاء والرعاية',
    phone: '772233442',
    email: 'cs@medicalcarehub.com',
    department: 'خدمة العملاء والتنسيق الطبي',
    roleTitle: 'منسق رعاية المرضى والمواعيد',
    shift: 'صباحي (08:00 ص - 04:00 م)',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'stf-lab-1',
    userId: 'usr-lab-1',
    fullName: 'أ. رامي المنصوري - فني وأخصائي المختبر',
    phone: '772233443',
    email: 'lab@medicalcarehub.com',
    department: 'قسم المختبر والتحاليل الطبية',
    roleTitle: 'أخصائي وفني مختبر وتحاليل',
    shift: 'صباحي ومسائي (مناوبة)',
    avatar: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=150&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z'
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-101',
    paymentId: 'pay-101',
    receiptNumber: 'REC-2026-10492',
    patientId: 'pat-1',
    patientName: 'أحمد صالح محمد',
    patientPhone: '777123456',
    patientMrn: 'MRN-2026-8801',
    kuraimiAccount: '3055489211',
    serviceType: 'CONSULTATION',
    serviceName: 'استشارة طبية باطنية تخصصية',
    doctorId: 'doc-1',
    doctorName: 'د. أحمد الكبسي',
    doctorSpecialty: 'استشاري أمراض الباطنية والجهاز الهضمي',
    amount: 8000,
    currency: 'YER',
    paymentMethod: 'KURAIMI_EXPRESS',
    paymentProvider: 'KURAIMI',
    status: 'PAID',
    paymentStatus: 'PAID',
    transactionReference: 'TXN-YER-994821',
    paidAt: '2026-03-01T10:30:00Z',
    createdAt: '2026-03-01T10:25:00Z'
  },
  {
    id: 'pay-102',
    paymentId: 'pay-102',
    receiptNumber: 'REC-2026-10493',
    patientId: 'pat-1',
    patientName: 'أحمد صالح محمد',
    patientPhone: '777123456',
    patientMrn: 'MRN-2026-8801',
    kuraimiAccount: '777123456',
    serviceType: 'APPOINTMENT',
    serviceName: 'حجز موعد عيادة القلب والأوعية الدموية',
    doctorId: 'doc-2',
    doctorName: 'د. منى اليافعي',
    doctorSpecialty: 'استشارية طب وجراحة القلب والأوعية الدموية',
    amount: 10000,
    currency: 'YER',
    paymentMethod: 'KURAIMI_EXPRESS',
    paymentProvider: 'KURAIMI',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    transactionReference: 'TXN-YER-994822',
    createdAt: '2026-03-02T11:00:00Z'
  },
  {
    id: 'pay-103',
    paymentId: 'pay-103',
    receiptNumber: 'REC-2026-10494',
    patientId: 'pat-2',
    patientName: 'مريم عبد الله الشامي',
    patientPhone: '770921004',
    kuraimiAccount: '3049182741',
    serviceType: 'CONSULTATION',
    serviceName: 'استشارة عاجلة - أمراض الأطفال',
    doctorId: 'doc-3',
    doctorName: 'د. عبد العزيز السبيعي',
    amount: 7500,
    currency: 'YER',
    paymentMethod: 'MADA',
    paymentProvider: 'MADA',
    status: 'PAID',
    paymentStatus: 'PAID',
    transactionReference: 'TXN-YER-994823',
    paidAt: '2026-03-02T14:15:00Z',
    createdAt: '2026-03-02T14:10:00Z'
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
 
];

export const INITIAL_CONSULTATIONS: Consultation[] = [
 
];

export const INITIAL_FOLLOW_UPS: FollowUpAppointment[] = [
  
];

export const INITIAL_REFUNDS: Refund[] = [];

export const INITIAL_REMINDERS: ReminderSchedule[] = [
  
];

export const INITIAL_EXAMINATIONS: MedicalExamination[] = [
  {
    id: 'exm-101',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    doctorName: 'د. أحمد الكبسي',
    doctorSpecialty: 'استشاري أمراض الباطنية والجهاز الهضمي',
    examinationDate: '2026-02-28',
    examinationType: 'فحص سريري دوري',
    chiefComplaint: 'صداع خفيف مع إجهاد عام بعد الدوام',
    clinicalFindings: 'ضغط الدم مستقر 120/78، النبض 72 ن/د، فحص الصدر والبطن سليم تماماً، لا توجد وذمات.',
    diagnosis: 'إجهاد بدني مؤقت مع توتر عضلي في الرقبة',
    recommendations: 'تنظيم فترات النوم، شرب سوائل بكميات كافية (2.5 لتر يومياً)، وإعادة الفحص بعد شهر.',
    vitalSigns: {
      bloodPressure: '120/78',
      heartRate: 72,
      temperature: 36.8,
      oxygenSaturation: 99,
      weightKg: 74,
      heightCm: 176
    },
    createdAt: '2026-02-28T09:30:00Z'
  },
  {
    id: 'exm-102',
    patientId: 'pat-1',
    doctorId: 'doc-2',
    doctorName: 'د. منى اليافعي',
    doctorSpecialty: 'استشارية طب وجراحة القلب والأوعية الدموية',
    examinationDate: '2026-01-15',
    examinationType: 'متابعة وقائية للقلب والأوعية',
    chiefComplaint: 'فحص دوري سنوي لسلامة عضلة القلب',
    clinicalFindings: 'أصوات القلب طبيعية S1/S2 واضحة، نبض شريان الكعبري منتظم وقوي، لا نفخات قلبية.',
    diagnosis: 'وظائف القلب والصمامات طبيعية وممتازة',
    recommendations: 'ممارسة رياضة المشي السريع 30 دقيقة يومياً 5 أيام أسبوعياً، والحفاظ على حمية قليلة الصوديوم.',
    vitalSigns: {
      bloodPressure: '118/76',
      heartRate: 68,
      temperature: 36.6,
      oxygenSaturation: 99,
      weightKg: 74,
      heightCm: 176
    },
    createdAt: '2026-01-15T11:00:00Z'
  }
];

export const INITIAL_TESTS: MedicalTest[] = [
  {
    id: 'tst-201',
    patientId: 'pat-1',
    patientName: 'أحمد صالح محمد',
    patientMrn: 'MRN-2026-8801',
    doctorId: 'doc-1',
    doctorName: 'د. أحمد الكبسي',
    testName: 'تحليل الدم الشامل (CBC) وسكر الدم الصائم (FBS)',
    category: 'LABORATORY',
    testDate: '2026-02-28',
    status: 'COMPLETED',
    resultsSummary: 'جميع المؤشرات ضمن النطاق الطبيعي: الهيموجلوبين 14.8 g/dL، كريات الدم البيضاء 6.2، السكر الصائم 92 mg/dL.',
    labTechnician: 'أ. سامي الحميري - رئيس المختبر',
    sampleType: 'عينة دم وريدي',
    detailedItems: [
      { parameter: 'Hemoglobin (Hb)', value: '14.8', unit: 'g/dL', referenceRange: '13.5 - 17.5', flag: 'NORMAL' },
      { parameter: 'WBC', value: '6.2', unit: '10^3/µL', referenceRange: '4.5 - 11.0', flag: 'NORMAL' },
      { parameter: 'Platelets', value: '265', unit: '10^3/µL', referenceRange: '150 - 450', flag: 'NORMAL' },
      { parameter: 'Fasting Blood Sugar', value: '92', unit: 'mg/dL', referenceRange: '70 - 100', flag: 'NORMAL' },
      { parameter: 'HbA1c', value: '5.2', unit: '%', referenceRange: '4.0 - 5.6', flag: 'NORMAL' }
    ],
    createdAt: '2026-02-28T10:15:00Z',
    updatedAt: '2026-02-28T14:30:00Z'
  },
  {
    id: 'tst-202',
    patientId: 'pat-1',
    patientName: 'أحمد صالح محمد',
    patientMrn: 'MRN-2026-8801',
    doctorId: 'doc-2',
    doctorName: 'د. منى اليافعي',
    testName: 'تخطيط كهربية القلب الرقمي (ECG 12-Lead)',
    category: 'CARDIOLOGY',
    testDate: '2026-01-15',
    status: 'COMPLETED',
    resultsSummary: 'إيقاع جيبي طبيعي (Normal Sinus Rhythm) بمعدل 70 ن/د، لا توجد علامات إقفار أو اعتلال في التوصيل.',
    labTechnician: 'فني قسطرة وقلب معتمد',
    sampleType: 'فحص كهروفسيولوجي غير غازي',
    detailedItems: [
      { parameter: 'Heart Rate', value: '70', unit: 'bpm', referenceRange: '60 - 100', flag: 'NORMAL' },
      { parameter: 'PR Interval', value: '150', unit: 'ms', referenceRange: '120 - 200', flag: 'NORMAL' },
      { parameter: 'QRS Duration', value: '88', unit: 'ms', referenceRange: '80 - 120', flag: 'NORMAL' },
      { parameter: 'QTc', value: '412', unit: 'ms', referenceRange: '< 450', flag: 'NORMAL' }
    ],
    createdAt: '2026-01-15T11:30:00Z',
    updatedAt: '2026-01-15T12:00:00Z'
  }
];

export const INITIAL_REPORTS: MedicalReport[] = [
  {
    id: 'rep-301',
    reportNumber: 'REP-2026-0891',
    patientId: 'pat-1',
    patientName: 'أحمد صالح محمد',
    patientPhone: '+966501112233',
    patientMrn: 'MRN-2026-8801',
    patientBirthDate: '1992-05-14',
    patientGender: 'MALE',
    doctorId: 'doc-1',
    doctorName: 'د. أحمد الكبسي',
    doctorTitle: 'استشاري ورئيس قسم الأمراض الباطنية',
    doctorSpecialty: 'أمراض الباطنية والجهاز الهضمي',
    reportType: 'CONSULTATION_NOTE',
    title: 'تقرير التقييم الصحي الشامل للمريض',
    summary: 'حالة المريض الصحية مستقرة وممتازة، مؤشرات الدم والوظائف الحيوية طبيعية، وتوصية بالاستمرار على نمط الحياة الصحي.',
    clinicalHistory: 'مريض يبلغ من العمر 34 عاماً، راجع العيادة لإجراء التقييم السنوي الروتيني ومراجعة الفحوصات الدورية.',
    findings: 'فحص سريري كامل خالٍ من أي علامات مرضية حادة أو مزمنة، الضغط والنبض طبيعيان، نتائج تحاليل المختبر متوافقة مع المعايير الدولية السليمة.',
    diagnosis: 'صحة عامة جيدة - لا توجد أمراض مزمنة نشطة.',
    recommendations: 'الاستمرار في النشاط البدني المعتدل، الحفاظ على الترطيب وشرب الماء، وتكرار الفحص الشامل بعد 12 شهراً.',
    reportDate: '2026-02-28',
    hospitalDepartment: 'قسم العيادات التخصصية والباطنية',
    digitalSignature: 'SIG-VERIFIED-MCH-DR-ALKUBATI-2026',
    createdAt: '2026-02-28T15:00:00Z'
  }
];

export const INITIAL_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-401',
    rxNumber: 'RX-2026-1045',
    patientId: 'pat-1',
    patientName: 'أحمد صالح محمد',
    patientMrn: 'MRN-2026-8801',
    doctorId: 'doc-1',
    doctorName: 'د. أحمد الكبسي',
    doctorSpecialty: 'أمراض الباطنية والجهاز الهضمي',
    date: '2026-02-28',
    status: 'ACTIVE',
    diagnosis: 'إجهاد بدني مع نقص طفيف في فيتامين د الوقائي',
    instructions: 'تناول المكمل الغذائي بانتظام مع وجبة الإفطار',
    medications: [
      {
        medicationName: 'Vitamin D3 (Cholecalciferol)',
        strength: '1000 IU',
        form: 'كبسولات جيلاتينية رخوة',
        dosage: 'كبسولة واحدة',
        frequency: 'مرة واحدة يومياً مع وجبة دهنية',
        duration: '60 يوماً',
        instructions: 'تؤخذ صباحاً بعد وجبة الإفطار'
      },
      {
        medicationName: 'Magnesium Glycinate',
        strength: '200 mg',
        form: 'أقراص',
        dosage: 'قرص واحد',
        frequency: 'مرة واحدة مساءً قبل النوم',
        duration: '30 يوماً',
        instructions: 'لتحسين جودة النوم واسترخاء العضلات'
      }
    ],
    createdAt: '2026-02-28T09:45:00Z'
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-101',
    userId: 'usr-admin-1',
    userName: 'المدير العام (الإدارة العليا)',
    userRole: 'HOSPITAL_ADMIN',
    actorName: 'المدير العام (الإدارة العليا)',
    actorRole: 'HOSPITAL_ADMIN',
    action: 'LOGIN',
    entityType: 'AUTH',
    entityId: 'usr-admin-1',
    details: 'تسجيل دخول ناجح إلى لوحة الإدارة العامة والتحكم وحوكمة النظام الطبي.',
    ipAddress: '192.168.1.10',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  },
  {
    id: 'aud-102',
    userId: 'usr-admin-1',
    userName: 'المدير العام (الإدارة العليا)',
    userRole: 'HOSPITAL_ADMIN',
    actorName: 'المدير العام (الإدارة العليا)',
    actorRole: 'HOSPITAL_ADMIN',
    action: 'ADD_STAFF',
    entityType: 'STAFF',
    entityId: 'stf-sec-1',
    details: 'إنشاء وتفعيل حساب سكرتير طبي واستقبال للعيادات وتحديد فترة العمل الصباحية.',
    ipAddress: '192.168.1.10',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'aud-103',
    userId: 'usr-admin-1',
    userName: 'المدير العام (الإدارة العليا)',
    userRole: 'HOSPITAL_ADMIN',
    actorName: 'المدير العام (الإدارة العليا)',
    actorRole: 'HOSPITAL_ADMIN',
    action: 'ADD_STAFF',
    entityType: 'STAFF',
    entityId: 'stf-lab-1',
    details: 'إنشاء وتفعيل حساب أخصائي ومسؤول المختبر والتحاليل الطبية ومنح صلاحية إرسال الفحوصات للأطباء.',
    ipAddress: '192.168.1.10',
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString()
  },
  {
    id: 'aud-104',
    userId: 'usr-lab-1',
    userName: 'أخصائي المختبر والتحاليل',
    userRole: 'LAB_TECHNICIAN',
    actorName: 'أخصائي المختبر والتحاليل',
    actorRole: 'LAB_TECHNICIAN',
    action: 'SEND_LAB_TEST',
    entityType: 'TEST',
    entityId: 'tst-cb-01',
    details: 'إرسال نتائج فحص مخبري شامل (CBC ووظائف كلى) إلى الطبيب المعالج المشرف على موعد المريض.',
    ipAddress: '192.168.1.45',
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString()
  },
  {
    id: 'aud-105',
    userId: 'usr-sec-1',
    userName: 'سكرتير مكتب الاستقبال',
    userRole: 'SECRETARY',
    actorName: 'سكرتير مكتب الاستقبال',
    actorRole: 'SECRETARY',
    action: 'CONFIRM_APPOINTMENT',
    entityType: 'APPOINTMENT',
    entityId: 'apt-901',
    details: 'تأكيد حجز موعد كشف حضوري لدى عيادة الباطنة وإرسال إشعار للمريض واستخراج بطاقة الموعد.',
    ipAddress: '192.168.1.30',
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString()
  },
  {
    id: 'aud-106',
    userId: 'usr-admin-1',
    userName: 'المدير العام (الإدارة العليا)',
    userRole: 'HOSPITAL_ADMIN',
    actorName: 'المدير العام (الإدارة العليا)',
    actorRole: 'HOSPITAL_ADMIN',
    action: 'UPDATE_DOCTOR',
    entityType: 'DOCTOR',
    entityId: 'doc-1',
    details: 'تحديث بيانات واعتماد جدول دوام الاستشاري وتثبيت رسوم الكشف الطبي.',
    ipAddress: '192.168.1.10',
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString()
  },
  {
    id: 'aud-107',
    userId: 'usr-doc-1',
    userName: 'د. عبد العزيز السبيعي',
    userRole: 'DOCTOR',
    actorName: 'د. عبد العزيز السبيعي',
    actorRole: 'DOCTOR',
    action: 'CREATE_PRESCRIPTION',
    entityType: 'PRESCRIPTION',
    entityId: 'rx-2026-08',
    details: 'إصدار وصفة علاجية إلكترونية موثقة وإرسال إشعار الصرف لصيدلية المستشفى.',
    ipAddress: '192.168.1.15',
    timestamp: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 140 * 60 * 1000).toISOString()
  },
  {
    id: 'aud-108',
    userId: 'usr-admin-1',
    userName: 'المدير العام (الإدارة العليا)',
    userRole: 'HOSPITAL_ADMIN',
    actorName: 'المدير العام (الإدارة العليا)',
    actorRole: 'HOSPITAL_ADMIN',
    action: 'SAVE_PROMO',
    entityType: 'SETTINGS',
    entityId: 'promo-free-cns',
    details: 'حفظ وتحديث معايير مبادرة الاستشارات الطبية المجانية وتحديد المدة والشارة الترويجية.',
    ipAddress: '192.168.1.10',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString()
  }
];

