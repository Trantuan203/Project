import React from 'react';

import { getScaledFontSize } from '../../constants/appearance';
import { useAppearance } from '../../hooks/useAppearance';

const DetailsPanel = () => {
  const { fontScale } = useAppearance();

  const titleSize = getScaledFontSize(fontScale, 20, 18);
  const subtitleSize = getScaledFontSize(fontScale, 14, 12);
  const actionLabelSize = getScaledFontSize(fontScale, 10, 10);
  const sectionTitleSize = getScaledFontSize(fontScale, 12, 11);
  const itemSize = getScaledFontSize(fontScale, 14, 13);
  const itemMetaSize = getScaledFontSize(fontScale, 12, 11);

  return (
    <aside className="flex w-[320px] flex-shrink-0 flex-col border-l border-outline-variant/10 bg-surface-container-high">
      <div className="flex flex-col items-center border-b border-surface-container-highest p-8 text-center">
        <div className="mb-4 h-24 w-24 overflow-hidden rounded-3xl shadow-xl">
          <img
            className="h-full w-full object-cover"
            alt="Profile"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCE81VLyj_Lf87UU-e3ZE7hAAdyktyLIJpmqZRrrFLT2Zbl1UVhS5vGAVOtxdau7SDQ5UBN2KhidQky6a4X3XF6tC80CK7eHPVAKCeSwp17dw-0kjlwir5lzouhtlXWg5OvO9jURWxA9RXsWBVAz3Q1pqWPzXVSgfow3Of0p6rpSc2mlMOiHg5NtR6Cd3IXAo3NIaRRCwQ8yPg0WXECgEwrDyGYWMH7cvbcoJ9zRyiryTMt957mBDyTvpR3dFir7Y6h5Ex1i5XdbXuS"
          />
        </div>
        <h3 className="font-bold text-on-surface" style={{ fontSize: `${titleSize}px` }}>
          Elena Rodriguez
        </h3>
        <p className="mt-1 text-on-surface-variant" style={{ fontSize: `${subtitleSize}px` }}>
          Senior Art Director
        </p>

        <div className="mt-6 flex gap-4">
          <button className="group flex flex-col items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-lowest text-on-surface-variant transition-all group-hover:text-primary">
              <span className="material-symbols-outlined">notifications_off</span>
            </div>
            <span
              className="font-bold uppercase text-on-surface-variant"
              style={{ fontSize: `${actionLabelSize}px` }}
            >
              Mute
            </span>
          </button>
          <button className="group flex flex-col items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-lowest text-on-surface-variant transition-all group-hover:text-primary">
              <span className="material-symbols-outlined">archive</span>
            </div>
            <span
              className="font-bold uppercase text-on-surface-variant"
              style={{ fontSize: `${actionLabelSize}px` }}
            >
              Archive
            </span>
          </button>
          <button className="group flex flex-col items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-lowest text-on-surface-variant transition-all group-hover:text-tertiary">
              <span className="material-symbols-outlined">block</span>
            </div>
            <span
              className="font-bold uppercase text-on-surface-variant"
              style={{ fontSize: `${actionLabelSize}px` }}
            >
              Block
            </span>
          </button>
        </div>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-6 py-6">
        <div>
          <h4
            className="mb-4 font-bold uppercase tracking-widest text-outline"
            style={{ fontSize: `${sectionTitleSize}px` }}
          >
            Settings & Privacy
          </h4>
          <div className="space-y-1">
            <button className="flex w-full items-center justify-between rounded-xl p-3 transition-colors hover:bg-surface-container-highest">
              <span className="font-medium" style={{ fontSize: `${itemSize}px` }}>
                Disappearing Messages
              </span>
              <span
                className="font-bold text-on-surface-variant"
                style={{ fontSize: `${itemMetaSize}px` }}
              >
                Off
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DetailsPanel;

