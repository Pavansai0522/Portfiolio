import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TechNewsComponent } from '../tech-news/tech-news.component';
import { AppliedJobsService } from '../../services/applied-jobs.service';
import { ResumeGeneratorService, Template } from '../../services/resume-generator.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TechNewsComponent, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  protected readonly appliedJobsService = inject(AppliedJobsService);
  private readonly resumeGeneratorService = inject(ResumeGeneratorService);
  
  protected readonly templates = signal<Template[]>([]);
  protected readonly selectedTemplate = signal<string>('classic');
  
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
          // Fallback templates
          this.templates.set([
            { id: 'classic', name: 'Classic' },
            { id: 'modern', name: 'Modern' },
            { id: 'minimal', name: 'Minimal' },
            { id: 'executive', name: 'Executive' },
            { id: 'creative', name: 'Creative' }
          ]);
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
      }
    });
  }
  
  selectTemplate(templateId: string) {
    this.selectedTemplate.set(templateId);
  }
  
  navigateToGenerator(templateId: string) {
    window.location.href = `/resume-generator?template=${templateId}`;
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
}
