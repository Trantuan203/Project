import React, { createContext, useEffect, useState } from 'react';

import {
  APPEARANCE_STORAGE_KEY,
  buildWallpaperLayerStyle,
  DEFAULT_FONT_SCALE,
  DEFAULT_WALLPAPER_BLUR,
  DEFAULT_WALLPAPER_ID,
  resolveWallpaperBlurOption,
  resolveWallpaperOption,
  sanitizeAppearanceSettings,
} from '../constants/appearance';
import { useAuth } from '../hooks/useAuth';
import { updateSettingsSection } from '../services/settings';

const AppearanceContext = createContext(null);

const getDefaultAppearanceSettings = () =>
  sanitizeAppearanceSettings({
    fontScale: DEFAULT_FONT_SCALE,
    wallpaperBlur: DEFAULT_WALLPAPER_BLUR,
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
  const { currentUser, updateCurrentUserPreferences } = useAuth();
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
    if (!currentUser?.id) {
      return;
    }

    setAppearanceSettingsState(
      sanitizeAppearanceSettings(currentUser.preferences?.appearance || getDefaultAppearanceSettings()),
    );
  }, [currentUser?.id, currentUser?.preferences?.appearance]);

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
    setAppearanceSettingsState((currentValue) => {
      const nextSettings = sanitizeAppearanceSettings(
        typeof nextValue === 'function' ? nextValue(currentValue) : nextValue,
      );

      if (currentUser?.id) {
        void updateSettingsSection('appearance', nextSettings)
          .then((payload) => {
            updateCurrentUserPreferences(
              'appearance',
              payload.preferences?.appearance || nextSettings,
            );
          })
          .catch(() => {
            // Keep local appearance changes even if sync is temporarily unavailable.
          });
      }

      return nextSettings;
    });
  };

  const resolvedWallpaper = resolveWallpaperOption(appearanceSettings);
  const resolvedWallpaperBlur = resolveWallpaperBlurOption(appearanceSettings.wallpaperBlur);

  return (
    <AppearanceContext.Provider
      value={{
        ...appearanceSettings,
        setAppearanceSettings,
        wallpaperBlurLabel: resolvedWallpaperBlur.label,
        wallpaperLabel: resolvedWallpaper.label,
        wallpaperStyle: buildWallpaperLayerStyle({
          style: resolvedWallpaper.style,
          wallpaperBlur: appearanceSettings.wallpaperBlur,
        }),
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
};

export default AppearanceContext;

