const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^(?=.{3,50}$)[a-zA-Z0-9._]+$/;
const uppercasePattern = /[A-Z]/;
const lowercasePattern = /[a-z]/;
const numberPattern = /\d/;

export const validateFullName = (value) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'Ban chua nhap ho va ten.';
  }

  if (trimmedValue.length < 2) {
    return 'Ho va ten can it nhat 2 ky tu.';
  }

  if (trimmedValue.length > 60) {
    return 'Ho va ten khong nen qua 60 ky tu.';
  }

  return '';
};

export const validateLoginIdentity = (value) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'Ban chua nhap email hoac username.';
  }

  if (emailPattern.test(trimmedValue.toLowerCase()) || usernamePattern.test(trimmedValue)) {
    return '';
  }

  return 'Dang nhap chi ho tro email hoac username hop le.';
};

export const validateRegisterIdentity = (value) => {
  const trimmedValue = value.trim().toLowerCase();

  if (!trimmedValue) {
    return 'Ban chua nhap email.';
  }

  if (!emailPattern.test(trimmedValue)) {
    return 'Email dang ky khong hop le.';
  }

  return '';
};

export const getPasswordChecklist = (value) => [
  {
    key: 'length',
    label: 'Toi thieu 8 ky tu',
    met: value.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'Co it nhat 1 chu in hoa',
    met: uppercasePattern.test(value),
  },
  {
    key: 'lowercase',
    label: 'Co it nhat 1 chu thuong',
    met: lowercasePattern.test(value),
  },
  {
    key: 'number',
    label: 'Co it nhat 1 chu so',
    met: numberPattern.test(value),
  },
];

export const validatePassword = (value) => {
  if (!value) {
    return 'Ban chua nhap mat khau.';
  }

  const firstUnmetRule = getPasswordChecklist(value).find((rule) => !rule.met);

  if (firstUnmetRule) {
    return `Mat khau chua dat yeu cau: ${firstUnmetRule.label.toLowerCase()}.`;
  }

  return '';
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Ban can nhap lai mat khau.';
  }

  if (password !== confirmPassword) {
    return 'Mat khau xac nhan chua khop.';
  }

  return '';
};
