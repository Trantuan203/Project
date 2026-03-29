const AUTH_ACCOUNTS_STORAGE_KEY = 'kaijumess-auth-accounts';
export const AUTH_SESSION_STORAGE_KEY = 'kaijumess-auth-session';

const DEMO_ACCOUNT = {
  id: 'kaiju-demo-user',
  fullName: 'Kaiju Demo',
  identity: 'demo@kaijumess.app',
  normalizedIdentity: 'demo@kaijumess.app',
  password: 'Kaiju123',
};

const wait = (delay = 550) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, delay);
  });

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uppercasePattern = /[A-Z]/;
const lowercasePattern = /[a-z]/;
const numberPattern = /\d/;

const readJson = (storageKey, fallbackValue) => {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

const writeJson = (storageKey, value) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

const sanitizeUser = (account) => ({
  id: account.id,
  fullName: account.fullName,
  identity: account.identity,
});

const createAuthError = ({ code, field, message }) => {
  const error = new Error(message);
  error.code = code;
  error.field = field;
  return error;
};

const isPhoneIdentity = (value) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

export const normalizeIdentity = (value) => {
  const trimmedValue = value.trim();

  if (emailPattern.test(trimmedValue.toLowerCase())) {
    return trimmedValue.toLowerCase();
  }

  if (isPhoneIdentity(trimmedValue)) {
    return trimmedValue.replace(/\D/g, '');
  }

  return trimmedValue.toLowerCase();
};

export const validateFullName = (value) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'Bạn chưa nhập họ và tên.';
  }

  if (trimmedValue.length < 2) {
    return 'Họ và tên cần ít nhất 2 ký tự.';
  }

  if (trimmedValue.length > 40) {
    return 'Họ và tên không nên quá 40 ký tự.';
  }

  return '';
};

export const validateIdentity = (value) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'Bạn chưa nhập email hoặc số điện thoại.';
  }

  if (emailPattern.test(trimmedValue.toLowerCase()) || isPhoneIdentity(trimmedValue)) {
    return '';
  }

  return 'Tài khoản phải là email hợp lệ hoặc số điện thoại 10-15 số.';
};

export const getPasswordChecklist = (value) => [
  {
    key: 'length',
    label: 'Tối thiểu 8 ký tự',
    met: value.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'Có ít nhất 1 chữ in hoa',
    met: uppercasePattern.test(value),
  },
  {
    key: 'lowercase',
    label: 'Có ít nhất 1 chữ thường',
    met: lowercasePattern.test(value),
  },
  {
    key: 'number',
    label: 'Có ít nhất 1 chữ số',
    met: numberPattern.test(value),
  },
];

export const validatePassword = (value) => {
  if (!value) {
    return 'Bạn chưa nhập mật khẩu.';
  }

  const firstUnmetRule = getPasswordChecklist(value).find((rule) => !rule.met);

  if (firstUnmetRule) {
    return `Mật khẩu chưa đạt yêu cầu: ${firstUnmetRule.label.toLowerCase()}.`;
  }

  return '';
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Bạn cần nhập lại mật khẩu.';
  }

  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận chưa khớp.';
  }

  return '';
};

const ensureSeedAccounts = () => {
  const accounts = readJson(AUTH_ACCOUNTS_STORAGE_KEY, []);

  if (accounts.length > 0) {
    return accounts;
  }

  writeJson(AUTH_ACCOUNTS_STORAGE_KEY, [DEMO_ACCOUNT]);
  return [DEMO_ACCOUNT];
};

const readAccounts = () => ensureSeedAccounts();

const writeAccounts = (accounts) => {
  writeJson(AUTH_ACCOUNTS_STORAGE_KEY, accounts);
};

export const readStoredSession = () => readJson(AUTH_SESSION_STORAGE_KEY, null);

const writeSession = (user) => {
  writeJson(AUTH_SESSION_STORAGE_KEY, user);
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
};

const createUserId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `kaiju-${Date.now()}`;
};

export const loginUser = async ({ identity, password }) => {
  await wait();

  const account = readAccounts().find(
    (existingAccount) => existingAccount.normalizedIdentity === normalizeIdentity(identity),
  );

  if (!account) {
    throw createAuthError({
      code: 'ACCOUNT_NOT_FOUND',
      field: 'identity',
      message: 'Không tìm thấy tài khoản này. Hãy kiểm tra lại hoặc tạo tài khoản mới.',
    });
  }

  if (account.password !== password) {
    throw createAuthError({
      code: 'WRONG_PASSWORD',
      field: 'password',
      message: 'Mật khẩu chưa đúng. Bạn thử lại giúp tôi.',
    });
  }

  const user = sanitizeUser(account);
  writeSession(user);
  return { user };
};

export const registerUser = async ({ fullName, identity, password }) => {
  await wait(700);

  const accounts = readAccounts();
  const normalizedIdentity = normalizeIdentity(identity);

  if (accounts.some((account) => account.normalizedIdentity === normalizedIdentity)) {
    throw createAuthError({
      code: 'ACCOUNT_EXISTS',
      field: 'identity',
      message: 'Tài khoản này đã tồn tại. Bạn có thể đăng nhập luôn.',
    });
  }

  const newAccount = {
    id: createUserId(),
    fullName: fullName.trim(),
    identity: identity.trim(),
    normalizedIdentity,
    password,
  };

  const nextAccounts = [...accounts, newAccount];
  writeAccounts(nextAccounts);

  const user = sanitizeUser(newAccount);
  writeSession(user);

  return { user };
};

export const getDemoCredentials = () => ({
  identity: DEMO_ACCOUNT.identity,
  password: DEMO_ACCOUNT.password,
});
