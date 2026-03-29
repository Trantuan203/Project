import React, { useMemo, useState } from 'react';
import {
  AudioOutlined,
  BellOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  InfoCircleFilled,
  MailOutlined,
  MessageOutlined,
  SearchOutlined,
  StarOutlined,
  StopOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { useAppearance } from '../../hooks/useAppearance';

const fallbackMedia = [
  {
    id: 'media-1',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCxmNgV4jXuJ44V9yH5F63Q3u35sYIiujk0BBEfF06PXMtVbc7V3o83b6DfMvem9Cq50ONwKwzj-L0xStb6fdmxZvudApAcEguG0NviW_PmXd-QEe11l2viPjxl9asexdT_F76Fb2NbdxDevY_d85R44XhhV7qmOfFVJ_8MGVjGMRDPd7EDjMSp1EOxtTuo1Dadwu1sINBT3bQm6fHFOgS7EXJRI1LjRpTPbbNi2FXGy6SiINPSfcqm0img9DBLfBbAPp22BfdbhDcu',
  },
  {
    id: 'media-2',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCsKow4oltAmXFeCLzxL8N01zCxPfEnlrOgpxrxwwy2_urd0UblUyeX0uyD0VEH5nXqDBM3qnI09TXPkJWoPTUcfzPTceESY_ocrkJrod_w1-jzpSptN0jUMMZdN2FH8flFiNn9hpVqR72Agmxg3KWyozaPsYyBoW4hYqsZqrkmfnFVdR8ef9U7bVyV61wE6H459Hnwn3Xowg5maVUj9RA9t8LPJOcQxZNzBCk16ALQ0lW9thuNwtl2ORQ7vAblJYZdCcNtNulYByNQ',
  },
  {
    id: 'media-3',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA7UR1ldV-HguI42xVvdngVDvl3kjt3LrziMSfX1_kYkIb0UNM7nYibdRWKi2SDkc-lVmU9iZ4vdv8S6qLVpyYdYMG5pNCvRNhj2VHfyYldEhT7ChfZcfuxtWrPHTHbKNJjB-YJiH4wqH3w7QBjYQUJ_0O4gcpQAixpM0bhbeQ3HBRZeZ2qKLGvvGfaoLOpKEGB5N2xRZ45gv0E8F8XfdBcCZFiRlFmCDKcCQ-TmBlGDzh38WoI0e3fQYNhBaRA3RBfDZ1uZSc0sPQm',
  },
  {
    id: 'media-4',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDsMF2CXj59Xd1n3aNUyl4frElhajaiGKyF4ZzA1ER5XQ8dcvKx-7qG8RdvZGMf154IhjSerymbIyOXc1BskqhsHySsYWx9oaI7TuSfdgO-DEjoqwjKId_I-jlEitGso6pUxzWak7Lnr8wcVN85oiNuz3qgnMMNJq8c301nMERwsuQYlMZDp3Fd77O-svD4fIGgDTkapYnf2gmvSJhkoXNcFHe__3IO8DP6PLLRllqazfTq_xOZnoRuJhd8YaYUk5itkVvPI72JUKks',
    overlay: '+12',
  },
];

const sharedGroups = [
  { id: 'dp', code: 'DP', label: 'Design System Principles', tone: 'bg-secondary-container text-on-secondary-container' },
  { id: 'cp', code: 'CP', label: 'Connect Product Team', tone: 'bg-primary-container text-on-primary-container' },
];

const getInitials = (fullName) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const formatTimezoneLabel = (timeZone) => {
  const offsetInMinutes = -new Date().getTimezoneOffset();
  const sign = offsetInMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetInMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');

  return `GMT${sign}${hours}:${minutes} (${timeZone})`;
};

const buildHandle = (currentUser) => {
  if (currentUser?.username) {
    return `@${currentUser.username}`;
  }

  if (currentUser?.identity) {
    const sanitized = currentUser.identity
      .split('@')[0]
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase();

    if (sanitized) {
      return `@${sanitized}`;
    }
  }

  return '@kaijumess';
};

const Profile = ({ currentUser }) => {
  const { fontScale, wallpaperLabel } = useAppearance();
  const [notice, setNotice] = useState(null);

  const profileName = currentUser?.fullName || currentUser?.displayName || 'Kaiju User';
  const profileAvatar = currentUser?.avatarUrl || '';
  const profileInitials = getInitials(profileName) || 'K';
  const profileHandle = buildHandle(currentUser);
  const profileEmail = currentUser?.email || currentUser?.identity || 'No email connected';
  const currentTimezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'Asia/Saigon';

  const profileCards = useMemo(
    () => [
      {
        icon: <MailOutlined />,
        label: 'Email',
        value: profileEmail,
      },
      {
        icon: <EnvironmentOutlined />,
        label: 'Location',
        value: 'Ho Chi Minh City, Vietnam',
      },
      {
        icon: <ClockCircleOutlined />,
        label: 'Timezone',
        value: formatTimezoneLabel(currentTimezone),
      },
      {
        icon: <TeamOutlined />,
        label: 'Availability',
        value: 'Mon - Fri, 9am - 6pm',
      },
    ],
    [currentTimezone, profileEmail],
  );

  const handleUnavailableFeature = (message) => {
    setNotice({
      message,
      type: 'info',
    });
  };

  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8 rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
        {notice ? (
          <div className={`status-banner status-banner--${notice.type}`}>
            <span className="mt-0.5">
              <InfoCircleFilled />
            </span>
            <div className="text-sm font-medium leading-6">{notice.message}</div>
          </div>
        ) : null}

        <section className="relative mb-2 overflow-hidden rounded-[32px]">
          <div className="h-52 w-full bg-gradient-to-br from-primary to-primary-container">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_34%)]" />
          </div>

          <div className="relative -mt-16 flex flex-col gap-6 px-6 pb-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-5">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[28px] border-4 border-surface bg-surface-container-lowest text-3xl font-black text-on-primary-fixed shadow-lg">
                  {profileAvatar ? (
                    <img
                      src={profileAvatar}
                      alt={profileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profileInitials
                  )}
                </div>
                <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-secondary">
                  <span className="block h-2.5 w-2.5 rounded-full bg-white" />
                </div>
              </div>

              <div className="pb-1">
                <h2 className="text-3xl font-black tracking-tight text-on-surface">
                  {profileName}
                </h2>
                <p className="mt-2 text-sm font-medium text-on-surface-variant">
                  Senior Product Designer • {profileHandle}
                </p>
              </div>
            </div>

            <div className="rounded-full border border-outline-variant/20 bg-surface-container-lowest/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant shadow-sm backdrop-blur">
              Wallpaper {wallpaperLabel} • Font {fontScale}px
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-6">
            <section className="rounded-[28px] bg-surface-container-lowest p-8 shadow-sm">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                Bio
              </h3>
              <p className="text-lg leading-8 text-on-surface">
                Passionate about crafting fluid digital experiences that bridge the gap between
                human emotion and functional utility. Currently refining KaijuMess settings into
                clean, reusable components.
              </p>
            </section>

            <div className="grid gap-6 sm:grid-cols-2">
              {profileCards.map((card) => (
                <div
                  key={card.label}
                  className="space-y-3 rounded-[24px] bg-surface-container-low p-6"
                >
                  <div className="flex items-center gap-3 text-primary">
                    <span className="text-lg">{card.icon}</span>
                    <span className="text-sm font-bold">{card.label}</span>
                  </div>
                  <p className="text-sm font-medium leading-6 text-on-surface">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] bg-primary p-6 text-on-primary shadow-lg shadow-primary/20">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.22em] opacity-80">
                Network
              </h4>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black tracking-tight">2.4k</p>
                  <p className="text-xs opacity-70">Connections</p>
                </div>

                <div className="flex -space-x-3">
                  {['M', 'S', 'A'].map((label, index) => (
                    <div
                      key={label}
                      className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-primary text-[11px] font-bold text-slate-900 ${
                        index === 0
                          ? 'bg-slate-200'
                          : index === 1
                            ? 'bg-slate-300'
                            : 'bg-slate-400'
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleUnavailableFeature(
                  'Send Message hien moi la placeholder trong settings. Neu can toi se noi thang ve chat detail.',
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-surface-container-highest px-4 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-surface-variant"
            >
              <MessageOutlined />
              Send Message
            </button>

            <button
              type="button"
              onClick={() =>
                handleUnavailableFeature(
                  'Audio Call can call flow/realtime backend. Hien tai dang dung o muc UX placeholder.',
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-outline-variant/30 bg-surface-container-lowest px-4 py-4 text-sm font-bold text-primary transition-colors hover:bg-surface-container-low"
            >
              <AudioOutlined />
              Audio Call
            </button>
          </aside>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-[32px] bg-surface-container-high p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-on-surface">
              Shared Media
            </h3>
            <button
              type="button"
              onClick={() =>
                handleUnavailableFeature(
                  'View all media can noi vao media gallery khi ban co du lieu chat that.',
                )
              }
              className="text-xs font-bold text-primary transition-colors hover:text-primary-container"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {fallbackMedia.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handleUnavailableFeature(
                    'Media preview dang la mockup. Neu can toi se lam modal preview cho gallery nay.',
                  )
                }
                className="group relative aspect-square overflow-hidden rounded-[18px] bg-surface-dim"
              >
                <img
                  src={item.image}
                  alt={item.id}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {item.overlay ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-lg font-bold text-white">{item.overlay}</span>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] bg-surface-container-low p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.2em] text-on-surface">
            Privacy & Safety
          </h3>

          <div className="space-y-2">
            {[
              {
                icon: <BellOutlined />,
                label: 'Mute notifications',
                message: 'Mute notifications can noi vao preferences khi ban gui mockup Notifications.',
                tone: 'text-on-surface-variant',
              },
              {
                icon: <StarOutlined />,
                label: 'Add to favorites',
                message: 'Favorites hien dang la UX placeholder, chua co data source.',
                tone: 'text-on-surface-variant',
              },
              {
                icon: <SearchOutlined />,
                label: 'Search in conversation',
                message: 'Search in conversation can lam tiep khi ban muon lam phan chat search.',
                tone: 'text-on-surface-variant',
              },
              {
                icon: <StopOutlined />,
                label: `Block ${profileName}`,
                message: 'Block user can backend/API de co hieu luc that.',
                tone: 'text-tertiary',
              },
              {
                icon: <WarningOutlined />,
                label: 'Report user',
                message: 'Report user can can endpoint report de gui du lieu that.',
                tone: 'text-tertiary',
              },
            ].map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleUnavailableFeature(item.message)}
                className={`flex w-full items-center gap-4 rounded-[18px] px-4 py-3 text-left transition-colors hover:bg-surface-container-highest ${item.tone} ${
                  index >= 3 ? 'hover:bg-error-container/20' : ''
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] bg-surface-container-lowest/80 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <TeamOutlined />
            </span>
            <div>
              <h3 className="text-sm font-bold text-on-surface">3 Shared Groups</h3>
              <p className="text-xs text-on-surface-variant">Conversation context snapshot</p>
            </div>
          </div>

          <div className="space-y-3">
            {sharedGroups.map((group) => (
              <div key={group.id} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${group.tone}`}
                >
                  {group.code}
                </div>
                <span className="text-xs font-medium text-on-surface-variant">{group.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
};

export default Profile;
