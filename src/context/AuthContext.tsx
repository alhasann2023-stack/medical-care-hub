
import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser
} from 'firebase/auth';

import {
  auth
} from '../services/firebase';

import {
  firebaseDb
} from '../services/firebaseDb';

import {
  getUserByUid,
  getUserByEmailOrPhone,
  getPatientByUserId,
  getDoctorByUserId,
  subscribeToDoc,
  subscribeToUser,
  FIRESTORE_COLLECTIONS
} from '../services/firebase';

import {
  User,
  Patient,
  Doctor,
  Staff,
  UserRole
} from '../types/medical';

import {
  api
} from '../services/api';


// ============================================================
// ADMIN EMAILS
// ============================================================

export const ADMIN_EMAILS = [
  'alhasann2023@gmail.com',
  'nashwann91@gmail.com'
];

export const ADMIN_PHONES = [
  '776458925'
];


// ============================================================
// ADMIN HELPERS
// ============================================================

export const isAdminPhone = (
  phone?: string | null
): boolean => {

  if (!phone) {
    return false;
  }

  const clean =
    String(phone).trim();

  const digits =
    clean.replace(
      /[^0-9]/g,
      ''
    );

  return (
    digits === '776458925' ||
    digits.endsWith('776458925') ||
    clean.includes('776458925')
  );
};


export const isAdminEmail = (
  email?: string | null
): boolean => {

  if (!email) {
    return false;
  }

  const clean =
    String(email)
      .trim()
      .toLowerCase();

  return ADMIN_EMAILS.includes(
    clean
  );
};


// ============================================================
// Auth Context Types
// ============================================================

interface AuthContextType {

  user:
    User | null;

  uid:
    string | null;

  role:
    UserRole | null;

  patientProfile:
    Patient | null;

  doctorProfile:
    Doctor | null;

  staffProfile:
    Staff | null;

  firebaseUser:
    FirebaseUser | null;

  isAuthenticated:
    boolean;

  isLoading:
    boolean;

  login:
    (
      emailOrPhone: string,
      password?: string
    ) => Promise<void>;

  register:
    (
      data: any
    ) => Promise<void>;

  loginWithGoogle:
    (
      roleHint?: UserRole
    ) => Promise<void>;

  linkGoogleAccountWithPassword:
    (
      email: string,
      password: string
    ) => Promise<void>;

  logout:
    () => Promise<void>;

  switchRole:
    (
      role: UserRole,
      userId?: string
    ) => Promise<void>;

  refreshProfile:
    () => Promise<void>;
}


// ============================================================
// Context
// ============================================================

const AuthContext =
  createContext<
    AuthContextType | undefined
  >(undefined);


// ============================================================
// Local Storage
// ============================================================

const AUTH_STORAGE_KEY =
  'mch_auth_session';


// ============================================================
// Session Types
// ============================================================

interface StoredSession {

  userId?: string;

  email?: string;

  phone?: string;

  user?: User;

  authType?:
    | 'firebase'
    | 'backend'
    | 'google'
    | 'demo';
}


// ============================================================
// Auth Provider
// ============================================================

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {

  const [
    user,
    setUser
  ] = useState<User | null>(
    null
  );


  const [
    firebaseUser,
    setFirebaseUser
  ] =
    useState<FirebaseUser | null>(
      null
    );


  const [
    patientProfile,
    setPatientProfile
  ] =
    useState<Patient | null>(
      null
    );


  const [
    doctorProfile,
    setDoctorProfile
  ] =
    useState<Doctor | null>(
      null
    );


  const [
    staffProfile,
    setStaffProfile
  ] =
    useState<Staff | null>(
      null
    );


  const [
    isLoading,
    setIsLoading
  ] =
    useState<boolean>(
      true
    );


  // ==========================================================
  // Current UID
  // ==========================================================

  const currentUid =
    firebaseUser?.uid ||
    user?.id ||
    null;


  // ==========================================================
  // Clear Profiles
  // ==========================================================

  const clearProfiles = () => {

    setPatientProfile(
      null
    );

    setDoctorProfile(
      null
    );

    setStaffProfile(
      null
    );
  };


  // ==========================================================
  // Save Session
  // ==========================================================

  const saveSession = (
    currentUser: User,
    authType:
      | 'firebase'
      | 'backend'
      | 'google'
      | 'demo'
  ) => {

    try {

      const session:
        StoredSession = {

        userId:
          currentUser.id,

        email:
          currentUser.email ||
          '',

        phone:
          currentUser.phone ||
          '',

        user:
          currentUser,

        authType
      };


      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(
          session
        )
      );

    } catch (
      error
    ) {

      console.warn(
        'Could not save auth session:',
        error
      );
    }
  };


  // ==========================================================
  // Clear Session
  // ==========================================================

  const clearSession = () => {

    try {

      localStorage.removeItem(
        AUTH_STORAGE_KEY
      );

    } catch {
      // Ignore
    }
  };


  // ==========================================================
  // Normalize Firebase User
  // ==========================================================
  /**
   * Firebase UID هو المعرف الأساسي عندما يكون المستخدم
   * مصادقًا عبر Firebase.
   *
   * هذا يمنع اختلاف:
   *
   * Firestore user.id
   * عن
   * Firebase uid
   */

  const normalizeFirebaseUser = (
    sourceUser: User,
    fbUser: FirebaseUser
  ): User => {

    let normalizedUser:
      User = {

      ...sourceUser,

      id:
        fbUser.uid,

      email:
        fbUser.email ||
        sourceUser.email ||
        '',

      phone:
        sourceUser.phone ||
        fbUser.phoneNumber ||
        '',

      fullName:
        sourceUser.fullName ||
        fbUser.displayName ||
        'مستخدم',

      avatar:
        sourceUser.avatar ||
        fbUser.photoURL ||
        ''
    };


    if (
      isAdminEmail(
        normalizedUser.email
      ) ||
      isAdminPhone(
        normalizedUser.phone
      )
    ) {

      normalizedUser = {

        ...normalizedUser,

        role:
          'HOSPITAL_ADMIN'
      };
    }


    return normalizedUser;
  };


  // ==========================================================
  // Apply User Session
  // ==========================================================

  const applyUserSession =
    async (
      currentUser: User,
      authType:
        | 'firebase'
        | 'backend'
        | 'google'
        | 'demo',
      fbUser?: FirebaseUser | null
    ) => {

      let normalizedUser:
        User = {
        ...currentUser
      };


      // ------------------------------------------------------
      // Firebase UID is authoritative
      // ------------------------------------------------------

      if (
        fbUser
      ) {

        normalizedUser =
          normalizeFirebaseUser(
            normalizedUser,
            fbUser
          );

      } else {

        if (
          isAdminEmail(
            normalizedUser.email
          ) ||
          isAdminPhone(
            normalizedUser.phone
          )
        ) {

          normalizedUser = {

            ...normalizedUser,

            role:
              'HOSPITAL_ADMIN'
          };
        }
      }


      setUser(
        normalizedUser
      );


      if (
        fbUser
      ) {

        setFirebaseUser(
          fbUser
        );
      }


      // ------------------------------------------------------
      // Patient
      // ------------------------------------------------------

      if (
        normalizedUser.role ===
        'PATIENT'
      ) {

        setDoctorProfile(
          null
        );

        setStaffProfile(
          null
        );


        let patient =
          await getPatientByUserId(
            normalizedUser.id
          );


        // محاولة إضافية باستخدام UID
        if (
          !patient &&
          fbUser?.uid &&
          fbUser.uid !== normalizedUser.id
        ) {

          patient =
            await getPatientByUserId(
              fbUser.uid
            );
        }


        setPatientProfile(
          patient || null
        );

        return;
      }


      // ------------------------------------------------------
      // Doctor
      // ------------------------------------------------------

      if (
        normalizedUser.role ===
        'DOCTOR'
      ) {

        setPatientProfile(
          null
        );

        setStaffProfile(
          null
        );


        let doctor =
          await getDoctorByUserId(
            normalizedUser.id
          );


        if (
          !doctor &&
          fbUser?.uid
        ) {

          doctor =
            await getDoctorByUserId(
              fbUser.uid
            );
        }


        setDoctorProfile(
          doctor || null
        );

        return;
      }


      // ------------------------------------------------------
      // Staff / Admin
      // ------------------------------------------------------

      setPatientProfile(
        null
      );

      setDoctorProfile(
        null
      );


      let staff =
        await firebaseDb.getDocument<Staff>(
          FIRESTORE_COLLECTIONS.STAFF,
          normalizedUser.id
        );


      if (
        !staff &&
        fbUser?.uid &&
        fbUser.uid !==
          normalizedUser.id
      ) {

        staff =
          await firebaseDb.getDocument<Staff>(
            FIRESTORE_COLLECTIONS.STAFF,
            fbUser.uid
          );
      }


      if (
        !staff &&
        normalizedUser.role ===
          'HOSPITAL_ADMIN'
      ) {

        staff = {

          id:
            `stf-${normalizedUser.id}`,

          userId:
            normalizedUser.id,

          fullName:
            normalizedUser.fullName ||
            'المدير العام والمسؤول المعتمد',

          department:
            'إدارة المستشفى والعمليات العليا',

          roleTitle:
            'المدير العام والمسؤول المعتمد',

          shift:
            'شامل',

          avatar:
            normalizedUser.avatar,

          phone:
            normalizedUser.phone,

          email:
            normalizedUser.email,

          isActive:
            true,

          createdAt:
            normalizedUser.createdAt ||
            new Date().toISOString()
        };
      }


      setStaffProfile(
        staff || null
      );
    };


  // ==========================================================
  // LINK GOOGLE ACCOUNT TO EMAIL/PASSWORD
  // ==========================================================

  const linkGoogleAccountWithPassword =
    async (
      email: string,
      password: string
    ) => {

      const currentUser =
        auth.currentUser;


      if (
        !currentUser
      ) {

        throw new Error(
          'لا يوجد حساب مسجل الدخول حاليًا.'
        );
      }


      if (
        !currentUser.email
      ) {

        throw new Error(
          'الحساب الحالي لا يحتوي على بريد إلكتروني.'
        );
      }


      const normalizedEmail =
        email
          .trim()
          .toLowerCase();


      const currentEmail =
        currentUser.email
          .trim()
          .toLowerCase();


      if (
        currentEmail !==
        normalizedEmail
      ) {

        throw new Error(
          'البريد الإلكتروني لا يطابق بريد حساب Google الحالي.'
        );
      }


      if (
        !password
      ) {

        throw new Error(
          'كلمة المرور مطلوبة.'
        );
      }


      if (
        password.length < 6
      ) {

        throw new Error(
          'يجب أن تتكون كلمة المرور من 6 أحرف أو أكثر.'
        );
      }


      const credential =
        EmailAuthProvider.credential(
          normalizedEmail,
          password
        );


      try {

        await linkWithCredential(
          currentUser,
          credential
        );


        await currentUser.reload();


        const refreshedUser =
          auth.currentUser;


        setFirebaseUser(
          refreshedUser
        );

      } catch (
        error: any
      ) {

        console.error(
          'Google/Password linking error:',
          error?.code,
          error?.message
        );


        switch (
          error?.code
        ) {

          case 'auth/provider-already-linked':

            return;


          case 'auth/email-already-in-use':

            throw new Error(
              'هذا البريد مرتبط بحساب Firebase آخر.'
            );


          case 'auth/credential-already-in-use':

            throw new Error(
              'بيانات البريد وكلمة المرور مرتبطة بحساب Firebase آخر.'
            );


          case 'auth/weak-password':

            throw new Error(
              'كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.'
            );


          default:

            throw new Error(
              error?.message ||
              'تعذر ربط كلمة المرور بحساب Google.'
            );
        }
      }
    };


  // ==========================================================
  // FIREBASE AUTH LISTENER
  // ==========================================================

  useEffect(() => {

    let unsubscribeUserSnapshot:
      (() => void) | null =
      null;


    let unsubscribeProfileSnapshot:
      (() => void) | null =
      null;


    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        async (
          fbUser
        ) => {

          setFirebaseUser(
            fbUser
          );


          // ==================================================
          // Firebase User موجود
          // ==================================================

          if (
            fbUser
          ) {

            try {

              let userDoc =
                await getUserByUid(
                  fbUser.uid
                );


              if (
                !userDoc &&
                fbUser.email
              ) {

                userDoc =
                  await getUserByEmailOrPhone(
                    fbUser.email
                  );
              }


              if (
                userDoc
              ) {

                const normalizedUser =
                  normalizeFirebaseUser(
                    userDoc,
                    fbUser
                  );


                // حفظ UID الصحيح
                await firebaseDb.saveUser(
                  normalizedUser
                );


                await applyUserSession(
                  normalizedUser,
                  'firebase',
                  fbUser
                );


                unsubscribeUserSnapshot?.();


                unsubscribeUserSnapshot =
                  subscribeToUser(
                    normalizedUser.id,
                    (
                      updatedUser
                    ) => {

                      if (
                        !updatedUser
                      ) {
                        return;
                      }


                      let finalUser:
                        User = {

                        ...updatedUser,

                        id:
                          fbUser.uid,

                        email:
                          fbUser.email ||
                          updatedUser.email ||
                          '',

                        phone:
                          updatedUser.phone ||
                          fbUser.phoneNumber ||
                          ''
                      };


                      if (
                        isAdminEmail(
                          fbUser.email
                        ) ||
                        isAdminPhone(
                          finalUser.phone
                        )
                      ) {

                        finalUser = {

                          ...finalUser,

                          role:
                            'HOSPITAL_ADMIN'
                        };
                      }


                      setUser(
                        finalUser
                      );


                      saveSession(
                        finalUser,
                        fbUser.providerData.some(
                          provider =>
                            provider.providerId ===
                            'google.com'
                        )
                          ? 'google'
                          : 'firebase'
                      );
                    }
                  );


                unsubscribeProfileSnapshot?.();


                if (
                  normalizedUser.role ===
                  'PATIENT'
                ) {

                  const patient =
                    await getPatientByUserId(
                      normalizedUser.id
                    );


                  if (
                    patient
                  ) {

                    setPatientProfile(
                      patient
                    );


                    unsubscribeProfileSnapshot =
                      subscribeToDoc<Patient>(
                        FIRESTORE_COLLECTIONS.PATIENTS,
                        patient.id,
                        (
                          updatedPatient
                        ) => {

                          if (
                            updatedPatient
                          ) {

                            setPatientProfile(
                              updatedPatient
                            );
                          }
                        }
                      );
                  }

                } else if (
                  normalizedUser.role ===
                  'DOCTOR'
                ) {

                  const doctor =
                    await getDoctorByUserId(
                      normalizedUser.id
                    );


                  if (
                    doctor
                  ) {

                    setDoctorProfile(
                      doctor
                    );


                    unsubscribeProfileSnapshot =
                      subscribeToDoc<Doctor>(
                        FIRESTORE_COLLECTIONS.DOCTORS,
                        doctor.id,
                        (
                          updatedDoctor
                        ) => {

                          if (
                            updatedDoctor
                          ) {

                            setDoctorProfile(
                              updatedDoctor
                            );
                          }
                        }
                      );
                  }

                } else {

                  const staff =
                    await firebaseDb.getDocument<Staff>(
                      FIRESTORE_COLLECTIONS.STAFF,
                      normalizedUser.id
                    );


                  setStaffProfile(
                    staff || null
                  );
                }


                saveSession(
                  normalizedUser,
                  fbUser.providerData.some(
                    provider =>
                      provider.providerId ===
                      'google.com'
                  )
                    ? 'google'
                    : 'firebase'
                );


                setIsLoading(
                  false
                );

                return;
              }


              // ------------------------------------------------
              // Firebase account without profile
              // ------------------------------------------------

              console.warn(
                'Firebase account exists but Firestore user profile was not found:',
                {
                  uid:
                    fbUser.uid,

                  email:
                    fbUser.email
                }
              );


              setUser(
                null
              );

              clearProfiles();


            } catch (
              error
            ) {

              console.error(
                'Error loading Firebase user profile:',
                error
              );


              setUser(
                null
              );

              clearProfiles();

            } finally {

              setIsLoading(
                false
              );
            }


            return;
          }


          // ==================================================
          // No Firebase User
          // ==================================================

          try {

            const stored =
              localStorage.getItem(
                AUTH_STORAGE_KEY
              );


            if (
              stored
            ) {

              const parsed:
                StoredSession =
                JSON.parse(
                  stored
                );


              if (
                parsed.user
              ) {

                const restoredUser:
                  User = {
                  ...parsed.user
                };


                if (
                  isAdminEmail(
                    restoredUser.email
                  ) ||
                  isAdminPhone(
                    restoredUser.phone
                  )
                ) {

                  restoredUser.role =
                    'HOSPITAL_ADMIN';
                }


                await applyUserSession(
                  restoredUser,
                  parsed.authType ||
                  'backend'
                );


                setIsLoading(
                  false
                );

                return;
              }


              if (
                parsed.userId
              ) {

                const restoredUser =
                  await getUserByUid(
                    parsed.userId
                  );


                if (
                  restoredUser
                ) {

                  await applyUserSession(
                    restoredUser,
                    parsed.authType ||
                    'backend'
                  );


                  saveSession(
                    restoredUser,
                    parsed.authType ||
                    'backend'
                  );


                  setIsLoading(
                    false
                  );

                  return;
                }
              }


              if (
                parsed.email
              ) {

                const restoredUser =
                  await getUserByEmailOrPhone(
                    parsed.email
                  );


                if (
                  restoredUser
                ) {

                  await applyUserSession(
                    restoredUser,
                    parsed.authType ||
                    'backend'
                  );


                  saveSession(
                    restoredUser,
                    parsed.authType ||
                    'backend'
                  );


                  setIsLoading(
                    false
                  );

                  return;
                }
              }
            }

          } catch (
            error
          ) {

            console.warn(
              'Failed restoring local session:',
              error
            );
          }


          setUser(
            null
          );

          clearProfiles();

          setIsLoading(
            false
          );
        }
      );


    return () => {

      unsubscribeAuth();

      unsubscribeUserSnapshot?.();

      unsubscribeProfileSnapshot?.();
    };

  }, []);


  // ==========================================================
  // EMAIL / PHONE LOGIN
  // ==========================================================

  const login = async (
    emailOrPhone: string,
    password?: string
  ) => {

    setIsLoading(
      true
    );


    try {

      const identifier =
        emailOrPhone.trim();


      if (
        !identifier
      ) {

        throw new Error(
          'يرجى إدخال البريد الإلكتروني أو رقم الهاتف.'
        );
      }


      if (
        !password
      ) {

        throw new Error(
          'كلمة المرور إلزامية.'
        );
      }


      // ======================================================
      // EMAIL LOGIN
      // ======================================================

      if (
        identifier.includes('@')
      ) {

        try {

          const credential =
            await signInWithEmailAndPassword(
              auth,
              identifier.toLowerCase(),
              password
            );


          const fbUser:
            FirebaseUser =
            credential.user;


          if (
            !fbUser
          ) {

            throw new Error(
              'تعذر الحصول على بيانات حساب Firebase.'
            );
          }


          let userDoc =
            await getUserByUid(
              fbUser.uid
            );


          if (
            !userDoc &&
            fbUser.email
          ) {

            userDoc =
              await getUserByEmailOrPhone(
                fbUser.email
              );
          }


          if (
            !userDoc
          ) {

            await firebaseSignOut(
              auth
            );


            throw new Error(
              'تم التحقق من الحساب في Firebase، ولكن لم يتم العثور على ملف المستخدم في قاعدة البيانات.'
            );
          }


          const normalizedUser =
            normalizeFirebaseUser(
              userDoc,
              fbUser
            );


          await firebaseDb.saveUser(
            normalizedUser
          );


          await applyUserSession(
            normalizedUser,
            'firebase',
            fbUser
          );


          saveSession(
            normalizedUser,
            'firebase'
          );


          return;

        } catch (
          fbError: any
        ) {

          console.error(
            'Firebase email login failed:',
            fbError?.code,
            fbError?.message
          );


          switch (
            fbError?.code
          ) {

            case 'auth/invalid-credential':

            case 'auth/wrong-password':

            case 'auth/user-not-found':

              throw new Error(
                'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
              );


            case 'auth/user-disabled':

              throw new Error(
                'تم تعطيل هذا الحساب.'
              );


            case 'auth/too-many-requests':

              throw new Error(
                'تم إجراء محاولات كثيرة. يرجى المحاولة لاحقًا.'
              );


            case 'auth/operation-not-allowed':

              throw new Error(
                'تسجيل الدخول بالبريد الإلكتروني غير مفعّل في Firebase Authentication.'
              );


            case 'auth/network-request-failed':

              throw new Error(
                'تعذر الاتصال بخدمة Firebase. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.'
              );


            default:

              throw fbError;
          }
        }
      }


      // ======================================================
      // PHONE LOGIN
      // ======================================================
      /**
       * الهاتف هنا يستخدم البريد الإلكتروني المرتبط بالمستخدم
       * في Firestore ثم يقوم بالمصادقة عن طريق Firebase
       * Email/Password.
       *
       * لا ننتقل إلى Backend إذا كانت بيانات Firebase
       * موجودة ولكن كلمة المرور خاطئة.
       */

      let firestoreUser:
        User | null =
        null;


      let lookupFailed =
        false;


      try {

        firestoreUser =
          await getUserByEmailOrPhone(
            identifier
          );

      } catch (
        lookupError
      ) {

        lookupFailed =
          true;

        console.warn(
          'Firestore phone lookup failed:',
          lookupError
        );
      }


      // ------------------------------------------------------
      // User found in Firestore
      // ------------------------------------------------------

      if (
        firestoreUser
      ) {

        if (
          !firestoreUser.email
        ) {

          throw new Error(
            'الحساب المرتبط برقم الهاتف لا يحتوي على بريد إلكتروني صالح للمصادقة.'
          );
        }


        try {

          const credential =
            await signInWithEmailAndPassword(
              auth,
              firestoreUser.email
                .trim()
                .toLowerCase(),
              password
            );


          const fbUser =
            credential.user;


          if (
            !fbUser
          ) {

            throw new Error(
              'تعذر الحصول على بيانات حساب Firebase.'
            );
          }


          const normalizedUser =
            normalizeFirebaseUser(
              firestoreUser,
              fbUser
            );


          // الاحتفاظ برقم الهاتف الذي استخدمه المستخدم
          if (
            !normalizedUser.phone
          ) {

            normalizedUser.phone =
              identifier;
          }


          await firebaseDb.saveUser(
            normalizedUser
          );


          await applyUserSession(
            normalizedUser,
            'firebase',
            fbUser
          );


          saveSession(
            normalizedUser,
            'firebase'
          );


          return;

        } catch (
          fbError: any
        ) {

          console.error(
            'Firebase phone login failed:',
            fbError?.code,
            fbError?.message
          );


          // ==================================================
          // مهم جدًا:
          // لا نرسل الخطأ إلى Backend هنا.
          // الحساب موجود، وFirebase رفض كلمة المرور.
          // ==================================================

          switch (
            fbError?.code
          ) {

            case 'auth/invalid-credential':

            case 'auth/wrong-password':

            case 'auth/user-not-found':

              throw new Error(
                'رقم الهاتف أو كلمة المرور غير صحيحة.'
              );


            case 'auth/user-disabled':

              throw new Error(
                'تم تعطيل هذا الحساب.'
              );


            case 'auth/too-many-requests':

              throw new Error(
                'تم إجراء محاولات تسجيل دخول كثيرة. يرجى المحاولة لاحقًا.'
              );


            case 'auth/operation-not-allowed':

              throw new Error(
                'تسجيل الدخول بالبريد الإلكتروني غير مفعّل في Firebase Authentication.'
              );


            case 'auth/network-request-failed':

              throw new Error(
                'تعذر الاتصال بخدمة Firebase. تحقق من الإنترنت ثم حاول مرة أخرى.'
              );


            default:

              throw new Error(
                fbError?.message ||
                'فشل تسجيل الدخول باستخدام Firebase.'
              );
          }
        }
      }


      // ======================================================
      // Backend fallback
      // ======================================================
      /**
       * نصل إلى Backend فقط إذا:
       *
       * 1. لم نجد المستخدم في Firestore.
       * أو
       * 2. حدثت مشكلة فعلية في قراءة Firestore.
       *
       * أما إذا كان المستخدم موجودًا وفشل Firebase
       * بسبب كلمة المرور، فلا نصل إلى هنا.
       */

      if (
        lookupFailed ||
        !firestoreUser
      ) {

        try {

          const apiRes =
            await api.login(
              identifier,
              password
            );


          if (
            !apiRes ||
            !apiRes.user
          ) {

            throw new Error(
              'رقم الهاتف أو كلمة المرور غير صحيحة.'
            );
          }


          let backendUser:
            User =
            apiRes.user;


          if (
            isAdminEmail(
              backendUser.email
            ) ||
            isAdminPhone(
              backendUser.phone
            )
          ) {

            backendUser = {

              ...backendUser,

              role:
                'HOSPITAL_ADMIN'
            };
          }


          await applyUserSession(
            backendUser,
            'backend'
          );


          await firebaseDb.saveUser(
            backendUser
          );


          if (
            apiRes.profile
          ) {

            if (
              backendUser.role ===
              'PATIENT'
            ) {

              await firebaseDb.savePatient(
                apiRes.profile
              );

            } else if (
              backendUser.role ===
              'DOCTOR'
            ) {

              await firebaseDb.saveDoctor(
                apiRes.profile
              );

            } else {

              await firebaseDb.saveStaff(
                apiRes.profile
              );
            }
          }


          saveSession(
            backendUser,
            'backend'
          );


          return;

        } catch (
          apiError: any
        ) {

          console.error(
            'Backend login failed:',
            apiError
          );


          if (
            apiError?.code ===
              'BACKEND_UNAVAILABLE' ||
            apiError?.message ===
              'BACKEND_UNAVAILABLE'
          ) {

            throw new Error(
              'تعذر الاتصال بخادم تسجيل الدخول. الحساب غير موجود في Firebase/Firestore ولا يمكن استخدام Backend حاليًا.'
            );
          }


          throw apiError;
        }
      }


      throw new Error(
        'لم يتم العثور على حساب مرتبط برقم الهاتف.'
      );

    } catch (
      error: any
    ) {

      console.error(
        'Login error:',
        error
      );


      throw error;

    } finally {

      setIsLoading(
        false
      );
    }
  };


  // ==========================================================
  // REGISTER
  // ==========================================================

  const register = async (
    data: any
  ) => {

    setIsLoading(
      true
    );


    try {

      const password =
        data.password;


      if (
        !password
      ) {

        throw new Error(
          'كلمة المرور مطلوبة لإنشاء الحساب.'
        );
      }


      if (
        password.length < 6
      ) {

        throw new Error(
          'يجب أن تتكون كلمة المرور من 6 أحرف أو أكثر.'
        );
      }


      const cleanPhone =
        String(
          data.phone || ''
        ).trim();


      const cleanDigits =
        cleanPhone.replace(
          /[^0-9]/g,
          ''
        );


      const userEmail =
        data.email
          ? String(
              data.email
            )
              .trim()
              .toLowerCase()
          : (
              cleanDigits
                ? `${cleanDigits}@phone.medicalcarehub.com`
                : `${Date.now()}@medicalcarehub.com`
            );


      const isAdmin =
        isAdminEmail(
          data.email
        ) ||
        isAdminPhone(
          cleanPhone
        ) ||
        cleanDigits ===
          '776458925' ||
        cleanDigits.endsWith(
          '776458925'
        );


      const payload = {

        ...data,

        phone:
          cleanPhone,

        email:
          userEmail,

        role:
          isAdmin
            ? 'HOSPITAL_ADMIN'
            : (
                data.role ||
                'PATIENT'
              )
      };


      // ======================================================
      // Firebase account FIRST
      // ======================================================
      /**
       * Firebase هو نظام المصادقة الأساسي.
       * ننشئ الحساب أولاً حتى نحصل على UID الحقيقي.
       */

      let firebaseCreatedUser:
        FirebaseUser | null =
        null;


      try {

        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            payload.email,
            password
          );


        firebaseCreatedUser =
          userCredential.user;


        if (
          firebaseCreatedUser &&
          payload.fullName
        ) {

          await firebaseUpdateProfile(
            firebaseCreatedUser,
            {
              displayName:
                payload.fullName
            }
          );
        }

      } catch (
        fbError: any
      ) {

        console.error(
          'Firebase registration failed:',
          fbError?.code,
          fbError?.message
        );


        if (
          fbError?.code ===
          'auth/email-already-in-use'
        ) {

          throw new Error(
            data.email
              ? 'البريد الإلكتروني مستخدم بالفعل في Firebase.'
              : 'رقم الهاتف مستخدم بالفعل.'
          );
        }


        if (
          fbError?.code ===
          'auth/weak-password'
        ) {

          throw new Error(
            'كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.'
          );
        }


        if (
          fbError?.code ===
          'auth/invalid-email'
        ) {

          throw new Error(
            'البريد الإلكتروني غير صالح.'
          );
        }


        if (
          fbError?.code ===
          'auth/operation-not-allowed'
        ) {

          throw new Error(
            'إنشاء الحساب بالبريد الإلكتروني غير مفعّل في Firebase Authentication.'
          );
        }


        throw new Error(
          fbError?.message ||
          'فشل إنشاء حساب المستخدم في Firebase.'
        );
      }


      if (
        !firebaseCreatedUser
      ) {

        throw new Error(
          'تعذر إنشاء حساب Firebase.'
        );
      }


      // ======================================================
      // Create application profile
      // ======================================================

      const firebasePayload = {

        ...payload,

        uid:
          firebaseCreatedUser.uid
      };


      let res:
        any;


      try {

        res =
          await api.register(
            firebasePayload
          );

      } catch (
        apiError
      ) {

        console.warn(
          'Application API registration failed. Creating Firestore profile:',
          apiError
        );


        const fallbackUser:
          User = {

          id:
            firebaseCreatedUser.uid,

          fullName:
            payload.fullName ||
            'مستخدم',

          email:
            payload.email,

          phone:
            payload.phone ||
            '',

          role:
            payload.role,

          isVerified:
            true,

          createdAt:
            new Date().toISOString()
        };


        await firebaseDb.saveUser(
          fallbackUser
        );


        let profile:
          any = null;


        if (
          fallbackUser.role ===
          'PATIENT'
        ) {

          profile = {

            id:
              'pat-' +
              Date.now(),

            userId:
              firebaseCreatedUser.uid,

            mrn:
              'MRN-' +
              Math.floor(
                100000 +
                Math.random() *
                900000
              ),

            fullName:
              fallbackUser.fullName,

            email:
              fallbackUser.email,

            phone:
              fallbackUser.phone,

            gender:
              data.gender ||
              'MALE',

            birthDate:
              data.birthDate ||
              '1995-01-01',

            bloodType:
              data.bloodType ||
              'O+',

            allergies:
              [],

            chronicConditions:
              [],

            createdAt:
              new Date().toISOString()
          };


          await firebaseDb.savePatient(
            profile
          );

        } else if (
          fallbackUser.role ===
          'HOSPITAL_ADMIN'
        ) {

          profile = {

            id:
              'stf-' +
              Date.now(),

            userId:
              firebaseCreatedUser.uid,

            fullName:
              fallbackUser.fullName,

            department:
              'إدارة المستشفى والعمليات العليا',

            roleTitle:
              'المدير العام والمسؤول المعتمد',

            shift:
              'شامل',

            avatar:
              '',

            phone:
              fallbackUser.phone,

            email:
              fallbackUser.email,

            isActive:
              true,

            createdAt:
              new Date().toISOString()
          };


          await firebaseDb.saveStaff(
            profile
          );
        }


        res = {

          user:
            fallbackUser,

          patient:
            fallbackUser.role ===
            'PATIENT'
              ? profile
              : undefined,

          doctor:
            undefined,

          staff:
            fallbackUser.role ===
            'HOSPITAL_ADMIN'
              ? profile
              : undefined,

          profile,

          message:
            'تم إنشاء الحساب محليًا في Firestore'
        };
      }


      // ======================================================
      // Normalize returned user with Firebase UID
      // ======================================================

      let registeredUser:
        User = {

        ...(res?.user || {}),

        id:
          firebaseCreatedUser.uid,

        email:
          firebaseCreatedUser.email ||
          payload.email,

        phone:
          payload.phone ||
          res?.user?.phone ||
          '',

        fullName:
          payload.fullName ||
          res?.user?.fullName ||
          firebaseCreatedUser.displayName ||
          'مستخدم',

        role:
          res?.user?.role ||
          payload.role
      };


      if (
        isAdmin ||
        isAdminEmail(
          registeredUser.email
        ) ||
        isAdminPhone(
          registeredUser.phone
        )
      ) {

        registeredUser = {

          ...registeredUser,

          role:
            'HOSPITAL_ADMIN'
        };
      }


      // ======================================================
      // Save Firestore User
      // ======================================================

      await firebaseDb.saveUser(
        registeredUser
      );


      // ======================================================
      // Profiles
      // ======================================================

      if (
        res?.patient
      ) {

        await firebaseDb.savePatient({

          ...res.patient,

          userId:
            firebaseCreatedUser.uid
        });
      }


      if (
        res?.doctor
      ) {

        await firebaseDb.saveDoctor({

          ...res.doctor,

          userId:
            firebaseCreatedUser.uid
        });
      }


      if (
        res?.staff
      ) {

        await firebaseDb.saveStaff({

          ...res.staff,

          userId:
            firebaseCreatedUser.uid
        });
      }


      // ======================================================
      // Session
      // ======================================================

      await applyUserSession(
        registeredUser,
        'firebase',
        firebaseCreatedUser
      );


      saveSession(
        registeredUser,
        'firebase'
      );

    } catch (
      error
    ) {

      console.error(
        'Register error:',
        error
      );


      throw error;

    } finally {

      setIsLoading(
        false
      );
    }
  };


  // ==========================================================
  // GOOGLE LOGIN
  // ==========================================================

  const loginWithGoogle =
    async (
      roleHint:
        UserRole = 'PATIENT'
    ) => {

      setIsLoading(
        true
      );


      try {

        const provider =
          new GoogleAuthProvider();


        provider.setCustomParameters({
          prompt:
            'select_account'
        });


        const result =
          await signInWithPopup(
            auth,
            provider
          );


        const fbUser =
          result.user;


        if (
          !fbUser
        ) {

          throw new Error(
            'لم يتم استلام بيانات الحساب من Google.'
          );
        }


        let existingUser =
          await getUserByUid(
            fbUser.uid
          );


        if (
          !existingUser &&
          fbUser.email
        ) {

          existingUser =
            await getUserByEmailOrPhone(
              fbUser.email
            );
        }


        // ------------------------------------------------------
        // New Google account
        // ------------------------------------------------------

        if (
          !existingUser
        ) {

          const assignedRole:
            UserRole =
            isAdminEmail(
              fbUser.email
            )
              ? 'HOSPITAL_ADMIN'
              : roleHint;


          const payload:
            any = {

            uid:
              fbUser.uid,

            fullName:
              fbUser.displayName ||
              (
                assignedRole ===
                'HOSPITAL_ADMIN'
                  ? 'المدير العام والمسؤول'
                  : 'مستخدم Google'
              ),

            email:
              fbUser.email ||
              '',

            phone:
              fbUser.phoneNumber ||
              '',

            avatar:
              fbUser.photoURL ||
              '',

            role:
              assignedRole
          };


          const res:
            any =
            await api.register(
              payload
            );


          let newUser:
            User = {

            ...(res?.user || {}),

            id:
              fbUser.uid,

            email:
              fbUser.email ||
              '',

            phone:
              fbUser.phoneNumber ||
              res?.user?.phone ||
              '',

            fullName:
              fbUser.displayName ||
              res?.user?.fullName ||
              'مستخدم Google',

            role:
              res?.user?.role ||
              assignedRole,

            avatar:
              fbUser.photoURL ||
              res?.user?.avatar ||
              ''
          };


          if (
            isAdminEmail(
              newUser.email
            ) ||
            isAdminPhone(
              newUser.phone
            )
          ) {

            newUser = {

              ...newUser,

              role:
                'HOSPITAL_ADMIN'
            };
          }


          await firebaseDb.saveUser(
            newUser
          );


          if (
            res?.patient
          ) {

            await firebaseDb.savePatient({

              ...res.patient,

              userId:
                fbUser.uid
            });
          }


          if (
            res?.doctor
          ) {

            await firebaseDb.saveDoctor({

              ...res.doctor,

              userId:
                fbUser.uid
            });
          }


          if (
            res?.staff
          ) {

            await firebaseDb.saveStaff({

              ...res.staff,

              userId:
                fbUser.uid
            });
          }


          await applyUserSession(
            newUser,
            'google',
            fbUser
          );


          saveSession(
            newUser,
            'google'
          );


          return;
        }


        // ------------------------------------------------------
        // Existing Google user
        // ------------------------------------------------------

        const normalizedUser =
          normalizeFirebaseUser(
            existingUser,
            fbUser
          );


        await firebaseDb.saveUser(
          normalizedUser
        );


        await applyUserSession(
          normalizedUser,
          'google',
          fbUser
        );


        saveSession(
          normalizedUser,
          'google'
        );

      } catch (
        err: any
      ) {

        console.error(
          'Google Auth error:',
          err
        );


        if (
          err?.code ===
          'auth/popup-closed-by-user'
        ) {

          throw new Error(
            'تم إلغاء تسجيل الدخول عبر Google.'
          );
        }


        if (
          err?.code ===
          'auth/popup-blocked'
        ) {

          throw new Error(
            'تم حظر النافذة المنبثقة من المتصفح. يرجى السماح بالنوافذ المنبثقة.'
          );
        }


        if (
          err?.code ===
          'auth/unauthorized-domain'
        ) {

          throw new Error(
            'هذا النطاق غير مصرح به في Firebase Authentication. أضف نطاق الموقع إلى Authorized domains في Firebase.'
          );
        }


        if (
          err?.code ===
          'auth/network-request-failed'
        ) {

          throw new Error(
            'تعذر الاتصال بخدمة Google/Firebase. تحقق من اتصال الإنترنت.'
          );
        }


        throw err;

      } finally {

        setIsLoading(
          false
        );
      }
    };


  // ==========================================================
  // SWITCH ROLE
  // ==========================================================

  const switchRole =
    async (
      targetRole: UserRole,
      userId?: string
    ) => {

      setIsLoading(
        true
      );


      try {

        const res =
          await api.switchDemoUser(
            targetRole,
            userId
          );


        let switchedUser:
          User =
          res.user;


        if (
          isAdminEmail(
            switchedUser.email
          ) ||
          isAdminPhone(
            switchedUser.phone
          )
        ) {

          switchedUser = {

            ...switchedUser,

            role:
              'HOSPITAL_ADMIN'
          };
        }


        await applyUserSession(
          switchedUser,
          'demo'
        );


        await firebaseDb.saveUser(
          switchedUser
        );


        if (
          res.profile
        ) {

          if (
            switchedUser.role ===
            'PATIENT'
          ) {

            await firebaseDb.savePatient(
              res.profile
            );

          } else if (
            switchedUser.role ===
            'DOCTOR'
          ) {

            await firebaseDb.saveDoctor(
              res.profile
            );

          } else {

            await firebaseDb.saveStaff(
              res.profile
            );
          }
        }


        saveSession(
          switchedUser,
          'demo'
        );

      } finally {

        setIsLoading(
          false
        );
      }
    };


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout =
    async () => {

      try {

        await firebaseSignOut(
          auth
        );

      } catch (
        error
      ) {

        console.warn(
          'Firebase sign out warning:',
          error
        );
      }


      setUser(
        null
      );

      setFirebaseUser(
        null
      );

      clearProfiles();

      clearSession();


      try {

        localStorage.removeItem(
          'mch_api_token'
        );

      } catch {
        // Ignore
      }
    };


  // ==========================================================
  // REFRESH PROFILE
  // ==========================================================

  const refreshProfile =
    async () => {

      if (
        !user
      ) {
        return;
      }


      try {

        if (
          user.role ===
          'PATIENT'
        ) {

          const patient =
            await getPatientByUserId(
              user.id
            );


          if (
            patient
          ) {

            setPatientProfile(
              patient
            );

          } else {

            const apiPatient =
              await api.getPatient(
                patientProfile?.id ||
                user.id
              );


            setPatientProfile(
              apiPatient
            );
          }


          return;
        }


        if (
          user.role ===
          'DOCTOR'
        ) {

          const doctor =
            await getDoctorByUserId(
              user.id
            );


          if (
            doctor
          ) {

            setDoctorProfile(
              doctor
            );

          } else {

            const apiDoctor =
              await api.getDoctor(
                doctorProfile?.id ||
                user.id
              );


            setDoctorProfile(
              apiDoctor
            );
          }


          return;
        }


        const staff =
          await firebaseDb.getDocument<Staff>(
            FIRESTORE_COLLECTIONS.STAFF,
            user.id
          );


        setStaffProfile(
          staff || null
        );

      } catch (
        error
      ) {

        console.warn(
          'Failed to refresh profile:',
          error
        );
      }
    };


  // ==========================================================
  // Provider
  // ==========================================================

  return (
    <AuthContext.Provider
      value={{

        user,

        uid:
          currentUid,

        role:
          user?.role ||
          null,

        patientProfile,

        doctorProfile,

        staffProfile,

        firebaseUser,

        isAuthenticated:
          !!user,

        isLoading,

        login,

        register,

        loginWithGoogle,

        linkGoogleAccountWithPassword,

        logout,

        switchRole,

        refreshProfile

      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


// ============================================================
// useAuth
// ============================================================

export const useAuth =
  () => {

    const context =
      useContext(
        AuthContext
      );


    if (
      !context
    ) {

      throw new Error(
        'useAuth must be used within an AuthProvider'
      );
    }


    return context;
  };

