import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getScaledFontSize } from '../../constants/appearance';
import { useAppearance } from '../../hooks/useAppearance';
import { useTheme } from '../../hooks/useTheme';
import {
  CONVERSATION_PREFERENCES_EVENT,
  readConversationPreferences,
  resolveConversationWallpaperStyle,
} from '../../utils/conversationCustomizations';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_MOBILE_GALLERY_SELECTION = 24;
const MOBILE_SHEET_EXPANDED_OFFSET = -56;
const MOBILE_SHEET_CLOSE_THRESHOLD = 140;
const MOBILE_SHEET_EXPAND_THRESHOLD = -28;
const MOBILE_COMPOSER_MIN_HEIGHT = 40;
const MOBILE_COMPOSER_MAX_HEIGHT = 72;

const formatMessageTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(value),
      )
    : '';

const formatMessageDay = (value) => {
  if (!value) return 'Hom nay';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Hom nay';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const getFriendshipActionLabel = (friendship) => {
  if (!friendship || friendship.status === 'rejected') return 'Add Friend';
  if (friendship.direction === 'incoming') return 'Accept';
  return 'Pending';
};

const getConversationPresenceLabel = ({ conversation, remoteTypingActive }) => {
  if (remoteTypingActive) return `${conversation.title || conversation.peer?.displayName || 'Nguoi kia'} dang nhap...`;
  if (conversation.peer?.status === 'online' || conversation.isOnline) return 'Dang hoat dong';
  return conversation.peer?.email || 'Tro chuyen truc tiep';
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Khong the doc tep da chon.'));
    reader.readAsDataURL(file);
  });

const formatSelectionLabel = (count) => `${count} Selected`;

const createMobileGalleryId = (file) =>
  `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`;

const openNativeFilePicker = (input) => {
  if (!input) return;

  if (typeof input.showPicker === 'function') {
    input.showPicker();
    return;
  }

  input.click();
};

const MOBILE_ALBUM_PRESETS = [
  { key: 'studio', label: 'Studio Picks' },
  { key: 'details', label: 'Details' },
  { key: 'wide', label: 'Wide Shots' },
];
const QUICK_REACTION_OPTIONS = ['👍', '😍', '🔥', '😂'];

const autosizeComposerTextarea = (textarea) => {
  if (!textarea) return;

  textarea.style.height = '0px';
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, MOBILE_COMPOSER_MIN_HEIGHT), MOBILE_COMPOSER_MAX_HEIGHT)}px`;
};

const getMessageMedia = (message) => {
  if (!message || !['image', 'video'].includes(message.type)) return null;
  const metadata = message.metadata && typeof message.metadata === 'object' ? message.metadata : {};
  const mediaUrl = message.mediaUrl || metadata.mediaUrl || metadata.previewUrl || '';
  if (!mediaUrl) return null;
  return {
    fileName: message.fileName || metadata.fileName || '',
    mediaUrl,
    thumbnailUrl: message.thumbnailUrl || metadata.thumbnailUrl || mediaUrl,
    type: message.type,
  };
};

const resolveMetaLabel = (message, isMine) => {
  if (isMine && message.status === 'sending') return 'Dang gui...';
  if (isMine && message.status === 'failed') return 'Gui that bai';
  const timeLabel = formatMessageTime(message.createdAt);
  if (isMine && message.readAt) return `${timeLabel} - Read`;
  return timeLabel;
};

const ChatWindow = (props) => {
  const {
    conversation,
    currentUser,
    friendRequestTargetId,
    hasOlderMessages,
    hasActiveCall,
    isLoadingOlderMessages,
    isLoadingMessages,
    isSendingMessage,
    messages,
    onBack,
    onLoadOlderMessages,
    onSendFriendRequest,
    onSendMessage,
    onStartAudioCall,
    onStartVideoCall,
    onToggleDetails,
    onTypingStart,
    onTypingStop,
    remoteTypingUserId,
  } = props;
  const { fontScale, wallpaperStyle } = useAppearance();
  const { resolvedTheme } = useTheme();
  const [draft, setDraft] = useState('');
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  const [isPreparingMedia, setIsPreparingMedia] = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null);
  const [conversationPreferences, setConversationPreferences] = useState(() =>
    readConversationPreferences(conversation?.id),
  );
  const [isMobilePhotoPickerOpen, setIsMobilePhotoPickerOpen] = useState(false);
  const [mobileGalleryMedia, setMobileGalleryMedia] = useState([]);
  const [selectedMobileMediaIds, setSelectedMobileMediaIds] = useState([]);
  const [activeMobilePhotoTab, setActiveMobilePhotoTab] = useState('recents');
  const [activeMobileAlbumKey, setActiveMobileAlbumKey] = useState('all');
  const [mobileSheetOffsetY, setMobileSheetOffsetY] = useState(0);
  const [isDraggingMobileSheet, setIsDraggingMobileSheet] = useState(false);
  const [activeQuickReactionMessageId, setActiveQuickReactionMessageId] = useState('');
  const [messageReactions, setMessageReactions] = useState({});
  const fileInputRef = useRef(null);
  const mobilePhotoInputRef = useRef(null);
  const mobileComposerTextareaRef = useRef(null);
  const mobileSheetDragStartYRef = useRef(0);
  const mobileSheetDragOffsetRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const scrollerRef = useRef(null);
  const previousConversationIdRef = useRef('');
  const previousMessageCountRef = useRef(0);
  const prependAdjustmentRef = useRef(null);
  const statusSize = getScaledFontSize(fontScale, 12, 11);
  const messageSize = getScaledFontSize(fontScale, 15, 13);
  const metaSize = getScaledFontSize(fontScale, 10, 10);
  const inputSize = getScaledFontSize(fontScale, 15, 13);
  const meshStyle = useMemo(
    () => ({
      backgroundColor: resolvedTheme === 'dark' ? '#101315' : '#f8f9fa',
      backgroundImage:
        resolvedTheme === 'dark'
          ? 'radial-gradient(at 0% 0%, rgba(0, 88, 188, 0.2) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(111, 251, 133, 0.08) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(188, 0, 10, 0.08) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(0, 110, 40, 0.12) 0px, transparent 50%)'
          : 'radial-gradient(at 0% 0%, rgba(0, 88, 188, 0.14) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(111, 251, 133, 0.1) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(188, 0, 10, 0.06) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(0, 110, 40, 0.1) 0px, transparent 50%)',
    }),
    [resolvedTheme],
  );
  const overlayStyle = useMemo(
    () => ({
      backdropFilter: 'blur(12px)',
      backgroundColor:
        resolvedTheme === 'dark' ? 'rgba(16, 19, 21, 0.42)' : 'rgba(248, 249, 250, 0.12)',
    }),
    [resolvedTheme],
  );
  const mobileCanvasStyle = useMemo(
    () => ({
      backgroundColor: '#f8f9fa',
      backgroundImage:
        'radial-gradient(at 0% 0%, rgba(216, 226, 255, 1) 0px, transparent 50%), radial-gradient(at 50% 0%, rgba(220, 231, 255, 1) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(228, 246, 255, 1) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(243, 247, 255, 1) 0px, transparent 50%)',
    }),
    [],
  );
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);
  useEffect(() => {
    setConversationPreferences(readConversationPreferences(conversation?.id));
  }, [conversation?.id]);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleConversationPreferences = (event) => {
      if (event.detail?.conversationId !== conversation?.id) {
        return;
      }

      setConversationPreferences(readConversationPreferences(conversation?.id));
    };

    window.addEventListener(CONVERSATION_PREFERENCES_EVENT, handleConversationPreferences);

    return () => {
      window.removeEventListener(CONVERSATION_PREFERENCES_EVENT, handleConversationPreferences);
    };
  }, [conversation?.id]);
  useEffect(() => {
    setPendingMedia(null);
    setIsMobilePhotoPickerOpen(false);
    setMobileGalleryMedia([]);
    setSelectedMobileMediaIds([]);
    setActiveMobilePhotoTab('recents');
    setActiveMobileAlbumKey('all');
    setMobileSheetOffsetY(0);
    setIsDraggingMobileSheet(false);
    setActiveQuickReactionMessageId('');
    setMessageReactions({});
  }, [conversation?.id]);
  useEffect(() => {
    if (!isMobilePhotoPickerOpen) {
      setMobileSheetOffsetY(0);
      setIsDraggingMobileSheet(false);
    }
  }, [isMobilePhotoPickerOpen]);
  useEffect(() => {
    if (!scrollerRef.current) return;
    const scroller = scrollerRef.current;
    const isConversationChanged = previousConversationIdRef.current !== conversation?.id;
    if (prependAdjustmentRef.current) {
      const delta = scroller.scrollHeight - prependAdjustmentRef.current.previousScrollHeight;
      scroller.scrollTop = prependAdjustmentRef.current.previousScrollTop + delta;
      prependAdjustmentRef.current = null;
    } else if (isConversationChanged || messages.length >= previousMessageCountRef.current) {
      scroller.scrollTop = scroller.scrollHeight;
    }
    previousConversationIdRef.current = conversation?.id || '';
    previousMessageCountRef.current = messages.length;
  }, [conversation?.id, messages]);
  useEffect(() => {
    if (!isLoadingOlderMessages && prependAdjustmentRef.current && previousMessageCountRef.current === messages.length) {
      prependAdjustmentRef.current = null;
    }
  }, [isLoadingOlderMessages, messages.length]);
  useEffect(() => () => typingTimeoutRef.current && window.clearTimeout(typingTimeoutRef.current), []);
  useEffect(() => {
    if (!isMobileViewport) return;

    autosizeComposerTextarea(mobileComposerTextareaRef.current);
  }, [draft, isMobileViewport]);
  const stopTyping = () => {
    if (!conversation?.id || !isTypingRef.current) return;
    isTypingRef.current = false;
    onTypingStop?.(conversation.id);
  };
  const handleDraftChange = (event) => {
    const nextValue = event.target.value;

    autosizeComposerTextarea(event.target);
    setDraft(nextValue);
    if (!conversation?.id) return;
    if (nextValue.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTypingStart?.(conversation.id);
      }
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => stopTyping(), 1200);
      return;
    }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    stopTyping();
  };
  const handleSubmit = async () => {
    if (!conversation?.id || (!draft.trim() && !pendingMedia)) return;
    const nextPendingMedia = pendingMedia;
    const nextContent = nextPendingMedia ? draft.trim() : draft;
    setDraft('');
    if (mobileComposerTextareaRef.current) {
      mobileComposerTextareaRef.current.style.height = `${MOBILE_COMPOSER_MIN_HEIGHT}px`;
    }
    setPendingMedia(null);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    stopTyping();
    if (nextPendingMedia) {
      await onSendMessage?.({ content: nextContent, metadata: nextPendingMedia, type: nextPendingMedia.type });
      return;
    }
    await onSendMessage?.(nextContent);
  };
  const handleToggleQuickReactionBar = (messageId) => {
    setActiveQuickReactionMessageId((currentValue) =>
      currentValue === messageId ? '' : messageId,
    );
  };
  const handlePickQuickReaction = (messageId, reaction) => {
    setMessageReactions((currentValue) => ({
      ...currentValue,
      [messageId]: currentValue[messageId] === reaction ? '' : reaction,
    }));
    setActiveQuickReactionMessageId('');
  };
  const handlePickMedia = () => !isSendingMessage && !isPreparingMedia && fileInputRef.current?.click();
  const handleMediaChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return window.alert('Chi ho tro gui anh hoac video.');
    const sizeLimit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > sizeLimit) return window.alert(isVideo ? 'Video phai nho hon 20 MB.' : 'Anh phai nho hon 10 MB.');
    setIsPreparingMedia(true);
    try {
      const fileDataUrl = await readFileAsDataUrl(file);
      setPendingMedia({ fileDataUrl, fileName: file.name, fileSize: file.size, mimeType: file.type, type: isVideo ? 'video' : 'image' });
    } catch (error) {
      window.alert(error.message || 'Khong the tai len tep nay.');
    } finally {
      setIsPreparingMedia(false);
    }
  };
  const handleOpenMobilePhotoPicker = () => {
    if (isComposerBusy) return;

    openNativeFilePicker(mobilePhotoInputRef.current);
  };
  const handleMobilePhotoChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const imageFiles = files.filter((file) => file.type.startsWith('image/')).slice(0, MAX_MOBILE_GALLERY_SELECTION);
    if (!imageFiles.length) {
      window.alert('Chi ho tro chon anh trong giao dien mobile nay.');
      return;
    }
    const oversizedFile = imageFiles.find((file) => file.size > MAX_IMAGE_BYTES);
    if (oversizedFile) {
      window.alert('Moi anh phai nho hon 10 MB.');
      return;
    }
    setIsPreparingMedia(true);
    try {
      const preparedMedia = await Promise.all(
        imageFiles.map(async (file) => ({
          fileDataUrl: await readFileAsDataUrl(file),
          groupKey: MOBILE_ALBUM_PRESETS[Math.abs(file.name.length + file.size) % MOBILE_ALBUM_PRESETS.length].key,
          fileName: file.name,
          fileSize: file.size,
          id: createMobileGalleryId(file),
          mimeType: file.type,
          type: 'image',
        })),
      );
      setMobileGalleryMedia(preparedMedia);
      setSelectedMobileMediaIds(preparedMedia.map((item) => item.id));
      setActiveMobilePhotoTab('recents');
      setActiveMobileAlbumKey('all');
      setMobileSheetOffsetY(0);
      setIsMobilePhotoPickerOpen(true);
    } catch (error) {
      window.alert(error.message || 'Khong the tai len anh da chon.');
    } finally {
      setIsPreparingMedia(false);
    }
  };
  const handleToggleMobilePhoto = (mediaId) => {
    setSelectedMobileMediaIds((currentValue) =>
      currentValue.includes(mediaId)
        ? currentValue.filter((item) => item !== mediaId)
        : [...currentValue, mediaId],
    );
  };
  const handleClearMobilePhotoSelection = () => {
    setSelectedMobileMediaIds([]);
  };
  const handleCloseMobilePhotoPicker = () => {
    setIsMobilePhotoPickerOpen(false);
    setMobileGalleryMedia([]);
    setSelectedMobileMediaIds([]);
    setActiveMobilePhotoTab('recents');
    setActiveMobileAlbumKey('all');
    setMobileSheetOffsetY(0);
  };
  const handleMobileSheetPointerDown = (event) => {
    mobileSheetDragStartYRef.current = event.clientY;
    mobileSheetDragOffsetRef.current = mobileSheetOffsetY;
    setIsDraggingMobileSheet(true);
  };
  const handleMobileSheetPointerMove = (event) => {
    if (!isDraggingMobileSheet) return;
    const deltaY = event.clientY - mobileSheetDragStartYRef.current;
    const nextOffset = Math.min(240, Math.max(MOBILE_SHEET_EXPANDED_OFFSET, mobileSheetDragOffsetRef.current + deltaY));
    setMobileSheetOffsetY(nextOffset);
  };
  const handleMobileSheetPointerUp = () => {
    if (!isDraggingMobileSheet) return;
    setIsDraggingMobileSheet(false);
    if (mobileSheetOffsetY >= MOBILE_SHEET_CLOSE_THRESHOLD) {
      handleCloseMobilePhotoPicker();
      return;
    }
    if (mobileSheetOffsetY <= MOBILE_SHEET_EXPAND_THRESHOLD) {
      setMobileSheetOffsetY(MOBILE_SHEET_EXPANDED_OFFSET);
      return;
    }
    setMobileSheetOffsetY(0);
  };
  const handleSendMobilePhotos = async () => {
    if (!conversation?.id || isComposerBusy) return;
    const selectedItems = mobileGalleryMedia.filter((item) => selectedMobileMediaIds.includes(item.id));
    if (!selectedItems.length) return;
    const caption = draft.trim();

    setDraft('');
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    stopTyping();
    setIsMobilePhotoPickerOpen(false);
    setActiveMobilePhotoTab('recents');
    setActiveMobileAlbumKey('all');
    setMobileSheetOffsetY(0);
    setMobileGalleryMedia([]);
    setSelectedMobileMediaIds([]);

    for (let index = 0; index < selectedItems.length; index += 1) {
      const item = selectedItems[index];
      await onSendMessage?.({
        content: index === 0 ? caption : '',
        metadata: {
          fileDataUrl: item.fileDataUrl,
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          type: item.type,
        },
        type: item.type,
      });
    }
  };
  const mobileAlbums = useMemo(() => {
    const albums = MOBILE_ALBUM_PRESETS.map((preset) => ({
      ...preset,
      items: mobileGalleryMedia.filter((media) => media.groupKey === preset.key),
    })).filter((album) => album.items.length > 0);

    return [
      {
        cover: mobileGalleryMedia[0] || null,
        items: mobileGalleryMedia,
        key: 'all',
        label: 'All Photos',
      },
      ...albums.map((album) => ({
        ...album,
        cover: album.items[0] || null,
      })),
    ];
  }, [mobileGalleryMedia]);
  const visibleMobileGalleryMedia = useMemo(() => {
    if (activeMobilePhotoTab === 'recents' || activeMobileAlbumKey === 'all') {
      return mobileGalleryMedia;
    }

    return mobileGalleryMedia.filter((media) => media.groupKey === activeMobileAlbumKey);
  }, [activeMobileAlbumKey, activeMobilePhotoTab, mobileGalleryMedia]);
  const handleScroll = useCallback(() => {
    if (!scrollerRef.current || !hasOlderMessages || isLoadingOlderMessages || isLoadingMessages) return;
    if (scrollerRef.current.scrollTop > 80) return;
    prependAdjustmentRef.current = { previousScrollHeight: scrollerRef.current.scrollHeight, previousScrollTop: scrollerRef.current.scrollTop };
    onLoadOlderMessages?.();
  }, [hasOlderMessages, isLoadingMessages, isLoadingOlderMessages, onLoadOlderMessages]);
  const renderMedia = (media, className, preview = false) =>
    media?.type === 'video' ? (
      <video className={className} controls={!preview} muted={preview} playsInline preload="metadata" src={media.mediaUrl} />
    ) : (
      <img className={className} alt={media?.fileName || 'Shared image'} src={media?.thumbnailUrl} />
    );
  const renderMeta = (message, isMine, mobile = false) => {
    const metaLabel = resolveMetaLabel(message, isMine);
    if (!mobile) return <span className={`px-1 font-medium text-on-surface-variant ${isMine ? 'text-right' : ''}`} style={{ fontSize: `${metaSize}px` }}>{metaLabel}</span>;
    if (!isMine) return <span className="mt-2 ml-2 text-[10px] font-bold uppercase tracking-tight text-on-surface-variant/60">{metaLabel}</span>;
    return <div className="mr-2 mt-1 flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant/60">{metaLabel}</span>{message.status === 'sending' ? <span className="material-symbols-outlined text-[14px] text-primary">schedule</span> : <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{message.readAt ? 'done_all' : 'done'}</span>}</div>;
  };
  const conversationWallpaperStyle = useMemo(
    () => resolveConversationWallpaperStyle(conversationPreferences.chatWallpaperId),
    [conversationPreferences.chatWallpaperId],
  );
  if (!conversation) {
    return (
      <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden" style={meshStyle}>
        <div className="absolute inset-0" style={overlayStyle} />
        <div className="relative z-10 mx-6 max-w-xl rounded-[32px] bg-white/70 p-10 text-center shadow-[0_18px_48px_rgba(25,28,29,0.08)] backdrop-blur-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-on-surface-variant">Chat Canvas</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-on-surface">Chon mot cuoc tro chuyen</h2>
          <p className="mt-4 text-sm leading-7 text-on-surface-variant">Mo lai thread da co, tim ban moi, gui tin nhan realtime va bat dau voice/video call tu cung mot bo cuc.</p>
        </div>
      </section>
    );
  }
  const remoteTypingActive = Boolean(remoteTypingUserId) && remoteTypingUserId !== currentUser?.id;
  const friendship = conversation.friendship || conversation.peer?.friendship || null;
  const conversationTitle = conversation.title || conversation.peer?.displayName || 'Direct chat';
  const conversationSubtitle = getConversationPresenceLabel({ conversation, remoteTypingActive });
  const shouldShowFriendshipAction = Boolean(conversation.isDirect && conversation.peer?.id) && !friendship?.isFriend;
  const isFriendshipActionWorking = friendRequestTargetId === conversation.peer?.id;
  const isFriendshipActionDisabled = isFriendshipActionWorking || (friendship?.isPending && friendship?.direction !== 'incoming');
  const friendshipActionLabel = isFriendshipActionWorking ? 'Working...' : getFriendshipActionLabel(friendship);
  const canStartCall = Boolean(conversation.isDirect && conversation.peer?.id) && !hasActiveCall;
  const dateLabel = formatMessageDay(messages[0]?.createdAt || conversation.lastMessageAt);
  const isComposerBusy = isSendingMessage || isPreparingMedia;
  const isSendDisabled = (!draft.trim() && !pendingMedia) || isComposerBusy;
  const pendingPreview = pendingMedia ? { fileName: pendingMedia.fileName, mediaUrl: pendingMedia.fileDataUrl, thumbnailUrl: pendingMedia.fileDataUrl, type: pendingMedia.type } : null;
  const mobileInputBottomClass = pendingMedia ? 'pb-[208px]' : 'pb-[140px]';
  const selectedMobileCount = selectedMobileMediaIds.length;
  const mobileSheetStyle = {
    transform: `translateY(${mobileSheetOffsetY}px)`,
    transition: isDraggingMobileSheet ? 'none' : 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
  };
  const mobileComposerShellStyle = {
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
  };
  const renderMessages = (mobile = false) => {
    if (isLoadingMessages) return <div className="max-w-xl rounded-[24px] bg-white/70 p-5 text-sm text-on-surface-variant shadow-sm backdrop-blur-md">Dang tai tin nhan...</div>;
    if (messages.length === 0) return <div className="max-w-xl rounded-[24px] bg-white/70 p-5 text-sm text-on-surface-variant shadow-sm backdrop-blur-md">Chua co tin nhan nao. Gui tin nhan dau tien de mo dau cuoc tro chuyen.</div>;
    return messages.map((message) => {
      const isMine = message.senderId === currentUser?.id;
      const media = getMessageMedia(message);
      const hasCaption = Boolean(message.content?.trim());
      const selectedReaction = messageReactions[message.id];
      const isQuickReactionOpen = activeQuickReactionMessageId === message.id;
      const desktopBubble = media ? 'max-w-[78%] rounded-[24px] border border-white/80 bg-white/78 p-2 text-on-surface shadow-[0_16px_32px_rgba(25,28,29,0.10)] backdrop-blur-md' : `max-w-[78%] rounded-[20px] px-5 py-4 shadow-sm ${isMine ? 'rounded-br-md bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-primary/20' : 'rounded-bl-md bg-white/62 text-on-surface backdrop-blur-md'}`;
      const mobileBubble = media ? `overflow-hidden rounded-[28px] p-2 shadow-sm ${isMine ? 'rounded-br-[6px] bg-gradient-to-br from-primary to-primary-container text-white shadow-primary/20' : 'rounded-bl-[6px] bg-surface-container-lowest text-on-surface'}` : `${isMine ? 'rounded-[24px] rounded-br-[4px] bg-gradient-to-br from-primary to-primary-container text-white shadow-lg shadow-primary/20' : 'rounded-[24px] rounded-bl-[4px] bg-surface-container-lowest text-on-surface shadow-sm'} px-5 py-4`;
      return <div key={message.id} className={`${mobile ? `flex max-w-[82%] flex-col ${isMine ? 'items-end self-end' : 'items-start'}` : `flex flex-col gap-2 ${isMine ? 'items-end' : 'items-start'}`}`}><button type="button" onClick={mobile ? () => handleToggleQuickReactionBar(message.id) : undefined} className={`relative text-left ${mobile ? 'focus:outline-none' : ''}`}><div className={mobile ? mobileBubble : desktopBubble}>{media ? <>{renderMedia(media, `${mobile ? `w-full max-w-[252px] rounded-[20px] object-cover ${media.type === 'video' ? 'aspect-square bg-black' : ''}` : `max-h-[320px] w-full rounded-[20px] object-cover ${media.type === 'video' ? 'bg-black' : ''}`}`)}{hasCaption ? <div className={`${mobile ? `px-3 pb-3 pt-3 ${isMine ? 'text-white' : 'text-on-surface'}` : 'px-2 pb-1'}`}><p style={{ fontSize: `${messageSize}px`, lineHeight: 1.65 }}>{message.content}</p></div> : null}</> : <p style={{ fontSize: `${messageSize}px`, lineHeight: 1.65 }}>{message.content}</p>}</div>{mobile && selectedReaction ? <span className={`absolute -bottom-3 rounded-full border border-white/70 bg-white px-2 py-1 text-xs shadow-sm ${isMine ? 'left-3' : 'right-3'}`}>{selectedReaction}</span> : null}</button>{mobile && isQuickReactionOpen ? <div className={`mt-2 flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${isMine ? 'self-end' : 'self-start'}`}>{QUICK_REACTION_OPTIONS.map((reaction) => <button key={reaction} type="button" onClick={() => handlePickQuickReaction(message.id, reaction)} className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-transform active:scale-90 ${selectedReaction === reaction ? 'bg-primary/12' : 'hover:bg-slate-100'}`}>{reaction}</button>)}</div> : null}{renderMeta(message, isMine, mobile)}</div>;
    });
  };
  return (
    <section className="relative flex min-w-0 flex-1 overflow-hidden" style={meshStyle}>
      {!isMobileViewport ? <div className="absolute inset-0" style={conversationWallpaperStyle || wallpaperStyle} /> : null}
      {!isMobileViewport ? <div className="absolute inset-0" style={overlayStyle} /> : null}
      <input ref={fileInputRef} accept="image/*,video/*" className="hidden" type="file" onChange={handleMediaChange} />
      <input ref={mobilePhotoInputRef} accept="image/*" className="hidden" multiple type="file" onChange={handleMobilePhotoChange} />
      {isMobileViewport ? (
        <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
          <header className="absolute left-0 right-0 top-0 z-20 border-b border-white/60 bg-white/88 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {onBack ? <button type="button" onClick={onBack} className="rounded-full p-2 transition-colors active:scale-95" aria-label="Back to conversations"><span className="material-symbols-outlined text-on-surface">arrow_back</span></button> : null}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-white shadow-sm">{conversation.avatarUrl ? <img className="h-full w-full object-cover" alt={conversationTitle} src={conversation.avatarUrl} /> : <div className="flex h-full w-full items-center justify-center bg-primary-fixed text-sm font-black text-on-primary-fixed">{conversationTitle.slice(0, 2).toUpperCase()}</div>}{conversation.isOnline ? <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-secondary" /> : null}</div>
                  <div className="flex min-w-0 flex-col"><h1 className="truncate text-lg font-bold tracking-tight text-on-surface">{conversationTitle}</h1><span className={`truncate text-[13px] font-medium ${remoteTypingActive || conversation.isOnline ? 'text-on-secondary-container' : 'text-on-surface-variant'}`}>{conversationSubtitle}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => onStartAudioCall?.(conversation)} disabled={!canStartCall} className="rounded-full p-2 text-primary transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Start audio call"><span className="material-symbols-outlined">call</span></button>
                <button type="button" onClick={() => onStartVideoCall?.(conversation)} disabled={!canStartCall} className="rounded-full p-2 text-primary transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Start video call"><span className="material-symbols-outlined">videocam</span></button>
                <button type="button" onClick={onToggleDetails} className="rounded-full p-2 text-on-surface-variant transition-colors active:scale-95" aria-label="Conversation info"><span className="material-symbols-outlined">info</span></button>
              </div>
            </div>
          </header>
          <div ref={scrollerRef} className={`hide-scrollbar relative flex-1 overflow-y-auto px-4 pt-[5.25rem] ${mobileInputBottomClass}`} onScroll={handleScroll}>
            <div className="absolute inset-0" style={conversationWallpaperStyle || mobileCanvasStyle} />
            <div className="relative mx-auto flex max-w-2xl flex-col space-y-6">
              <div className="flex justify-center items-center py-4"><span className="rounded-full bg-surface-container-high px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{dateLabel}</span></div>
              {isLoadingOlderMessages ? <div className="flex justify-center"><span className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-on-surface-variant shadow-sm backdrop-blur-md">Dang tai tin nhan cu hon...</span></div> : null}
              {renderMessages(true)}
              {remoteTypingActive ? <div className="flex items-start"><div className="rounded-[24px] rounded-bl-[4px] bg-surface-container-lowest px-5 py-4 text-on-surface shadow-sm"><div className="flex items-center gap-1"><span className="h-2 w-2 animate-pulse rounded-full bg-primary/70" /><span className="h-2 w-2 animate-pulse rounded-full bg-primary/70 [animation-delay:150ms]" /><span className="h-2 w-2 animate-pulse rounded-full bg-primary/70 [animation-delay:300ms]" /></div><p className="mt-2 text-xs font-medium text-on-surface-variant">{conversation.peer?.displayName || 'Nguoi kia'} dang nhap...</p></div></div> : null}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 px-3 pt-4" style={mobileComposerShellStyle}>
            {pendingMedia ? <div className="pointer-events-auto mx-auto mb-3 max-w-xl rounded-[24px] border border-white/40 bg-white/72 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl"><div className="hide-scrollbar flex gap-3 overflow-x-auto"><div className="relative flex-shrink-0">{pendingMedia.type === 'video' ? <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-black">{renderMedia(pendingPreview, 'h-full w-full object-cover', true)}<div className="absolute inset-0 flex items-center justify-center bg-black/18"><span className="material-symbols-outlined rounded-full bg-white/90 p-1 text-[14px] text-on-surface">play_arrow</span></div></div> : renderMedia(pendingPreview, 'h-16 w-16 rounded-2xl object-cover', true)}<button type="button" onClick={() => setPendingMedia(null)} className="absolute -right-1 -top-1 rounded-full bg-inverse-surface p-0.5 text-white shadow-sm" aria-label="Remove attachment"><span className="material-symbols-outlined text-[14px]">close</span></button></div><div className="min-w-0 self-center"><p className="truncate text-sm font-semibold text-on-surface">{pendingMedia.fileName}</p><p className="text-xs text-on-surface-variant">Ready to send</p></div></div></div> : null}
            <div className="pointer-events-auto mx-auto flex max-w-xl min-w-0 items-center gap-2">
              <button type="button" onClick={handleOpenMobilePhotoPicker} disabled={isComposerBusy} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Choose photos"><span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'wght' 600" }}>add</span></button>
              <div className="flex min-w-0 flex-1 items-center rounded-[24px] border border-white/50 bg-white/82 px-3 py-1 shadow-[0_14px_32px_rgba(0,0,0,0.1)] backdrop-blur-2xl">
                <textarea ref={mobileComposerTextareaRef} className="min-h-[40px] min-w-0 max-h-[72px] flex-1 resize-none overflow-y-auto border-none bg-transparent py-2 text-on-surface outline-none placeholder:text-on-surface-variant/50" placeholder="Type a message..." value={draft} onChange={handleDraftChange} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSubmit(); } }} rows={1} style={{ fontSize: `${inputSize}px`, lineHeight: '24px' }} />
                <div className="flex shrink-0 items-center gap-0.5">
                  <button type="button" className="shrink-0 p-1.5 text-on-surface-variant transition-colors hover:text-primary" aria-label="Emoji"><span className="material-symbols-outlined text-[22px]">mood</span></button>
                  <button type="button" onClick={handlePickMedia} disabled={isComposerBusy} className="shrink-0 p-1.5 text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60" aria-label="Attach media"><span className="material-symbols-outlined text-[22px]">mic</span></button>
                  <button type="button" onClick={handleSubmit} disabled={isSendDisabled} className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Send message"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{isComposerBusy ? 'hourglass_top' : 'send'}</span></button>
                </div>
              </div>
            </div>
          </div>
          {isMobilePhotoPickerOpen ? <div className="absolute inset-0 z-30 bg-on-background/10 backdrop-blur-[2px]" onClick={handleCloseMobilePhotoPicker}><div className="absolute bottom-0 left-0 right-0 flex h-[78vh] max-h-[663px] flex-col rounded-t-[2.5rem] bg-surface-container-lowest shadow-[0_-12px_40px_rgba(0,0,0,0.1)]" onClick={(event) => event.stopPropagation()} onPointerMove={handleMobileSheetPointerMove} onPointerUp={handleMobileSheetPointerUp} onPointerCancel={handleMobileSheetPointerUp} style={mobileSheetStyle}><div className="flex justify-center py-3"><button type="button" onPointerDown={handleMobileSheetPointerDown} onPointerUp={handleMobileSheetPointerUp} className="flex rounded-full p-2" aria-label="Drag photo picker"><div className="h-1.5 w-12 rounded-full bg-surface-container-highest" /></button></div><div className="px-6 py-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-on-surface">{activeMobilePhotoTab === 'recents' ? 'Recents' : 'Albums'}</h2><p className="text-sm font-medium text-on-surface-variant">{visibleMobileGalleryMedia.length} photos available</p></div><button type="button" onClick={handleCloseMobilePhotoPicker} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant"><span className="material-symbols-outlined">close</span></button></div><div className="mt-4 flex rounded-full bg-surface-container-low p-1"><button type="button" onClick={() => setActiveMobilePhotoTab('recents')} className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeMobilePhotoTab === 'recents' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'}`}>Recents</button><button type="button" onClick={() => setActiveMobilePhotoTab('albums')} className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeMobilePhotoTab === 'albums' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'}`}>Albums</button></div>{activeMobilePhotoTab === 'albums' ? <div className="hide-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">{mobileAlbums.map((album) => <button key={album.key} type="button" onClick={() => setActiveMobileAlbumKey(album.key)} className={`min-w-[146px] overflow-hidden rounded-[22px] border text-left transition-all ${activeMobileAlbumKey === album.key ? 'border-primary bg-primary/5 shadow-[0_14px_28px_rgba(0,88,188,0.12)]' : 'border-transparent bg-surface-container-low shadow-sm'}`}><div className="relative h-24 w-full overflow-hidden bg-surface-container-high">{album.cover ? <img alt={album.label} className="h-full w-full object-cover" src={album.cover.fileDataUrl} /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" /></div><div className="px-4 py-3"><p className="truncate text-sm font-bold text-on-surface">{album.label}</p><p className="mt-1 text-xs font-medium text-on-surface-variant">{album.items.length} photos</p></div></button>)}</div> : null}</div><div className="photo-grid flex-1 overflow-y-auto px-6 pb-24">{visibleMobileGalleryMedia.length ? <div className="grid grid-cols-3 gap-2">{visibleMobileGalleryMedia.map((media) => { const isSelected = selectedMobileMediaIds.includes(media.id); return <button key={media.id} type="button" onClick={() => handleToggleMobilePhoto(media.id)} className={`relative aspect-square overflow-hidden rounded-xl text-left transition-all ${isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-surface-container-lowest' : ''}`}><img alt={media.fileName} className="h-full w-full object-cover" src={media.fileDataUrl} />{isSelected ? <><div className="absolute inset-0 bg-primary/10" /><div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary"><span className="material-symbols-outlined text-[16px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></div></> : <div className="absolute right-2 top-2 h-6 w-6 rounded-full border-2 border-white/50 bg-black/20 backdrop-blur-md" />}</button>; })}</div> : <div className="rounded-[28px] bg-surface-container-low px-5 py-6 text-sm text-on-surface-variant">Chon anh tu thu vien de xem va gui trong mobile layout.</div>}</div><div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-surface-container-lowest/90 p-6 backdrop-blur-xl"><div className="flex flex-col"><span className="font-bold text-on-surface">{formatSelectionLabel(selectedMobileCount)}</span><button type="button" onClick={handleClearMobilePhotoSelection} disabled={!selectedMobileCount} className="text-left text-xs font-medium text-on-surface-variant disabled:opacity-40">Clear all</button></div><button type="button" onClick={handleSendMobilePhotos} disabled={!selectedMobileCount || isComposerBusy} className="flex items-center gap-3 rounded-full bg-primary px-10 py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">Send <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span></button></div></div></div> : null}
        </div>
      ) : (
        <>
          <header className="absolute left-4 right-4 top-4 z-20 md:left-6 md:right-6 md:top-6">
            <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_18px_48px_rgba(25,28,29,0.12)] backdrop-blur-3xl md:px-6">
              <div className="flex min-w-0 items-center gap-4"><div className="relative"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-sm font-black text-on-primary-fixed">{conversation.avatarUrl ? <img className="h-full w-full object-cover" alt={conversationTitle} src={conversation.avatarUrl} /> : conversationTitle.slice(0, 2).toUpperCase()}</div>{conversation.isOnline ? <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-secondary" /> : null}</div><div className="min-w-0"><h2 className="truncate text-lg font-bold text-on-surface">{conversationTitle}</h2><span className={`block truncate font-medium ${remoteTypingActive || conversation.isOnline ? 'text-secondary' : 'text-on-surface-variant'}`} style={{ fontSize: `${statusSize}px` }}>{conversationSubtitle}</span></div></div>
              <div className="flex shrink-0 items-center gap-1 md:gap-2">{shouldShowFriendshipAction ? <><button type="button" onClick={() => onSendFriendRequest?.(conversation.peer.id)} disabled={isFriendshipActionDisabled} className="hidden rounded-full border border-outline-variant/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 lg:inline-flex lg:items-center lg:gap-2"><span className="material-symbols-outlined text-[16px]">{friendship?.direction === 'incoming' ? 'handshake' : 'person_add'}</span>{friendshipActionLabel}</button><button type="button" onClick={() => onSendFriendRequest?.(conversation.peer.id)} disabled={isFriendshipActionDisabled} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden" title={friendshipActionLabel}><span className="material-symbols-outlined text-[18px]">{friendship?.direction === 'incoming' ? 'handshake' : 'person_add'}</span></button></> : null}<button type="button" onClick={() => onStartVideoCall?.(conversation)} disabled={!canStartCall} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-50" title={conversation.isDirect ? 'Start video call' : 'Video call works on direct chat only'}><span className="material-symbols-outlined">videocam</span></button><button type="button" onClick={() => onStartAudioCall?.(conversation)} disabled={!canStartCall} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-50" title={conversation.isDirect ? 'Start audio call' : 'Audio call works on direct chat only'}><span className="material-symbols-outlined">call</span></button><div className="hidden h-6 w-px bg-outline-variant/40 md:block" /><button type="button" onClick={onToggleDetails} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/55"><span className="material-symbols-outlined">more_vert</span></button></div>
            </div>
          </header>
          <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
            <div ref={scrollerRef} className="hide-scrollbar flex-1 overflow-y-auto px-6 pb-36 pt-28 md:px-8 md:pb-40 md:pt-32" onScroll={handleScroll}><div className="space-y-8"><div className="flex justify-center"><span className="rounded-full bg-surface-container-high/45 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant backdrop-blur-md">{dateLabel}</span></div>{isLoadingOlderMessages ? <div className="flex justify-center"><span className="rounded-full bg-white/72 px-4 py-2 text-xs font-semibold text-on-surface-variant shadow-sm backdrop-blur-md">Dang tai tin nhan cu hon...</span></div> : null}{renderMessages(false)}{remoteTypingActive ? <div className="flex items-start"><div className="rounded-[20px] rounded-bl-md bg-white/68 px-4 py-3 text-on-surface shadow-sm backdrop-blur-md"><div className="flex items-center gap-1"><span className="h-2 w-2 animate-pulse rounded-full bg-primary/70" /><span className="h-2 w-2 animate-pulse rounded-full bg-primary/70 [animation-delay:150ms]" /><span className="h-2 w-2 animate-pulse rounded-full bg-primary/70 [animation-delay:300ms]" /></div><p className="mt-2 text-xs font-medium text-on-surface-variant">{conversation.peer?.displayName || 'Nguoi kia'} dang nhap...</p></div></div> : null}</div></div>
            <footer className="absolute bottom-4 left-4 right-4 z-20 md:bottom-8 md:left-6 md:right-6"><div className="flex items-center gap-3 rounded-[28px] bg-white/80 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-2xl"><button type="button" onClick={handlePickMedia} disabled={isComposerBusy} className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high/55 text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60" aria-label="Add attachment"><span className="material-symbols-outlined">add</span></button>{pendingMedia ? <div className="relative flex h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl bg-surface-container-highest">{pendingMedia.type === 'video' ? <><video className="h-full w-full object-cover" muted playsInline preload="metadata" src={pendingPreview.mediaUrl} /><div className="absolute inset-0 flex items-center justify-center bg-black/18"><span className="material-symbols-outlined rounded-full bg-white/90 p-1 text-[14px] text-on-surface">play_arrow</span></div></> : <img className="h-full w-full object-cover" alt={pendingMedia.fileName} src={pendingPreview.thumbnailUrl} />}<button type="button" onClick={() => setPendingMedia(null)} className="absolute -right-1 -top-1 rounded-full bg-inverse-surface p-0.5 text-white shadow-sm" aria-label="Remove attachment"><span className="material-symbols-outlined text-[14px]">close</span></button></div> : null}<div className="flex flex-1 items-center gap-3 rounded-full bg-surface-container-highest/60 px-5 py-3 transition-all focus-within:ring-2 focus-within:ring-primary/20"><textarea className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant/60" placeholder="Type a message..." value={draft} onChange={handleDraftChange} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSubmit(); } }} rows={1} style={{ fontSize: `${inputSize}px` }} /><button type="button" className="text-on-surface-variant transition-colors hover:text-primary" aria-label="Emoji"><span className="material-symbols-outlined">mood</span></button></div><button type="button" onClick={handleSubmit} disabled={isSendDisabled} className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Send message"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{isComposerBusy ? 'hourglass_top' : 'send'}</span></button></div></footer>
          </div>
        </>
      )}
    </section>
  );
};

export default ChatWindow;
