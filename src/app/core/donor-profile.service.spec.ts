import { publicName } from './donor-profile.service';

describe('publicName', () => {
  it('uses first name and last initial', () => expect(publicName('Hamza Waseem')).toBe('Hamza W.'));
  it('uses the last part of longer names', () => expect(publicName('  Muhammad Ali   Khan ')).toBe('Muhammad K.'));
  it('keeps a single name as is', () => expect(publicName('Sana')).toBe('Sana'));
  it('handles empty names', () => expect(publicName('   ')).toBe(''));
});
