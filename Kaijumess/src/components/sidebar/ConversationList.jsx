import React from 'react';

import { getScaledFontSize } from '../../constants/appearance';
import { useAppearance } from '../../hooks/useAppearance';

const ConversationList = () => {
  const { fontScale } = useAppearance();

  const searchSize = getScaledFontSize(fontScale, 14, 13);
  const chipSize = getScaledFontSize(fontScale, 12, 11);
  const nameSize = getScaledFontSize(fontScale, 14, 13);
  const previewSize = getScaledFontSize(fontScale, 12, 11);
  const timeSize = getScaledFontSize(fontScale, 10, 10);

  return (
    <aside className="flex w-[360px] flex-shrink-0 flex-col bg-surface-container-low">
      <div className="p-6 pb-2">
        <div className="relative mb-6">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <span className="material-symbols-outlined text-[20px] text-outline">search</span>
          </div>
          <input
            className="w-full rounded-xl border-none bg-surface-container-highest py-3 pl-12 pr-4 text-sm outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/20"
            placeholder="Search conversations..."
            type="text"
            style={{ fontSize: `${searchSize}px` }}
          />
        </div>
        <div className="mb-4 flex gap-2">
          <button
            className="rounded-full bg-primary px-4 py-1.5 font-semibold text-on-primary"
            style={{ fontSize: `${chipSize}px` }}
          >
            All
          </button>
          <button
            className="rounded-full bg-surface-container-lowest px-4 py-1.5 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
            style={{ fontSize: `${chipSize}px` }}
          >
            Unread
          </button>
          <button
            className="rounded-full bg-surface-container-lowest px-4 py-1.5 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
            style={{ fontSize: `${chipSize}px` }}
          >
            Groups
          </button>
        </div>
      </div>
      <div className="hide-scrollbar flex-1 space-y-1 overflow-y-auto px-3">
        <button className="group flex w-full items-center gap-4 rounded-xl bg-surface-container-lowest p-4 transition-all">
          <div className="relative flex-shrink-0">
            <img
              className="h-12 w-12 rounded-full object-cover"
              alt="Avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUhsQ088O3g9ivysF6VcJppznJ0R1GWiWjtg7f0ETfoAlAz_sEbilndB5Nn-ysvstFtB1GHFaVHzxZGgDFW7jpeb6YMXP-RIksaGT60qsDrR10o2b1wLZVGNeklqSfC9Hdj32R0a0LS2fniuDMcNl7PJX40cJy31867mmJsnoVPWW_dVvgUIjmt1Ko9_GvOIRDNQrLeAuLUwIfypqll4s2aqeRYeUzoqUYqCjG7QfiWwS7_aBnR6oE-cU-bBtopH5oj-cP8Wa7t4GA"
            />
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-surface-container-lowest bg-secondary" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="mb-0.5 flex items-baseline justify-between">
              <span
                className="truncate font-bold text-on-surface"
                style={{ fontSize: `${nameSize}px` }}
              >
                Elena Rodriguez
              </span>
              <span
                className="font-semibold uppercase tracking-tighter text-primary"
                style={{ fontSize: `${timeSize}px` }}
              >
                Just Now
              </span>
            </div>
            <p
              className="truncate font-medium text-on-surface-variant"
              style={{ fontSize: `${previewSize}px` }}
            >
              Looking forward to seeing the final proposal!
            </p>
          </div>
        </button>

        <button className="group flex w-full items-center gap-4 rounded-xl p-4 transition-all hover:bg-surface-container-high">
          <div className="relative flex-shrink-0">
            <img
              className="h-12 w-12 rounded-full object-cover"
              alt="Avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZ21AEvS74vZ4Nx5jQx-WfR7i8r3Ja2BTaXXRR3YdKVWhSFEaqxbOkb_B6hMN_M7j9HqJM0mrFLSHl_9rZz1AQOI8-QQTIFTmmy6Y836ftsV2PFnCG9gQLpIevPXUyflEDjIg52Fl_audfYa3n4M0Xq_B5FWM5AIuzGeVxrzpbTtRXkgjVrsssCZTZ6JuhaujX8LUPAVWLUThOAGL7LUp3GicCpGPPG8Rgmu3fb3IghE_ObM6mjK2hSu-lhC7AsNWHBpE0vV9iZl-y"
            />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="mb-0.5 flex items-baseline justify-between">
              <span
                className="truncate font-bold text-on-surface"
                style={{ fontSize: `${nameSize}px` }}
              >
                Marcus Chen
              </span>
              <span
                className="uppercase tracking-tighter text-on-surface-variant"
                style={{ fontSize: `${timeSize}px` }}
              >
                14:22
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p
                className="truncate text-on-surface-variant"
                style={{ fontSize: `${previewSize}px` }}
              >
                The design system looks incredible.
              </p>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
                2
              </span>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default ConversationList;

