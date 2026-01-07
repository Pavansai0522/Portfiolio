import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3001/api';

  // Cache-busting headers
  private readonly noCacheHeaders = new HttpHeaders({
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  });

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
      headers: this.noCacheHeaders
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
}

