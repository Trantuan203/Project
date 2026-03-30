import React, { useEffect, useState } from 'react';
import { BellOutlined, SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';

import CallsView from '../components/call/CallsView';
import CallOverlay from '../components/chat/CallOverlay';
import ChatWindow from '../components/chat/ChatWindow';
import DetailsPanel from '../components/chat/DetailsPanel';
import MobileContactDetails from '../components/mobile/MobileContactDetails';
import NotificationCenterView from '../components/notifications/NotificationCenterView';
import SettingsView from '../components/Setting/SettingsView';
import ConversationList from '../components/sidebar/ConversationList';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import useCall from '../hooks/useCall';
import { useMessages } from '../hooks/useMessages';
import { useNotificationCenter } from '../hooks/useNotificationCenter';
import useSocket from '../hooks/useSocket';

const ChatPage = () => {
  const [showDetails, setShowDetails] = useState(false);
  const { t } = useLanguage();
  const [isMobileConversationOpen, setIsMobileConversationOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, logout } = useAuth();
  const { unreadCount } = useNotificationCenter();
  const {
    activeConversation,
    activeConversationId,
    activeMessages,
    activeMessagePageState,
    allConversations,
    clearNotice,
    conversationIds,
    conversationSearch,
    conversations,
    friendRequestTargetId,
    hasMorePeople,
    handleClosePeoplePanel,
    handleConversationUpdated,
    handleIncomingHistory,
    handleIncomingMessage,
    handleLoadOlderMessages,
    handleLoadMorePeople,
    handleOpenPeoplePanel,
    handleSendFriendRequest,
    handleSendMessage,
    handleUpdateConversationWallpaper,
    handleUpdateParticipantNickname,
    handleStartDirectRoom,
    handleTypingStart,
    handleTypingStop,
    isLoadingConversations,
    isLoadingMorePeople,
    isLoadingMessages,
    isPeoplePanelOpen,
    isSearchingPeople,
    isSendingMessage,
    isUpdatingConversationWallpaper,
    isUpdatingParticipantNickname,
    notice,
    peoplePanelState,
    peopleFilter,
    peopleSearchQuery,
    remoteTypingUserId,
    selectConversation,
    setConversationSearch,
    setPeopleFilter,
    setPeopleSearchQuery,
  } = useMessages(currentUser);
  const userInitial = currentUser?.fullName?.charAt(0)?.toUpperCase() ?? 'K';
  const requestedView = searchParams.get('view');
  const activeView =
    requestedView === 'settings' || requestedView === 'notifications' || requestedView === 'calls'
      ? requestedView
      : 'chat';
  const isSettingsView = activeView === 'settings';
  const isNotificationsView = activeView === 'notifications';
  const isCallsView = activeView === 'calls';
  const isChatWorkspaceView = activeView === 'chat' || activeView === 'calls';

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

  useEffect(() => {
    if (!activeConversationId) {
      setIsMobileConversationOpen(false);
      setShowDetails(false);
    }
  }, [activeConversationId]);

  const updateViewParams = (nextView) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextView === 'settings') {
      nextParams.set('view', 'settings');

      if (!nextParams.get('section')) {
        nextParams.set('section', 'overview');
      }
    } else if (nextView === 'notifications') {
      nextParams.set('view', 'notifications');
      nextParams.delete('section');
    } else if (nextView === 'calls') {
      nextParams.set('view', 'calls');
      nextParams.delete('section');
    } else {
      nextParams.delete('view');
      nextParams.delete('section');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleToggleSettings = () => {
    setShowDetails(false);
    setIsMobileConversationOpen(false);
    updateViewParams(activeView === 'settings' ? 'chat' : 'settings');
  };

  const handleToggleNotifications = () => {
    setShowDetails(false);
    setIsMobileConversationOpen(false);
    updateViewParams(activeView === 'notifications' ? 'chat' : 'notifications');
  };

  const handleOpenCalls = () => {
    setShowDetails(false);
    setIsMobileConversationOpen(false);
    updateViewParams('calls');
  };

  const handleOpenChats = () => {
    setShowDetails(false);
    setIsMobileConversationOpen(false);
    updateViewParams('chat');
  };

  const handleOpenPeople = () => {
    setShowDetails(false);
    setIsMobileConversationOpen(false);
    updateViewParams('chat');
    handleOpenPeoplePanel();
  };

  const handleOpenPeopleFromSettings = () => {
    setShowDetails(false);
    setIsMobileConversationOpen(false);
    updateViewParams('chat');
    handleOpenPeoplePanel();
  };

  const handleSelectConversation = (conversationId) => {
    updateViewParams('chat');
    selectConversation(conversationId);
    setShowDetails(false);

    if (isMobileViewport) {
      setIsMobileConversationOpen(true);
    }
  };

  const handleStartDirectConversation = async (targetUser) => {
    const room = await handleStartDirectRoom(targetUser);

    if (room) {
      updateViewParams('chat');
      setShowDetails(false);

      if (isMobileViewport) {
        setIsMobileConversationOpen(true);
      }
    }

    return room;
  };

  const handleReturnToConversationList = () => {
    setIsMobileConversationOpen(false);
  };

  const headerSubtitle = isSettingsView
    ? t('settings.settings')
    : isNotificationsView
      ? t('notifications.title')
      : currentUser?.fullName;

  const { emitTypingStart, emitTypingStop } = useSocket({
    conversationIds,
    onConversationUpdated: handleConversationUpdated,
    onIncomingHistory: handleIncomingHistory,
    onIncomingMessage: handleIncomingMessage,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
  });
  const {
    acceptCall,
    callNotice,
    callState,
    clearCallNotice,
    endCall,
    hasActiveCall,
    startAudioCall,
    startVideoCall,
    toggleCamera,
    toggleMute,
  } = useCall({
    conversations: allConversations,
    onFocusConversation: selectConversation,
  });

  const shouldShowConversationList = isCallsView
    ? !isMobileViewport
    : !isMobileViewport || !isMobileConversationOpen;
  const shouldShowChatWindow = !isCallsView && (!isMobileViewport || isMobileConversationOpen);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface font-body text-on-surface">
      {!isChatWorkspaceView ? (
        <header className="flex h-16 w-full items-center justify-between border-b border-surface-container-highest bg-surface-bright/80 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-black text-on-primary">
              {userInitial}
            </div>
            <div>
              <h1 className="font-headline text-lg font-black tracking-[-0.06em] text-on-surface md:text-xl">
                KAIJUMESS
              </h1>
              <p className="text-xs text-on-surface-variant">{headerSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPeoplePanel}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label={t('app.search')}
            >
              <SearchOutlined />
            </button>

            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`relative rounded-full p-2 transition-colors ${
                isNotificationsView
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
              aria-label={t('app.notifications')}
            >
              <BellOutlined />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

          </div>
        </header>
      ) : null}

      <main className="flex flex-1 overflow-hidden">
        {isSettingsView ? (
          <SettingsView
            currentUser={currentUser}
            onCloseSettings={() => updateViewParams('chat')}
            onOpenCalls={handleOpenCalls}
            onOpenChats={handleOpenChats}
            onOpenPeople={handleOpenPeopleFromSettings}
            onLogout={logout}
          />
        ) : isNotificationsView ? (
          <NotificationCenterView onClose={() => updateViewParams('chat')} />
        ) : (
          <>
            {shouldShowConversationList ? (
              <ConversationList
                activeConversationId={activeConversationId}
                activePrimaryView={isCallsView ? 'calls' : 'chat'}
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
                onCloseNotice={clearNotice}
                onClosePeoplePanel={handleClosePeoplePanel}
                onConversationSearchChange={setConversationSearch}
                onLoadMorePeople={handleLoadMorePeople}
                onOpenCalls={handleOpenCalls}
                onOpenChats={handleOpenChats}
                onOpenNotifications={handleToggleNotifications}
                onOpenPeoplePanel={handleOpenPeoplePanel}
                onOpenSettings={handleToggleSettings}
                onSelectConversation={handleSelectConversation}
                onSendFriendRequest={handleSendFriendRequest}
                onStartDirectRoom={handleStartDirectConversation}
                onUserSearchChange={setPeopleSearchQuery}
                peoplePanelState={peoplePanelState}
                peopleFilter={peopleFilter}
                peopleSearchQuery={peopleSearchQuery}
                onPeopleFilterChange={setPeopleFilter}
                unreadCount={unreadCount}
              />
            ) : null}
            {isCallsView ? (
              <CallsView
                onBack={isMobileViewport ? handleOpenChats : undefined}
                onOpenConversation={(conversationId) => {
                  handleSelectConversation(conversationId);
                }}
              />
            ) : shouldShowChatWindow ? (
              <>
                <ChatWindow
                  conversation={activeConversation}
                  currentUser={currentUser}
                  friendRequestTargetId={friendRequestTargetId}
                  hasOlderMessages={Boolean(activeMessagePageState?.hasOlder)}
                  hasActiveCall={hasActiveCall}
                  isLoadingOlderMessages={Boolean(activeMessagePageState?.isLoadingOlder)}
                  isLoadingMessages={isLoadingMessages}
                  isSendingMessage={isSendingMessage}
                  messages={activeMessages}
                  onBack={isMobileViewport ? handleReturnToConversationList : undefined}
                  onLoadOlderMessages={handleLoadOlderMessages}
                  onSendFriendRequest={handleSendFriendRequest}
                  onSendMessage={handleSendMessage}
                  onStartAudioCall={startAudioCall}
                  onStartVideoCall={startVideoCall}
                  onToggleDetails={() => setShowDetails((currentState) => !currentState)}
                  onTypingStart={emitTypingStart}
                  onTypingStop={emitTypingStop}
                  remoteTypingUserId={remoteTypingUserId}
                />
                {showDetails ? (
                  isMobileViewport ? (
                    <MobileContactDetails
                      conversation={activeConversation}
                      currentUser={currentUser}
                      isUpdatingConversationWallpaper={isUpdatingConversationWallpaper}
                      isUpdatingParticipantNickname={isUpdatingParticipantNickname}
                      messages={activeMessages}
                      onBack={() => setShowDetails(false)}
                      onOpenCalls={handleOpenCalls}
                      onOpenChats={handleOpenChats}
                      onOpenPeople={handleOpenPeople}
                      onOpenSettings={handleToggleSettings}
                      onUpdateConversationWallpaper={handleUpdateConversationWallpaper}
                      onUpdateParticipantNickname={handleUpdateParticipantNickname}
                      onStartAudioCall={startAudioCall}
                      onStartVideoCall={startVideoCall}
                    />
                  ) : (
                    <DetailsPanel
                      conversation={activeConversation}
                      currentUser={currentUser}
                      isUpdatingParticipantNickname={isUpdatingParticipantNickname}
                      messages={activeMessages}
                      onUpdateParticipantNickname={handleUpdateParticipantNickname}
                    />
                  )
                ) : null}
              </>
            ) : null}
          </>
        )}
      </main>

      {callNotice ? (
        <div className="pointer-events-none fixed right-4 top-20 z-[91] max-w-sm">
          <div
            className={`pointer-events-auto rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
              callNotice.type === 'error'
                ? 'bg-error text-white'
                : callNotice.type === 'success'
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container-highest text-on-surface'
            }`}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1 leading-6">{callNotice.message}</p>
              <button
                type="button"
                onClick={clearCallNotice}
                className="opacity-70 transition-opacity hover:opacity-100"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CallOverlay
        callState={callState}
        onAccept={acceptCall}
        onEnd={endCall}
        onToggleCamera={toggleCamera}
        onToggleMute={toggleMute}
      />
    </div>
  );
};

export default ChatPage;
