import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Stethoscope,
  Star,
  MapPin,
  Sparkles,
  CreditCard,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import { DOCTORS, SPECIALTIES } from '../../data/mockData';
import { Appointment, Doctor, Language } from '../../types';

interface AppointmentBookingProps {
  language: Language;
  preselectedSpecialty?: string;
  onAppointmentBooked?: (appointment: Appointment) => void;
}

export const AppointmentBooking: React.FC<AppointmentBookingProps> = ({
  language,
  preselectedSpecialty,
  onAppointmentBooked,
}) => {
  const isAr = language === 'ar';

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    preselectedSpecialty || 'cardiology'
  );
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor>(DOCTORS[0]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [visitReason, setVisitReason] = useState<string>('');
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  const timeSlots = [
    '09:00 ص',
    '10:30 ص',
    '11:45 ص',
    '01:15 م',
    '04:00 م',
    '05:30 م',
    '07:00 م',
    '08:15 م',
  ];

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone) return;

    const newAppointment: Appointment = {
      id: `APT-${Math.floor(100000 + Math.random() * 900000)}`,
      patientName,
      patientPhone,
      doctorId: selectedDoctor.id,
      doctorName: isAr ? selectedDoctor.nameAr : selectedDoctor.nameEn,
      specialty: isAr ? selectedDoctor.specialtyAr : selectedDoctor.specialtyEn,
      date: selectedDate,
      timeSlot: selectedTime,
      reason: visitReason,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    setConfirmedBooking(newAppointment);
    onAppointmentBooked?.(newAppointment);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900">
              {isAr ? 'حجز موعد في العيادات التخصصية' : 'Book a Clinic Appointment'}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {isAr
              ? 'اختر التخصص والطبيب الاستشاري والوقت الأنسب لك مع تأكيد فوري للموعد'
              : 'Select your specialty, preferred consultant, and time slot for instant confirmation'}
          </p>
        </div>
      </div>

      {confirmedBooking ? (
        /* Confirmation Card */
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-teal-200 shadow-lg text-center max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/60 px-3 py-1 rounded-full">
              {isAr ? 'تم تأكيد الحجز بنجاح' : 'Appointment Confirmed'}
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-3">
              {isAr ? 'تذكرة الموعد الطبي' : 'Clinic Appointment Ticket'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isAr ? 'رقم الحجز المرجعي:' : 'Booking Reference:'}{' '}
              <span className="font-mono font-bold text-slate-800">{confirmedBooking.id}</span>
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 text-start space-y-3 text-xs border border-slate-200">
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">{isAr ? 'اسم المريض:' : 'Patient Name:'}</span>
              <span className="font-bold text-slate-800">{confirmedBooking.patientName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">{isAr ? 'الطبيب المعالج:' : 'Doctor:'}</span>
              <span className="font-bold text-slate-800">{confirmedBooking.doctorName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
              <span className="font-bold text-teal-700">
                {confirmedBooking.date} - {confirmedBooking.timeSlot}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">{isAr ? 'العيادة والموقع:' : 'Clinic Location:'}</span>
              <span className="font-bold text-slate-800">{selectedDoctor.clinicRoom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isAr ? 'رسوم الاستشارة:' : 'Consultation Fee:'}</span>
              <span className="font-bold text-slate-900">{selectedDoctor.consultationFee} ر.س</span>
            </div>
          </div>

          <button
            onClick={() => setConfirmedBooking(null)}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-teal-600/20"
          >
            {isAr ? 'حجز موعد إضافي' : 'Book Another Appointment'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleBook} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Doctor Selection (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Specialties Picker */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                {isAr ? '1. اختر التخصص الطبي المطلوب:' : '1. Select Medical Department:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPECIALTIES.map((spec) => {
                  const isSelected = selectedSpecialty === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => setSelectedSpecialty(spec.id)}
                      className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold ring-2 ring-teal-500/20'
                          : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">
                        {isAr ? spec.nameAr : spec.nameEn}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        {isAr ? spec.descriptionAr : spec.descriptionEn}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Doctors List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isAr ? '2. اختر الطبيب الاستشاري:' : '2. Select Consultant Doctor:'}
              </label>

              <div className="space-y-3">
                {DOCTORS.map((doc) => {
                  const isSelected = selectedDoctor.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'bg-teal-50/60 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={doc.avatar}
                          alt={doc.nameAr}
                          className="w-13 h-13 rounded-2xl object-cover shadow-xs border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {isAr ? doc.nameAr : doc.nameEn}
                            </h4>
                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {doc.rating}
                            </span>
                          </div>
                          <p className="text-xs text-teal-700 font-semibold mt-0.5">
                            {isAr ? doc.specialtyAr : doc.specialtyEn}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>{isAr ? `خبرة ${doc.experienceYears} عاماً` : `${doc.experienceYears} yrs exp`}</span>
                            <span>•</span>
                            <span>{doc.clinicRoom}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        <div className="text-sm font-black text-slate-900">
                          {doc.consultationFee} <span className="text-[10px] font-normal text-slate-500">ر.س</span>
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 ${
                            isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isSelected ? (isAr ? 'تم الاختيار' : 'Selected') : (isAr ? 'اختيار' : 'Select')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Date, Time & Patient Info (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Slot & Info Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isAr ? '3. الموعد والوقت المناسب:' : '3. Schedule & Patient Info:'}
              </label>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isAr ? 'تاريخ الموعد:' : 'Appointment Date:'}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min="2026-03-09"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                  />
                </div>
              </div>

              {/* Available Time Slots */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {isAr ? 'الأوقات المتاحة:' : 'Available Slots:'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Patient Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isAr ? 'اسم المريض الثلاثي:' : 'Patient Full Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isAr ? 'رقم الهاتف للتأكيد (WhatsApp / SMS):' : 'Phone Number:'}
                </label>
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium font-mono"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isAr ? 'سبب الزيارة أو الشكوى الرئيسية:' : 'Reason for Visit:'}
                </label>
                <textarea
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm shadow-md shadow-teal-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>{isAr ? 'تأكيد وحجز الموعد الآن' : 'Confirm Appointment'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
