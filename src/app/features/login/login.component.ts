import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, MOCK_OTP } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="login" tabindex="-1">
      <form
        class="login__card"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        aria-labelledby="login-title"
      >
        <span class="brand__mark brand__mark--lg" aria-hidden="true">W</span>
        <h1 id="login-title">Sign in to Sandbox Wallet</h1>
        <p class="muted">Test environment &middot; mock identities only.</p>

        <label for="userId">Sandbox user ID</label>
        <input
          id="userId"
          formControlName="userId"
          autocomplete="username"
          [attr.aria-invalid]="showError('userId')"
          aria-describedby="userId-err"
        />
        <p id="userId-err" class="field-error">
          @if (showError('userId')) {
            Enter your sandbox user ID.
          }
        </p>

        <label for="otp">One-time password</label>
        <input
          id="otp"
          formControlName="otp"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          [attr.aria-invalid]="showError('otp')"
          aria-describedby="otp-hint otp-err"
        />
        <p id="otp-hint" class="muted small">
          Sandbox OTP: <code>{{ mockOtp }}</code>
        </p>
        <p id="otp-err" class="field-error">
          @if (showError('otp')) {
            Enter the 6-digit OTP.
          }
        </p>

        @if (error(); as message) {
          <p class="banner banner--warn" role="alert">{{ message }}</p>
        }

        <button
          type="submit"
          class="btn btn--primary btn--block"
          [disabled]="pending()"
          [attr.aria-busy]="pending()"
        >
          {{ pending() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </main>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly mockOtp = MOCK_OTP;
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    userId: ['sandbox.tester', Validators.required],
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  protected showError(name: 'userId' | 'otp'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;

    this.pending.set(true);
    try {
      const { userId, otp } = this.form.getRawValue();
      await this.auth.login(userId, otp);
      await this.router.navigateByUrl('/dashboard');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      this.pending.set(false);
    }
  }
}
