import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightOutlined,
  CloseOutlined,
  DatabaseOutlined,
  EyeOutlined,
  InfoCircleFilled,
  LockOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';

import {
  getPasswordChecklist,
  validateConfirmPassword,
  validatePassword,
} from '../../services/authValidation';
import {
  changePassword,
  generateNewBackupCodes,
  readStoredTwoFactorSettings,
  updateStoredTwoFactorSettings,
} from '../../services/security';
import { updateSettingsSection } from '../../services/settings';
import { useAuth } from '../../hooks/useAuth';

const PRIVACY_STORAGE_KEY = 'kaijumess-privacy-settings';

const profilePhotoOptions = ['Everyone', 'My Contacts', 'Nobody'];
const groupInvitationOptions = ['Everyone', 'My Contacts', 'Nobody'];

const blockedContactSeed = [
  ['Julian Sterling', 'Blocked Jun 12'],
  ['Elena Vance', 'Blocked May 30'],
  ['Marcus Chen', 'Blocked May 15'],
  ['Alex Rivera', 'Blocked Apr 22'],
  ['Sarah Jenkins', 'Blocked Apr 02'],
  ['David Thorne', 'Blocked Mar 18'],
  ['Naomi Wattson', 'Blocked Mar 05'],
  ['Tom Hiddles', 'Blocked Feb 24'],
  ['Sia Kovic', 'Blocked Feb 12'],
  ['Liam Neeson', 'Blocked Feb 01'],
  ['Rachel Zane', 'Blocked Jan 20'],
  ['Harvey Specter', 'Blocked Jan 05'],
];

const blockedAvatarTones = [
  'bg-primary-fixed text-on-primary-fixed-variant',
  'bg-secondary-container/35 text-on-secondary-container',
  'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'bg-surface-container-high text-on-surface',
];

const storageBreakdown = [
  {
    colorClass: 'bg-primary',
    label: 'Media',
    value: '32.4 GB',
  },
  {
    colorClass: 'bg-secondary',
    label: 'Documents',
    value: '8.2 GB',
  },
  {
    colorClass: 'bg-tertiary',
    label: 'Messages',
    value: '1.5 GB',
  },
  {
    colorClass: 'bg-outline-variant',
    label: 'Free Space',
    value: '7.2 GB',
  },
];

const getInitials = (fullName) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const createInitialBlockedContacts = () =>
  blockedContactSeed.map(([name, blockedAt], index) => ({
    blockedAt,
    id: `blocked-${index + 1}`,
    name,
    toneClass: blockedAvatarTones[index % blockedAvatarTones.length],
  }));

const defaultPrivacyState = {
  blockedContacts: createInitialBlockedContacts(),
  groupInvitationVisibility: 'My Contacts',
  profilePhotoVisibility: 'Everyone',
};

const readStoredPrivacyState = () => {
  if (typeof window === 'undefined') {
    return defaultPrivacyState;
  }

  try {
    const rawValue = window.localStorage.getItem(PRIVACY_STORAGE_KEY);

    if (!rawValue) {
      return defaultPrivacyState;
    }

    const parsedValue = JSON.parse(rawValue);

    return {
      ...defaultPrivacyState,
      ...parsedValue,
      blockedContacts: Array.isArray(parsedValue.blockedContacts)
        ? parsedValue.blockedContacts
        : defaultPrivacyState.blockedContacts,
    };
  } catch {
    return defaultPrivacyState;
  }
};

const sanitizePrivacyState = (value = {}) => ({
  ...defaultPrivacyState,
  ...value,
  blockedContacts: Array.isArray(value.blockedContacts)
    ? value.blockedContacts
    : defaultPrivacyState.blockedContacts,
});

const sanitizeTwoFactorSettings = (value = {}) => ({
  backupCodes: Array.isArray(value.backupCodes) ? value.backupCodes : [],
  enabled: Boolean(value.enabled),
  method: value.method === 'email' ? 'email' : 'authenticator',
  updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
});

const getVisibilityBadge = (value) => {
  if (value === 'Everyone') {
    return {
      label: 'Active',
      toneClass: 'bg-secondary-fixed text-on-secondary-fixed',
    };
  }

  if (value === 'Nobody') {
    return {
      label: 'Private',
      toneClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    };
  }

  return {
    label: 'Restricted',
    toneClass: 'bg-primary-fixed text-on-primary-fixed',
  };
};

const getBlockedDateLabel = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
  });

  return `Blocked ${formatter.format(new Date())}`;
};

const matchesSearch = (query, ...values) => {
  if (!query) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(query));
};

const validatePasswordForm = ({ confirmPassword, currentPassword, nextPassword }) => {
  const errors = {
    confirmPassword: validateConfirmPassword(nextPassword, confirmPassword),
    currentPassword: currentPassword ? '' : 'Ban chua nhap mat khau hien tai.',
    nextPassword: validatePassword(nextPassword),
  };

  return {
    errors,
    isValid: !errors.confirmPassword && !errors.currentPassword && !errors.nextPassword,
  };
};

const Privacy = ({ currentUser }) => {
  const { updateCurrentUserPreferences } = useAuth();
  const currentUserName = currentUser?.fullName || currentUser?.displayName || 'Kaiju User';
  const searchInputRef = useRef(null);
  const searchInputUnlockedRef = useRef(false);
  const [draftBlockedName, setDraftBlockedName] = useState('');
  const [isAddingBlockedContact, setIsAddingBlockedContact] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSearchInputUnlocked, setIsSearchInputUnlocked] = useState(false);
  const [notice, setNotice] = useState(null);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: '',
    currentPassword: '',
    nextPassword: '',
  });
  const [privacyState, setPrivacyState] = useState(readStoredPrivacyState);
  const [searchQuery, setSearchQuery] = useState('');
  const [twoFactorSettings, setTwoFactorSettings] = useState(readStoredTwoFactorSettings);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(privacyState));
  }, [privacyState]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    setPrivacyState(sanitizePrivacyState(currentUser.preferences?.privacy));
    setTwoFactorSettings(sanitizeTwoFactorSettings(currentUser.preferences?.security));
  }, [currentUser?.id, currentUser?.preferences?.privacy, currentUser?.preferences?.security]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const clearAutofillValue = () => {
      if (!searchInputUnlockedRef.current && searchInputRef.current) {
        searchInputRef.current.value = '';
      }
    };

    clearAutofillValue();

    const timeoutId = window.setTimeout(clearAutofillValue, 300);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const totalBlockedContacts = privacyState.blockedContacts.length;

  const visibilityCards = useMemo(() => {
    const profileBadge = getVisibilityBadge(privacyState.profilePhotoVisibility);
    const groupBadge = getVisibilityBadge(privacyState.groupInvitationVisibility);

    return [
      {
        badge: profileBadge.label,
        badgeTone: profileBadge.toneClass,
        description: 'Who can see my profile photo',
        icon: <UserOutlined />,
        iconTone: 'bg-secondary-container text-on-secondary-container',
        key: 'profilePhotoVisibility',
        title: 'Profile Photo',
        value: privacyState.profilePhotoVisibility,
      },
      {
        badge: groupBadge.label,
        badgeTone: groupBadge.toneClass,
        description: 'Who can add me to groups',
        icon: <TeamOutlined />,
        iconTone: 'bg-primary-fixed text-on-primary-fixed-variant',
        key: 'groupInvitationVisibility',
        title: 'Group Invitations',
        value: privacyState.groupInvitationVisibility,
      },
    ];
  }, [privacyState.groupInvitationVisibility, privacyState.profilePhotoVisibility]);

  const filteredVisibilityCards = useMemo(
    () =>
      visibilityCards.filter((card) =>
        matchesSearch(
          normalizedQuery,
          card.title.toLowerCase(),
          card.description.toLowerCase(),
          card.value.toLowerCase(),
        ),
      ),
    [normalizedQuery, visibilityCards],
  );

  const filteredBlockedContacts = useMemo(
    () =>
      privacyState.blockedContacts.filter((contact) =>
        matchesSearch(
          normalizedQuery,
          contact.name.toLowerCase(),
          contact.blockedAt.toLowerCase(),
          'blocked contacts',
        ),
      ),
    [normalizedQuery, privacyState.blockedContacts],
  );

  const passwordChecklist = useMemo(
    () => getPasswordChecklist(passwordForm.nextPassword),
    [passwordForm.nextPassword],
  );

  const showSecuritySection = matchesSearch(
    normalizedQuery,
    'security password two factor 2fa account protection recovery code',
    'change password upgrade security',
  );

  const showDataSection = matchesSearch(
    normalizedQuery,
    'data storage manage media documents messages free space',
    '42.8 gb of 50gb',
  );

  const hasSearchResults =
    filteredVisibilityCards.length > 0 ||
    filteredBlockedContacts.length > 0 ||
    showDataSection ||
    showSecuritySection;

  const unlockSearchInput = () => {
    if (searchInputUnlockedRef.current) {
      return;
    }

    searchInputUnlockedRef.current = true;
    setIsSearchInputUnlocked(true);
  };

  const handleSearchQueryChange = (event) => {
    if (!searchInputUnlockedRef.current) {
      event.target.value = '';
      return;
    }

    setSearchQuery(event.target.value);
  };

  const persistPrivacySettings = async (nextValue) => {
    if (!currentUser?.id) {
      return;
    }

    try {
      const payload = await updateSettingsSection('privacy', nextValue);
      updateCurrentUserPreferences('privacy', payload.preferences?.privacy || nextValue);
    } catch {
      // Keep local privacy changes even if sync is temporarily unavailable.
    }
  };

  const persistSecuritySettings = async (nextValue) => {
    if (!currentUser?.id) {
      return;
    }

    try {
      const payload = await updateSettingsSection('security', nextValue);
      updateCurrentUserPreferences('security', payload.preferences?.security || nextValue);
    } catch {
      // Keep local security mock state even if sync is temporarily unavailable.
    }
  };

  const updatePrivacyState = (updater, message, type = 'success') => {
    setPrivacyState((currentValue) => {
      const nextValue = updater(currentValue);
      void persistPrivacySettings(nextValue);
      return nextValue;
    });
    setNotice({
      message,
      type,
    });
  };

  const cycleVisibilitySetting = (settingKey) => {
    const optionList =
      settingKey === 'profilePhotoVisibility' ? profilePhotoOptions : groupInvitationOptions;
    const currentValue = privacyState[settingKey];
    const currentIndex = optionList.indexOf(currentValue);
    const nextValue = optionList[(currentIndex + 1) % optionList.length];
    const settingLabel =
      settingKey === 'profilePhotoVisibility' ? 'Profile photo' : 'Group invitations';

    updatePrivacyState(
      (currentValueState) => ({
        ...currentValueState,
        [settingKey]: nextValue,
      }),
      `${settingLabel} visibility changed to ${nextValue} and synced to your account.`,
    );
  };

  const handleManageData = () => {
    const payload = {
      blockedContacts: privacyState.blockedContacts,
      currentUser: currentUserName,
      exportedAt: new Date().toISOString(),
      storageSummary: {
        used: '42.8 GB',
        usedPercent: 85.6,
      },
      visibility: {
        groupInvitations: privacyState.groupInvitationVisibility,
        profilePhoto: privacyState.profilePhotoVisibility,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'kaijumess-privacy-snapshot.json';
    link.click();
    window.URL.revokeObjectURL(downloadUrl);

    setNotice({
      message:
        'Privacy snapshot da duoc tai xuong tren may nay. Server-side retention va xoa du lieu that van can backend/API.',
      type: 'success',
    });
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
    setPasswordErrors((currentValue) => ({
      ...currentValue,
      [field]: '',
    }));
  };

  const handleChangePassword = async () => {
    const validation = validatePasswordForm(passwordForm);

    setPasswordErrors(validation.errors);

    if (!validation.isValid) {
      setNotice({
        message: 'Form doi mat khau chua hop le. Ban kiem tra lai cac truong can nhap.',
        type: 'error',
      });
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        nextPassword: passwordForm.nextPassword,
      });

      setPasswordForm({
        confirmPassword: '',
        currentPassword: '',
        nextPassword: '',
      });
      setPasswordErrors({});
      setNotice({
        message: 'Mat khau da duoc cap nhat thanh cong.',
        type: 'success',
      });
    } catch (error) {
      const requiresBackend =
        error.code === 'NETWORK_ERROR' || error.status === 404 || error.status === 501;

      setNotice({
        message: requiresBackend
          ? 'UI doi mat khau da san sang, nhung backend can endpoint /api/auth/change-password de doi that.'
          : error.message || 'Khong the doi mat khau ngay luc nay.',
        type: 'error',
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleTwoFactorMethodChange = (method) => {
    const nextSettings = updateStoredTwoFactorSettings((currentValue) => ({
      ...currentValue,
      method,
    }));

    setTwoFactorSettings(nextSettings);
    void persistSecuritySettings(nextSettings);
    setNotice({
      message: `Two-factor method da duoc doi sang ${method} trong account settings.`,
      type: 'success',
    });
  };

  const handleToggleTwoFactor = () => {
    const nextSettings = updateStoredTwoFactorSettings((currentValue) => {
      const nextEnabled = !currentValue.enabled;

      return {
        ...currentValue,
        backupCodes:
          nextEnabled && currentValue.backupCodes.length === 0
            ? generateNewBackupCodes()
            : currentValue.backupCodes,
        enabled: nextEnabled,
      };
    });

    setTwoFactorSettings(nextSettings);
    void persistSecuritySettings(nextSettings);
    setNotice({
      message: nextSettings.enabled
        ? '2FA mock da duoc bat va gan voi tai khoan nay. De enforce luc dang nhap van can OTP flow that.'
        : '2FA mock da duoc tat cho tai khoan nay.',
      type: 'success',
    });
  };

  const handleRegenerateBackupCodes = () => {
    const nextSettings = updateStoredTwoFactorSettings((currentValue) => ({
      ...currentValue,
      backupCodes: generateNewBackupCodes(),
      enabled: true,
    }));

    setTwoFactorSettings(nextSettings);
    void persistSecuritySettings(nextSettings);
    setNotice({
      message: 'Backup codes da duoc tao moi va gan voi tai khoan nay.',
      type: 'success',
    });
  };

  const handleDownloadBackupCodes = () => {
    const payload = twoFactorSettings.backupCodes.join('\n');
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'kaijumess-2fa-backup-codes.txt';
    link.click();
    window.URL.revokeObjectURL(downloadUrl);

    setNotice({
      message: 'Backup codes da duoc tai xuong tren may nay.',
      type: 'success',
    });
  };

  const handleAddBlockedContact = () => {
    const trimmedName = draftBlockedName.trim();

    if (!trimmedName) {
      setNotice({
        message: 'Ban chua nhap ten nguoi can block.',
        type: 'error',
      });
      return;
    }

    if (
      privacyState.blockedContacts.some(
        (contact) => contact.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setNotice({
        message: `${trimmedName} da co san trong blocked contacts.`,
        type: 'error',
      });
      return;
    }

    updatePrivacyState(
      (currentValue) => ({
        ...currentValue,
        blockedContacts: [
          {
            blockedAt: getBlockedDateLabel(),
            id: `blocked-${Date.now()}`,
            name: trimmedName,
            toneClass:
              blockedAvatarTones[currentValue.blockedContacts.length % blockedAvatarTones.length],
          },
          ...currentValue.blockedContacts,
        ],
      }),
      `${trimmedName} da duoc them vao blocked contacts va synced theo tai khoan.`,
    );

    setDraftBlockedName('');
    setIsAddingBlockedContact(false);
  };

  const handleRemoveBlockedContact = (contactId) => {
    const targetContact = privacyState.blockedContacts.find((contact) => contact.id === contactId);

    updatePrivacyState(
      (currentValue) => ({
        ...currentValue,
        blockedContacts: currentValue.blockedContacts.filter((contact) => contact.id !== contactId),
      }),
      targetContact
        ? `${targetContact.name} da duoc go khoi blocked contacts.`
        : 'Blocked contact da duoc go khoi danh sach.',
    );
  };

  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        <div className="rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-on-surface">
                Privacy &amp; Security
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant md:text-base">
                Manage who can reach you, how your visibility works, and what is synced to this
                account.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <label className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <SearchOutlined />
                </span>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchQueryChange}
                  onFocus={unlockSearchInput}
                  onPointerDown={unlockSearchInput}
                  placeholder="Search settings..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="search"
                  enterKeyHint="search"
                  role="searchbox"
                  readOnly={!isSearchInputUnlocked}
                  name="privacy-settings-filter"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  className="w-full rounded-full border-none bg-surface-container-highest py-3 pl-11 pr-4 text-sm text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20 md:w-72"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  setNotice({
                    message:
                      'More actions chua noi vao menu that. Neu ban muon toi co the them modal, menu dropdown hoac route rieng.',
                    type: 'info',
                  })
                }
                className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
              >
                <MoreOutlined />
                More actions
              </button>
            </div>
          </div>
        </div>

        {notice ? (
          <div className={`status-banner status-banner--${notice.type}`}>
            <span className="mt-0.5">
              <InfoCircleFilled />
            </span>
            <div className="text-sm font-medium leading-6">{notice.message}</div>
          </div>
        ) : null}

        {!hasSearchResults ? (
          <div className="rounded-[32px] bg-surface-container-lowest p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-on-surface">
              Khong tim thay muc privacy phu hop voi tu khoa nay.
            </p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Thu tim lai bang ten setting, block list hoac data storage.
            </p>
          </div>
        ) : null}

        {filteredVisibilityCards.length > 0 ? (
          <section className="rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                Personal Visibility
              </h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {filteredVisibilityCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => cycleVisibilitySetting(card.key)}
                  className="flex h-full min-h-[224px] flex-col justify-between rounded-[28px] bg-surface-container-low p-8 text-left transition-colors duration-200 hover:bg-surface-container-high"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl ${card.iconTone}`}
                    >
                      {card.icon}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${card.badgeTone}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-xl font-black tracking-tight text-on-surface">
                      {card.title}
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-primary">
                    <span className="text-xs font-bold uppercase tracking-[0.16em]">
                      {card.value}
                    </span>
                    <ArrowRightOutlined className="text-xs" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {showSecuritySection ? (
          <section className="rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                Account Protection
              </h3>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[28px] bg-surface-container-low p-6 shadow-sm">
                <div className="mb-6 flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <LockOutlined />
                  </span>
                  <div>
                    <h4 className="text-xl font-black tracking-tight text-on-surface">
                      Change Password
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      Doi mat khau ngay trong privacy. Neu backend co endpoint dung, thao tac nay se
                      chay that; neu khong, UI van bao ro can API nao.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                      Current Password
                    </span>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        handlePasswordFieldChange('currentPassword', event.target.value)
                      }
                      autoComplete="current-password"
                      name="current-password"
                      className={`w-full rounded-2xl border px-4 py-3 text-sm text-on-surface outline-none transition-all ${
                        passwordErrors.currentPassword
                          ? 'border-error bg-error-container/35'
                          : 'border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20'
                      }`}
                    />
                    {passwordErrors.currentPassword ? (
                      <span className="mt-2 block text-xs font-medium text-error">
                        {passwordErrors.currentPassword}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                      New Password
                    </span>
                    <input
                      type="password"
                      value={passwordForm.nextPassword}
                      onChange={(event) =>
                        handlePasswordFieldChange('nextPassword', event.target.value)
                      }
                      autoComplete="new-password"
                      name="new-password"
                      className={`w-full rounded-2xl border px-4 py-3 text-sm text-on-surface outline-none transition-all ${
                        passwordErrors.nextPassword
                          ? 'border-error bg-error-container/35'
                          : 'border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20'
                      }`}
                    />
                    {passwordErrors.nextPassword ? (
                      <span className="mt-2 block text-xs font-medium text-error">
                        {passwordErrors.nextPassword}
                      </span>
                    ) : null}
                  </label>

                  <div className="grid gap-2 rounded-[22px] bg-surface-container-lowest p-4">
                    {passwordChecklist.map((rule) => (
                      <span key={rule.key} className="password-rule" data-met={rule.met}>
                        <span className="h-2 w-2 rounded-full bg-current" />
                        {rule.label}
                      </span>
                    ))}
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                      Confirm Password
                    </span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        handlePasswordFieldChange('confirmPassword', event.target.value)
                      }
                      autoComplete="new-password"
                      name="confirm-password"
                      className={`w-full rounded-2xl border px-4 py-3 text-sm text-on-surface outline-none transition-all ${
                        passwordErrors.confirmPassword
                          ? 'border-error bg-error-container/35'
                          : 'border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20'
                      }`}
                    />
                    {passwordErrors.confirmPassword ? (
                      <span className="mt-2 block text-xs font-medium text-error">
                        {passwordErrors.confirmPassword}
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isSubmittingPassword}
                    className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/15 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordErrors({});
                      setPasswordForm({
                        confirmPassword: '',
                        currentPassword: '',
                        nextPassword: '',
                      });
                    }}
                    className="rounded-full border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                  >
                    Reset Form
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] bg-surface-container-low p-6 shadow-sm">
                <div className="mb-6 flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container/35 text-on-secondary-container">
                    <SafetyCertificateOutlined />
                  </span>
                  <div>
                    <h4 className="text-xl font-black tracking-tight text-on-surface">
                      Two-Factor Upgrade
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      Bat/tat lop bao ve thu hai va luu backup codes tren may nay. De ap dung luc
                      dang nhap van can backend/API xu ly OTP va verify challenge.
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] bg-surface-container-lowest p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-on-surface">Two-factor status</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {twoFactorSettings.enabled ? 'Enabled for this account' : 'Disabled for this account'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleTwoFactor}
                      className={`rounded-full px-5 py-3 text-sm font-bold transition-colors ${
                        twoFactorSettings.enabled
                          ? 'bg-tertiary/10 text-tertiary hover:bg-tertiary/15'
                          : 'bg-primary text-on-primary hover:bg-primary-container'
                      }`}
                    >
                      {twoFactorSettings.enabled ? 'Disable 2FA' : 'Enable 2FA'}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      key: 'authenticator',
                      label: 'Authenticator App',
                      note: 'Tot hon cho OTP va scanner QR.',
                    },
                    {
                      key: 'email',
                      label: 'Email Backup',
                      note: 'Kenh du phong cho security mock tren account.',
                    },
                  ].map((method) => {
                    const isActive = twoFactorSettings.method === method.key;

                    return (
                      <button
                        key={method.key}
                        type="button"
                        onClick={() => handleTwoFactorMethodChange(method.key)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/8 text-primary'
                            : 'border-outline-variant/20 bg-surface-container-lowest text-on-surface-variant hover:border-primary/40 hover:text-on-surface'
                        }`}
                      >
                        <span className="block text-sm font-bold">{method.label}</span>
                        <span className="mt-2 block text-xs leading-5">{method.note}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-[24px] bg-surface-container-lowest p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-on-surface">Recovery Codes</p>
                      <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                        Luu lai de mo khoa trong security mock cua tai khoan. De enforce 2FA that o
                        login flow van can OTP challenge backend.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRegenerateBackupCodes}
                        className="rounded-full bg-surface-container-high px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container-highest"
                      >
                        Regenerate
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadBackupCodes}
                        disabled={twoFactorSettings.backupCodes.length === 0}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Download
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {twoFactorSettings.backupCodes.length > 0 ? (
                      twoFactorSettings.backupCodes.map((code) => (
                        <div
                          key={code}
                          className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold tracking-[0.16em] text-on-surface"
                        >
                          {code}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant sm:col-span-2">
                        Chua co backup code nao. Bat 2FA hoac bam Regenerate de tao moi.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {showDataSection ? (
          <section className="rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                  Data &amp; Storage
                </h3>
                <p className="mt-3 text-3xl font-black tracking-tight text-on-surface">
                  42.8 GB <span className="text-lg font-medium text-on-surface-variant">of 50 GB</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Storage used across the current mock workspace and connected account surfaces.
                </p>
              </div>

              <button
                type="button"
                onClick={handleManageData}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/15 transition-transform hover:scale-[1.01]"
              >
                <DatabaseOutlined />
                Manage Data
              </button>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-primary" style={{ width: '85.6%' }} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {storageBreakdown.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.colorClass}`} />
                  <div>
                    <p className="text-xs font-bold text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-variant">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {filteredBlockedContacts.length > 0 || !normalizedQuery ? (
          <section className="rounded-[32px] bg-surface-container-lowest p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                  Blocked Contacts
                </h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {totalBlockedContacts} blocked contact{totalBlockedContacts === 1 ? '' : 's'} on
                  this device.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingBlockedContact((currentValue) => !currentValue)}
                className="inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-container"
              >
                <PlusOutlined />
                Add New
              </button>
            </div>

            {isAddingBlockedContact ? (
              <div className="mb-6 grid gap-3 rounded-[24px] bg-surface-container-low p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                <input
                  type="text"
                  value={draftBlockedName}
                  onChange={(event) => setDraftBlockedName(event.target.value)}
                  placeholder="Nhap ten can block..."
                  className="rounded-2xl border-none bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleAddBlockedContact}
                  className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-container"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftBlockedName('');
                    setIsAddingBlockedContact(false);
                  }}
                  className="rounded-2xl border border-outline-variant/30 px-4 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {filteredBlockedContacts.length === 0 ? (
              <div className="rounded-[28px] bg-surface-container-low p-6 text-center">
                <p className="text-sm font-bold text-on-surface">
                  Khong co blocked contact nao trung voi tu khoa tim kiem.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredBlockedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="group flex items-center gap-4 rounded-[24px] bg-surface-container-low p-4 transition-colors hover:bg-surface-container-high"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${contact.toneClass}`}
                    >
                      {getInitials(contact.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-on-surface">{contact.name}</p>
                      <p className="text-xs text-on-surface-variant">{contact.blockedAt}</p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Unblock ${contact.name}`}
                      onClick={() => handleRemoveBlockedContact(contact.id)}
                      className="rounded-xl p-2 text-tertiary transition-colors hover:bg-error-container"
                    >
                      <CloseOutlined />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <aside className="space-y-6">
        <div className="rounded-[28px] bg-surface-container-low p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SafetyCertificateOutlined />
            </span>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Security Check
              </h4>
              <p className="mt-3 text-lg font-black tracking-tight text-on-surface">
                Your account privacy setup is secure.
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {currentUserName} is using synced privacy preferences, with no failed validation in
                this mock flow right now.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <EyeOutlined />
            </span>
            <div>
              <h4 className="text-sm font-bold text-on-surface">What works now</h4>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Visibility settings, blocked contacts, password change, mock 2FA state and privacy
                snapshot download are working for this account.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/10 text-tertiary">
              <LockOutlined />
            </span>
            <div>
              <h4 className="text-sm font-bold text-on-surface">Still mocked</h4>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                2FA van moi o muc settings mock. De dung that can them enrollment secret, verify OTP
                va enforce luc login. Block user theo tai khoan that cung can flow chon user thay vi
                nhap ten tu do.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
};

export default Privacy;
