import React from 'react';

const VARIANT_STYLES = {
  compact: {
    content: 'flex items-center justify-around',
    icon: 'material-symbols-outlined',
    item: 'flex flex-col items-center justify-center p-3 transition-all active:scale-90',
    itemActive: 'rounded-2xl bg-blue-50 text-blue-600',
    itemInactive: 'text-zinc-400 hover:text-blue-500',
    label: '',
    showLabels: false,
  },
  messages: {
    content: 'flex items-center justify-around gap-2',
    icon: 'material-symbols-outlined mb-1 text-[20px]',
    item: 'flex min-w-[68px] flex-col items-center justify-center rounded-2xl px-4 py-2 transition-all',
    itemActive: 'bg-blue-50 text-blue-700',
    itemInactive: 'text-on-surface-variant hover:text-primary',
    label: 'text-[11px] font-semibold uppercase tracking-[0.14em]',
    showLabels: true,
  },
  settings: {
    content: 'flex items-center justify-around',
    icon: 'material-symbols-outlined mb-1',
    item: 'flex flex-col items-center justify-center px-3 py-1.5 transition-colors active:scale-90',
    itemActive: 'rounded-2xl bg-blue-50/50 text-blue-600',
    itemInactive: 'text-slate-400',
    label: 'text-[11px] font-medium uppercase tracking-wide',
    showLabels: true,
  },
};

const joinClasses = (...values) => values.filter(Boolean).join(' ');

const normalizeKey = (value) => {
  if (value === 'chats') {
    return 'chat';
  }

  return value;
};

const MobileBottomNav = ({
  activeKey = 'chat',
  className = '',
  items = [],
  style,
  variant = 'messages',
}) => {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.messages;
  const normalizedActiveKey = normalizeKey(activeKey);

  return (
    <nav className={className} style={style}>
      <div className={styles.content}>
        {items.map((item) => {
          const itemKey = normalizeKey(item.key);
          const isActive = itemKey === normalizedActiveKey;

          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={isActive ? 'page' : undefined}
              className={joinClasses(
                styles.item,
                isActive ? styles.itemActive : styles.itemInactive,
                item.className,
              )}
            >
              <span
                className={joinClasses(styles.icon, item.iconClassName)}
                style={{
                  fontVariationSettings:
                    isActive && item.fillWhenActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              {styles.showLabels ? <span className={styles.label}>{item.label}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
