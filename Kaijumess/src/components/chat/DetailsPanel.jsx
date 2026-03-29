import React, { useEffect, useMemo, useState } from 'react';

import { getScaledFontSize } from '../../constants/appearance';
import { useAppearance } from '../../hooks/useAppearance';

const formatLastSeen = (value) => {
  if (!value) {
    return 'No recent activity';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

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

const DetailsPanel = ({
  conversation,
  currentUser,
  isUpdatingParticipantNickname = false,
  messages = [],
  onUpdateParticipantNickname,
}) => {
  const { fontScale } = useAppearance();
  const [activeNicknameTarget, setActiveNicknameTarget] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameNotice, setNicknameNotice] = useState('');

  const titleSize = getScaledFontSize(fontScale, 30, 24);
  const subtitleSize = getScaledFontSize(fontScale, 14, 12);
  const sectionTitleSize = getScaledFontSize(fontScale, 10, 10);
  const itemSize = getScaledFontSize(fontScale, 14, 13);
  const itemMetaSize = getScaledFontSize(fontScale, 12, 11);

  const sharedMedia = useMemo(
    () =>
      messages
        .map(getMessageMedia)
        .filter(Boolean)
        .reverse()
        .slice(0, 6),
    [messages],
  );

  const currentUserName =
    currentUser?.fullName || currentUser?.displayName || currentUser?.username || currentUser?.email || 'You';
  const nicknameTargets = conversation
    ? [
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
          description: conversation.isDirect ? 'Nguoi kia' : 'Nhom',
          key: 'peer',
          name: conversation.peer?.displayName || conversation.title,
          placeholder: conversation.peer?.displayName || conversation.title,
          targetUserId: conversation.peer?.id || '',
        },
      ]
    : [];
  const activeNicknameTargetConfig =
    nicknameTargets.find((item) => item.key === activeNicknameTarget) || null;
  const isNicknameDirty = Boolean(
    activeNicknameTargetConfig && nicknameDraft.trim() !== activeNicknameTargetConfig.name.trim(),
  );

  useEffect(() => {
    setActiveNicknameTarget('');
    setNicknameDraft('');
    setNicknameNotice('');
  }, [conversation?.id]);

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
      setNicknameNotice(`Da luu biet danh cho ${activeNicknameTargetConfig.description.toLowerCase()}.`);
      return;
    }

    setNicknameDraft(activeNicknameTargetConfig.name);
  };

  if (!conversation) {
    return null;
  }

  const profileTitle = conversation.title || conversation.peer?.displayName || 'Direct chat';
  const profileSubtitle = conversation.peer?.email || 'Conversation details';

  return (
    <aside className="hidden w-[320px] flex-shrink-0 border-l border-white/50 bg-surface-container-high/45 p-6 backdrop-blur-xl xl:flex xl:flex-col">
      <div className="hide-scrollbar flex-1 space-y-8 overflow-y-auto pr-1">
        <div className="text-center">
          <div className="relative mx-auto w-fit">
            <div className="rotate-3 overflow-hidden rounded-[2rem] bg-primary-fixed shadow-[0_20px_40px_rgba(25,28,29,0.12)] transition-transform duration-300 hover:rotate-0">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden text-4xl font-black text-on-primary-fixed">
                {conversation.avatarUrl ? (
                  <img
                    className="h-full w-full object-cover"
                    alt={profileTitle}
                    src={conversation.avatarUrl}
                  />
                ) : (
                  profileTitle.slice(0, 2).toUpperCase()
                )}
              </div>
            </div>
            {conversation.isOnline ? (
              <div className="absolute -bottom-2 -right-2 rounded-2xl bg-white p-2 shadow-lg">
                <span className="material-symbols-outlined text-xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
            ) : null}
          </div>

          <h2
            className="mt-6 font-black tracking-tight text-on-surface"
            style={{ fontSize: `${titleSize}px` }}
          >
            {profileTitle}
          </h2>
          <p
            className="mt-2 text-on-surface-variant"
            style={{ fontSize: `${subtitleSize}px` }}
          >
            {profileSubtitle}
          </p>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h4
              className="font-black uppercase tracking-[0.28em] text-on-surface-variant"
              style={{ fontSize: `${sectionTitleSize}px` }}
            >
              Nickname
            </h4>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Shared
            </span>
          </div>

          <div className="rounded-[24px] bg-white/55 p-4 shadow-sm">
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
                    className={`rounded-[20px] border p-3 text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/5 shadow-[0_12px_24px_rgba(0,88,188,0.12)]'
                        : 'border-outline-variant/45 bg-white/80 hover:bg-white'
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
                    </div>
                  </button>
                );
              })}
            </div>

            {activeNicknameTargetConfig ? (
              <div className="mt-4 rounded-[20px] border border-outline-variant/35 bg-white/85 p-4">
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
                    <p className="text-xs text-on-surface-variant">
                      Doi ten hien thi cho {activeNicknameTargetConfig.description.toLowerCase()}.
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
                  className="mt-4 w-full rounded-2xl border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
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
                {nicknameNotice ? <p className="mt-2 text-xs font-medium text-primary">{nicknameNotice}</p> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h4
              className="font-black uppercase tracking-[0.28em] text-on-surface-variant"
              style={{ fontSize: `${sectionTitleSize}px` }}
            >
              Shared Media
            </h4>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {sharedMedia.length ? `${sharedMedia.length} items` : 'Empty'}
            </span>
          </div>

          {sharedMedia.length ? (
            <div className="grid grid-cols-3 gap-2">
              {sharedMedia.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm"
                >
                  {item.type === 'video' ? (
                    <>
                      <video
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        src={item.mediaUrl}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                        <span className="material-symbols-outlined rounded-full bg-white/85 p-2 text-[18px] text-on-surface">
                          play_arrow
                        </span>
                      </div>
                    </>
                  ) : (
                    <img
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      alt={item.fileName || 'Shared media'}
                      src={item.thumbnailUrl}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-outline-variant/60 bg-white/55 px-4 py-6 text-sm leading-6 text-on-surface-variant">
              Chua co anh hoac video nao trong cuoc tro chuyen nay.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-white/55 p-3 text-left transition-colors hover:bg-white/75"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
              <span className="text-sm font-semibold text-on-surface">Mute Notifications</span>
            </div>
            <div className="flex h-6 w-10 items-center rounded-full bg-surface-container-highest px-1">
              <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left transition-colors hover:bg-white/75"
          >
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
            <span className="text-sm font-semibold text-on-surface">Search in Chat</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left transition-colors hover:bg-error/5"
          >
            <span className="material-symbols-outlined text-error">block</span>
            <span className="text-sm font-semibold text-error">Block {profileTitle.split(' ')[0]}</span>
          </button>
        </div>

        <div>
          <h4
            className="mb-4 font-black uppercase tracking-[0.28em] text-on-surface-variant"
            style={{ fontSize: `${sectionTitleSize}px` }}
          >
            Conversation Details
          </h4>

          <div className="space-y-2">
            {[
              {
                label: 'Type',
                value: conversation.isDirect ? 'Direct conversation' : 'Group conversation',
              },
              {
                label: 'Last activity',
                value: formatLastSeen(conversation.lastMessageAt || conversation.updatedAt),
              },
              {
                label: 'Contact',
                value: conversation.peer?.email || 'No email available',
              },
              {
                label: 'Presence',
                value: conversation.isOnline
                  ? 'Online now'
                  : formatLastSeen(conversation.peer?.lastSeen),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/55 p-3 transition-colors hover:bg-white/75">
                <span className="block font-semibold text-on-surface" style={{ fontSize: `${itemSize}px` }}>
                  {item.label}
                </span>
                <span
                  className="mt-1 block text-on-surface-variant"
                  style={{ fontSize: `${itemMetaSize}px` }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DetailsPanel;
