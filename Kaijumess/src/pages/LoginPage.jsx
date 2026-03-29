import React, { useEffect, useRef, useState } from 'react';
import {
  ExclamationCircleFilled,
  EyeInvisibleOutlined,
  EyeOutlined,
  GoogleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useLottie } from 'lottie-react';

import rabbitAnimData from '../assets/Rabit-Sleep.json';
import { useAuth } from '../hooks/useAuth';
import {
  validateLoginIdentity,
  validatePassword,
} from '../services/authValidation';

const RABBIT_FRAMES = {
  SLEEPING: [0, 60],
  WAKE_UP: [90, 120],
  WAVING_HI: [120, 145],
  GO_TO_SLEEP: [150, 180],
};

const initialForm = {
  identity: '',
  password: '',
};

const getLoginErrors = (form) => {
  const nextErrors = {
    identity: validateLoginIdentity(form.identity),
    password: validatePassword(form.password),
  };

  return Object.fromEntries(
    Object.entries(nextErrors).filter(([, message]) => Boolean(message)),
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [socialHint, setSocialHint] = useState('');
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

  const handleIdentityFocus = () => {
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
    const nextErrors = getLoginErrors(form);

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
    setSocialHint('');

    if (!touched[name]) {
      return;
    }

    const nextErrors = getLoginErrors(nextForm);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: nextErrors[name],
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setSocialHint('');

    const nextTouched = {
      identity: true,
      password: true,
    };
    const nextErrors = getLoginErrors(form);

    setTouched(nextTouched);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Form dang nhap chua hop le. Ban kiem tra lai giup toi.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      await login({
        identity: form.identity.trim(),
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

  const handleGoogleClick = () => {
    setSubmitError('');
    setSocialHint('Nut Google moi la giao dien. OAuth chua duoc noi vao backend.');
  };

  const inputClassName = (fieldName) =>
    [
      'auth-input w-full rounded-2xl px-4 py-4 text-[15px] font-medium',
      errors[fieldName] ? 'auth-input--error' : '',
    ]
      .join(' ')
      .trim();

  return (
    <div className="auth-stage relative min-h-screen items-center justify-center p-4 font-body md:flex md:p-8">
      <main className="auth-shell grid min-h-[760px] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[32px] bg-surface-container-lowest md:grid-cols-2">
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
                Chao mung tro lai
              </h1>
              <p className="text-lg leading-relaxed text-on-surface-variant">
                Dang nhap de dong bo tin nhan va du lieu tai khoan cua ban tren KaijuMess.
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
              Dang nhap
            </p>
            <h2 className="text-3xl font-black tracking-tight text-on-surface md:text-[2.5rem]">
              Tiep tuc cung KaijuMess
            </h2>
            <p className="max-w-md text-sm leading-6 text-on-surface-variant">
              Frontend nay da duoc noi vao backend auth that. Ban co the dang nhap bang email hoac username.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {submitError ? (
              <div className="status-banner status-banner--error">
                <ExclamationCircleFilled className="mt-1 text-base" />
                <div className="space-y-1">
                  <p className="font-semibold">Khong the dang nhap</p>
                  <p className="text-sm leading-6">{submitError}</p>
                </div>
              </div>
            ) : null}

            {socialHint ? (
              <div className="status-banner status-banner--info">
                <InfoCircleOutlined className="mt-1 text-base" />
                <p className="text-sm leading-6">{socialHint}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor="identity"
                className="ml-1 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant"
              >
                Email hoac username
              </label>
              <input
                id="identity"
                name="identity"
                type="text"
                value={form.identity}
                onChange={handleChange}
                onFocus={handleIdentityFocus}
                onBlur={handleFieldBlur}
                placeholder="name@example.com hoac kaiju.user"
                autoComplete="username"
                className={inputClassName('identity')}
                aria-invalid={Boolean(errors.identity)}
              />
              <p className="ml-1 text-sm text-on-surface-variant">
                Dang nhap bang email hoac username da duoc backend tao luc dang ky.
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
                Mat khau
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
                  placeholder="Nhap mat khau cua ban"
                  autoComplete="current-password"
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
              <p className="ml-1 text-sm text-on-surface-variant">
                Mat khau can du 8 ky tu, co chu hoa, chu thuong va so.
              </p>
              {errors.password ? (
                <p className="ml-1 text-sm font-semibold text-error">{errors.password}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-4 text-base font-bold text-on-primary transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0"
            >
              {isSubmitting ? <LoadingOutlined spin /> : null}
              {isSubmitting ? 'Dang dang nhap...' : 'Dang nhap'}
            </button>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-on-surface-variant">
              <div className="h-px bg-outline-variant/80" />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">hoac</span>
              <div className="h-px bg-outline-variant/80" />
            </div>

            <button
              type="button"
              onClick={handleGoogleClick}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4 text-base font-semibold text-on-surface transition-colors duration-200 hover:border-primary hover:bg-surface-container-high"
            >
              <GoogleOutlined />
              Dang nhap voi Google
              <span className="rounded-full bg-surface-container-high px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                sap co
              </span>
            </button>

            <p className="text-center text-sm text-on-surface-variant">
              Chua co tai khoan?{' '}
              <Link to="/register" className="font-bold text-primary hover:underline">
                Dang ky ngay
              </Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
