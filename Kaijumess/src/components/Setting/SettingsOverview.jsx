import React, { useMemo, useState } from 'react';
import { InfoCircleFilled } from '@ant-design/icons';

import { DEFAULT_FONT_SCALE } from '../../constants/appearance';
import { useAppearance } from '../../hooks/useAppearance';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../context/LanguageContext';

const getInitials = (fullName) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const getThemeLabel = (themeMode, resolvedTheme) => {
  if (themeMode === 'system') {
    return `System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`;
  }

  return themeMode === 'dark' ? 'Dark mode' : 'Light mode';
};

const getFontScaleLabel = (fontScale) => {
  if (fontScale <= DEFAULT_FONT_SCALE - 1) {
    return 'Compact';
  }

  if (fontScale >= DEFAULT_FONT_SCALE + 2) {
    return 'Large';
  }

  return 'Medium';
};

const LinkRow = ({ description, icon, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-container-low"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-primary">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="text-[12px] text-on-surface-variant">{description}</p>
      </div>
    </div>

    <span className="material-symbols-outlined text-[20px] text-outline-variant transition-colors group-hover:text-primary">
      chevron_right
    </span>
  </button>
);

const ToggleRow = ({ checked, description, icon, onToggle, title }) => (
  <div className="flex items-center justify-between p-4 transition-colors hover:bg-surface-container-low">
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="text-[12px] text-on-surface-variant">{description}</p>
      </div>
    </div>

    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full border border-white bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  </div>
);

const SettingsOverview = ({ currentUser, onNavigateSection }) => {
  const [notice, setNotice] = useState(null);
  const { fontScale } = useAppearance();
  const { notificationPreferences, setNotificationPreferences } = useNotificationCenter();
  const { languageOptions, t, language } = useLanguage();
  const { resolvedTheme, themeMode } = useTheme();

  const profileName = currentUser?.fullName || currentUser?.displayName || 'Kaiju User';
  const profileEmail = currentUser?.email || currentUser?.identity || 'No email connected';
  const profileAvatar = currentUser?.avatarUrl || '';
  const profileInitials = getInitials(profileName) || 'K';
  const securityEnabled = Boolean(currentUser?.preferences?.security?.enabled);

  const soundSummary = useMemo(() => {
    if (notificationPreferences.quietModeEnabled) {
      return `${notificationPreferences.soundPreset}, quiet ${notificationPreferences.quietStart}-${notificationPreferences.quietEnd}`;
    }

    return `${notificationPreferences.soundPreset}, alerts always on`;
  }, [
    notificationPreferences.quietEnd,
    notificationPreferences.quietModeEnabled,
    notificationPreferences.quietStart,
    notificationPreferences.soundPreset,
  ]);
  const currentLanguageLabel = languageOptions.find((item) => item.code === language)?.nativeLabel || 'Tiếng Việt';

  return (
    <div className="space-y-6">
      {notice ? (
        <div className={`status-banner status-banner--${notice.type}`}>
          <span className="mt-0.5">
            <InfoCircleFilled />
          </span>
          <div className="text-sm font-medium leading-6">{notice.message}</div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onNavigateSection('profile')}
        className="flex w-full items-center gap-4 rounded-xl bg-surface-container-lowest p-6 text-left shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-transform hover:scale-[1.01]"
      >
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary/10 bg-primary-fixed text-lg font-black text-on-primary-fixed">
          {profileAvatar ? (
            <img src={profileAvatar} alt={profileName} className="h-full w-full object-cover" />
          ) : (
            profileInitials
          )}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-on-surface">{profileName}</h2>
          <p className="truncate text-sm text-on-surface-variant">{profileEmail}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            {securityEnabled ? t('settings.protectedAccount') : t('settings.connectedAccount')}
          </span>
        </div>
      </button>

      <div className="space-y-2">
        <h3 className="px-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          {t('settings.account')} &amp; Security
        </h3>
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest">
          <LinkRow
            icon="lock"
            title={t('settings.privacy')}
            description="Last seen, profile photo, blocked contacts"
            onClick={() => onNavigateSection('privacy')}
          />
          <LinkRow
            icon="security"
            title={t('settings.security')}
            description={
              securityEnabled
                ? 'Two-step verification enabled, sessions active'
                : 'Two-step verification, sessions and backup codes'
            }
            onClick={() => onNavigateSection('account')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="px-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          {t('settings.notifications')}
        </h3>
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest">
          <ToggleRow
            checked={notificationPreferences.pushEnabled}
            icon="notifications"
            title={t('settings.notifications')}
            description={
              notificationPreferences.pushEnabled
                ? 'Enabled for all messages'
                : 'Disabled for this device'
            }
            onToggle={() =>
              setNotificationPreferences({
                pushEnabled: !notificationPreferences.pushEnabled,
              })
            }
          />
          <LinkRow
            icon="volume_up"
            title={t('settings.soundHapticsShort')}
            description={soundSummary}
            onClick={() => onNavigateSection('notifications')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="px-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          {t('settings.appearance')}
        </h3>
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest">
          <LinkRow
            icon="palette"
            title={t('settings.appearance')}
            description={getThemeLabel(themeMode, resolvedTheme)}
            onClick={() => onNavigateSection('appearance')}
          />
          <LinkRow
            icon="text_fields"
            title={t('settings.fontSize')}
            description={`${getFontScaleLabel(fontScale)} (${fontScale}px)`}
            onClick={() => onNavigateSection('appearance')}
          />
          <LinkRow
            icon="translate"
            title={t('settings.language')}
            description={currentLanguageLabel}
            onClick={() => onNavigateSection('language')}
          />
        </div>
      </div>

      <div className="space-y-2 pb-10">
        <h3 className="px-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          {t('settings.support')}
        </h3>
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest">
          <LinkRow
            icon="help"
            title={t('settings.helpCenter')}
            description="FAQs, user guides and support entry points"
            onClick={() =>
              setNotice({
                message:
                  'Help Center hien dang o muc placeholder. Neu can, toi se noi den docs hoac mot support view rieng.',
                type: 'info',
              })
            }
          />
          <LinkRow
            icon="info"
            title={t('settings.aboutApp')}
            description="Version 4.2.0 (Build 902)"
            onClick={() =>
              setNotice({
                message:
                  'About screen chua tach thanh view rieng. Neu muon, toi co the lam them changelog va thong tin ban build.',
                type: 'info',
              })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsOverview;
