import React from 'react';
import { Building2, Phone, Mail, MapPin, ShieldCheck, Heart, Clock, Award } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: About */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Medical Care Hub</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              منصة طبية متكاملة لربط المرضى بالأطباء الاستشاريين، تنسيق المواعيد المتقدم، وإدارة السجلات والفحوصات الطبية بأعلى معايير الأمان والخصوصية الصحية.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>نظام مشفر ومطابق لمعايير الحماية الصحية HIPAA & MOH</span>
            </div>
          </div>

          {/* Col 2: Clinical Specialties */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm border-b border-slate-800 pb-2">الأقسام والعيادات</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="hover:text-white transition-colors cursor-pointer">• مركز أمراض وجراحة القلب</li>
              <li className="hover:text-white transition-colors cursor-pointer">• العيادات الباطنية والغدد والسكري</li>
              <li className="hover:text-white transition-colors cursor-pointer">• جراحة العظام والمفاصل والمناظير</li>
              <li className="hover:text-white transition-colors cursor-pointer">• رعاية الأطفال وحديثي الولادة</li>
              <li className="hover:text-white transition-colors cursor-pointer">• المختبر والتحاليل التشخيصية الدقيقة</li>
            </ul>
          </div>

          {/* Col 3: Patient Care Hours */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm border-b border-slate-800 pb-2">أوقات العمل والتنسيق</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">العيادات الاستشارية:</p>
                  <p>السبت - الخميس: 08:00 ص - 10:00 م</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">الاستشارات الطبية عن بعد:</p>
                  <p>متاحة على مدار 24 ساعة عبر المنصة</p>
                </div>
              </div>
            </div>
          </div>

          {/* Col 4: Contact & Support */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm border-b border-slate-800 pb-2">التواصل وخدمة المرضى</h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>مركز الاتصال الموحد: 920008899</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>nashwann1991@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>اليمن صنعاء شارع الزبير امام الهدى</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>{t('footer_rights')}</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">سياسة الخصوصية الطبية</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">شروط الاستخدام</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">ميثاق حقوق المريض</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
