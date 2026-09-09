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




  
];

export const INITIAL_PATIENTS: Patient[] = [
  
];

export const INITIAL_SPECIALTIES: Specialty[] = [
  
];

export const INITIAL_SERVICES: MedicalService[] = [
  
];

export const INITIAL_DOCTORS: Doctor[] = [

  
];

export const INITIAL_STAFF: Staff[] = [

];

export const INITIAL_PAYMENTS: Payment[] = [
  
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

