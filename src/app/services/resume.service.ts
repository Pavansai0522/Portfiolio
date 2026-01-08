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

    // Fetch the blob and create a blob URL with proper MIME type
    // Then open it in a new window - browser will display based on MIME type
    this.apiService.openResume(resumeId).subscribe({
      next: (blob) => {
        // Create a new blob with explicit type to ensure browser recognizes it
        const typedBlob = new Blob([blob], { type: resume.type });
        const blobUrl = URL.createObjectURL(typedBlob);
        
        // For PDFs, create an iframe in a new window for better display
        if (resume.type === 'application/pdf') {
          // Open new window and write HTML with embedded PDF
          const newWindow = window.open('', '_blank');
          if (!newWindow) {
            alert('Please allow popups to view the resume');
            URL.revokeObjectURL(blobUrl);
            return;
          }
          
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${resume.name}</title>
                <style>
                  body { margin: 0; padding: 0; overflow: hidden; }
                  iframe { width: 100%; height: 100vh; border: none; }
                </style>
              </head>
              <body>
                <iframe src="${blobUrl}" type="${resume.type}"></iframe>
              </body>
            </html>
          `);
          newWindow.document.close();
          
          // Clean up after window closes or after delay
          newWindow.addEventListener('beforeunload', () => {
            URL.revokeObjectURL(blobUrl);
          });
          setTimeout(() => {
            // Cleanup after 30 seconds if window is still open
            try {
              if (!newWindow.closed) {
                // Don't revoke if window is still open and being used
              }
            } catch (e) {
              URL.revokeObjectURL(blobUrl);
            }
          }, 30000);
        } else {
          // For other file types (Word docs), open blob URL directly
          // Browser will handle based on MIME type
          const newWindow = window.open(blobUrl, '_blank');
          if (!newWindow) {
            alert('Please allow popups to view the resume');
            URL.revokeObjectURL(blobUrl);
            return;
          }
          
          // Clean up after window closes
          newWindow.addEventListener('beforeunload', () => {
            URL.revokeObjectURL(blobUrl);
          });
          setTimeout(() => {
            try {
              if (newWindow.closed) {
                URL.revokeObjectURL(blobUrl);
              }
            } catch (e) {
              URL.revokeObjectURL(blobUrl);
            }
          }, 10000);
        }
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

