import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { PortfolioDataService } from './portfolio-data.service';
import { AppliedJobsService } from './applied-jobs.service';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    isEmailVerified?: boolean;
  };
  emailSent?: boolean;
  emailMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3001/api';
  
  // Lazy getters to avoid circular dependency
  private get portfolioDataService(): PortfolioDataService {
    return this.injector.get(PortfolioDataService);
  }
  
  private get appliedJobsService(): AppliedJobsService {
    return this.injector.get(AppliedJobsService);
  }

  // State management
  private readonly token = signal<string | null>(this.getStoredToken());
  private readonly user = signal<{ id: string; email: string; isEmailVerified?: boolean } | null>(null);

  // Computed values
  readonly isAuthenticated = computed(() => !!this.token());
  readonly currentUser = computed(() => this.user());

  constructor() {
    // If token exists, load user data from sessionStorage
    const storedUser = sessionStorage.getItem('user_data');
    if (storedUser) {
      try {
        this.user.set(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    // Token verification removed - token validity will be checked on API calls
  }

  /**
   * Login user with email and password
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        // Clear any previous user data IMMEDIATELY before setting new auth data
        this.portfolioDataService.clearPortfolioData();
        this.appliedJobsService.clearAppliedJobs();
        
        // Set new auth data
        this.setAuthData(response.token, response.user);
        
        // Reload portfolio data for the new user
        this.portfolioDataService.reloadPortfolioData();
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Register new user
   */
  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, credentials).pipe(
      tap(response => {
        // Clear any previous user data IMMEDIATELY before setting new auth data
        this.portfolioDataService.clearPortfolioData();
        this.appliedJobsService.clearAppliedJobs();
        
        // Set new auth data
        this.setAuthData(response.token, response.user);
        
        // Reload portfolio data for the new user
        this.portfolioDataService.reloadPortfolioData();
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user and clear all user-specific data
   */
  logout(): void {
    this.token.set(null);
    this.user.set(null);
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    
    // Clear all user-specific data from services
    this.portfolioDataService.clearPortfolioData();
    this.appliedJobsService.clearAppliedJobs();
    
    this.router.navigate(['/']);
  }

  /**
   * Verify token validity (disabled - token validity checked on API calls)
   */
  verifyToken(): void {
    // Token verification endpoint removed
    // Token validity will be checked automatically when making authenticated API calls
    const token = this.token();
    if (token) {
      // Just ensure user data is loaded from sessionStorage
      const storedUser = sessionStorage.getItem('user_data');
      if (storedUser) {
        try {
          this.user.set(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    }
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Store authentication data in sessionStorage
   */
  private setAuthData(token: string, user: { id: string; email: string }): void {
    this.token.set(token);
    this.user.set(user);
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('user_data', JSON.stringify(user));
  }

  /**
   * Get stored token from sessionStorage
   */
  private getStoredToken(): string | null {
    return sessionStorage.getItem('auth_token');
  }

  /**
   * Resend verification email
   */
  resendVerificationEmail(email: string): Observable<{ message: string; emailSent: boolean; emailMessage?: string }> {
    return this.http.post<{ message: string; emailSent: boolean; emailMessage?: string }>(
      `${this.apiUrl}/auth/resend-verification`,
      { email }
    );
  }
}

