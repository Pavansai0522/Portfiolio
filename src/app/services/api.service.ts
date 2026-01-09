import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Interfaces
export interface TechNewsArticle {
  id: number;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  image: string;
  score?: number;
  comments?: number;
}

export interface JobListing {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  url: string;
  postedAt: string;
  salary?: string | null;
  category?: string | null;
  matchPercentage?: number | null;
}

export interface TechNewsResponse {
  success: boolean;
  articles: TechNewsArticle[];
  total: number;
}

export interface JobsResponse {
  success: boolean;
  jobs: JobListing[];
  total: number;
}

export interface ResumeFile {
  id: string;
  name: string;
  uploadedAt: string;
  size: number;
  type: string;
  url?: string;
}

export interface ResumesResponse {
  success: boolean;
  resumes: ResumeFile[];
  total: number;
}

export interface ResumeUploadResponse {
  success: boolean;
  resume: ResumeFile;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3001/api';

  // Cache-busting headers
  private readonly noCacheHeaders = new HttpHeaders({
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  });

  // Get headers with authorization
  private getAuthHeaders(): HttpHeaders {
    const authHeader = this.authService.getAuthHeader();
    return new HttpHeaders({
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...(authHeader as any)
    });
  }

  /**
   * Get tech news articles
   */
  getTechNews(): Observable<TechNewsResponse> {
    return this.http.get<TechNewsResponse>(`${this.apiUrl}/tech-news`, {
      headers: this.noCacheHeaders
    });
  }

  /**
   * Get job listings
   */
  getJobs(search?: string): Observable<JobsResponse> {
    const timestamp = Date.now();
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    return this.http.get<JobsResponse>(`${this.apiUrl}/jobs?t=${timestamp}${searchParam}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get portfolio data
   */
  getPortfolio(): Observable<any> {
    return this.http.get(`${this.apiUrl}/portfolio`);
  }

  /**
   * Update portfolio data
   */
  updatePortfolio(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/portfolio`, data);
  }

  /**
   * Add a new project
   */
  addProject(project: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/portfolio/projects`, project);
  }

  /**
   * Update a project
   */
  updateProject(projectId: string, project: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/portfolio/projects/${projectId}`, project);
  }

  /**
   * Delete a project
   */
  deleteProject(projectId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/portfolio/projects/${projectId}`);
  }

  /**
   * Get all resumes
   */
  getResumes(): Observable<ResumesResponse> {
    return this.http.get<ResumesResponse>(`${this.apiUrl}/resumes`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Upload a resume file
   */
  uploadResume(file: File): Observable<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append('resume', file, file.name);
    
    // Get auth token and add to headers
    const authHeader = this.authService.getAuthHeader();
    let headers = new HttpHeaders();
    if (authHeader && 'Authorization' in authHeader) {
      headers = headers.set('Authorization', authHeader.Authorization);
    }
    
    return this.http.post<ResumeUploadResponse>(`${this.apiUrl}/resumes/upload`, formData, {
      headers: headers
      // Note: Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    });
  }

  /**
   * Download a resume file (forces download)
   */
  downloadResume(resumeId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/resumes/${resumeId}/download?download=true`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Open/view a resume file (opens in browser)
   */
  openResume(resumeId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/resumes/${resumeId}/download`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get resume file URL for viewing
   */
  getResumeUrl(resumeId: string): string {
    return `${this.apiUrl}/resumes/${resumeId}/download`;
  }

  /**
   * Delete a resume
   */
  deleteResume(resumeId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/resumes/${resumeId}`, {
      headers: this.getAuthHeaders()
    });
  }
}

