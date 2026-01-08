import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService, ResumeFile as ApiResumeFile } from './api.service';
import { catchError, map, of, tap } from 'rxjs';

export interface ResumeFile {
  id: string;
  name: string;
  file?: File | Blob;
  uploadedAt: string;
  size: number;
  type: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  private readonly apiService = inject(ApiService);
  private readonly resumesSignal = signal<ResumeFile[]>([]);

  readonly resumes = this.resumesSignal.asReadonly();
  readonly resumesCount = computed(() => this.resumes().length);

  constructor() {
    this.loadResumes();
  }

  /**
   * Upload a resume file
   */
  uploadResume(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.uploadResume(file).subscribe({
        next: (response) => {
          if (response.success && response.resume) {
            // Refresh the list from API to ensure consistency
            this.refreshResumes();
            resolve();
          } else {
            reject(new Error(response.message || 'Failed to upload resume'));
          }
        },
        error: (err) => {
          console.error('Error uploading resume:', err);
          reject(new Error(err.error?.message || 'Failed to upload resume'));
        }
      });
    });
  }

  /**
   * Download a resume file
   */
  downloadResume(resumeId: string): void {
    const resume = this.resumesSignal().find(r => r.id === resumeId);
    if (!resume) {
      console.error('Resume not found');
      return;
    }

    this.apiService.downloadResume(resumeId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = resume.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading resume:', err);
        alert('Failed to download resume. Please try again.');
      }
    });
  }

  /**
   * Open a resume file in a new tab (for viewing)
   */
  openResume(resumeId: string): void {
    const resume = this.resumesSignal().find(r => r.id === resumeId);
    if (!resume) {
      console.error('Resume not found');
      return;
    }

    // Fetch the file and open it in a new window for viewing
    // The API returns with inline disposition for viewing
    this.apiService.openResume(resumeId).subscribe({
      next: (blob) => {
        // Create object URL from blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Open in new window - browser will handle display based on file type
        // PDFs will display inline, Word docs may open in viewer or prompt
        const newWindow = window.open(blobUrl, '_blank');
        
        if (!newWindow) {
          alert('Please allow popups to view the resume');
          URL.revokeObjectURL(blobUrl);
          return;
        }
        
        // Clean up blob URL after window loads
        // Use longer delay to ensure file is loaded before cleanup
        setTimeout(() => {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch (e) {
            console.warn('Error revoking blob URL:', e);
          }
        }, 10000); // 10 seconds should be enough for most files
      },
      error: (err) => {
        console.error('Error opening resume:', err);
        alert('Failed to open resume. Please try again.');
      }
    });
  }

  /**
   * Delete a resume
   */
  deleteResume(resumeId: string): void {
    this.apiService.deleteResume(resumeId).subscribe({
      next: (response) => {
        if (response.success) {
          // Refresh the list from API to ensure consistency
          this.refreshResumes();
        } else {
          console.error('Failed to delete resume:', response.message);
          alert('Failed to delete resume. Please try again.');
        }
      },
      error: (err) => {
        console.error('Error deleting resume:', err);
        alert('Failed to delete resume. Please try again.');
      }
    });
  }

  /**
   * Get all resumes
   */
  getAllResumes(): ResumeFile[] {
    return this.resumesSignal();
  }

  /**
   * Load resumes from API
   */
  private loadResumes(): void {
    this.apiService.getResumes().pipe(
      map(response => {
        if (response.success && response.resumes) {
          return response.resumes.map(apiResume => ({
            id: apiResume.id,
            name: apiResume.name,
            uploadedAt: apiResume.uploadedAt,
            size: apiResume.size,
            type: apiResume.type,
            url: apiResume.url
          } as ResumeFile));
        }
        return [];
      }),
      catchError(err => {
        console.error('Error loading resumes:', err);
        return of([]);
      }),
      tap(resumes => {
        this.resumesSignal.set(resumes);
      })
    ).subscribe();
  }

  /**
   * Refresh resumes from API
   */
  refreshResumes(): void {
    this.loadResumes();
  }

  /**
   * Clear all resumes (used on logout)
   */
  clearResumes(): void {
    this.resumesSignal.set([]);
  }
}

