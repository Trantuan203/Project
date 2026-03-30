import React, { useEffect, useState } from 'react';
import {
  ArrowLeftOutlined,
  BellOutlined,
  HomeOutlined,
  BgColorsOutlined,
  LockOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';

import Account from './Account';
import Appearance from './Appearance';
import Language from './Language';
import Notifications from './Notifications';
import Privacy from './Privacy';
import Profile from './Profile';
import SettingsOverview from './SettingsOverview';
import MobileBottomNav from '../mobile/MobileBottomNav';
import { useLanguage } from '../../context/LanguageContext';

const buildNavigationItems = (t) => [
  {
    description: t('settings.descOverview'),
    icon: <HomeOutlined />,
    key: 'overview',
    label: t('settings.overview'),
  },
  {
    description: t('settings.descAppearance'),
    icon: <BgColorsOutlined />,
    key: 'appearance',
    label: t('settings.appearance'),
  },
  {
    description: t('settings.descAccount'),
    icon: <UserOutlined />,
    key: 'account',
    label: t('settings.account'),
  },
  {
    description: t('settings.descProfile'),
    icon: <UserOutlined />,
    key: 'profile',
    label: t('settings.profile'),
  },
  {
    description: t('settings.descNotifications'),
    icon: <BellOutlined />,
    key: 'notifications',
    label: t('settings.notifications'),
  },
  {
    description: t('settings.descLanguage'),
    icon: <BgColorsOutlined />,
    key: 'language',
    label: t('settings.language'),
  },
  {
    description: t('settings.descPrivacy'),
    icon: <LockOutlined />,
    key: 'privacy',
    label: t('settings.privacy'),
  },
];

const DEFAULT_SETTINGS_SECTION = 'overview';

const SettingsView = ({
  currentUser,
  onCloseSettings,
  onLogout,
  onOpenCalls,
  onOpenChats,
  onOpenPeople,
}) => {
  const { t } = useLanguage();
  const navigationItems = buildNavigationItems(t);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const activeSection = navigationItems.some((item) => item.key === requestedSection)
    ? requestedSection
    : DEFAULT_SETTINGS_SECTION;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const handleSectionChange = (nextSection) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', 'settings');
    nextParams.set('section', nextSection);
    setSearchParams(nextParams, { replace: true });
  };

  const sectionMap = {
    overview: <SettingsOverview currentUser={currentUser} onNavigateSection={handleSectionChange} />,
    account: <Account currentUser={currentUser} onLogout={onLogout} />,
    appearance: <Appearance currentUser={currentUser} />,
    language: <Language />,
    notifications: <Notifications currentUser={currentUser} />,
    privacy: <Privacy currentUser={currentUser} />,
    profile: <Profile currentUser={currentUser} />,
  };

  const currentItem =
    navigationItems.find((item) => item.key === activeSection) ?? navigationItems[0];
  const bottomNavItems = [
    {
      icon: 'chat',
      key: 'chat',
      label: 'Chats',
      onClick: onOpenChats,
    },
    {
      icon: 'call',
      key: 'calls',
      label: 'Calls',
      onClick: onOpenCalls,
    },
    {
      icon: 'group',
      key: 'people',
      label: 'People',
      onClick: onOpenPeople,
    },
    {
      fillWhenActive: true,
      icon: 'settings',
      key: 'settings',
      label: t('settings.settings'),
      onClick: () => handleSectionChange('overview'),
    },
  ];

  const mobileTitle = activeSection === 'overview' ? t('settings.settings') : currentItem.label;

  if (isMobileViewport) {
    return (
      <section className="relative flex min-w-0 flex-1 flex-col bg-surface">
        <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-white/80 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {activeSection === 'overview' ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface-container-high border border-outline-variant/15 text-sm font-black text-on-primary-fixed">
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser?.fullName || currentUser?.username || 'User'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (currentUser?.fullName || currentUser?.username || 'K')
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">{mobileTitle}</h1>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSectionChange('overview')}
                  className="rounded-full p-2 text-on-surface transition-colors hover:bg-slate-100/60"
                  aria-label="Quay lai settings overview"
                >
                  <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">{mobileTitle}</h1>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              activeSection === 'overview' ? handleSectionChange('overview') : onCloseSettings()
            }
            className="rounded-full p-2 text-blue-700 transition-colors hover:bg-slate-100/60"
            aria-label={activeSection === 'overview' ? 'Settings' : 'Dong settings'}
          >
            <span className="material-symbols-outlined text-[22px]">
              {activeSection === 'overview' ? 'settings' : 'close'}
            </span>
          </button>
        </header>

        <main className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-28 pt-20">
          {activeSection === 'overview' ? (
            <div className="mb-4 flex items-center gap-3 rounded-[24px] bg-surface-container-low px-4 py-3 shadow-sm">
              <button
                type="button"
                onClick={onCloseSettings}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                <ArrowLeftOutlined />
                {t('settings.backToChat')}
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
              >
                <LogoutOutlined />
                {t('settings.logout')}
              </button>
            </div>
          ) : null}
          {sectionMap[activeSection]}
        </main>

        <MobileBottomNav
          activeKey="settings"
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white/70 px-4 pb-6 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-2xl"
          items={bottomNavItems}
          variant="settings"
        />
      </section>
    );
  }

  return (
    <section className="flex flex-1 overflow-hidden bg-surface">
      <aside className="hidden w-72 shrink-0 border-r border-outline-variant/20 bg-surface-container-low p-4 md:flex md:flex-col">
        <div className="rounded-[28px] bg-surface-container-lowest px-5 py-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            Settings
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-on-surface">
            Manage the whole workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Overview la landing page tong. Moi muc chi tiet van duoc tach rieng de sua va mo rong
            de dang.
          </p>
        </div>

        <nav className="mt-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = item.key === activeSection;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSectionChange(item.key)}
                className={`flex w-full items-start gap-4 rounded-[24px] px-4 py-4 text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="mt-0.5 text-lg">{item.icon}</span>
                <span className="space-y-1">
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="block text-xs leading-5 text-on-surface-variant">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 overflow-hidden">
        <div className="hide-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
            <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                  Settings structure
                </p>
                <h1 className="text-3xl font-black tracking-tight text-on-surface md:text-4xl">
                  {activeSection === 'overview' ? 'Settings Overview' : currentItem.label}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
                  {activeSection === 'overview'
                    ? 'Tong hop cac cai dat quan trong de ban nhin nhanh tren mobile va nhay vao tung muc chi tiet.'
                    : 'Section nay dang dung component rieng trong thu muc Setting, giu cho viec sua tung muc doc lap va ro rang hon.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onCloseSettings}
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                >
                  <ArrowLeftOutlined />
                  Quay lai chat
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                >
                  <LogoutOutlined />
                  Dang xuat
                </button>
              </div>
            </header>

            {sectionMap[activeSection]}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SettingsView;
