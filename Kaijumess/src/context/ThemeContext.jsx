import React, { createContext, useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'kaijumess-theme-mode';
const ThemeContext = createContext(null);

const getSystemTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialThemeMode = () => {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return ['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'system';
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = (event) => setSystemTheme(event.matches ? 'dark' : 'light');

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncSystemTheme);
      return () => mediaQuery.removeEventListener('change', syncSystemTheme);
    }

    mediaQuery.addListener(syncSystemTheme);
    return () => mediaQuery.removeListener(syncSystemTheme);
  }, []);

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = themeMode;
    document.documentElement.style.colorScheme = resolvedTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [resolvedTheme, themeMode]);

  return (
    <ThemeContext.Provider
      value={{
        resolvedTheme,
        setThemeMode,
        systemTheme,
        themeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;

