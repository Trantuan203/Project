import React, { useEffect, useRef } from 'react';

const formatConnectionLabel = (callState) => {
  if (callState.phase === 'incoming') {
    return 'Tap accept to join immediately.';
  }

  if (callState.phase === 'outgoing') {
    return 'Waiting for the other side to pick up.';
  }

  if (callState.phase === 'ringing') {
    return 'Ringing on the other side...';
  }

  if (callState.phase === 'connecting') {
    return 'Connecting media and verifying the best route...';
  }

  if (callState.phase === 'active') {
    return callState.connectionState === 'connected'
      ? 'Connected'
      : `Connection: ${callState.connectionState}`;
  }

  return 'Preparing call session...';
};

const getCallHeading = (callState) => {
  if (callState.phase === 'incoming') {
    return 'Incoming Call';
  }

  if (callState.phase === 'outgoing' || callState.phase === 'ringing') {
    return 'Calling';
  }

  return callState.type === 'video' ? 'Video Call' : 'Voice Call';
};

const getPeerInitials = (label) => {
  if (!label) {
    return 'KA';
  }

  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'KA';
  }

  return parts.map((part) => part[0]).join('').toUpperCase();
};

const attachStream = (element, stream) => {
  if (!element) {
    return;
  }

  if (element.srcObject !== stream) {
    element.srcObject = stream || null;
  }
};

const CallOverlay = ({
  callState,
  onAccept,
  onEnd,
  onToggleCamera,
  onToggleMute,
}) => {
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const hasLocalVideo = (callState.localStream?.getVideoTracks?.() || []).length > 0;
  const hasRemoteVideo = (callState.remoteStream?.getVideoTracks?.() || []).length > 0;
  const isIncoming = callState.phase === 'incoming';
  const isVideoCall = callState.type === 'video';
  const isActiveSession =
    callState.phase === 'active' ||
    callState.phase === 'connecting' ||
    callState.phase === 'outgoing' ||
    callState.phase === 'ringing';

  useEffect(() => {
    attachStream(localVideoRef.current, callState.localStream);
  }, [callState.localStream]);

  useEffect(() => {
    attachStream(remoteAudioRef.current, !hasRemoteVideo ? callState.remoteStream : null);
    attachStream(remoteVideoRef.current, hasRemoteVideo ? callState.remoteStream : null);
  }, [callState.remoteStream, hasRemoteVideo]);

  if (callState.phase === 'idle') {
    return null;
  }

  if (hasRemoteVideo) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-md" />

        <div className="relative mx-4 h-[min(760px,calc(100vh-2rem))] w-full max-w-6xl overflow-hidden rounded-[36px] bg-black shadow-[0_24px_80px_rgba(25,28,29,0.28)]">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/30" />

          <div className="relative flex h-full flex-col justify-between p-5 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-[28px] bg-black/35 px-5 py-4 text-white shadow-2xl backdrop-blur-xl">
                <span className="block text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
                  {getCallHeading(callState)}
                </span>
                <h2 className="mt-2 text-3xl font-black tracking-tight">{callState.peerLabel}</h2>
                <p className="mt-2 text-sm text-white/75">{formatConnectionLabel(callState)}</p>
              </div>

              <button
                type="button"
                onClick={onEnd}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur-xl transition-transform hover:scale-105"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {hasLocalVideo ? (
              <div className="pointer-events-none absolute bottom-32 right-5 overflow-hidden rounded-[28px] border border-white/15 bg-black/45 shadow-2xl md:bottom-36 md:right-8">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-36 w-24 object-cover md:h-48 md:w-36"
                />
              </div>
            ) : null}

            <div className="relative z-10 flex justify-center">
              <div className="flex items-center gap-4 rounded-full bg-black/35 px-5 py-4 shadow-2xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105 ${
                    callState.isMicMuted
                      ? 'bg-white text-on-surface'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {callState.isMicMuted ? 'mic_off' : 'mic'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onToggleCamera}
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105 ${
                    callState.isCameraEnabled
                      ? 'bg-white/10 text-white'
                      : 'bg-white text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {callState.isCameraEnabled ? 'videocam' : 'videocam_off'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onEnd}
                  className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-error text-on-error shadow-lg transition-transform hover:scale-105"
                >
                  <span className="material-symbols-outlined text-[28px]">call_end</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {!hasRemoteVideo && callState.remoteStream ? (
        <audio ref={remoteAudioRef} autoPlay playsInline />
      ) : null}

      <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-md" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-surface-container-lowest shadow-[0_12px_40px_rgba(25,28,29,0.06)]">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-secondary via-primary to-secondary opacity-50" />

        <div className="flex flex-col items-center px-8 py-12">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-primary/10 scale-150" />
            <div className="absolute inset-0 rounded-full bg-primary/5 scale-[2.2]" />

            {callState.peerAvatarUrl ? (
              <img
                className="relative h-32 w-32 rounded-full border-4 border-surface-container-lowest object-cover shadow-lg"
                src={callState.peerAvatarUrl}
                alt={callState.peerLabel}
              />
            ) : (
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-surface-container-lowest bg-primary-fixed text-4xl font-black text-on-primary-fixed shadow-lg">
                {getPeerInitials(callState.peerLabel)}
              </div>
            )}
          </div>

          <div className="mb-10 text-center">
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary">
              {getCallHeading(callState)}
            </span>
            <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-on-surface">
              {callState.peerLabel || 'Unknown contact'}
            </h1>
            <p className="font-medium text-on-surface-variant">
              {formatConnectionLabel(callState)}
            </p>
          </div>

          {isIncoming ? (
            <>
              <div className="mb-8 flex items-center gap-10">
                <div className="group flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={onEnd}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary text-on-tertiary shadow-lg shadow-tertiary/20 transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <span className="material-symbols-outlined !text-3xl">call_end</span>
                  </button>
                  <span className="text-xs font-bold uppercase tracking-tighter text-tertiary opacity-0 transition-opacity group-hover:opacity-100">
                    Decline
                  </span>
                </div>

                <div className="group flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={onAccept}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-lg shadow-secondary/20 transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <span className="material-symbols-outlined !text-3xl">
                      {isVideoCall ? 'videocam' : 'call'}
                    </span>
                  </button>
                  <span className="text-xs font-bold uppercase tracking-tighter text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                    Accept
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="group flex items-center gap-2 rounded-full px-6 py-3 text-on-surface-variant opacity-60"
              >
                <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-y-0.5">
                  chat_bubble
                </span>
                <span className="text-sm font-semibold">Reply with message</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4 rounded-full bg-surface-container-low px-5 py-4">
              <button
                type="button"
                onClick={onToggleMute}
                className={`inline-flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105 ${
                  callState.isMicMuted
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {callState.isMicMuted ? 'mic_off' : 'mic'}
                </span>
              </button>

              {isVideoCall ? (
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105 ${
                    callState.isCameraEnabled
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {callState.isCameraEnabled ? 'videocam' : 'videocam_off'}
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={onEnd}
                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-tertiary text-on-tertiary shadow-lg shadow-tertiary/20 transition-transform hover:scale-105"
              >
                <span className="material-symbols-outlined !text-3xl">call_end</span>
              </button>
            </div>
          )}
        </div>

        {isActiveSession && hasLocalVideo && !hasRemoteVideo ? (
          <div className="pointer-events-none absolute bottom-6 right-6 overflow-hidden rounded-[24px] border border-outline-variant bg-surface shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-28 w-20 object-cover"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CallOverlay;
