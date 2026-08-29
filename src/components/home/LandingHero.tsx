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
    <div className="space-y-6 py-2">
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

          <h1 className="text-1xl sm:text-1xl lg:text-1xl font-black tracking-tight leading-tight sm:leading-snug">
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


 

  
          </div>

          {/* Trust Badges */}
          <div className="pt-4 border-t border-blue-800/60 flex flex-wrap items-center justify-center gap-6 text-xs text-blue-200/70 font-medium">
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
              <span>تسجيل فوري برقم الهاتف والبريد</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>تقارير ووصفات رسمية معتمدة</span>
            </div>
          </div>
        </div>
      </section>



      {/* Features Overview */}
      <section className="bg-slate-50 rounded-3xl p-4 sm:p-6 border border-slate-200/80">
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
