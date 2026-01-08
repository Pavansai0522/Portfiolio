import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, ViewChild, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ResumeService, ResumeFile } from '../../services/resume.service';
import { AuthService } from '../../services/auth.service';
import { ResumeGeneratorService, Template } from '../../services/resume-generator.service';

@Component({
  selector: 'app-resume-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './resume-card.component.html',
  styleUrl: './resume-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResumeCardComponent implements OnInit {
  private readonly resumeService = inject(ResumeService);
  private readonly authService = inject(AuthService);
  private readonly resumeGeneratorService = inject(ResumeGeneratorService);
  private readonly router = inject(Router);
  
  protected readonly isAuthenticated = this.authService.isAuthenticated;

  protected readonly resumes = this.resumeService.resumes;
  protected readonly displayedResumes = computed(() => this.resumes().slice(0, 6));
  protected readonly hasMoreResumes = computed(() => this.resumes().length > 6);
  protected readonly isUploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  
  // Template selection
  protected readonly templates = signal<Template[]>([]);
  protected readonly selectedTemplate = signal<string>('classic');
  protected readonly showTemplateSection = signal(true); // Show by default
  protected readonly isGenerating = signal(false);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  ngOnInit() {
    this.loadTemplates();
  }
  
  loadTemplates() {
    this.resumeGeneratorService.getTemplates().subscribe({
      next: (response) => {
        if (response.success && response.templates) {
          this.templates.set(response.templates);
          if (response.templates.length > 0) {
            this.selectedTemplate.set(response.templates[0].id);
          }
        } else {
          // Fallback templates if API doesn't return them
          this.templates.set([
            { id: 'classic', name: 'Classic' },
            { id: 'modern', name: 'Modern' },
            { id: 'minimal', name: 'Minimal' },
            { id: 'executive', name: 'Executive' },
            { id: 'creative', name: 'Creative' }
          ]);
          this.selectedTemplate.set('classic');
        }
      },
      error: (err) => {
        console.error('Error loading templates:', err);
        // Fallback templates on error
        this.templates.set([
          { id: 'classic', name: 'Classic' },
          { id: 'modern', name: 'Modern' },
          { id: 'minimal', name: 'Minimal' },
          { id: 'executive', name: 'Executive' },
          { id: 'creative', name: 'Creative' }
        ]);
        this.selectedTemplate.set('classic');
      }
    });
  }
  
  toggleTemplateSection() {
    this.showTemplateSection.set(!this.showTemplateSection());
  }
  
  selectTemplate(templateId: string) {
    this.selectedTemplate.set(templateId);
  }
  
  generateResumeFromTemplate() {
    this.isGenerating.set(true);
    // Navigate to resume generator with selected template
    this.router.navigate(['/resume-generator'], {
      queryParams: { template: this.selectedTemplate() }
    }).then(() => {
      this.isGenerating.set(false);
    }).catch(() => {
      this.isGenerating.set(false);
    });
  }
  
  getTemplatePreview(templateId: string): string {
    const previews: { [key: string]: string } = {
      'classic': 'Traditional format with centered header',
      'modern': 'Two-column layout with sidebar',
      'minimal': 'Clean and simple design',
      'executive': 'Professional with bold borders',
      'creative': 'Colorful gradient design'
    };
    return previews[templateId] || 'Professional resume template';
  }
  
  getTemplateColor(templateId: string): string {
    const colors: { [key: string]: string } = {
      'classic': '#1a1a1a',
      'modern': '#2c3e50',
      'minimal': '#888',
      'executive': '#1a1a1a',
      'creative': '#667eea'
    };
    return colors[templateId] || '#667eea';
  }

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

