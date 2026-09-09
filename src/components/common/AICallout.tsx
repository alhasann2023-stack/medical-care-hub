import React, { useState } from 'react';
import { Sparkles, Bot, AlertTriangle, CheckCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../services/api';

interface AICalloutProps {
  patientId: string;
  patientName?: string;
  className?: string;
}

export const AICallout: React.FC<AICalloutProps> = ({ patientId, patientName, className = '' }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    try {
      const res = await api.summarizeRecord(patientId);
      setSummary(res.summary);
      setDisclaimer(res.disclaimer);
      setIsExpanded(true);
    } catch (err) {
      console.error('AI summary error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-cyan-50/40 to-white p-5 shadow-xs transition-all ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">المساعد الطبي الذكي (AI Medical Assistant)</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Gemini 2.5
              </span>
            </div>
            <p className="text-xs text-slate-500">
              توليد ملخص سريري منظم للسجل الطبي والفحوصات الأخيرة {patientName ? `للمريض ${patientName}` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>جاري التحليل...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{summary ? 'تحديث الملخص' : 'توليد ملخص سريري'}</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Summary Card */}
      {summary && (
        <div className="mt-4 pt-4 border-t border-blue-100 space-y-3 animate-in fade-in">
          <div className="bg-white/80 rounded-xl p-4 border border-blue-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line shadow-2xs font-sans">
            {summary}
          </div>

          {/* Mandatory Medical Disclaimer */}
          <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              {disclaimer || 'تنبيه نظام: هذا الملخص تم توليده آلياً للمساعدة الإدارية والسريرية — لا يعد تشخيصاً طبياً مستقلاً ويجب اعتماده من قبل الطبيب المختص.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
