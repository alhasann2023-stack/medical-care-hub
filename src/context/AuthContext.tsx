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

export const isAdminPhone = (
  phone?: string | null
): boolean => {
  if (!phone) {
    return false;
  }
  const clean = phone.trim();
  const digits = clean.replace(/[^0-9]/g, '');
  return digits === '776458925' || digits.endsWith('776458925') || clean.includes('776458925');
};

export const isAdminEmail = (
  email?: string | null
): boolean => {

  if (!email) {
    return false;
  }

  const clean = email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(clean)) {
    return true;
  }

  if (isAdminPhone(clean)) {
    return true;
  }

  return false;
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

  /**
   * ربط كلمة مرور بحساب Google الحالي.
   * بعد تنفيذها يستطيع المستخدم الدخول:
   * Google أو Email + Password.
   */
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
  ] = useState<FirebaseUser | null>(
    null
  );

  const [
    patientProfile,
    setPatientProfile
  ] = useState<Patient | null>(
    null
  );

  const [
    doctorProfile,
    setDoctorProfile
  ] = useState<Doctor | null>(
    null
  );

  const [
    staffProfile,
    setStaffProfile
  ] = useState<Staff | null>(
    null
  );

  const [
    isLoading,
    setIsLoading
  ] = useState<boolean>(
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

    setPatientProfile(null);

    setDoctorProfile(null);

    setStaffProfile(null);
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
        JSON.stringify(session)
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

      let normalizedUser = {
        ...currentUser
      };


      // ------------------------------------------------------
      // Admin
      // ------------------------------------------------------

      if (
        isAdminEmail(
          normalizedUser.email
        ) ||
        isAdminEmail(
          fbUser?.email
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

        setDoctorProfile(null);

        setStaffProfile(null);


        const patient =
          await getPatientByUserId(
            normalizedUser.id
          );


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

        setPatientProfile(null);

        setStaffProfile(null);


        const doctor =
          await getDoctorByUserId(
            normalizedUser.id
          );


        setDoctorProfile(
          doctor || null
        );

        return;
      }


      // ------------------------------------------------------
      // Staff / Admin
      // ------------------------------------------------------

      setPatientProfile(null);

      setDoctorProfile(null);


      let staff =
        await firebaseDb.getDocument<Staff>(
          FIRESTORE_COLLECTIONS.STAFF,
          normalizedUser.id
        );

      if (!staff && normalizedUser.role === 'HOSPITAL_ADMIN') {
        staff = {
          id: `stf-${normalizedUser.id}`,
          userId: normalizedUser.id,
          fullName: normalizedUser.fullName || 'المدير العام والمسؤول المعتمد',
          department: 'إدارة المستشفى والعمليات العليا',
          roleTitle: 'المدير العام والمسؤول المعتمد',
          shift: 'شامل',
          avatar: normalizedUser.avatar,
          phone: normalizedUser.phone,
          email: normalizedUser.email,
          isActive: true,
          createdAt: normalizedUser.createdAt || new Date().toISOString()
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
        email.trim().toLowerCase();


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


        // تحديث بيانات Firebase
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


        if (
          error?.code ===
          'auth/provider-already-linked'
        ) {

          return;
        }


        if (
          error?.code ===
          'auth/email-already-in-use'
        ) {

          throw new Error(
            'هذا البريد مرتبط بحساب Firebase آخر.'
          );
        }


        if (
          error?.code ===
          'auth/credential-already-in-use'
        ) {

          throw new Error(
            'بيانات البريد وكلمة المرور مرتبطة بحساب Firebase آخر.'
          );
        }


        if (
          error?.code ===
          'auth/weak-password'
        ) {

          throw new Error(
            'كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.'
          );
        }


        throw new Error(
          error?.message ||
          'تعذر ربط كلمة المرور بحساب Google.'
        );
      }
    };


  // ==========================================================
  // Firebase Auth Listener
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

                let normalizedUser = {
                  ...userDoc
                };


                if (
                  isAdminEmail(
                    fbUser.email
                  )
                ) {

                  normalizedUser = {
                    ...normalizedUser,
                    role:
                      'HOSPITAL_ADMIN'
                  };


                  if (
                    userDoc.role !==
                    'HOSPITAL_ADMIN'
                  ) {

                    await firebaseDb.saveUser(
                      normalizedUser
                    );
                  }
                }


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


                      const finalUser: User =
                        isAdminEmail(
                          fbUser.email
                        )
                          ? {
                              ...updatedUser,
                              role:
                                'HOSPITAL_ADMIN' as UserRole
                            }
                          : updatedUser;


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
              // Firebase account fallback from localStorage or profile creation
              // ------------------------------------------------
              const stored = localStorage.getItem(AUTH_STORAGE_KEY);
              let fallbackUser: User | null = null;
              if (stored) {
                try {
                  const parsed: StoredSession = JSON.parse(stored);
                  if (parsed.user && (parsed.user.id === fbUser.uid || parsed.user.email === fbUser.email)) {
                    fallbackUser = parsed.user;
                  }
                } catch {}
              }

              if (!fallbackUser) {
                const isAdmin = isAdminEmail(fbUser.email);
                fallbackUser = {
                  id: fbUser.uid,
                  email: fbUser.email || '',
                  fullName: fbUser.displayName || (isAdmin ? 'المدير العام والمسؤول المعتمد' : 'مستخدم المنصة'),
                  phone: fbUser.phoneNumber || '',
                  role: isAdmin ? 'HOSPITAL_ADMIN' : 'PATIENT',
                  isVerified: true,
                  createdAt: new Date().toISOString()
                };
              }

              if (isAdminEmail(fbUser.email)) {
                fallbackUser.role = 'HOSPITAL_ADMIN';
              }

              await applyUserSession(fallbackUser, 'firebase', fbUser);
              saveSession(fallbackUser, 'firebase');
              try {
                await firebaseDb.saveUser(fallbackUser);
              } catch {}

              setIsLoading(false);
              return;

            } catch (
              error
            ) {

              console.warn(
                'Notice loading Firebase user profile:',
                error
              );

              const stored = localStorage.getItem(AUTH_STORAGE_KEY);
              if (stored) {
                try {
                  const parsed: StoredSession = JSON.parse(stored);
                  if (parsed.user) {
                    await applyUserSession(parsed.user, parsed.authType || 'firebase', fbUser);
                    setIsLoading(false);
                    return;
                  }
                } catch {}
              }

              setUser(null);
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

                const restoredUser = {
                  ...parsed.user
                };


                if (
                  isAdminEmail(
                    restoredUser.email
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


          setUser(null);

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
      // EMAIL LOGIN FLOW
      // ======================================================

      if (
        identifier.includes('@')
      ) {
        let credential: any = null;

        try {
          credential = await signInWithEmailAndPassword(
            auth,
            identifier.toLowerCase(),
            password
          );
        } catch (fbError: any) {
          console.warn(
            'Firebase email login notice:',
            fbError?.code,
            fbError?.message
          );
          // If the error was wrong password in Firebase, throw it directly
          if (fbError?.code === 'auth/wrong-password' || fbError?.code === 'auth/invalid-credential') {
            // Check if user exists in backend with this password before failing
          }
        }

        if (credential?.user) {
          const fbUser: FirebaseUser = credential.user;

          let userDoc = await getUserByUid(fbUser.uid);

          if (!userDoc && fbUser.email) {
            userDoc = await getUserByEmailOrPhone(fbUser.email);
          }

          if (!userDoc) {
            userDoc = {
              id: fbUser.uid,
              email: fbUser.email || identifier.toLowerCase(),
              fullName: fbUser.displayName || 'مستخدم المنصة',
              phone: fbUser.phoneNumber || '',
              role: isAdminEmail(fbUser.email) ? 'HOSPITAL_ADMIN' : 'PATIENT',
              isVerified: true,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            };
            await firebaseDb.saveUser(userDoc);
          }

          let normalizedUser = {
            ...userDoc
          };

          if (
            isAdminEmail(fbUser.email) ||
            isAdminPhone(normalizedUser.phone)
          ) {
            normalizedUser = {
              ...normalizedUser,
              role: 'HOSPITAL_ADMIN'
            };
          }

          await firebaseDb.saveUser(normalizedUser);
          await applyUserSession(normalizedUser, 'firebase', fbUser);
          saveSession(normalizedUser, 'firebase');
          return;
        }

        // Validate password against Backend API
        const apiRes = await api.login(identifier, password);

        if (apiRes && apiRes.user) {
          let backendUser: User = apiRes.user;

          if (
            isAdminEmail(backendUser.email) ||
            isAdminPhone(backendUser.phone)
          ) {
            backendUser = {
              ...backendUser,
              role: 'HOSPITAL_ADMIN'
            };
          }

          await applyUserSession(backendUser, 'backend');
          await firebaseDb.saveUser(backendUser);

          if (apiRes.profile) {
            if (backendUser.role === 'PATIENT') {
              await firebaseDb.savePatient(apiRes.profile);
            } else if (backendUser.role === 'DOCTOR') {
              await firebaseDb.saveDoctor(apiRes.profile);
            } else {
              await firebaseDb.saveStaff(apiRes.profile);
            }
          }

          saveSession(backendUser, 'backend');
          return;
        }

        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      }

      // ======================================================
      // PHONE / IDENTIFIER LOGIN FLOW
      // ======================================================

      // First check if user exists in Firestore with an email to authenticate with Firebase Auth
      let phoneFbUserDoc = await getUserByEmailOrPhone(identifier);
      if (phoneFbUserDoc && phoneFbUserDoc.email) {
        try {
          const fbCred = await signInWithEmailAndPassword(
            auth,
            phoneFbUserDoc.email.toLowerCase(),
            password
          );
          if (fbCred?.user) {
            let normalizedUser = { ...phoneFbUserDoc };
            if (isAdminEmail(normalizedUser.email) || isAdminPhone(normalizedUser.phone)) {
              normalizedUser.role = 'HOSPITAL_ADMIN';
            }
            await firebaseDb.saveUser(normalizedUser);
            await applyUserSession(normalizedUser, 'firebase', fbCred.user);
            saveSession(normalizedUser, 'firebase');
            return;
          }
        } catch (fbErr: any) {
          console.warn('Phone Firebase Auth sign-in notice:', fbErr?.code);
        }
      }

      const apiRes = await api.login(identifier, password);

      if (!apiRes || !apiRes.user) {
        throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة.');
      }

      let backendUser: User = apiRes.user;

      if (
        isAdminEmail(backendUser.email) ||
        isAdminPhone(backendUser.phone)
      ) {
        backendUser = {
          ...backendUser,
          role: 'HOSPITAL_ADMIN'
        };
      }

      await applyUserSession(backendUser, 'backend');
      await firebaseDb.saveUser(backendUser);

      if (apiRes.profile) {
        if (backendUser.role === 'PATIENT') {
          await firebaseDb.savePatient(apiRes.profile);
        } else if (backendUser.role === 'DOCTOR') {
          await firebaseDb.saveDoctor(apiRes.profile);
        } else {
          await firebaseDb.saveStaff(apiRes.profile);
        }
      }

      saveSession(backendUser, 'backend');
      return;

    } catch (
      error
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
  // REGISTER EMAIL
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


      const cleanPhone = (data.phone || '').trim();
      const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');

      // Generate synthetic email if email is not provided
      const userEmail = data.email
        ? data.email.trim().toLowerCase()
        : `${cleanDigits || Date.now()}@phone.medicalcarehub.com`;

      const isAdmin = 
        isAdminEmail(data.email) || 
        isAdminPhone(cleanPhone) ||
        cleanDigits === '776458925' ||
        cleanDigits.endsWith('776458925');

      const payload = {

        ...data,

        phone: cleanPhone,

        email: userEmail,

        role:
          isAdmin
            ? 'HOSPITAL_ADMIN'
            : (
                data.role ||
                'PATIENT'
              )
      };


      // ------------------------------------------------------
      // Backend / app profile
      // ------------------------------------------------------

      const res:
        any =
        await api.register(
          payload
        );


      // ------------------------------------------------------
      // Firebase account
      // ------------------------------------------------------

      let firebaseCreatedUser:
        FirebaseUser | null =
        null;


      if (
        payload.email
      ) {

        try {

          const userCredential =
            await createUserWithEmailAndPassword(
              auth,
              payload.email
                .trim()
                .toLowerCase(),
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

          console.warn(
            'Firebase registration:',
            fbError?.code,
            fbError?.message
          );


          if (
            fbError?.code ===
            'auth/email-already-in-use'
          ) {

            try {

              const existingCredential =
                await signInWithEmailAndPassword(
                  auth,
                  payload.email
                    .trim()
                    .toLowerCase(),
                  password
                );


              firebaseCreatedUser =
                existingCredential.user;

            } catch {

              throw new Error(
                data.email
                  ? 'البريد الإلكتروني مستخدم بالفعل، وكلمة المرور لا تطابق الحساب الموجود.'
                  : 'رقم الهاتف مستخدم بالفعل، وكلمة المرور غير صحيحة.'
              );
            }

          } else {

            throw new Error(
              fbError?.message ||
              'فشل إنشاء حساب المستخدم.'
            );
          }
        }
      }


      // ------------------------------------------------------
      // User state
      // ------------------------------------------------------

      let registeredUser:
        User =
        res.user;


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


      await applyUserSession(
        registeredUser,
        'firebase',
        firebaseCreatedUser
      );


      // ------------------------------------------------------
      // Save Firestore
      // ------------------------------------------------------

      await firebaseDb.saveUser(
        registeredUser
      );


      if (
        res.patient
      ) {

        await firebaseDb.savePatient(
          res.patient
        );
      }


      if (
        res.doctor
      ) {

        await firebaseDb.saveDoctor(
          res.doctor
        );
      }


      if (
        res.staff
      ) {

        await firebaseDb.saveStaff(
          res.staff
        );
      }


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


        // ------------------------------------------------------
        // Find existing application user
        // ------------------------------------------------------

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


          const payload: any = {

            uid:
              fbUser.uid,

            fullName:
              fbUser.displayName ||
              (
                assignedRole ===
                'HOSPITAL_ADMIN'
                  ? 'المدير العام والمسؤول'
                  : 'مريض معتمد'
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
              assignedRole,

            gender:
              'MALE',

            birthDate:
              '1995-01-01',

            bloodType:
              'O+'
          };


          const res:
            any =
            await api.register(
              payload
            );


          // ----------------------------------------------------
          // مهم:
          // Firebase UID هو الهوية الأساسية للحساب.
          // لا نستخدم user-xxxx كمعرّف لحساب Google.
          // ----------------------------------------------------

          let newUser:
            User = {
            ...res.user,

            id:
              fbUser.uid,

            email:
              fbUser.email ||
              res.user?.email ||
              '',

            fullName:
              fbUser.displayName ||
              res.user?.fullName ||
              'مستخدم Google'
          };


          if (
            isAdminEmail(
              newUser.email
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


          // ----------------------------------------------------
          // Profiles
          // ----------------------------------------------------

          if (
            res.patient
          ) {

            await firebaseDb.savePatient({
              ...res.patient,
              userId:
                fbUser.uid
            });
          }


          if (
            res.doctor
          ) {

            await firebaseDb.saveDoctor({
              ...res.doctor,
              userId:
                fbUser.uid
            });
          }


          if (
            res.staff
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
        // Existing application user
        // ------------------------------------------------------

        let normalizedUser = {
          ...existingUser,

          // توحيد الحساب مع Firebase UID
          id:
            fbUser.uid,

          email:
            fbUser.email ||
            existingUser.email ||
            ''
        };


        if (
          isAdminEmail(
            fbUser.email
          )
        ) {

          normalizedUser = {
            ...normalizedUser,
            role:
              'HOSPITAL_ADMIN'
          };
        }


        // تأكد من أن Firestore يستخدم Firebase UID
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

          } else if (
            switchedUser.role ===
            'CUSTOMER_SERVICE'
          ) {

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


      setUser(null);

      setFirebaseUser(null);

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
