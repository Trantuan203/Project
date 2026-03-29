import React, { createContext, useEffect, useState } from 'react';

import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_FONT_SCALE,
  DEFAULT_WALLPAPER_ID,
  resolveWallpaperOption,
  sanitizeAppearanceSettings,
} from '../constants/appearance';

const AppearanceContext = createContext(null);

const getDefaultAppearanceSettings = () =>
  sanitizeAppearanceSettings({
    fontScale: DEFAULT_FONT_SCALE,
    wallpaperId: DEFAULT_WALLPAPER_ID,
  });

const getInitialAppearanceSettings = () => {
  if (typeof window === 'undefined') {
    return getDefaultAppearanceSettings();
  }

  try {
    const storedValue = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);

    if (!storedValue) {
      return getDefaultAppearanceSettings();
    }

    return sanitizeAppearanceSettings(JSON.parse(storedValue));
  } catch {
    return getDefaultAppearanceSettings();
  }
};

export const AppearanceProvider = ({ children }) => {
  const [appearanceSettings, setAppearanceSettingsState] = useState(getInitialAppearanceSettings);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-font-scale',
      String(appearanceSettings.fontScale),
    );
    document.documentElement.style.setProperty(
      '--app-font-scale-ratio',
      String(appearanceSettings.fontScale / DEFAULT_FONT_SCALE),
    );

    try {
      window.localStorage.setItem(
        APPEARANCE_STORAGE_KEY,
        JSON.stringify(appearanceSettings),
      );
    } catch {
      // Keep in-memory settings even if local storage rejects them.
    }
  }, [appearanceSettings]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== APPEARANCE_STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setAppearanceSettingsState(getDefaultAppearanceSettings());
        return;
      }

      try {
        setAppearanceSettingsState(sanitizeAppearanceSettings(JSON.parse(event.newValue)));
      } catch {
        setAppearanceSettingsState(getDefaultAppearanceSettings());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setAppearanceSettings = (nextValue) => {
    setAppearanceSettingsState((currentValue) =>
      sanitizeAppearanceSettings(
        typeof nextValue === 'function' ? nextValue(currentValue) : nextValue,
      ),
    );
  };

  const resolvedWallpaper = resolveWallpaperOption(appearanceSettings);

  return (
    <AppearanceContext.Provider
      value={{
        ...appearanceSettings,
        setAppearanceSettings,
        wallpaperLabel: resolvedWallpaper.label,
        wallpaperStyle: resolvedWallpaper.style,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
};

export default AppearanceContext;

