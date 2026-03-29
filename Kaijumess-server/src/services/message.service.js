const messageModel = require('../models/message.model');
const { uploadChatMedia } = require('./cloudinary.service');

const SUPPORTED_MESSAGE_TYPES = new Set(['text', 'image', 'video', 'file', 'audio', 'system']);

const toPlainObject = (value) => {
    if (!value) {
        return {};
    }

    if (typeof value === 'string') {
        try {
            const parsedValue = JSON.parse(value);
            return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
                ? parsedValue
                : {};
        } catch {
            return {};
        }
    }

    return typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const buildMessageMedia = (message, metadata) => ({
    durationSeconds:
        metadata.durationSeconds ??
        message.attachment_duration_seconds ??
        null,
    fileName:
        metadata.fileName ||
        message.attachment_original_name ||
        '',
    fileSize:
        metadata.fileSize ??
        message.attachment_size_bytes ??
        null,
    height:
        metadata.height ??
        message.attachment_height ??
        null,
    mediaUrl:
        metadata.mediaUrl ||
        metadata.previewUrl ||
        message.attachment_preview_url ||
        message.attachment_url ||
        '',
    mimeType:
        metadata.mimeType ||
        message.attachment_mime_type ||
        '',
    previewUrl:
        metadata.previewUrl ||
        message.attachment_preview_url ||
        message.attachment_url ||
        '',
    publicId:
        metadata.publicId ||
        message.attachment_public_id ||
        '',
    storageKey:
        metadata.storageKey ||
        message.attachment_storage_key ||
        '',
    storageProvider:
        metadata.storageProvider ||
        message.attachment_storage_provider ||
        '',
    thumbnailUrl:
        metadata.thumbnailUrl ||
        message.attachment_thumbnail_url ||
        message.attachment_preview_url ||
        message.attachment_url ||
        '',
    width:
        metadata.width ??
        message.attachment_width ??
        null,
});

const buildPersistedMediaMetadata = (metadata, uploadResult) => {
    const nextMetadata = { ...metadata };

    delete nextMetadata.fileDataUrl;

    return {
        ...nextMetadata,
        durationSeconds: uploadResult.durationSeconds,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        height: uploadResult.height,
        mediaUrl: uploadResult.secureUrl,
        mimeType: uploadResult.mimeType,
        previewUrl: uploadResult.previewUrl,
        publicId: uploadResult.publicId,
        resourceType: uploadResult.resourceType,
        storageKey: uploadResult.storageKey,
        storageProvider: uploadResult.storageProvider,
        thumbnailUrl: uploadResult.thumbnailUrl,
        width: uploadResult.width,
    };
};

const mapMessage = (message) => {
    const metadata = toPlainObject(message.metadata);
    const media = buildMessageMedia(message, metadata);

    return {
        clientMessageId: message.client_message_id || '',
        content: message.content || '',
        conversationId: message.conversation_id,
        createdAt: message.created_at,
        durationSeconds: media.durationSeconds,
        fileName: media.fileName,
        fileSize: media.fileSize,
        hasAttachments: Boolean(message.has_attachments || media.mediaUrl),
        height: media.height,
        id: message.id,
        mediaUrl: media.mediaUrl,
        metadata: {
            ...metadata,
            ...media,
        },
        mimeType: media.mimeType,
        previewUrl: media.previewUrl,
        sender: message.sender_id
            ? {
                avatarUrl: message.sender_avatar_url || '',
                displayName:
                    message.sender_display_name ||
                    message.sender_full_name ||
                    message.sender_username ||
                    message.sender_email ||
                    'Unknown user',
                email: message.sender_email || '',
                id: message.sender_id,
                username: message.sender_username || '',
            }
            : null,
        senderId: message.sender_id,
        status: message.status || 'sent',
        thumbnailUrl: media.thumbnailUrl,
        type: message.type || 'text',
        updatedAt: message.updated_at,
        width: media.width,
    };
};

const listMessages = async ({ beforeMessageId, conversationId, limit, userId }) => {
    const result = await messageModel.listMessagesByConversation({
        beforeMessageId,
        conversationId,
        limit,
        userId,
    });

    if (!result) {
        const error = new Error('Conversation not found.');
        error.code = 'CONVERSATION_NOT_FOUND';
        error.statusCode = 404;
        throw error;
    }

    const messages = result.messages.map(mapMessage);

    if (!beforeMessageId && messages.length > 0) {
        await messageModel.markConversationRead({
            conversationId,
            lastMessageId: messages[messages.length - 1].id,
            userId,
        });
    }

    return {
        messages,
        pageInfo: {
            hasMore: result.hasMore,
            limit,
            nextBeforeMessageId: result.hasMore ? messages[0]?.id || null : null,
        },
    };
};

const createMessage = async ({
    clientMessageId,
    content,
    conversationId,
    metadata,
    type,
    userId,
}) => {
    const normalizedType = SUPPORTED_MESSAGE_TYPES.has(type) ? type : 'text';
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const normalizedMetadata = toPlainObject(metadata);
    let attachment = null;
    let persistedMetadata = normalizedMetadata;

    if (normalizedType === 'image' || normalizedType === 'video') {
        try {
            attachment = await uploadChatMedia({
                conversationId,
                fileDataUrl: normalizedMetadata.fileDataUrl,
                fileName: normalizedMetadata.fileName,
                fileSize: Number(normalizedMetadata.fileSize),
                mimeType: normalizedMetadata.mimeType,
                type: normalizedType,
                userId,
            });
        } catch (error) {
            if (error.response?.data?.error?.message) {
                const cloudinaryMessage = error.response.data.error.message;
                const isInvalidSignatureError = error.response.status === 401;
                const uploadError = new Error(
                    isInvalidSignatureError
                        ? 'Cloudinary credentials or signature are invalid. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, then restart the backend.'
                        : cloudinaryMessage
                );
                uploadError.code = isInvalidSignatureError
                    ? 'CLOUDINARY_INVALID_SIGNATURE'
                    : error.code || 'CLOUDINARY_UPLOAD_FAILED';
                uploadError.statusCode = isInvalidSignatureError
                    ? 502
                    : error.statusCode || error.response.status || 502;
                throw uploadError;
            }

            throw error;
        }

        persistedMetadata = buildPersistedMediaMetadata(normalizedMetadata, attachment);
    }

    if (!trimmedContent && !attachment) {
        const error = new Error('content is required.');
        error.code = 'MISSING_CONTENT';
        error.field = 'content';
        error.statusCode = 400;
        throw error;
    }

    const message = await messageModel.createMessage({
        attachment,
        clientMessageId,
        content: trimmedContent,
        conversationId,
        metadata: persistedMetadata,
        senderId: userId,
        type: normalizedType,
    });

    if (!message) {
        const error = new Error('Conversation not found.');
        error.code = 'CONVERSATION_NOT_FOUND';
        error.statusCode = 404;
        throw error;
    }

    return mapMessage(message);
};

module.exports = {
    createMessage,
    listMessages,
};
