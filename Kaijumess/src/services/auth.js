import { apiRequest } from './api';

export const AUTH_SESSION_STORAGE_KEY = 'kaijumess-auth-session';
export const AUTH_TOKEN_STORAGE_KEY = 'kaijumess-auth-token';

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

const normalizeUser = (user) => {
  const fullName = user.display_name || user.full_name || user.username || user.email || 'Kaiju User';

  return {
    id: user.id,
    fullName,
    displayName: user.display_name || user.full_name || fullName,
    username: user.username || '',
    email: user.email || '',
    identity: user.email || user.username || '',
    avatarUrl: user.avatar_url || '',
    status: user.status || 'offline',
    lastSeen: user.last_seen || null,
    createdAt: user.created_at || null,
  };
};

const persistAuthSession = ({ token, user }) => {
  if (typeof window !== 'undefined' && token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }

  const normalizedUser = normalizeUser(user);
  writeJson(AUTH_SESSION_STORAGE_KEY, normalizedUser);

  return normalizedUser;
};

export const readStoredSession = () => readJson(AUTH_SESSION_STORAGE_KEY, null);

export const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

export const loginUser = async ({ identity, password }) => {
  const payload = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: identity.trim(),
      password,
    }),
  });

  const user = persistAuthSession(payload);

  return {
    token: payload.token,
    user,
  };
};

export const registerUser = async ({ fullName, identity, password }) => {
  const payload = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: fullName.trim(),
      identity: identity.trim(),
      password,
    }),
  });

  const user = persistAuthSession(payload);

  return {
    token: payload.token,
    user,
  };
};

export const fetchCurrentUser = async () => {
  const token = readStoredToken();

  if (!token) {
    return null;
  }

  const payload = await apiRequest('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const user = normalizeUser(payload.user);
  writeJson(AUTH_SESSION_STORAGE_KEY, user);

  return user;
};
