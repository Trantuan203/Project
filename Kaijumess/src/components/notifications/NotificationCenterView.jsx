import React, { useMemo, useState } from 'react';
import {
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  CommentOutlined,
  FileImageOutlined,
  FileTextOutlined,
  InfoCircleFilled,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  ThunderboltFilled,
  UserAddOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';

import { useNotificationCenter } from '../../hooks/useNotificationCenter';

const filters = [
  { key: 'all', label: 'All Activity' },
  { key: 'unread', label: 'Unread' },
  { key: 'mentions', label: 'Mentions' },
];

const dateGroupsOrder = ['Today', 'Yesterday', 'Earlier'];

const notificationTone = {
  call: 'bg-secondary text-on-secondary',
  group: 'bg-tertiary-fixed text-tertiary',
  mention: 'bg-primary text-on-primary',
  system: 'bg-surface-container-high text-on-surface',
};

const invitationTone = {
  primary: 'bg-primary-fixed text-on-primary-fixed-variant',
  secondary: 'bg-secondary-container/35 text-on-secondary-container',
};

const trendingTone = {
  primary: 'bg-primary-fixed text-on-primary-fixed-variant',
  secondary: 'bg-secondary-container text-on-secondary-container',
};

const notificationIcon = {
  call: <PhoneOutlined className="text-[11px]" />,
  group: <TeamOutlined className="text-[11px]" />,
  mention: <CommentOutlined className="text-[11px]" />,
  system: <BellOutlined className="text-[11px]" />,
};

const groupIcon = {
  team: <TeamOutlined />,
  thunder: <ThunderboltFilled />,
};

const matchesSearch = (query, ...values) => {
  if (!query) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(query));
};

const NotificationCenterView = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [notice, setNotice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    friendInvitations,
    groupInvitations,
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    refreshFriendInvitations,
    resolveFriendInvitation,
    resolveGroupInvitation,
    toggleTrendingGroup,
    trendingGroups,
    unreadCount,
  } = useNotificationCenter();

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filterCounts = useMemo(
    () => ({
      all: notifications.length,
      mentions: notifications.filter((item) => item.category === 'mention').length,
      unread: notifications.filter((item) => !item.read).length,
    }),
    [notifications],
  );

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((item) => {
        if (activeFilter === 'unread' && item.read) {
          return false;
        }

        if (activeFilter === 'mentions' && item.category !== 'mention') {
          return false;
        }

        return matchesSearch(
          normalizedQuery,
          item.actor.toLowerCase(),
          item.description.toLowerCase(),
          item.dateGroup.toLowerCase(),
        );
      }),
    [activeFilter, normalizedQuery, notifications],
  );

  const groupedNotifications = useMemo(
    () =>
      dateGroupsOrder
        .map((label) => ({
          items: filteredNotifications.filter((item) => item.dateGroup === label),
          label,
        }))
        .filter((group) => group.items.length > 0),
    [filteredNotifications],
  );

  const filteredFriendInvitations = useMemo(
    () =>
      friendInvitations.filter((invitation) =>
        matchesSearch(
          normalizedQuery,
          invitation.name.toLowerCase(),
          invitation.role.toLowerCase(),
          'friend invitation',
        ),
      ),
    [friendInvitations, normalizedQuery],
  );

  const filteredGroupInvitations = useMemo(
    () =>
      groupInvitations.filter((invitation) =>
        matchesSearch(
          normalizedQuery,
          invitation.name.toLowerCase(),
          invitation.summary.toLowerCase(),
          invitation.invitedBy.toLowerCase(),
          'group invitation',
        ),
      ),
    [groupInvitations, normalizedQuery],
  );

  const filteredTrendingGroups = useMemo(
    () =>
      trendingGroups.filter((group) =>
        matchesSearch(
          normalizedQuery,
          group.name.toLowerCase(),
          group.summary.toLowerCase(),
          group.members.toLowerCase(),
          'trending groups',
        ),
      ),
    [normalizedQuery, trendingGroups],
  );

  const hasResults =
    groupedNotifications.length > 0 ||
    filteredFriendInvitations.length > 0 ||
    filteredGroupInvitations.length > 0 ||
    filteredTrendingGroups.length > 0;

  const handleNotificationCardAction = (notification, actionLabel) => {
    markNotificationRead(notification.id);
    setNotice({
      message: `${actionLabel} hien dang la local UX. Neu ban muon mo dung thread/chat that thi phan nay can data backend.`,
      type: 'info',
    });
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsRead();
    setNotice({
      message: 'Tat ca notification da duoc danh dau da doc tren may nay.',
      type: 'success',
    });
  };

  const handleFriendInvitationAction = (invitation, actionLabel) => {
    resolveFriendInvitation(invitation.id);
    setNotice({
      message:
        actionLabel === 'accept'
          ? `${invitation.name} da duoc chap nhan loi moi ket ban trong local mock.`
          : `${invitation.name} da duoc bo qua khoi danh sach loi moi ket ban.`,
      type: actionLabel === 'accept' ? 'success' : 'info',
    });
  };

  const handleGroupInvitationAction = (invitation, actionLabel) => {
    resolveGroupInvitation(invitation.id);
    setNotice({
      message:
        actionLabel === 'accept'
          ? `Ban da tham gia ${invitation.name} trong local mock.`
          : `Loi moi vao ${invitation.name} da duoc bo qua.`,
      type: actionLabel === 'accept' ? 'success' : 'info',
    });
  };

  const handleToggleTrendingGroup = (group) => {
    toggleTrendingGroup(group.id);
    setNotice({
      message: group.joined
        ? `Ban da roi khoi ${group.name} trong local mock.`
        : `Ban da tham gia ${group.name} trong local mock.`,
      type: 'success',
    });
  };

  const handleRefreshInvitations = () => {
    refreshFriendInvitations();
    setNotice({
      message: 'Danh sach loi moi ket ban da duoc lam moi theo local mock data.',
      type: 'info',
    });
  };

  return (
    <section className="hide-scrollbar flex flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <div className="rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BellOutlined />
                  </span>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-on-surface">
                      Notifications
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant md:text-base">
                      You have {unreadCount} unread notifications right now.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:items-end">
                  <label className="relative block">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      <SearchOutlined />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search notifications..."
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      name="notification-search"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      className="w-full rounded-full border-none bg-surface-container-highest py-3 pl-11 pr-4 text-sm text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20 md:w-80"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-sm font-semibold text-primary transition-colors hover:text-primary-container"
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {filters.map((filter) => {
                const isActive = filter.key === activeFilter;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`flex items-center justify-between rounded-[22px] px-4 py-4 text-left transition-colors ${
                      isActive
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <span className="text-sm font-bold">{filter.label}</span>
                    <span className="rounded-lg bg-surface-container-highest px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                      {filterCounts[filter.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {notice ? (
              <div className={`status-banner status-banner--${notice.type}`}>
                <span className="mt-0.5">
                  <InfoCircleFilled />
                </span>
                <div className="text-sm font-medium leading-6">{notice.message}</div>
              </div>
            ) : null}

            {!hasResults ? (
              <div className="rounded-[28px] bg-surface-container-lowest p-8 text-center shadow-sm">
                <p className="text-sm font-semibold text-on-surface">Khong co notification phu hop.</p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Thu doi bo loc hoac tu khoa tim kiem.
                </p>
              </div>
            ) : null}

            {groupedNotifications.map((group) => (
              <section key={group.label} className="space-y-4">
                <div className="px-1 py-2">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant/60">
                    {group.label}
                  </span>
                </div>

                <div className="space-y-4">
                  {group.items.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markNotificationRead(notification.id)}
                      className={`w-full rounded-[30px] p-5 text-left transition-all ${
                        notification.read
                          ? 'bg-surface-container-low opacity-85 hover:opacity-100'
                          : 'bg-surface-container-lowest shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          {notification.avatar ? (
                            <img
                              src={notification.avatar}
                              alt={notification.actor}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
                              <TeamOutlined />
                            </div>
                          )}
                          <div
                            className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface-container-lowest ${notificationTone[notification.category]}`}
                          >
                            {notificationIcon[notification.category]}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-on-surface">
                                {notification.actor}
                              </span>
                              {!notification.read ? (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              ) : null}
                            </div>
                            <span className="text-[10px] font-medium text-on-surface-variant">
                              {notification.timeLabel}
                            </span>
                          </div>

                          <p className="text-sm leading-7 text-on-surface-variant">
                            {notification.description}
                          </p>

                          {notification.files ? (
                            <div className="mt-3 flex gap-2">
                              {notification.files.map((file) => (
                                <div
                                  key={file}
                                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant"
                                >
                                  {file === 'doc' ? (
                                    <FileTextOutlined />
                                  ) : file === 'image' ? (
                                    <FileImageOutlined />
                                  ) : (
                                    <span className="text-[10px] font-bold">{file}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {notification.category === 'mention' ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleNotificationCardAction(notification, 'Reply');
                                }}
                                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-container"
                              >
                                Reply
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleNotificationCardAction(notification, 'View Thread');
                                }}
                                className="rounded-full bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
                              >
                                View Thread
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[32px] bg-surface-container-low p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight text-on-surface">
                  Friend Invitations
                </h3>
                <button
                  type="button"
                  onClick={handleRefreshInvitations}
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  <ReloadOutlined />
                </button>
              </div>

              {filteredFriendInvitations.length === 0 ? (
                <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
                  Khong con loi moi ket ban nao phu hop.
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredFriendInvitations.map((invitation) => (
                    <div key={invitation.id} className="space-y-3 rounded-[24px] bg-surface-container-lowest p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={invitation.avatar}
                          alt={invitation.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-on-surface">
                            {invitation.name}
                          </p>
                          <p className="text-xs text-on-surface-variant">{invitation.role}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleFriendInvitationAction(invitation, 'accept')}
                          className="flex-1 rounded-full bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-primary transition-colors hover:bg-primary-container"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFriendInvitationAction(invitation, 'ignore')}
                          className="flex-1 rounded-full bg-surface-container-high px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container-highest"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[32px] bg-surface-container-low p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UsergroupAddOutlined />
                </span>
                <h3 className="text-lg font-black tracking-tight text-on-surface">
                  Group Invitations
                </h3>
              </div>

              {filteredGroupInvitations.length === 0 ? (
                <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
                  Khong con loi moi tham gia nhom nao phu hop.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGroupInvitations.map((invitation) => (
                    <div key={invitation.id} className="rounded-[24px] bg-surface-container-lowest p-5 shadow-sm">
                      <div className="mb-3 flex items-start gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${invitationTone[invitation.tone]}`}
                        >
                          <TeamOutlined />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-on-surface">{invitation.name}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Invited by {invitation.invitedBy}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm leading-6 text-on-surface-variant">
                        {invitation.summary}
                      </p>
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                        {invitation.members}
                      </p>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleGroupInvitationAction(invitation, 'accept')}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-primary transition-colors hover:bg-primary-container"
                        >
                          <CheckOutlined />
                          Join
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupInvitationAction(invitation, 'ignore')}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-container-high px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container-highest"
                        >
                          <CloseOutlined />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[32px] bg-surface-container-low p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-black tracking-tight text-on-surface">
                Trending Groups
              </h3>

              {filteredTrendingGroups.length === 0 ? (
                <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
                  Khong co trending group nao phu hop.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTrendingGroups.map((group) => (
                    <div key={group.id} className="rounded-[24px] bg-surface-container-lowest p-5 shadow-sm">
                      <div className="mb-3 flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${trendingTone[group.tone]}`}
                        >
                          {groupIcon[group.icon]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-on-surface">{group.name}</p>
                          <p className="text-[11px] text-on-surface-variant">{group.members}</p>
                        </div>
                      </div>

                      <p className="text-sm leading-6 text-on-surface-variant">{group.summary}</p>

                      <button
                        type="button"
                        onClick={() => handleToggleTrendingGroup(group)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-surface-container-highest"
                      >
                        {group.joined ? <CheckOutlined /> : <UserAddOutlined />}
                        {group.joined ? 'Joined' : 'Join'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default NotificationCenterView;
