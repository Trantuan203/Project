import { normalizeUser, readStoredToken } from './auth';
import { apiRequest } from './api';

const requireAuthToken = () => {
  const token = readStoredToken();

  if (!token) {
    const error = new Error('Ban can dang nhap lai truoc khi cap nhat tai khoan.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  return token;
};

export const updateAccountProfile = async (payload) => {
  const token = requireAuthToken();

  const response = await apiRequest('/api/account/profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return {
    ...response,
    user: normalizeUser(response.user),
  };
};

export const fetchAccountSessions = async () => {
  const token = requireAuthToken();

  return apiRequest('/api/account/sessions', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const revokeAccountSession = async (sessionId) => {
  const token = requireAuthToken();

  return apiRequest(`/api/account/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
