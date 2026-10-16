import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { OnboardingService } from '../../core/onboarding.service';
import { OnboardingPage } from './onboarding.page';

describe('OnboardingPage', () => {
  function setup() {
    const complete = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({ imports: [OnboardingPage], providers: [provideRouter([]), provideIonicAngular(), { provide: OnboardingService, useValue: { complete } }] });
    const f = TestBed.createComponent(OnboardingPage);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    f.detectChanges();
    return { f, page: f.componentInstance, complete, nav };
  }
  it('keeps the safety note on a slide', () => {
    const { page } = setup();
    expect(page.slides.some(s => /confirm with the hospital or blood bank/i.test(s.body))).toBe(true);
  });
  it('shows account actions only on the last slide', () => {
    const { f, page } = setup();
    const text = () => (f.nativeElement as HTMLElement).textContent ?? '';
    expect(text()).not.toContain('Create account');
    page.index.set(page.slides.length - 1); f.detectChanges();
    expect(text()).toContain('Create account');
    expect(text()).not.toContain('Skip');
  });
  it('remembers completion before leaving', async () => {
    const { page, complete, nav } = setup();
    await page.finish('/register');
    expect(complete).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith('/register', { replaceUrl: true });
  });
});
