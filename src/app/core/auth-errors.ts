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
  'contact/need-account': 'Create an account and verify your email to contact donors.',
  'contact/already-exists': 'You already have a request with this donor. Check Requests for their reply.',
  'contact/limit': 'You’ve sent 5 requests in the last hour. Try again later, or contact the hospital blood bank directly.',
  'contact/not-listed': 'This donor is no longer listed. Try another donor.',
  'contact/no-profile': 'Your profile is incomplete. Sign out and back in, then try again.',
  'contact/no-phone': 'Add a mobile number to your profile before accepting.',
  'functions/unavailable': 'Can’t reach the server. Check your connection and try again.',
  'functions/permission-denied': 'Create an account and verify your email to contact donors.',
  'functions/already-exists': 'You already have a request with this donor. Check Requests for their reply.',
  'functions/resource-exhausted': 'You’ve sent several requests in the last hour. Try again later.',
  'functions/not-found': 'This donor is no longer listed. Try another donor.',
  'functions/failed-precondition': 'This request was already answered, or your profile is missing a mobile number.',
  'functions/invalid-argument': 'Some details are missing. Check the form and try again.',
};
export function authErrorMessage(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  return MESSAGES[code] ?? 'Something went wrong. Try again.';
}
