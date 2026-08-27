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
    email: 'alhasann2023@gmail.com',
    phone: '+966500001122',
    fullName: 'المدير العام والمسؤول المعتمد',
    role: 'HOSPITAL_ADMIN',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'usr-doc-1',
    email: 'dr.faisal@medicalcarehub.com',
    phone: '+966501234567',
    fullName: 'د. فيصل العتيبي',
    role: 'DOCTOR',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-doc-2',
    email: 'dr.mona@medicalcarehub.com',
    phone: '+966502345678',
    fullName: 'د. منى الغامدي',
    role: 'DOCTOR',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-doc-3',
    email: 'dr.tariq@medicalcarehub.com',
    phone: '+966503456789',
    fullName: 'د. طارق الشهري',
    role: 'DOCTOR',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-doc-4',
    email: 'dr.reem@medicalcarehub.com',
    phone: '+966504567890',
    fullName: 'د. ريم الحربي',
    role: 'DOCTOR',
    avatar: 'https://images.unsplash.com/photo-1594824813590-78929e7943d0?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-cs-1',
    email: 'staff@medicalcarehub.com',
    phone: '+966507778899',
    fullName: 'نورة السعيد',
    role: 'CUSTOMER_SERVICE',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-pat-1',
    email: 'sarah.mansoor@example.com',
    phone: '+966501112233',
    fullName: 'سارة خالد المنصور',
    role: 'PATIENT',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    userId: 'usr-pat-1',
    mrn: 'MRN-2026-8801',
    fullName: 'سارة خالد المنصور',
    phone: '+966501112233',
    email: 'sarah.mansoor@example.com',
    nationalId: '1088776655',
    birthDate: '1992-05-14',
    gender: 'FEMALE',
    bloodType: 'A+',
    allergies: ['البنسلين'],
    chronicDiseases: ['حساسية موسمية'],
    address: 'الرياض، حي النخيل',
    emergencyContact: {
      name: 'خالد المنصور',
      phone: '+966509998877',
      relation: 'والد'
    },
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_SPECIALTIES: Specialty[] = [
  {
    id: 'spec-cardio',
    nameAr: 'أمراض القلب والأوعية الدموية',
    nameEn: 'Cardiology & Vascular Medicine',
    descriptionAr: 'تشخيص وعلاج اضطرابات القلب، ضغط الدم، تخطيط القلب وقسطرة الشرايين.',
    descriptionEn: 'Diagnosis and management of cardiac disorders, hypertension, ECG and catheterization.',
    iconName: 'HeartPulse',
    code: 'CARD'
  },
  {
    id: 'spec-internal',
    nameAr: 'الطب الباطني والغدد الصماء',
    nameEn: 'Internal Medicine & Endocrinology',
    descriptionAr: 'رعاية شاملة للأمراض المزمنة، داء السكري، اضطرابات الغدة والتمثيل الغذائي.',
    descriptionEn: 'Comprehensive care for chronic diseases, diabetes, thyroid and metabolic disorders.',
    iconName: 'Activity',
    code: 'INTM'
  },
  {
    id: 'spec-ortho',
    nameAr: 'جراحة العظام والمفاصل والعمود الفقري',
    nameEn: 'Orthopedics & Joint Surgery',
    descriptionAr: 'علاج آلام المفاصل، خشونة الركبة، الإصابات الرياضية، وعلاج العمود الفقري.',
    descriptionEn: 'Treatment of joint pain, sports injuries, knee arthrosis, and spine disorders.',
    iconName: 'Bone',
    code: 'ORTH'
  },
  {
    id: 'spec-peds',
    nameAr: 'طب الأطفال والنمو وحديثي الولادة',
    nameEn: 'Pediatrics & Neonatology',
    descriptionAr: 'رعاية صحة الطفل، متابعة مراحل النمو والتطعيمات، والأمراض التنفسية عند الأطفال.',
    descriptionEn: 'Child wellness, growth milestones, vaccinations, and pediatric care.',
    iconName: 'Baby',
    code: 'PEDS'
  },
  {
    id: 'spec-derma',
    nameAr: 'الجلدية والليزر والتجميل الطبي',
    nameEn: 'Dermatology & Medical Cosmetology',
    descriptionAr: 'علاج الأمراض الجلدية المزمنة، حب الشباب، الأكزيما، والتقنيات العلاجية الحديثة.',
    descriptionEn: 'Management of skin conditions, acne, eczema, and advanced dermatological laser.',
    iconName: 'Sparkles',
    code: 'DERM'
  },
  {
    id: 'spec-neuro',
    nameAr: 'المخ والأعصاب والاضطرابات الحركية',
    nameEn: 'Neurology & Motor Disorders',
    descriptionAr: 'تشخيص الصداع النصفي، اضطرابات النوم، التصلب المتعدد، واعتلالات الأعصاب.',
    descriptionEn: 'Diagnosis of migraine, sleep disorders, multiple sclerosis, and neuropathies.',
    iconName: 'Brain',
    code: 'NEUR'
  }
];

export const INITIAL_SERVICES: MedicalService[] = [
  {
    id: 'srv-1',
    specialtyId: 'spec-cardio',
    nameAr: 'كشف استشاري قلب مع تخطيط قلب كهربائي (ECG)',
    nameEn: 'Cardiology Consultation + Resting ECG',
    descriptionAr: 'فحص سريري شامل لعضلة القلب والشرايين مع فحص تخطيط القلب المباشر.',
    descriptionEn: 'Comprehensive clinical examination with a resting 12-lead ECG.',
    price: 350,
    durationMinutes: 30,
    isActive: true
  },
  {
    id: 'srv-2',
    specialtyId: 'spec-cardio',
    nameAr: 'فحص إيكو للقلب بالموجات الصوتية (Echocardiogram)',
    nameEn: 'Echocardiogram Diagnostic Imaging',
    descriptionAr: 'تصوير دقيق لصمامات القلب وعضلة القلب وقياس كفاءة الضخ.',
    descriptionEn: 'High-resolution ultrasound imaging of heart valves and cardiac ejection fraction.',
    price: 600,
    durationMinutes: 45,
    isActive: true
  },
  {
    id: 'srv-3',
    specialtyId: 'spec-internal',
    nameAr: 'كشف باطني شامل مع متابعة السكري وضغط الدم',
    nameEn: 'Internal Medicine Comprehensive Follow-up',
    descriptionAr: 'معاينة متخصصة لضبط مستويات السكر في الدم وضبط أدوية الضغط.',
    descriptionEn: 'Detailed metabolic and glycemic balance review and therapy adjustment.',
    price: 250,
    durationMinutes: 25,
    isActive: true
  },
  {
    id: 'srv-4',
    specialtyId: 'spec-ortho',
    nameAr: 'استشارة عظام ومفاصل وفحص الإصابات الحركية',
    nameEn: 'Orthopedic & Joint Consultation',
    descriptionAr: 'فحص سريري متكامل للمفاصل والأربطة مع تقييم درجات الحركة والألم.',
    descriptionEn: 'Full musculoskeletal and joint evaluation with mobility assessment.',
    price: 300,
    durationMinutes: 30,
    isActive: true
  },
  {
    id: 'srv-5',
    specialtyId: 'spec-peds',
    nameAr: 'فحص نمو وصحة الطفل واستشارة طب الأطفال',
    nameEn: 'Pediatric Health & Growth Examination',
    descriptionAr: 'تقييم معايير النمو والوزن والتطور الحركي للأطفال مع فحص العلامات الحيوية.',
    descriptionEn: 'Comprehensive developmental growth milestones check and physical exam.',
    price: 220,
    durationMinutes: 25,
    isActive: true
  },
  {
    id: 'srv-6',
    specialtyId: 'spec-derma',
    nameAr: 'كشف جلدية وفحص البشرة المتقدم',
    nameEn: 'Dermatological Consultation & Skin Scan',
    descriptionAr: 'تشخيص دقيق لمشاكل البشرة والشعر والحساسية الجلدية بأجهزة فحص الجلد.',
    descriptionEn: 'Skin, hair and dermatosis clinical evaluation with dermoscopy.',
    price: 280,
    durationMinutes: 20,
    isActive: true
  },
  {
    id: 'srv-7',
    specialtyId: 'spec-neuro',
    nameAr: 'كشف مخ وأعصاب واستشارة متخصصة',
    nameEn: 'Neurology Consultation',
    descriptionAr: 'تقييم المنعكسات العصبية، التوازن، الصداع النصفي والاضطرابات العصبية.',
    descriptionEn: 'Assessment of neurological reflexes, motor pathways, headache and neuropathy.',
    price: 380,
    durationMinutes: 35,
    isActive: true
  }
];

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    userId: 'usr-doc-1',
    fullName: 'د. فيصل العتيبي',
    email: 'dr.faisal@medicalcarehub.com',
    phone: '+966501234567',
    specialtyId: 'spec-cardio',
    specialtyNameAr: 'أمراض القلب والأوعية الدموية',
    specialtyNameEn: 'Cardiology & Vascular Medicine',
    title: 'استشاري أول أمراض وقسطرة القلب',
    qualifications: ['البورد الأمريكي في أمراض القلب', 'زمالة الكلية الملكية للأطباء'],
    experienceYears: 16,
    bioAr: 'استشاري أول لأمراض القلب، خبير في فحوصات القلب الدقيقة وقسطرة وتخطيط صمامات القلب.',
    bioEn: 'Senior Consultant Cardiologist with over 16 years of expertise in clinical cardiology.',
    consultationFee: 350,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
    roomNumber: 'عيادة 201 - جناح القلب',
    rating: 4.9,
    reviewsCount: 142,
    availableDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء'],
    availableHours: '09:00 ص - 03:30 م',
    isActive: true
  },
  {
    id: 'doc-2',
    userId: 'usr-doc-2',
    fullName: 'د. منى الغامدي',
    email: 'dr.mona@medicalcarehub.com',
    phone: '+966502345678',
    specialtyId: 'spec-internal',
    specialtyNameAr: 'الطب الباطني والغدد الصماء',
    specialtyNameEn: 'Internal Medicine & Endocrinology',
    title: 'استشارية الباطنية والسكري والغدد الصماء',
    qualifications: ['البورد السعودي في الطب الباطني', 'زمالة جامعة تورنتو في الغدد والسكري'],
    experienceYears: 13,
    bioAr: 'متخصصة في علاج وضبط داء السكري واعتلالات الغدة الدرقية وضغط الدم المزمن.',
    bioEn: 'Specialist in metabolic health, diabetes management, and chronic endocrine conditions.',
    consultationFee: 300,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
    roomNumber: 'عيادة 104 - العيادات الباطنية',
    rating: 4.8,
    reviewsCount: 98,
    availableDays: ['الإثنين', 'الثلاثاء', 'الخميس'],
    availableHours: '10:00 ص - 04:00 م',
    isActive: true
  },
  {
    id: 'doc-3',
    userId: 'usr-doc-3',
    fullName: 'د. طارق الشهري',
    email: 'dr.tariq@medicalcarehub.com',
    phone: '+966503456789',
    specialtyId: 'spec-ortho',
    specialtyNameAr: 'جراحة العظام والمفاصل والعمود الفقري',
    specialtyNameEn: 'Orthopedics & Joint Surgery',
    title: 'استشاري جراحة العظام والمفاصل والطب الرياضي',
    qualifications: ['الزمالة البريطانية لجراحة العظام FRCS', 'دبلوم الطب الرياضي وإصابات الملاعب'],
    experienceYears: 15,
    bioAr: 'خبير في جراحات استبدال المفاصل، علاج خشونة الركبة، والإصابات الرياضية الحركية.',
    bioEn: 'Leading orthopedic surgeon specializing in joint replacement and sports trauma.',
    consultationFee: 320,
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80',
    roomNumber: 'عيادة 302 - قسم العظام',
    rating: 4.9,
    reviewsCount: 167,
    availableDays: ['الأحد', 'الثلاثاء', 'الأربعاء'],
    availableHours: '09:30 ص - 03:00 م',
    isActive: true
  },
  {
    id: 'doc-4',
    userId: 'usr-doc-4',
    fullName: 'د. ريم الحربي',
    email: 'dr.reem@medicalcarehub.com',
    phone: '+966504567890',
    specialtyId: 'spec-peds',
    specialtyNameAr: 'طب الأطفال والنمو وحديثي الولادة',
    specialtyNameEn: 'Pediatrics & Neonatology',
    title: 'استشارية طب الأطفال والتغذية العلاجية',
    qualifications: ['البورد العربي في طب الأطفال', 'شهادة الرعاية الحرجة لحديثي الولادة'],
    experienceYears: 11,
    bioAr: 'رعاية صحة ونمو الطفل، علاج الحساسية التنفسية، وجداول التطعيمات المتكاملة.',
    bioEn: 'Compassionate pediatric care focusing on growth milestones and respiratory health.',
    consultationFee: 250,
    avatar: 'https://images.unsplash.com/photo-1594824813590-78929e7943d0?w=200&auto=format&fit=crop&q=80',
    roomNumber: 'عيادة 101 - عيادة الأطفال',
    rating: 5.0,
    reviewsCount: 210,
    availableDays: ['الأحد', 'الإثنين', 'الأربعاء', 'الخميس'],
    availableHours: '08:30 ص - 02:30 م',
    isActive: true
  }
];

export const INITIAL_STAFF: Staff[] = [
  {
    id: 'stf-1',
    userId: 'usr-cs-1',
    fullName: 'نورة السعيد',
    phone: '+966507778899',
    email: 'staff@medicalcarehub.com',
    department: 'مركز تنسيق المواعيد وخدمة العملاء',
    roleTitle: 'منسق خدمة عملاء أول',
    shift: 'MORNING',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-2026-001',
    paymentId: 'pay-2026-001',
    patientId: 'pat-1',
    patientName: 'سارة خالد المنصور',
    patientPhone: '+966501112233',
    patientMrn: 'MRN-2026-8801',
    serviceType: 'APPOINTMENT_BOOKING',
    appointmentId: 'apt-2026-101',
    doctorId: 'doc-1',
    doctorName: 'د. فيصل العتيبي',
    doctorSpecialty: 'أمراض القلب والأوعية الدموية',
    serviceId: 'srv-1',
    serviceName: 'كشف استشاري قلب مع تخطيط قلب كهربائي (ECG)',
    amount: 350,
    currency: 'SAR',
    paymentMethod: 'MADA',
    paymentStatus: 'PAYMENT_SUCCESS',
    status: 'PAYMENT_SUCCESS',
    transactionReference: 'TXN-MADA-8849201',
    gatewayTransactionId: 'gw_tx_77392819',
    gatewayProvider: 'Saudi Payments (Mada Gateway)',
    receiptUrl: 'https://medicalcarehub.com/receipts/pay-2026-001.pdf',
    createdAt: '2026-08-25T10:00:00Z',
    confirmedAt: '2026-08-25T10:02:15Z'
  },
  {
    id: 'pay-2026-002',
    paymentId: 'pay-2026-002',
    patientId: 'pat-1',
    patientName: 'سارة خالد المنصور',
    patientPhone: '+966501112233',
    patientMrn: 'MRN-2026-8801',
    serviceType: 'MEDICAL_CONSULTATION',
    consultationId: 'cns-2026-201',
    doctorId: 'doc-2',
    doctorName: 'د. منى الغامدي',
    doctorSpecialty: 'الطب الباطني والغدد الصماء',
    serviceName: 'استشارة طبية باطنية وسكري عن بُعد',
    amount: 300,
    currency: 'SAR',
    paymentMethod: 'APPLE_PAY',
    paymentStatus: 'PAYMENT_SUCCESS',
    status: 'PAYMENT_SUCCESS',
    transactionReference: 'TXN-APAY-9938210',
    gatewayTransactionId: 'gw_tx_88192301',
    gatewayProvider: 'Apple Pay Gateway',
    receiptUrl: 'https://medicalcarehub.com/receipts/pay-2026-002.pdf',
    createdAt: '2026-08-25T14:30:00Z',
    confirmedAt: '2026-08-25T14:31:05Z'
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-2026-101',
    patientId: 'pat-1',
    patientName: 'سارة خالد المنصور',
    patientPhone: '+966501112233',
    patientMrn: 'MRN-2026-8801',
    doctorId: 'doc-1',
    doctorName: 'د. فيصل العتيبي',
    doctorSpecialty: 'أمراض القلب والأوعية الدموية',
    serviceId: 'srv-1',
    serviceName: 'كشف استشاري قلب مع تخطيط قلب كهربائي (ECG)',
    preferredDate: '2026-08-28',
    preferredPeriod: 'MORNING',
    confirmedDate: '2026-08-28',
    confirmedTime: '10:30 ص',
    clinicRoom: 'عيادة 201 - جناح القلب',
    reason: 'متابعة نوبات خفقان خفيفة وفحص سنوي شامل',
    status: 'CONFIRMED',
    paymentId: 'pay-2026-001',
    paymentStatus: 'PAYMENT_SUCCESS',
    paymentAmount: 350,
    currency: 'SAR',
    paymentMethod: 'MADA',
    transactionReference: 'TXN-MADA-8849201',
    coordinatorNotes: 'تم تأكيد الموعد وتنسيق التوقيت الصباحي مع المريضة.',
    patientNotes: 'يفضل الفترة الصباحية الأولى.',
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-08-25T10:30:00Z',
    confirmedAt: '2026-08-25T10:30:00Z'
  },
  {
    id: 'apt-2026-102',
    patientId: 'pat-1',
    patientName: 'سارة خالد المنصور',
    patientPhone: '+966501112233',
    patientMrn: 'MRN-2026-8801',
    doctorId: 'doc-3',
    doctorName: 'د. طارق الشهري',
    doctorSpecialty: 'جراحة العظام والمفاصل والعمود الفقري',
    serviceId: 'srv-4',
    serviceName: 'استشارة عظام ومفاصل وفحص الإصابات الحركية',
    preferredDate: '2026-08-30',
    preferredPeriod: 'EVENING',
    reason: 'ألم مفصل الركبة بعد التمارين الرياضية',
    status: 'PENDING',
    paymentId: 'pay-2026-003',
    paymentStatus: 'PAYMENT_SUCCESS',
    paymentAmount: 320,
    currency: 'SAR',
    paymentMethod: 'CREDIT_CARD',
    transactionReference: 'TXN-CC-7711209',
    coordinatorNotes: 'مدفوع وبانتظار اتصال خدمة العملاء لتثبيت الوقت.',
    patientNotes: 'أرجو تثبيت الموعد بعد الساعة 5 مساءً.',
    createdAt: '2026-08-26T08:00:00Z',
    updatedAt: '2026-08-26T08:05:00Z'
  }
];

export const INITIAL_CONSULTATIONS: Consultation[] = [
  {
    id: 'cns-2026-201',
    patientId: 'pat-1',
    patientName: 'سارة خالد المنصور',
    patientPhone: '+966501112233',
    patientMrn: 'MRN-2026-8801',
    patientAge: 32,
    patientGender: 'FEMALE',
    doctorId: 'doc-2',
    doctorName: 'د. منى الغامدي',
    doctorSpecialty: 'الطب الباطني والغدد الصماء',
    title: 'استشارة ضبط جرعة الغدة الدرقية ونتائج التحليل',
    problemDescription: 'أشعر بخمول طفيف وقمت بعمل تحليل TSH وكانت النتيجة 4.8، هل أحتاج لتعديل جرعة الثيروكسين الحالية 50 مكجم؟',
    symptoms: ['خمول طفيف', 'جفاف بسيط في الجلد'],
    duration: 'منذ أسبوعين',
    status: 'ANSWERED',
    consultationFee: 300,
    currency: 'SAR',
    paymentId: 'pay-2026-002',
    paymentStatus: 'PAYMENT_SUCCESS',
    paymentMethod: 'APPLE_PAY',
    transactionReference: 'TXN-APAY-9938210',
    doctorAdvice: 'أهلاً بكِ سارة. بعد مراجعة معدل TSH البالغ 4.8، ننصح برفع الجرعة تدريجياً إلى 75 مكجم 5 أيام في الأسبوع مع الاستمرار على 50 مكجم ليومين، وإعادة التحليل بعد 6 أسابيع.',
    doctorNotes: 'مريضة ملتزمة، تم إعطاء التوصية العلاجية مع جدولة متابعة بعد 6 أسابيع.',
    treatmentPlan: 'تعديل جرعة التروكسين وإجراء فحص TSH و FT4 الدوري.',
    suggestedAction: 'تعديل الجرعة وإجراء تحليل دوري.',
    requireInPersonVisit: false,
    attachments: [],
    messages: [
      {
        id: 'msg-1',
        consultationId: 'cns-2026-201',
        senderId: 'usr-pat-1',
        senderName: 'سارة خالد المنصور',
        senderRole: 'PATIENT',
        message: 'أشعر بخمول طفيف وقمت بعمل تحليل TSH وكانت النتيجة 4.8، هل أحتاج لتعديل جرعة الثيروكسين الحالية 50 مكجم؟',
        createdAt: '2026-08-25T14:30:00Z'
      },
      {
        id: 'msg-2',
        consultationId: 'cns-2026-201',
        senderId: 'usr-doc-2',
        senderName: 'د. منى الغامدي',
        senderRole: 'DOCTOR',
        message: 'أهلاً بكِ سارة. بعد مراجعة معدل TSH البالغ 4.8، ننصح برفع الجرعة تدريجياً إلى 75 مكجم وإعادة التحليل بعد 6 أسابيع.',
        createdAt: '2026-08-25T16:00:00Z'
      }
    ],
    createdAt: '2026-08-25T14:30:00Z',
    answeredAt: '2026-08-25T16:00:00Z',
    updatedAt: '2026-08-25T16:00:00Z'
  }
];

export const INITIAL_FOLLOW_UPS: FollowUpAppointment[] = [
  {
    id: 'flw-2026-001',
    followUpId: 'flw-2026-001',
    patientId: 'pat-1',
    patientName: 'سارة خالد المنصور',
    patientPhone: '+966501112233',
    patientMrn: 'MRN-2026-8801',
    doctorId: 'doc-2',
    doctorName: 'د. منى الغامدي',
    doctorSpecialty: 'الطب الباطني والغدد الصماء',
    originalConsultationId: 'cns-2026-201',
    followUpDate: '2026-09-25',
    followUpTime: '11:00 ص',
    reason: 'متابعة نتائج تحليل وظائف الغدة TSH بعد تعديل الجرعة',
    notes: 'إحضار نتائج التحاليل المخبرية الجديدة قبل الحضور.',
    status: 'SCHEDULED',
    reminderSettings: {
      days30: true,
      days7: true,
      hours24: true,
      hours2: true,
      minutes30: true
    },
    createdAt: '2026-08-25T16:00:00Z'
  }
];

export const INITIAL_REFUNDS: Refund[] = [];

export const INITIAL_REMINDERS: ReminderSchedule[] = [
  {
    id: 'rem-1',
    appointmentId: 'apt-2026-101',
    patientId: 'pat-1',
    patientPhone: '+966501112233',
    doctorId: 'doc-1',
    targetDateTime: '2026-08-28T10:30:00Z',
    title: 'تذكير بموعد عيادة القلب',
    message: 'تذكير بموعدك مع د. فيصل العتيبي يوم 28 أغسطس الساعة 10:30 ص في عيادة 201.',
    offsetsMinutes: [1440, 120, 30],
    sentOffsets: [],
    channels: ['IN_APP', 'SMS', 'EMAIL'],
    status: 'ACTIVE',
    createdAt: '2026-08-25T10:30:00Z'
  }
];

export const INITIAL_EXAMINATIONS: MedicalExamination[] = [];

export const INITIAL_TESTS: MedicalTest[] = [];

export const INITIAL_REPORTS: MedicalReport[] = [];

export const INITIAL_PRESCRIPTIONS: Prescription[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    userId: 'usr-pat-1',
    title: 'تم استلام دفعتك بنجاح',
    message: 'تم استلام دفعة 350 ر.س لرسوم حجز موعد عيادة القلب (مرجع TXN-MADA-8849201). جاري التنسيق مع خدمة العملاء.',
    type: 'PAYMENT',
    referenceId: 'pay-2026-001',
    amount: 350,
    currency: 'SAR',
    transactionReference: 'TXN-MADA-8849201',
    isRead: false,
    createdAt: '2026-08-25T10:02:15Z'
  },
  {
    id: 'notif-2',
    userId: 'usr-pat-1',
    title: 'تم تأكيد موعدك الطبي!',
    message: 'تم تأكيد موعدك مع د. فيصل العتيبي يوم 2026-08-28 الساعة 10:30 ص في عيادة 201 - جناح القلب.',
    type: 'APPOINTMENT',
    referenceId: 'apt-2026-101',
    isRead: false,
    createdAt: '2026-08-25T10:30:00Z'
  },
  {
    id: 'notif-3',
    userId: 'usr-pat-1',
    title: 'حدد الطبيب موعد المراجعة القادم',
    message: 'حددت د. منى الغامدي موعد المراجعة القادم في 25 سبتمبر 2026 الساعة 11:00 ص لمتابعة نتائج التحاليل.',
    type: 'FOLLOW_UP',
    referenceId: 'flw-2026-001',
    isRead: false,
    createdAt: '2026-08-25T16:00:00Z'
  },
  {
    id: 'notif-4',
    userId: 'usr-cs-1',
    title: 'تم دفع رسوم حجز جديدة',
    message: 'قام المريض سارة خالد المنصور بدفع رسوم حجز عيادة العظام (320 ر.س) - بانتظار تأكيد وتنسيق الموعد.',
    type: 'PAYMENT',
    referenceId: 'apt-2026-102',
    amount: 320,
    currency: 'SAR',
    transactionReference: 'TXN-CC-7711209',
    isRead: false,
    createdAt: '2026-08-26T08:05:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    userId: 'usr-pat-1',
    userName: 'سارة خالد المنصور',
    userRole: 'PATIENT',
    action: 'PAYMENT_COMPLETED',
    entityType: 'PAYMENT',
    entityId: 'pay-2026-001',
    details: 'إتمام دفع رسوم حجز الموعد بقيمة 350 ر.س عبر بوابة مدى',
    ipAddress: '192.168.1.1',
    timestamp: '2026-08-25T10:02:15Z',
    createdAt: '2026-08-25T10:02:15Z'
  },
  {
    id: 'aud-2',
    userId: 'usr-cs-1',
    userName: 'نورة السعيد',
    userRole: 'CUSTOMER_SERVICE',
    action: 'CONFIRM_APPOINTMENT',
    entityType: 'APPOINTMENT',
    entityId: 'apt-2026-101',
    details: 'تأكيد الموعد الطبي للمريض سارة خالد المنصور بعد التحقق من دفع الرسوم',
    ipAddress: '192.168.1.5',
    timestamp: '2026-08-25T10:30:00Z',
    createdAt: '2026-08-25T10:30:00Z'
  }
];

