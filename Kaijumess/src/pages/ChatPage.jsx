import React, { useState } from 'react';
import { BellOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';

import ChatWindow from '../components/chat/ChatWindow';
import DetailsPanel from '../components/chat/DetailsPanel';
import NotificationCenterView from '../components/notifications/NotificationCenterView';
import SettingsView from '../components/Setting/SettingsView';
import ConversationList from '../components/sidebar/ConversationList';
import { useAuth } from '../hooks/useAuth';
import { useNotificationCenter } from '../hooks/useNotificationCenter';

const ChatPage = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [activeView, setActiveView] = useState('chat');
  const { currentUser, logout } = useAuth();
  const { unreadCount } = useNotificationCenter();
  const userInitial = currentUser?.fullName?.charAt(0)?.toUpperCase() ?? 'K';
  const isSettingsView = activeView === 'settings';
  const isNotificationsView = activeView === 'notifications';

  const handleToggleSettings = () => {
    setShowDetails(false);
    setActiveView((currentView) => (currentView === 'settings' ? 'chat' : 'settings'));
  };

  const handleToggleNotifications = () => {
    setShowDetails(false);
    setActiveView((currentView) => (currentView === 'notifications' ? 'chat' : 'notifications'));
  };

  const headerSubtitle = isSettingsView
    ? 'Settings'
    : isNotificationsView
      ? 'Notifications'
      : currentUser?.fullName;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface font-body text-on-surface">
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

        {!isSettingsView ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Tim kiem"
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
              aria-label="Thong bao"
            >
              <BellOutlined />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={handleToggleSettings}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Cai dat"
            >
              <SettingOutlined />
            </button>
          </div>
        ) : null}
      </header>

      <main className="flex flex-1 overflow-hidden">
        {isSettingsView ? (
          <SettingsView
            currentUser={currentUser}
            onCloseSettings={() => setActiveView('chat')}
            onLogout={logout}
          />
        ) : isNotificationsView ? (
          <NotificationCenterView />
        ) : (
          <>
            <ConversationList />
            <ChatWindow onToggleDetails={() => setShowDetails((currentState) => !currentState)} />
            {showDetails ? <DetailsPanel /> : null}
          </>
        )}
      </main>
    </div>
  );
};

export default ChatPage;
