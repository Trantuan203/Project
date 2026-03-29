import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createDirectRoom,
  createFriendRequest,
  fetchFriends,
  fetchMessages,
  fetchRooms,
  searchUsers,
  sendMessage,
  updateParticipantNickname,
} from '../services/chat';

const FRIENDS_INITIAL_LIMIT = 20;
const FRIENDS_LOAD_MORE_LIMIT = 30;
const DIRECTORY_INITIAL_LIMIT = 20;
const DIRECTORY_LOAD_MORE_LIMIT = 30;
const MESSAGE_INITIAL_LIMIT = 30;
const MESSAGE_LOAD_MORE_LIMIT = 50;

const buildClientMessageId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveMessagePreview = (message) => {
  if (!message) {
    return '';
  }

  if (message.type === 'image') {
    return message.content?.trim() || '[image]';
  }

  if (message.type === 'video') {
    return message.content?.trim() || '[video]';
  }

  return message.content || `[${message.type || 'message'}]`;
};

const createOptimisticMessage = ({ content, conversationId, currentUser, metadata, type }) => {
  const clientMessageId = buildClientMessageId();
  const timestamp = new Date().toISOString();

  return {
    clientMessageId,
    content,
    conversationId,
    createdAt: timestamp,
    fileName: metadata?.fileName || '',
    fileSize: metadata?.fileSize ?? null,
    hasAttachments: Boolean(metadata?.fileDataUrl),
    id: `temp-${clientMessageId}`,
    mediaUrl: metadata?.fileDataUrl || '',
    metadata: metadata
      ? {
          ...metadata,
          mediaUrl: metadata.fileDataUrl || '',
          previewUrl: metadata.fileDataUrl || '',
          thumbnailUrl: metadata.fileDataUrl || '',
        }
      : {},
    mimeType: metadata?.mimeType || '',
    previewUrl: metadata?.fileDataUrl || '',
    sender: currentUser
      ? {
          avatarUrl: currentUser.avatarUrl || '',
          displayName:
            currentUser.displayName ||
            currentUser.fullName ||
            currentUser.username ||
            currentUser.email ||
            'You',
          email: currentUser.email || '',
          id: currentUser.id,
          username: currentUser.username || '',
        }
      : null,
    senderId: currentUser?.id || '',
    status: 'sending',
    thumbnailUrl: metadata?.fileDataUrl || '',
    type,
    updatedAt: timestamp,
  };
};

const upsertConversation = (conversations, nextConversation) => {
  const filteredConversations = conversations.filter((item) => item.id !== nextConversation.id);
  return [nextConversation, ...filteredConversations].sort(
    (left, right) => new Date(right.lastMessageAt || right.createdAt) - new Date(left.lastMessageAt || left.createdAt),
  );
};

const upsertMessageList = (messages, nextMessage) => {
  const existingMessage = messages.find(
    (item) =>
      item.id === nextMessage.id ||
      (nextMessage.clientMessageId &&
        item.clientMessageId &&
        item.clientMessageId === nextMessage.clientMessageId),
  );

  if (existingMessage) {
    return messages.map((item) =>
      item.id === existingMessage.id ? { ...item, ...nextMessage } : item,
    );
  }

  return [...messages, nextMessage].sort(
    (left, right) => new Date(left.createdAt) - new Date(right.createdAt),
  );
};

const normalizeFriendshipAfterRequest = (result, currentFriendship) => {
  const status = result?.friendship?.status || currentFriendship?.status || 'pending';

  return {
    ...currentFriendship,
    addresseeId: result?.friendship?.addresseeId || currentFriendship?.addresseeId || '',
    direction:
      status === 'pending'
        ? result?.friendship?.direction || currentFriendship?.direction || 'outgoing'
        : null,
    id: result?.friendship?.id || currentFriendship?.id || '',
    isFriend: status === 'accepted',
    isPending: status === 'pending',
    requesterId: result?.friendship?.requesterId || currentFriendship?.requesterId || '',
    status,
  };
};

const applyFriendshipToConversation = (conversation, targetUserId, result) => {
  if (!conversation?.isDirect || conversation.peer?.id !== targetUserId) {
    return conversation;
  }

  const nextFriendship = normalizeFriendshipAfterRequest(
    result,
    conversation.friendship || conversation.peer?.friendship,
  );

  return {
    ...conversation,
    friendship: nextFriendship,
    peer: conversation.peer
      ? {
          ...conversation.peer,
          friendship: nextFriendship,
        }
      : conversation.peer,
  };
};

export const useMessages = (currentUser) => {
  const [activeConversationId, setActiveConversationId] = useState('');
  const [conversations, setConversations] = useState([]);
  const [conversationSearch, setConversationSearch] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isPeoplePanelOpen, setIsPeoplePanelOpen] = useState(false);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [isLoadingMorePeople, setIsLoadingMorePeople] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUpdatingParticipantNickname, setIsUpdatingParticipantNickname] = useState(false);
  const [friendRequestTargetId, setFriendRequestTargetId] = useState('');
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [messagePageStateByConversation, setMessagePageStateByConversation] = useState({});
  const [notice, setNotice] = useState(null);
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');
  const [friendEntries, setFriendEntries] = useState([]);
  const [directoryResults, setDirectoryResults] = useState([]);
  const [hasMoreFriends, setHasMoreFriends] = useState(false);
  const [hasMoreDirectory, setHasMoreDirectory] = useState(false);
  const [peopleSource, setPeopleSource] = useState('friends');
  const [remoteTyping, setRemoteTyping] = useState({});

  const showNotice = useCallback((message, type = 'info') => {
    setNotice({ message, type });
  }, []);

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);

    try {
      const payload = await fetchRooms();
      const rooms = Array.isArray(payload.rooms) ? payload.rooms : [];
      setConversations(rooms);

      setActiveConversationId((currentValue) => {
        if (!currentValue && rooms[0]?.id) {
          return rooms[0].id;
        }

        if (currentValue && !rooms.some((conversation) => conversation.id === currentValue)) {
          return rooms[0]?.id || '';
        }

        return currentValue;
      });
    } catch (error) {
      showNotice(error.message || 'Khong the tai danh sach cuoc tro chuyen.', 'error');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [showNotice]);

  const loadMessages = useCallback(
    async ({
      appendOlder = false,
      beforeMessageId = '',
      conversationId,
      limit = MESSAGE_INITIAL_LIMIT,
    }) => {
      if (!conversationId) {
        return;
      }

      if (appendOlder) {
        setMessagePageStateByConversation((currentValue) => ({
          ...currentValue,
          [conversationId]: {
            ...(currentValue[conversationId] || {}),
            isLoadingOlder: true,
          },
        }));
      } else {
        setIsLoadingMessages(true);
      }

      try {
        const payload = await fetchMessages({
          beforeMessageId,
          conversationId,
          limit,
        });
        const messages = Array.isArray(payload.messages) ? payload.messages : [];

        setMessagesByConversation((currentValue) => ({
          ...currentValue,
          [conversationId]: appendOlder
            ? [...messages, ...(currentValue[conversationId] || [])]
            : messages,
        }));

        setMessagePageStateByConversation((currentValue) => ({
          ...currentValue,
          [conversationId]: {
            hasOlder: Boolean(payload.pageInfo?.hasMore),
            isLoadingOlder: false,
            nextBeforeMessageId: payload.pageInfo?.nextBeforeMessageId || null,
          },
        }));

        if (!appendOlder) {
          setConversations((currentValue) =>
            currentValue.map((conversation) =>
              conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
            ),
          );
        }
      } catch (error) {
        showNotice(error.message || 'Khong the tai tin nhan.', 'error');
      } finally {
        if (appendOlder) {
          setMessagePageStateByConversation((currentValue) => ({
            ...currentValue,
            [conversationId]: {
              ...(currentValue[conversationId] || {}),
              isLoadingOlder: false,
            },
          }));
        } else {
          setIsLoadingMessages(false);
        }
      }
    },
    [showNotice],
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    loadMessages({ conversationId: activeConversationId });
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!isPeoplePanelOpen) {
      setFriendEntries([]);
      setDirectoryResults([]);
      setHasMoreFriends(false);
      setHasMoreDirectory(false);
      setPeopleSource('friends');
      setPeopleSearchQuery('');
      setIsSearchingPeople(false);
      setIsLoadingMorePeople(false);
      return;
    }
  }, [isPeoplePanelOpen]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = conversationSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      [conversation.title, conversation.lastMessagePreview, conversation.peer?.email, conversation.peer?.username]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [conversationSearch, conversations]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) || null;
  const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] || [] : [];
  const activeMessagePageState = activeConversationId
    ? messagePageStateByConversation[activeConversationId] || {}
    : {};

  useEffect(() => {
    if (!isPeoplePanelOpen) {
      return undefined;
    }

    const normalizedQuery = peopleSearchQuery.trim();

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingPeople(true);
      setPeopleSource('friends');

      try {
        const friendPayload = await fetchFriends({
          limit: FRIENDS_INITIAL_LIMIT,
          offset: 0,
          query: normalizedQuery,
        });

        if (!isCancelled) {
          const nextFriends = Array.isArray(friendPayload.friends) ? friendPayload.friends : [];
          setFriendEntries(nextFriends);
          setHasMoreFriends(Boolean(friendPayload.pageInfo?.hasMore));
          setDirectoryResults([]);
          setHasMoreDirectory(false);

          if (nextFriends.length === 0 && normalizedQuery.length >= 2) {
            const directoryPayload = await searchUsers({
              excludeAcceptedFriends: true,
              limit: DIRECTORY_INITIAL_LIMIT,
              offset: 0,
              query: normalizedQuery,
            });

            if (!isCancelled) {
              const nextDirectory = Array.isArray(directoryPayload.users)
                ? directoryPayload.users
                : [];

              setDirectoryResults(nextDirectory);
              setHasMoreDirectory(Boolean(directoryPayload.pageInfo?.hasMore));
              setPeopleSource(nextDirectory.length > 0 ? 'directory' : 'empty');
            }
          } else {
            setPeopleSource(nextFriends.length > 0 ? 'friends' : 'empty');
          }
        }
      } catch (error) {
        if (!isCancelled) {
          showNotice(error.message || 'Khong the tim nguoi dung.', 'error');
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingPeople(false);
        }
      }
    }, normalizedQuery ? 250 : 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isPeoplePanelOpen, peopleSearchQuery, showNotice]);

  const peoplePanelState = useMemo(() => {
    const normalizedQuery = peopleSearchQuery.trim();

    if (!normalizedQuery) {
      return {
        description: friendEntries.length
          ? 'Danh sach ban be duoc sap xep theo lan tuong tac gan nhat.'
          : 'Ban chua co ban be nao gan day. Nhap ten hoac email de tim nguoi khac.',
        source: 'friends',
        users: friendEntries,
      };
    }

    if (friendEntries.length > 0) {
      return {
        description: `Tim thay ${friendEntries.length} ket qua trong danh sach ban be cua ban.`,
        source: 'friends',
        users: friendEntries,
      };
    }

    if (normalizedQuery.length < 2) {
      return {
        description:
          'Khong thay trong danh sach ban be. Nhap it nhat 2 ky tu de tim nguoi khac.',
        source: 'empty',
        users: [],
      };
    }

    if (isSearchingPeople) {
      return {
        description: 'Dang tim nguoi dung ben ngoai danh sach ban be...',
        source: 'loading',
        users: [],
      };
    }

    if (directoryResults.length > 0) {
      return {
        description: 'Khong thay trong ban be, day la ket qua tim kiem toan he thong.',
        source: 'directory',
        users: directoryResults,
      };
    }

    return {
      description: 'Khong tim thay ban be hoac tai khoan nao phu hop voi tu khoa nay.',
      source: 'empty',
      users: [],
    };
  }, [directoryResults, friendEntries, isSearchingPeople, peopleSearchQuery]);

  const handleIncomingMessage = useCallback(
    (message) => {
      if (!message?.conversationId) {
        return;
      }

      setMessagesByConversation((currentValue) => ({
        ...currentValue,
        [message.conversationId]: upsertMessageList(currentValue[message.conversationId] || [], message),
      }));

      setConversations((currentValue) => {
        const targetConversation = currentValue.find(
          (conversation) => conversation.id === message.conversationId,
        );

        if (!targetConversation) {
          loadConversations();
          return currentValue;
        }

        return upsertConversation(currentValue, {
          ...targetConversation,
          lastMessageAt: message.createdAt,
          lastMessagePreview:
            message.type === 'text' ? message.content : `[${message.type || 'message'}]`,
          unreadCount:
            message.conversationId === activeConversationId || message.senderId === currentUser?.id
              ? 0
              : Number(targetConversation.unreadCount || 0) + 1,
        });
      });
    },
    [activeConversationId, currentUser?.id, loadConversations],
  );

  const handleIncomingHistory = useCallback((payload) => {
    const conversationId = payload?.conversationId;
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];

    if (!conversationId || !messages.length) {
      return;
    }

    setMessagesByConversation((currentValue) => ({
      ...currentValue,
      [conversationId]: messages,
    }));
  }, []);

  const handleTypingStart = useCallback(({ conversationId, userId }) => {
    if (!conversationId || !userId || userId === currentUser?.id) {
      return;
    }

    setRemoteTyping((currentValue) => ({
      ...currentValue,
      [conversationId]: userId,
    }));
  }, [currentUser?.id]);

  const handleTypingStop = useCallback(({ conversationId, userId }) => {
    if (!conversationId || !userId) {
      return;
    }

    setRemoteTyping((currentValue) => {
      if (currentValue[conversationId] !== userId) {
        return currentValue;
      }

      const nextValue = { ...currentValue };
      delete nextValue[conversationId];
      return nextValue;
    });
  }, []);

  const handleConversationUpdated = useCallback((nextConversation) => {
    if (!nextConversation?.id) {
      return;
    }

    setConversations((currentValue) => {
      const hasConversation = currentValue.some((conversation) => conversation.id === nextConversation.id);

      if (!hasConversation) {
        return currentValue;
      }

      return currentValue.map((conversation) =>
        conversation.id === nextConversation.id
          ? {
              ...conversation,
              ...nextConversation,
            }
          : conversation,
      );
    });
  }, []);

  const selectConversation = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
  }, []);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!activeConversationId) {
      return;
    }

    const pageState = messagePageStateByConversation[activeConversationId] || {};

    if (!pageState.hasOlder || pageState.isLoadingOlder || !pageState.nextBeforeMessageId) {
      return;
    }

    await loadMessages({
      appendOlder: true,
      beforeMessageId: pageState.nextBeforeMessageId,
      conversationId: activeConversationId,
      limit: MESSAGE_LOAD_MORE_LIMIT,
    });
  }, [activeConversationId, loadMessages, messagePageStateByConversation]);

  const handleSendMessage = useCallback(
    async (input) => {
      if (!activeConversationId) {
        return;
      }

      const nextMessage =
        typeof input === 'string'
          ? { content: input, type: 'text' }
          : {
              content: input?.content || '',
              metadata: input?.metadata,
              type: input?.type || 'text',
            };
      const optimisticMessage = createOptimisticMessage({
        content: nextMessage.content,
        conversationId: activeConversationId,
        currentUser,
        metadata: nextMessage.metadata,
        type: nextMessage.type,
      });

      setIsSendingMessage(true);
      setMessagesByConversation((currentValue) => ({
        ...currentValue,
        [activeConversationId]: upsertMessageList(
          currentValue[activeConversationId] || [],
          optimisticMessage,
        ),
      }));
      setConversations((currentValue) =>
        currentValue.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                lastMessageAt: optimisticMessage.createdAt,
                lastMessagePreview: resolveMessagePreview(optimisticMessage),
              }
            : conversation,
        ),
      );

      try {
        const response = await sendMessage({
          clientMessageId: optimisticMessage.clientMessageId,
          content: nextMessage.content,
          conversationId: activeConversationId,
          metadata: nextMessage.metadata,
          type: nextMessage.type,
        });

        if (response.message) {
          handleIncomingMessage(response.message);
        }
      } catch (error) {
        setMessagesByConversation((currentValue) => ({
          ...currentValue,
          [activeConversationId]: (currentValue[activeConversationId] || []).map((message) =>
            message.clientMessageId === optimisticMessage.clientMessageId
              ? { ...message, status: 'failed' }
              : message,
          ),
        }));
        showNotice(error.message || 'Gui tin nhan that bai.', 'error');
      } finally {
        setIsSendingMessage(false);
      }
    },
    [activeConversationId, currentUser, handleIncomingMessage, showNotice],
  );

  const handleOpenPeoplePanel = useCallback(() => {
    setIsPeoplePanelOpen(true);
  }, []);

  const handleClosePeoplePanel = useCallback(() => {
    setIsPeoplePanelOpen(false);
  }, []);

  const handleLoadMorePeople = useCallback(async () => {
    if (
      !isPeoplePanelOpen ||
      isSearchingPeople ||
      isLoadingMorePeople ||
      peopleSource === 'empty'
    ) {
      return;
    }

    const normalizedQuery = peopleSearchQuery.trim();

    if (peopleSource === 'directory') {
      if (!hasMoreDirectory || normalizedQuery.length < 2) {
        return;
      }

      setIsLoadingMorePeople(true);

      try {
        const payload = await searchUsers({
          excludeAcceptedFriends: true,
          limit: DIRECTORY_LOAD_MORE_LIMIT,
          offset: directoryResults.length,
          query: normalizedQuery,
        });
        const nextUsers = Array.isArray(payload.users) ? payload.users : [];

        setDirectoryResults((currentValue) => [...currentValue, ...nextUsers]);
        setHasMoreDirectory(Boolean(payload.pageInfo?.hasMore));
      } catch (error) {
        showNotice(error.message || 'Khong the tai them ket qua.', 'error');
      } finally {
        setIsLoadingMorePeople(false);
      }

      return;
    }

    if (!hasMoreFriends) {
      return;
    }

    setIsLoadingMorePeople(true);

    try {
      const payload = await fetchFriends({
        limit: FRIENDS_LOAD_MORE_LIMIT,
        offset: friendEntries.length,
        query: normalizedQuery,
      });
      const nextFriends = Array.isArray(payload.friends) ? payload.friends : [];

      setFriendEntries((currentValue) => [...currentValue, ...nextFriends]);
      setHasMoreFriends(Boolean(payload.pageInfo?.hasMore));
    } catch (error) {
      showNotice(error.message || 'Khong the tai them ban be.', 'error');
    } finally {
      setIsLoadingMorePeople(false);
    }
  }, [
    directoryResults.length,
    friendEntries.length,
    hasMoreDirectory,
    hasMoreFriends,
    isLoadingMorePeople,
    isPeoplePanelOpen,
    isSearchingPeople,
    peopleSearchQuery,
    peopleSource,
    showNotice,
  ]);

  const handleStartDirectRoom = useCallback(
    async (targetUser) => {
      try {
        const payload = await createDirectRoom(targetUser.id);

        if (!payload.room) {
          return null;
        }

        setConversations((currentValue) => upsertConversation(currentValue, payload.room));
        setActiveConversationId(payload.room.id);
        setIsPeoplePanelOpen(false);
        return payload.room;
      } catch (error) {
        showNotice(error.message || 'Khong the bat dau cuoc tro chuyen.', 'error');
        return null;
      }
    },
    [showNotice],
  );

  const handleSendFriendRequest = useCallback(
    async (targetUserId) => {
      if (!targetUserId || friendRequestTargetId === targetUserId) {
        return;
      }

      setFriendRequestTargetId(targetUserId);

      try {
        const result = await createFriendRequest(targetUserId);

        setDirectoryResults((currentValue) =>
          currentValue.map((user) =>
            user.id === targetUserId
              ? {
                  ...user,
                  friendship: normalizeFriendshipAfterRequest(result, user.friendship),
                }
              : user,
          ),
        );

        setFriendEntries((currentValue) =>
          currentValue.map((user) =>
            user.id === targetUserId
              ? {
                  ...user,
                  friendship: normalizeFriendshipAfterRequest(result, user.friendship),
                }
              : user,
          ),
        );

        setConversations((currentValue) =>
          currentValue.map((conversation) =>
            applyFriendshipToConversation(conversation, targetUserId, result),
          ),
        );

        showNotice(
          result.meta?.autoAccepted
            ? 'Loi moi ket ban da duoc chap nhan.'
            : result.meta?.status === 'accepted'
              ? 'Da ket ban thanh cong.'
              : 'Da gui loi moi ket ban.',
          'success',
        );
      } catch (error) {
        showNotice(error.message || 'Khong the gui loi moi ket ban.', 'error');
      } finally {
        setFriendRequestTargetId((currentValue) =>
          currentValue === targetUserId ? '' : currentValue,
        );
      }
    },
    [friendRequestTargetId, showNotice],
  );

  const handleUpdateParticipantNickname = useCallback(
    async ({ conversationId, nickname, targetUserId }) => {
      if (!conversationId || !targetUserId) {
        return null;
      }

      setIsUpdatingParticipantNickname(true);

      try {
        const result = await updateParticipantNickname({ conversationId, nickname, targetUserId });

        if (result.room) {
          handleConversationUpdated(result.room);
        }

        showNotice('Da cap nhat biet danh trong cuoc tro chuyen.', 'success');
        return result.room || null;
      } catch (error) {
        showNotice(error.message || 'Khong the cap nhat biet danh.', 'error');
        return null;
      } finally {
        setIsUpdatingParticipantNickname(false);
      }
    },
    [handleConversationUpdated, showNotice],
  );

  const clearNotice = useCallback(() => setNotice(null), []);
  const hasMorePeople = peopleSource === 'directory' ? hasMoreDirectory : hasMoreFriends;

  return {
    activeConversation,
    activeConversationId,
    activeMessages,
    activeMessagePageState,
    allConversations: conversations,
    clearNotice,
    conversationIds: conversations.map((conversation) => conversation.id),
    conversationSearch,
    conversations: filteredConversations,
    friendRequestTargetId,
    handleClosePeoplePanel,
    handleConversationUpdated,
    handleIncomingHistory,
    handleLoadOlderMessages,
    handleLoadMorePeople,
    handleIncomingMessage,
    handleOpenPeoplePanel,
    handleSendFriendRequest,
    handleSendMessage,
    handleStartDirectRoom,
    handleUpdateParticipantNickname,
    handleTypingStart,
    handleTypingStop,
    isLoadingConversations,
    isLoadingMorePeople,
    isLoadingMessages,
    isPeoplePanelOpen,
    isSearchingPeople,
    isSendingMessage,
    isUpdatingParticipantNickname,
    notice,
    hasMorePeople,
    peoplePanelState,
    peopleSearchQuery,
    remoteTypingUserId: activeConversationId ? remoteTyping[activeConversationId] || '' : '',
    selectConversation,
    setConversationSearch,
    setPeopleSearchQuery,
  };
};
