import { readStoredToken } from './auth';
import { apiRequest } from './api';

export const TWO_FACTOR_SETTINGS_STORAGE_KEY = 'kaijumess-two-factor-settings';

const defaultTwoFactorSettings = {
  backupCodes: [],
  enabled: false,
  method: 'authenticator',
  updatedAt: null,
};

const readJson = (storageKey, fallbackValue) => {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

const writeJson = (storageKey, value) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

const createBackupCodes = () =>
  Array.from({ length: 6 }, (_, index) => {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${String(index + 1).padStart(2, '0')}-${randomPart}`;
  });

export const readStoredTwoFactorSettings = () => {
  const storedValue = readJson(TWO_FACTOR_SETTINGS_STORAGE_KEY, defaultTwoFactorSettings);

  return {
    ...defaultTwoFactorSettings,
    ...storedValue,
    backupCodes: Array.isArray(storedValue.backupCodes) ? storedValue.backupCodes : [],
  };
};

export const updateStoredTwoFactorSettings = (nextValue) => {
  const currentValue = readStoredTwoFactorSettings();
  const resolvedValue =
    typeof nextValue === 'function'
      ? nextValue(currentValue)
      : {
          ...currentValue,
          ...nextValue,
        };

  const finalValue = {
    ...defaultTwoFactorSettings,
    ...resolvedValue,
    backupCodes: Array.isArray(resolvedValue.backupCodes) ? resolvedValue.backupCodes : [],
    updatedAt: new Date().toISOString(),
  };

  writeJson(TWO_FACTOR_SETTINGS_STORAGE_KEY, finalValue);
  return finalValue;
};

export const generateNewBackupCodes = () => createBackupCodes();

export const changePassword = async ({ currentPassword, nextPassword }) => {
  const token = readStoredToken();

  if (!token) {
    const error = new Error('Ban can dang nhap lai truoc khi doi mat khau.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  return apiRequest('/api/auth/change-password', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword: nextPassword,
    }),
  });
};
