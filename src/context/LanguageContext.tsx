import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  dir: 'rtl' | 'ltr';
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Nav & General
    app_name: 'مركز الرعاية الطبية',
    app_tagline: 'منصة الرعاية الصحية المتكاملة',
    home: 'الرئيسية',
    services: 'الخدمات الطبية',
    doctors: 'الأطباء',
    about: 'عن المركز',
    contact: 'اتصل بنا',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    logout: 'تسجيل الخروج',
    book_appointment: 'احجز موعداً',
    consult_doctor: 'استشر طبيباً',
    my_tests: 'فحوصاتي',
    my_reports: 'تقاريري',
    my_prescriptions: 'أدويتي',
    timeline: 'السجل الزمني الطبي',
    profile: 'الملف الشخصي',
    dashboard: 'لوحة التحكم',
    role_patient: 'مريض',
    role_doctor: 'طبيب',
    role_customer_service: 'خدمة العملاء',
    role_admin: 'إدارة المستشفى',
    switch_role: 'تبديل الدور للتجربة السريعة',
    notifications: 'الإشعارات',
    no_notifications: 'لا توجد إشعارات جديدة',
    mark_all_read: 'تحديد الكل كمقروء',
    search: 'بحث...',
    emergency_warning: 'تنبيه: هذه المنصة مخصصة للرعاية المنتظمة والاستشارات غير الحرجة. في حالات الطوارئ يرجى الاتصال برقم 997 أو التوجه لأقرب قسم طوارئ.',
    
    // Statuses
    status_NEW: 'جديد',
    status_PENDING: 'قيد الانتظار',
    status_CONTACTED: 'تم التواصل',
    status_CONFIRMED: 'مؤكد',
    status_COMPLETED: 'مكتمل',
    status_CANCELLED: 'ملغي',
    status_NO_SHOW: 'لم يحضر',
    status_ANSWERED: 'تم الرد',
    status_CLOSED: 'مغلق',
    status_ORDERED: 'تم الطلب',
    status_IN_PROGRESS: 'قيد التحليل',
    
    // Patient
    welcome_patient: 'أهلاً بك',
    patient_mrn: 'رقم الملف الطبي',
    patient_phone: 'رقم الهاتف',
    blood_type: 'فصيلة الدم',
    allergies: 'الحساسيات الدوائية',
    chronic_diseases: 'الأمراض المزمنة',
    upcoming_appointment: 'موعدك الطبي القادم',
    no_upcoming_appointment: 'لا يوجد موعد قادم مجدول حالياً',
    recent_consultation_reply: 'آخر رد استشارة من الطبيب',
    download_pdf: 'تحميل تقرير PDF',
    print_report: 'طباعة التقرير',
    
    // Footer
    footer_rights: 'جميع الحقوق محفوظة © 2026 مركز الرعاية الطبية المتكامل Medical Care Hub'
  },
  en: {
    // Nav & General
    app_name: 'Medical Care Hub',
    app_tagline: 'Integrated Healthcare Platform',
    home: 'Home',
    services: 'Medical Services',
    doctors: 'Doctors',
    about: 'About Us',
    contact: 'Contact',
    login: 'Sign In',
    register: 'Create Account',
    logout: 'Sign Out',
    book_appointment: 'Book Appointment',
    consult_doctor: 'Consult a Doctor',
    my_tests: 'My Tests',
    my_reports: 'My Reports',
    my_prescriptions: 'My Prescriptions',
    timeline: 'Medical Timeline',
    profile: 'Profile',
    dashboard: 'Dashboard',
    role_patient: 'Patient',
    role_doctor: 'Doctor',
    role_customer_service: 'Customer Service',
    role_admin: 'Hospital Admin',
    switch_role: 'Quick Role Demo Switcher',
    notifications: 'Notifications',
    no_notifications: 'No new notifications',
    mark_all_read: 'Mark all as read',
    search: 'Search...',
    emergency_warning: 'Notice: This platform is for routine outpatient care and consultations. In emergencies, call emergency services immediately.',
    
    // Statuses
    status_NEW: 'New Request',
    status_PENDING: 'Pending',
    status_CONTACTED: 'Contacted',
    status_CONFIRMED: 'Confirmed',
    status_COMPLETED: 'Completed',
    status_CANCELLED: 'Cancelled',
    status_NO_SHOW: 'No Show',
    status_ANSWERED: 'Answered',
    status_CLOSED: 'Closed',
    status_ORDERED: 'Ordered',
    status_IN_PROGRESS: 'In Progress',
    
    // Patient
    welcome_patient: 'Welcome back',
    patient_mrn: 'Medical Record No.',
    patient_phone: 'Phone Number',
    blood_type: 'Blood Type',
    allergies: 'Drug Allergies',
    chronic_diseases: 'Chronic Conditions',
    upcoming_appointment: 'Upcoming Appointment',
    no_upcoming_appointment: 'No scheduled appointments currently',
    recent_consultation_reply: 'Latest Consultation Response',
    download_pdf: 'Download PDF Report',
    print_report: 'Print Report',
    
    // Footer
    footer_rights: 'All rights reserved © 2026 Medical Care Hub Platform'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language]?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        dir: language === 'ar' ? 'rtl' : 'ltr',
        setLanguage,
        toggleLanguage,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
