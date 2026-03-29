const userModel = require('../models/user.model');

const FONT_SCALE_MIN = 12;
const FONT_SCALE_MAX = 24;
const DEFAULT_FONT_SCALE = 16;
const DEFAULT_WALLPAPER_ID = 'sapphire';
const MAX_BLOCKED_CONTACTS = 100;
const MAX_BACKUP_CODES = 12;
const VALID_THEME_MODES = ['light', 'dark', 'system'];
const VALID_VISIBILITY_VALUES = ['Everyone', 'My Contacts', 'Nobody'];
const VALID_TWO_FACTOR_METHODS = ['authenticator', 'email'];

const defaultPreferences = {
    appearance: {
        customWallpaperDataUrl: '',
        fontScale: DEFAULT_FONT_SCALE,
        wallpaperId: DEFAULT_WALLPAPER_ID,
    },
    notifications: {
        bannersEnabled: false,
        pushEnabled: true,
        quietEnd: '08:00',
        quietModeEnabled: true,
        quietStart: '22:00',
        soundPreset: 'Default Chime',
    },
    privacy: {
        blockedContacts: [],
        groupInvitationVisibility: 'My Contacts',
        profilePhotoVisibility: 'Everyone',
    },
    security: {
        backupCodes: [],
        enabled: false,
        method: 'authenticator',
        updatedAt: null,
    },
    theme: {
        mode: 'system',
    },
};

const isPlainObject = (value) => (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
);

const clampFontScale = (value) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return DEFAULT_FONT_SCALE;
    }

    return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(numericValue)));
};

const sanitizeTimeValue = (value, fallbackValue) => (
    typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
        ? value
        : fallbackValue
);

const sanitizeString = (value, fallbackValue = '', maxLength = 255) => (
    typeof value === 'string'
        ? value.trim().slice(0, maxLength)
        : fallbackValue
);

const sanitizeThemeSettings = (value = {}) => ({
    mode: VALID_THEME_MODES.includes(value.mode) ? value.mode : defaultPreferences.theme.mode,
});

const sanitizeAppearanceSettings = (value = {}) => ({
    customWallpaperDataUrl:
        typeof value.customWallpaperDataUrl === 'string' &&
        value.customWallpaperDataUrl.startsWith('data:image/')
            ? value.customWallpaperDataUrl
            : '',
    fontScale: clampFontScale(value.fontScale),
    wallpaperId:
        typeof value.wallpaperId === 'string' && value.wallpaperId.trim()
            ? value.wallpaperId.trim().slice(0, 80)
            : DEFAULT_WALLPAPER_ID,
});

const sanitizeNotificationSettings = (value = {}) => ({
    bannersEnabled: Boolean(value.bannersEnabled),
    pushEnabled: value.pushEnabled !== undefined ? Boolean(value.pushEnabled) : true,
    quietEnd: sanitizeTimeValue(value.quietEnd, defaultPreferences.notifications.quietEnd),
    quietModeEnabled:
        value.quietModeEnabled !== undefined
            ? Boolean(value.quietModeEnabled)
            : defaultPreferences.notifications.quietModeEnabled,
    quietStart: sanitizeTimeValue(value.quietStart, defaultPreferences.notifications.quietStart),
    soundPreset: sanitizeString(
        value.soundPreset,
        defaultPreferences.notifications.soundPreset,
        80
    ) || defaultPreferences.notifications.soundPreset,
});

const sanitizeBlockedContact = (value, index) => {
    const fallbackName = `Blocked ${index + 1}`;
    const name = sanitizeString(value?.name, fallbackName, 120) || fallbackName;

    return {
        blockedAt: sanitizeString(value?.blockedAt, 'Blocked recently', 60) || 'Blocked recently',
        id: sanitizeString(value?.id, `blocked-${index + 1}`, 80) || `blocked-${index + 1}`,
        name,
        toneClass: sanitizeString(
            value?.toneClass,
            'bg-primary-fixed text-on-primary-fixed-variant',
            80
        ) || 'bg-primary-fixed text-on-primary-fixed-variant',
    };
};

const sanitizePrivacySettings = (value = {}) => ({
    blockedContacts: Array.isArray(value.blockedContacts)
        ? value.blockedContacts
            .slice(0, MAX_BLOCKED_CONTACTS)
            .map(sanitizeBlockedContact)
        : [],
    groupInvitationVisibility: VALID_VISIBILITY_VALUES.includes(value.groupInvitationVisibility)
        ? value.groupInvitationVisibility
        : defaultPreferences.privacy.groupInvitationVisibility,
    profilePhotoVisibility: VALID_VISIBILITY_VALUES.includes(value.profilePhotoVisibility)
        ? value.profilePhotoVisibility
        : defaultPreferences.privacy.profilePhotoVisibility,
});

const sanitizeSecuritySettings = (value = {}) => ({
    backupCodes: Array.isArray(value.backupCodes)
        ? value.backupCodes
            .filter((item) => typeof item === 'string' && item.trim())
            .slice(0, MAX_BACKUP_CODES)
            .map((item) => item.trim().slice(0, 40))
        : [],
    enabled: Boolean(value.enabled),
    method: VALID_TWO_FACTOR_METHODS.includes(value.method)
        ? value.method
        : defaultPreferences.security.method,
    updatedAt:
        typeof value.updatedAt === 'string' && value.updatedAt.trim()
            ? value.updatedAt
            : null,
});

const sanitizePreferences = (value = {}) => {
    const safeValue = isPlainObject(value) ? value : {};

    return {
        appearance: sanitizeAppearanceSettings(safeValue.appearance),
        notifications: sanitizeNotificationSettings(safeValue.notifications),
        privacy: sanitizePrivacySettings(safeValue.privacy),
        security: sanitizeSecuritySettings(safeValue.security),
        theme: sanitizeThemeSettings(safeValue.theme),
    };
};

const ensureUserExists = async (userId) => {
    const user = await userModel.findPublicById(userId);

    if (!user) {
        const error = new Error('User not found.');
        error.code = 'USER_NOT_FOUND';
        error.statusCode = 404;
        throw error;
    }

    return user;
};

const getCurrentSettings = async (userId) => {
    const user = await ensureUserExists(userId);
    return sanitizePreferences(user.preferences);
};

const updateSettingsSection = async (userId, section, value) => {
    if (!Object.prototype.hasOwnProperty.call(defaultPreferences, section)) {
        const error = new Error('Unsupported settings section.');
        error.code = 'INVALID_SETTINGS_SECTION';
        error.field = 'section';
        error.statusCode = 400;
        throw error;
    }

    const user = await ensureUserExists(userId);
    const currentPreferences = sanitizePreferences(user.preferences);
    const mergedSectionValue = isPlainObject(value)
        ? {
            ...currentPreferences[section],
            ...value,
        }
        : currentPreferences[section];
    const nextPreferences = {
        ...currentPreferences,
        [section]:
            section === 'theme'
                ? sanitizeThemeSettings(mergedSectionValue)
                : section === 'appearance'
                    ? sanitizeAppearanceSettings(mergedSectionValue)
                    : section === 'notifications'
                        ? sanitizeNotificationSettings(mergedSectionValue)
                        : section === 'privacy'
                            ? sanitizePrivacySettings(mergedSectionValue)
                            : sanitizeSecuritySettings(mergedSectionValue),
    };
    const updatedUser = await userModel.updatePreferences(userId, nextPreferences);

    if (!updatedUser) {
        const error = new Error('Unable to update user settings.');
        error.code = 'SETTINGS_UPDATE_FAILED';
        error.statusCode = 500;
        throw error;
    }

    return sanitizePreferences(updatedUser.preferences);
};

module.exports = {
    defaultPreferences,
    getCurrentSettings,
    sanitizePreferences,
    updateSettingsSection,
};
