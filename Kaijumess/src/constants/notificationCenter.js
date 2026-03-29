export const NOTIFICATION_CENTER_STORAGE_KEY = 'kaijumess-notification-center';
export const NOTIFICATION_PREFS_STORAGE_KEY = 'kaijumess-notification-preferences';
export const notificationSoundPresets = ['Default Chime', 'Soft Pulse', 'Quiet Glass'];
export const notificationAlertStyles = ['None', 'Banners', 'Lock Screen'];

export const defaultNotificationPreferences = {
  alertStyle: notificationAlertStyles[1],
  bannersEnabled: false,
  groupAlertsEnabled: true,
  inAppSoundsEnabled: true,
  inAppVibrateEnabled: true,
  muteMentionsEnabled: false,
  pushEnabled: true,
  quietEnd: '08:00',
  quietModeEnabled: true,
  quietStart: '22:00',
  showPreviews: true,
  soundPreset: notificationSoundPresets[0],
};
