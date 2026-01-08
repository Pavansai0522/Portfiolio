import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResumeService, ResumeFile } from '../../services/resume.service';

@Component({
  selector: 'app-resume-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resume-section.component.html',
  styleUrl: './resume-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResumeSectionComponent {
  private readonly resumeService = inject(ResumeService);

  protected readonly resumes = this.resumeService.resumes;
  protected readonly isUploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      return;
    }

    // Validate file type (PDF, DOC, DOCX)
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      this.uploadError.set('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.uploadError.set('File size must be less than 10MB');
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);

    this.resumeService.uploadResume(file)
      .then(() => {
        this.isUploading.set(false);
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
      })
      .catch((error) => {
        this.isUploading.set(false);
        this.uploadError.set('Failed to upload resume: ' + error.message);
      });
  }

  protected triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  protected downloadResume(resumeId: string): void {
    this.resumeService.downloadResume(resumeId);
  }

  protected openResume(resumeId: string): void {
    this.resumeService.openResume(resumeId);
  }

  protected deleteResume(resumeId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this resume?')) {
      this.resumeService.deleteResume(resumeId);
    }
  }

  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

