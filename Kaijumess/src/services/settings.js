import { readStoredToken } from './auth';
import { apiRequest } from './api';

const requireAuthToken = () => {
  const token = readStoredToken();

  if (!token) {
    const error = new Error('Ban can dang nhap lai truoc khi dong bo settings.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  return token;
};

export const updateSettingsSection = async (section, value) => {
  const token = requireAuthToken();

  return apiRequest(`/api/settings/${section}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value }),
  });
};

export const fetchSettings = async () => {
  const token = requireAuthToken();

  return apiRequest('/api/settings', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
