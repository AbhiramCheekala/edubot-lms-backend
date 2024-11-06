import bcrypt from 'bcryptjs';

export const encryptPassword = async (password: string) => {
  const encryptedPassword = await bcrypt.hash(password, 8);
  return encryptedPassword;
};

export const isPasswordMatch = async (password: string, accountPassword: string) => {
  return bcrypt.compare(password, accountPassword);
};

export function generateRandomPassword(): string {
  const uppercaseChars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars: string = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars: string = '0123456789';
  const specialChars: string = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password: string = '';

  // Ensure at least one character from each category
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Fill the rest of the password
  const allChars: string = uppercaseChars + lowercaseChars + numberChars + specialChars;
  const remainingLength: number = Math.max(8 - password.length, 4); // Ensure at least 8 characters

  for (let i: number = 0; i < remainingLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}
