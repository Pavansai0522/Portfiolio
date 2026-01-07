import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3001/api';

  protected readonly isLoading = signal(true);
  protected readonly isVerified = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];
    
    if (!token) {
      this.errorMessage.set('No verification token provided');
      this.isLoading.set(false);
      return;
    }

    this.verifyEmail(token);
  }

  private verifyEmail(token: string): void {
    this.http.get<{ message: string; verified: boolean }>(`${this.apiUrl}/auth/verify-email?token=${token}`)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.isVerified.set(true);
          this.successMessage.set(response.message || 'Email verified successfully!');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.isVerified.set(false);
          const errorMsg = error?.error?.error || 'Failed to verify email. The link may have expired.';
          this.errorMessage.set(errorMsg);
        }
      });
  }

  protected resendVerification(): void {
    this.router.navigate(['/login']);
  }

  protected goToHome(): void {
    this.router.navigate(['/']);
  }
}
