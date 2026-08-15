import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Stethoscope, 
  ArrowLeft,
  Sparkles,
  HeartPulse,
  Award,
  ShieldAlert,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/medical';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {
  const { login, register, loginWithGoogle, isLoading } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register Patient Form State (Dedicated patient registration)
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regGender, setRegGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [regBirthDate, setRegBirthDate] = useState('1995-05-15');
  const [regBloodType, setRegBloodType] = useState<string>('O+');
  const [regNationalId, setRegNationalId] = useState('');

  if (!isOpen) return null;

  const handleGoogleAuth = async (roleHint: UserRole = 'PATIENT') => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(roleHint);
      setSuccessMessage('تم تسجيل الدخول بحساب Google بنجاح!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل الدخول عبر Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim()) {
      setErrorMessage('يرجى كتابة البريد الإلكتروني.');
      return;
    }

    try {
      await login(loginEmail.trim(), loginPassword || undefined);
      setSuccessMessage('تم تسجيل الدخول بنجاح!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل الدخول. يرجى التأكد من البيانات.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regFullName.trim() || !regEmail.trim()) {
      setErrorMessage('يرجى ملء الاسم الكامل والبريد الإلكتروني.');
      return;
    }

    if (!regPassword || !regPassword.trim()) {
      setErrorMessage('يرجى إدخال كلمة مرور خاصة بحسابك (6 خانات على الأقل).');
      return;
    }

    if (regPassword.trim().length < 6) {
      setErrorMessage('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    if (regPassword.trim() !== regConfirmPassword.trim()) {
      setErrorMessage('كلمة المرور وتأكيدها غير متطابقين.');
      return;
    }

    try {
      const payload: any = {
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        password: regPassword.trim(),
        role: 'PATIENT',
        nationalId: regNationalId.trim() || undefined,
        gender: regGender,
        birthDate: regBirthDate,
        bloodType: regBloodType
      };

      await register(payload);
      setSuccessMessage('تم إنشاء ملفك الطبي وحسابك كمريض بنجاح!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إنشاء الحساب. يرجى التأكد من صحة البيانات المدخلة.');
    }
  };

  // Quick One-Click Fill for Preset Accounts
  const handleQuickFill = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('demo123');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="auth-modal-dialog"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-cyan-300">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">منصة الرعاية الطبية</h2>
              <p className="text-xs text-blue-200">بوابة الدخول وإنشاء ملفات المرضى المعتمدة</p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-6 p-1 bg-blue-950/60 rounded-xl border border-blue-700/50">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMessage(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              إنشاء حساب مريض جديد
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* GOOGLE ONE-CLICK AUTH BUTTON (FOR BOTH LOGIN & REGISTER) */}
          <div className="space-y-3">
            <button
              type="button"
              id="google-auth-button"
              onClick={() => handleGoogleAuth('PATIENT')}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 px-4 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-400 text-slate-800 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.98 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>
                {isGoogleLoading 
                  ? 'جاري الاتصال بحساب Google...' 
                  : (mode === 'register' ? 'التسجيل السريع للمرضى عبر حساب Google' : 'المتابعة والتسجيل عبر حساب Google')}
              </span>
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-white px-3 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                {mode === 'register' ? 'أو التسجيل اليدوي بالبيانات' : 'أو بالبريد الإلكتروني'}
              </span>
              <div className="border-t border-slate-200 w-full"></div>
            </div>
          </div>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البريد الإلكتروني <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="example@domain.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xs font-medium text-slate-900 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    كلمة المرور <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xs font-medium text-slate-900 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>تذكر بيانات الدخول</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>جاري تسجيل الدخول...</span>
                ) : (
                  <>
                    <span>تسجيل الدخول</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Admin quick login info */}
              <div className="pt-4 border-t border-slate-100">
                <div
                  onClick={() => handleQuickFill('alhasann2023@gmail.com')}
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-start text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 block">alhasann2023@gmail.com</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold text-[10px]">المدير العام والمسؤول</span>
                  </div>
                  <span className="text-amber-800 text-[11px] mt-0.5 block">حساب المشرف العام لإدارة المستشفى والصلاحيات</span>
                </div>
              </div>
            </form>
          )}

          {/* DEDICATED PATIENT REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Header Badge */}
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">إنشاء حساب مريض جديد</h4>
                    <p className="text-[11px] text-blue-700">فتح ملف طبي إلكتروني موحد فوري (MRN)</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px] font-bold">مريض</span>
              </div>

              {/* Notice About Doctor Accounts */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>تنويه للأطباء والاستشاريين:</strong> حسابات الأطباء والاستشاريين وموظفي خدمة العملاء يتم إنشاؤها ومنح صلاحياتها حصراً عبر لوحة الإدارة من قبل المشرف العام للموقع (<span className="font-mono font-bold">alhasann2023@gmail.com</span>).
                </span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الاسم الثلاثي للمريض <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عبد العزيز بن محمد الغامدي"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xs font-medium text-slate-900 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    البريد الإلكتروني <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="patient@domain.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xs font-medium text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم الجوال <span className="text-slate-400 font-normal">(المعرف الموحد)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      placeholder="0501234567"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xs font-medium text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    كلمة المرور <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xs font-medium text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تأكيد كلمة المرور <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xs font-medium text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-xl">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                <span>لدواعي الأمان والخصوصية: يجب اختيار كلمة مرور فريدة وغير مستخدمة لحساب آخر مسبقاً.</span>
              </div>

              {/* Patient-specific Details */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <HeartPulse className="w-4 h-4 text-blue-600" />
                  <span>بيانات الملف الطبي الموحد (MRN)</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الجنس</label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value as any)}
                      className="w-full py-2 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium outline-none"
                    >
                      <option value="MALE">ذكر</option>
                      <option value="FEMALE">أنثى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">فصيلة الدم</label>
                    <select
                      value={regBloodType}
                      onChange={(e) => setRegBloodType(e.target.value)}
                      className="w-full py-2 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium outline-none"
                    >
                      <option value="O+">O+</option>
                      <option value="A+">A+</option>
                      <option value="B+">B+</option>
                      <option value="AB+">AB+</option>
                      <option value="O-">O-</option>
                      <option value="A-">A-</option>
                      <option value="B-">B-</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الميلاد</label>
                    <input
                      type="date"
                      value={regBirthDate}
                      onChange={(e) => setRegBirthDate(e.target.value)}
                      className="w-full py-2 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم الهوية الوطنية / الإقامة (اختياري)</label>
                  <input
                    type="text"
                    placeholder="10XXXXXXXX"
                    value={regNationalId}
                    onChange={(e) => setRegNationalId(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>جاري إنشاء الملف الطبي...</span>
                ) : (
                  <>
                    <span>إنشاء حساب المريض وبدء الاستخدام</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

