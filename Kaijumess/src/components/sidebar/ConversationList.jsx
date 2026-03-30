import React, { useCallback } from 'react';

import MobileMessagesLayout from '../mobile/MobileMessagesLayout';
import { getScaledFontSize } from '../../constants/appearance';
import { useLanguage } from '../../context/LanguageContext';
import { useAppearance } from '../../hooks/useAppearance';

const formatConversationTime = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(sameDay ? {} : { month: 'short', day: 'numeric' }),
  }).format(date);
};

const getRelationshipLabel = (user) => {
  if (!user.friendship) {
    return 'Add Friend';
  }

  if (user.friendship.isFriend) {
    return 'Friends';
  }

  if (user.friendship.direction === 'incoming') {
    return 'Accept';
  }

  return 'Pending';
};

const getPeoplePanelLabel = (source) => {
  if (source === 'directory') {
    return 'People Directory';
  }

  if (source === 'sent') {
    return 'Sent Requests';
  }

  if (source === 'received') {
    return 'Friend Requests';
  }

  return 'Recent Friends';
};

const peopleFilters = [
  { key: 'friends', label: 'Da la ban' },
  { key: 'sent', label: 'Da gui' },
  { key: 'received', label: 'Loi moi' },
];

const getNoticeTone = (type) => {
  if (type === 'error') {
    return 'border-error/15 bg-error/10 text-error';
  }

  if (type === 'success') {
    return 'border-secondary/15 bg-secondary/10 text-on-secondary-container';
  }

  return 'border-primary/10 bg-primary/10 text-on-surface';
};

const ConversationList = ({
  activeConversationId,
  activePrimaryView = 'chat',
  conversationSearch,
  conversations,
  currentUser,
  friendRequestTargetId,
  hasMorePeople = false,
  isLoadingConversations,
  isLoadingMorePeople = false,
  isPeoplePanelOpen,
  isSearchingPeople,
  notice,
  onCloseNotice,
  onClosePeoplePanel,
  onConversationSearchChange,
  onLoadMorePeople,
  onOpenCalls,
  onOpenChats,
  onOpenNotifications,
  onOpenPeoplePanel,
  onOpenSettings,
  onSelectConversation,
  onSendFriendRequest,
  onStartDirectRoom,
  onUserSearchChange,
  peoplePanelState,
  peopleFilter,
  peopleSearchQuery,
  onPeopleFilterChange,
  unreadCount = 0,
}) => {
  const { fontScale } = useAppearance();
  const { t } = useLanguage();

  const searchSize = getScaledFontSize(fontScale, 14, 13);
  const nameSize = getScaledFontSize(fontScale, 15, 13);
  const previewSize = getScaledFontSize(fontScale, 13, 12);
  const timeSize = getScaledFontSize(fontScale, 10, 10);
  const handlePeopleScroll = useCallback(
    (event) => {
      if (!hasMorePeople || isLoadingMorePeople || isSearchingPeople) {
        return;
      }

      const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;

      if (scrollHeight - scrollTop - clientHeight < 120) {
        onLoadMorePeople?.();
      }
    },
    [hasMorePeople, isLoadingMorePeople, isSearchingPeople, onLoadMorePeople],
  );

  return (
    <>
      <MobileMessagesLayout
        activeConversationId={activeConversationId}
        activePrimaryView={activePrimaryView}
        conversationSearch={conversationSearch}
        conversations={conversations}
        currentUser={currentUser}
        friendRequestTargetId={friendRequestTargetId}
        hasMorePeople={hasMorePeople}
        isLoadingConversations={isLoadingConversations}
        isLoadingMorePeople={isLoadingMorePeople}
        isPeoplePanelOpen={isPeoplePanelOpen}
        isSearchingPeople={isSearchingPeople}
        notice={notice}
        onCloseNotice={onCloseNotice}
        onClosePeoplePanel={onClosePeoplePanel}
        onConversationSearchChange={onConversationSearchChange}
        onLoadMorePeople={onLoadMorePeople}
        onOpenCalls={onOpenCalls}
        onOpenChats={onOpenChats}
        onOpenNotifications={onOpenNotifications}
        onOpenPeoplePanel={onOpenPeoplePanel}
        onOpenSettings={onOpenSettings}
        onSelectConversation={onSelectConversation}
        onSendFriendRequest={onSendFriendRequest}
        onStartDirectRoom={onStartDirectRoom}
        onUserSearchChange={onUserSearchChange}
        peoplePanelState={peoplePanelState}
        peopleFilter={peopleFilter}
        peopleSearchQuery={peopleSearchQuery}
        onPeopleFilterChange={onPeopleFilterChange}
        unreadCount={unreadCount}
      />

      <aside className="relative hidden w-[340px] flex-shrink-0 flex-col border-r border-white/40 bg-surface-container-low/95 md:flex">
      <header className="sticky top-0 z-10 border-b border-white/40 bg-white/80 px-5 py-5 backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-sm font-black text-on-primary-fixed shadow-sm">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser?.fullName || currentUser?.username || 'User'}
                  className="h-full w-full object-cover"
                />
              ) : (
                (currentUser?.fullName || currentUser?.username || 'K').slice(0, 2).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                {t('app.inbox')}
              </p>
              <h1 className="truncate text-2xl font-black tracking-tight text-primary">{t('app.messages')}</h1>
            </div>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative rounded-full p-3 text-on-surface-variant transition-colors hover:bg-slate-100/70 hover:text-primary"
              aria-label={t('app.notifications')}
            >
              <span className="material-symbols-outlined text-[28px]">notifications</span>
              {unreadCount > 0 ? (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] bg-surface-container-highest/70 px-4 py-3 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-outline">search</span>
            <input
              className="w-full border-none bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant/70"
              placeholder={t('app.searchMessages')}
              type="text"
              value={conversationSearch}
              onChange={(event) => onConversationSearchChange(event.target.value)}
              style={{ fontSize: `${searchSize}px` }}
            />
          </div>
        </div>

        {notice ? (
          <div
            className={`mt-4 rounded-[22px] border px-4 py-3 shadow-sm ${getNoticeTone(notice.type)}`}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1 text-sm leading-6">{notice.message}</p>
              <button
                type="button"
                onClick={onCloseNotice}
                className="rounded-full p-1 opacity-75 transition-opacity hover:opacity-100"
                aria-label="Close notice"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="hide-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {isLoadingConversations ? (
          <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">
            Dang tai cuoc tro chuyen...
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">
            Chua co cuoc tro chuyen nao. Bam Find People de bat dau chat.
          </div>
        ) : (
          conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full rounded-[24px] p-4 text-left transition-all ${
                  isActive
                    ? 'bg-surface-container-lowest shadow-[0_12px_30px_rgba(25,28,29,0.08)]'
                    : 'hover:bg-white/55'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-sm font-black text-on-primary-fixed">
                    {conversation.avatarUrl ? (
                      <img
                        className="h-full w-full object-cover"
                        alt={conversation.title}
                        src={conversation.avatarUrl}
                      />
                    ) : (
                      conversation.title.slice(0, 2).toUpperCase()
                    )}
                    {conversation.isOnline ? (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-secondary" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3
                        className="truncate font-semibold text-on-surface"
                        style={{ fontSize: `${nameSize}px` }}
                      >
                        {conversation.title}
                      </h3>
                      <span
                        className={`shrink-0 uppercase tracking-[0.18em] ${
                          isActive ? 'font-bold text-primary' : 'text-on-surface-variant'
                        }`}
                        style={{ fontSize: `${timeSize}px` }}
                      >
                        {formatConversationTime(conversation.lastMessageAt)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3">
                      <p
                        className="min-w-0 flex-1 truncate text-on-surface-variant"
                        style={{ fontSize: `${previewSize}px` }}
                      >
                        {conversation.lastMessagePreview}
                      </p>

                      {conversation.unreadCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <nav className="border-t border-white/40 bg-surface-container-low px-4 py-4">
        <div className="flex items-center justify-around gap-2">
          <button
            type="button"
            onClick={onOpenChats}
            className={`flex min-w-[68px] flex-col items-center justify-center rounded-2xl px-4 py-2 transition-all ${
              activePrimaryView === 'chat'
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/25'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              chat_bubble
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Chats</span>
          </button>

          <button
            type="button"
            onClick={onOpenCalls}
            className={`flex min-w-[68px] flex-col items-center justify-center rounded-2xl px-4 py-2 transition-all ${
              activePrimaryView === 'calls'
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/25'
                : 'text-on-surface-variant hover:text-primary'
            }`}
            aria-label="Calls"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Calls</span>
          </button>

          <button
            type="button"
            onClick={onOpenPeoplePanel}
            className="flex min-w-[68px] flex-col items-center justify-center px-4 py-2 text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">{t('app.people')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex min-w-[68px] flex-col items-center justify-center px-4 py-2 text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">{t('app.settings')}</span>
          </button>
        </div>
      </nav>

      {isPeoplePanelOpen ? (
        <div className="absolute inset-0 z-20 flex flex-col bg-surface-container-low/95 p-4 backdrop-blur-xl">
          <div className="mb-4 rounded-[28px] bg-surface-container-lowest p-5 shadow-[0_18px_45px_rgba(25,28,29,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
                  {t('people.findPeople')}
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-on-surface">
                  {t('people.searchByNameOrEmail')}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClosePeoplePanel}
                className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                aria-label="Close people panel"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-full bg-surface-container-highest px-4 py-3">
              <span className="material-symbols-outlined text-[20px] text-outline">search</span>
              <input
                type="text"
                value={peopleSearchQuery}
                onChange={(event) => onUserSearchChange(event.target.value)}
                placeholder={t('people.searchPlaceholder')}
                className="w-full border-none bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant"
              />
            </label>

            <div className="mt-4 rounded-[22px] bg-surface-container-highest/55 px-4 py-3">
              <div className="mb-3 flex flex-wrap gap-2">
                {peopleFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => onPeopleFilterChange?.(filter.key)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${peopleFilter === filter.key ? 'bg-primary text-on-primary' : 'bg-white/75 text-on-surface-variant'}`}
                  >
                    {filter.key === 'friends' ? t('people.friends') : filter.key === 'sent' ? t('people.sent') : t('people.received')}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
                {getPeoplePanelLabel(peoplePanelState?.source)}
              </p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                {peoplePanelState?.description}
              </p>
            </div>
          </div>

          <div
            className="hide-scrollbar flex-1 space-y-3 overflow-y-auto pr-1"
            onScroll={handlePeopleScroll}
          >
            {isSearchingPeople ? (
              <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">
                {t('people.searching')}
              </div>
            ) : (peoplePanelState?.users || []).length === 0 ? (
              <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">
                {peoplePanelState?.description || t('people.noMatches')}
              </div>
            ) : (
              peoplePanelState.users.map((user) => {
                const relationshipLabel = getRelationshipLabel(user);
                const canRequestFriend =
                  !user.friendship || user.friendship.direction === 'incoming';
                const isWorking = friendRequestTargetId === user.id;
                const isFriend = Boolean(user.friendship?.isFriend);
                const previewText = user.lastMessagePreview || user.email;

                return (
                  <div
                    key={user.id}
                    className="rounded-[24px] bg-surface-container-lowest p-4 shadow-[0_10px_24px_rgba(25,28,29,0.06)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-sm font-black text-on-primary-fixed">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          user.displayName.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-on-surface">
                            {user.displayName}
                          </p>
                          {user.isOnline ? (
                            <span className="rounded-full bg-secondary/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                              Online
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-on-surface-variant">@{user.username}</p>
                        <p className="truncate text-xs text-on-surface-variant">{previewText}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onStartDirectRoom(user)}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-primary transition-colors hover:bg-primary-container"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                        {user.directConversationId ? 'Open Chat' : 'Start Chat'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onSendFriendRequest(user.id)}
                        disabled={!canRequestFriend || isWorking}
                        className="rounded-full border border-outline-variant/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isWorking ? 'Working...' : isFriend ? 'Friends' : relationshipLabel}
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {isLoadingMorePeople ? (
              <div className="rounded-[24px] bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-sm">
                Dang tai them...
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-[24px] bg-surface-container-lowest px-4 py-3 text-xs text-on-surface-variant shadow-sm">
            Signed in as {currentUser?.fullName || currentUser?.username || 'Kaiju User'}
          </div>
        </div>
      ) : null}
      </aside>
    </>
  );
};

export default ConversationList;
