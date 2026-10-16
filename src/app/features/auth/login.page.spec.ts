import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { LoginPage } from './login.page';

function setup(login: (e: string, p: string) => Promise<unknown>) {
  TestBed.configureTestingModule({ imports: [LoginPage], providers: [provideRouter([]), provideIonicAngular(), { provide: AuthService, useValue: { login } }] });
  const f = TestBed.createComponent(LoginPage);
  const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  f.detectChanges();
  return { page: f.componentInstance, f, nav };
}

describe('LoginPage', () => {
  it('does not call the server when the form is invalid', async () => {
    const login = vi.fn(); const { page } = setup(login);
    page.form.setValue({ email: 'not-an-email', password: '' });
    await page.submit();
    expect(login).not.toHaveBeenCalled();
    expect(page.form.controls.email.touched).toBe(true);
  });
  it('normalises email and sends verified users to the safe return URL', async () => {
    const login = vi.fn().mockResolvedValue({ emailVerified: true }); const { page, f, nav } = setup(login);
    f.componentRef.setInput('returnUrl', '//evil.example');
    page.form.setValue({ email: ' Alice@Example.com ', password: 'secret123' });
    await page.submit();
    expect(login).toHaveBeenCalledWith('alice@example.com', 'secret123');
    expect(nav).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  });
  it('sends unverified users to the verify screen', async () => {
    const { page, nav } = setup(vi.fn().mockResolvedValue({ emailVerified: false }));
    page.form.setValue({ email: 'a@b.co', password: 'x' });
    await page.submit();
    expect(nav).toHaveBeenCalledWith('/verify-email', { replaceUrl: true });
  });
  it('shows an actionable error on bad credentials', async () => {
    const { page, f } = setup(vi.fn().mockRejectedValue({ code: 'auth/invalid-credential' }));
    page.form.setValue({ email: 'a@b.co', password: 'wrong' });
    await page.submit(); f.detectChanges();
    const alert = (f.nativeElement as HTMLElement).querySelector('p.dl-alert[role=alert]');
    expect(alert?.textContent).toContain('reset your password');
    expect(page.busy()).toBe(false);
  });
});
