import React, { useMemo, useState } from 'react';
import { InfoCircleFilled } from '@ant-design/icons';

import { useLanguage } from '../../context/LanguageContext';

const Language = () => {
  const { language, languageOptions, setLanguage, t } = useLanguage();
  const [notice, setNotice] = useState(null);

  const currentLanguage = useMemo(
    () => languageOptions.find((item) => item.code === language) || languageOptions[0],
    [language, languageOptions],
  );

  return (
    <div className="space-y-6">
      {notice ? (
        <div className={`status-banner status-banner--${notice.type}`}>
          <span className="mt-0.5"><InfoCircleFilled /></span>
          <div className="text-sm font-medium leading-6">{notice.message}</div>
        </div>
      ) : null}

      <div className="rounded-[28px] bg-surface-container-lowest p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
          {t('settings.currentLanguage')}
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-on-surface">
          {currentLanguage.nativeLabel}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
          {t('settings.languageDesc')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {languageOptions.map((option) => {
          const isActive = option.code === language;

          return (
            <button
              key={option.code}
              type="button"
              onClick={async () => {
                await setLanguage(option.code);
                setNotice({ message: t('settings.saveLanguageSuccess'), type: 'success' });
              }}
              className={`rounded-[24px] border p-5 text-left transition-all ${isActive ? 'border-primary bg-primary/5 shadow-[0_14px_32px_rgba(0,88,188,0.12)]' : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-on-surface">{option.nativeLabel}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{option.label}</p>
                </div>
                {isActive ? <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Language;
