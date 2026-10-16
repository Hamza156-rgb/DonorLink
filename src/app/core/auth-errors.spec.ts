import { authErrorMessage } from './auth-errors';

describe('authErrorMessage', () => {
  it('does not reveal whether the email or the password was wrong', () => {
    const m = authErrorMessage({ code: 'auth/invalid-credential' });
    expect(authErrorMessage({ code: 'auth/user-not-found' })).toBe(m);
    expect(authErrorMessage({ code: 'auth/wrong-password' })).toBe(m);
  });
  it('tells the user what to do next', () =>
    expect(authErrorMessage({ code: 'auth/network-request-failed' })).toMatch(/check your connection/i));
  it('never shows raw Firebase messages', () => {
    expect(authErrorMessage({ code: 'auth/internal-error', message: 'Firebase: INTERNAL ASSERTION FAILED' })).toBe('Something went wrong. Try again.');
    expect(authErrorMessage(new Error('boom'))).toBe('Something went wrong. Try again.');
    expect(authErrorMessage(null)).toBe('Something went wrong. Try again.');
  });
});
