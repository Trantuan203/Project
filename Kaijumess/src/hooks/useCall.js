import { useCallback, useEffect, useRef, useState } from 'react';

import { getSocket } from '../services/socket';

const INITIAL_CALL_STATE = {
  callId: '',
  connectionState: 'new',
  conversationId: '',
  error: '',
  iceServers: [],
  isCameraEnabled: false,
  isMicMuted: false,
  localStream: null,
  peerAvatarUrl: '',
  peerId: '',
  peerLabel: '',
  phase: 'idle',
  remoteStream: null,
  type: 'audio',
};

const buildMediaConstraints = (type) => ({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
  video:
    type === 'video'
      ? {
          facingMode: 'user',
          height: { ideal: 720 },
          width: { ideal: 1280 },
        }
      : false,
});

const createIncomingSession = ({ conversation, payload }) => ({
  ...INITIAL_CALL_STATE,
  callId: payload.callId,
  conversationId: payload.conversationId,
  iceServers: Array.isArray(payload.iceServers) ? payload.iceServers : [],
  isCameraEnabled: payload.type === 'video',
  peerAvatarUrl: conversation?.avatarUrl || '',
  peerId: payload.callerId,
  peerLabel: conversation?.title || conversation?.peer?.displayName || 'Incoming call',
  phase: 'incoming',
  type: payload.type === 'video' ? 'video' : 'audio',
});

const createOutgoingSession = ({ conversation, localStream, type }) => ({
  ...INITIAL_CALL_STATE,
  conversationId: conversation.id,
  isCameraEnabled: type === 'video',
  localStream,
  peerAvatarUrl: conversation.avatarUrl || '',
  peerId: conversation.peer?.id || '',
  peerLabel: conversation.title || conversation.peer?.displayName || 'Call',
  phase: 'outgoing',
  type,
});

const createRtcSessionDescription = (description, type) => {
  if (!description) {
    return null;
  }

  if (typeof RTCSessionDescription === 'function') {
    return new RTCSessionDescription(description);
  }

  return {
    sdp: description.sdp,
    type: description.type || type,
  };
};

const stopStreamTracks = (stream) => {
  stream?.getTracks?.().forEach((track) => track.stop());
};

const useCall = ({ conversations, onFocusConversation }) => {
  const [callNotice, setCallNotice] = useState(null);
  const [callState, setCallState] = useState(INITIAL_CALL_STATE);
  const callStateRef = useRef(callState);
  const conversationsRef = useRef(conversations);
  const localStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const peerConnectionRef = useRef(null);
  const remoteStreamRef = useRef(null);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const clearCallNotice = useCallback(() => {
    setCallNotice(null);
  }, []);

  const setNotice = useCallback((message, type = 'info') => {
    setCallNotice({ message, type });
  }, []);

  const cleanupCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    stopStreamTracks(localStreamRef.current);
    stopStreamTracks(remoteStreamRef.current);

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceCandidatesRef.current = [];
    setCallState(INITIAL_CALL_STATE);
  }, []);

  const findConversationSnapshot = useCallback((conversationId) => {
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);

    if (conversation) {
      return conversation;
    }

    return {
      avatarUrl: '',
      id: conversationId,
      peer: null,
      title: 'Call',
    };
  }, []);

  const flushPendingIceCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection?.remoteDescription) {
      return;
    }

    while (pendingIceCandidatesRef.current.length > 0) {
      const nextCandidate = pendingIceCandidatesRef.current.shift();
      await peerConnection.addIceCandidate(new RTCIceCandidate(nextCandidate));
    }
  }, []);

  const createPeerConnection = useCallback(
    ({ callId, conversationId, iceServers, localStream, peerId }) => {
      if (peerConnectionRef.current) {
        return peerConnectionRef.current;
      }

      const socket = getSocket();
      const peerConnection = new RTCPeerConnection({
        iceServers: Array.isArray(iceServers) && iceServers.length > 0 ? iceServers : undefined,
        iceTransportPolicy: 'all',
      });

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.onconnectionstatechange = () => {
        const nextState = peerConnection.connectionState;

        setCallState((currentValue) =>
          currentValue.callId === callId
            ? {
                ...currentValue,
                connectionState: nextState,
                phase:
                  nextState === 'connected'
                    ? 'active'
                    : currentValue.phase === 'active'
                      ? 'active'
                      : 'connecting',
              }
            : currentValue,
        );

        if (nextState === 'failed') {
          setNotice('Call connection failed. WebRTC could not establish a stable route.', 'error');
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        socket?.emit('call:ice', {
          callId,
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
          conversationId,
          to: peerId,
        });
      };

      peerConnection.ontrack = (event) => {
        const [nextRemoteStream] = event.streams;
        const remoteStream = nextRemoteStream || remoteStreamRef.current || new MediaStream();

        if (!nextRemoteStream) {
          remoteStream.addTrack(event.track);
        }

        remoteStreamRef.current = remoteStream;
        setCallState((currentValue) =>
          currentValue.callId === callId
            ? {
                ...currentValue,
                remoteStream,
              }
            : currentValue,
        );
      };

      peerConnectionRef.current = peerConnection;
      return peerConnection;
    },
    [setNotice],
  );

  const requestLocalStream = useCallback(async (type) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support camera and microphone access.');
    }

    const localStream = await navigator.mediaDevices.getUserMedia(buildMediaConstraints(type));
    localStreamRef.current = localStream;
    return localStream;
  }, []);

  const startCall = useCallback(
    async (conversation, type) => {
      const socket = getSocket();

      if (!socket) {
        setNotice('Socket is not connected yet. Try again after the chat reconnects.', 'error');
        return;
      }

      if (!conversation?.isDirect || !conversation.peer?.id) {
        setNotice('Audio and video call currently support direct conversations only.', 'error');
        return;
      }

      if (callStateRef.current.phase !== 'idle') {
        setNotice('Finish the current call before starting another one.', 'info');
        return;
      }

      try {
        clearCallNotice();
        const localStream = await requestLocalStream(type);

        setCallState(createOutgoingSession({ conversation, localStream, type }));
        onFocusConversation?.(conversation.id);

        socket.emit('call:start', {
          conversationId: conversation.id,
          receiverId: conversation.peer.id,
          type,
        });
      } catch (error) {
        stopStreamTracks(localStreamRef.current);
        localStreamRef.current = null;
        setNotice(error.message || 'Could not access camera or microphone.', 'error');
      }
    },
    [clearCallNotice, onFocusConversation, requestLocalStream, setNotice],
  );

  const endCall = useCallback(() => {
    const socket = getSocket();
    const activeCall = callStateRef.current;

    if (!activeCall.callId) {
      cleanupCall();
      return;
    }

    if (activeCall.phase === 'incoming') {
      socket?.emit('call:reject', {
        callId: activeCall.callId,
        callerId: activeCall.peerId,
        conversationId: activeCall.conversationId,
      });
      cleanupCall();
      return;
    }

    socket?.emit('call:end', {
      callId: activeCall.callId,
      conversationId: activeCall.conversationId,
      peerId: activeCall.peerId,
    });

    cleanupCall();
  }, [cleanupCall]);

  const acceptCall = useCallback(async () => {
    const socket = getSocket();
    const activeCall = callStateRef.current;

    if (!socket || activeCall.phase !== 'incoming') {
      return;
    }

    try {
      clearCallNotice();
      const localStream = await requestLocalStream(activeCall.type);

      createPeerConnection({
        callId: activeCall.callId,
        conversationId: activeCall.conversationId,
        iceServers: activeCall.iceServers,
        localStream,
        peerId: activeCall.peerId,
      });

      setCallState((currentValue) => ({
        ...currentValue,
        connectionState: 'connecting',
        isCameraEnabled: currentValue.type === 'video',
        localStream,
        phase: 'connecting',
      }));
      onFocusConversation?.(activeCall.conversationId);

      socket.emit('call:accept', {
        callId: activeCall.callId,
        callerId: activeCall.peerId,
        conversationId: activeCall.conversationId,
      });
    } catch (error) {
      socket.emit('call:reject', {
        callId: activeCall.callId,
        callerId: activeCall.peerId,
        conversationId: activeCall.conversationId,
      });
      cleanupCall();
      setNotice(error.message || 'Could not access camera or microphone.', 'error');
    }
  }, [
    cleanupCall,
    clearCallNotice,
    createPeerConnection,
    onFocusConversation,
    requestLocalStream,
    setNotice,
  ]);

  const toggleMute = useCallback(() => {
    const localStream = localStreamRef.current;

    if (!localStream) {
      return;
    }

    const nextMuted = !callStateRef.current.isMicMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setCallState((currentValue) => ({
      ...currentValue,
      isMicMuted: nextMuted,
    }));
  }, []);

  const toggleCamera = useCallback(() => {
    const localStream = localStreamRef.current;
    const videoTracks = localStream?.getVideoTracks?.() || [];

    if (videoTracks.length === 0) {
      return;
    }

    const nextCameraEnabled = !callStateRef.current.isCameraEnabled;
    videoTracks.forEach((track) => {
      track.enabled = nextCameraEnabled;
    });

    setCallState((currentValue) => ({
      ...currentValue,
      isCameraEnabled: nextCameraEnabled,
    }));
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return undefined;
    }

    const handleCallStarted = (payload) => {
      setCallState((currentValue) =>
        currentValue.phase === 'outgoing' &&
        currentValue.conversationId === payload.conversationId &&
        currentValue.peerId === payload.receiverId
          ? {
              ...currentValue,
              callId: payload.callId,
              connectionState: 'calling',
              iceServers: Array.isArray(payload.iceServers) ? payload.iceServers : [],
            }
          : currentValue,
      );
    };

    const handleIncomingCall = (payload) => {
      if (callStateRef.current.phase !== 'idle') {
        socket.emit('call:busy', {
          callId: payload.callId,
          callerId: payload.callerId,
          conversationId: payload.conversationId,
        });
        return;
      }

      const conversation = findConversationSnapshot(payload.conversationId);
      clearCallNotice();
      setCallState(createIncomingSession({ conversation, payload }));
      onFocusConversation?.(payload.conversationId);

      socket.emit('call:ringing', {
        callId: payload.callId,
        callerId: payload.callerId,
        conversationId: payload.conversationId,
      });
    };

    const handleRinging = ({ callId }) => {
      setCallState((currentValue) =>
        currentValue.callId === callId
          ? {
              ...currentValue,
              connectionState: 'ringing',
              phase: 'ringing',
            }
          : currentValue,
      );
    };

    const handleAccepted = async ({ answeredBy, callId, conversationId }) => {
      const currentCall = callStateRef.current;

      if (currentCall.callId !== callId || currentCall.conversationId !== conversationId) {
        return;
      }

      try {
        const localStream = localStreamRef.current;

        if (!localStream) {
          throw new Error('Local media stream is no longer available.');
        }

        const peerConnection = createPeerConnection({
          callId,
          conversationId,
          iceServers: currentCall.iceServers,
          localStream,
          peerId: answeredBy,
        });

        setCallState((currentValue) => ({
          ...currentValue,
          connectionState: 'connecting',
          peerId: answeredBy,
          phase: 'connecting',
        }));

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('call:offer', {
          callId,
          conversationId,
          offer,
          to: answeredBy,
        });
      } catch (error) {
        setNotice(error.message || 'Could not negotiate the outgoing call.', 'error');
        cleanupCall();
      }
    };

    const handleRejected = ({ callId }) => {
      if (callStateRef.current.phase === 'idle') {
        return;
      }

      if (callStateRef.current.callId && callStateRef.current.callId !== callId) {
        return;
      }

      cleanupCall();
      setNotice('The call was declined.', 'info');
    };

    const handleBusy = ({ callId }) => {
      if (callStateRef.current.phase === 'idle') {
        return;
      }

      if (callStateRef.current.callId && callStateRef.current.callId !== callId) {
        return;
      }

      cleanupCall();
      setNotice('The other person is already on another call.', 'info');
    };

    const handleEnded = ({ callId }) => {
      if (callStateRef.current.phase === 'idle') {
        return;
      }

      if (callStateRef.current.callId && callStateRef.current.callId !== callId) {
        return;
      }

      cleanupCall();
      setNotice('Call ended.', 'info');
    };

    const handleCallError = ({ message }) => {
      if (callStateRef.current.phase === 'idle') {
        return;
      }

      cleanupCall();
      setNotice(message || 'Call failed.', 'error');
    };

    const handleOffer = async ({ callId, conversationId, from, offer }) => {
      try {
        const currentCall = callStateRef.current;

        if (currentCall.callId !== callId || currentCall.peerId !== from) {
          return;
        }

        const localStream = localStreamRef.current;

        if (!localStream) {
          throw new Error('Local media stream is no longer available.');
        }

        const peerConnection = createPeerConnection({
          callId,
          conversationId,
          iceServers: currentCall.iceServers,
          localStream,
          peerId: from,
        });

        await peerConnection.setRemoteDescription(
          createRtcSessionDescription(offer, 'offer'),
        );
        await flushPendingIceCandidates();

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        setCallState((currentValue) => ({
          ...currentValue,
          connectionState: 'connecting',
          phase: 'connecting',
        }));

        socket.emit('call:answer', {
          answer,
          callId,
          conversationId,
          to: from,
        });
      } catch (error) {
        setNotice(error.message || 'Could not process the incoming call offer.', 'error');
        cleanupCall();
      }
    };

    const handleAnswer = async ({ answer, callId }) => {
      try {
        if (callStateRef.current.callId !== callId || !peerConnectionRef.current) {
          return;
        }

        await peerConnectionRef.current.setRemoteDescription(
          createRtcSessionDescription(answer, 'answer'),
        );
        await flushPendingIceCandidates();
      } catch (error) {
        setNotice(error.message || 'Could not process the call answer.', 'error');
        cleanupCall();
      }
    };

    const handleIceCandidate = async ({ callId, candidate }) => {
      if (callStateRef.current.callId !== callId || !candidate) {
        return;
      }

      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      try {
        if (!peerConnection.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        setNotice(error.message || 'Could not apply ICE candidate.', 'error');
      }
    };

    socket.on('call:started', handleCallStarted);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:ringing', handleRinging);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:busy', handleBusy);
    socket.on('call:ended', handleEnded);
    socket.on('call:error', handleCallError);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice', handleIceCandidate);

    return () => {
      socket.off('call:started', handleCallStarted);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:ringing', handleRinging);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:busy', handleBusy);
      socket.off('call:ended', handleEnded);
      socket.off('call:error', handleCallError);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice', handleIceCandidate);
    };
  }, [
    cleanupCall,
    clearCallNotice,
    createPeerConnection,
    findConversationSnapshot,
    flushPendingIceCandidates,
    onFocusConversation,
    setNotice,
  ]);

  useEffect(() => () => {
    cleanupCall();
  }, [cleanupCall]);

  return {
    acceptCall,
    callNotice,
    callState,
    clearCallNotice,
    endCall,
    hasActiveCall: callState.phase !== 'idle',
    startAudioCall: (conversation) => startCall(conversation, 'audio'),
    startVideoCall: (conversation) => startCall(conversation, 'video'),
    toggleCamera,
    toggleMute,
  };
};

export default useCall;
