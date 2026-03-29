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
    listSessions,
    revokeSession,
    updateProfile,
};
