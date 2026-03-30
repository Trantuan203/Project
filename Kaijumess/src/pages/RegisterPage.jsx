import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  EyeInvisibleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useLottie } from 'lottie-react';

import rabbitAnimData from '../assets/Rabit-Sleep.json';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import {
  getPasswordChecklist,
  validateConfirmPassword,
  validateFullName,
  validatePassword,
  validateRegisterIdentity,
} from '../services/authValidation';

const RABBIT_FRAMES = {
  SLEEPING: [0, 60],
  WAKE_UP: [90, 120],
  WAVING_HI: [120, 145],
  GO_TO_SLEEP: [150, 180],
};

const initialForm = {
  confirmPassword: '',
  fullName: '',
  identity: '',
  password: '',
};

const getRegisterErrors = (form) => {
  const nextErrors = {
    fullName: validateFullName(form.fullName),
    identity: validateRegisterIdentity(form.identity),
    password: validatePassword(form.password),
    confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
  };

  return Object.fromEntries(
    Object.entries(nextErrors).filter(([, message]) => Boolean(message)),
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitHint, setSubmitHint] = useState(
    'Tai khoan moi se duoc tao tren backend va dang nhap ngay sau khi thanh cong.',
  );
  const [touched, setTouched] = useState({});
  const animationTimeoutRef = useRef(null);

  const lottieObj = useLottie({
    animationData: rabbitAnimData,
    autoplay: true,
    initialSegment: RABBIT_FRAMES.WAVING_HI,
    loop: true,
  });

  const clearPendingAnimation = () => {
    if (!animationTimeoutRef.current) {
      return;
    }

    window.clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = null;
  };

  const playSegment = (segment) => {
    if (lottieObj?.playSegments) {
      lottieObj.playSegments(segment, true);
    }
  };

  useEffect(() => {
    if (lottieObj?.setSpeed) {
      lottieObj.setSpeed(1.5);
    }
  }, [lottieObj]);

  useEffect(() => () => clearPendingAnimation(), []);

  const handleNormalFocus = () => {
    clearPendingAnimation();
    playSegment(RABBIT_FRAMES.WAVING_HI);
  };

  const handlePasswordFocus = () => {
    clearPendingAnimation();
    playSegment(RABBIT_FRAMES.GO_TO_SLEEP);
    animationTimeoutRef.current = window.setTimeout(() => {
      playSegment(RABBIT_FRAMES.SLEEPING);
    }, 250);
  };

  const handleFieldBlur = (event) => {
    const { name } = event.target;
    const nextTouched = { ...touched, [name]: true };
    const nextErrors = getRegisterErrors(form);

    clearPendingAnimation();
    playSegment(RABBIT_FRAMES.WAKE_UP);
    animationTimeoutRef.current = window.setTimeout(() => {
      playSegment(RABBIT_FRAMES.WAVING_HI);
    }, 250);

    setTouched(nextTouched);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: nextErrors[name],
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextForm = { ...form, [name]: value };

    setForm(nextForm);
    setSubmitError('');
    setSubmitHint(
      'Tai khoan moi se duoc tao tren backend va dang nhap ngay sau khi thanh cong.',
    );

    if (!touched[name] && !(name === 'password' && touched.confirmPassword)) {
      return;
    }

    const nextErrors = getRegisterErrors(nextForm);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: nextErrors[name],
      ...(name === 'password' ? { confirmPassword: nextErrors.confirmPassword } : {}),
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    const nextTouched = {
      confirmPassword: true,
      fullName: true,
      identity: true,
      password: true,
    };
    const nextErrors = getRegisterErrors(form);

    setTouched(nextTouched);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Ban can hoan thanh day du thong tin dang ky truoc khi tiep tuc.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSubmitHint('');
      await register({
        fullName: form.fullName,
        identity: form.identity,
        password: form.password,
      });
      navigate('/chat');
    } catch (error) {
      const nextErrorsFromServer = error.field
        ? { [error.field]: error.message }
        : {};

      setErrors((currentErrors) => ({
        ...currentErrors,
        ...nextErrorsFromServer,
      }));
      setTouched((currentTouched) => ({
        ...currentTouched,
        ...(error.field ? { [error.field]: true } : {}),
      }));
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = (fieldName) =>
    [
      'auth-input w-full rounded-2xl px-4 py-4 text-[15px] font-medium',
      errors[fieldName] ? 'auth-input--error' : '',
    ]
      .join(' ')
      .trim();

  const passwordChecks = getPasswordChecklist(form.password);

  return (
    <div className="auth-stage relative min-h-screen font-body md:flex md:items-center md:justify-center md:p-8">
      <div className="md:hidden">
        <header className="relative flex h-[371px] flex-col items-center justify-end overflow-hidden pb-12 pt-8">
          <div className="absolute left-[-10%] top-[-10%] h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-[10%] right-[-5%] h-48 w-48 rounded-full bg-secondary/5 blur-3xl" />
          <div className="relative z-10 mb-6 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-white/35 shadow-[0_16px_40px_rgba(0,88,188,0.08)] backdrop-blur-sm">
            <div className="h-36 w-36">{lottieObj.View}</div>
          </div>
          <div className="relative z-10 px-6 text-center">
            <h1 className="mb-2 text-4xl font-black tracking-tighter text-on-surface">{t('auth.createAccount')}</h1>
            <p className="text-lg font-medium text-on-surface-variant">{t('auth.createAccountHint')}</p>
          </div>
        </header>

        <main className="relative z-20 min-h-[calc(100vh-371px)] rounded-t-[3rem] bg-surface-container-lowest px-8 pb-12 pt-10 shadow-[0_-12px_40px_rgba(25,28,29,0.04)]">
          <div className="mb-10 flex items-center justify-center space-x-12">
            <Link to="/login" className="px-2 pb-1 text-lg font-semibold text-on-surface-variant transition-colors hover:text-primary">
              {t('auth.login')}
            </Link>
            <span className="relative px-2 pb-1 text-lg font-bold text-on-surface after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary">
              {t('auth.signUp')}
            </span>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {submitError ? (
              <div className="status-banner status-banner--error">
                <ExclamationCircleFilled className="mt-1 text-base" />
                <div className="space-y-1">
                  <p className="font-semibold">Khong the tao tai khoan</p>
                  <p className="text-sm leading-6">{submitError}</p>
                </div>
              </div>
            ) : null}

            {!submitError && submitHint ? (
              <div className="status-banner status-banner--info">
                <InfoCircleOutlined className="mt-1 text-base" />
                <p className="text-sm leading-6">{submitHint}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="fullName-mobile" className="ml-1 block text-sm font-semibold text-on-surface-variant">
                {t('auth.fullName')}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline">person</span>
                <input
                  id="fullName-mobile"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  onFocus={handleNormalFocus}
                  onBlur={handleFieldBlur}
                  placeholder="Nguyen Van A"
                  autoComplete="name"
                  className={`${inputClassName('fullName')} pl-12`}
                  aria-invalid={Boolean(errors.fullName)}
                />
              </div>
              {errors.fullName ? <p className="ml-1 text-sm font-semibold text-error">{errors.fullName}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="identity-mobile" className="ml-1 block text-sm font-semibold text-on-surface-variant">
                {t('auth.emailAddress')}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline">mail</span>
                <input
                  id="identity-mobile"
                  name="identity"
                  type="email"
                  value={form.identity}
                  onChange={handleChange}
                  onFocus={handleNormalFocus}
                  onBlur={handleFieldBlur}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={`${inputClassName('identity')} pl-12`}
                  aria-invalid={Boolean(errors.identity)}
                />
              </div>
              {errors.identity ? <p className="ml-1 text-sm font-semibold text-error">{errors.identity}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="password-mobile" className="ml-1 block text-sm font-semibold text-on-surface-variant">
                {t('auth.password')}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline">lock</span>
                <input
                  id="password-mobile"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handleFieldBlur}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className={`${inputClassName('password')} pl-12 pr-14`}
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((currentState) => !currentState)}
                  className="absolute right-4 text-outline transition-colors hover:text-primary"
                  aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
                >
                  {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              <div className="grid gap-2 rounded-2xl bg-surface-container-low px-4 py-3">
                {passwordChecks.map((rule) => (
                  <div key={rule.key} className="password-rule" data-met={rule.met}>
                    <CheckCircleFilled className="text-sm" />
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
              {errors.password ? <p className="ml-1 text-sm font-semibold text-error">{errors.password}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword-mobile" className="ml-1 block text-sm font-semibold text-on-surface-variant">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline">verified_user</span>
                <input
                  id="confirmPassword-mobile"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handleFieldBlur}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={`${inputClassName('confirmPassword')} pl-12 pr-14`}
                  aria-invalid={Boolean(errors.confirmPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((currentState) => !currentState)}
                  className="absolute right-4 text-outline transition-colors hover:text-primary"
                  aria-label={showConfirmPassword ? 'An mat khau xac nhan' : 'Hien mat khau xac nhan'}
                >
                  {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              {errors.confirmPassword ? <p className="ml-1 text-sm font-semibold text-error">{errors.confirmPassword}</p> : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-extrabold text-on-primary transition-all active:scale-[0.98] disabled:cursor-wait disabled:opacity-75"
            >
              {isSubmitting ? <LoadingOutlined spin /> : null}
                <span>{isSubmitting ? 'Dang tao tai khoan...' : t('auth.createAccount')}</span>
              {!isSubmitting ? <span className="material-symbols-outlined">arrow_forward</span> : null}
            </button>

            <p className="pt-2 text-center text-sm text-on-surface-variant">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-primary">{t('auth.login')}</Link>
            </p>
          </form>
        </main>
        <div className="h-8 bg-surface-container-lowest" />
      </div>

      <main className="auth-shell hidden min-h-[760px] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[32px] bg-surface-container-lowest md:grid md:grid-cols-2">
        <section className="auth-hero relative hidden overflow-hidden p-12 md:flex md:flex-col md:items-center md:justify-center">
          <div className="absolute left-12 top-12 z-20">
            <span className="text-2xl font-black tracking-[-0.08em] text-primary">KAIJUMESS</span>
          </div>

          <div className="relative z-10 flex max-w-sm flex-col items-center justify-center space-y-10 text-center">
            <div className="auth-orb relative flex h-80 w-80 items-center justify-center rounded-full">
              <div className="auth-orb-glow absolute inset-0 rounded-full blur-3xl" />
              <div className="relative z-10 h-72 w-72 -translate-y-2">{lottieObj.View}</div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">
                {t('auth.createAccount')}
              </h1>
              <p className="text-lg leading-relaxed text-on-surface-variant">
                {t('auth.createAccountHint')}
              </p>
            </div>
          </div>
        </section>

        <section className="auth-panel flex flex-col justify-center p-8 md:p-14 xl:p-16">
          <div className="mb-8 space-y-3">
            <span className="md:hidden text-2xl font-black tracking-[-0.08em] text-primary">
              KAIJUMESS
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-on-surface-variant">
              {t('auth.signUp')}
            </p>
            <h2 className="text-3xl font-black tracking-tight text-on-surface md:text-[2.5rem]">
              {t('auth.createAccount')}
            </h2>
            <p className="max-w-md text-sm leading-6 text-on-surface-variant">
              Dang ky bang ho ten, email va mat khau. Username se duoc backend tao tu dong cho ban.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {submitError ? (
              <div className="status-banner status-banner--error">
                <ExclamationCircleFilled className="mt-1 text-base" />
                <div className="space-y-1">
                  <p className="font-semibold">Khong the tao tai khoan</p>
                  <p className="text-sm leading-6">{submitError}</p>
                </div>
              </div>
            ) : null}

            {!submitError && submitHint ? (
              <div className="status-banner status-banner--info">
                <InfoCircleOutlined className="mt-1 text-base" />
                <p className="text-sm leading-6">{submitHint}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor="fullName"
                className="ml-1 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant"
              >
                {t('auth.fullName')}
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={form.fullName}
                onChange={handleChange}
                onFocus={handleNormalFocus}
                onBlur={handleFieldBlur}
                placeholder="Nguyen Van A"
                autoComplete="name"
                className={inputClassName('fullName')}
                aria-invalid={Boolean(errors.fullName)}
              />
              <p className="ml-1 text-sm text-on-surface-variant">
                Day la ten hien thi chinh tren ung dung chat.
              </p>
              {errors.fullName ? (
                <p className="ml-1 text-sm font-semibold text-error">{errors.fullName}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="identity"
                className="ml-1 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant"
              >
                {t('auth.emailAddress')}
              </label>
              <input
                id="identity"
                name="identity"
                type="email"
                value={form.identity}
                onChange={handleChange}
                onFocus={handleNormalFocus}
                onBlur={handleFieldBlur}
                placeholder="name@example.com"
                autoComplete="email"
                className={inputClassName('identity')}
                aria-invalid={Boolean(errors.identity)}
              />
              <p className="ml-1 text-sm text-on-surface-variant">
                Backend hien tai dang ky bang email. Username se duoc sinh tu dong.
              </p>
              {errors.identity ? (
                <p className="ml-1 text-sm font-semibold text-error">{errors.identity}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="ml-1 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant"
              >
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handleFieldBlur}
                  placeholder="Tao mat khau du manh"
                  autoComplete="new-password"
                  className={`${inputClassName('password')} pr-14`}
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((currentState) => !currentState)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-on-surface-variant transition-colors hover:text-primary"
                  aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
                >
                  {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>

              <div className="grid gap-2 rounded-2xl bg-surface-container-low px-4 py-3">
                {passwordChecks.map((rule) => (
                  <div key={rule.key} className="password-rule" data-met={rule.met}>
                    <CheckCircleFilled className="text-sm" />
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>

              {errors.password ? (
                <p className="ml-1 text-sm font-semibold text-error">{errors.password}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="ml-1 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant"
              >
                Xac nhan mat khau
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handleFieldBlur}
                  placeholder="Nhap lai dung mat khau"
                  autoComplete="new-password"
                  className={`${inputClassName('confirmPassword')} pr-14`}
                  aria-invalid={Boolean(errors.confirmPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((currentState) => !currentState)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-on-surface-variant transition-colors hover:text-primary"
                  aria-label={showConfirmPassword ? 'An mat khau xac nhan' : 'Hien mat khau xac nhan'}
                >
                  {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              <p className="ml-1 text-sm text-on-surface-variant">
                O nay phai khop chinh xac voi mat khau phia tren.
              </p>
              {errors.confirmPassword ? (
                <p className="ml-1 text-sm font-semibold text-error">{errors.confirmPassword}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-4 text-base font-bold text-on-primary transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0"
            >
              {isSubmitting ? <LoadingOutlined spin /> : null}
              {isSubmitting ? 'Dang tao tai khoan...' : 'Tao tai khoan'}
            </button>

            <p className="text-center text-sm text-on-surface-variant">
              Da co tai khoan?{' '}
              <Link to="/login" className="font-bold text-primary hover:underline">
                Dang nhap ngay
              </Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default RegisterPage;
