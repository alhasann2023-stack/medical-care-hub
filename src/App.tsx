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
import { AuthModal } from './components/common/AuthModal';
import { AppNotification, UserRole } from './types/medical';
import { api } from './services/api';
import { firebaseDb } from './services/firebaseDb';

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

  // Load live notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const list = await api.getNotifications(user?.id);
        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    fetchNotifs();
    const timer = setInterval(fetchNotifs, 10000);
    return () => clearInterval(timer);
  }, [user?.id]);

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

        {/* Doctor Portal View */}
        {currentView === 'doctor_dashboard' && (
          <DoctorDashboard />
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

      {/* Booking Modal */}
      <AppointmentBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => {
          api.getNotifications(user?.id).then(setNotifications);
        }}
      />

      {/* New Tele-Consultation Modal */}
      <NewConsultationModal
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        onSuccess={() => {
          api.getNotifications(user?.id).then(setNotifications);
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
          if (notif.type === 'APPOINTMENT' && role === 'PATIENT') setCurrentView('patient_dashboard');
          else if (notif.type === 'CONSULTATION' && role === 'PATIENT') setCurrentView('patient_dashboard');
          else if (notif.type === 'REPORT' && role === 'PATIENT') setCurrentView('patient_reports');
          else if (notif.type === 'TEST_RESULT' && role === 'PATIENT') setCurrentView('patient_tests');
          else if (role === 'DOCTOR') setCurrentView('doctor_dashboard');
          else if (role === 'CUSTOMER_SERVICE') setCurrentView('cs_dashboard');
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
