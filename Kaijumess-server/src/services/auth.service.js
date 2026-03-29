const argon2 = require('argon2');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const userSessionModel = require('../models/user-session.model');

const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
};

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const hasUppercase = (value) => /[A-Z]/.test(value);
const hasLowercase = (value) => /[a-z]/.test(value);
const hasNumber = (value) => /\d/.test(value);

const stripAccents = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeRegisterInput = ({ username, email, fullName, identity, password }) => ({
    username: typeof username === 'string' ? username.trim() : '',
    email: typeof email === 'string'
        ? email.trim().toLowerCase()
        : typeof identity === 'string'
            ? identity.trim().toLowerCase()
            : '',
    fullName: typeof fullName === 'string'
        ? fullName.trim()
        : typeof username === 'string'
            ? username.trim()
            : '',
    password: typeof password === 'string' ? password : '',
});

const normalizeLoginInput = ({ identifier, email, username, password }) => ({
    identifier: typeof identifier === 'string'
        ? identifier.trim()
        : typeof email === 'string'
            ? email.trim()
            : typeof username === 'string'
                ? username.trim()
                : '',
    password: typeof password === 'string' ? password : '',
});

const ensureJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        const error = new Error('Missing JWT_SECRET in environment.');
        error.code = 'MISSING_JWT_SECRET';
        error.statusCode = 500;
        throw error;
    }
};

const slugifyUsername = (value) => stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '.')
    .replace(/[._]{2,}/g, '.')
    .replace(/^[._]+|[._]+$/g, '');

const normalizeUsernameLength = (value) => {
    const trimmedValue = value.slice(0, USERNAME_MAX_LENGTH).replace(/[._]+$/g, '');

    if (trimmedValue.length >= USERNAME_MIN_LENGTH) {
        return trimmedValue;
    }

    return `${trimmedValue}${'0'.repeat(USERNAME_MIN_LENGTH - trimmedValue.length)}`;
};

const buildBaseUsername = ({ username, fullName, email }) => {
    const candidates = [
        username,
        fullName,
        email ? email.split('@')[0] : '',
        'kaiju-user',
    ];

    for (const candidate of candidates) {
        const slugifiedCandidate = slugifyUsername(candidate || '');

        if (!slugifiedCandidate) {
            continue;
        }

        const normalizedCandidate = normalizeUsernameLength(slugifiedCandidate);

        if (normalizedCandidate) {
            return normalizedCandidate;
        }
    }

    return 'kaiju-user';
};

const ensureUniqueUsername = async (baseUsername) => {
    const normalizedBase = normalizeUsernameLength(baseUsername);

    for (let suffix = 0; suffix < 1000; suffix += 1) {
        const candidate = suffix === 0
            ? normalizedBase
            : normalizeUsernameLength(
                `${normalizedBase.slice(0, USERNAME_MAX_LENGTH - `${suffix}`.length - 1)}.${suffix}`
            );

        const existingUser = await userModel.findByUsername(candidate);

        if (!existingUser) {
            return candidate;
        }
    }

    const error = new Error('Unable to generate a unique username.');
    error.code = 'USERNAME_GENERATION_FAILED';
    error.statusCode = 500;
    throw error;
};

const signToken = (user, sessionId) => {
    ensureJwtSecret();

    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
            email: user.email,
            sid: sessionId,
        },
        process.env.JWT_SECRET,
        {
            algorithm: 'HS256',
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        }
    );
};

const validateRegisterInput = ({ email, fullName, password }) => {
    if (!fullName || !email || !password) {
        const error = new Error('fullName, email and password are required.');
        error.code = 'MISSING_REQUIRED_FIELDS';
        error.field = !fullName ? 'fullName' : !email ? 'identity' : 'password';
        error.statusCode = 400;
        throw error;
    }

    if (fullName.length < 2 || fullName.length > 60) {
        const error = new Error('fullName must be between 2 and 60 characters.');
        error.code = 'INVALID_FULL_NAME';
        error.field = 'fullName';
        error.statusCode = 400;
        throw error;
    }

    if (!isValidEmail(email)) {
        const error = new Error('email is not valid.');
        error.code = 'INVALID_EMAIL';
        error.field = 'identity';
        error.statusCode = 400;
        throw error;
    }

    if (password.length < 8) {
        const error = new Error('password must be at least 8 characters.');
        error.code = 'WEAK_PASSWORD';
        error.field = 'password';
        error.statusCode = 400;
        throw error;
    }

    if (!hasUppercase(password) || !hasLowercase(password) || !hasNumber(password)) {
        const error = new Error('password must include uppercase, lowercase and number.');
        error.code = 'WEAK_PASSWORD';
        error.field = 'password';
        error.statusCode = 400;
        throw error;
    }
};

const validateNewPasswordInput = (newPassword) => {
    if (!newPassword) {
        const error = new Error('newPassword is required.');
        error.code = 'MISSING_NEW_PASSWORD';
        error.field = 'newPassword';
        error.statusCode = 400;
        throw error;
    }

    if (newPassword.length < 8) {
        const error = new Error('password must be at least 8 characters.');
        error.code = 'WEAK_PASSWORD';
        error.field = 'newPassword';
        error.statusCode = 400;
        throw error;
    }

    if (!hasUppercase(newPassword) || !hasLowercase(newPassword) || !hasNumber(newPassword)) {
        const error = new Error('password must include uppercase, lowercase and number.');
        error.code = 'WEAK_PASSWORD';
        error.field = 'newPassword';
        error.statusCode = 400;
        throw error;
    }
};

const createMissingSessionsTableError = () => {
    const error = new Error('Database session storage is not ready. Apply 003_account_sessions.sql first.');
    error.code = 'SESSION_STORAGE_NOT_READY';
    error.statusCode = 503;
    return error;
};

const createTrackedSession = async ({ ipAddress, userAgent, userId }) => {
    try {
        return await userSessionModel.createSession({
            id: randomUUID(),
            ipAddress: ipAddress || '',
            metadata: {},
            userAgent: userAgent || '',
            userId,
        });
    } catch (error) {
        if (error?.code === '42P01') {
            throw createMissingSessionsTableError();
        }

        throw error;
    }
};

const register = async (payload, sessionContext = {}) => {
    const input = normalizeRegisterInput(payload);
    validateRegisterInput(input);
    ensureJwtSecret();

    const existingEmail = await userModel.findByEmail(input.email);

    if (existingEmail) {
        const error = new Error('email already exists.');
        error.code = 'EMAIL_ALREADY_EXISTS';
        error.field = 'identity';
        error.statusCode = 409;
        throw error;
    }

    const username = await ensureUniqueUsername(
        buildBaseUsername({
            username: input.username,
            fullName: input.fullName,
            email: input.email,
        })
    );

    const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
    const user = await userModel.createUser({
        username,
        email: input.email,
        fullName: input.fullName,
        displayName: input.fullName,
        passwordHash,
    });
    const session = await createTrackedSession({
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        userId: user.id,
    });

    return {
        user,
        token: signToken(user, session.id),
    };
};

const login = async (payload, sessionContext = {}) => {
    const input = normalizeLoginInput(payload);

    if (!input.identifier || !input.password) {
        const error = new Error('identifier and password are required.');
        error.code = 'MISSING_LOGIN_FIELDS';
        error.field = !input.identifier ? 'identity' : 'password';
        error.statusCode = 400;
        throw error;
    }

    ensureJwtSecret();

    const user = await userModel.findByIdentifier(input.identifier);

    if (!user) {
        const error = new Error('Invalid credentials.');
        error.code = 'INVALID_CREDENTIALS';
        error.field = 'identity';
        error.statusCode = 401;
        throw error;
    }

    const isPasswordValid = await argon2.verify(user.password_hash, input.password);

    if (!isPasswordValid) {
        const error = new Error('Invalid credentials.');
        error.code = 'INVALID_CREDENTIALS';
        error.field = 'password';
        error.statusCode = 401;
        throw error;
    }

    const { password_hash, ...publicUser } = user;
    const session = await createTrackedSession({
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        userId: publicUser.id,
    });

    return {
        user: publicUser,
        token: signToken(publicUser, session.id),
    };
};

const getCurrentUser = async (userId) => {
    const user = await userModel.findPublicById(userId);

    if (!user) {
        const error = new Error('User not found.');
        error.code = 'USER_NOT_FOUND';
        error.statusCode = 404;
        throw error;
    }

    return user;
};

const changePassword = async (userId, payload) => {
    const currentPassword = typeof payload?.currentPassword === 'string' ? payload.currentPassword : '';
    const newPassword = typeof payload?.newPassword === 'string' ? payload.newPassword : '';

    if (!currentPassword) {
        const error = new Error('currentPassword is required.');
        error.code = 'MISSING_CURRENT_PASSWORD';
        error.field = 'currentPassword';
        error.statusCode = 400;
        throw error;
    }

    validateNewPasswordInput(newPassword);

    if (currentPassword === newPassword) {
        const error = new Error('new password must be different from the current password.');
        error.code = 'PASSWORD_UNCHANGED';
        error.field = 'newPassword';
        error.statusCode = 400;
        throw error;
    }

    const user = await userModel.findByIdWithPassword(userId);

    if (!user) {
        const error = new Error('User not found.');
        error.code = 'USER_NOT_FOUND';
        error.statusCode = 404;
        throw error;
    }

    const isPasswordValid = await argon2.verify(user.password_hash, currentPassword);

    if (!isPasswordValid) {
        const error = new Error('Current password is incorrect.');
        error.code = 'INVALID_CURRENT_PASSWORD';
        error.field = 'currentPassword';
        error.statusCode = 401;
        throw error;
    }

    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
    await userModel.updatePasswordHash(userId, passwordHash);

    return {
        success: true,
    };
};

module.exports = {
    changePassword,
    getCurrentUser,
    login,
    register,
};
