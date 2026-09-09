import React, { useEffect, useState } from 'react';
import { Calendar, MessageSquare, FileText, Activity, Bell, X, ArrowLeft, CheckCircle2, CreditCard, Clock, RotateCcw } from 'lucide-react';
import { AppNotification } from '../../types/medical';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'PAYMENT' | 'FOLLOW_UP' | 'REMINDER' | 'REFUND' | 'APPOINTMENT' | 'CONSULTATION' | 'TEST_RESULT' | 'REPORT' | 'SYSTEM';
  relatedId?: string;
  timestamp?: string;
  onClick?: () => void;
}

interface ToastNotificationProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onToastClick?: (toast: ToastItem) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toasts,
  onDismiss,
  onToastClick
}) => {
  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'FOLLOW_UP':
      case 'REMINDER':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'REFUND':
        return <RotateCcw className="w-5 h-5 text-blue-600" />;
      case 'APPOINTMENT':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'CONSULTATION':
        return <MessageSquare className="w-5 h-5 text-emerald-600" />;
      case 'TEST_RESULT':
        return <Activity className="w-5 h-5 text-purple-600" />;
      case 'REPORT':
        return <FileText className="w-5 h-5 text-rose-600" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return { label: 'سداد وفواتير', bg: 'bg-emerald-100 text-emerald-800' };
      case 'FOLLOW_UP':
        return { label: 'موعد مراجعة', bg: 'bg-amber-100 text-amber-800' };
      case 'REMINDER':
        return { label: 'تذكير طبي', bg: 'bg-amber-100 text-amber-800' };
      case 'REFUND':
        return { label: 'استرداد مالي', bg: 'bg-blue-100 text-blue-800' };
      case 'APPOINTMENT':
        return { label: 'حجز ومواعيد', bg: 'bg-blue-100 text-blue-800' };
      case 'CONSULTATION':
        return { label: 'استشارة طبية', bg: 'bg-emerald-100 text-emerald-800' };
      case 'TEST_RESULT':
        return { label: 'فحوصات وتحاليل', bg: 'bg-purple-100 text-purple-800' };
      case 'REPORT':
        return { label: 'تقرير طبي', bg: 'bg-rose-100 text-rose-800' };
      default:
        return { label: 'تنبيه النظام', bg: 'bg-indigo-100 text-indigo-800' };
    }
  };

  return (
    <div 
      className="fixed top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 flex flex-col gap-2.5 max-w-sm w-[92vw] sm:w-[380px] pointer-events-none"
      dir="rtl"
    >
      {toasts.map((toast) => {
        const badge = getTypeBadge(toast.type);
        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-4 transition-all animate-in slide-in-from-top-4 sm:slide-in-from-right-4 duration-250 flex flex-col gap-2 relative overflow-hidden group hover:shadow-indigo-500/10 hover:border-slate-300"
          >
            {/* Ambient accent border top */}
            <div className={`absolute top-0 right-0 left-0 h-1 ${
              toast.type === 'CONSULTATION' ? 'bg-emerald-500' :
              toast.type === 'APPOINTMENT' ? 'bg-blue-500' :
              toast.type === 'REPORT' ? 'bg-rose-500' : 'bg-indigo-500'
            }`} />

            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/60 shadow-2xs shrink-0">
                  {getIcon(toast.type)}
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-900 mt-1 line-clamp-1">
                    {toast.title}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pr-1 line-clamp-2">
              {toast.message}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400 font-medium">الآن</span>
              {toast.relatedId && onToastClick && (
                <button
                  onClick={() => {
                    onToastClick(toast);
                    onDismiss(toast.id);
                  }}
                  className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                >
                  <span>عرض التفاصيل</span>
                  <ArrowLeft className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
