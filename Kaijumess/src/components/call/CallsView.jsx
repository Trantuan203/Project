import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useLanguage } from '../../context/LanguageContext';
import { fetchCalls } from '../../services/chat';

const CALLS_PAGE_LIMIT = 15;

const formatCallTime = (value) => {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatDuration = (value, t) => {
  if (!Number.isFinite(value) || value <= 0) {
    return t('calls.noDuration');
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  if (!minutes) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

const getStatusTone = (call) => {
  if (call.status === 'ended') {
    return call.direction === 'incoming'
      ? 'bg-secondary/12 text-on-secondary-container'
      : 'bg-primary/12 text-primary';
  }

  if (call.status === 'missed' || call.status === 'rejected' || call.status === 'busy') {
    return 'bg-error/10 text-error';
  }

  return 'bg-surface-container-high text-on-surface-variant';
};

const getStatusLabel = (call, t) => {
  if (call.status === 'ended') {
    return call.direction === 'incoming' ? t('calls.incomingStatus') : t('calls.outgoingStatus');
  }

  if (call.status === 'missed') {
    return t('calls.missed');
  }

  if (call.status === 'rejected') {
    return t('calls.rejected');
  }

  if (call.status === 'busy') {
    return t('calls.busy');
  }

  return call.status;
};

const CallsView = ({ onBack, onOpenConversation }) => {
  const { t } = useLanguage();
  const [calls, setCalls] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const loadCalls = useCallback(
    async ({ append = false, offset = 0 } = {}) => {
      const nextOffset = append ? offset : 0;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setNotice('');
      }

      try {
        const payload = await fetchCalls({
          date: dateFilter,
          limit: CALLS_PAGE_LIMIT,
          offset: nextOffset,
          query,
        });
        const nextCalls = Array.isArray(payload.calls) ? payload.calls : [];

        setCalls((currentValue) => (append ? [...currentValue, ...nextCalls] : nextCalls));
        setHasMore(Boolean(payload.pageInfo?.hasMore));
      } catch (error) {
        if (!append) {
          setCalls([]);
        }

        setNotice(error.message || t('calls.loading'));
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [dateFilter, query, t],
  );

  useEffect(() => {
    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      if (isCancelled) {
        return;
      }

      await loadCalls();
    }, 220);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [dateFilter, loadCalls, query]);

  const handleScroll = useCallback(
    (event) => {
      if (!hasMore || isLoading || isLoadingMore) {
        return;
      }

      const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;

      if (scrollHeight - scrollTop - clientHeight < 160) {
        loadCalls({ append: true, offset: calls.length });
      }
    },
    [calls.length, hasMore, isLoading, isLoadingMore, loadCalls],
  );

  const summaryText = useMemo(() => {
    if (query.trim() || dateFilter) {
      return t('calls.summaryFiltered');
    }

    return t('calls.summaryDefault');
  }, [dateFilter, query, t]);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-surface">
      <header className="border-b border-surface-container-high bg-surface-bright/80 px-6 py-5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high md:hidden"
                aria-label="Back to chats"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            ) : null}

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-on-surface-variant">
                {t('calls.recentLabel')}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-on-surface">
                {t('calls.title')}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
                {summaryText}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-[240px] items-center gap-3 rounded-full bg-surface-container-highest px-4 py-3">
              <span className="material-symbols-outlined text-[20px] text-outline">search</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('calls.searchPlaceholder')}
                className="w-full border-none bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
              />
            </label>

            <label className="flex items-center gap-3 rounded-full bg-surface-container-highest px-4 py-3">
              <span className="material-symbols-outlined text-[20px] text-outline">calendar_month</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="border-none bg-transparent text-sm text-on-surface outline-none"
              />
            </label>
          </div>
        </div>
      </header>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-6 py-6" onScroll={handleScroll}>
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {notice ? (
            <div className="rounded-[24px] bg-error/10 p-5 text-sm text-error shadow-sm">
              {notice}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">
              {t('calls.loading')}
            </div>
          ) : calls.length === 0 ? (
            <div className="rounded-[24px] bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">
              {t('calls.empty')}
            </div>
          ) : (
            calls.map((call) => (
              <button
                key={call.id}
                type="button"
                onClick={() => onOpenConversation?.(call.conversationId)}
                className="w-full rounded-[28px] bg-surface-container-lowest p-5 text-left shadow-[0_12px_30px_rgba(25,28,29,0.06)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-base font-black text-on-primary-fixed">
                    {call.peer?.avatarUrl ? (
                      <img
                        src={call.peer.avatarUrl}
                        alt={call.conversationTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      call.conversationTitle.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="truncate text-lg font-bold text-on-surface">
                          {call.conversationTitle}
                        </h3>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {formatCallTime(call.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${getStatusTone(call)}`}>
                          {getStatusLabel(call, t)}
                        </span>
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                          {call.type}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">
                          {call.type === 'video' ? 'videocam' : 'call'}
                        </span>
                        {call.direction === 'incoming' ? t('calls.incoming') : t('calls.outgoing')}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        {formatDuration(call.durationSeconds, t)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">forum</span>
                        {t('calls.openConversation')}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}

          {isLoadingMore ? (
            <div className="rounded-[24px] bg-surface-container-lowest p-4 text-center text-sm text-on-surface-variant shadow-sm">
              {t('calls.loadingMore')}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CallsView;
