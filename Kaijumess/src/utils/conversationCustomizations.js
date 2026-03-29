import {
  DEFAULT_WALLPAPER_BLUR,
  buildWallpaperLayerStyle,
  resolveWallpaperOption,
  sanitizeAppearanceSettings,
} from '../constants/appearance';

export const CONVERSATION_PREFERENCES_PREFIX = 'kaijumess-contact-details';
export const CONVERSATION_PREFERENCES_EVENT = 'kaijumess:conversation-preferences';
export const DEFAULT_CONVERSATION_WALLPAPER_ID = 'default';

const getDefaultConversationPreferences = () => ({
  chatWallpaperId: DEFAULT_CONVERSATION_WALLPAPER_ID,
  disappearingMessages: false,
  encrypted: true,
  muted: false,
});

export const getConversationPreferencesStorageKey = (conversationId) =>
  `${CONVERSATION_PREFERENCES_PREFIX}:${conversationId}`;

export const sanitizeConversationPreferences = (value = {}) => ({
  ...getDefaultConversationPreferences(),
  chatWallpaperId:
    typeof value.chatWallpaperId === 'string' && value.chatWallpaperId.trim()
      ? value.chatWallpaperId
      : DEFAULT_CONVERSATION_WALLPAPER_ID,
  disappearingMessages: Boolean(value.disappearingMessages),
  encrypted: value.encrypted !== undefined ? Boolean(value.encrypted) : true,
  muted: Boolean(value.muted),
});

export const readConversationPreferences = (conversationId) => {
  if (typeof window === 'undefined' || !conversationId) {
    return getDefaultConversationPreferences();
  }

  try {
    const rawValue = window.localStorage.getItem(getConversationPreferencesStorageKey(conversationId));

    if (!rawValue) {
      return getDefaultConversationPreferences();
    }

    return sanitizeConversationPreferences(JSON.parse(rawValue));
  } catch {
    return getDefaultConversationPreferences();
  }
};

export const writeConversationPreferences = (conversationId, value) => {
  if (typeof window === 'undefined' || !conversationId) {
    return;
  }

  const sanitizedValue = sanitizeConversationPreferences(value);
  window.localStorage.setItem(
    getConversationPreferencesStorageKey(conversationId),
    JSON.stringify(sanitizedValue),
  );
  window.dispatchEvent(
    new CustomEvent(CONVERSATION_PREFERENCES_EVENT, {
      detail: {
        conversationId,
        preferences: sanitizedValue,
      },
    }),
  );
};

export const resolveConversationWallpaperStyle = (wallpaperId) => {
  if (!wallpaperId || wallpaperId === DEFAULT_CONVERSATION_WALLPAPER_ID) {
    return null;
  }

  const wallpaper = resolveWallpaperOption(
    sanitizeAppearanceSettings({
      customWallpaperDataUrl: '',
      wallpaperBlur: DEFAULT_WALLPAPER_BLUR,
      wallpaperId,
    }),
  );

  if (!wallpaper?.style) {
    return null;
  }

  return buildWallpaperLayerStyle({
    style: wallpaper.style,
    wallpaperBlur: DEFAULT_WALLPAPER_BLUR,
  });
};
