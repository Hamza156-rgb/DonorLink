/** Maps Firebase error codes to copy that says what to do next. Unknown codes never leak raw messages. */
const MESSAGES: Record<string,string> = {
  'auth/invalid-credential': 'Email or password is incorrect. Check them and try again, or reset your password.',
  'auth/wrong-password': 'Email or password is incorrect. Check them and try again, or reset your password.',
  'auth/user-not-found': 'Email or password is incorrect. Check them and try again, or reset your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in, or reset your password.',
  'auth/credential-already-in-use': 'An account with this email already exists. Sign in, or reset your password.',
  'auth/operation-not-allowed': 'Guest search isn’t available right now. Create an account or sign in.',
  'auth/invalid-email': 'Enter a valid email address, like name@example.com.',
  'auth/weak-password': 'Use a password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'Can’t reach the server. Check your connection and try again.',
  'auth/user-disabled': 'This account is suspended. Contact support if you think this is a mistake.',
  'permission-denied': 'We couldn’t save your details. Check them and try again.',
  'unavailable': 'Can’t reach the server. Check your connection and try again.',
};
export function authErrorMessage(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  return MESSAGES[code] ?? 'Something went wrong. Try again.';
}
