import React from 'react';
import { 
  Building2, 
  Stethoscope, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  Clock, 
  Users, 
  ArrowLeft, 
  HeartPulse, 
  CheckCircle2, 
  FileText, 
  Activity, 
  Headphones,
  Mail,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types/medical';

interface LandingHeroProps {
  onOpenBooking: () => void;
  onOpenConsultation: () => void;
  onSelectRole: (role: UserRole) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenBooking,
  onOpenConsultation,
  onSelectRole,
  onOpenAuth
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white p-8 sm:p-14 shadow-2xl border border-blue-800/40">
        {/* Abstract Ambient Lights */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-800/60 border border-blue-700/60 text-xs font-bold text-cyan-300 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>المنصة الطبية الذكية والمتكاملة لإدارة الرعاية الصحية</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-3xl font-black tracking-tight leading-tight sm:leading-snug">
            رعايتك الصحية واستشاراتك الطبية <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-white bg-clip-text text-transparent">
              بأعلى معايير الدقة والسرعة
            </span>
          </h1>

          <p className="text-sm sm:text-base text-blue-200/90 max-w-2xl mx-auto leading-relaxed font-normal">
            منظومة سحابية موحدة تجمع بين المرضى، الأطباء الاستشاريين، مراكز خدمة المواعيد، وإدارة المستشفى لتقديم تجربة علاجية وسجلات طبية فورية وآمنة عبر البريد الإلكتروني.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onOpenConsultation}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer scale-100 hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>استشر طبيباً فوراً</span>
            </button>

            <button
              onClick={onOpenBooking}
              className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-sm backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-cyan-300" />
              <span>حجز موعد كشف بالعيادة</span>
            </button>

            {!user && (
              <button
                onClick={() => onOpenAuth('register')}
                className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer scale-100 hover:scale-105"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>تسجيل المرضى عبر Google</span>
              </button>
            )}
          </div>

          {/* Trust Badges */}
          <div className="pt-8 border-t border-blue-800/60 flex flex-wrap items-center justify-center gap-6 text-xs text-blue-200/70 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>معتمد ومشفر طبياً 100%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>استجابة سريعة للاستشارات</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>تسجيل فوري عبر Google أو البريد</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>تقارير ووصفات رسمية معتمدة</span>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Interactive Portals RBAC Switcher */}


      {/* Features Overview */}
      <section className="bg-slate-50 rounded-3xl p-8 sm:p-12 border border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl font-black text-slate-900">مميزات منصة Medical Care Hub</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            مصممة بمعايير هندسية وطبية تلبي كافة متطلبات التحول الرقمي الصحي
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-start">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">سجل زمني طبي تفاعلي</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              تسلسل زمني يجمع المعاينات السريرية، التحاليل المخبرية، الوصفات، والاستشارات في شاشة موحدة سهلة الفحص.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">مساعد سريري ذكي (Gemini AI)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              توليد ملخصات للسجلات الطبية ومساعدة الأطباء في صياغة مسودات التقارير الرسمية وفق معايير الأمان الطبي.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">تقارير ووصفات رسمية قابلة للطباعة</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              مخرجات معتمدة بختم المستشفى ورموز التحقق الرقمية QR ومطابقة لصيغ الطباعة المعتمدة في المستشفيات.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
