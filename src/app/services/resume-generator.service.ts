import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
}

export interface ExperienceItem {
  position: string;
  company: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
}

export interface EducationItem {
  degree: string;
  institution: string;
  field?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
}

export interface Template {
  id: string;
  name: string;
}

export interface TemplatesResponse {
  success: boolean;
  templates: Template[];
}

@Injectable({
  providedIn: 'root'
})
export class ResumeGeneratorService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3001/api';

  /**
   * Get available resume templates
   */
  getTemplates(): Observable<TemplatesResponse> {
    return this.http.get<TemplatesResponse>(`${this.apiUrl}/resume/templates`);
  }

  /**
   * Generate resume as PDF or DOCX
   */
  generateResume(
    data: ResumeData,
    templateId: string,
    format: 'pdf' | 'docx'
  ): Observable<Blob> {
    const headers = this.getAuthHeaders();
    
    return this.http.post(
      `${this.apiUrl}/resume`,
      {
        ...data,
        templateId,
        format
      },
      {
        headers,
        responseType: 'blob'
      }
    );
  }

  /**
   * Get rendered HTML for preview
   */
  getPreviewHtml(data: ResumeData, templateId: string): Observable<string> {
    // For preview, we'll render on the frontend using the same template logic
    // This is a placeholder - actual preview will be done client-side
    return new Observable(observer => {
      observer.next('');
      observer.complete();
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const authHeader = this.authService.getAuthHeader();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(authHeader as any)
    });
  }
}



