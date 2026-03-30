import React, { useEffect, useMemo, useState } from 'react';
import { InfoCircleFilled } from '@ant-design/icons';

import { WALLPAPER_PRESETS } from '../../constants/appearance';
import { getScaledFontSize } from '../../constants/appearance';
import { useAppearance } from '../../hooks/useAppearance';
import {
  DEFAULT_CONVERSATION_WALLPAPER_ID,
  readConversationPreferences,
  writeConversationPreferences,
} from '../../utils/conversationCustomizations';

const getMessageMedia = (message) => {
  if (!message || !['image', 'video'].includes(message.type)) {
    return null;
  }

  const metadata = message.metadata && typeof message.metadata === 'object' ? message.metadata : {};
  const mediaUrl = message.mediaUrl || metadata.mediaUrl || metadata.previewUrl || '';

  if (!mediaUrl) {
    return null;
  }

  return {
    fileName: message.fileName || metadata.fileName || '',
    id: message.id,
    mediaUrl,
    thumbnailUrl: message.thumbnailUrl || metadata.thumbnailUrl || mediaUrl,
    type: message.type,
  };
};

const MobileContactDetails = ({
  conversation,
  currentUser,
  isUpdatingConversationWallpaper = false,
  isUpdatingParticipantNickname = false,
  messages = [],
  onBack,
  onOpenCalls,
  onOpenChats,
  onOpenPeople,
  onUpdateConversationWallpaper,
  onUpdateParticipantNickname,
  onOpenSettings,
  onStartAudioCall,
  onStartVideoCall,
}) => {
  const { fontScale } = useAppearance();
  const [notice, setNotice] = useState(null);
  const [activeNicknameTarget, setActiveNicknameTarget] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [preferences, setPreferences] = useState(() =>
    readConversationPreferences(conversation?.id),
  );

  useEffect(() => {
    setPreferences(readConversationPreferences(conversation?.id));
    setActiveNicknameTarget('');
    setNicknameDraft('');
  }, [conversation?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !conversation?.id) {
      return;
    }

    writeConversationPreferences(conversation.id, preferences);
  }, [conversation?.id, preferences]);

  const titleSize = getScaledFontSize(fontScale, 30, 24);
  const subtitleSize = getScaledFontSize(fontScale, 14, 12);
  const sectionTitleSize = getScaledFontSize(fontScale, 18, 16);
  const currentUserName =
    currentUser?.fullName || currentUser?.displayName || currentUser?.username || currentUser?.email || 'You';

  const sharedMedia = useMemo(
    () =>
      messages
        .map(getMessageMedia)
        .filter(Boolean)
        .reverse(),
    [messages],
  );

  if (!conversation) {
    return null;
  }

  const profileTitle = conversation.title;
  const isDirectConversation = Boolean(conversation.isDirect);
  const usernameLabel = isDirectConversation
    ? conversation.peer?.username
      ? `@${conversation.peer.username}`
      : conversation.peer?.email || 'Unknown handle'
    : `${conversation.participantCount || 0} members`;
  const statusLabel = isDirectConversation
    ? conversation.isOnline
      ? 'Online'
      : 'Offline'
    : 'Group chat';
  const displayedMedia = sharedMedia.slice(0, 3);
  const hiddenMediaCount = Math.max(sharedMedia.length - 3, 0);
  const canStartCall = Boolean(isDirectConversation && conversation.peer?.id);
  const muteButtonLabel = preferences.muted
    ? isDirectConversation
      ? 'Muted'
      : 'Muted'
    : isDirectConversation
      ? 'Mute'
      : 'Mute';
  const topBarTitle = isDirectConversation ? 'Contact Details' : 'Group Details';
  const dangerActionLabel = isDirectConversation ? `Block ${profileTitle}` : `Leave ${profileTitle}`;
  const nicknameTargets = [
    {
      avatarUrl: currentUser?.avatarUrl || '',
      description: 'Ban',
      key: 'self',
      name: conversation.selfNickname?.trim() || currentUserName,
      placeholder: currentUserName,
      targetUserId: currentUser?.id || '',
    },
    {
      avatarUrl: conversation.avatarUrl || '',
      description: isDirectConversation ? 'Nguoi kia' : 'Nhom',
      key: 'peer',
      name: conversation.peer?.displayName || conversation.title,
      placeholder: conversation.peer?.displayName || conversation.title,
      targetUserId: conversation.peer?.id || '',
    },
  ];
  const activeNicknameTargetConfig =
    nicknameTargets.find((item) => item.key === activeNicknameTarget) || null;
  const isNicknameDirty = Boolean(
    activeNicknameTargetConfig && nicknameDraft.trim() !== activeNicknameTargetConfig.name.trim(),
  );
  const wallpaperOptions = [
    {
      id: DEFAULT_CONVERSATION_WALLPAPER_ID,
      label: 'Default',
      style: {
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(237,238,239,0.95) 100%)',
      },
    },
    ...WALLPAPER_PRESETS,
  ];
  useEffect(() => {
    if (!activeNicknameTarget) {
      setNicknameDraft('');
      return;
    }

    setNicknameDraft(
      activeNicknameTarget === 'self'
        ? conversation?.selfNickname?.trim() || currentUserName
        : conversation?.peer?.displayName || conversation?.title || '',
    );
  }, [
    activeNicknameTarget,
    conversation?.peer?.displayName,
    conversation?.selfNickname,
    conversation?.title,
    currentUserName,
  ]);

  const updatePreference = (key, value, message) => {
    setPreferences((currentValue) => ({
      ...currentValue,
      [key]: value,
    }));
    setNotice({
      message,
      type: 'success',
    });
  };
  const handleSaveNickname = async () => {
    if (!conversation?.id || !activeNicknameTargetConfig?.targetUserId) {
      return;
    }

    const normalizedDraft = nicknameDraft.trim();
    const normalizedCurrent = activeNicknameTargetConfig.name.trim();

    if (normalizedDraft === normalizedCurrent) {
      return;
    }

    const room = await onUpdateParticipantNickname?.({
      conversationId: conversation.id,
      nickname: normalizedDraft,
      targetUserId: activeNicknameTargetConfig.targetUserId,
    });

    if (room?.id) {
      setNotice({
        message: `Saved nickname for ${activeNicknameTargetConfig.description.toLowerCase()}.`,
        type: 'success',
      });
      return;
    }

    setNicknameDraft(activeNicknameTargetConfig.name);
  };

  return (
    <section className="fixed inset-0 z-40 flex min-h-0 flex-col bg-surface md:hidden">
      <header className="fixed left-0 right-0 top-0 z-10 flex h-16 items-center justify-between bg-white/80 px-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 text-primary transition-colors hover:bg-zinc-100"
            aria-label="Back to chat"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight text-zinc-900">{topBarTitle}</h1>
        </div>

        <button
          type="button"
          onClick={() =>
            setNotice({
              message:
                'Menu actions cho contact details hien dang la placeholder. Neu can, toi se tach them clear chat, export media hoac report user.',
              type: 'info',
            })
          }
          className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100"
          aria-label="More actions"
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      <main className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-24">
        <div className="mx-auto max-w-lg space-y-10 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {notice ? (
          <div className={`status-banner status-banner--${notice.type}`}>
            <span className="mt-0.5">
              <InfoCircleFilled />
            </span>
            <div className="text-sm font-medium leading-6">{notice.message}</div>
          </div>
        ) : null}

        <section className="flex flex-col items-center">
          <div className="group relative">
            <div className="mb-4 h-32 w-32 overflow-hidden rounded-full ring-4 ring-white shadow-xl">
              {conversation.avatarUrl ? (
                <img
                  alt={profileTitle}
                  className="h-full w-full object-cover"
                  src={conversation.avatarUrl}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary-fixed text-3xl font-black text-on-primary-fixed">
                  {isDirectConversation ? (
                    profileTitle.slice(0, 2).toUpperCase()
                  ) : (
                    <span className="material-symbols-outlined text-[44px]">groups</span>
                  )}
                </div>
              )}
            </div>

            <div className="absolute bottom-4 right-1 rounded-full border-2 border-white bg-secondary-container p-1.5 text-on-secondary-container">
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isDirectConversation ? 'check_circle' : 'groups_2'}
              </span>
            </div>
          </div>

          <h2
            className="mb-1 font-extrabold tracking-tight text-on-surface"
            style={{ fontSize: `${titleSize}px` }}
          >
            {profileTitle}
          </h2>
          <p
            className="font-medium text-on-surface-variant"
            style={{ fontSize: `${subtitleSize}px` }}
          >
            {usernameLabel} • {statusLabel}
          </p>
        </section>

        <nav className="grid grid-cols-4 gap-4">
          <button
            type="button"
            onClick={onBack}
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20 transition-all duration-200 group-hover:bg-primary-container active:scale-90">
              <span className="material-symbols-outlined">chat_bubble</span>
            </div>
            <span className="text-[12px] font-bold text-primary">Message</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canStartCall) {
                setNotice({
                  message:
                    'Group audio call chua duoc support. Hien tai call chi dung cho direct conversation.',
                  type: 'info',
                });
                return;
              }

              onStartAudioCall?.(conversation);
            }}
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-lowest text-on-surface shadow-sm transition-all duration-200 group-hover:bg-surface-container-low active:scale-90">
              <span className="material-symbols-outlined">call</span>
            </div>
            <span className="text-[12px] font-bold text-on-surface-variant">Call</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canStartCall) {
                setNotice({
                  message:
                    'Group video call chua duoc support. Hien tai video call chi dung cho direct conversation.',
                  type: 'info',
                });
                return;
              }

              onStartVideoCall?.(conversation);
            }}
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-lowest text-on-surface shadow-sm transition-all duration-200 group-hover:bg-surface-container-low active:scale-90">
              <span className="material-symbols-outlined">videocam</span>
            </div>
            <span className="text-[12px] font-bold text-on-surface-variant">Video</span>
          </button>

          <button
            type="button"
            onClick={() =>
              updatePreference(
                'muted',
                !preferences.muted,
                `Notifications for ${profileTitle} ${preferences.muted ? 'unmuted' : 'muted'} on this device.`,
              )
            }
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-lowest text-on-surface shadow-sm transition-all duration-200 group-hover:bg-surface-container-low active:scale-90">
              <span className="material-symbols-outlined">notifications_off</span>
            </div>
            <span className="text-[12px] font-bold text-on-surface-variant">{muteButtonLabel}</span>
          </button>
        </nav>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3
              className="font-bold tracking-tight text-on-surface"
              style={{ fontSize: `${sectionTitleSize}px` }}
            >
              Shared Media
            </h3>
            <button
              type="button"
              onClick={() =>
                setNotice({
                  message:
                    sharedMedia.length > 0
                      ? 'See all media chua co gallery rieng. Neu can, toi se lam media gallery day du cho mobile.'
                      : 'Chua co media nao de mo rong.',
                  type: 'info',
                })
              }
              className="text-sm font-bold text-primary"
            >
              See all
            </button>
          </div>

          {displayedMedia.length ? (
            <div className="grid grid-cols-3 gap-3">
              {displayedMedia.map((item, index) => {
                const shouldShowOverlay = index === 2 && hiddenMediaCount > 0;

                return (
                  <div
                    key={item.id}
                    className="relative aspect-square overflow-hidden rounded-xl bg-surface-container"
                  >
                    {item.type === 'video' ? (
                      <video
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        src={item.mediaUrl}
                      />
                    ) : (
                      <img
                        className="h-full w-full object-cover"
                        alt={item.fileName || 'Shared media'}
                        src={item.thumbnailUrl}
                      />
                    )}

                    {shouldShowOverlay ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-on-surface/40 backdrop-blur-[2px]">
                        <span className="text-lg font-bold text-white">+{hiddenMediaCount}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-container-lowest px-4 py-5 text-sm text-on-surface-variant shadow-sm">
              Chua co anh hoac video nao trong cuoc tro chuyen nay.
            </div>
          )}
        </section>

        <section>
          <h3
            className="mb-4 font-bold tracking-tight text-on-surface"
            style={{ fontSize: `${sectionTitleSize}px` }}
          >
            Chat Customization
          </h3>

          <div className="space-y-3">
            <div className="rounded-[28px] bg-surface-container-lowest p-4 shadow-sm">
              <div className="mb-4 flex items-start gap-4">
                <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
                  <span className="material-symbols-outlined">drive_file_rename_outline</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-on-surface">Nickname</p>
                  <p className="text-sm text-on-surface-variant">
                    Moi nguoi trong cuoc tro chuyen co biet danh rieng va ca hai ben deu thay nhu nhau.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {nicknameTargets.map((target) => {
                  const isActive = activeNicknameTargetConfig?.key === target.key;

                  return (
                    <button
                      key={target.key}
                      type="button"
                      onClick={() =>
                        setActiveNicknameTarget((currentValue) =>
                          currentValue === target.key ? '' : target.key,
                        )
                      }
                      className={`rounded-[22px] border p-3 text-left transition-all active:scale-[0.98] ${
                        isActive
                          ? 'border-primary bg-primary/5 shadow-[0_14px_28px_rgba(0,88,188,0.12)]'
                          : 'border-outline-variant/45 bg-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-sm font-black text-on-primary-fixed">
                          {target.avatarUrl ? (
                            <img alt={target.name} className="h-full w-full object-cover" src={target.avatarUrl} />
                          ) : (
                            target.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-on-surface">{target.name}</p>
                          <p className="truncate text-xs font-medium text-on-surface-variant">{target.description}</p>
                        </div>
                        {isActive ? (
                          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeNicknameTargetConfig ? <div className="mt-4 rounded-[24px] border border-outline-variant/35 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-base font-black text-on-primary-fixed">
                    {activeNicknameTargetConfig.avatarUrl ? (
                      <img
                        alt={activeNicknameTargetConfig.name}
                        className="h-full w-full object-cover"
                        src={activeNicknameTargetConfig.avatarUrl}
                      />
                    ) : (
                      activeNicknameTargetConfig.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">{activeNicknameTargetConfig.name}</p>
                    <p className="text-xs font-medium text-on-surface-variant">
                      Dang sua biet danh cho {activeNicknameTargetConfig.description.toLowerCase()}.
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={nicknameDraft}
                  onChange={(event) => setNicknameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSaveNickname();
                    }
                  }}
                  disabled={isUpdatingParticipantNickname}
                  className="mt-4 w-full rounded-2xl border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  placeholder={activeNicknameTargetConfig.placeholder}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNickname}
                    disabled={!isNicknameDirty || isUpdatingParticipantNickname}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingParticipantNickname ? 'Dang luu...' : 'Xac nhan'}
                  </button>
                </div>
                <p className="mt-3 text-xs text-on-surface-variant">
                  De trong de quay ve ten mac dinh cua nguoi nay.
                </p>
              </div> : null}
            </div>

            <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
              <div className="mb-4 flex items-start gap-4">
                <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                  <span className="material-symbols-outlined">wallpaper</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface">Chat background</p>
                  <p className="text-sm text-on-surface-variant">
                    Chon nen rieng cho cuoc tro chuyen nay.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {wallpaperOptions.map((wallpaper) => {
                  const isSelected = (conversation.wallpaperId || DEFAULT_CONVERSATION_WALLPAPER_ID) === wallpaper.id;

                  return (
                    <button
                      key={wallpaper.id}
                      type="button"
                      onClick={async () => {
                        const room = await onUpdateConversationWallpaper?.({
                          conversationId: conversation.id,
                          wallpaperId:
                            wallpaper.id === DEFAULT_CONVERSATION_WALLPAPER_ID ? '' : wallpaper.id,
                        });

                        if (room?.id) {
                          setNotice({
                            message: `Chat background switched to ${wallpaper.label}.`,
                            type: 'success',
                          });
                        }
                      }}
                      disabled={isUpdatingConversationWallpaper}
                      className={`overflow-hidden rounded-[20px] border text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'border-primary shadow-[0_12px_24px_rgba(0,88,188,0.14)]'
                          : 'border-transparent shadow-sm'
                      }`}
                    >
                      <div className="h-20 w-full" style={wallpaper.style} />
                      <div className="flex items-center justify-between px-3 py-3">
                        <span className="text-sm font-bold text-on-surface">{wallpaper.label}</span>
                        {isSelected ? (
                          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3
            className="mb-4 font-bold tracking-tight text-on-surface"
            style={{ fontSize: `${sectionTitleSize}px` }}
          >
            Privacy &amp; Settings
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <span className="material-symbols-outlined">lock</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface">Encryption</p>
                  <p className="text-sm text-on-surface-variant">
                    {isDirectConversation ? 'End-to-end secured' : 'Protected group thread'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updatePreference(
                    'encrypted',
                    !preferences.encrypted,
                    `Encryption indicator ${preferences.encrypted ? 'disabled' : 'enabled'} for this thread view.`,
                        )
                      }
                aria-pressed={preferences.encrypted}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.encrypted ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full border border-white bg-white transition-transform ${
                    preferences.encrypted ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-zinc-100 p-2 text-zinc-600">
                  <span className="material-symbols-outlined">timer</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface">Disappearing Messages</p>
                  <p className="text-sm text-on-surface-variant">
                    {preferences.disappearingMessages ? 'On' : 'Off'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updatePreference(
                    'disappearingMessages',
                    !preferences.disappearingMessages,
                    `Disappearing messages ${
                      preferences.disappearingMessages ? 'disabled' : 'enabled'
                    } for this thread on this device.`,
                  )
                }
                aria-pressed={preferences.disappearingMessages}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.disappearingMessages
                    ? 'bg-primary'
                    : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full border border-white bg-white transition-transform ${
                    preferences.disappearingMessages ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <button
            type="button"
            onClick={() =>
              setNotice({
                message:
                  isDirectConversation
                    ? 'Block user can backend/API de co hieu luc that. Hien tai day la placeholder UX cho mobile details.'
                    : 'Leave group can backend/API va role permissions de co hieu luc that. Hien tai day la placeholder UX cho mobile details.',
                type: 'info',
              })
            }
            className="flex w-full items-center gap-4 rounded-2xl bg-white/50 p-4 text-tertiary transition-all hover:bg-red-50 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">
              {isDirectConversation ? 'block' : 'logout'}
            </span>
            <span className="font-bold">{dangerActionLabel}</span>
          </button>
        </section>
        </div>
      </main>
    </section>
  );
};

export default MobileContactDetails;
