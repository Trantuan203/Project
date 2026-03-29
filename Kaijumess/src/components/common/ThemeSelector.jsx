import React from 'react';

import { useTheme } from '../../hooks/useTheme';

const themeOptions = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Theo máy' },
];

const ThemeSelector = ({ className = '' }) => {
  const { resolvedTheme, setThemeMode, themeMode } = useTheme();

  return (
    <div className={`theme-selector ${className}`.trim()}>
      <div className="flex items-center gap-2 px-1.5 py-1">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            resolvedTheme === 'dark' ? 'bg-secondary-container' : 'bg-primary'
          }`}
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
          Giao diện
        </span>
      </div>

      <div className="flex items-center gap-1">
        {themeOptions.map((option) => {
          const isActive = option.value === themeMode;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setThemeMode(option.value)}
              aria-pressed={isActive}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-[0_12px_24px_rgb(var(--color-primary)/0.24)]'
                  : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeSelector;
