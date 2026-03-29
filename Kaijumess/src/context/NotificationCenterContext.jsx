import React, { createContext, useEffect, useMemo, useState } from 'react';

import {
  NOTIFICATION_CENTER_STORAGE_KEY,
  NOTIFICATION_PREFS_STORAGE_KEY,
  defaultNotificationPreferences,
  notificationAlertStyles,
  notificationSoundPresets,
} from '../constants/notificationCenter';
import { useAuth } from '../hooks/useAuth';
import { updateSettingsSection } from '../services/settings';

const NotificationCenterContext = createContext(null);

const createInitialNotifications = (currentUserName) => [
  {
    actor: 'Sarah Jenkins',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDIEWQxTRo7CUsmMUGGqkdzogIw17hB1xcmQMxWLGd1k6jomIUoAeAhhLjy_AZwYiQ-2NYtRYR0tE4gO4ttF2RU4maiHBnhgkclV3X-M5_EqgxIkvVuek3RynvA9OWhpXcqrMRWC9sJxth8eJ8DDVuvFbc4TCeDO9solyatpvApW16TpIbf_GxYs2Ml9qR8nLXdz9MMgoSqwi5YOYl1E-KU64pSEz6uizCfKPcMU2sIGPRYW-RMEzYyRCQf7_MCuxMyFuIUs_WbE4uq',
    category: 'mention',
    dateGroup: 'Today',
    description:
      'Mentioned you in Design System Overhaul: "I think we should reconsider the border-radius for the mobile view."',
    id: 'notif-1',
    read: false,
    timeLabel: '2m ago',
  },
  {
    actor: 'Marcus Thorne',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAQfrnqR2TIerrHXaTatEGOFcqKuNAFbXrTFoTxTfHGszsbzr-iPqitMAKs1QqUbRhRWz_o9b5wLrN9L1hG-few8WjU8CiEqz_XJU2m5G00FglhzViCphHiOjsQ54Yml9_YrwnPHVRAkVvQEGrl8wdlDkQN6_2Q2FpQA26oKuoIhGdDq7rWEdwMdyuAnczVIgWSW8kPwWASucND077jf5GDiD6IjasdgckHjtSbHHB0ect3FI07Fj3NL85h0REmu9nSZeahT3-DA26B',
    category: 'call',
    dateGroup: 'Today',
    description:
      'Missed call from Marcus. "Hey, do you have a minute to discuss the Q3 roadmap?"',
    id: 'notif-2',
    read: false,
    timeLabel: '45m ago',
  },
  {
    actor: 'Priya Desai',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCTk13PKebN0L4p_7WAR0_2tFBN2_eIikcFEirCgCP_V-KBtmbw7b0fFSU0hNzVtDtlNI5Kczk6usx3FshOyBRjIhmucHo9y_6w0icnw4Q-ScpelbHni-ruBzy6lrBEFYRCknTPy6_RmBHoPyaWFT3M_q3X54eMXQdxXdy_gHcO49KlcuRz9lWWEgrsIsg5AVQvSn9Oikd0nbTN2VO9lZwjrO6oSFDquHKIZ98mzPL01Wa8ol6hAoIJ1dpB_OrbZdWwFRg0Wzi3bciE',
    category: 'mention',
    dateGroup: 'Today',
    description:
      'Tagged you in Product Handoff Checklist and asked for sign-off before release.',
    id: 'notif-3',
    read: false,
    timeLabel: '1h ago',
  },
  {
    actor: 'Product Strategy Group',
    category: 'group',
    dateGroup: 'Yesterday',
    description: `${currentUserName} shared 4 new files in the shared workspace.`,
    files: ['doc', 'image', '+2'],
    id: 'notif-4',
    read: true,
    timeLabel: '1d ago',
  },
  {
    actor: 'Workspace Digest',
    category: 'system',
    dateGroup: 'Yesterday',
    description: 'Your weekly summary is ready with 8 unresolved mentions and 3 upcoming calls.',
    id: 'notif-5',
    read: true,
    timeLabel: '1d ago',
  },
];

const createInitialFriendInvitations = () => [
  {
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCfH5Uk7TIseuiJ57lhAmSqCz1j4D7l3O8dDG_voN19IfbfNZL-kHNOU_nb-ThJU1i-4z6aDoTUr9xx8oC0SUBwoWDn9_81wcMglYIeHyjuAL_UWWMkGuIUHOQJIhLeYQIvTTSafzwNpUqnoWpOdkwKIW1tiiR4F4E61fZjRfXQR92gyVLL3TbKTPFI-JZOepqigmHfhXNsr6MLxOdEhWbCCrdI74fCe-jpFRjjjCKJA9aDYoi9MIwfICHVtS434y2Gvv7ZWFC6MANW',
    id: 'friend-1',
    name: 'David Kim',
    role: 'Project Manager',
  },
  {
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCTk13PKebN0L4p_7WAR0_2tFBN2_eIikcFEirCgCP_V-KBtmbw7b0fFSU0hNzVtDtlNI5Kczk6usx3FshOyBRjIhmucHo9y_6w0icnw4Q-ScpelbHni-ruBzy6lrBEFYRCknTPy6_RmBHoPyaWFT3M_q3X54eMXQdxXdy_gHcO49KlcuRz9lWWEgrsIsg5AVQvSn9Oikd0nbTN2VO9lZwjrO6oSFDquHKIZ98mzPL01Wa8ol6hAoIJ1dpB_OrbZdWwFRg0Wzi3bciE',
    id: 'friend-2',
    name: 'Amara Okafor',
    role: 'UI Designer',
  },
];

const createInitialGroupInvitations = () => [
  {
    id: 'invite-1',
    invitedBy: 'Sarah Jenkins',
    members: '18 members',
    name: 'AI Editorial Guild',
    tone: 'primary',
    summary: 'Join the team workspace for editorial prompts and AI experiments.',
  },
  {
    id: 'invite-2',
    invitedBy: 'Marcus Thorne',
    members: '9 members',
    name: 'Q3 Roadmap Room',
    tone: 'secondary',
    summary: 'Review milestones, blockers and launch priorities with the roadmap crew.',
  },
];

const createInitialTrendingGroups = () => [
  {
    icon: 'thunder',
    id: 'trend-1',
    joined: false,
    members: '1.2k members',
    name: 'AI Explorers',
    summary: 'Discussing the future of LLMs in enterprise products.',
    tone: 'secondary',
  },
  {
    icon: 'team',
    id: 'trend-2',
    joined: false,
    members: '840 members',
    name: 'System Design',
    summary: 'Best practices for building scalable backend architectures.',
    tone: 'primary',
  },
];

const createDefaultCenterState = (currentUserName) => ({
  friendInvitations: createInitialFriendInvitations(),
  groupInvitations: createInitialGroupInvitations(),
  notifications: createInitialNotifications(currentUserName),
  trendingGroups: createInitialTrendingGroups(),
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

    window.localStorage.setItem(NOTIFICATION_CENTER_STORAGE_KEY, JSON.stringify(centerState));
  }, [centerState]);

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
  };

  const markAllNotificationsRead = () => {
    setCenterState((currentValue) => ({
      ...currentValue,
      notifications: currentValue.notifications.map((item) => ({
        ...item,
        read: true,
      })),
    }));
  };

  const refreshFriendInvitations = () => {
    setCenterState((currentValue) => ({
      ...currentValue,
      friendInvitations: [...currentValue.friendInvitations].reverse(),
    }));
  };

  const resolveFriendInvitation = (invitationId) => {
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
