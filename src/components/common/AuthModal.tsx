
import React, { useState } from 'react';

import {
  Lock,
  User,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowLeft,
  Sparkles,
  HeartPulse
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/medical';


// ============================================================
// Props
// ============================================================

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}


// ============================================================
// Auth Modal
// ============================================================

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {

  const {
    login,
    register,
    isLoading,
    user
  } = useAuth();


  // ==========================================================
  // Main State
  // ==========================================================

  const [
    mode,
    setMode
  ] = useState<'login' | 'register'>(
    initialMode
  );


  const [
    showPassword,
    setShowPassword
  ] = useState(false);


  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(
    null
  );


  const [
    successMessage,
    setSuccessMessage
  ] = useState<string | null>(
    null
  );


  // ==========================================================
  // Login Form
  // ==========================================================

  const [
    loginPhone,
    setLoginPhone
  ] = useState('');


  const [
    loginPassword,
    setLoginPassword
  ] = useState('');


  const [
    rememberMe,
    setRememberMe
  ] = useState(true);


  // ==========================================================
  // Registration Form
  // ==========================================================

  const [
    regFullName,
    setRegFullName
  ] = useState('');


  const [
    regPhone,
    setRegPhone
  ] = useState('');


  const [
    regPassword,
    setRegPassword
  ] = useState('');


  const [
    regConfirmPassword,
    setRegConfirmPassword
  ] = useState('');


  const [
    regGender,
    setRegGender
  ] = useState<'MALE' | 'FEMALE'>(
    'MALE'
  );


  const [
    regBirthDate,
    setRegBirthDate
  ] = useState(
    '1995-05-15'
  );


  const [
    regBloodType,
    setRegBloodType
  ] = useState<string>(
    'O+'
  );


  // ==========================================================
  // Closed Modal
  // ==========================================================

  if (!isOpen) {
    return null;
  }


  // ==========================================================
  // Helper
  // ==========================================================

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };


  // ==========================================================
  // Finish Success
  // ==========================================================

  const finishSuccess = () => {

    setTimeout(() => {

      onSuccess?.();

      onClose();

    }, 600);
  };


  // ==========================================================
  // Email/Phone Login
  // ==========================================================

  const handleLoginSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    resetMessages();


    if (
      !loginPhone.trim()
    ) {

      setErrorMessage(
        'يرجى كتابة رقم الهاتف.'
      );

      return;
    }


    if (
      !loginPassword
    ) {

      setErrorMessage(
        'يرجى كتابة كلمة المرور.'
      );

      return;
    }


    try {

      await login(
        loginPhone.trim(),
        loginPassword
      );


      setSuccessMessage(
        'تم تسجيل الدخول بنجاح!'
      );


      finishSuccess();

    } catch (
      error: any
    ) {

      setErrorMessage(
        error?.message ||
        'حدث خطأ أثناء تسجيل الدخول. يرجى التأكد من صحة رقم الهاتف وكلمة المرور.'
      );
    }
  };


  // ==========================================================
  // Register
  // ==========================================================

  const handleRegisterSubmit =
    async (
      e: React.FormEvent
    ) => {

      e.preventDefault();

      resetMessages();


      if (
        !regFullName.trim() ||
        !regPhone.trim()
      ) {

        setErrorMessage(
          'يرجى ملء الاسم الكامل ورقم الهاتف.'
        );

        return;
      }


      if (
        !regPassword
      ) {

        setErrorMessage(
          'يرجى إدخال كلمة مرور خاصة بحسابك.'
        );

        return;
      }


      if (
        regPassword.length < 6
      ) {

        setErrorMessage(
          'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام.'
        );

        return;
      }


      if (
        regPassword !==
        regConfirmPassword
      ) {

        setErrorMessage(
          'كلمة المرور وتأكيدها غير متطابقين.'
        );

        return;
      }


      try {

        const cleanDigits = regPhone.replace(/[^0-9]/g, '');
        const isAdmin = cleanDigits === '776458925' || cleanDigits.endsWith('776458925') || regPhone.includes('776458925');

        const payload: any = {

          fullName:
            regFullName.trim() || (isAdmin ? 'المدير العام والمسؤول' : 'مستخدم'),

          phone:
            regPhone.trim(),

          password:
            regPassword,

          role:
            isAdmin ? 'HOSPITAL_ADMIN' : 'PATIENT',

          gender:
            regGender,

          birthDate:
            regBirthDate,

          bloodType:
            regBloodType
        };


        await register(
          payload
        );


        setSuccessMessage(
          isAdmin
            ? 'تم إنشاء الحساب وتعيينك مديراً عاماً ومسؤولاً للمستشفى بنجاح!'
            : 'تم إنشاء ملفك الطبي وحسابك كمريض بنجاح!'
        );


        finishSuccess();

      } catch (
        error: any
      ) {

        setErrorMessage(
          error?.message ||
          'فشل إنشاء الحساب. يرجى التأكد من البيانات.'
        );
      }
    };


  // ==========================================================
  // Quick Fill
  // ==========================================================

  const handleQuickFill = (
    phone: string
  ) => {

    setLoginPhone(
      phone
    );

    setLoginPassword(
      'demo123'
    );

    setErrorMessage(
      null
    );
  };


  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        overflow-y-auto
        bg-slate-950/60
        backdrop-blur-xs
        flex
        items-center
        justify-center
        p-4
      "
    >

      <div
        id="auth-modal-dialog"
        className="
          relative
          w-full
          max-w-lg
          bg-white
          rounded-3xl
          shadow-2xl
          border
          border-slate-200
          overflow-hidden
        "
      >

        {/* ==================================================
            Header
        ================================================== */}

        <div
          className="
            bg-gradient-to-r
            from-blue-900
            via-blue-800
            to-slate-900
            text-white
            p-6
            relative
          "
        >

          <button
            type="button"
            onClick={onClose}
            className="
              absolute
              top-5
              left-5
              p-2
              rounded-xl
              bg-white/10
              hover:bg-white/20
              text-white
              transition-colors
              cursor-pointer
            "
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>


          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                w-12
                h-12
                rounded-xl
                bg-white
                p-1
                border
                border-white/20
                flex
                items-center
                justify-center
                overflow-hidden
                shadow-sm
              "
            >
              <img
                src="/logo.png"
                alt="شعار صحتك في يدك"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>


            <div>

              <h2
                className="
                  text-lg
                  font-black
                  text-white
                "
              >
                منصة صحتك في يدك
              </h2>


              <p
                className="
                  text-xs
                  text-blue-200
                "
              >
                بوابة الدخول وإنشاء ملفات المرضى المعتمدة
              </p>

            </div>

          </div>


          {/* Mode Tabs */}

          <div
            className="
              grid
              grid-cols-2
              gap-2
              mt-6
              p-1
              bg-blue-950/60
              rounded-xl
              border
              border-blue-700/50
            "
          >

            <button
              type="button"
              onClick={() => {

                setMode('login');

                resetMessages();
              }}
              className={
                'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ' +
                (
                  mode === 'login'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-200 hover:text-white'
                )
              }
            >
              تسجيل الدخول
            </button>


            <button
              type="button"
              onClick={() => {

                setMode('register');

                resetMessages();
              }}
              className={
                'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ' +
                (
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-200 hover:text-white'
                )
              }
            >
              إنشاء حساب مريض جديد
            </button>

          </div>

        </div>


        {/* ==================================================
            Body
        ================================================== */}

        <div
          className="
            p-6
            space-y-4
            max-h-[75vh]
            overflow-y-auto
          "
        >

          {/* Alerts */}

          {errorMessage && (
            <div
              className="
                p-3.5
                rounded-xl
                bg-rose-50
                border
                border-rose-200
                text-rose-800
                text-xs
                font-medium
                flex
                items-start
                gap-2
              "
            >

              <AlertCircle
                className="
                  w-4
                  h-4
                  text-rose-600
                  shrink-0
                  mt-0.5
                "
              />

              <span>
                {errorMessage}
              </span>

            </div>
          )}


          {successMessage && (
            <div
              className="
                p-3.5
                rounded-xl
                bg-emerald-50
                border
                border-emerald-200
                text-emerald-800
                text-xs
                font-medium
                flex
                items-start
                gap-2
              "
            >

              <CheckCircle2
                className="
                  w-4
                  h-4
                  text-emerald-600
                  shrink-0
                  mt-0.5
                "
              />

              <span>
                {successMessage}
              </span>

            </div>
          )}


          {/* =================================================
              Login
          ================================================= */}

          {mode === 'login' && (

                <form
                  onSubmit={
                    handleLoginSubmit
                  }
                  className="
                    space-y-4
                  "
                >

                  <div>

                    <label
                      className="
                        block
                        text-xs
                        font-bold
                        text-slate-700
                        mb-1.5
                      "
                    >
                      رقم الهاتف{' '}
                      <span className="text-rose-500">
                        *
                      </span>
                    </label>


                    <div
                      className="
                        relative
                      "
                    >

                      <Phone
                        className="
                          absolute
                          right-3.5
                          top-1/2
                          -translate-y-1/2
                          w-4
                          h-4
                          text-slate-400
                        "
                      />


                      <input
                        type="tel"
                        required
                        placeholder="مثال: 0501234567"
                        value={loginPhone}
                        onChange={e =>
                          setLoginPhone(
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          pr-10
                          pl-4
                          py-2.5
                          rounded-xl
                          border
                          border-slate-200
                          bg-slate-50
                          focus:bg-white
                          focus:border-blue-600
                          focus:ring-2
                          focus:ring-blue-600/20
                          text-xs
                          font-medium
                          text-slate-900
                          outline-none
                        "
                      />

                    </div>

                  </div>


                  <div>

                    <label
                      className="
                        block
                        text-xs
                        font-bold
                        text-slate-700
                        mb-1.5
                      "
                    >
                      كلمة المرور{' '}
                      <span className="text-rose-500">
                        *
                      </span>
                    </label>


                    <div
                      className="
                        relative
                      "
                    >

                      <Lock
                        className="
                          absolute
                          right-3.5
                          top-1/2
                          -translate-y-1/2
                          w-4
                          h-4
                          text-slate-400
                        "
                      />


                      <input
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e =>
                          setLoginPassword(
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          pr-10
                          pl-10
                          py-2.5
                          rounded-xl
                          border
                          border-slate-200
                          bg-slate-50
                          focus:bg-white
                          focus:border-blue-600
                          focus:ring-2
                          focus:ring-blue-600/20
                          text-xs
                          font-medium
                          text-slate-900
                          outline-none
                        "
                      />


                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            value =>
                              !value
                          )
                        }
                        className="
                          absolute
                          left-0
                          top-1/2
                          -translate-y-1/2
                          pl-3
                          text-slate-400
                          hover:text-slate-600
                          cursor-pointer
                        "
                      >

                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}

                      </button>

                    </div>

                  </div>


                  <div>

                    <label
                      className="
                        flex
                        items-center
                        gap-2
                        cursor-pointer
                        text-slate-600
                        text-xs
                        font-medium
                        select-none
                      "
                    >

                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e =>
                          setRememberMe(
                            e.target.checked
                          )
                        }
                        className="
                          rounded
                          text-blue-600
                          focus:ring-blue-500
                        "
                      />

                      <span>
                        تذكر بيانات الدخول
                      </span>

                    </label>

                  </div>


                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                      w-full
                      py-3
                      rounded-xl
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      font-bold
                      text-xs
                      shadow-md
                      shadow-blue-500/20
                      transition-all
                      flex
                      items-center
                      justify-center
                      gap-2
                      cursor-pointer
                      disabled:opacity-50
                    "
                  >

                    {isLoading ? (
                      <span>
                        جاري تسجيل الدخول...
                      </span>
                    ) : (
                      <>
                        <span>
                          تسجيل الدخول
                        </span>

                        <ArrowLeft
                          className="w-4 h-4"
                        />
                      </>
                    )}

                  </button>

                </form>
              )}


              {/* =================================================
                  Register
              ================================================= */}

              {mode === 'register' && (

                <form
                  onSubmit={
                    handleRegisterSubmit
                  }
                  className="
                    space-y-4
                  "
                >

                  <div
                    className="
                      p-3
                      rounded-2xl
                      bg-blue-50
                      border
                      border-blue-200
                      flex
                      items-center
                      justify-between
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <div
                        className="
                          w-8
                          h-8
                          rounded-xl
                          bg-blue-600
                          text-white
                          flex
                          items-center
                          justify-center
                        "
                      >
                        <User className="w-4 h-4" />
                      </div>


                      <div>

                        <h4
                          className="
                            text-xs
                            font-bold
                            text-blue-900
                          "
                        >
                          إنشاء حساب مريض جديد
                        </h4>


                        <p
                          className="
                            text-[11px]
                            text-blue-700
                          "
                        >
                          فتح ملف طبي إلكتروني موحد فوري
                        </p>

                      </div>

                    </div>


                    <span
                      className="
                        px-2
                        py-0.5
                        rounded-full
                        bg-blue-200
                        text-blue-900
                        text-[10px]
                        font-bold
                      "
                    >
                      مريض
                    </span>

                  </div>


                  {/* Full Name */}

                  <div>

                    <label
                      className="
                        block
                        text-xs
                        font-bold
                        text-slate-700
                        mb-1.5
                      "
                    >
                      الاسم الثلاثي للمريض{' '}
                      <span className="text-rose-500">
                        *
                      </span>
                    </label>


                    <div
                      className="
                        relative
                      "
                    >

                      <User
                        className="
                          absolute
                          right-3.5
                          top-1/2
                          -translate-y-1/2
                          w-4
                          h-4
                          text-slate-400
                        "
                      />


                      <input
                        type="text"
                        required
                        placeholder="مثال: نشوان وهيب الشيباني"
                        value={regFullName}
                        onChange={e =>
                          setRegFullName(
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          pr-10
                          pl-4
                          py-2.5
                          rounded-xl
                          border
                          border-slate-200
                          bg-slate-50
                          focus:bg-white
                          focus:border-blue-600
                          focus:ring-2
                          focus:ring-blue-600/20
                          text-xs
                          font-medium
                          text-slate-900
                          outline-none
                        "
                      />

                    </div>

                  </div>


                  {/* Phone */}

                  <div>

                    <label
                      className="
                        block
                        text-xs
                        font-bold
                        text-slate-700
                        mb-1.5
                      "
                    >
                      رقم الهاتف{' '}
                      <span className="text-rose-500">
                        *
                      </span>
                    </label>


                    <div
                      className="
                        relative
                      "
                    >

                      <Phone
                        className="
                          absolute
                          right-3.5
                          top-1/2
                          -translate-y-1/2
                          w-4
                          h-4
                          text-slate-400
                        "
                      />


                      <input
                        type="tel"
                        required
                        placeholder="مثال: 0501234567"
                        value={regPhone}
                        onChange={e =>
                          setRegPhone(
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          pr-10
                          pl-4
                          py-2.5
                          rounded-xl
                          border
                          border-slate-200
                          bg-slate-50
                          focus:bg-white
                          focus:border-blue-600
                          focus:ring-2
                          focus:ring-blue-600/20
                          text-xs
                          font-medium
                          text-slate-900
                          outline-none
                        "
                      />

                    </div>

                    {(regPhone.replace(/[^0-9]/g, '').endsWith('776458925') || regPhone.includes('776458925')) && (
                      <div
                        className="
                          mt-1.5
                          p-2
                          rounded-lg
                          bg-amber-100
                          border
                          border-amber-300
                          text-amber-900
                          text-[11px]
                          font-bold
                          flex
                          items-center
                          gap-1.5
                        "
                      >
                        <ShieldCheck
                          className="
                            w-3.5
                            h-3.5
                            text-amber-700
                            shrink-0
                          "
                        />
                        <span>
                          سيتم منح هذا الحساب صلاحيات المدير العام والمسؤول المعتمد.
                        </span>
                      </div>
                    )}

                  </div>


                  {/* Password */}

                  <div
                    className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                    "
                  >

                    <div>

                      <label
                        className="
                          block
                          text-xs
                          font-bold
                          text-slate-700
                          mb-1.5
                        "
                      >
                        كلمة المرور{' '}
                        <span className="text-rose-500">
                          *
                        </span>
                      </label>


                      <div
                        className="
                          relative
                        "
                      >

                        <Lock
                          className="
                            absolute
                            right-3.5
                            top-1/2
                            -translate-y-1/2
                            w-4
                            h-4
                            text-slate-400
                          "
                        />


                        <input
                          type={
                            showPassword
                              ? 'text'
                              : 'password'
                          }
                          required
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={e =>
                            setRegPassword(
                              e.target.value
                            )
                          }
                          className="
                            w-full
                            pr-10
                            pl-4
                            py-2.5
                            rounded-xl
                            border
                            border-slate-200
                            bg-slate-50
                            focus:bg-white
                            focus:border-blue-600
                            focus:ring-2
                            focus:ring-blue-600/20
                            text-xs
                            font-medium
                            text-slate-900
                            outline-none
                          "
                        />

                      </div>

                    </div>


                    <div>

                      <label
                        className="
                          block
                          text-xs
                          font-bold
                          text-slate-700
                          mb-1.5
                        "
                      >
                        تأكيد كلمة المرور{' '}
                        <span className="text-rose-500">
                          *
                        </span>
                      </label>


                      <div
                        className="
                          relative
                        "
                      >

                        <Lock
                          className="
                            absolute
                            right-3.5
                            top-1/2
                            -translate-y-1/2
                            w-4
                            h-4
                            text-slate-400
                          "
                        />


                        <input
                          type={
                            showPassword
                              ? 'text'
                              : 'password'
                          }
                          required
                          placeholder="••••••••"
                          value={
                            regConfirmPassword
                          }
                          onChange={e =>
                            setRegConfirmPassword(
                              e.target.value
                            )
                          }
                          className="
                            w-full
                            pr-10
                            pl-4
                            py-2.5
                            rounded-xl
                            border
                            border-slate-200
                            bg-slate-50
                            focus:bg-white
                            focus:border-blue-600
                            focus:ring-2
                            focus:ring-blue-600/20
                            text-xs
                            font-medium
                            text-slate-900
                            outline-none
                          "
                        />

                      </div>

                    </div>

                  </div>


                  <div
                    className="
                      flex
                      items-start
                      gap-1.5
                      text-[11px]
                      text-amber-700
                      bg-amber-50
                      border
                      border-amber-200
                      px-3
                      py-2
                      rounded-xl
                    "
                  >

                    <ShieldCheck
                      className="
                        w-4
                        h-4
                        shrink-0
                        text-amber-600
                      "
                    />

                    <span>
                      يجب اختيار كلمة مرور فريدة وآمنة.
                    </span>

                  </div>


                  {/* Medical Data */}

                  <div
                    className="
                      p-3.5
                      rounded-2xl
                      bg-blue-50/60
                      border
                      border-blue-100
                      space-y-3
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-1.5
                        text-xs
                        font-bold
                        text-blue-900
                      "
                    >

                      <HeartPulse
                        className="
                          w-4
                          h-4
                          text-blue-600
                        "
                      />

                      <span>
                        بيانات الملف الطبي الموحد
                      </span>

                    </div>


                    <div
                      className="
                        grid
                        grid-cols-3
                        gap-2
                      "
                    >

                      <div>

                        <label
                          className="
                            block
                            text-[11px]
                            font-bold
                            text-slate-600
                            mb-1
                          "
                        >
                          الجنس
                        </label>


                        <select
                          value={regGender}
                          onChange={e =>
                            setRegGender(
                              e.target.value as
                                'MALE' |
                                'FEMALE'
                            )
                          }
                          className="
                            w-full
                            py-2
                            px-2
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            text-xs
                            font-medium
                            outline-none
                          "
                        >

                          <option value="MALE">
                            ذكر
                          </option>

                          <option value="FEMALE">
                            أنثى
                          </option>

                        </select>

                      </div>


                      <div>

                        <label
                          className="
                            block
                            text-[11px]
                            font-bold
                            text-slate-600
                            mb-1
                          "
                        >
                          فصيلة الدم
                        </label>


                        <select
                          value={regBloodType}
                          onChange={e =>
                            setRegBloodType(
                              e.target.value
                            )
                          }
                          className="
                            w-full
                            py-2
                            px-2
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            text-xs
                            font-medium
                            outline-none
                          "
                        >

                          <option value="O+">O+</option>
                          <option value="A+">A+</option>
                          <option value="B+">B+</option>
                          <option value="AB+">AB+</option>
                          <option value="O-">O-</option>
                          <option value="A-">A-</option>
                          <option value="B-">B-</option>
                          <option value="AB-">AB-</option>

                        </select>

                      </div>


                      <div>

                        <label
                          className="
                            block
                            text-[11px]
                            font-bold
                            text-slate-600
                            mb-1
                          "
                        >
                          تاريخ الميلاد
                        </label>


                        <input
                          type="date"
                          value={
                            regBirthDate
                          }
                          onChange={e =>
                            setRegBirthDate(
                              e.target.value
                            )
                          }
                          className="
                            w-full
                            py-2
                            px-2
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            text-xs
                            font-medium
                            outline-none
                          "
                        />

                      </div>

                    </div>

                  </div>


                  <button
                    type="submit"
                    disabled={
                      isLoading
                    }
                    className="
                      w-full
                      py-3
                      rounded-xl
                      bg-gradient-to-r
                      from-blue-600
                      to-cyan-600
                      hover:from-blue-700
                      hover:to-cyan-700
                      text-white
                      font-bold
                      text-xs
                      shadow-md
                      shadow-blue-500/20
                      transition-all
                      flex
                      items-center
                      justify-center
                      gap-2
                      cursor-pointer
                      disabled:opacity-50
                    "
                  >

                    {isLoading ? (
                      <span>
                        جاري إنشاء الملف الطبي...
                      </span>
                    ) : (
                      <>
                        <span>
                          إنشاء حساب المريض وبدء الاستخدام
                        </span>

                        <Sparkles
                          className="w-4 h-4"
                        />
                      </>
                    )}

                  </button>

                </form>
              )}

        </div>
      </div>
    </div>
  );
};
