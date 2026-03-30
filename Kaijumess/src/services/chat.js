import { readStoredToken } from './auth';
import { apiRequest } from './api';

const requireAuthToken = () => {
  const token = readStoredToken();

  if (!token) {
    const error = new Error('Ban can dang nhap lai de su dung chat.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  return token;
};

const buildAuthOptions = (options = {}) => {
  const token = requireAuthToken();

  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
};

export const fetchRooms = async (search = '') =>
  apiRequest(`/api/rooms${search ? `?search=${encodeURIComponent(search)}` : ''}`, buildAuthOptions());

export const fetchFriends = async ({ limit = 20, offset = 0, query = '' } = {}) => {
  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }

  params.set('limit', String(limit));
  params.set('offset', String(offset));

  return apiRequest(`/api/rooms/friends?${params.toString()}`, buildAuthOptions());
};

export const fetchPendingFriendRequests = async ({ direction = 'incoming', query = '' } = {}) => {
  const params = new URLSearchParams();

  params.set('direction', direction);

  if (query) {
    params.set('q', query);
  }

  return apiRequest(`/api/rooms/friend-requests?${params.toString()}`, buildAuthOptions());
};

export const fetchCalls = async ({ date = '', limit = 15, offset = 0, query = '' } = {}) => {
  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }

  if (date) {
    params.set('date', date);
  }

  params.set('limit', String(limit));
  params.set('offset', String(offset));

  return apiRequest(`/api/rooms/calls?${params.toString()}`, buildAuthOptions());
};

export const searchUsers = async ({
  excludeAcceptedFriends = false,
  limit = 20,
  offset = 0,
  query,
} = {}) => {
  const params = new URLSearchParams();

  params.set('q', query || '');
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  if (excludeAcceptedFriends) {
    params.set('excludeAcceptedFriends', 'true');
  }

  return apiRequest(`/api/rooms/search-users?${params.toString()}`, buildAuthOptions());
};

export const createDirectRoom = async (targetUserId) =>
  apiRequest(
    '/api/rooms/direct',
    buildAuthOptions({
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),
  );

export const createFriendRequest = async (targetUserId) =>
  apiRequest(
    '/api/rooms/friend-requests',
    buildAuthOptions({
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),
  );

export const updateParticipantNickname = async ({ conversationId, nickname, targetUserId }) =>
  apiRequest(
    `/api/rooms/${conversationId}/participants/${targetUserId}/nickname`,
    buildAuthOptions({
      method: 'PATCH',
      body: JSON.stringify({ nickname }),
    }),
  );

export const updateConversationWallpaper = async ({ conversationId, wallpaperId }) =>
  apiRequest(
    `/api/rooms/${conversationId}/wallpaper`,
    buildAuthOptions({
      method: 'PATCH',
      body: JSON.stringify({ wallpaperId }),
    }),
  );

export const fetchMessages = async ({
  beforeMessageId = '',
  conversationId,
  limit = 30,
} = {}) => {
  const params = new URLSearchParams();

  params.set('limit', String(limit));

  if (beforeMessageId) {
    params.set('beforeMessageId', beforeMessageId);
  }

  return apiRequest(`/api/messages/${conversationId}?${params.toString()}`, buildAuthOptions());
};

export const sendMessage = async ({
  clientMessageId,
  content,
  conversationId,
  metadata,
  type = 'text',
}) =>
  apiRequest(
    `/api/messages/${conversationId}`,
    buildAuthOptions({
      method: 'POST',
      body: JSON.stringify({
        clientMessageId,
        content,
        metadata,
        type,
      }),
    }),
  );
