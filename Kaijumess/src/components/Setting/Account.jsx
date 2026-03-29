import React, { useMemo, useState } from 'react';
import {
  CameraOutlined,
  CloudDownloadOutlined,
  DesktopOutlined,
  InfoCircleFilled,
  LockOutlined,
  SafetyCertificateOutlined,
  StarFilled,
} from '@ant-design/icons';

import { useAppearance } from '../../hooks/useAppearance';
import { useTheme } from '../../hooks/useTheme';

const formatTimezoneLabel = (timeZone) => {
  const offsetInMinutes = -new Date().getTimezoneOffset();
  const sign = offsetInMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetInMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');

  return `GMT${sign}${hours}:${minutes} (${timeZone})`;
};

const getInitials = (fullName) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const Account = ({ currentUser }) => {
  const { customWallpaperDataUrl, fontScale, wallpaperLabel } = useAppearance();
  const { resolvedTheme, themeMode } = useTheme();
  const [notice, setNotice] = useState(null);

  const accountName = currentUser?.fullName || currentUser?.displayName || 'Kaiju User';
  const accountIdentity = currentUser?.email || currentUser?.identity || 'No identity yet';
  const accountAvatar = currentUser?.avatarUrl || '';
  const accountInitials = getInitials(accountName) || 'K';
  const currentTimezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'Asia/Saigon';

  const generalInformation = useMemo(
    () => [
      {
        label: 'Display Name',
        value: accountName,
      },
      {
        label: 'Timezone',
        value: formatTimezoneLabel(currentTimezone),
      },
      {
        label: 'Bio',
        value:
          'Workspace owner dang dung KaijuMess voi settings tach component de de mo rong va quan ly.',
        fullWidth: true,
      },
    ],
    [accountName, currentTimezone],
  );

  const handleUnavailableFeature = (message) => {
    setNotice({
      message,
      type: 'info',
    });
  };

  const handleExportArchive = () => {
    const payload = {
      account: {
        avatarUrl: currentUser?.avatarUrl || '',
        email: currentUser?.email || '',
        fullName: accountName,
        id: currentUser?.id || 'local-user',
        identity: accountIdentity,
        username: currentUser?.username || '',
      },
      exportedAt: new Date().toISOString(),
      preferences: {
        customWallpaper: Boolean(customWallpaperDataUrl),
        fontScale,
        themeMode,
        wallpaper: wallpaperLabel,
      },
      runtime: {
        themeResolved: resolvedTheme,
        timezone: currentTimezone,
      },
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

    setNotice({
      message: 'Archive da duoc xuat duoi dang JSON tren may nay.',
      type: 'success',
    });
  };

  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-12 rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
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

        <section>
          <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
            Identity
          </h3>

          <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-surface-container-low px-6 py-6 shadow-sm transition-colors hover:bg-surface-container-high md:flex-row md:items-center">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] bg-primary-fixed text-2xl font-black text-on-primary-fixed shadow-md">
                  {accountAvatar ? (
                    <img
                      src={accountAvatar}
                      alt={accountName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    accountInitials
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-lg border-2 border-surface-container-lowest bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-secondary shadow-sm">
                  <StarFilled className="text-[10px]" />
                  Pro
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xl font-black tracking-tight text-on-surface">{accountName}</p>
                <p className="text-sm text-on-surface-variant">{accountIdentity}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleUnavailableFeature(
                  'Change Avatar chua noi upload/backend. Neu can toi se gan local preview hoac API upload.',
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              <CameraOutlined />
              Change Avatar
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
            General Information
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {generalInformation.map((item) => (
              <div
                key={item.label}
                className={`rounded-[24px] bg-surface-container-low p-5 ${
                  item.fullWidth ? 'md:col-span-2' : ''
                }`}
              >
                <p className="mb-1 text-xs font-semibold text-on-surface-variant">{item.label}</p>
                <p className="text-sm font-medium leading-6 text-on-surface">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
              Security & Access
            </h3>
            <span className="inline-flex w-fit rounded-full bg-secondary-container/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-secondary-container">
              All systems secure
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <div className="rounded-[28px] bg-surface-container-highest p-6 xl:col-span-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container/35 text-secondary">
                  <SafetyCertificateOutlined />
                </span>
                <div>
                  <h4 className="font-bold text-on-surface">Two-Factor Authentication</h4>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    Add an extra layer of security with a code from your mobile device.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                  Enabled via Connect Mobile
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleUnavailableFeature(
                      'Quan ly 2FA can backend hoac mobile flow. Hien tai moi dung o UI.',
                    )
                  }
                  className="text-sm font-bold text-primary transition-colors hover:text-primary-container"
                >
                  Manage
                </button>
              </div>
            </div>

            <div className="rounded-[28px] bg-surface-container-low p-6 xl:col-span-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <DesktopOutlined />
                </span>
                <div>
                  <h4 className="font-bold text-on-surface">Active Sessions</h4>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    Current web session overview.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-surface-container-lowest p-4">
                <p className="text-xs font-bold text-on-surface">Current Browser</p>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {currentTimezone} • Active now
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleUnavailableFeature(
                    'Danh sach thiet bi that can backend/API de track session dang nhap.',
                  )
                }
                className="mt-5 w-full rounded-xl border border-outline-variant/30 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface transition-colors hover:bg-surface-container-high"
              >
                See all devices
              </button>
            </div>

            <div className="flex flex-col gap-5 rounded-[28px] border border-outline-variant/10 bg-surface-container-lowest p-6 xl:col-span-12 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/8 text-tertiary">
                  <CloudDownloadOutlined />
                </span>
                <div>
                  <h4 className="font-bold text-on-surface">Data and Export</h4>
                  <p className="mt-1 text-xs leading-6 text-on-surface-variant">
                    Download a copy of your account snapshot and current local preferences.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportArchive}
                className="rounded-xl bg-surface-container-low px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface transition-colors hover:bg-surface-container-high"
              >
                Export Archive
              </button>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <div className="rounded-[28px] bg-surface-container-low p-6 shadow-sm">
          <h4 className="mb-6 text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
            Contextual Help
          </h4>

          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <StarFilled />
                </span>
                <div>
                  <h5 className="text-sm font-bold text-on-surface">Pro Badge Benefits</h5>
                  <p className="mt-2 text-xs leading-6 text-on-surface-variant">
                    Pro users get priority support and larger storage for archived conversations.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LockOutlined />
                </span>
                <div>
                  <h5 className="text-sm font-bold text-on-surface">Encryption Keys</h5>
                  <p className="mt-2 text-xs leading-6 text-on-surface-variant">
                    Theme, font scale and wallpaper are local now. Account-level encryption and
                    cross-device sync still need backend support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary shadow-lg">
          <div className="relative z-10">
            <h5 className="text-sm font-bold uppercase tracking-[0.18em]">Need more power?</h5>
            <p className="mt-2 text-sm leading-6 text-on-primary/85">
              Connect Enterprise offers advanced compliance, SSO and device control.
            </p>
            <button
              type="button"
              onClick={() =>
                handleUnavailableFeature(
                  'Contact Sales moi la placeholder. Neu can toi se gan form hoac link ngoai.',
                )
              }
              className="mt-5 w-full rounded-xl bg-surface-container-lowest px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-transform hover:scale-[1.01]"
            >
              Contact Sales
            </button>
          </div>

          <span className="absolute -bottom-5 -right-4 text-[84px] text-white/10">
            <DesktopOutlined />
          </span>
        </div>

        <div className="rounded-[28px] border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            KaijuMess Account
          </p>
          <div className="mt-4 space-y-3 text-xs font-medium text-on-surface-variant">
            <p>Theme mode: {themeMode}</p>
            <p>Resolved theme: {resolvedTheme}</p>
            <p>Font scale: {fontScale}px</p>
            <p>Wallpaper: {wallpaperLabel}</p>
          </div>
        </div>
      </aside>
    </section>
  );
};

export default Account;
