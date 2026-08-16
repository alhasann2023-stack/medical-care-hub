// Local Consultation and Appointment Reminder Service with Audio Chime & In-App Alerts

export interface ReminderItem {
  id: string;
  type: 'CONSULTATION' | 'APPOINTMENT';
  title: string;
  doctorName: string;
  doctorSpecialty: string;
  targetDateTime: string; // ISO string or parsable date
  timeRemainingMinutes: number;
  clinicRoom?: string;
  status: string;
  notes?: string;
  isTest?: boolean;
}

const DISMISSED_REMINDERS_KEY = 'mch_dismissed_reminders';
const SNOOZED_REMINDERS_KEY = 'mch_snoozed_reminders';
const REMINDER_SETTINGS_KEY = 'mch_reminder_settings';

export interface ReminderSettings {
  enabled: boolean;
  leadTimeMinutes: number; // default 30
  soundEnabled: boolean;
  browserNotifications: boolean;
}

export const defaultSettings: ReminderSettings = {
  enabled: true,
  leadTimeMinutes: 30,
  soundEnabled: true,
  browserNotifications: true
};

export const localReminderService = {
  getSettings: (): ReminderSettings => {
    try {
      const stored = localStorage.getItem(REMINDER_SETTINGS_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  saveSettings: (settings: Partial<ReminderSettings>) => {
    try {
      const current = localReminderService.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return defaultSettings;
    }
  },

  // Synthesize a calming medical chime sound using Web Audio API
  playReminderChime: () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      
      // Tone 1: Soft warm sine (E5: ~659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.9);

      // Tone 2: Harmonious high note (B5: ~987.77 Hz) delayed by 200ms
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.2);
      gain2.gain.setValueAtTime(0.18, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 1.2);

      // Tone 3: Resolved root note (E6: ~1318.51 Hz) delayed by 400ms
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1318.51, now + 0.4);
      gain3.gain.setValueAtTime(0.15, now + 0.4);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.4);
      osc3.stop(now + 1.6);
    } catch (err) {
      console.warn('Audio chime playback was prevented or unsupported:', err);
    }
  },

  // Request browser notification permission smoothly
  requestNotificationPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  sendBrowserNotification: (title: string, body: string) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          dir: 'rtl',
          lang: 'ar'
        });
      }
    } catch (err) {
      console.warn('Browser notification error:', err);
    }
  },

  getDismissedIds: (): string[] => {
    try {
      const stored = localStorage.getItem(DISMISSED_REMINDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  dismissReminder: (id: string) => {
    try {
      const current = localReminderService.getDismissedIds();
      if (!current.includes(id)) {
        localStorage.setItem(DISMISSED_REMINDERS_KEY, JSON.stringify([...current, id]));
      }
    } catch (err) {
      console.error(err);
    }
  },

  snoozeReminder: (id: string, minutes: number = 5) => {
    try {
      const snoozedUntil = Date.now() + minutes * 60 * 1000;
      const stored = localStorage.getItem(SNOOZED_REMINDERS_KEY);
      const data = stored ? JSON.parse(stored) : {};
      data[id] = snoozedUntil;
      localStorage.setItem(SNOOZED_REMINDERS_KEY, JSON.stringify(data));
    } catch (err) {
      console.error(err);
    }
  },

  isSnoozed: (id: string): boolean => {
    try {
      const stored = localStorage.getItem(SNOOZED_REMINDERS_KEY);
      if (!stored) return false;
      const data = JSON.parse(stored);
      const snoozedUntil = data[id];
      if (!snoozedUntil) return false;
      return Date.now() < snoozedUntil;
    } catch {
      return false;
    }
  },

  clearDismissedReminders: () => {
    try {
      localStorage.removeItem(DISMISSED_REMINDERS_KEY);
      localStorage.removeItem(SNOOZED_REMINDERS_KEY);
    } catch (err) {
      console.error(err);
    }
  },

  // Calculate upcoming reminders based on appointments and consultations with exact selected doctor name
  findUpcomingReminders: (
    appointments: any[] = [], 
    consultations: any[] = [],
    leadMinutes: number = 30,
    doctorsList: any[] = []
  ): ReminderItem[] => {
    const reminders: ReminderItem[] = [];
    const now = new Date();
    const dismissed = localReminderService.getDismissedIds();

    const getDoctorDetails = (doctorId?: string, fallbackName?: string, fallbackSpecialty?: string) => {
      if (doctorId && Array.isArray(doctorsList) && doctorsList.length > 0) {
        const found = doctorsList.find(d => d.id === doctorId || d.userId === doctorId);
        if (found) {
          return {
            name: found.fullName || fallbackName || 'الطبيب المعالج',
            specialty: found.specialtyNameAr || fallbackSpecialty || 'العيادات التخصصية',
            room: found.roomNumber || 'عيادة الفحص'
          };
        }
      }
      return {
        name: fallbackName || 'الطبيب المعالج',
        specialty: fallbackSpecialty || 'العيادات التخصصية',
        room: 'عيادة الفحص'
      };
    };

    // 1. Check confirmed or scheduled appointments
    appointments.forEach((apt) => {
      if (!apt || dismissed.includes(apt.id) || localReminderService.isSnoozed(apt.id)) return;
      if (apt.status === 'CANCELLED' || apt.status === 'COMPLETED') return;

      const dateStr = apt.confirmedDate || apt.preferredDate;
      const timeStr = apt.confirmedTime || (apt.preferredPeriod === 'MORNING' ? '10:00' : '17:00');
      if (!dateStr) return;

      // Parse appointment target date and time
      const target = new Date(`${dateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`);
      if (isNaN(target.getTime())) return;

      const diffMs = target.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (60 * 1000));

      // If within leadMinutes (e.g. 0 to 35 minutes) and not in the past more than 30 mins
      if (diffMinutes >= -30 && diffMinutes <= leadMinutes) {
        const docInfo = getDoctorDetails(apt.doctorId, apt.doctorName, apt.doctorSpecialty);
        reminders.push({
          id: apt.id,
          type: 'APPOINTMENT',
          title: `تذكير بموعد العيادة: ${apt.serviceName || 'كشف واستشارة طبية'}`,
          doctorName: docInfo.name,
          doctorSpecialty: docInfo.specialty,
          targetDateTime: target.toISOString(),
          timeRemainingMinutes: Math.max(0, diffMinutes),
          clinicRoom: apt.clinicRoom || docInfo.room,
          status: apt.status,
          notes: apt.coordinatorNotes || apt.patientNotes
        });
      }
    });

    // 2. Check consultations with chosen doctor
    consultations.forEach((cns) => {
      if (!cns || dismissed.includes(cns.id) || localReminderService.isSnoozed(cns.id)) return;
      if (cns.status === 'ANSWERED' || cns.status === 'CLOSED' || cns.status === 'REJECTED') return;

      const docInfo = getDoctorDetails(cns.doctorId, cns.doctorName, cns.doctorSpecialty);
      const createdDate = new Date(cns.createdAt);

      if (!isNaN(createdDate.getTime())) {
        // Estimated response target or session window (within leadMinutes)
        const target = new Date(createdDate.getTime() + 30 * 60 * 1000);
        const diffMs = target.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / (60 * 1000));

        if (diffMinutes >= -15 && diffMinutes <= leadMinutes) {
          reminders.push({
            id: cns.id,
            type: 'CONSULTATION',
            title: `تذكير بمتابعة الاستشارة: ${cns.title || 'استشارة طبية'}`,
            doctorName: docInfo.name,
            doctorSpecialty: docInfo.specialty,
            targetDateTime: target.toISOString(),
            timeRemainingMinutes: Math.max(0, diffMinutes),
            clinicRoom: 'عيادة الاستشارة الافتراضية المباشرة',
            status: cns.status,
            notes: cns.problemDescription
          });
        }
      }
    });

    return reminders;
  }
};
