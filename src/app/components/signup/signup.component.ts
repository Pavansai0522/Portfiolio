import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected onEmailChange(value: string): void {
    this.email.set(value);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  protected onPasswordChange(value: string): void {
    this.password.set(value);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  protected onConfirmPasswordChange(value: string): void {
    this.confirmPassword.set(value);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  protected onSubmit(): void {
    const emailValue = this.email().trim();
    const passwordValue = this.password();
    const confirmPasswordValue = this.confirmPassword();

    // Clear previous messages
    this.errorMessage.set('');
    this.successMessage.set('');

    // Validation
    if (!emailValue || !passwordValue || !confirmPasswordValue) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    if (!this.isValidEmail(emailValue)) {
      this.errorMessage.set('Please enter a valid email address');
      return;
    }

    if (passwordValue.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters long');
      return;
    }

    if (passwordValue !== confirmPasswordValue) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    // Attempt registration
    this.isLoading.set(true);

    this.authService.register({
      email: emailValue,
      password: passwordValue
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        let message = 'Account created successfully!';
        if (response.emailSent) {
          message += ' Please check your email to verify your account.';
        } else {
          message += ' (Email verification skipped - email service not configured)';
        }
        this.successMessage.set(message);
        // Navigate to home after successful registration
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading.set(false);
        // Extract error message from response
        const errorMsg = error?.error?.error || error?.message || 'Registration failed. Please try again.';
        this.errorMessage.set(errorMsg);
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected goBack(): void {
    this.router.navigate(['/']);
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
