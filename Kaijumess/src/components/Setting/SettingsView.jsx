import React, { useMemo, useState } from 'react';
import {
  ArrowLeftOutlined,
  BellOutlined,
  BgColorsOutlined,
  LockOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';

import Account from './Account';
import Appearance from './Appearance';
import Notifications from './Notifications';
import Privacy from './Privacy';
import Profile from './Profile';

const navigationItems = [
  {
    description: 'Theme, motion va display',
    icon: <BgColorsOutlined />,
    key: 'appearance',
    label: 'Appearance',
  },
  {
    description: 'Tai khoan va thong tin login',
    icon: <UserOutlined />,
    key: 'account',
    label: 'Account',
  },
  {
    description: 'Ho so, avatar va ten hien thi',
    icon: <UserOutlined />,
    key: 'profile',
    label: 'Profile',
  },
  {
    description: 'Thong bao va nhac viec',
    icon: <BellOutlined />,
    key: 'notifications',
    label: 'Notifications',
  },
  {
    description: 'Bao mat va quyen rieng tu',
    icon: <LockOutlined />,
    key: 'privacy',
    label: 'Privacy',
  },
];

const SettingsView = ({ currentUser, onCloseSettings, onLogout }) => {
  const [activeSection, setActiveSection] = useState('appearance');

  const sectionMap = useMemo(
    () => ({
      account: <Account currentUser={currentUser} />,
      appearance: <Appearance currentUser={currentUser} />,
      notifications: <Notifications currentUser={currentUser} />,
      privacy: <Privacy currentUser={currentUser} />,
      profile: <Profile currentUser={currentUser} />,
    }),
    [currentUser],
  );

  const currentItem =
    navigationItems.find((item) => item.key === activeSection) ?? navigationItems[0];

  return (
    <section className="flex flex-1 overflow-hidden bg-surface">
      <aside className="hidden w-72 shrink-0 border-r border-outline-variant/20 bg-surface-container-low p-4 md:flex md:flex-col">
        <div className="rounded-[28px] bg-surface-container-lowest px-5 py-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            Settings
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-on-surface">
            Quan ly theo tung component
          </h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Moi muc da duoc tach thanh file rieng de ban gui code sau cho de sua va de quan ly.
          </p>
        </div>

        <nav className="mt-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = item.key === activeSection;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
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
                  {currentItem.label}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
                  Section hien tai dang doc tu component rieng trong thu muc `Setting`. Ban co the
                  gui code tung muc sau, toi se nhan vao dung file.
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
