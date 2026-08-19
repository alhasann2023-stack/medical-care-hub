import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Stethoscope, 
  Headphones, 
  ShieldAlert, 
  Bell, 
  Globe, 
  ChevronDown,
  LogOut,
  PlusCircle,
  Clock,
  Sparkles,
  Search,
  Menu,
  X,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types/medical';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenBooking: () => void;
  onOpenConsultation: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  unreadNotificationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenBooking,
  onOpenConsultation,
  onOpenNotifications,
  onOpenAuth,
  unreadNotificationsCount
}) => {
  const { user, role, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const roleConfigs: Record<UserRole, { label: string; icon: any; color: string; bg: string }> = {
    PATIENT: {
      label: 'بوابة المريض',
      icon: User,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200'
    },
    DOCTOR: {
      label: 'بوابة الطبيب',
      icon: Stethoscope,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    CUSTOMER_SERVICE: {
      label: 'خدمة العملاء والتنسيق',
      icon: Headphones,
      color: 'text-purple-700',
      bg: 'bg-purple-50 border-purple-200'
    },
    HOSPITAL_ADMIN: {
      label: 'إدارة المستشفى',
      icon: ShieldAlert,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200'
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setCurrentView('landing');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Announcement & Emergency Triage Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-600 text-white animate-pulse">
              طوارئ
            </span>
            <span className="hidden sm:inline text-slate-300">
              للحالات الحرجة والإسعاف الفوري اتصل بـ <strong className="text-white">997</strong>
            </span>
            <span className="sm:hidden text-slate-300">
              طوارئ الإسعاف: <strong className="text-white">997</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">

            <span className="hidden md:inline">الرقم الموحد: 920008899</span>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('landing')}
              className="flex items-center gap-3 group text-start cursor-pointer focus:outline-none"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">Medical Care Hub</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">SaaS</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">مركز الرعاية الصحية والعيادات التخصصية</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600">
            <button
              onClick={() => setCurrentView('landing')}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                currentView === 'landing' ? 'text-blue-700 bg-blue-50/80 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t('home')}
            </button>

            {role === 'PATIENT' && (
              <>
                <button
                  onClick={() => setCurrentView('patient_dashboard')}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentView.startsWith('patient_') ? 'text-blue-700 bg-blue-50/80 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  لوحة المريض
                </button>
                <button
                  onClick={() => setCurrentView('patient_timeline')}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentView === 'patient_timeline' ? 'text-blue-700 bg-blue-50/80 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  السجل الزمني الطبي
                </button>
                <button
                  onClick={() => setCurrentView('patient_tests')}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentView === 'patient_tests' ? 'text-blue-700 bg-blue-50/80 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  فحوصاتي
                </button>
                <button
                  onClick={() => setCurrentView('patient_reports')}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentView === 'patient_reports' ? 'text-blue-700 bg-blue-50/80 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  تقاريري
                </button>
              </>
            )}

            {role === 'DOCTOR' && (
              <>
                <button
                  onClick={() => setCurrentView('doctor_dashboard')}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentView === 'doctor_dashboard' ? 'text-emerald-700 bg-emerald-50/90 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  العيادة والاستشارات
                </button>
                <button
                  onClick={() => setCurrentView('doctor_patients')}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentView === 'doctor_patients' ? 'text-emerald-700 bg-emerald-50/90 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  ملفات وسجلات المرضى
                </button>
                <button
                  onClick={() => setCurrentView('doctor_appointments')}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentView === 'doctor_appointments' ? 'text-emerald-700 bg-emerald-50/90 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  جدول المواعيد
                </button>
                <button
                  onClick={() => setCurrentView('doctor_timeline')}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentView === 'doctor_timeline' ? 'text-emerald-700 bg-emerald-50/90 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  السجل الطبي الزمني
                </button>
              </>
            )}

            {role === 'CUSTOMER_SERVICE' && (
              <button
                onClick={() => setCurrentView('cs_dashboard')}
                className="px-3 py-2 rounded-lg text-purple-700 bg-purple-50/80 font-bold"
              >
                تنسيق ومتابعة المواعيد
              </button>
            )}

            {role === 'HOSPITAL_ADMIN' && (
              <button
                onClick={() => setCurrentView('admin_dashboard')}
                className="px-3 py-2 rounded-lg text-amber-700 bg-amber-50/80 font-bold"
              >
                لوحة إدارة المستشفى
              </button>
            )}
          </nav>

          {/* Quick Actions & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action Booking & Consultation */}
            {role === 'PATIENT' && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={onOpenConsultation}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  استشر طبيباً
                </button>
                <button
                  onClick={onOpenBooking}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  احجز موعداً
                </button>
              </div>
            )}

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-bounce">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* User Profile / Auth State Actions */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                  title="ملف المستخدم والحساب"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.fullName)}`}
                    alt={user.fullName}
                    className="w-7 h-7 rounded-lg bg-blue-100 object-cover border border-blue-200"
                  />
                  <div className="hidden xl:block text-start text-xs leading-tight">
                    <span className="font-bold text-slate-800 block truncate max-w-[110px]">{user.fullName}</span>
                    <span className="text-[10px] text-slate-500 block truncate max-w-[110px]">{user.email}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute left-0 sm:right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-2">
                      <img
                        src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.fullName)}`}
                        alt={user.fullName}
                        className="w-10 h-10 rounded-xl bg-blue-100 object-cover border border-blue-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">{user.fullName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {role ? roleConfigs[role]?.label : 'مستخدم'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {role === 'PATIENT' && (
                        <button
                          onClick={() => { setCurrentView('patient_dashboard'); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 text-start cursor-pointer"
                        >
                          <User className="w-4 h-4 text-blue-600" />
                          <span>لوحة المريض وملفي الطبي</span>
                        </button>
                      )}

                      <button
                        onClick={() => { setIsUserMenuOpen(false); onOpenAuth('login'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 text-start cursor-pointer"
                      >
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span>تسجيل الدخول بحساب آخر</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 text-start cursor-pointer transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
                >
                  إنشاء حساب
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2 shadow-lg">
          <button
            onClick={() => { setCurrentView('landing'); setIsMobileMenuOpen(false); }}
            className="w-full text-start px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50"
          >
            {t('home')}
          </button>

          {role === 'PATIENT' && (
            <>
              <button
                onClick={() => { setCurrentView('patient_dashboard'); setIsMobileMenuOpen(false); }}
                className="w-full text-start px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 text-blue-700 font-bold"
              >
                لوحة تحكم المريض
              </button>
              <button
                onClick={() => { setCurrentView('patient_timeline'); setIsMobileMenuOpen(false); }}
                className="w-full text-start px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50"
              >
                السجل الزمني الطبي
              </button>
              <button
                onClick={() => { setCurrentView('patient_tests'); setIsMobileMenuOpen(false); }}
                className="w-full text-start px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50"
              >
                فحوصاتي المخبرية
              </button>
              <button
                onClick={() => { setCurrentView('patient_reports'); setIsMobileMenuOpen(false); }}
                className="w-full text-start px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50"
              >
                التقارير الطبية
              </button>
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => { onOpenConsultation(); setIsMobileMenuOpen(false); }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 text-center"
                >
                  استشر طبيباً
                </button>
                <button
                  onClick={() => { onOpenBooking(); setIsMobileMenuOpen(false); }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 text-center"
                >
                  احجز موعداً
                </button>
              </div>
            </>
          )}

          {role === 'DOCTOR' && (
            <div className="space-y-1">
              <button
                onClick={() => { setCurrentView('doctor_dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full text-start px-3 py-2 rounded-lg text-sm font-bold ${
                  currentView === 'doctor_dashboard' ? 'text-emerald-800 bg-emerald-100' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                العيادة والاستشارات
              </button>
              <button
                onClick={() => { setCurrentView('doctor_patients'); setIsMobileMenuOpen(false); }}
                className={`w-full text-start px-3 py-2 rounded-lg text-sm font-bold ${
                  currentView === 'doctor_patients' ? 'text-emerald-800 bg-emerald-100' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                ملفات وسجلات المرضى
              </button>
              <button
                onClick={() => { setCurrentView('doctor_appointments'); setIsMobileMenuOpen(false); }}
                className={`w-full text-start px-3 py-2 rounded-lg text-sm font-bold ${
                  currentView === 'doctor_appointments' ? 'text-emerald-800 bg-emerald-100' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                جدول المواعيد
              </button>
              <button
                onClick={() => { setCurrentView('doctor_timeline'); setIsMobileMenuOpen(false); }}
                className={`w-full text-start px-3 py-2 rounded-lg text-sm font-bold ${
                  currentView === 'doctor_timeline' ? 'text-emerald-800 bg-emerald-100' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                السجل الطبي الزمني
              </button>
            </div>
          )}

          {role === 'CUSTOMER_SERVICE' && (
            <button
              onClick={() => { setCurrentView('cs_dashboard'); setIsMobileMenuOpen(false); }}
              className="w-full text-start px-3 py-2 rounded-md text-sm font-medium text-purple-700 bg-purple-50 font-bold"
            >
              لوحة منسق خدمة العملاء
            </button>
          )}

          {role === 'HOSPITAL_ADMIN' && (
            <button
              onClick={() => { setCurrentView('admin_dashboard'); setIsMobileMenuOpen(false); }}
              className="w-full text-start px-3 py-2 rounded-md text-sm font-medium text-amber-700 bg-amber-50 font-bold"
            >
              لوحة الإدارة والإحصائيات
            </button>
          )}

          {/* Mobile Auth Actions */}
          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.fullName)}`}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-lg bg-blue-100 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-slate-800 truncate">{user.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenAuth('login'); setIsMobileMenuOpen(false); }}
                  className="py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-center cursor-pointer"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => { onOpenAuth('register'); setIsMobileMenuOpen(false); }}
                  className="py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 text-center shadow-xs cursor-pointer"
                >
                  إنشاء حساب
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
