import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CameraOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  DesktopOutlined,
  InfoCircleFilled,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StarFilled,
} from '@ant-design/icons';

import { useAppearance } from '../../hooks/useAppearance';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import {
  fetchAccountSessions,
  revokeAccountSession,
  updateAccountProfile,
} from '../../services/account';
import {
  getPasswordChecklist,
  validateConfirmPassword,
  validatePassword,
} from '../../services/authValidation';
import { changePassword, generateNewBackupCodes } from '../../services/security';
import { updateSettingsSection } from '../../services/settings';

const MAX_AVATAR_FILE_SIZE_BYTES = 512 * 1024;
const passwordSpecialCharacterPattern = /[^A-Za-z0-9]/;

const formatTimezoneLabel = (timeZone) => {
  if (!timeZone) {
    return 'Timezone not set';
  }

  try {
    const offsetValue = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
    })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value;

    const normalizedOffset = offsetValue?.replace(
      /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i,
      (_, sign, hours, minutes = '00') =>
        `GMT${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    );

    return `${normalizedOffset || 'GMT'} (${timeZone})`;
  } catch {
    return timeZone;
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Unknown';
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatJoinedDate = (value) => {
  if (!value) {
    return 'Joined recently';
  }

  try {
    return `Joined ${new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(value))}`;
  } catch {
    return 'Joined recently';
  }
};

const getSystemTimezone = () =>
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'Asia/Saigon';

const getInitials = (fullName) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const createDraft = (user) => ({
  avatarUrl: user?.avatarUrl || '',
  bio: user?.bio || '',
  displayName: user?.displayName || user?.fullName || '',
  fullName: user?.fullName || user?.displayName || '',
  timezone: user?.preferences?.account?.timezone || getSystemTimezone(),
  username: user?.username || '',
});

const normalizeSecurity = (value = {}) => ({
  backupCodes: Array.isArray(value.backupCodes) ? value.backupCodes : [],
  enabled: Boolean(value.enabled),
  method: value.method === 'email' ? 'email' : 'authenticator',
  updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
});

const Account = ({ currentUser, onLogout }) => {
  const fileInputRef = useRef(null);
  const { customWallpaperDataUrl, fontScale, wallpaperLabel } = useAppearance();
  const { logout, updateCurrentUser, updateCurrentUserPreferences } = useAuth();
  const { resolvedTheme, themeMode } = useTheme();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [draft, setDraft] = useState(() => createDraft(currentUser));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [mobileView, setMobileView] = useState('overview');
  const [notice, setNotice] = useState(null);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: '',
    currentPassword: '',
    nextPassword: '',
  });
  const [passwordVisibility, setPasswordVisibility] = useState({
    confirmPassword: false,
    currentPassword: false,
    nextPassword: false,
  });
  const [revokingSessionId, setRevokingSessionId] = useState('');
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setDraft(createDraft(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const security = normalizeSecurity(currentUser?.preferences?.security);
  const accountName = currentUser?.fullName || currentUser?.displayName || 'Kaiju User';
  const accountIdentity = currentUser?.email || currentUser?.identity || 'No identity yet';
  const avatarLabel = getInitials(accountName) || 'K';
  const hasPendingChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(createDraft(currentUser)),
    [currentUser, draft],
  );
  const currentSession = sessions.find((item) => item.isCurrent) || null;
  const joinedLabel = formatJoinedDate(
    currentUser?.createdAt || currentUser?.created_at || currentUser?.joinedAt,
  );
  const phoneLabel =
    currentUser?.phone || currentUser?.phoneNumber || currentUser?.preferences?.account?.phone || 'Add your phone number';
  const accountTier = currentUser?.preferences?.account?.tier || 'Pro Account';
  const requiredPasswordChecklist = useMemo(
    () => getPasswordChecklist(passwordForm.nextPassword),
    [passwordForm.nextPassword],
  );
  const passwordChecklist = useMemo(
    () => [
      ...requiredPasswordChecklist,
      {
        key: 'special',
        label: 'Special character (!@#)',
        met: passwordSpecialCharacterPattern.test(passwordForm.nextPassword),
      },
    ],
    [passwordForm.nextPassword, requiredPasswordChecklist],
  );
  const passwordStrengthPercent = useMemo(() => {
    const metCount = requiredPasswordChecklist.filter((item) => item.met).length;
    return Math.round((metCount / requiredPasswordChecklist.length) * 100);
  }, [requiredPasswordChecklist]);
  const passwordStrengthLabel =
    passwordStrengthPercent >= 75
      ? 'Great'
      : passwordStrengthPercent >= 50
        ? 'Good'
        : passwordStrengthPercent >= 25
          ? 'Fair'
          : 'Weak';

  const showNotice = (message, type = 'success') => setNotice({ message, type });

  const updatePasswordField = (field, value) => {
    setPasswordForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
    setPasswordErrors((currentValue) => ({
      ...currentValue,
      [field]: '',
    }));
  };

  const togglePasswordVisibility = (field) => {
    setPasswordVisibility((currentValue) => ({
      ...currentValue,
      [field]: !currentValue[field],
    }));
  };

  const updateDraftField = (field, value) => {
    setDraft((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      showNotice('Chi chap nhan file anh cho avatar.', 'error');
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      showNotice('Avatar vuot qua gioi han 512KB de luu trong database.', 'error');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        showNotice('Khong doc duoc avatar vua chon.', 'error');
        return;
      }

      updateDraftField('avatarUrl', reader.result);
      showNotice('Avatar da duoc nap vao ban nhap. Bam Save Changes de luu.', 'info');
    };

    reader.onerror = () => showNotice('Khong tai duoc avatar.', 'error');
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);

    try {
      const payload = await updateAccountProfile(draft);
      updateCurrentUser(payload.user);
      showNotice('Thong tin tai khoan da duoc cap nhat vao database.');
    } catch (error) {
      showNotice(error.message || 'Khong the cap nhat tai khoan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetProfile = () => {
    setDraft(createDraft(currentUser));
    setNotice(null);
  };

  const handleOpenChangePassword = () => {
    setMobileView('changePassword');
    setNotice(null);
  };

  const handleCloseChangePassword = () => {
    setMobileView('overview');
    setPasswordErrors({});
    setNotice(null);
  };

  const handleForgotCurrentPassword = () => {
    showNotice(
      'Forgot password flow chua co man hinh rieng. Neu can, toi se noi sang reset password qua email.',
      'info',
    );
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);

    try {
      const payload = await fetchAccountSessions();
      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
    } catch (error) {
      showNotice(error.message || 'Khong the tai danh sach session.', 'error');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleToggleSessions = async () => {
    const nextOpen = !isSessionsOpen;
    setIsSessionsOpen(nextOpen);

    if (nextOpen) {
      await loadSessions();
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokingSessionId(sessionId);

    try {
      const payload = await revokeAccountSession(sessionId);
      setSessions((currentValue) => currentValue.filter((item) => item.id !== sessionId));

      if (payload.revokedCurrentSession) {
        showNotice('Session hien tai da bi thu hoi. Dang xuat...', 'info');
        (onLogout || logout)();
        return;
      }

      showNotice('Session da duoc thu hoi.');
    } catch (error) {
      showNotice(error.message || 'Khong the thu hoi session.', 'error');
    } finally {
      setRevokingSessionId('');
    }
  };

  const persistSecurity = async (nextSecurity) => {
    const payload = await updateSettingsSection('security', nextSecurity);
    updateCurrentUserPreferences('security', payload.preferences?.security || nextSecurity);
    return payload.preferences?.security || nextSecurity;
  };

  const handleToggleTwoFactor = async () => {
    try {
      const resolvedSecurity = await persistSecurity({
        ...security,
        backupCodes:
          !security.enabled && security.backupCodes.length === 0
            ? generateNewBackupCodes()
            : security.backupCodes,
        enabled: !security.enabled,
        updatedAt: new Date().toISOString(),
      });
      showNotice(
        resolvedSecurity.enabled
          ? '2FA mock da duoc bat cho tai khoan nay.'
          : '2FA mock da duoc tat cho tai khoan nay.',
      );
    } catch (error) {
      showNotice(error.message || 'Khong the cap nhat 2FA.', 'error');
    }
  };

  const handleSetTwoFactorMethod = async (method) => {
    try {
      await persistSecurity({
        ...security,
        method,
        updatedAt: new Date().toISOString(),
      });
      showNotice(`Phuong thuc 2FA da duoc doi sang ${method}.`);
    } catch (error) {
      showNotice(error.message || 'Khong the doi phuong thuc 2FA.', 'error');
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      await persistSecurity({
        ...security,
        backupCodes: generateNewBackupCodes(),
        enabled: true,
        updatedAt: new Date().toISOString(),
      });
      showNotice('Backup codes da duoc tao moi.');
    } catch (error) {
      showNotice(error.message || 'Khong the tao backup codes.', 'error');
    }
  };

  const handleDownloadCodes = () => {
    if (security.backupCodes.length === 0) {
      showNotice('Chua co backup codes de tai xuong.', 'error');
      return;
    }

    const blob = new Blob([security.backupCodes.join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'kaijumess-account-2fa-backup-codes.txt';
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
    showNotice('Backup codes da duoc tai xuong.');
  };

  const handleExportArchive = () => {
    const payload = {
      account: {
        ...currentUser,
        timezone: draft.timezone,
      },
      exportedAt: new Date().toISOString(),
      preferences: currentUser?.preferences || {},
      runtime: {
        customWallpaper: Boolean(customWallpaperDataUrl),
        fontScale,
        resolvedTheme,
        themeMode,
        wallpaper: wallpaperLabel,
      },
      sessions,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'kaijumess-account-archive.json';
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
    showNotice('Archive da duoc xuat duoi dang JSON tren may nay.');
  };

  const handleContactSales = () => {
    window.location.href =
      'mailto:sales@kaijumess.app?subject=KaijuMess%20Enterprise&body=Hello%2C%20I%20want%20to%20learn%20more%20about%20Enterprise.';
  };

  const handleChangePassword = async () => {
    const nextErrors = {
      confirmPassword: validateConfirmPassword(
        passwordForm.nextPassword,
        passwordForm.confirmPassword,
      ),
      currentPassword: passwordForm.currentPassword ? '' : 'Ban chua nhap mat khau hien tai.',
      nextPassword: validatePassword(passwordForm.nextPassword),
    };

    setPasswordErrors(nextErrors);

    if (nextErrors.currentPassword || nextErrors.nextPassword || nextErrors.confirmPassword) {
      showNotice('Form doi mat khau chua hop le. Ban kiem tra lai cac truong can nhap.', 'error');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        nextPassword: passwordForm.nextPassword,
      });

      setPasswordForm({
        confirmPassword: '',
        currentPassword: '',
        nextPassword: '',
      });
      setPasswordErrors({});
      showNotice('Mat khau da duoc cap nhat thanh cong.');
      setMobileView('overview');
    } catch (error) {
      const requiresBackend =
        error.code === 'NETWORK_ERROR' || error.status === 404 || error.status === 501;

      showNotice(
        requiresBackend
          ? 'UI doi mat khau da san sang, nhung backend can endpoint /api/auth/change-password de doi that.'
          : error.message || 'Khong the doi mat khau ngay luc nay.',
        'error',
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (isMobileViewport) {
    if (mobileView === 'changePassword') {
      return (
        <section className="-mx-4 px-6 pb-8">
          {notice ? (
            <div className={`mb-6 status-banner status-banner--${notice.type}`}>
              <span className="mt-0.5">
                <InfoCircleFilled />
              </span>
              <div className="text-sm font-medium leading-6">{notice.message}</div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleCloseChangePassword}
            className="mb-6 inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back to Account
          </button>

          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary-container shadow-xl shadow-primary/10">
              <span
                className="material-symbols-outlined text-4xl text-on-primary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock_reset
              </span>
            </div>
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-on-surface">Change Password</h2>
            <p className="px-4 text-sm leading-relaxed text-on-surface-variant">
              Create a strong, unique password to keep your account secure and protected.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="ml-1 block text-sm font-semibold text-on-surface-variant">
                Current Password
              </label>
              <div className="group relative">
                <input
                  type={passwordVisibility.currentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                  placeholder="••••••••"
                  className={`h-14 w-full rounded-xl border-none bg-surface-container-highest px-5 pr-14 transition-all duration-200 placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 ${
                    passwordErrors.currentPassword ? 'ring-2 ring-error/20' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('currentPassword')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary"
                >
                  <span className="material-symbols-outlined">
                    {passwordVisibility.currentPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {passwordErrors.currentPassword ? (
                <p className="ml-1 text-xs font-medium text-error">{passwordErrors.currentPassword}</p>
              ) : null}
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="ml-1 block text-sm font-semibold text-on-surface-variant">
                  New Password
                </label>
                <div className="group relative">
                  <input
                    type={passwordVisibility.nextPassword ? 'text' : 'password'}
                    value={passwordForm.nextPassword}
                    onChange={(event) => updatePasswordField('nextPassword', event.target.value)}
                    placeholder="Min. 8 characters"
                    className={`h-14 w-full rounded-xl border-none bg-surface-container-highest px-5 pr-14 transition-all duration-200 placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 ${
                      passwordErrors.nextPassword ? 'ring-2 ring-error/20' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('nextPassword')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline"
                  >
                    <span className="material-symbols-outlined">
                      {passwordVisibility.nextPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {passwordErrors.nextPassword ? (
                  <p className="ml-1 text-xs font-medium text-error">{passwordErrors.nextPassword}</p>
                ) : null}
              </div>

              <div className="px-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Strength:{' '}
                    <span className="font-extrabold text-secondary">{passwordStrengthLabel}</span>
                  </span>
                  <span className="text-[11px] font-bold text-outline">{passwordStrengthPercent}%</span>
                </div>
                <div className="flex h-2 w-full gap-1 overflow-hidden rounded-full bg-surface-container-high p-0.5">
                  {[0, 25, 50, 75].map((step) => (
                    <div
                      key={step}
                      className={`h-full w-1/4 rounded-full ${
                        passwordStrengthPercent > step
                          ? 'bg-secondary-container'
                          : 'bg-surface-container-low'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low/50 p-5">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-on-surface">
                  Security Checklist
                </h3>
                <ul className="space-y-3">
                  {passwordChecklist.map((rule) => (
                    <li key={rule.key} className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          rule.met ? 'bg-secondary-container' : 'bg-surface-container-high'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[14px] font-bold ${
                            rule.met ? 'text-on-secondary-container' : 'text-outline'
                          }`}
                        >
                          {rule.met ? 'check' : 'circle'}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          rule.met ? 'text-on-surface' : 'text-on-surface-variant'
                        }`}
                      >
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="ml-1 block text-sm font-semibold text-on-surface-variant">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={passwordVisibility.confirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                  placeholder="Repeat new password"
                  className={`h-14 w-full rounded-xl border-none bg-surface-container-highest px-5 pr-14 transition-all duration-200 placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 ${
                    passwordErrors.confirmPassword ? 'ring-2 ring-error/20' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline"
                >
                  <span className="material-symbols-outlined">
                    {passwordVisibility.confirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {passwordErrors.confirmPassword ? (
                <p className="ml-1 text-xs font-medium text-error">{passwordErrors.confirmPassword}</p>
              ) : null}
            </div>

            <div className="pb-12 pt-6">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={isSubmittingPassword}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-lg font-bold text-on-primary shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <button
                type="button"
                onClick={handleForgotCurrentPassword}
                className="mt-4 h-14 w-full rounded-xl text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                I forgot my current password
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="-mx-4 space-y-8 px-6 pb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        {notice ? (
          <div className={`status-banner status-banner--${notice.type}`}>
            <span className="mt-0.5">
              <InfoCircleFilled />
            </span>
            <div className="text-sm font-medium leading-6">{notice.message}</div>
          </div>
        ) : null}

        <section className="relative overflow-hidden rounded-[2rem] bg-surface-container-lowest p-8 shadow-sm">
          <div className="relative z-10 flex flex-col items-start gap-6">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-surface-container-high shadow-lg">
              {draft.avatarUrl ? (
                <img src={draft.avatarUrl} alt={accountName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary-fixed text-2xl font-black text-on-primary-fixed">
                  {avatarLabel}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">{accountName}</h2>
              <p className="font-medium text-on-surface-variant">
                {accountTier} • {joinedLabel}
              </p>
            </div>
          </div>

          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        </section>

        <section className="space-y-4">
          <div className="px-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60">
              Personal Information
            </h3>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => showNotice('Email hien duoc lay tu tai khoan dang nhap. Neu can, toi co the tach man hinh sua email rieng.', 'info')}
              className="group flex w-full items-center justify-between rounded-[2rem] bg-surface-container-low p-4 text-left transition-colors hover:bg-surface-container-high"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-bold text-on-surface-variant/70">Email Address</p>
                  <p className="font-semibold text-on-surface">{accountIdentity}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline-variant transition-colors group-hover:text-primary">
                chevron_right
              </span>
            </button>

            <button
              type="button"
              onClick={() => showNotice('Phone number chua co flow cap nhat rieng. Hien dang dung gia tri luu tren account preferences neu co.', 'info')}
              className="group flex w-full items-center justify-between rounded-[2rem] bg-surface-container-low p-4 text-left transition-colors hover:bg-surface-container-high"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-bold text-on-surface-variant/70">Phone Number</p>
                  <p className="font-semibold text-on-surface">{phoneLabel}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline-variant transition-colors group-hover:text-primary">
                chevron_right
              </span>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="px-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60">
              Security
            </h3>
          </div>

          <div className="space-y-1 rounded-[2rem] bg-surface-container-lowest p-2 shadow-sm">
            <button
              type="button"
              onClick={handleOpenChangePassword}
              className="flex w-full items-center justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-surface-container-low"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">lock</span>
                <span className="font-semibold text-on-surface">Change Password</span>
              </div>
              <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSecurityOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-surface-container-low"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">shield</span>
                <span className="font-semibold text-on-surface">Two-Factor Authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-container">
                  {security.enabled ? 'On' : 'Off'}
                </span>
                <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleToggleSessions}
              className="flex w-full items-center justify-between rounded-[1.5rem] p-4 text-left transition-colors hover:bg-surface-container-low"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">devices</span>
                <span className="font-semibold text-on-surface">Recognized Devices</span>
              </div>
              <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
            </button>
          </div>

          {isSecurityOpen ? (
            <div className="space-y-3 rounded-[1.5rem] bg-surface-container-low p-4">
              <button
                type="button"
                onClick={handleToggleTwoFactor}
                className={`w-full rounded-[1.25rem] px-4 py-3 text-sm font-bold ${
                  security.enabled ? 'bg-tertiary/10 text-tertiary' : 'bg-primary text-on-primary'
                }`}
              >
                {security.enabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>

              <div className="grid grid-cols-2 gap-3">
                {['authenticator', 'email'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleSetTwoFactorMethod(method)}
                    className={`rounded-[1.25rem] border px-4 py-3 text-left text-sm font-bold ${
                      security.method === method
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant'
                    }`}
                  >
                    {method === 'authenticator' ? 'Authenticator App' : 'Email Backup'}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRegenerateCodes}
                  className="flex-1 rounded-full bg-surface-container-lowest px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCodes}
                  className="flex-1 rounded-full bg-surface-container-lowest px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface"
                >
                  Download
                </button>
              </div>
            </div>
          ) : null}

          {isSessionsOpen ? (
            <div className="space-y-3 rounded-[1.5rem] bg-surface-container-low p-4">
              <button
                type="button"
                onClick={loadSessions}
                disabled={isLoadingSessions}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary disabled:opacity-50"
              >
                <ReloadOutlined />
                {isLoadingSessions ? 'Loading...' : 'Refresh list'}
              </button>

              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-[1.25rem] bg-surface-container-lowest p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface">
                          {session.label}
                          {session.isCurrent ? ' • Current' : ''}
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Last seen {formatDateTime(session.lastSeenAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSessionId === session.id}
                        className="rounded-xl border border-outline-variant/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-tertiary disabled:opacity-50"
                      >
                        {revokingSessionId === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
                  {isLoadingSessions
                    ? 'Dang tai danh sach thiet bi...'
                    : currentSession?.label || 'Chua co session nao duoc nap.'}
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="px-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/60">
              Account Management
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => showNotice('Deactivate account hien la placeholder UX. Neu can, toi co the noi sang backend suspend flow.', 'info')}
              className="flex flex-col items-center justify-center gap-2 rounded-[2rem] bg-surface-container-highest/40 p-6 transition-colors hover:bg-surface-container-highest"
            >
              <span className="material-symbols-outlined text-on-surface-variant">pause_circle</span>
              <span className="text-sm font-bold text-on-surface">Deactivate</span>
            </button>

            <button
              type="button"
              onClick={() => showNotice('Delete account can flow xac nhan va backend xoa du lieu that. Hien tai moi la placeholder an toan.', 'error')}
              className="flex flex-col items-center justify-center gap-2 rounded-[2rem] bg-tertiary-fixed p-6 transition-colors hover:bg-tertiary-fixed-dim"
            >
              <span className="material-symbols-outlined text-tertiary">delete_forever</span>
              <span className="text-sm font-bold text-on-tertiary-fixed">Delete Account</span>
            </button>
          </div>
        </section>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleExportArchive}
            className="w-full rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Export Archive
          </button>
        </div>

        <footer className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex gap-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant/40">
            <button type="button" onClick={() => showNotice('Privacy Policy hien chua co page rieng.', 'info')}>
              Privacy Policy
            </button>
            <button type="button" onClick={() => showNotice('Terms of Service hien chua co page rieng.', 'info')}>
              Terms of Service
            </button>
          </div>
          <p className="text-[10px] font-medium text-on-surface-variant/30">KaijuMess account hub</p>
        </footer>
      </section>
    );
  }

  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div className="space-y-8 rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
        <header>
          <h2 className="text-3xl font-black tracking-tight text-on-surface">Account Settings</h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant md:text-base">
            Update your identity, account context and security preferences.
          </p>
        </header>

        {notice ? (
          <div className={`status-banner status-banner--${notice.type}`}>
            <span className="mt-0.5">
              <InfoCircleFilled />
            </span>
            <div className="text-sm font-medium leading-6">{notice.message}</div>
          </div>
        ) : null}

        <section className="rounded-[28px] bg-surface-container-low p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] bg-primary-fixed text-2xl font-black text-on-primary-fixed shadow-md">
                  {draft.avatarUrl ? (
                    <img src={draft.avatarUrl} alt={accountName} className="h-full w-full object-cover" />
                  ) : (
                    avatarLabel
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-lg border-2 border-surface-container-lowest bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-secondary shadow-sm">
                  <StarFilled className="text-[10px]" />
                  Pro
                </div>
              </div>

              <div>
                <p className="text-xl font-black tracking-tight text-on-surface">{accountName}</p>
                <p className="text-sm text-on-surface-variant">{accountIdentity}</p>
                <p className="mt-1 text-xs text-on-surface-variant">@{currentUser?.username || 'kaijumess'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                <CameraOutlined />
                Change Avatar
              </button>
              <button
                type="button"
                onClick={() => updateDraftField('avatarUrl', '')}
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 px-4 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-tertiary hover:text-tertiary"
              >
                <DeleteOutlined />
                Remove
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="rounded-[24px] bg-surface-container-lowest p-5">
              <p className="mb-2 text-xs font-semibold text-on-surface-variant">Full Name</p>
              <input type="text" value={draft.fullName} onChange={(event) => updateDraftField('fullName', event.target.value)} className="w-full border-none bg-transparent text-sm font-medium text-on-surface outline-none" />
            </label>

            <label className="rounded-[24px] bg-surface-container-lowest p-5">
              <p className="mb-2 text-xs font-semibold text-on-surface-variant">Display Name</p>
              <input type="text" value={draft.displayName} onChange={(event) => updateDraftField('displayName', event.target.value)} className="w-full border-none bg-transparent text-sm font-medium text-on-surface outline-none" />
            </label>

            <label className="rounded-[24px] bg-surface-container-lowest p-5">
              <p className="mb-2 text-xs font-semibold text-on-surface-variant">Username</p>
              <input type="text" value={draft.username} onChange={(event) => updateDraftField('username', event.target.value)} className="w-full border-none bg-transparent text-sm font-medium text-on-surface outline-none" />
            </label>

            <label className="rounded-[24px] bg-surface-container-lowest p-5">
              <p className="mb-2 text-xs font-semibold text-on-surface-variant">Timezone</p>
              <input type="text" value={draft.timezone} onChange={(event) => updateDraftField('timezone', event.target.value)} className="w-full border-none bg-transparent text-sm font-medium text-on-surface outline-none" />
            </label>

            <label className="rounded-[24px] bg-surface-container-lowest p-5 md:col-span-2">
              <p className="mb-2 text-xs font-semibold text-on-surface-variant">Bio</p>
              <textarea value={draft.bio} onChange={(event) => updateDraftField('bio', event.target.value)} rows={4} className="w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-on-surface outline-none" />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={handleSaveProfile} disabled={!hasPendingChanges || isSaving} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={handleResetProfile} disabled={!hasPendingChanges || isSaving} className="rounded-xl border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
              Reset
            </button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="rounded-[28px] bg-surface-container-highest p-6 xl:col-span-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container/35 text-secondary">
                <SafetyCertificateOutlined />
              </span>
              <div>
                <h4 className="font-bold text-on-surface">Two-Factor Authentication</h4>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  Account-level 2FA mock, method selection and recovery codes.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={handleToggleTwoFactor} className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${security.enabled ? 'bg-tertiary/10 text-tertiary' : 'bg-primary text-on-primary'}`}>
                {security.enabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
              <button type="button" onClick={() => setIsSecurityOpen((value) => !value)} className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-on-surface">
                {isSecurityOpen ? 'Hide Controls' : 'Manage'}
              </button>
            </div>

            {isSecurityOpen ? (
              <div className="mt-5 space-y-4 rounded-[24px] bg-surface-container-low px-5 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {['authenticator', 'email'].map((method) => (
                    <button key={method} type="button" onClick={() => handleSetTwoFactorMethod(method)} className={`rounded-[20px] border px-4 py-4 text-left text-sm font-bold ${security.method === method ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant'}`}>
                      {method === 'authenticator' ? 'Authenticator App' : 'Email Backup'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleRegenerateCodes} className="rounded-full bg-surface-container-lowest px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-on-surface">
                    Regenerate Codes
                  </button>
                  <button type="button" onClick={handleDownloadCodes} className="rounded-full bg-surface-container-lowest px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-on-surface">
                    Download Codes
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {security.backupCodes.length > 0 ? (
                    security.backupCodes.map((code) => (
                      <div key={code} className="rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm font-bold tracking-[0.16em] text-on-surface">
                        {code}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-surface-container-lowest px-4 py-4 text-sm text-on-surface-variant sm:col-span-2">
                      Chua co recovery code. Bat 2FA hoac bam Regenerate Codes de tao moi.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] bg-surface-container-low p-6 xl:col-span-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <DesktopOutlined />
              </span>
              <div>
                <h4 className="font-bold text-on-surface">Active Sessions</h4>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  View and revoke sign-in sessions stored in the database.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-surface-container-lowest p-4">
              <p className="text-xs font-bold text-on-surface">{currentSession?.label || 'Current Browser'}</p>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                {currentSession
                  ? `Last seen ${formatDateTime(currentSession.lastSeenAt)}`
                  : `${formatTimezoneLabel(draft.timezone)} | Active now`}
              </p>
            </div>

            <button type="button" onClick={handleToggleSessions} className="mt-5 w-full rounded-xl border border-outline-variant/30 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface transition-colors hover:bg-surface-container-high">
              {isSessionsOpen ? 'Hide devices' : 'See all devices'}
            </button>

            {isSessionsOpen ? (
              <div className="mt-5 space-y-3">
                <button type="button" onClick={loadSessions} disabled={isLoadingSessions} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary disabled:opacity-50">
                  <ReloadOutlined />
                  {isLoadingSessions ? 'Loading...' : 'Refresh list'}
                </button>

                {sessions.map((session) => (
                  <div key={session.id} className="rounded-[20px] bg-surface-container-lowest px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface">
                          {session.label}
                          {session.isCurrent ? ' | Current' : ''}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                          Created {formatDateTime(session.createdAt)}
                        </p>
                        <p className="text-xs leading-5 text-on-surface-variant">
                          Last seen {formatDateTime(session.lastSeenAt)}
                        </p>
                        {session.ipAddress ? (
                          <p className="text-xs leading-5 text-on-surface-variant">IP {session.ipAddress}</p>
                        ) : null}
                      </div>

                      <button type="button" onClick={() => handleRevokeSession(session.id)} disabled={revokingSessionId === session.id} className="rounded-xl border border-outline-variant/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-tertiary transition-colors hover:bg-error-container disabled:opacity-50">
                        {revokingSessionId === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    </div>
                  </div>
                ))}

                {!isLoadingSessions && sessions.length === 0 ? (
                  <div className="rounded-[20px] bg-surface-container-lowest px-4 py-4 text-sm text-on-surface-variant">
                    Chua co session nao trong database. Dang xuat va dang nhap lai se tao session moi.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-5 rounded-[28px] border border-outline-variant/10 bg-surface-container-lowest p-6 xl:col-span-12 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/8 text-tertiary">
                <CloudDownloadOutlined />
              </span>
              <div>
                <h4 className="font-bold text-on-surface">Data and Export</h4>
                <p className="mt-1 text-xs leading-6 text-on-surface-variant">
                  Download your account snapshot, synced preferences and active sessions.
                </p>
              </div>
            </div>

            <button type="button" onClick={handleExportArchive} className="rounded-xl bg-surface-container-low px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface transition-colors hover:bg-surface-container-high">
              Export Archive
            </button>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <div className="rounded-[28px] bg-surface-container-low p-6 shadow-sm">
          <h4 className="mb-6 text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
            Account Summary
          </h4>
          <div className="space-y-3 text-xs font-medium text-on-surface-variant">
            <p>Theme mode: {themeMode}</p>
            <p>Resolved theme: {resolvedTheme}</p>
            <p>Font scale: {fontScale}px</p>
            <p>Wallpaper: {wallpaperLabel}</p>
            <p>Timezone: {draft.timezone}</p>
            <p>Sessions loaded: {sessions.length}</p>
          </div>
        </div>

        <div className="rounded-[28px] bg-surface-container-low p-6 shadow-sm">
          <div className="mb-3 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LockOutlined />
            </span>
            <div>
              <h5 className="text-sm font-bold text-on-surface">Database-backed</h5>
              <p className="mt-2 text-xs leading-6 text-on-surface-variant">
                Avatar, profile data, session list and revoke actions now use backend storage.
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary shadow-lg">
          <div className="relative z-10">
            <h5 className="text-sm font-bold uppercase tracking-[0.18em]">Need more power?</h5>
            <p className="mt-2 text-sm leading-6 text-on-primary/85">
              Connect Enterprise offers advanced compliance, SSO and device control.
            </p>
            <button type="button" onClick={handleContactSales} className="mt-5 w-full rounded-xl bg-surface-container-lowest px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-transform hover:scale-[1.01]">
              Contact Sales
            </button>
          </div>

          <span className="absolute -bottom-5 -right-4 text-[84px] text-white/10">
            <DesktopOutlined />
          </span>
        </div>
      </aside>
    </section>
  );
};

export default Account;
