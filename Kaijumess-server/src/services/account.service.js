const callModel = require('../models/call.model');
const notificationModel = require('../models/notification.model');
const roomService = require('./room.service');
const userModel = require('../models/user.model');
const userSessionModel = require('../models/user-session.model');

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;
const MAX_AVATAR_LENGTH = 800000;
const MAX_BIO_LENGTH = 500;
const MAX_TIMEZONE_LENGTH = 80;

const stripAccents = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const sanitizeString = (value, fallbackValue = '', maxLength = 255) => (
    typeof value === 'string'
        ? value.trim().slice(0, maxLength)
        : fallbackValue
);

const slugifyUsername = (value) => stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '.')
    .replace(/[._]{2,}/g, '.')
    .replace(/^[._]+|[._]+$/g, '');

const isPlainObject = (value) => (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
);

const isAllowedAvatar = (value) => (
    value === '' ||
    /^https?:\/\//i.test(value) ||
    value.startsWith('data:image/')
);

const parseSessionLabel = (userAgent = '') => {
    const normalizedValue = userAgent.toLowerCase();

    if (!normalizedValue) {
        return 'Unknown device';
    }

    if (normalizedValue.includes('edg/')) {
        return 'Microsoft Edge';
    }

    if (normalizedValue.includes('chrome/')) {
        return 'Google Chrome';
    }

    if (normalizedValue.includes('firefox/')) {
        return 'Mozilla Firefox';
    }

    if (normalizedValue.includes('safari/') && !normalizedValue.includes('chrome/')) {
        return 'Safari';
    }

    return 'Browser session';
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

const ensureSessionStorageReady = (error) => {
    if (error?.code !== '42P01') {
        throw error;
    }

    const resolvedError = new Error('Database session storage is not ready. Apply 003_account_sessions.sql first.');
    resolvedError.code = 'SESSION_STORAGE_NOT_READY';
    resolvedError.statusCode = 503;
    throw resolvedError;
};

const toLower = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

const formatRelativeTime = (value) => {
    if (!value) {
        return '';
    }

    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.floor(diffMs / 60000));

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
};

const formatDateGroup = (value) => {
    const targetDate = new Date(value);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    if (targetDate >= todayStart) {
        return 'Today';
    }

    if (targetDate >= yesterdayStart) {
        return 'Yesterday';
    }

    return 'Earlier';
};

const buildMentionTerms = (user) => {
    const candidates = [
        user.username,
        user.display_name,
        user.full_name,
    ]
        .map((value) => sanitizeString(value, '', 120))
        .filter(Boolean)
        .map((value) => value.toLowerCase());

    return [...new Set(candidates.flatMap((value) => [value, `@${value}`]))];
};

const createNotificationMissingStorageError = () => {
    const error = new Error('Notification storage is not ready.');
    error.code = 'NOTIFICATION_STORAGE_NOT_READY';
    error.statusCode = 503;
    return error;
};

const withNotificationStorage = async (operation) => {
    try {
        return await operation();
    } catch (error) {
        if (error?.code !== '42P01') {
            throw error;
        }

        try {
            await notificationModel.ensureNotificationStateSchema();
        } catch {
            throw createNotificationMissingStorageError();
        }

        return operation();
    }
};

const listNotificationCenter = async (userId) => {
    const currentUser = await ensureUserExists(userId);
    const mentionTerms = buildMentionTerms(currentUser);

    const [friendInvitations, recentMessages, recentCalls, acceptedFriendships, outgoingFriendRequests] = await Promise.all([
        roomService.listPendingFriendInvitations(userId),
        notificationModel.listRecentTextMessagesForUser({ userId, limit: 80 }),
        callModel.listCallsForUser({ limit: 40, offset: 0, query: '', userId }),
        roomService.listAcceptedFriendshipEvents(userId),
        roomService.listPendingFriendRequestsByDirection(userId, 'outgoing', ''),
    ]);

    const mentionNotifications = recentMessages
        .filter((message) => {
            const content = toLower(message.content);
            return mentionTerms.some((term) => term && content.includes(term));
        })
        .slice(0, 20)
        .map((message) => ({
            actor:
                message.sender_display_name ||
                message.sender_full_name ||
                message.sender_username ||
                message.sender_email ||
                'Unknown user',
            avatar: message.sender_avatar_url || '',
            category: 'mention',
            conversationId: message.conversation_id,
            createdAt: message.created_at,
            dateGroup: formatDateGroup(message.created_at),
            description: message.content || 'Mentioned you in a conversation.',
            id: `message:${message.id}`,
            messageId: message.id,
            timeLabel: formatRelativeTime(message.created_at),
        }));

    const callNotifications = recentCalls
        .filter((call) => ['busy', 'missed', 'rejected'].includes(call.status))
        .slice(0, 20)
        .map((call) => ({
            actor: call.peer_display_name || call.peer_full_name || call.peer_username || call.peer_email || 'Unknown user',
            avatar: call.peer_avatar_url || '',
            category: 'call',
            conversationId: call.conversation_id,
            createdAt: call.created_at,
            dateGroup: formatDateGroup(call.created_at),
            description: `Missed call from ${call.peer_display_name || call.peer_full_name || call.peer_username || call.peer_email || 'Unknown user'}.`,
            id: `call:${call.id}`,
            timeLabel: formatRelativeTime(call.created_at),
        }));

    const acceptedFriendNotifications = acceptedFriendships.map((item) => ({
        actor: item.name,
        avatar: item.avatarUrl,
        category: 'system',
        createdAt: item.acceptedAt,
        dateGroup: formatDateGroup(item.acceptedAt),
        description: `${item.name} accepted your friend request.`,
        id: `friendship:accepted:${item.friendshipId}`,
        timeLabel: formatRelativeTime(item.acceptedAt),
    }));

    const outgoingFriendNotifications = outgoingFriendRequests.map((item) => ({
        actor: item.displayName,
        avatar: item.avatarUrl,
        category: 'system',
        createdAt: item.lastInteractedAt || new Date().toISOString(),
        dateGroup: formatDateGroup(item.lastInteractedAt || new Date()),
        description: `You sent a friend request to ${item.displayName}.`,
        id: `friendship:sent:${item.friendship?.id || item.id}`,
        timeLabel: formatRelativeTime(item.lastInteractedAt || new Date()),
    }));

    const notifications = [...mentionNotifications, ...callNotifications, ...acceptedFriendNotifications, ...outgoingFriendNotifications]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 40);

    const readStates = await withNotificationStorage(() =>
        notificationModel.listNotificationStates({
            notificationKeys: notifications.map((item) => item.id),
            userId,
        })
    );
    const readKeySet = new Set(readStates.map((item) => item.notification_key));

    return {
        friendInvitations,
        groupInvitations: [],
        notifications: notifications.map((notification) => ({
            ...notification,
            read: readKeySet.has(notification.id),
        })),
        trendingGroups: [],
    };
};

const markNotificationRead = async (userId, notificationKey) => {
    await ensureUserExists(userId);

    if (!notificationKey) {
        const error = new Error('notificationKey is required.');
        error.code = 'MISSING_NOTIFICATION_KEY';
        error.field = 'notificationKey';
        error.statusCode = 400;
        throw error;
    }

    return withNotificationStorage(() => notificationModel.markNotificationRead({ notificationKey, userId }));
};

const markAllNotificationsRead = async (userId) => {
    const center = await listNotificationCenter(userId);
    return withNotificationStorage(() =>
        notificationModel.markNotificationsRead({
            notificationKeys: center.notifications.map((item) => item.id),
            userId,
        })
    );
};

const respondToFriendInvitation = async (userId, friendshipId, action) =>
    roomService.respondToFriendInvitation(userId, friendshipId, action);

const updateProfile = async (userId, payload) => {
    const currentUser = await ensureUserExists(userId);

    const fullName = sanitizeString(
        payload?.fullName,
        currentUser.full_name || currentUser.display_name || currentUser.username,
        120
    );
    const displayName = sanitizeString(
        payload?.displayName,
        currentUser.display_name || fullName,
        120
    ) || fullName;
    const bio = sanitizeString(payload?.bio, currentUser.bio || '', MAX_BIO_LENGTH);
    const timezone = sanitizeString(
        payload?.timezone,
        currentUser.preferences?.account?.timezone || '',
        MAX_TIMEZONE_LENGTH
    );
    const avatarUrl = sanitizeString(
        payload?.avatarUrl,
        currentUser.avatar_url || '',
        MAX_AVATAR_LENGTH
    );
    const requestedUsername = sanitizeString(
        payload?.username,
        currentUser.username || '',
        USERNAME_MAX_LENGTH + 20
    );
    const username = slugifyUsername(requestedUsername || currentUser.username || '');

    if (fullName.length < 2) {
        const error = new Error('fullName must be at least 2 characters.');
        error.code = 'INVALID_FULL_NAME';
        error.field = 'fullName';
        error.statusCode = 400;
        throw error;
    }

    if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
        const error = new Error('username must be between 3 and 50 valid characters.');
        error.code = 'INVALID_USERNAME';
        error.field = 'username';
        error.statusCode = 400;
        throw error;
    }

    if (!isAllowedAvatar(avatarUrl)) {
        const error = new Error('avatarUrl must be an http(s) URL or image data URL.');
        error.code = 'INVALID_AVATAR_URL';
        error.field = 'avatarUrl';
        error.statusCode = 400;
        throw error;
    }

    const existingUser = await userModel.findByUsername(username);

    if (existingUser && existingUser.id !== userId) {
        const error = new Error('username already exists.');
        error.code = 'USERNAME_ALREADY_EXISTS';
        error.field = 'username';
        error.statusCode = 409;
        throw error;
    }

    const nextPreferences = isPlainObject(currentUser.preferences)
        ? { ...currentUser.preferences }
        : {};

    nextPreferences.account = {
        ...(isPlainObject(nextPreferences.account) ? nextPreferences.account : {}),
        timezone,
    };

    const updatedUser = await userModel.updateAccountProfile({
        avatarUrl,
        bio,
        displayName,
        fullName,
        id: userId,
        preferences: nextPreferences,
        username,
    });

    if (!updatedUser) {
        const error = new Error('Unable to update account profile.');
        error.code = 'ACCOUNT_UPDATE_FAILED';
        error.statusCode = 500;
        throw error;
    }

    return updatedUser;
};

const listSessions = async (userId, currentSessionId) => {
    await ensureUserExists(userId);
    let sessions;

    try {
        sessions = await userSessionModel.listActiveSessionsByUserId(userId);
    } catch (error) {
        ensureSessionStorageReady(error);
    }

    return sessions.map((session) => ({
        createdAt: session.created_at,
        id: session.id,
        ipAddress: session.ip_address || '',
        isCurrent: Boolean(currentSessionId && session.id === currentSessionId),
        label: parseSessionLabel(session.user_agent),
        lastSeenAt: session.last_seen_at,
        metadata: session.metadata || {},
        userAgent: session.user_agent || '',
    }));
};

const revokeSession = async (userId, sessionId, currentSessionId) => {
    let revokedSession;

    try {
        revokedSession = await userSessionModel.revokeSession({
            reason: 'manual',
            sessionId,
            userId,
        });
    } catch (error) {
        ensureSessionStorageReady(error);
    }

    if (!revokedSession) {
        const error = new Error('Session not found.');
        error.code = 'SESSION_NOT_FOUND';
        error.field = 'sessionId';
        error.statusCode = 404;
        throw error;
    }

    return {
        revokedCurrentSession: Boolean(currentSessionId && currentSessionId === sessionId),
        sessionId,
    };
};

module.exports = {
    listNotificationCenter,
    listSessions,
    markAllNotificationsRead,
    markNotificationRead,
    respondToFriendInvitation,
    revokeSession,
    updateProfile,
};
