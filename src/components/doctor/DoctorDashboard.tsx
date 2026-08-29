import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Calendar,
  MessageSquare,
  FileText,
  Pill,
  Users,
  CheckCircle2,
  Eye,
  Send,
  Search,
  Activity,
  Paperclip,
  Download
} from 'lucide-react';

import {
  Doctor,
  Appointment,
  Consultation,
  Patient
} from '../../types/medical';

import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ConsultationReplyModal } from './ConsultationReplyModal';
import { CreateMedicalReportModal } from './CreateMedicalReportModal';
import { CreatePrescriptionModal } from './CreatePrescriptionModal';
import { PatientFileModal } from './PatientFileModal';
import { ScheduleFollowUpModal } from './ScheduleFollowUpModal';
import { MedicalTimeline } from '../patient/MedicalTimeline';

interface DoctorDashboardProps {
  initialTab?: 'CONSULTATIONS' | 'APPOINTMENTS' | 'PATIENTS' | 'TIMELINE';
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  initialTab = 'CONSULTATIONS'
}) => {
  const { doctorProfile, user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    doctorProfile?.id || 'doc-1'
  );

  const [activeTab, setActiveTab] =
    useState<
      'CONSULTATIONS' | 'APPOINTMENTS' | 'PATIENTS' | 'TIMELINE'
    >(initialTab);

  const [selectedPatientForTimeline, setSelectedPatientForTimeline] =
    useState<string>('pat-1');

  const [selectedPatientForFileModal, setSelectedPatientForFileModal] =
    useState<string | null>(null);

  const [selectedPatientFileTab, setSelectedPatientFileTab] =
    useState<
      | 'OVERVIEW'
      | 'REPORTS'
      | 'TESTS'
      | 'PRESCRIPTIONS'
      | 'EXAMINATIONS'
      | 'CONSULTATIONS'
      | 'TIMELINE'
    >('OVERVIEW');

  const [
    selectedConsultationForReply,
    setSelectedConsultationForReply
  ] = useState<Consultation | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] =
    useState<boolean>(false);

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] =
    useState<boolean>(false);

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] =
    useState<boolean>(false);

  const [targetPatientInfo, setTargetPatientInfo] = useState<{
    id: string;
    name?: string;
    mrn?: string;
  }>({
    id: 'pat-1'
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ==========================================================
  // SAFE HELPERS
  // ==========================================================

  const safeArray = <T,>(
    value: T[] | null | undefined
  ): T[] => {
    return Array.isArray(value) ? value : [];
  };

  const safeText = (
    value: unknown,
    fallback = ''
  ): string => {
    return typeof value === 'string' ? value : fallback;
  };

  const normalizeConsultation = (
    consultation: Consultation
  ): Consultation => {
    const rawStatus = consultation?.status;

    let normalizedStatus: Consultation['status'];

    if (rawStatus === 'ANSWERED') {
      normalizedStatus = 'ANSWERED';
    } else if (rawStatus === 'CLOSED') {
      normalizedStatus = 'CLOSED';
    } else {
      normalizedStatus = 'PENDING';
    }

    return {
      ...consultation,
      status: normalizedStatus,
      patientName: safeText(
        consultation.patientName,
        'المريض'
      ),
      patientMrn: safeText(
        consultation.patientMrn,
        ''
      ),
      problemDescription: safeText(
        consultation.problemDescription,
        ''
      ),
      title: safeText(
        consultation.title,
        'استشارة طبية'
      ),
      doctorName: safeText(
        consultation.doctorName,
        ''
      ),
      doctorSpecialty: safeText(
        consultation.doctorSpecialty,
        ''
      ),
      symptoms: safeArray(
        consultation.symptoms
      ),
      messages: safeArray(
        consultation.messages
      ),
      attachments: safeArray(
        consultation.attachments
      )
    };
  };

  // ==========================================================
  // CONSULTATION STATUS
  // ==========================================================

  const getConsultationStatus = (
    status?: Consultation['status']
  ) => {
    switch (status) {
      case 'ANSWERED':
        return {
          label: 'تم الرد',
          className:
            'bg-emerald-100 text-emerald-800 border border-emerald-200',
          isAnswered: true
        };

      case 'CLOSED':
        return {
          label: 'مغلقة',
          className:
            'bg-slate-100 text-slate-700 border border-slate-200',
          isAnswered: true
        };

      case 'PENDING':
      default:
        return {
          label: 'قيد الانتظار',
          className:
            'bg-amber-100 text-amber-800 border border-amber-200',
          isAnswered: false
        };
    }
  };

  // ==========================================================
  // INITIAL TAB
  // ==========================================================

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // ==========================================================
  // LOAD DOCTORS
  // ==========================================================

  useEffect(() => {
    api
      .getDoctors(undefined, true)
      .then((docs) => {
        const safeDoctors = Array.isArray(docs)
          ? docs
          : [];

        setAllDoctors(safeDoctors);

        if (doctorProfile?.id) {
          setSelectedDoctorId(doctorProfile.id);
        } else if (
          safeDoctors.length > 0 &&
          (!selectedDoctorId || selectedDoctorId === 'doc-1')
        ) {
          setSelectedDoctorId(
            safeDoctors[0].id
          );
        }
      })
      .catch((error) => {
        console.error(
          'Doctor list load error:',
          error
        );
        setAllDoctors([]);
      });
  }, [doctorProfile?.id]);

  // ==========================================================
  // ACTIVE DOCTOR
  // ==========================================================

  const activeDoctor =
    allDoctors.find(
      (doctor) =>
        doctor.id === selectedDoctorId ||
        doctor.userId === selectedDoctorId
    ) ||
    doctorProfile ||
    allDoctors[0];

  const currentDoctorId =
    activeDoctor?.id ||
    selectedDoctorId ||
    'doc-1';

  // ==========================================================
  // LOAD DOCTOR DATA + REALTIME
  // ==========================================================

  useEffect(() => {
    loadDoctorData();

    const unsubApts = api.subscribeAppointments(
      { doctorId: currentDoctorId },
      (liveApts) => {
        if (!Array.isArray(liveApts)) {
          setAppointments([]);
          return;
        }

        const filtered = liveApts.filter(
          (appointment) =>
            appointment.doctorId === currentDoctorId ||
            (
              activeDoctor &&
              appointment.doctorName &&
              appointment.doctorName.includes(
                activeDoctor.fullName
              )
            )
        );

        setAppointments(filtered);
      }
    );

    const unsubCns = api.subscribeConsultations(
      { doctorId: currentDoctorId },
      (liveCns) => {
        if (!Array.isArray(liveCns)) {
          setConsultations([]);
          return;
        }

        const normalizedConsultations =
          liveCns.map(
            normalizeConsultation
          );

        const filtered =
          normalizedConsultations.filter(
            (consultation) =>
              consultation.doctorId ===
                currentDoctorId ||
              (
                activeDoctor &&
                consultation.doctorName &&
                consultation.doctorName.includes(
                  activeDoctor.fullName
                )
              )
          );

        setConsultations(filtered);
      }
    );

    return () => {
      unsubApts();
      unsubCns();
    };
  }, [
    currentDoctorId,
    activeDoctor?.fullName
  ]);

  // ==========================================================
  // LOAD DOCTOR DATA
  // ==========================================================

  const loadDoctorData = async () => {
    setIsLoading(true);

    try {
      const [
        aptRes,
        cnsRes,
        patRes
      ] = await Promise.all([
        api.getAppointments({
          doctorId: currentDoctorId
        }),
        api.getConsultations({
          doctorId: currentDoctorId
        }),
        api.getPatients()
      ]);

      // ------------------------------------------------------
      // Appointments
      // ------------------------------------------------------

      const filteredApts = (
        Array.isArray(aptRes)
          ? aptRes
          : []
      ).filter(
        (appointment) =>
          appointment.doctorId ===
            currentDoctorId ||
          (
            activeDoctor &&
            appointment.doctorName &&
            appointment.doctorName.includes(
              activeDoctor.fullName
            )
          )
      );

      // ------------------------------------------------------
      // Consultations
      // ------------------------------------------------------

      const normalizedCns = (
        Array.isArray(cnsRes)
          ? cnsRes
          : []
      ).map(
        normalizeConsultation
      );

      const filteredCns =
        normalizedCns.filter(
          (consultation) =>
            consultation.doctorId ===
              currentDoctorId ||
            (
              activeDoctor &&
              consultation.doctorName &&
              consultation.doctorName.includes(
                activeDoctor.fullName
              )
            )
        );

      // ------------------------------------------------------
      // Patients
      // ------------------------------------------------------

      const safePatients = (
        Array.isArray(patRes)
          ? patRes
          : []
      ).map((patient) => ({
        ...patient,

        fullName: safeText(
          patient.fullName,
          'المريض'
        ),

        mrn: safeText(
          patient.mrn,
          ''
        ),

        phone: safeText(
          patient.phone,
          ''
        ),

        bloodType: safeText(
          patient.bloodType,
          ''
        ),

        allergies: safeArray(
          patient.allergies
        ),

        chronicDiseases: safeArray(
          patient.chronicDiseases
        )
      }));

      setAppointments(
        filteredApts
      );

      setConsultations(
        filteredCns
      );

      setPatients(
        safePatients
      );
    } catch (error) {
      console.error(
        'Doctor data load error:',
        error
      );

      setAppointments([]);
      setConsultations([]);
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================
  // COUNTERS
  // ==========================================================

  const pendingConsultations =
    consultations.filter(
      (consultation) =>
        consultation.status !==
          'ANSWERED' &&
        consultation.status !==
          'CLOSED'
    );

  const answeredConsultations =
    consultations.filter(
      (consultation) =>
        consultation.status ===
        'ANSWERED'
    );

  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredPatients =
    patients.filter((patient) => {
      if (!searchQuery) {
        return true;
      }

      const q =
        searchQuery
          .trim()
          .toLowerCase();

      const fullName =
        safeText(
          patient.fullName
        ).toLowerCase();

      const mrn =
        safeText(
          patient.mrn
        ).toLowerCase();

      const phone =
        safeText(
          patient.phone
        );

      return (
        fullName.includes(q) ||
        mrn.includes(q) ||
        phone.includes(q)
      );
    });

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6 text-start">

      {/* =====================================================
          DOCTOR HEADER
      ====================================================== */}

      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">

        <div className="flex items-center gap-4">

          <img
            src={
              activeDoctor?.avatar ||
              doctorProfile?.avatar ||
              'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
            }
            alt={
              activeDoctor?.fullName ||
              'د. الطبيب'
            }
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-300/40 shadow-md"
          />

          <div>

            <div className="flex flex-wrap items-center gap-2 mb-1">

              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {activeDoctor?.fullName ||
                  doctorProfile?.fullName ||
                  user?.fullName ||
                  'الطبيب'}
              </h1>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                {activeDoctor?.title ||
                  doctorProfile?.title ||
                  'طبيب استشاري'}
              </span>

            </div>

            <p className="text-xs sm:text-sm text-emerald-100 font-medium">

              التخصص:{' '}

              <strong>
                {activeDoctor?.specialtyNameAr ||
                  doctorProfile?.specialtyNameAr ||
                  'غير محدد'}
              </strong>

              {' | '}

              العيادة:{' '}

              <strong>
                {activeDoctor?.roomNumber ||
                  doctorProfile?.roomNumber ||
                  'عيادة رقم 104'}
              </strong>

            </p>

            <p className="text-xs text-emerald-200/80 mt-1">

              أيام الاستقبال:{' '}

              {Array.isArray(
                activeDoctor?.availableDays
              )
                ? activeDoctor.availableDays.join(
                    '، '
                  )
                : 'الأحد - الخميس'}

              {' ('}

              {activeDoctor?.availableHours ||
                '09:00 ص - 05:00 م'}

              {')'}

            </p>

          </div>
        </div>

        {/* ===================================================
            ACTION BUTTONS
        ==================================================== */}

        <div className="flex flex-wrap items-center gap-2.5">

        

          <button
            onClick={() => {
              setTargetPatientInfo({
                id: 'pat-1',
                name: 'سارة خالد المنصور',
                mrn: 'MRN-2026-8801'
              });

              setIsPrescriptionModalOpen(
                true
              );
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Pill className="w-4 h-4" />
            <span>
              إصدار وصفة طبية
            </span>
          </button>

          <button
            onClick={() => {
              setTargetPatientInfo({
                id: 'pat-1',
                name: 'سارة خالد المنصور',
                mrn: 'MRN-2026-8801'
              });

              setIsReportModalOpen(
                true
              );
            }}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-emerald-900 font-bold text-xs sm:text-sm transition-all shadow-md shadow-black/10 flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-700" />

            <span>
              كتابة تقرير معتمد
            </span>
          </button>

        </div>
      </div>

      {/* =====================================================
          KPI
      ====================================================== */}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">

          <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
            <MessageSquare className="w-5 h-5" />
          </div>

          <div>

            <span className="text-xs text-slate-500 block">
              استشارات بالانتظار
            </span>

            <strong className="text-lg font-black text-slate-900">
              {pendingConsultations.length}
            </strong>

          </div>

        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">

          <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
            <Calendar className="w-5 h-5" />
          </div>

          <div>

            <span className="text-xs text-slate-500 block">
              مواعيد العيادة
            </span>

            <strong className="text-lg font-black text-slate-900">
              {appointments.length}
            </strong>

          </div>

        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">

          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div>

            <span className="text-xs text-slate-500 block">
              استشارات مكتملة
            </span>

            <strong className="text-lg font-black text-slate-900">
              {answeredConsultations.length}
            </strong>

          </div>

        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">

          <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
            <Users className="w-5 h-5" />
          </div>

          <div>

            <span className="text-xs text-slate-500 block">
              إجمالي المرضى
            </span>

            <strong className="text-lg font-black text-slate-900">
              {patients.length}
            </strong>

          </div>

        </div>

      </div>

      {/* =====================================================
          TABS
      ====================================================== */}

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">

        <button
          onClick={() =>
            setActiveTab('CONSULTATIONS')
          }
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'CONSULTATIONS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />

          <span>
            طابور الاستشارات الطبية (
            {pendingConsultations.length}
            )
          </span>
        </button>

        <button
          onClick={() =>
            setActiveTab('APPOINTMENTS')
          }
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'APPOINTMENTS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />

          <span>
            جدول مواعيد العيادة (
            {appointments.length}
            )
          </span>
        </button>

        <button
          onClick={() =>
            setActiveTab('PATIENTS')
          }
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PATIENTS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />

          <span>
            ملفات المرضى
          </span>
        </button>

        <button
          onClick={() =>
            setActiveTab('TIMELINE')
          }
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'TIMELINE'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />

          <span>
            السجل الزمني للمريض
          </span>
        </button>

      </div>

      {/* =====================================================
          CONSULTATIONS
      ====================================================== */}

      {activeTab === 'CONSULTATIONS' && (

        <div className="space-y-4">

          <div className="flex items-center justify-between gap-3">

            <h3 className="font-extrabold text-slate-900 text-sm">
              طلبات الاستشارات الواردة للعيادة
            </h3>

            <span className="text-xs text-slate-500">
              قم بالرد على استفسار المريض أو تحديد الحاجة لمعاينة حضورية
            </span>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {consultations.length === 0 ? (

              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center">

                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-3" />

                <p className="font-bold text-slate-700">
                  لا توجد استشارات حالياً
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  ستظهر الاستشارات الجديدة هنا.
                </p>

              </div>

            ) : (

              consultations.map((cns) => {

                const consultationStatus =
                  getConsultationStatus(
                    cns.status
                  );

                const safeSymptoms =
                  safeArray(
                    cns.symptoms
                  );

                return (

                  <div
                    key={cns.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      !consultationStatus.isAnswered
                        ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >

                    <div>

                      <div className="flex items-start justify-between gap-2 mb-3">

                        <div className="flex items-center gap-2 min-w-0">

                          <span className="font-bold text-slate-900 text-sm truncate">
                            {safeText(
                              cns.patientName,
                              'المريض'
                            )}
                          </span>

                          <span className="text-xs text-slate-400 font-mono">
                            (
                            {safeText(
                              cns.patientMrn,
                              ''
                            )}
                            )
                          </span>

                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">

                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              cns.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {cns.paymentStatus ===
                            'PAID'
                              ? 'رسوم مسددة ✓'
                              : 'بانتظار السداد'}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${consultationStatus.className}`}
                          >
                            {
                              consultationStatus.label
                            }
                          </span>

                        </div>

                      </div>

                      <h4 className="font-extrabold text-sm text-emerald-950 mb-1.5">
                        {safeText(
                          cns.title,
                          'استشارة طبية'
                        )}
                      </h4>

                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                        {safeText(
                          cns.problemDescription,
                          'لا توجد تفاصيل إضافية.'
                        )}
                      </p>

                      {safeSymptoms.length >
                        0 && (

                        <div className="flex flex-wrap items-center gap-1.5 mb-3">

                          <span className="text-[11px] text-slate-400">
                            الأعراض:
                          </span>

                          {safeSymptoms.map(
                            (
                              symptom,
                              index
                            ) => (

                              <span
                                key={index}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]"
                              >
                                {
                                  String(
                                    symptom
                                  )
                                }
                              </span>

                            )
                          )}

                        </div>

                      )}

                      {cns.attachments && Array.isArray(cns.attachments) && cns.attachments.length > 0 && (
                        <div className="mb-3 p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-100 space-y-1.5">
                          <span className="text-[11px] font-bold text-cyan-900 flex items-center gap-1">
                            <Paperclip className="w-3 h-3 text-cyan-600 shrink-0" />
                            الملفات والمرفقات الطبية ({cns.attachments.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {cns.attachments.map((att: any, attIdx: number) => {
                              const hasValidUrl = att && att.url && att.url !== '#' && att.url !== '';
                              return (
                                <a
                                  key={attIdx}
                                  href={hasValidUrl ? att.url : undefined}
                                  download={att.name || `file-${attIdx + 1}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!hasValidUrl) {
                                      e.preventDefault();
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-100 border border-cyan-200 text-cyan-900 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                  title={hasValidUrl ? 'انقر لتنزيل أو فتح الملف' : 'ملف مرفق'}
                                >
                                  <FileText className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                                  <span className="truncate max-w-[150px]">{att.name || 'ملف مرفق'}</span>
                                  {att.size && <span className="text-[10px] text-cyan-600 font-normal">({att.size})</span>}
                                  {hasValidUrl && <Download className="w-3 h-3 text-cyan-600 shrink-0" />}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {cns.doctorAdvice && (

                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 mb-3">

                          <strong className="block text-emerald-900 mb-0.5">
                            ردك السابق:
                          </strong>

                          {cns.doctorAdvice}

                        </div>

                      )}

                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">

                      <button
                        onClick={() => {

                          setSelectedPatientForFileModal(
                            cns.patientId
                          );

                          setSelectedPatientFileTab(
                            'OVERVIEW'
                          );

                        }}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />

                        <span>
                          ملف المريض الشامل
                        </span>
                      </button>

                      <button
                        onClick={() =>
                          setSelectedConsultationForReply(
                            cns
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />

                        <span>
                          {consultationStatus.isAnswered
                            ? 'تعديل الرد'
                            : 'كتابة الرد الطبي'}
                        </span>
                      </button>

                    </div>

                  </div>

                );
              })

            )}

          </div>

        </div>

      )}

      {/* =====================================================
          APPOINTMENTS
      ====================================================== */}

      {activeTab === 'APPOINTMENTS' && (

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">

          <div className="flex items-center justify-between">

            <h3 className="font-extrabold text-slate-900 text-sm">
              قائمة مواعيد الكشف الطبي المحجوزة
            </h3>

            <span className="text-xs text-slate-500">
              منسقة عبر قسم خدمة العملاء
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-xs text-start">

              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">

                <tr>
                  <th className="p-3">المريض</th>
                  <th className="p-3">
                    رقم الملف (MRN)
                  </th>
                  <th className="p-3">
                    التاريخ والوقت
                  </th>
                  <th className="p-3">
                    سبب الزيارة
                  </th>
                  <th className="p-3">
                    حالة الدفع
                  </th>
                  <th className="p-3">
                    حالة الموعد
                  </th>
                  <th className="p-3 text-center">
                    الإجراءات والملفات
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {appointments.map(
                  (apt) => (

                    <tr
                      key={apt.id}
                      className="hover:bg-slate-50/80"
                    >

                      <td className="p-3 font-bold text-slate-900">
                        {safeText(
                          apt.patientName,
                          'المريض'
                        )}
                      </td>

                      <td className="p-3 font-mono text-slate-600">
                        {safeText(
                          apt.patientMrn,
                          ''
                        )}
                      </td>

                      <td className="p-3">

                        <strong>
                          {apt.confirmedDate ||
                            apt.preferredDate ||
                            'غير محدد'}
                        </strong>

                        <span className="block text-[11px] text-slate-400 font-medium">
                          {apt.confirmedTime ||
                            (
                              apt.preferredPeriod ===
                              'MORNING'
                                ? 'صباحاً'
                                : 'مساءً'
                            )}
                        </span>

                      </td>

                      <td className="p-3 text-slate-600 max-w-xs">
                        {safeText(
                          apt.reason,
                          'استشارة وفحص طبي'
                        )}
                      </td>

                      <td className="p-3">

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            apt.paymentStatus ===
                            'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {apt.paymentStatus ===
                          'PAID'
                            ? 'تم الدفع ✓'
                            : 'بانتظار السداد'}
                        </span>

                      </td>

                      <td className="p-3">

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            apt.status ===
                            'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {apt.status ===
                          'CONFIRMED'
                            ? 'مؤكد'
                            : 'قيد التنسيق'}
                        </span>

                      </td>

                      <td className="p-3 text-center space-x-1 space-x-reverse">

                        <button
                          onClick={() => {

                            setSelectedPatientForFileModal(
                              apt.patientId
                            );

                            setSelectedPatientFileTab(
                              'OVERVIEW'
                            );

                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 cursor-pointer"
                        >
                          الملف
                        </button>

                        <button
                          onClick={() => {

                            setTargetPatientInfo({
                              id: apt.patientId,
                              name: apt.patientName,
                              mrn: apt.patientMrn
                            });

                            setIsFollowUpModalOpen(
                              true
                            );

                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 cursor-pointer"
                        >
                          جدولة مراجعة
                        </button>

                        <button
                          onClick={() => {

                            setTargetPatientInfo({
                              id: apt.patientId,
                              name: apt.patientName,
                              mrn: apt.patientMrn
                            });

                            setIsPrescriptionModalOpen(
                              true
                            );

                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 cursor-pointer"
                        >
                          وصفة
                        </button>

                        <button
                          onClick={() => {

                            setTargetPatientInfo({
                              id: apt.patientId,
                              name: apt.patientName,
                              mrn: apt.patientMrn
                            });

                            setIsReportModalOpen(
                              true
                            );

                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 cursor-pointer"
                        >
                          تقرير
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      )}

      {/* =====================================================
          PATIENTS
      ====================================================== */}

      {activeTab === 'PATIENTS' && (

        <div className="space-y-4">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">

            <h3 className="font-extrabold text-slate-900 text-sm">
              دليل وملفات المرضى المسجلين بالمستشفى
            </h3>

            <div className="relative w-full sm:w-72">

              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                placeholder="بحث بالاسم أو الهاتف أو MRN..."
                className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />

            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {filteredPatients.map(
              (patient) => {

                const chronicDiseases =
                  safeArray(
                    patient.chronicDiseases
                  );

                const allergies =
                  safeArray(
                    patient.allergies
                  );

                return (

                  <div
                    key={patient.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5 hover:border-emerald-400 transition-all flex flex-col justify-between"
                  >

                    <div>

                      <div className="flex items-center gap-3">

                        <img
                          src={
                            patient.avatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              safeText(
                                patient.fullName,
                                'patient'
                              )
                            )}`
                          }
                          alt={safeText(
                            patient.fullName,
                            'المريض'
                          )}
                          className="w-13 h-13 rounded-2xl object-cover border border-slate-200"
                        />

                        <div>

                          <h4 className="font-extrabold text-sm text-slate-900">
                            {safeText(
                              patient.fullName,
                              'المريض'
                            )}
                          </h4>

                          <span className="font-mono text-[11px] text-blue-700 font-bold">
                            {safeText(
                              patient.mrn,
                              'غير محدد'
                            )}
                          </span>

                          <p className="text-slate-500 text-[11px] font-mono">
                            {safeText(
                              patient.phone,
                              ''
                            )}
                          </p>

                        </div>

                      </div>

                      <div className="p-3 mt-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1.5 text-slate-700">

                        <p>
                          <strong>
                            فصيلة الدم:
                          </strong>{' '}

                          <span className="text-rose-700 font-bold">
                            {safeText(
                              patient.bloodType,
                              'غير محدد'
                            )}
                          </span>
                        </p>

                        <p className="truncate">
                          <strong>
                            الأمراض المزمنة:
                          </strong>{' '}

                          {chronicDiseases.length >
                          0
                            ? chronicDiseases.join(
                                '، '
                              )
                            : 'لا يوجد'}
                        </p>

                        <p className="truncate">
                          <strong>
                            الحساسية:
                          </strong>{' '}

                          {allergies.length >
                          0
                            ? allergies.join(
                                '، '
                              )
                            : 'لا يوجد'}
                        </p>

                      </div>

                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">

                      <button
                        onClick={() => {

                          setSelectedPatientForFileModal(
                            patient.id
                          );

                          setSelectedPatientFileTab(
                            'OVERVIEW'
                          );

                        }}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />

                        <span>
                          عرض وتصفح ملف المريض الشامل
                        </span>
                      </button>

                      <div className="flex items-center justify-between gap-1.5">

                        <button
                          onClick={() => {

                            setSelectedPatientForTimeline(
                              patient.id
                            );

                            setActiveTab(
                              'TIMELINE'
                            );

                          }}
                          className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          السجل الزمني
                        </button>

                        <button
                          onClick={() => {

                            setTargetPatientInfo({
                              id: patient.id,
                              name: patient.fullName,
                              mrn: patient.mrn
                            });

                            setIsPrescriptionModalOpen(
                              true
                            );

                          }}
                          className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 cursor-pointer"
                          title="كتابة وصفة طبية"
                        >
                          <Pill className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {

                            setTargetPatientInfo({
                              id: patient.id,
                              name: patient.fullName,
                              mrn: patient.mrn
                            });

                            setIsReportModalOpen(
                              true
                            );

                          }}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 cursor-pointer"
                          title="كتابة تقرير معتمد"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                      </div>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        </div>

      )}

      {/* =====================================================
          TIMELINE
      ====================================================== */}

      {activeTab === 'TIMELINE' && (

        <div className="space-y-4">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">

            <div className="flex items-center gap-3">

              <Activity className="w-5 h-5 text-emerald-600" />

              <h3 className="font-bold text-slate-900 text-sm">
                استعراض السجل الزمني للمريض
              </h3>

            </div>

            <div className="flex items-center gap-2">

              <select
                value={selectedPatientForTimeline}
                onChange={(e) =>
                  setSelectedPatientForTimeline(
                    e.target.value
                  )
                }
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800"
              >

                {patients.map(
                  (patient) => (

                    <option
                      key={patient.id}
                      value={patient.id}
                    >
                      {safeText(
                        patient.fullName,
                        'المريض'
                      )}{' '}
                      (
                      {safeText(
                        patient.mrn,
                        ''
                      )}
                      )
                    </option>

                  )
                )}

              </select>

              <button
                onClick={() => {

                  setSelectedPatientForFileModal(
                    selectedPatientForTimeline
                  );

                  setSelectedPatientFileTab(
                    'OVERVIEW'
                  );

                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />

                <span>
                  فتح الملف الشامل
                </span>
              </button>

            </div>

          </div>

          <MedicalTimeline
            patientId={
              selectedPatientForTimeline
            }
            onOpenBooking={() =>
              setActiveTab(
                'APPOINTMENTS'
              )
            }
          />

        </div>

      )}

      {/* =====================================================
          PATIENT FILE MODAL
      ====================================================== */}

      <PatientFileModal
        isOpen={
          !!selectedPatientForFileModal
        }
        onClose={() =>
          setSelectedPatientForFileModal(
            null
          )
        }
        patientId={
          selectedPatientForFileModal ||
          'pat-1'
        }
        initialTab={
          selectedPatientFileTab
        }
        onOpenNewPrescription={(
          patient
        ) => {

          setTargetPatientInfo({
            id: patient.id,
            name: patient.fullName,
            mrn: patient.mrn
          });

          setIsPrescriptionModalOpen(
            true
          );

        }}
        onOpenNewReport={(
          patient
        ) => {

          setTargetPatientInfo({
            id: patient.id,
            name: patient.fullName,
            mrn: patient.mrn
          });

          setIsReportModalOpen(
            true
          );

        }}
      />

      {/* =====================================================
          CONSULTATION REPLY MODAL
      ====================================================== */}

      <ConsultationReplyModal
        isOpen={
          !!selectedConsultationForReply
        }
        onClose={() =>
          setSelectedConsultationForReply(
            null
          )
        }
        consultation={
          selectedConsultationForReply
        }
        onSuccess={async () => {

          setSelectedConsultationForReply(
            null
          );

          await loadDoctorData();

        }}
      />

      {/* =====================================================
          REPORT MODAL
      ====================================================== */}

      <CreateMedicalReportModal
        isOpen={
          isReportModalOpen
        }
        onClose={() =>
          setIsReportModalOpen(
            false
          )
        }
        onSuccess={
          loadDoctorData
        }
        targetPatientId={
          targetPatientInfo.id
        }
        targetPatientName={
          targetPatientInfo.name
        }
        targetPatientMrn={
          targetPatientInfo.mrn
        }
      />

      {/* =====================================================
          PRESCRIPTION MODAL
      ====================================================== */}

      <CreatePrescriptionModal
        isOpen={
          isPrescriptionModalOpen
        }
        onClose={() =>
          setIsPrescriptionModalOpen(
            false
          )
        }
        onSuccess={
          loadDoctorData
        }
        targetPatientId={
          targetPatientInfo.id
        }
        targetPatientName={
          targetPatientInfo.name
        }
        targetPatientMrn={
          targetPatientInfo.mrn
        }
      />

      {/* =====================================================
          FOLLOW UP MODAL
      ====================================================== */}

      <ScheduleFollowUpModal
        isOpen={
          isFollowUpModalOpen
        }
        onClose={() =>
          setIsFollowUpModalOpen(
            false
          )
        }
        onSuccess={
          loadDoctorData
        }
        patientId={
          targetPatientInfo.id
        }
        patientName={
          targetPatientInfo.name ||
          'المريض'
        }
        doctorId={
          currentDoctorId
        }
        doctorName={
          activeDoctor?.fullName ||
          'د. الاستشاري المعالج'
        }
        doctorSpecialty={
          activeDoctor?.specialtyNameAr ||
          'العيادات التخصصية'
        }
      />

    </div>
  );
};