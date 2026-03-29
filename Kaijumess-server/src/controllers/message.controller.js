const messageService = require('../services/message.service');

const listMessages = async (req, res) => {
    try {
        const result = await messageService.listMessages({
            beforeMessageId: req.query.beforeMessageId || '',
            conversationId: req.params.conversationId,
            limit: Number(req.query.limit || 30),
            userId: req.user.sub,
        });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

const createMessage = async (req, res) => {
    try {
        const message = await messageService.createMessage({
            clientMessageId: req.body?.clientMessageId,
            content: req.body?.content,
            conversationId: req.params.conversationId,
            metadata: req.body?.metadata,
            type: req.body?.type || 'text',
            userId: req.user.sub,
        });

        const io = req.app.get('io');

        if (io) {
            io.to(req.params.conversationId).emit('message:new', message);
        }

        return res.status(201).json({ message });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            code: error.code,
            field: error.field,
            message: error.message || 'Internal server error.',
        });
    }
};

module.exports = {
    createMessage,
    listMessages,
};
