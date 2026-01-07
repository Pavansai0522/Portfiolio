import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected onEmailChange(value: string): void {
    this.email.set(value);
    this.errorMessage.set('');
  }

  protected onPasswordChange(value: string): void {
    this.password.set(value);
    this.errorMessage.set('');
  }

  protected onSubmit(): void {
    const emailValue = this.email().trim();
    const passwordValue = this.password();

    // Basic validation
    if (!emailValue || !passwordValue) {
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

    // Attempt login
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login({
      email: emailValue,
      password: passwordValue
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        // Navigate to dashboard on successful login
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading.set(false);
        // Extract error message from response
        const errorMsg = error?.error?.error || error?.message || 'Login failed. Please try again.';
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
}
