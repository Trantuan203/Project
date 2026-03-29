import React, { useState } from 'react';
import {
  BellOutlined,
  CustomerServiceOutlined,
  DesktopOutlined,
  InfoCircleFilled,
  NotificationOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

import { notificationSoundPresets } from '../../constants/notificationCenter';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={onChange}
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
);

const Notifications = () => {
  const [notice, setNotice] = useState(null);
  const { notificationPreferences, setNotificationPreferences, unreadCount } =
    useNotificationCenter();

  const updatePreferences = (updates, message) => {
    setNotificationPreferences(updates);
    setNotice({
      message,
      type: 'success',
    });
  };

  const cycleSoundPreset = () => {
    const currentIndex = notificationSoundPresets.indexOf(notificationPreferences.soundPreset);
    const nextPreset =
      notificationSoundPresets[(currentIndex + 1) % notificationSoundPresets.length];

    updatePreferences(
      { soundPreset: nextPreset },
      `Sound preset switched to ${nextPreset} and saved locally.`,
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-on-surface">
              Notification Preferences
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant md:text-base">
              Phan lich su thong bao, loi moi ket ban, loi moi tham gia nhom va trending groups da
              duoc chuyen ra ngoai chat shell. Bam icon chuong canh settings de mo no.
            </p>
          </div>

          <div className="rounded-[24px] bg-surface-container-low px-5 py-4 text-right shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Unread badge
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-primary">{unreadCount}</p>
            <p className="mt-1 text-xs text-on-surface-variant">dang hien o icon chuong</p>
          </div>
        </div>
      </div>

      {notice ? (
        <div className={`status-banner status-banner--${notice.type}`}>
          <span className="mt-0.5">
            <InfoCircleFilled />
          </span>
          <div className="text-sm font-medium leading-6">{notice.message}</div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6 rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-[24px] bg-surface-container-low p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-6 flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <DesktopOutlined />
                </span>
                <Toggle
                  checked={notificationPreferences.pushEnabled}
                  onChange={() =>
                    updatePreferences(
                      { pushEnabled: !notificationPreferences.pushEnabled },
                      `Push notifications were ${
                        notificationPreferences.pushEnabled ? 'disabled' : 'enabled'
                      } and saved locally.`,
                    )
                  }
                />
              </div>

              <div>
                <h4 className="text-xl font-bold text-on-surface">Push Notifications</h4>
                <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                  Direct alerts to your desktop and mobile devices even when the app is closed.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[24px] bg-surface-container-low p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-6 flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                  <NotificationOutlined />
                </span>
                <Toggle
                  checked={notificationPreferences.bannersEnabled}
                  onChange={() =>
                    updatePreferences(
                      { bannersEnabled: !notificationPreferences.bannersEnabled },
                      `In-app banners were ${
                        notificationPreferences.bannersEnabled ? 'disabled' : 'enabled'
                      } and saved locally.`,
                    )
                  }
                />
              </div>

              <div>
                <h4 className="text-xl font-bold text-on-surface">In-app Banners</h4>
                <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                  Subtle overlays that appear at the top of your workspace during active sessions.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] bg-surface-container-low shadow-sm">
            <div className="flex items-center gap-4 border-b border-surface-variant/30 p-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                <CustomerServiceOutlined />
              </span>
              <h4 className="text-xl font-bold text-on-surface">Sensory & Sound</h4>
            </div>

            <div className="space-y-8 p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-on-surface">Sound & Haptics</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Play a subtle audio cue for incoming messages.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                    {notificationPreferences.soundPreset}
                  </span>
                  <button
                    type="button"
                    onClick={cycleSoundPreset}
                    className="rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="border-t border-surface-variant/20 pt-8">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-on-surface">Quiet Mode Scheduling</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Automatically silence all alerts during focus hours.
                    </p>
                  </div>

                  <Toggle
                    checked={notificationPreferences.quietModeEnabled}
                    onChange={() =>
                      updatePreferences(
                        { quietModeEnabled: !notificationPreferences.quietModeEnabled },
                        `Quiet mode was ${
                          notificationPreferences.quietModeEnabled ? 'disabled' : 'enabled'
                        } and saved locally.`,
                      )
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-lg bg-surface-container-low p-4">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                      Starts at
                    </span>
                    <input
                      type="time"
                      value={notificationPreferences.quietStart}
                      onChange={(event) =>
                        updatePreferences(
                          { quietStart: event.target.value },
                          `Quiet mode start time changed to ${event.target.value}.`,
                        )
                      }
                      className="border-none bg-transparent text-right font-semibold text-on-surface outline-none"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-lg bg-surface-container-low p-4">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                      Ends at
                    </span>
                    <input
                      type="time"
                      value={notificationPreferences.quietEnd}
                      onChange={(event) =>
                        updatePreferences(
                          { quietEnd: event.target.value },
                          `Quiet mode end time changed to ${event.target.value}.`,
                        )
                      }
                      className="border-none bg-transparent text-right font-semibold text-on-surface outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] bg-on-surface p-10 text-surface">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary opacity-20 blur-[100px]" />
            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                  <SafetyCertificateOutlined />
                  Privacy First
                </div>
                <h4 className="text-2xl font-black tracking-tight">Your data stays with you.</h4>
                <p className="mt-3 text-sm leading-7 text-inverse-on-surface/80">
                  Notification preferences are saved locally right now. Delivery tokens, realtime
                  routing and encrypted device sync will need backend support when you want to move
                  beyond local mock behavior.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNotice({
                    message:
                      'Learn More is still a placeholder. I can wire it to docs, modal copy or a dedicated privacy page.',
                    type: 'info',
                  })
                }
                className="rounded-xl bg-primary px-8 py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BellOutlined />
              </span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Notification Scope</h3>
                <p className="mt-2 text-xs leading-6 text-on-surface-variant">
                  History feed, friend invitations, group invitations and trending groups now live in
                  the bell view outside settings. This tab now only manages delivery preferences.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Notifications;
