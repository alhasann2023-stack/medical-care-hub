import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { 
  firebaseDb, 
  COLLECTIONS 
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
import { User, Patient, Doctor, Staff, UserRole } from '../types/medical';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  uid: string | null;
  role: UserRole | null;
  patientProfile: Patient | null;
  doctorProfile: Doctor | null;
  staffProfile: Staff | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrPhone: string, password?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginWithGoogle: (roleHint?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole, userId?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'mch_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active UID: from user.id or firebaseUser.uid
  const currentUid = user?.id || firebaseUser?.uid || null;

  // Listen to Firebase Auth state changes
  useEffect(() => {
    let unsubscribeUserSnapshot: Unsubscribe | null = null;
    let unsubscribeProfileSnapshot: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          // 1. Attempt to load user from Firestore by UID or Email
          let userDoc = await getUserByUid(fbUser.uid);
          if (!userDoc && fbUser.email) {
            userDoc = await getUserByEmailOrPhone(fbUser.email);
          }

          if (userDoc) {
            if (fbUser.email?.toLowerCase() === 'alhasann2023@gmail.com' && userDoc.role !== 'HOSPITAL_ADMIN') {
              userDoc = { ...userDoc, role: 'HOSPITAL_ADMIN' };
              await firebaseDb.saveUser(userDoc);
            }
            setUser(userDoc);
            
            // Set up real-time listener for user document
            unsubscribeUserSnapshot?.();
            unsubscribeUserSnapshot = subscribeToUser(userDoc.id, (updatedUser) => {
              if (updatedUser) {
                if (fbUser.email?.toLowerCase() === 'alhasann2023@gmail.com') {
                  setUser({ ...updatedUser, role: 'HOSPITAL_ADMIN' });
                } else {
                  setUser(updatedUser);
                }
              }
            });

            // Load and subscribe to profile
            if (userDoc.role === 'PATIENT') {
              const p = await getPatientByUserId(userDoc.id);
              if (p) {
                setPatientProfile(p);
                unsubscribeProfileSnapshot?.();
                unsubscribeProfileSnapshot = subscribeToDoc<Patient>(FIRESTORE_COLLECTIONS.PATIENTS, p.id, (updP) => {
                  if (updP) setPatientProfile(updP);
                });
              }
            } else if (userDoc.role === 'DOCTOR') {
              const d = await getDoctorByUserId(userDoc.id);
              if (d) {
                setDoctorProfile(d);
                unsubscribeProfileSnapshot?.();
                unsubscribeProfileSnapshot = subscribeToDoc<Doctor>(FIRESTORE_COLLECTIONS.DOCTORS, d.id, (updD) => {
                  if (updD) setDoctorProfile(updD);
                });
              }
            } else {
              const s = await firebaseDb.getDocument<Staff>(FIRESTORE_COLLECTIONS.STAFF, userDoc.id);
              if (s) setStaffProfile(s);
            }
            setIsLoading(false);
            return;
          }

          // Fallback to API sync if Firestore user document is being created
          if (fbUser.email) {
            const apiRes = await api.login(fbUser.email, 'demo123').catch(() => null);
            if (apiRes && apiRes.user) {
              setUser(apiRes.user);
              setPatientProfile(apiRes.user.role === 'PATIENT' ? apiRes.profile : null);
              setDoctorProfile(apiRes.user.role === 'DOCTOR' ? apiRes.profile : null);
              setStaffProfile(apiRes.user.role === 'CUSTOMER_SERVICE' ? apiRes.profile : null);
              
              // Sync to Firestore
              await firebaseDb.saveUser(apiRes.user);
              if (apiRes.profile) {
                if (apiRes.user.role === 'PATIENT') await firebaseDb.savePatient(apiRes.profile);
                else if (apiRes.user.role === 'DOCTOR') await firebaseDb.saveDoctor(apiRes.profile);
              }
            }
          }
        } catch (error) {
          console.warn('Error loading Firebase user profile:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If not logged in via Firebase Auth, check local storage or demo session
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.email) {
              const res = await api.login(parsed.email, parsed.password || 'demo123').catch(() => null);
              if (res && res.user) {
                setUser(res.user);
                setPatientProfile(res.user.role === 'PATIENT' ? res.profile : null);
                setDoctorProfile(res.user.role === 'DOCTOR' ? res.profile : null);
                setStaffProfile(res.user.role === 'CUSTOMER_SERVICE' ? res.profile : null);
                setIsLoading(false);
                return;
              } else {
                localStorage.removeItem(AUTH_STORAGE_KEY);
              }
            }
          } catch (e) {
            console.warn('Failed restoring local session:', e);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }

        // User is not logged in
        setUser(null);
        setPatientProfile(null);
        setDoctorProfile(null);
        setStaffProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserSnapshot?.();
      unsubscribeProfileSnapshot?.();
    };
  }, []);

  const login = async (emailOrPhone: string, password?: string) => {
    setIsLoading(true);
    const pwd = password || 'demo123';
    try {
      // 1. Try Firebase Auth Login if it looks like an email
      if (emailOrPhone.includes('@')) {
        try {
          await signInWithEmailAndPassword(auth, emailOrPhone.trim().toLowerCase(), pwd);
        } catch (fbAuthErr: any) {
          // If user doesn't exist in Firebase Auth yet, auto-create to keep in sync
          if (fbAuthErr.code === 'auth/user-not-found' || fbAuthErr.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, emailOrPhone.trim().toLowerCase(), pwd);
            } catch (createErr) {
              console.warn('Firebase Auth auto-register notice:', createErr);
            }
          } else {
            console.warn('Firebase Auth login notice:', fbAuthErr);
          }
        }
      }

      // 2. Fetch user data via API and Firestore lookup
      const res = await api.login(emailOrPhone, pwd);
      if (emailOrPhone.trim().toLowerCase() === 'alhasann2023@gmail.com' && res.user) {
        res.user.role = 'HOSPITAL_ADMIN';
      }
      setUser(res.user);
      if (res.user.role === 'PATIENT') {
        setPatientProfile(res.profile || null);
        setDoctorProfile(null);
        setStaffProfile(null);
      } else if (res.user.role === 'DOCTOR') {
        setDoctorProfile(res.profile || null);
        setPatientProfile(null);
        setStaffProfile(null);
      } else {
        setStaffProfile(res.profile || null);
        setPatientProfile(null);
        setDoctorProfile(null);
      }

      // 3. Persist to Firestore with UID reference
      if (res.user) {
        await firebaseDb.saveUser(res.user);
        if (res.profile) {
          if (res.user.role === 'PATIENT') await firebaseDb.savePatient(res.profile);
          else if (res.user.role === 'DOCTOR') await firebaseDb.saveDoctor(res.profile);
          else await firebaseDb.saveStaff(res.profile);
        }
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email: res.user.email, password: pwd }));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    const pwd = data.password;
    const isAdminEmail = data.email?.trim().toLowerCase() === 'alhasann2023@gmail.com';
    const payload = {
      ...data,
      role: isAdminEmail ? 'HOSPITAL_ADMIN' : (data.role || 'PATIENT')
    };
    try {
      // 1. Register with backend API first to validate unique credentials and unique password
      const res: any = await api.register(payload);

      let fbUid: string | undefined;

      // 2. Register/Sync with Firebase Auth
      if (payload.email && pwd) {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            payload.email.trim().toLowerCase(), 
            pwd
          );
          if (userCredential.user) {
            fbUid = userCredential.user.uid;
            if (payload.fullName) {
              await firebaseUpdateProfile(userCredential.user, {
                displayName: payload.fullName
              });
            }
          }
        } catch (fbErr: any) {
          console.warn('Firebase Auth signup message:', fbErr.message);
          if (fbErr.code === 'auth/email-already-in-use') {
            try {
              const userCred = await signInWithEmailAndPassword(auth, payload.email.trim().toLowerCase(), pwd);
              fbUid = userCred.user?.uid;
            } catch (signInErr) {
              console.warn('Firebase Auth sign in fallback notice:', signInErr);
            }
          }
        }
      }

      setUser(res.user);
      if (res.user.role === 'PATIENT') {
        setPatientProfile(res.patient || res.profile || null);
        setDoctorProfile(null);
        setStaffProfile(null);
      } else if (res.user.role === 'DOCTOR') {
        setDoctorProfile(res.doctor || res.profile || null);
        setPatientProfile(null);
        setStaffProfile(null);
      } else {
        setStaffProfile(res.staff || res.profile || null);
        setPatientProfile(null);
        setDoctorProfile(null);
      }

      // 3. Save directly to Firestore collections
      if (res.user) {
        await firebaseDb.saveUser(res.user);
        if (res.patient) await firebaseDb.savePatient(res.patient);
        if (res.doctor) await firebaseDb.saveDoctor(res.doctor);
        if (res.staff) await firebaseDb.saveStaff(res.staff);
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email: res.user.email, password: pwd }));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (roleHint: UserRole = 'PATIENT') => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      if (!fbUser) {
        throw new Error('لم يتم استلام بيانات الحساب من Google.');
      }

      // Check if user already exists by UID or Email in Firestore
      let existingUser = await getUserByUid(fbUser.uid);
      if (!existingUser && fbUser.email) {
        existingUser = await getUserByEmailOrPhone(fbUser.email);
      }

      if (!existingUser) {
        // Automatically create a new user & profile
        const isAdmin = fbUser.email?.toLowerCase() === 'alhasann2023@gmail.com';
        const assignedRole: UserRole = isAdmin ? 'HOSPITAL_ADMIN' : roleHint;

        const payload: any = {
          uid: fbUser.uid,
          fullName: fbUser.displayName || (isAdmin ? 'المدير العام والمسؤول' : 'مريض معتمد'),
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: assignedRole,
          gender: 'MALE',
          birthDate: '1995-01-01',
          bloodType: 'O+'
        };

        const res: any = await api.register(payload);
        setUser(res.user);
        if (res.user.role === 'PATIENT') {
          setPatientProfile(res.patient || res.profile || null);
          setDoctorProfile(null);
          setStaffProfile(null);
        } else if (res.user.role === 'DOCTOR') {
          setDoctorProfile(res.doctor || res.profile || null);
          setPatientProfile(null);
          setStaffProfile(null);
        } else {
          setStaffProfile(res.staff || res.profile || null);
          setPatientProfile(null);
          setDoctorProfile(null);
        }

        if (res.user) {
          await firebaseDb.saveUser(res.user);
          if (res.patient) await firebaseDb.savePatient(res.patient);
          if (res.doctor) await firebaseDb.saveDoctor(res.doctor);
          if (res.staff) await firebaseDb.saveStaff(res.staff);
        }
      } else {
        if (fbUser.email?.toLowerCase() === 'alhasann2023@gmail.com' && existingUser.role !== 'HOSPITAL_ADMIN') {
          existingUser = { ...existingUser, role: 'HOSPITAL_ADMIN' };
          await firebaseDb.saveUser(existingUser);
        }
        setUser(existingUser);
        if (existingUser.role === 'PATIENT') {
          const p = await getPatientByUserId(existingUser.id);
          setPatientProfile(p);
          setDoctorProfile(null);
          setStaffProfile(null);
        } else if (existingUser.role === 'DOCTOR') {
          const d = await getDoctorByUserId(existingUser.id);
          setDoctorProfile(d);
          setPatientProfile(null);
          setStaffProfile(null);
        } else {
          const s = await firebaseDb.getDocument<Staff>(FIRESTORE_COLLECTIONS.STAFF, existingUser.id);
          setStaffProfile(s);
          setPatientProfile(null);
          setDoctorProfile(null);
        }
      }

      if (fbUser.email) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email: fbUser.email, password: 'demo' }));
      }
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('تم إلغاء تسجيل الدخول عبر Google.');
      } else if (err.code === 'auth/popup-blocked') {
        throw new Error('تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (targetRole: UserRole, userId?: string) => {
    setIsLoading(true);
    try {
      const res = await api.switchDemoUser(targetRole, userId);
      setUser(res.user);
      setPatientProfile(res.user.role === 'PATIENT' ? res.profile : null);
      setDoctorProfile(res.user.role === 'DOCTOR' ? res.profile : null);
      setStaffProfile(res.user.role === 'CUSTOMER_SERVICE' ? res.profile : null);
      
      // Sync switch to Firestore
      if (res.user) {
        await firebaseDb.saveUser(res.user);
        if (res.profile && res.user.role === 'PATIENT') await firebaseDb.savePatient(res.profile);
        if (res.profile && res.user.role === 'DOCTOR') await firebaseDb.saveDoctor(res.profile);
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email: res.user.email, password: 'demo' }));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Firebase sign out warning:', err);
    }
    setUser(null);
    setFirebaseUser(null);
    setPatientProfile(null);
    setDoctorProfile(null);
    setStaffProfile(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      if (user.role === 'PATIENT') {
        const p = await getPatientByUserId(user.id);
        if (p) setPatientProfile(p);
        else {
          const apiP = await api.getPatient(patientProfile?.id || user.id);
          setPatientProfile(apiP);
        }
      } else if (user.role === 'DOCTOR') {
        const d = await getDoctorByUserId(user.id);
        if (d) setDoctorProfile(d);
        else {
          const apiD = await api.getDoctor(doctorProfile?.id || user.id);
          setDoctorProfile(apiD);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        uid: currentUid,
        role: user?.role || null,
        patientProfile,
        doctorProfile,
        staffProfile,
        firebaseUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        switchRole,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
