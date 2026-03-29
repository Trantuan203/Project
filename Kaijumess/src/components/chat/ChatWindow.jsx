import React from 'react';

import { getScaledFontSize } from '../../constants/appearance';
import { useAppearance } from '../../hooks/useAppearance';
import { useTheme } from '../../hooks/useTheme';

const ChatWindow = ({ onToggleDetails }) => {
  const { fontScale, wallpaperLabel, wallpaperStyle } = useAppearance();
  const { resolvedTheme } = useTheme();

  const titleSize = getScaledFontSize(fontScale, 18, 16);
  const statusSize = getScaledFontSize(fontScale, 11, 10);
  const badgeSize = getScaledFontSize(fontScale, 11, 10);
  const messageSize = getScaledFontSize(fontScale, 15, 13);
  const metaSize = getScaledFontSize(fontScale, 10, 10);
  const inputSize = getScaledFontSize(fontScale, 15, 13);

  const overlayStyle = {
    backdropFilter: 'blur(1px)',
    backgroundColor:
      resolvedTheme === 'dark'
        ? 'rgb(var(--color-surface) / 0.76)'
        : 'rgb(var(--color-surface) / 0.58)',
  };

  return (
    <section className="relative flex min-w-0 flex-1 flex-col bg-surface">
      <header className="z-10 flex h-20 items-center justify-between border-b border-surface-container-high bg-surface-bright/80 px-8 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <img
            className="h-11 w-11 rounded-full object-cover"
            alt="Avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-gftsM0srx_0cmWIDNVRW2AgHBO_BdgToUIDgFjneXuQyDaz3eYtnpcHSlXHLQZA6EfRtD0hjb36A2qCGfJmreJckIp7BAqvCWSs4rBadp5WU-mGJHbmEiqg-_GXSpjfq1zixH4zYjkyzz41MoDo5tX8y1wXVZL3rWPpC6y0jb16QwJt-IWdDIb7i1Cj_O7fzrQ5ihLaL2k8Eo7WwJ0SGc9VIUbPLsVVLIuU-dqPIV2M64dntyf7HT8SQqn0ir2apvzcI-aWDHpw-"
          />
          <div>
            <h2
              className="font-bold text-on-surface"
              style={{ fontSize: `${titleSize}px`, lineHeight: 1.2 }}
            >
              Elena Rodriguez
            </h2>
            <span
              className="flex items-center gap-1.5 font-medium text-secondary"
              style={{ fontSize: `${statusSize}px` }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Online
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-xl p-2.5 text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className="rounded-xl p-2.5 text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined">call</span>
          </button>
          <button className="rounded-xl bg-primary-fixed p-2.5 text-on-primary-fixed hover:bg-primary-fixed-dim">
            <span className="material-symbols-outlined">videocam</span>
          </button>
          <button
            onClick={onToggleDetails}
            className="ml-2 rounded-xl border border-surface-container-highest p-2.5 text-on-surface-variant hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">info</span>
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="absolute inset-0" style={wallpaperStyle} />
        <div className="absolute inset-0" style={overlayStyle} />

        <div className="relative z-10 flex h-full flex-1 flex-col">
          <div className="hide-scrollbar flex-1 overflow-y-auto px-8 py-6">
            <div className="space-y-8">
              <div className="flex justify-center">
                <span
                  className="rounded-full bg-surface-container-low px-4 py-1 font-bold uppercase tracking-widest text-outline"
                  style={{ fontSize: `${badgeSize}px` }}
                >
                  Today · {wallpaperLabel}
                </span>
              </div>

              <div className="flex max-w-[80%] items-end gap-3">
                <img
                  className="mb-1 h-8 w-8 flex-shrink-0 rounded-full object-cover"
                  alt="Avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD85g2F7eHT08K_uO8TyoCOYmm7vx7h52ouC80bTXYre7Y1d8izPalTKibzD17XBrSGZ88q5q8gQqAsom7lhiG4C_StPySGA5ZP5EkUXt0Ft4A-2h_7Yz22GUZPmoscTtIcCGosP_CXI0IE_3t1KeHyKAlW7cq4RQwKTxkwfvU23qd2HIAtG4gsEI3RDeVpp3uN-ZnAcxHmhIFKustKohOLfytvzJPU_n4AuYh7CnNT8JRqnOzEEAWqhMEt3m6kNIfLA6zjWsduCxpa"
                />
                <div>
                  <div className="rounded-xl rounded-bl-sm bg-surface-container-high p-4 text-on-surface shadow-sm">
                    <p style={{ fontSize: `${messageSize}px`, lineHeight: 1.65 }}>
                      Hey! I just reviewed the latest design iterations. The "Fluid Editorial"
                      approach is exactly what we were aiming for.
                    </p>
                  </div>
                  <span
                    className="ml-1 mt-1 block font-medium text-on-surface-variant"
                    style={{ fontSize: `${metaSize}px` }}
                  >
                    10:45 AM
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[78%]">
                  <div className="rounded-xl rounded-br-sm bg-gradient-to-br from-primary to-primary-container p-4 text-on-primary shadow-sm">
                    <p style={{ fontSize: `${messageSize}px`, lineHeight: 1.65 }}>
                      Great. I also bumped the reading scale and wallpaper from Appearance, so the
                      whole chat should feel closer to the final product now.
                    </p>
                  </div>
                  <span
                    className="mr-1 mt-1 block text-right font-medium text-on-surface-variant"
                    style={{ fontSize: `${metaSize}px` }}
                  >
                    10:47 AM
                  </span>
                </div>
              </div>
            </div>
          </div>

          <footer className="border-t border-surface-container-high bg-surface-bright/72 p-6 pb-8 backdrop-blur-xl">
            <div className="flex items-center gap-4 rounded-2xl border border-outline-variant/50 bg-surface-container-highest p-2 px-4 shadow-sm">
              <button className="p-2 text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">add_circle</span>
              </button>
              <button className="p-2 text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">mood</span>
              </button>
              <input
                className="flex-1 bg-transparent py-3 text-on-surface outline-none placeholder:text-outline"
                placeholder="Type a message..."
                type="text"
                style={{ fontSize: `${inputSize}px` }}
              />
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg transition-transform hover:scale-105 active:scale-95">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
};

export default ChatWindow;

