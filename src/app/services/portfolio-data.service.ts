import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Experience {
  id: string;
  company: string;
  position: string;
  description: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  location: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  description: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  location: string;
}

export interface Achievement {
  id: string;
  title: string;
  issuer: string;
  description: string;
  date: string;
  url: string;
  type: 'certification' | 'award' | 'achievement' | 'other';
}

export interface PortfolioData {
  name: string;
  title: string;
  bio: string;
  email: string;
  phone: string;
  location: string;
  profileImage: string | null;
  skills: string[];
  projects: Project[];
  experience: Experience[];
  education: Education[];
  achievements: Achievement[];
  socialLinks: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
}

export interface Project {
  id: number;
  title: string;
  description: string;
  technologies: string[];
  image: string | null;
  link?: string;
}

const defaultPortfolioData: PortfolioData = {
  name: '',
  title: '',
  bio: '',
  email: '',
  phone: '',
  location: '',
  profileImage: null,
  skills: [],
  projects: [],
  experience: [],
  education: [],
  achievements: [],
  socialLinks: {}
};

@Injectable({
  providedIn: 'root'
})
export class PortfolioDataService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly apiUrl = environment.apiUrl;
  
  // Lazy getter to avoid circular dependency
  private get authService(): AuthService {
    return this.injector.get(AuthService);
  }
  
  private readonly portfolioDataSignal = signal<PortfolioData>(defaultPortfolioData);
  private isLoading = signal(false);

  readonly portfolioData = this.portfolioDataSignal.asReadonly();
  
  readonly hasProjects = computed(() => this.portfolioData().projects.length > 0);
  readonly hasSkills = computed(() => this.portfolioData().skills.length > 0);
  readonly hasSocialLinks = computed(() => {
    const links = this.portfolioData().socialLinks;
    return !!(links.linkedin || links.github || links.twitter || links.website);
  });

  constructor() {
    // Don't load portfolio data in constructor to avoid circular dependency issues
    // Data will be loaded when reloadPortfolioData() is called after login
  }

  private loadPortfolioData(): void {
    // Don't load if user is not authenticated
    if (!this.authService.isAuthenticated()) {
      this.portfolioDataSignal.set(defaultPortfolioData);
      return;
    }

    this.isLoading.set(true);
    const authHeader = this.authService.getAuthHeader();
    
    // Add cache-busting headers and timestamp to force fresh data
    const cacheBustingHeaders = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(authHeader as any)
    });
    
    // Add timestamp to URL to prevent browser caching
    const timestamp = Date.now();
    this.http.get<PortfolioData>(`${this.apiUrl}/portfolio?t=${timestamp}`, {
      headers: cacheBustingHeaders
    }).pipe(
      tap(data => {
        // Ensure backward compatibility - set defaults for new fields if missing
        const portfolioData: PortfolioData = {
          ...defaultPortfolioData,
          ...data,
          experience: data.experience || [],
          education: data.education || [],
          achievements: data.achievements || []
        };
        this.portfolioDataSignal.set(portfolioData);
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Error loading portfolio data:', error);
        this.isLoading.set(false);
        // Fallback to default data if API fails
        return of(defaultPortfolioData);
      })
    ).subscribe();
  }

  updatePortfolioData(data: Partial<PortfolioData>): void {
    const current = this.portfolioDataSignal();
    const updated = { ...current, ...data };
    
    this.portfolioDataSignal.set(updated);
    
    const authHeader = this.authService.getAuthHeader();
    this.http.put<PortfolioData>(`${this.apiUrl}/portfolio`, updated, {
      headers: authHeader
    }).pipe(
      tap(response => {
        this.portfolioDataSignal.set(response);
      }),
      catchError(error => {
        console.error('Error updating portfolio data:', error);
        // Revert to previous state on error
        this.portfolioDataSignal.set(current);
        return of(current);
      })
    ).subscribe();
  }

  getPortfolioData(): PortfolioData {
    return this.portfolioData();
  }

  addProject(project: Omit<Project, 'id'>): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.post<Project>(`${this.apiUrl}/portfolio/projects`, project, {
      headers: authHeader
    }).pipe(
      tap(newProject => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          projects: [...current.projects, newProject]
        });
      }),
      catchError(error => {
        console.error('Error adding project:', error);
        return of(null);
      })
    ).subscribe();
  }

  updateProject(id: number, project: Partial<Project>): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.put<Project>(`${this.apiUrl}/portfolio/projects/${id}`, project, {
      headers: authHeader
    }).pipe(
      tap(updatedProject => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          projects: current.projects.map(p => p.id === id ? updatedProject : p)
        });
      }),
      catchError(error => {
        console.error('Error updating project:', error);
        return of(null);
      })
    ).subscribe();
  }

  deleteProject(id: number): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.delete(`${this.apiUrl}/portfolio/projects/${id}`, {
      headers: authHeader
    }).pipe(
      tap(() => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          projects: current.projects.filter(p => p.id !== id)
        });
      }),
      catchError(error => {
        console.error('Error deleting project:', error);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Clear portfolio data (used on logout)
   */
  clearPortfolioData(): void {
    // Immediately clear the signal to prevent showing old data
    this.portfolioDataSignal.set(defaultPortfolioData);
    this.isLoading.set(false);
  }

  /**
   * Reload portfolio data (used after login)
   */
  reloadPortfolioData(): void {
    // Clear old data first to prevent showing stale data
    this.portfolioDataSignal.set(defaultPortfolioData);
    this.isLoading.set(false);
    
    // Load fresh data immediately
    this.loadPortfolioData();
  }

  // ==================== Experience Methods ====================

  addExperience(experience: Omit<Experience, 'id'>): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.post<Experience>(`${this.apiUrl}/portfolio/experience`, experience, {
      headers: authHeader
    }).pipe(
      tap(newExperience => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          experience: [...current.experience, newExperience]
        });
      }),
      catchError(error => {
        console.error('Error adding experience:', error);
        return of(null);
      })
    ).subscribe();
  }

  updateExperience(id: string, experience: Partial<Experience>): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.put<Experience>(`${this.apiUrl}/portfolio/experience/${id}`, experience, {
      headers: authHeader
    }).pipe(
      tap(updatedExperience => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          experience: current.experience.map(e => e.id === id ? updatedExperience : e)
        });
      }),
      catchError(error => {
        console.error('Error updating experience:', error);
        return of(null);
      })
    ).subscribe();
  }

  deleteExperience(id: string): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.delete(`${this.apiUrl}/portfolio/experience/${id}`, {
      headers: authHeader
    }).pipe(
      tap(() => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          experience: current.experience.filter(e => e.id !== id)
        });
      }),
      catchError(error => {
        console.error('Error deleting experience:', error);
        return of(null);
      })
    ).subscribe();
  }

  // ==================== Education Methods ====================

  addEducation(education: Omit<Education, 'id'>): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.post<Education>(`${this.apiUrl}/portfolio/education`, education, {
      headers: authHeader
    }).pipe(
      tap(newEducation => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          education: [...current.education, newEducation]
        });
      }),
      catchError(error => {
        console.error('Error adding education:', error);
        return of(null);
      })
    ).subscribe();
  }

  updateEducation(id: string, education: Partial<Education>): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.put<Education>(`${this.apiUrl}/portfolio/education/${id}`, education, {
      headers: authHeader
    }).pipe(
      tap(updatedEducation => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          education: current.education.map(e => e.id === id ? updatedEducation : e)
        });
      }),
      catchError(error => {
        console.error('Error updating education:', error);
        return of(null);
      })
    ).subscribe();
  }

  deleteEducation(id: string): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.delete(`${this.apiUrl}/portfolio/education/${id}`, {
      headers: authHeader
    }).pipe(
      tap(() => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          education: current.education.filter(e => e.id !== id)
        });
      }),
      catchError(error => {
        console.error('Error deleting education:', error);
        return of(null);
      })
    ).subscribe();
  }

  // ==================== Achievements Methods ====================

  addAchievement(achievement: Omit<Achievement, 'id'>): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.post<Achievement>(`${this.apiUrl}/portfolio/achievements`, achievement, {
      headers: authHeader
    }).pipe(
      tap(newAchievement => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          achievements: [...current.achievements, newAchievement]
        });
      }),
      catchError(error => {
        console.error('Error adding achievement:', error);
        return of(null);
      })
    ).subscribe();
  }

  updateAchievement(id: string, achievement: Partial<Achievement>): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.put<Achievement>(`${this.apiUrl}/portfolio/achievements/${id}`, achievement, {
      headers: authHeader
    }).pipe(
      tap(updatedAchievement => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          achievements: current.achievements.map(a => a.id === id ? updatedAchievement : a)
        });
      }),
      catchError(error => {
        console.error('Error updating achievement:', error);
        return of(null);
      })
    ).subscribe();
  }

  deleteAchievement(id: string): void {
    const authHeader = this.authService.getAuthHeader();
    this.http.delete(`${this.apiUrl}/portfolio/achievements/${id}`, {
      headers: authHeader
    }).pipe(
      tap(() => {
        const current = this.portfolioDataSignal();
        this.portfolioDataSignal.set({
          ...current,
          achievements: current.achievements.filter(a => a.id !== id)
        });
      }),
      catchError(error => {
        console.error('Error deleting achievement:', error);
        return of(null);
      })
    ).subscribe();
  }
}
