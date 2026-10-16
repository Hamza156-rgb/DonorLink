import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { OnboardingService } from '../../core/onboarding.service';
import { OnboardingPage } from './onboarding.page';

describe('OnboardingPage', () => {
  function setup(guest = vi.fn().mockResolvedValue({ isAnonymous: true })) {
    const complete = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({ imports: [OnboardingPage], providers: [provideRouter([]), provideIonicAngular(),
      { provide: OnboardingService, useValue: { complete } }, { provide: AuthService, useValue: { continueAsGuest: guest } }] });
    const f = TestBed.createComponent(OnboardingPage);
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    f.detectChanges();
    return { f, page: f.componentInstance, complete, nav, navigate, guest };
  }
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  it('keeps the safety note', () => {
    const { page } = setup();
    expect(page.slides.some(s => /confirm with the hospital or blood bank/i.test(s.body))).toBe(true);
  });
  it('shows the need/donate choice on the last slide, without Skip', () => {
    const { f, page } = setup();
    page.index.set(page.slides.length - 1); f.detectChanges();
    expect(text(f)).toContain('I need blood');
    expect(text(f)).toContain('I want to donate');
    expect(text(f)).not.toContain('Skip');
  });
  it('"I need blood" starts a guest session and opens search', async () => {
    const { page, complete, nav, guest } = setup();
    await page.needBlood();
    expect(guest).toHaveBeenCalled(); expect(complete).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith('/tabs/donors', { replaceUrl: true });
  });
  it('"I need blood" shows an actionable error when guest sign-in fails', async () => {
    const { f, page, nav } = setup(vi.fn().mockRejectedValue({ code: 'auth/network-request-failed' }));
    page.index.set(page.slides.length - 1);
    await page.needBlood(); f.detectChanges();
    expect(nav).not.toHaveBeenCalled();
    expect(text(f)).toContain('Check your connection');
  });
  it('"I want to donate" goes to sign-up with the donor intent', async () => {
    const { page, navigate } = setup();
    await page.donate();
    expect(navigate).toHaveBeenCalledWith(['/register'], { queryParams: { intent: 'donor' }, replaceUrl: true });
  });
});
