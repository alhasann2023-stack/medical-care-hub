import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingHero } from './components/home/LandingHero';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { MedicalTimeline } from './components/patient/MedicalTimeline';
import { PatientTestsView } from './components/patient/PatientTestsView';
import { PatientReportsView } from './components/patient/PatientReportsView';
import { AppointmentBookingModal } from './components/patient/AppointmentBookingModal';
import { NewConsultationModal } from './components/patient/NewConsultationModal';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { CustomerServiceDashboard } from './components/cs/CustomerServiceDashboard';
import { HospitalAdminDashboard } from './components/admin/HospitalAdminDashboard';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { ToastNotification, ToastItem } from './components/common/ToastNotification';
import { AuthModal } from './components/common/AuthModal';
import { AppNotification, UserRole } from './types/medical';
import { api } from './services/api';
import { firebaseDb } from './services/firebaseDb';
import { playNotificationSound, playSuccessSound } from './utils/sound';

const MainAppContent: React.FC = () => {
  const { user, role, switchRole, patientProfile } = useAuth();
  const { language } = useLanguage();

  const [currentView, setCurrentView] = useState<string>('landing');
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [knownNotifIds, setKnownNotifIds] = useState<Set<string>>(new Set());

  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newToast: ToastItem = { ...toast, id };
    setToasts(prev => [newToast, ...prev.slice(0, 3)]);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const patientId = patientProfile?.id || user?.id || 'pat-1';

  // Seed Firestore on startup if empty
  useEffect(() => {
    firebaseDb.seedInitialDataIfEmpty().catch(err => {
      console.warn('Firestore initial seeding error:', err);
    });
  }, []);

  // Load live notifications and trigger toast & sound on new incoming items
  useEffect(() => {
    let isInitialLoad = true;
    const queryId = user?.id || patientProfile?.id || 'pat-1';

    const handleNotificationsUpdate = (list: AppNotification[]) => {
      setNotifications(list || []);

      if (list && list.length > 0) {
        setKnownNotifIds(prevKnown => {
          const newlyArrived = list.filter(n => !prevKnown.has(n.id) && !n.isRead);

          if (!isInitialLoad && newlyArrived.length > 0) {
            playNotificationSound();
            newlyArrived.slice(0, 2).forEach(item => {
              addToast({
                title: item.title,
                message: item.message,
                type: item.type,
                relatedId: item.relatedId
              });
            });
          }

          const updatedSet = new Set(prevKnown);
          list.forEach(n => updatedSet.add(n.id));
          return updatedSet;
        });
      }
      isInitialLoad = false;
    };

    // Initial fetch
    api.getNotifications(queryId).then(handleNotificationsUpdate).catch(err => {
      console.warn('Initial notifications load warning:', err);
    });

    // Real-time Firestore subscription
    const unsubscribe = api.subscribeNotifications(queryId, (liveList) => {
      if (liveList && liveList.length >= 0) {
        handleNotificationsUpdate(liveList);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, patientProfile?.id]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(user?.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoleSelectFromHero = async (selectedRole: UserRole) => {
    await switchRole(selectedRole);
    if (selectedRole === 'PATIENT') setCurrentView('patient_dashboard');
    else if (selectedRole === 'DOCTOR') setCurrentView('doctor_dashboard');
    else if (selectedRole === 'CUSTOMER_SERVICE') setCurrentView('cs_dashboard');
    else if (selectedRole === 'HOSPITAL_ADMIN') setCurrentView('admin_dashboard');
  };

  const handleNavigateFromNotification = (type: string) => {
    if (type === 'APPOINTMENT' && role === 'PATIENT') setCurrentView('patient_dashboard');
    else if (type === 'CONSULTATION' && role === 'PATIENT') setCurrentView('patient_dashboard');
    else if (type === 'REPORT' && role === 'PATIENT') setCurrentView('patient_reports');
    else if (type === 'TEST_RESULT' && role === 'PATIENT') setCurrentView('patient_tests');
    else if (role === 'DOCTOR') setCurrentView('doctor_dashboard');
    else if (role === 'CUSTOMER_SERVICE') setCurrentView('cs_dashboard');
    else setCurrentView('patient_dashboard');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div 
      className={`min-h-screen bg-[#F4F7FA] text-[#1A2D42] flex flex-col font-cairo ${language === 'ar' ? 'rtl' : 'ltr'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenConsultation={() => setIsConsultationOpen(true)}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenAuth={openAuth}
        unreadNotificationsCount={unreadCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'landing' && (
          <LandingHero
            onOpenBooking={() => setIsBookingOpen(true)}
            onOpenConsultation={() => setIsConsultationOpen(true)}
            onSelectRole={handleRoleSelectFromHero}
            onOpenAuth={openAuth}
          />
        )}

        {/* Patient Views */}
        {currentView === 'patient_dashboard' && (
          <PatientDashboard
            onOpenBooking={() => setIsBookingOpen(true)}
            onOpenConsultation={() => setIsConsultationOpen(true)}
            onNavigateToTimeline={() => setCurrentView('patient_timeline')}
            onNavigateToTests={() => setCurrentView('patient_tests')}
            onNavigateToReports={() => setCurrentView('patient_reports')}
          />
        )}

        {currentView === 'patient_timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('patient_dashboard')}
                className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
              >
                ← العودة للوحة المريض
              </button>
            </div>
            <MedicalTimeline
              patientId={patientId}
              onOpenBooking={() => setIsBookingOpen(true)}
              onOpenConsultation={() => setIsConsultationOpen(true)}
            />
          </div>
        )}

        {currentView === 'patient_tests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('patient_dashboard')}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                ← العودة للوحة المريض
              </button>
            </div>
            <PatientTestsView patientId={patientId} />
          </div>
        )}

        {currentView === 'patient_reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('patient_dashboard')}
                className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
              >
                ← العودة للوحة المريض
              </button>
            </div>
            <PatientReportsView patientId={patientId} />
          </div>
        )}

        {/* Doctor Portal Views */}
        {currentView === 'doctor_dashboard' && (
          <DoctorDashboard initialTab="CONSULTATIONS" />
        )}
        {currentView === 'doctor_patients' && (
          <DoctorDashboard initialTab="PATIENTS" />
        )}
        {currentView === 'doctor_appointments' && (
          <DoctorDashboard initialTab="APPOINTMENTS" />
        )}
        {currentView === 'doctor_timeline' && (
          <DoctorDashboard initialTab="TIMELINE" />
        )}

        {/* Customer Service View */}
        {currentView === 'cs_dashboard' && (
          <CustomerServiceDashboard />
        )}

        {/* Hospital Admin View */}
        {currentView === 'admin_dashboard' && (
          <HospitalAdminDashboard />
        )}
      </main>

      {/* Live Pop-up Toast Notifications */}
      <ToastNotification
        toasts={toasts}
        onDismiss={handleDismissToast}
        onToastClick={(toast) => {
          handleNavigateFromNotification(toast.type);
        }}
      />

      {/* Booking Modal */}
      <AppointmentBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => {
          playSuccessSound();
          addToast({
            title: 'تم تقديم طلب الموعد بنجاح',
            message: 'تم إرسال طلبك للعيادة الطبية وسيتم التواصل معك لتأكيد الموعد.',
            type: 'APPOINTMENT'
          });
          const queryId = user?.id || patientProfile?.id || 'pat-1';
          api.getNotifications(queryId).then(setNotifications);
        }}
      />

      {/* New Tele-Consultation Modal */}
      <NewConsultationModal
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        onSuccess={() => {
          playSuccessSound();
          addToast({
            title: 'تم إرسال الاستشارة الطبية بنجاح',
            message: 'تم تحويل استشارتك إلى الطبيب المختص وسيصلك تنبيه فوري فور الرد.',
            type: 'CONSULTATION'
          });
          const queryId = user?.id || patientProfile?.id || 'pat-1';
          api.getNotifications(queryId).then(setNotifications);
        }}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onSelectNotification={(notif) => {
          handleNavigateFromNotification(notif.type);
          setIsNotificationDrawerOpen(false);
        }}
      />

      {/* Authentication Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          api.getNotifications(user?.id).then(setNotifications);
        }}
      />

      {/* Platform Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
