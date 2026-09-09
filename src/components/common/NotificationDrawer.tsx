import React from 'react';
import { X, Bell, CheckCheck, Calendar, MessageSquare, FileText, Activity, Clock } from 'lucide-react';
import { AppNotification } from '../../types/medical';
import { useLanguage } from '../../context/LanguageContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSelectNotification
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'CONSULTATION':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'TEST_RESULT':
        return <Activity className="w-4 h-4 text-purple-600" />;
      case 'REPORT':
        return <FileText className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{t('notifications')}</h3>
              <p className="text-xs text-slate-500">{notifications.filter(n => !n.isRead).length} إشعار غير مقروء</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onMarkAllRead}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="تحديد الكل كمقروء"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">تحديد الكل</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">{t('no_notifications')}</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) onMarkRead(notif.id);
                  if (onSelectNotification) onSelectNotification(notif);
                }}
                className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer ${
                  notif.isRead
                    ? 'bg-white border-slate-200 opacity-80'
                    : 'bg-blue-50/50 border-blue-200 shadow-2xs'
                } hover:border-blue-300 hover:shadow-xs`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{notif.title}</h4>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(notif.createdAt).toLocaleString('ar-SA')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
