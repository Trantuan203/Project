const crypto = require('crypto');
const axios = require('axios');

const REQUIRED_ENV_KEYS = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const buildCloudinarySignature = (params, apiSecret) => {
    const serializedParams = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    return crypto
        .createHash('sha1')
        .update(`${serializedParams}${apiSecret}`)
        .digest('hex');
};

const getCloudinaryConfig = () => {
    const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

    if (missingKeys.length > 0) {
        const error = new Error(`Missing Cloudinary configuration: ${missingKeys.join(', ')}.`);
        error.code = 'CLOUDINARY_NOT_CONFIGURED';
        error.statusCode = 503;
        throw error;
    }

    return {
        apiKey: process.env.CLOUDINARY_API_KEY.trim(),
        apiSecret: process.env.CLOUDINARY_API_SECRET.trim(),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    };
};

const inferResourceType = (mimeType = '') => {
    if (mimeType.startsWith('image/')) {
        return 'image';
    }

    if (mimeType.startsWith('video/')) {
        return 'video';
    }

    return 'raw';
};

const assertSupportedMedia = ({ fileDataUrl, fileName, fileSize, mimeType, type }) => {
    if (!fileDataUrl || typeof fileDataUrl !== 'string' || !fileDataUrl.startsWith('data:')) {
        const error = new Error('Invalid media payload.');
        error.code = 'INVALID_MEDIA_PAYLOAD';
        error.statusCode = 400;
        throw error;
    }

    if (!mimeType || (type === 'image' && !mimeType.startsWith('image/')) || (type === 'video' && !mimeType.startsWith('video/'))) {
        const error = new Error('Unsupported media type.');
        error.code = 'UNSUPPORTED_MEDIA_TYPE';
        error.statusCode = 400;
        throw error;
    }

    const maxBytes = type === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxBytes) {
        const error = new Error(
            type === 'video'
                ? 'Video must be smaller than 20 MB.'
                : 'Image must be smaller than 10 MB.'
        );
        error.code = 'MEDIA_TOO_LARGE';
        error.statusCode = 413;
        throw error;
    }

    if (!fileName || typeof fileName !== 'string') {
        const error = new Error('Missing media filename.');
        error.code = 'MISSING_MEDIA_FILENAME';
        error.statusCode = 400;
        throw error;
    }
};

const uploadChatMedia = async ({
    conversationId,
    fileDataUrl,
    fileName,
    fileSize,
    mimeType,
    type,
    userId,
}) => {
    assertSupportedMedia({
        fileDataUrl,
        fileName,
        fileSize,
        mimeType,
        type,
    });

    const { apiKey, apiSecret, cloudName } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = inferResourceType(mimeType);
    const folder = `kaijumess/chat/${conversationId}`;
    const publicIdBase = `${type}-${userId}-${Date.now()}`;
    const publicId = publicIdBase
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-');
    const signature = buildCloudinarySignature({
        folder,
        public_id: publicId,
        timestamp,
    }, apiSecret);

    const body = new URLSearchParams();
    body.set('api_key', apiKey);
    body.set('file', fileDataUrl);
    body.set('folder', folder);
    body.set('public_id', publicId);
    body.set('signature', signature);
    body.set('timestamp', String(timestamp));
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const { data } = await axios.post(uploadUrl, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000,
    });

    return {
        durationSeconds: Number.isFinite(data.duration) ? Math.round(data.duration) : null,
        fileExtension: data.format || '',
        fileName,
        fileSize: Number.isFinite(data.bytes) ? data.bytes : fileSize,
        height: Number.isFinite(data.height) ? data.height : null,
        mimeType,
        previewUrl: data.secure_url || data.url || '',
        publicId: data.public_id || publicId,
        resourceType,
        secureUrl: data.secure_url || data.url || '',
        storageKey: data.public_id || publicId,
        storageProvider: 'cloudinary',
        thumbnailUrl: data.secure_url || data.url || '',
        width: Number.isFinite(data.width) ? data.width : null,
    };
};

module.exports = {
    uploadChatMedia,
};
