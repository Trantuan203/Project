import React, { createContext, useEffect, useMemo, useState } from 'react';

import {
  NOTIFICATION_CENTER_STORAGE_KEY,
  NOTIFICATION_PREFS_STORAGE_KEY,
  defaultNotificationPreferences,
  notificationAlertStyles,
  notificationSoundPresets,
} from '../constants/notificationCenter';
import {
  fetchNotificationCenter,
  markAccountNotificationRead,
  markAllAccountNotificationsRead,
  respondToFriendInvitation,
} from '../services/account';
import { useAuth } from '../hooks/useAuth';
import { updateSettingsSection } from '../services/settings';

const NotificationCenterContext = createContext(null);

const createDefaultCenterState = (currentUserName) => ({
  friendInvitations: [],
  groupInvitations: [],
  notifications: [],
  trendingGroups: [],
});

const readStoredCenterState = (currentUserName) => {
  const defaultState = createDefaultCenterState(currentUserName);

  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const rawValue = window.localStorage.getItem(NOTIFICATION_CENTER_STORAGE_KEY);

    if (!rawValue) {
      return defaultState;
    }

    const parsedValue = JSON.parse(rawValue);

    return {
      ...defaultState,
      ...parsedValue,
      friendInvitations: Array.isArray(parsedValue.friendInvitations)
        ? parsedValue.friendInvitations
        : defaultState.friendInvitations,
      groupInvitations: Array.isArray(parsedValue.groupInvitations)
        ? parsedValue.groupInvitations
        : defaultState.groupInvitations,
      notifications: Array.isArray(parsedValue.notifications)
        ? parsedValue.notifications
        : defaultState.notifications,
      trendingGroups: Array.isArray(parsedValue.trendingGroups)
        ? parsedValue.trendingGroups
        : defaultState.trendingGroups,
    };
  } catch {
    return defaultState;
  }
};

const readStoredPreferences = () => {
  if (typeof window === 'undefined') {
    return defaultNotificationPreferences;
  }

  try {
    const rawValue = window.localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);

    if (!rawValue) {
      return defaultNotificationPreferences;
    }

    return {
      ...defaultNotificationPreferences,
      ...JSON.parse(rawValue),
    };
  } catch {
    return defaultNotificationPreferences;
  }
};

const sanitizeNotificationPreferences = (value = {}) => ({
  alertStyle:
    typeof value.alertStyle === 'string' &&
    notificationAlertStyles.includes(value.alertStyle.trim())
      ? value.alertStyle.trim()
      : defaultNotificationPreferences.alertStyle,
  bannersEnabled: Boolean(value.bannersEnabled),
  groupAlertsEnabled:
    value.groupAlertsEnabled !== undefined
      ? Boolean(value.groupAlertsEnabled)
      : defaultNotificationPreferences.groupAlertsEnabled,
  inAppSoundsEnabled:
    value.inAppSoundsEnabled !== undefined
      ? Boolean(value.inAppSoundsEnabled)
      : defaultNotificationPreferences.inAppSoundsEnabled,
  inAppVibrateEnabled:
    value.inAppVibrateEnabled !== undefined
      ? Boolean(value.inAppVibrateEnabled)
      : defaultNotificationPreferences.inAppVibrateEnabled,
  muteMentionsEnabled:
    value.muteMentionsEnabled !== undefined
      ? Boolean(value.muteMentionsEnabled)
      : defaultNotificationPreferences.muteMentionsEnabled,
  pushEnabled:
    value.pushEnabled !== undefined
      ? Boolean(value.pushEnabled)
      : defaultNotificationPreferences.pushEnabled,
  quietEnd:
    typeof value.quietEnd === 'string' && /^\d{2}:\d{2}$/.test(value.quietEnd)
      ? value.quietEnd
      : defaultNotificationPreferences.quietEnd,
  quietModeEnabled:
    value.quietModeEnabled !== undefined
      ? Boolean(value.quietModeEnabled)
      : defaultNotificationPreferences.quietModeEnabled,
  quietStart:
    typeof value.quietStart === 'string' && /^\d{2}:\d{2}$/.test(value.quietStart)
      ? value.quietStart
      : defaultNotificationPreferences.quietStart,
  showPreviews:
    value.showPreviews !== undefined
      ? Boolean(value.showPreviews)
      : defaultNotificationPreferences.showPreviews,
  soundPreset:
    typeof value.soundPreset === 'string' &&
    notificationSoundPresets.includes(value.soundPreset.trim())
      ? value.soundPreset.trim()
      : defaultNotificationPreferences.soundPreset,
});

export const NotificationCenterProvider = ({ children }) => {
  const { currentUser, updateCurrentUserPreferences } = useAuth();
  const currentUserName = currentUser?.fullName || currentUser?.displayName || 'Kaiju User';
  const [centerState, setCenterState] = useState(() => readStoredCenterState(currentUserName));
  const [preferences, setPreferencesState] = useState(() =>
    sanitizeNotificationPreferences(readStoredPreferences()),
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    setPreferencesState(
      sanitizeNotificationPreferences(
        currentUser.preferences?.notifications || defaultNotificationPreferences,
      ),
    );
  }, [currentUser?.id, currentUser?.preferences?.notifications]);

  useEffect(() => {
    if (!currentUser?.id) {
      setCenterState(createDefaultCenterState(currentUserName));
      return;
    }

    let isCancelled = false;

    void fetchNotificationCenter()
      .then((payload) => {
        if (isCancelled) {
          return;
        }

        setCenterState({
          friendInvitations: Array.isArray(payload.friendInvitations) ? payload.friendInvitations : [],
          groupInvitations: Array.isArray(payload.groupInvitations) ? payload.groupInvitations : [],
          notifications: Array.isArray(payload.notifications) ? payload.notifications : [],
          trendingGroups: Array.isArray(payload.trendingGroups) ? payload.trendingGroups : [],
        });
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setCenterState(createDefaultCenterState(currentUserName));
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, currentUserName]);

  const setPreferences = (nextValue) => {
    setPreferencesState((currentValue) => {
      const nextPreferences = sanitizeNotificationPreferences(
        typeof nextValue === 'function'
          ? nextValue(currentValue)
          : {
              ...currentValue,
              ...nextValue,
            },
      );

      if (currentUser?.id) {
        void updateSettingsSection('notifications', nextPreferences)
          .then((payload) => {
            updateCurrentUserPreferences(
              'notifications',
              payload.preferences?.notifications || nextPreferences,
            );
          })
          .catch(() => {
            // Keep local notification preferences even if sync is temporarily unavailable.
          });
      }

      return nextPreferences;
    });
  };

  const unreadCount = useMemo(
    () => centerState.notifications.filter((item) => !item.read).length,
    [centerState.notifications],
  );

  const markNotificationRead = (notificationId) => {
    setCenterState((currentValue) => ({
      ...currentValue,
      notifications: currentValue.notifications.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              read: true,
            }
          : item,
        ),
    }));

    if (currentUser?.id) {
      void markAccountNotificationRead(notificationId).catch(() => {
        // Keep optimistic UI when backend sync temporarily fails.
      });
    }
  };

  const markAllNotificationsRead = () => {
    setCenterState((currentValue) => ({
      ...currentValue,
      notifications: currentValue.notifications.map((item) => ({
        ...item,
        read: true,
        })),
    }));

    if (currentUser?.id) {
      void markAllAccountNotificationsRead().catch(() => {
        // Keep optimistic UI when backend sync temporarily fails.
      });
    }
  };

  const refreshFriendInvitations = () => {
    if (!currentUser?.id) {
      return;
    }

    void fetchNotificationCenter().then((payload) => {
      setCenterState((currentValue) => ({
        ...currentValue,
        friendInvitations: Array.isArray(payload.friendInvitations) ? payload.friendInvitations : [],
      }));
    });
  };

  const resolveFriendInvitation = async (invitationId, action = 'accept') => {
    if (!currentUser?.id) {
      return;
    }

    await respondToFriendInvitation({ action, friendshipId: invitationId });
    setCenterState((currentValue) => ({
      ...currentValue,
      friendInvitations: currentValue.friendInvitations.filter((item) => item.id !== invitationId),
    }));
  };

  const resolveGroupInvitation = (invitationId) => {
    setCenterState((currentValue) => ({
      ...currentValue,
      groupInvitations: currentValue.groupInvitations.filter((item) => item.id !== invitationId),
    }));
  };

  const toggleTrendingGroup = (groupId) => {
    setCenterState((currentValue) => ({
      ...currentValue,
      trendingGroups: currentValue.trendingGroups.map((item) =>
        item.id === groupId
          ? {
              ...item,
              joined: !item.joined,
            }
          : item,
      ),
    }));
  };

  return (
    <NotificationCenterContext.Provider
      value={{
        ...centerState,
        markAllNotificationsRead,
        markNotificationRead,
        notificationPreferences: preferences,
        refreshFriendInvitations,
        resolveFriendInvitation,
        resolveGroupInvitation,
        setNotificationPreferences: setPreferences,
        toggleTrendingGroup,
        unreadCount,
      }}
    >
      {children}
    </NotificationCenterContext.Provider>
  );
};

export default NotificationCenterContext;
