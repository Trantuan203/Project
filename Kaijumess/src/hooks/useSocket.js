import { useEffect } from 'react';

import { getSocket } from '../services/socket';

const useSocket = ({
  onConversationUpdated,
  conversationIds,
  onIncomingMessage,
  onIncomingHistory,
  onTypingStart,
  onTypingStop,
}) => {
  const socket = getSocket();

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleMessage = (message) => {
      onIncomingMessage?.(message);
    };
    const handleHistory = (payload) => {
      onIncomingHistory?.(payload);
    };
    const handleTypingStart = (payload) => {
      onTypingStart?.(payload);
    };
    const handleTypingStop = (payload) => {
      onTypingStop?.(payload);
    };
    const handleConversationUpdated = (conversation) => {
      onConversationUpdated?.(conversation);
    };

    socket.on('message:new', handleMessage);
    socket.on('messages:history', handleHistory);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('conversation:updated', handleConversationUpdated);

    return () => {
      socket.off('message:new', handleMessage);
      socket.off('messages:history', handleHistory);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('conversation:updated', handleConversationUpdated);
    };
  }, [onConversationUpdated, onIncomingHistory, onIncomingMessage, onTypingStart, onTypingStop, socket]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    conversationIds.forEach((conversationId) => {
      socket.emit('join:room', conversationId);
    });
  }, [conversationIds, socket]);

  const emitTypingStart = (conversationId) => {
    socket?.emit('typing:start', conversationId);
  };

  const emitTypingStop = (conversationId) => {
    socket?.emit('typing:stop', conversationId);
  };

  return {
    emitTypingStart,
    emitTypingStop,
    socket,
  };
};

export default useSocket;
