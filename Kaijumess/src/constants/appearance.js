export const APPEARANCE_STORAGE_KEY = 'kaijumess-appearance-settings';
export const MIN_FONT_SCALE = 12;
export const MAX_FONT_SCALE = 24;
export const DEFAULT_FONT_SCALE = 16;
export const CUSTOM_WALLPAPER_ID = 'custom';
export const MAX_CUSTOM_WALLPAPER_SIZE_BYTES = 1.5 * 1024 * 1024;
export const WALLPAPER_BLUR_NONE = 'none';
export const WALLPAPER_BLUR_SOFT = 'soft';
export const DEFAULT_WALLPAPER_BLUR = WALLPAPER_BLUR_NONE;

export const WALLPAPER_BLUR_OPTIONS = [
  {
    id: WALLPAPER_BLUR_NONE,
    label: 'No blur',
    blurPx: 0,
  },
  {
    id: WALLPAPER_BLUR_SOFT,
    label: 'Soft blur',
    blurPx: 18,
  },
];

export const WALLPAPER_PRESETS = [
  {
    id: 'sapphire',
    label: 'Sapphire',
    style: {
      background:
        'radial-gradient(circle at 25% 20%, rgba(130, 197, 255, 0.75), transparent 32%), linear-gradient(135deg, #0f2d57 0%, #1d4f91 38%, #4f7fda 100%)',
    },
  },
  {
    id: 'editorial-sand',
    label: 'Editorial Sand',
    style: {
      background: 'linear-gradient(135deg, #fff5eb 0%, #f0d4bb 48%, #f4ebe2 100%)',
    },
  },
  {
    id: 'forest-mist',
    label: 'Forest Mist',
    style: {
      background:
        'radial-gradient(circle at 50% 0%, rgba(229, 255, 240, 0.2), transparent 28%), linear-gradient(160deg, #15382b 0%, #275846 48%, #6f927a 100%)',
    },
  },
];

export const DEFAULT_WALLPAPER_ID = WALLPAPER_PRESETS[0].id;

const isValidDataUrl = (value) =>
  typeof value === 'string' && value.startsWith('data:image/');

export const clampFontScale = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_FONT_SCALE;
  }

  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(numericValue)));
};

export const isPresetWallpaper = (wallpaperId) =>
  WALLPAPER_PRESETS.some((item) => item.id === wallpaperId);

export const buildCustomWallpaperStyle = (imageUrl) => ({
  backgroundColor: '#dbe3ef',
  backgroundImage: `url("${imageUrl}")`,
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
});

export const isValidWallpaperBlur = (value) =>
  WALLPAPER_BLUR_OPTIONS.some((item) => item.id === value);

export const resolveWallpaperBlurOption = (wallpaperBlur) =>
  WALLPAPER_BLUR_OPTIONS.find((item) => item.id === wallpaperBlur) ??
  WALLPAPER_BLUR_OPTIONS[0];

export const buildWallpaperLayerStyle = ({ style, wallpaperBlur }) => {
  const blurOption = resolveWallpaperBlurOption(wallpaperBlur);

  return {
    ...style,
    filter: blurOption.blurPx > 0 ? `blur(${blurOption.blurPx}px)` : 'none',
    transform: blurOption.blurPx > 0 ? 'scale(1.08)' : 'none',
    transformOrigin: 'center',
  };
};

export const sanitizeAppearanceSettings = (value = {}) => {
  const customWallpaperDataUrl = isValidDataUrl(value.customWallpaperDataUrl)
    ? value.customWallpaperDataUrl
    : '';

  const wallpaperId =
    value.wallpaperId === CUSTOM_WALLPAPER_ID && customWallpaperDataUrl
      ? CUSTOM_WALLPAPER_ID
      : isPresetWallpaper(value.wallpaperId)
        ? value.wallpaperId
        : DEFAULT_WALLPAPER_ID;

  return {
    customWallpaperDataUrl,
    fontScale: clampFontScale(value.fontScale),
    wallpaperId,
    wallpaperBlur: isValidWallpaperBlur(value.wallpaperBlur)
      ? value.wallpaperBlur
      : DEFAULT_WALLPAPER_BLUR,
  };
};

export const resolveWallpaperOption = ({ customWallpaperDataUrl, wallpaperId }) => {
  if (wallpaperId === CUSTOM_WALLPAPER_ID && customWallpaperDataUrl) {
    return {
      id: CUSTOM_WALLPAPER_ID,
      label: 'Custom',
      style: buildCustomWallpaperStyle(customWallpaperDataUrl),
    };
  }

  return (
    WALLPAPER_PRESETS.find((item) => item.id === wallpaperId) ??
    WALLPAPER_PRESETS.find((item) => item.id === DEFAULT_WALLPAPER_ID)
  );
};

export const getScaledFontSize = (fontScale, baseSize, minimumSize = 0) => {
  const nextSize = (clampFontScale(fontScale) / DEFAULT_FONT_SCALE) * baseSize;
  return Math.max(minimumSize, Math.round(nextSize * 10) / 10);
};

