import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  DeleteOutlined,
  InfoCircleFilled,
  PictureOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import {
  buildWallpaperLayerStyle,
  CUSTOM_WALLPAPER_ID,
  DEFAULT_FONT_SCALE,
  DEFAULT_WALLPAPER_BLUR,
  MAX_CUSTOM_WALLPAPER_SIZE_BYTES,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
  WALLPAPER_BLUR_OPTIONS,
  WALLPAPER_PRESETS,
  resolveWallpaperOption,
} from '../../constants/appearance';
import { useAppearance } from '../../hooks/useAppearance';
import { useTheme } from '../../hooks/useTheme';

const themeCards = [
  {
    key: 'light',
    label: 'Light',
    mobileIcon: 'light_mode',
    mobileLabel: 'Light',
    renderPreview: () => (
      <div className="absolute inset-0 bg-slate-50 p-4">
        <div className="flex h-full flex-col gap-2 rounded-[18px] bg-slate-100 p-3">
          <div className="h-2 w-20 rounded-full bg-slate-300" />
          <div className="h-10 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="flex justify-end">
            <div className="h-10 w-28 rounded-2xl bg-blue-500" />
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'dark',
    label: 'Dark',
    mobileIcon: 'dark_mode',
    mobileLabel: 'Dark',
    renderPreview: () => (
      <div className="absolute inset-0 bg-slate-950 p-4">
        <div className="flex h-full flex-col gap-2 rounded-[18px] bg-slate-900 p-3">
          <div className="h-2 w-20 rounded-full bg-slate-700" />
          <div className="h-10 rounded-2xl bg-slate-800" />
          <div className="flex justify-end">
            <div className="h-10 w-28 rounded-2xl bg-blue-600" />
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'system',
    label: 'System',
    mobileIcon: 'contrast',
    mobileLabel: 'Auto',
    renderPreview: () => (
      <>
        <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-50" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-slate-900" />
        <div className="absolute inset-0 flex items-center justify-center">
          <SettingOutlined className="text-4xl text-white/70 mix-blend-screen" />
        </div>
      </>
    ),
  },
];

const APP_ICON_OPTIONS = [
  {
    id: 'classic',
    label: 'Classic',
    fill: 1,
    wrapperClassName: 'bg-primary text-white shadow-lg shadow-primary/20',
  },
  { id: 'midnight', label: 'Midnight', fill: 1, wrapperClassName: 'bg-on-surface text-surface' },
  {
    id: 'neon',
    label: 'Neon',
    fill: 1,
    wrapperClassName: 'bg-gradient-to-tr from-secondary-container to-primary text-white',
  },
  {
    id: 'outline',
    label: 'Outline',
    fill: 0,
    wrapperClassName:
      'border border-outline-variant/30 bg-surface-container-highest text-outline',
  },
];

const STATUS_ICON = {
  error: <CloseCircleFilled />,
  info: <InfoCircleFilled />,
  success: <CheckCircleFilled />,
};

const getFontScaleBadgeLabel = (fontScale) => {
  if (fontScale <= DEFAULT_FONT_SCALE - 1) {
    return 'Compact';
  }
  if (fontScale >= DEFAULT_FONT_SCALE + 2) {
    return 'Large';
  }
  return 'Medium';
};

const MobileAppearance = ({
  draftCustomWallpaperDataUrl,
  draftFontScale,
  draftWallpaperBlur,
  draftWallpaperId,
  feedback,
  fileInputRef,
  handleAppIconSelect,
  handleClearCustomWallpaper,
  handleCustomWallpaperChange,
  handleFontScaleCommit,
  handleThemeModeChange,
  handleWallpaperBlurSelect,
  handleWallpaperSelect,
  openFilePicker,
  previewWallpaper,
  selectedAppIcon,
  setDraftFontScale,
  themeMode,
}) => (
  <section className="-mx-4 space-y-8 px-6 pb-8">
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleCustomWallpaperChange}
    />

    {feedback ? (
      <div className={`status-banner status-banner--${feedback.type}`}>
        <span className="mt-0.5">{STATUS_ICON[feedback.type]}</span>
        <div className="text-sm font-medium leading-6">{feedback.message}</div>
      </div>
    ) : null}

    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
          Theme Mode
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {themeCards.map((item) => {
          const isSelected = themeMode === item.key;
          const isDarkCard = item.key === 'dark';
          const isSystemCard = item.key === 'system';

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleThemeModeChange(item.key)}
              className="group"
            >
              <div
                className={`relative aspect-[3/4] rounded-xl border-2 p-4 transition-all active:scale-95 ${
                  isSelected
                    ? 'border-primary shadow-lg shadow-primary/10'
                    : 'border-transparent hover:border-outline-variant'
                } ${
                  isDarkCard
                    ? 'bg-inverse-surface'
                    : isSystemCard
                      ? 'bg-surface-container-high'
                      : 'bg-white'
                }`}
              >
                <div className="flex h-full flex-col items-center justify-center">
                  {isSystemCard ? (
                    <div className="relative mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
                      <div className="absolute inset-y-0 right-0 w-1/2 bg-slate-800" />
                      <span className="material-symbols-outlined relative z-10 text-on-surface">
                        {item.mobileIcon}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
                        isDarkCard
                          ? 'bg-slate-800 text-white'
                          : 'bg-surface-container-high text-primary'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontVariationSettings: item.key === 'light' ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        {item.mobileIcon}
                      </span>
                    </div>
                  )}

                  <span
                    className={`text-xs font-bold ${
                      isDarkCard ? 'text-white' : isSelected ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {item.mobileLabel}
                  </span>
                </div>

                {isSelected ? (
                  <span className="absolute right-2 top-2 material-symbols-outlined text-sm text-primary">
                    check_circle
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>

    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
          Chat Wallpaper
        </h2>

        <div className="flex items-center gap-3">
          {draftCustomWallpaperDataUrl ? (
            <button
              type="button"
              onClick={handleClearCustomWallpaper}
              className="text-xs font-bold text-on-surface-variant"
            >
              Clear
            </button>
          ) : null}

          <button
            type="button"
            onClick={openFilePicker}
            className="text-xs font-bold text-primary"
          >
            See All
          </button>
        </div>
      </div>

      <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-4 hide-scrollbar">
        {WALLPAPER_PRESETS.map((wallpaper) => {
          const isSelected = wallpaper.id === draftWallpaperId;

          return (
            <button
              key={wallpaper.id}
              type="button"
              onClick={() => handleWallpaperSelect(wallpaper.id)}
              className={`snap-start relative w-32 shrink-0 overflow-hidden rounded-xl border-2 shadow-sm transition-transform active:scale-95 ${
                isSelected ? 'border-white ring-2 ring-primary/20' : 'border-transparent'
              }`}
              style={wallpaper.style}
            >
              <div className="aspect-[9/16] w-full" />
              <div className="absolute inset-0 bg-black/10" />
              {isSelected ? (
                <span className="absolute right-2 top-2 material-symbols-outlined text-base text-white drop-shadow-sm">
                  check_circle
                </span>
              ) : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            if (draftCustomWallpaperDataUrl) {
              handleWallpaperSelect(CUSTOM_WALLPAPER_ID);
              return;
            }

            openFilePicker();
          }}
          className={`snap-start relative flex w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 transition-transform active:scale-95 ${
            draftWallpaperId === CUSTOM_WALLPAPER_ID
              ? 'border-white ring-2 ring-primary/20'
              : 'border-dashed border-outline-variant bg-surface-container-low'
          }`}
        >
          {draftCustomWallpaperDataUrl ? (
            <>
              <div
                className="absolute inset-0"
                style={
                  resolveWallpaperOption({
                    customWallpaperDataUrl: draftCustomWallpaperDataUrl,
                    wallpaperId: CUSTOM_WALLPAPER_ID,
                  }).style
                }
              />
              <div className="absolute inset-0 bg-black/10" />
              {draftWallpaperId === CUSTOM_WALLPAPER_ID ? (
                <span className="absolute right-2 top-2 material-symbols-outlined text-base text-white drop-shadow-sm">
                  check_circle
                </span>
              ) : null}
              <div className="relative z-10 flex aspect-[9/16] w-full items-end justify-center pb-4">
                <span className="rounded-full bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                  Custom
                </span>
              </div>
            </>
          ) : (
            <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-1">
              <span className="material-symbols-outlined text-on-surface-variant">
                add_photo_alternate
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant">Custom</span>
            </div>
          )}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {WALLPAPER_BLUR_OPTIONS.map((option) => {
          const isSelected = option.id === draftWallpaperBlur;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleWallpaperBlurSelect(option.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-on-surface-variant">
        Selected: <span className="font-semibold text-on-surface">{previewWallpaper.label}</span>
      </p>
    </section>

    <section>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
        App Icon
      </h2>

      <div className="rounded-[28px] bg-surface-container-low p-4">
        <div className="grid grid-cols-4 gap-2">
          {APP_ICON_OPTIONS.map((item) => {
            const isSelected = selectedAppIcon === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAppIconSelect(item.id)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform active:scale-90 ${item.wrapperClassName} ${
                    isSelected ? 'ring-2 ring-primary/18 ring-offset-2 ring-offset-surface-container-low' : ''
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: `'FILL' ${item.fill}` }}
                  >
                    chat_bubble
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    isSelected ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>

    <section className="rounded-[28px] bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
          Font Size
        </h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {getFontScaleBadgeLabel(draftFontScale)}
        </span>
      </div>

      <div className="mb-6 space-y-3 rounded-2xl bg-surface p-4">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-primary-fixed" />
          <div
            className="max-w-[80%] rounded-xl rounded-tl-none bg-surface-container-high p-3 text-on-surface"
            style={{ fontSize: `${draftFontScale}px`, lineHeight: 1.45 }}
          >
            How does the new font size look to you?
          </div>
        </div>

        <div className="flex items-start justify-end gap-2">
          <div
            className="max-w-[80%] rounded-xl rounded-tr-none bg-primary p-3 text-on-primary"
            style={{ fontSize: `${draftFontScale}px`, lineHeight: 1.45 }}
          >
            It looks perfect! Crisp and clear.
          </div>
          <div className="h-8 w-8 shrink-0 rounded-full bg-secondary-fixed" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs font-bold text-on-surface-variant">A</span>
        <input
          type="range"
          min={MIN_FONT_SCALE}
          max={MAX_FONT_SCALE}
          value={draftFontScale}
          onChange={(event) => setDraftFontScale(Number(event.target.value))}
          onMouseUp={() => handleFontScaleCommit()}
          onTouchEnd={() => handleFontScaleCommit()}
          onBlur={() => handleFontScaleCommit()}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary"
        />
        <span className="text-xl font-bold text-on-surface-variant">A</span>
      </div>
    </section>
  </section>
);
const DesktopAppearance = ({
  draftCustomWallpaperDataUrl,
  draftFontScale,
  draftWallpaperBlur,
  draftWallpaperId,
  feedback,
  fileInputRef,
  handleApply,
  handleClearCustomWallpaper,
  handleCustomWallpaperChange,
  handleDiscard,
  handleThemeModeChange,
  handleWallpaperBlurSelect,
  handleWallpaperSelect,
  hasPendingChanges,
  openFilePicker,
  previewWallpaper,
  resolvedTheme,
  setDraftFontScale,
  themeMode,
}) => (
  <section className="space-y-12 rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleCustomWallpaperChange}
    />

    <section>
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-on-surface">Display Theme</h2>
        <p className="text-sm text-on-surface-variant">
          Chon cach KaijuMess hien thi tren man hinh cua ban.
        </p>
      </div>

      <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
        Display Theme ap dung ngay khi bam, khong can doi den nut Apply Settings.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {themeCards.map((item) => {
          const isSelected = themeMode === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleThemeModeChange(item.key)}
              className="group text-left"
            >
              <div
                className={`relative aspect-[4/3] overflow-hidden rounded-[24px] border transition-all duration-200 ${
                  isSelected
                    ? 'border-primary ring-4 ring-primary/12'
                    : 'border-outline-variant hover:border-primary/50'
                }`}
              >
                {item.renderPreview()}
                {isSelected ? (
                  <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg">
                    <CheckCircleFilled />
                  </div>
                ) : null}
              </div>
              <p
                className={`mt-3 text-center text-sm ${
                  isSelected ? 'font-bold text-primary' : 'font-medium text-on-surface-variant'
                }`}
              >
                {item.label}
              </p>
            </button>
          );
        })}
      </div>
    </section>

    <section>
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-on-surface">Text Appearance</h2>
        <p className="text-sm text-on-surface-variant">
          Dieu chinh do lon chu de doc va chat de hon.
        </p>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-outline-variant/10 bg-surface-container-lowest p-6">
          <div className="mb-8 flex items-end justify-between">
            <span className="text-xs font-medium text-on-surface-variant">Aa</span>
            <span className="text-2xl font-bold text-on-surface">Aa</span>
          </div>

          <input
            type="range"
            min={MIN_FONT_SCALE}
            max={MAX_FONT_SCALE}
            value={draftFontScale}
            onChange={(event) => setDraftFontScale(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary"
          />

          <div className="mt-4 flex justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
              Compact
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
              Spacious
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-outline-variant/10 p-6">
          <div
            className="absolute inset-0"
            style={buildWallpaperLayerStyle({
              style: previewWallpaper.style,
              wallpaperBlur: draftWallpaperBlur,
            })}
          />
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface">
                A
              </div>
              <div
                className="max-w-[85%] rounded-2xl rounded-bl-sm bg-surface-container-lowest p-4 text-on-surface shadow-sm"
                style={{ fontSize: `${draftFontScale}px`, lineHeight: 1.55 }}
              >
                How does this font size look to you? I wanted something more editorial.
              </div>
            </div>

            <div className="flex justify-end">
              <div
                className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-primary to-primary-container p-4 text-on-primary shadow-sm"
                style={{ fontSize: `${draftFontScale}px`, lineHeight: 1.55 }}
              >
                It looks perfect. The legibility is significantly improved with this spacing.
              </div>
            </div>

            <div className="rounded-2xl bg-surface-container-lowest/80 px-4 py-3 text-sm text-on-surface-variant backdrop-blur">
              Preview hien tai dang o che do{' '}
              <span className="font-bold text-on-surface">
                {themeMode === 'system' ? `System (${resolvedTheme})` : themeMode}
              </span>{' '}
              voi co chu <span className="font-bold text-on-surface">{draftFontScale}px</span> va
              wallpaper <span className="font-bold text-on-surface">{previewWallpaper.label}</span>.
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-on-surface">Chat Wallpaper</h2>
          <p className="text-sm text-on-surface-variant">
            Chon nen cho vung chat de dung cam giac ban muon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openFilePicker}
            className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            Browse all
          </button>
          {draftCustomWallpaperDataUrl ? (
            <button
              type="button"
              onClick={handleClearCustomWallpaper}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:border-tertiary hover:text-tertiary"
            >
              <DeleteOutlined />
              Clear custom
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {WALLPAPER_PRESETS.map((wallpaper) => {
          const isSelected = wallpaper.id === draftWallpaperId;

          return (
            <button
              key={wallpaper.id}
              type="button"
              onClick={() => handleWallpaperSelect(wallpaper.id)}
              className={`group relative aspect-[3/4] overflow-hidden rounded-[24px] transition-all ${
                isSelected
                  ? 'ring-4 ring-primary/18 ring-offset-2 ring-offset-surface'
                  : 'hover:-translate-y-0.5 hover:shadow-lg'
              }`}
              style={wallpaper.style}
            >
              <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              {isSelected ? (
                <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg">
                  <CheckCircleFilled />
                </div>
              ) : null}
              <div className="absolute bottom-0 left-0 right-0 bg-black/18 px-4 py-3 text-left backdrop-blur-sm">
                <p className="text-sm font-bold text-white">{wallpaper.label}</p>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            if (draftCustomWallpaperDataUrl) {
              handleWallpaperSelect(CUSTOM_WALLPAPER_ID);
              return;
            }
            openFilePicker();
          }}
          className={`relative flex aspect-[3/4] flex-col items-center justify-center gap-3 overflow-hidden rounded-[24px] border-2 transition-colors ${
            draftWallpaperId === CUSTOM_WALLPAPER_ID
              ? 'border-primary ring-4 ring-primary/18 ring-offset-2 ring-offset-surface'
              : 'border-dashed border-outline-variant bg-surface-container-highest text-on-surface-variant hover:border-primary hover:text-primary'
          }`}
        >
          {draftCustomWallpaperDataUrl ? (
            <>
              <div
                className="absolute inset-0"
                style={
                  resolveWallpaperOption({
                    customWallpaperDataUrl: draftCustomWallpaperDataUrl,
                    wallpaperId: CUSTOM_WALLPAPER_ID,
                  }).style
                }
              />
              <div className="absolute inset-0 bg-black/20" />
              {draftWallpaperId === CUSTOM_WALLPAPER_ID ? (
                <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg">
                  <CheckCircleFilled />
                </div>
              ) : null}
              <div className="relative z-10 px-4 text-center text-white">
                <p className="text-sm font-bold">Custom wallpaper</p>
                <p className="mt-1 text-xs text-white/80">Bam Browse all de doi anh</p>
              </div>
            </>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
                <PictureOutlined className="text-xl" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.22em]">Custom</span>
              <PlusOutlined />
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-xs leading-5 text-on-surface-variant">
        Preset va custom wallpaper dang duoc gan voi tai khoan nay. Neu ban muon sync sang nhieu
        thiet bi, chi can dang nhap cung mot tai khoan va backend chung.
      </p>

      <div className="mt-6 rounded-[24px] border border-outline-variant/10 bg-surface-container-low p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold tracking-tight text-on-surface">Wallpaper Blur</h3>
          <p className="text-sm text-on-surface-variant">
            Chon giu nen chat ro hoac lam mo nhe de noi bong bong tin nhan.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {WALLPAPER_BLUR_OPTIONS.map((option) => {
            const isSelected = option.id === draftWallpaperBlur;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleWallpaperBlurSelect(option.id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>

    {feedback ? (
      <div className={`status-banner status-banner--${feedback.type}`}>
        <span className="mt-0.5">{STATUS_ICON[feedback.type]}</span>
        <div className="text-sm font-medium leading-6">{feedback.message}</div>
      </div>
    ) : null}

    <footer className="flex flex-col items-start justify-between gap-5 border-t border-outline-variant/20 pt-8 sm:flex-row sm:items-center">
      <div className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
        {hasPendingChanges ? 'Ban co thay doi chua ap dung' : 'Moi thay doi da duoc ap dung'}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!hasPendingChanges}
          className="rounded-xl px-6 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
        >
          Discard changes
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!hasPendingChanges}
          className="rounded-xl bg-gradient-to-br from-primary to-primary-container px-8 py-3 text-sm font-bold text-on-primary shadow-md transition-all hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-55"
        >
          Apply Settings
        </button>
      </div>
    </footer>
  </section>
);

const Appearance = () => {
  const fileInputRef = useRef(null);
  const {
    customWallpaperDataUrl,
    fontScale: appliedFontScale,
    setAppearanceSettings,
    wallpaperBlur: appliedWallpaperBlur,
    wallpaperId: appliedWallpaperId,
  } = useAppearance();
  const { resolvedTheme, setThemeMode, themeMode } = useTheme();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [draftFontScale, setDraftFontScale] = useState(appliedFontScale ?? DEFAULT_FONT_SCALE);
  const [draftWallpaperBlur, setDraftWallpaperBlur] = useState(
    appliedWallpaperBlur ?? DEFAULT_WALLPAPER_BLUR,
  );
  const [draftWallpaperId, setDraftWallpaperId] = useState(appliedWallpaperId);
  const [draftCustomWallpaperDataUrl, setDraftCustomWallpaperDataUrl] =
    useState(customWallpaperDataUrl);
  const [selectedAppIcon, setSelectedAppIcon] = useState(APP_ICON_OPTIONS[0].id);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
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

  const previewWallpaper = useMemo(
    () =>
      resolveWallpaperOption({
        customWallpaperDataUrl: draftCustomWallpaperDataUrl,
        wallpaperId: draftWallpaperId,
      }),
    [draftCustomWallpaperDataUrl, draftWallpaperId],
  );

  const hasPendingChanges =
    draftFontScale !== appliedFontScale ||
    draftWallpaperBlur !== appliedWallpaperBlur ||
    draftWallpaperId !== appliedWallpaperId ||
    draftCustomWallpaperDataUrl !== customWallpaperDataUrl;

  const applyAppearanceDraft = ({
    customWallpaperDataUrl: nextCustomWallpaperDataUrl = draftCustomWallpaperDataUrl,
    fontScale: nextFontScale = draftFontScale,
    wallpaperBlur: nextWallpaperBlur = draftWallpaperBlur,
    wallpaperId: nextWallpaperId = draftWallpaperId,
  } = {}) => {
    setAppearanceSettings({
      customWallpaperDataUrl: nextCustomWallpaperDataUrl,
      fontScale: nextFontScale,
      wallpaperBlur: nextWallpaperBlur,
      wallpaperId: nextWallpaperId,
    });
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const handleThemeModeChange = (nextThemeMode) => {
    setThemeMode(nextThemeMode);
    setFeedback({ message: 'Display Theme da duoc ap dung ngay.', type: 'success' });
  };

  const handleWallpaperSelect = (nextWallpaperId) => {
    setDraftWallpaperId(nextWallpaperId);
    setFeedback(null);
    if (isMobileViewport) {
      applyAppearanceDraft({ wallpaperId: nextWallpaperId });
    }
  };

  const handleWallpaperBlurSelect = (nextWallpaperBlur) => {
    setDraftWallpaperBlur(nextWallpaperBlur);
    if (isMobileViewport) {
      applyAppearanceDraft({ wallpaperBlur: nextWallpaperBlur });
    }
  };

  const handleCustomWallpaperChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFeedback({ message: 'Chi ho tro file anh cho custom wallpaper.', type: 'error' });
      return;
    }
    if (file.size > MAX_CUSTOM_WALLPAPER_SIZE_BYTES) {
      setFeedback({
        message: 'Anh custom vuot qua gioi han 1.5MB de giu payload sync gon tren tai khoan.',
        type: 'error',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setFeedback({ message: 'Khong doc duoc anh da chon. Thu file khac.', type: 'error' });
        return;
      }
      setDraftCustomWallpaperDataUrl(reader.result);
      setDraftWallpaperId(CUSTOM_WALLPAPER_ID);
      if (isMobileViewport) {
        applyAppearanceDraft({
          customWallpaperDataUrl: reader.result,
          wallpaperId: CUSTOM_WALLPAPER_ID,
        });
        setFeedback({ message: 'Custom wallpaper da duoc ap dung.', type: 'success' });
        return;
      }
      setFeedback({
        message: 'Anh custom da duoc nap. Bam Apply Settings de ap dung.',
        type: 'info',
      });
    };
    reader.onerror = () => {
      setFeedback({ message: 'Khong tai duoc anh custom. Thu lai file khac.', type: 'error' });
    };
    reader.readAsDataURL(file);
  };

  const handleDiscard = () => {
    setDraftFontScale(appliedFontScale ?? DEFAULT_FONT_SCALE);
    setDraftWallpaperBlur(appliedWallpaperBlur ?? DEFAULT_WALLPAPER_BLUR);
    setDraftWallpaperId(appliedWallpaperId);
    setDraftCustomWallpaperDataUrl(customWallpaperDataUrl);
    setFeedback(null);
  };

  const handleApply = () => {
    if (draftWallpaperId === CUSTOM_WALLPAPER_ID && !draftCustomWallpaperDataUrl) {
      setFeedback({
        message: 'Ban can chon anh truoc khi ap dung custom wallpaper.',
        type: 'error',
      });
      return;
    }
    setAppearanceSettings({
      customWallpaperDataUrl: draftCustomWallpaperDataUrl,
      fontScale: draftFontScale,
      wallpaperBlur: draftWallpaperBlur,
      wallpaperId: draftWallpaperId,
    });
    setFeedback({
      message: 'Text size, wallpaper va blur da duoc ap dung va synced theo tai khoan.',
      type: 'success',
    });
  };

  const handleClearCustomWallpaper = () => {
    const nextWallpaperId =
      draftWallpaperId === CUSTOM_WALLPAPER_ID ? WALLPAPER_PRESETS[0].id : draftWallpaperId;
    setDraftCustomWallpaperDataUrl('');
    setDraftWallpaperId(nextWallpaperId);
    if (isMobileViewport) {
      applyAppearanceDraft({ customWallpaperDataUrl: '', wallpaperId: nextWallpaperId });
      setFeedback({ message: 'Custom wallpaper da duoc xoa.', type: 'info' });
      return;
    }
    setFeedback({
      message: 'Custom wallpaper da duoc xoa khoi ban nhap hien tai.',
      type: 'info',
    });
  };

  const handleFontScaleCommit = (nextFontScale = draftFontScale) => {
    if (!isMobileViewport) {
      return;
    }
    applyAppearanceDraft({ fontScale: nextFontScale });
  };

  const handleAppIconSelect = (nextAppIcon) => {
    setSelectedAppIcon(nextAppIcon);
    setFeedback({
      message:
        'App Icon tren web hien dang la preview giao dien. Neu dong goi PWA hoac native, phan nay co the map sang icon that.',
      type: 'info',
    });
  };

  const sharedProps = {
    feedback,
    fileInputRef,
    draftCustomWallpaperDataUrl,
    draftFontScale,
    draftWallpaperBlur,
    draftWallpaperId,
    handleApply,
    handleClearCustomWallpaper,
    handleCustomWallpaperChange,
    handleDiscard,
    handleFontScaleCommit,
    handleThemeModeChange,
    handleWallpaperBlurSelect,
    handleWallpaperSelect,
    hasPendingChanges,
    openFilePicker,
    previewWallpaper,
    resolvedTheme,
    selectedAppIcon,
    setDraftFontScale,
    themeMode,
    handleAppIconSelect,
  };

  return isMobileViewport ? <MobileAppearance {...sharedProps} /> : <DesktopAppearance {...sharedProps} />;
};

export default Appearance;
