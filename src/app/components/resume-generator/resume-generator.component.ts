import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ResumeGeneratorService, ResumeData, ExperienceItem, EducationItem, Template } from '../../services/resume-generator.service';
import { PortfolioDataService, Experience, Education } from '../../services/portfolio-data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-resume-generator',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './resume-generator.component.html',
  styleUrl: './resume-generator.component.scss'
})
export class ResumeGeneratorComponent implements OnInit {
  // Form data
  name = signal('');
  email = signal('');
  phone = signal('');
  skills = signal<string[]>([]);
  skillInput = signal('');
  experience = signal<ExperienceItem[]>([]);
  education = signal<EducationItem[]>([]);
  
  // Template and format
  selectedTemplate = signal('classic');
  selectedFormat = signal<'pdf' | 'docx'>('pdf');
  templates = signal<Template[]>([]);
  
  // UI state
  isLoading = signal(false);
  previewHtml = signal<SafeHtml | null>(null);
  
  // New experience/education items
  newExperience: ExperienceItem = {
    position: '',
    company: '',
    description: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  };
  
  newEducation: EducationItem = {
    degree: '',
    institution: '',
    field: '',
    description: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  };

  // Date picker values
  newExperienceStartDate: Date | null = null;
  newExperienceEndDate: Date | null = null;
  newEducationStartDate: Date | null = null;
  newEducationEndDate: Date | null = null;
  
  showExperienceForm = signal(false);
  showEducationForm = signal(false);
  
  private readonly portfolioService = inject(PortfolioDataService);
  protected readonly dataLoaded = signal(false);

  constructor(
    private resumeService: ResumeGeneratorService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadTemplates();
    
    // Check for template query parameter
    this.route.queryParams.subscribe(params => {
      if (params['template']) {
        this.selectedTemplate.set(params['template']);
      }
    });
    
    // Try to load portfolio data immediately
    this.loadPortfolioData();
    
    // Also check after a short delay in case portfolio data is still loading
    setTimeout(() => {
      if (!this.dataLoaded()) {
        this.loadPortfolioData();
      }
    }, 500);
    
    this.updatePreview();
  }
  
  loadPortfolioData() {
    const portfolio = this.portfolioService.getPortfolioData();
    if (portfolio && (portfolio.name || portfolio.email)) {
      this.mapPortfolioToResume(portfolio);
    }
  }
  
  mapPortfolioToResume(portfolio: { name?: string; email?: string; phone?: string; skills?: string[]; experience?: Experience[]; education?: Education[] }) {
    if (!portfolio) return;
    
    // Only map if we have at least name or email
    if (!portfolio.name && !portfolio.email) return;
    
    // Map portfolio data to resume form (only if not already set or if portfolio has data)
    if (portfolio.name && (!this.name() || this.name() === '')) {
      this.name.set(portfolio.name);
    }
    if (portfolio.email && (!this.email() || this.email() === '')) {
      this.email.set(portfolio.email);
    }
    if (portfolio.phone && (!this.phone() || this.phone() === '')) {
      this.phone.set(portfolio.phone);
    }
    if (portfolio.skills && portfolio.skills.length > 0 && this.skills().length === 0) {
      this.skills.set([...portfolio.skills]);
    }
    
    // Map experience from portfolio to resume format (only if empty)
    if (portfolio.experience && portfolio.experience.length > 0 && this.experience().length === 0) {
      const mappedExperience: ExperienceItem[] = portfolio.experience.map((exp: Experience) => ({
        position: exp.position || '',
        company: exp.company || '',
        description: exp.description || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        isCurrent: exp.isCurrent || false
      }));
      this.experience.set(mappedExperience);
    }
    
    // Set date picker values for new experience if loading from portfolio
    if (portfolio.experience && portfolio.experience.length > 0) {
      const firstExp = portfolio.experience[0];
      if (firstExp.startDate) {
        this.newExperienceStartDate = this.parseDateString(firstExp.startDate);
      }
      if (firstExp.endDate) {
        this.newExperienceEndDate = this.parseDateString(firstExp.endDate);
      }
    }
    
    // Map education from portfolio to resume format (only if empty)
    if (portfolio.education && portfolio.education.length > 0 && this.education().length === 0) {
      const mappedEducation: EducationItem[] = portfolio.education.map((edu: Education) => ({
        degree: edu.degree || '',
        institution: edu.institution || '',
        field: edu.field || '',
        description: edu.description || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        isCurrent: edu.isCurrent || false
      }));
      this.education.set(mappedEducation);
    }
    
    // Set date picker values for new education if loading from portfolio
    if (portfolio.education && portfolio.education.length > 0) {
      const firstEdu = portfolio.education[0];
      if (firstEdu.startDate) {
        this.newEducationStartDate = this.parseDateString(firstEdu.startDate);
      }
      if (firstEdu.endDate) {
        this.newEducationEndDate = this.parseDateString(firstEdu.endDate);
      }
    }
    
    // Only mark as loaded if we actually mapped some data
    if (portfolio.name || portfolio.email || (portfolio.skills && portfolio.skills.length > 0) || 
        (portfolio.experience && portfolio.experience.length > 0) || 
        (portfolio.education && portfolio.education.length > 0)) {
      this.dataLoaded.set(true);
    }
    
    this.updatePreview();
  }
  
  loadFromPortfolio() {
    // Reset the loaded flag to allow reloading
    this.dataLoaded.set(false);
    
    // Reload portfolio data to ensure we have the latest
    this.portfolioService.reloadPortfolioData();
    
    // Wait a bit for data to load, then map it
    setTimeout(() => {
      const portfolio = this.portfolioService.getPortfolioData();
      if (portfolio) {
        // Force reload by clearing existing data first
        this.name.set('');
        this.email.set('');
        this.phone.set('');
        this.skills.set([]);
        this.experience.set([]);
        this.education.set([]);
        this.dataLoaded.set(false);
        
        // Then map the portfolio data
        this.mapPortfolioToResume(portfolio);
      }
    }, 500);
  }

  loadTemplates() {
    this.resumeService.getTemplates().subscribe({
      next: (response) => {
        if (response.success) {
          this.templates.set(response.templates);
          if (response.templates.length > 0 && !this.selectedTemplate()) {
            this.selectedTemplate.set(response.templates[0].id);
          }
        }
      },
      error: (err) => {
        console.error('Error loading templates:', err);
      }
    });
  }

  addSkill() {
    const skill = this.skillInput().trim();
    if (skill && !this.skills().includes(skill)) {
      this.skills.set([...this.skills(), skill]);
      this.skillInput.set('');
      this.updatePreview();
    }
  }

  removeSkill(skill: string) {
    this.skills.set(this.skills().filter(s => s !== skill));
    this.updatePreview();
  }

  // Helper methods for date conversion
  parseDateString(dateStr: string): Date | null {
    if (!dateStr) return null;
    const months: { [key: string]: number } = {
      'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
      'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
      'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
      'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
    };
    
    const parts = dateStr.trim().toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      const monthName = parts[0];
      const year = parseInt(parts[1]);
      if (months[monthName] !== undefined && !isNaN(year)) {
        return new Date(year, months[monthName], 1);
      }
    }
    
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return null;
  }

  formatDateForDisplay(date: Date | null): string {
    if (!date) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  onNewExperienceStartDateChange(date: Date | null): void {
    this.newExperienceStartDate = date;
    if (date) {
      this.newExperience.startDate = this.formatDateForDisplay(date);
    }
  }

  onNewExperienceEndDateChange(date: Date | null): void {
    this.newExperienceEndDate = date;
    if (date) {
      this.newExperience.endDate = this.formatDateForDisplay(date);
    } else {
      this.newExperience.endDate = '';
    }
  }

  onNewExperienceIsCurrentChange(isCurrent: boolean): void {
    this.newExperience.isCurrent = isCurrent;
    if (isCurrent) {
      this.newExperienceEndDate = null;
      this.newExperience.endDate = '';
    }
  }

  onNewEducationStartDateChange(date: Date | null): void {
    this.newEducationStartDate = date;
    if (date) {
      this.newEducation.startDate = this.formatDateForDisplay(date);
    }
  }

  onNewEducationEndDateChange(date: Date | null): void {
    this.newEducationEndDate = date;
    if (date) {
      this.newEducation.endDate = this.formatDateForDisplay(date);
    } else {
      this.newEducation.endDate = '';
    }
  }

  onNewEducationIsCurrentChange(isCurrent: boolean): void {
    this.newEducation.isCurrent = isCurrent;
    if (isCurrent) {
      this.newEducationEndDate = null;
      this.newEducation.endDate = '';
    }
  }

  addExperience() {
    if (this.newExperience.position && this.newExperience.company) {
      // Ensure dates are formatted
      if (this.newExperienceStartDate) {
        this.newExperience.startDate = this.formatDateForDisplay(this.newExperienceStartDate);
      }
      if (this.newExperienceEndDate) {
        this.newExperience.endDate = this.formatDateForDisplay(this.newExperienceEndDate);
      } else if (this.newExperience.isCurrent) {
        this.newExperience.endDate = '';
      }
      
      this.experience.set([...this.experience(), { ...this.newExperience }]);
      this.newExperience = {
        position: '',
        company: '',
        description: '',
        startDate: '',
        endDate: '',
        isCurrent: false
      };
      this.newExperienceStartDate = null;
      this.newExperienceEndDate = null;
      this.showExperienceForm.set(false);
      this.updatePreview();
    }
  }

  removeExperience(index: number) {
    this.experience.set(this.experience().filter((_, i) => i !== index));
    this.updatePreview();
  }

  addEducation() {
    if (this.newEducation.degree && this.newEducation.institution) {
      // Ensure dates are formatted
      if (this.newEducationStartDate) {
        this.newEducation.startDate = this.formatDateForDisplay(this.newEducationStartDate);
      }
      if (this.newEducationEndDate) {
        this.newEducation.endDate = this.formatDateForDisplay(this.newEducationEndDate);
      } else if (this.newEducation.isCurrent) {
        this.newEducation.endDate = '';
      }
      
      this.education.set([...this.education(), { ...this.newEducation }]);
      this.newEducation = {
        degree: '',
        institution: '',
        field: '',
        description: '',
        startDate: '',
        endDate: '',
        isCurrent: false
      };
      this.newEducationStartDate = null;
      this.newEducationEndDate = null;
      this.showEducationForm.set(false);
      this.updatePreview();
    }
  }

  removeEducation(index: number) {
    this.education.set(this.education().filter((_, i) => i !== index));
    this.updatePreview();
  }

  onTemplateChange() {
    this.updatePreview();
  }

  updatePreview() {
    const data = this.getResumeData();
    const templateId = this.selectedTemplate();
    const html = this.renderPreview(data, templateId);
    this.previewHtml.set(this.sanitizer.sanitize(1, html) as SafeHtml);
  }

  getResumeData(): ResumeData {
    return {
      name: this.name(),
      email: this.email(),
      phone: this.phone(),
      skills: this.skills(),
      experience: this.experience(),
      education: this.education()
    };
  }

  renderPreview(data: ResumeData, templateId: string): string {
    // Simple client-side rendering for preview
    // This is a simplified version - in production, you might want to use the same Handlebars templates
    switch (templateId) {
      case 'classic':
        return this.renderClassicTemplate(data);
      case 'modern':
        return this.renderModernTemplate(data);
      case 'minimal':
        return this.renderMinimalTemplate(data);
      case 'executive':
        return this.renderExecutiveTemplate(data);
      case 'creative':
        return this.renderCreativeTemplate(data);
      default:
        return this.renderClassicTemplate(data);
    }
  }

  renderClassicTemplate(data: ResumeData): string {
    let html = `
      <div style="font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="font-size: 24pt; margin-bottom: 5px;">${this.escapeHtml(data.name)}</h1>
          <div style="font-size: 10pt;">
            <span>${this.escapeHtml(data.email)}</span> | 
            <span>${this.escapeHtml(data.phone)}</span>
          </div>
        </div>
    `;

    if (data.experience.length > 0) {
      html += `<div style="margin-bottom: 20px;">
        <h2 style="font-size: 14pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px;">PROFESSIONAL EXPERIENCE</h2>
      `;
      data.experience.forEach(exp => {
        html += `<div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <div>
              <div style="font-weight: bold; font-size: 12pt;">${this.escapeHtml(exp.position)}</div>
              <div style="font-weight: bold;">${this.escapeHtml(exp.company)}</div>
            </div>
            <div style="font-style: italic; font-size: 10pt;">${this.escapeHtml(exp.startDate)} - ${exp.endDate ? this.escapeHtml(exp.endDate) : 'Present'}</div>
          </div>
          ${exp.description ? `<div style="margin-top: 5px;">${this.escapeHtml(exp.description)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.education.length > 0) {
      html += `<div style="margin-bottom: 20px;">
        <h2 style="font-size: 14pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px;">EDUCATION</h2>
      `;
      data.education.forEach(edu => {
        html += `<div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <div>
              <div style="font-weight: bold; font-size: 12pt;">${this.escapeHtml(edu.degree)}</div>
              <div style="font-weight: bold;">${this.escapeHtml(edu.institution)}</div>
            </div>
            <div style="font-style: italic; font-size: 10pt;">${this.escapeHtml(edu.startDate)} - ${edu.endDate ? this.escapeHtml(edu.endDate) : 'Present'}</div>
          </div>
          ${edu.field ? `<div style="margin-top: 5px;">Field: ${this.escapeHtml(edu.field)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.skills.length > 0) {
      html += `<div style="margin-bottom: 20px;">
        <h2 style="font-size: 14pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px;">SKILLS</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
      `;
      data.skills.forEach(skill => {
        html += `<div style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-size: 10pt;">${this.escapeHtml(skill)}</div>`;
      });
      html += `</div></div>`;
    }

    html += `</div>`;
    return html;
  }

  renderModernTemplate(data: ResumeData): string {
    let html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; display: grid; grid-template-columns: 250px 1fr; gap: 30px;">
        <div style="background: #2c3e50; color: #fff; padding: 30px 20px; border-radius: 5px;">
          <div style="margin-bottom: 25px;">
            <h2 style="font-size: 16pt; font-weight: bold; color: #fff; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 3px solid #3498db;">Contact</h2>
            <div style="margin: 10px 0; font-size: 9pt;">
              <strong style="display: block; margin-bottom: 3px; color: #3498db;">Email</strong>
              ${this.escapeHtml(data.email)}
            </div>
            <div style="margin: 10px 0; font-size: 9pt;">
              <strong style="display: block; margin-bottom: 3px; color: #3498db;">Phone</strong>
              ${this.escapeHtml(data.phone)}
            </div>
          </div>
    `;

    if (data.skills.length > 0) {
      html += `<div style="margin-bottom: 25px;">
        <h2 style="font-size: 16pt; font-weight: bold; color: #fff; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 3px solid #3498db;">Skills</h2>
        <div style="display: flex; flex-direction: column; gap: 8px;">
      `;
      data.skills.forEach(skill => {
        html += `<div style="background: rgba(255, 255, 255, 0.1); padding: 8px 12px; border-radius: 5px; font-size: 9pt; color: #fff;">${this.escapeHtml(skill)}</div>`;
      });
      html += `</div></div>`;
    }

    html += `</div><div style="padding: 0 10px;">
      <div style="margin-bottom: 30px;">
        <h1 style="font-size: 28pt; font-weight: bold; color: #2c3e50; margin-bottom: 10px;">${this.escapeHtml(data.name)}</h1>
      </div>
    `;

    if (data.experience.length > 0) {
      html += `<div style="margin-bottom: 25px;">
        <h2 style="font-size: 16pt; font-weight: bold; color: #2c3e50; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 3px solid #3498db;">Experience</h2>
      `;
      data.experience.forEach(exp => {
        html += `<div style="margin-bottom: 20px; padding-left: 15px; border-left: 3px solid #ecf0f1;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: bold; font-size: 12pt; color: #2c3e50;">${this.escapeHtml(exp.position)}</div>
            <div style="font-weight: 600; font-size: 11pt; color: #3498db; margin-top: 3px;">${this.escapeHtml(exp.company)}</div>
            <div style="font-size: 9pt; color: #7f8c8d; font-style: italic; margin-top: 3px;">${this.escapeHtml(exp.startDate)} - ${exp.endDate ? this.escapeHtml(exp.endDate) : 'Present'}</div>
          </div>
          ${exp.description ? `<div style="margin-top: 8px; color: #555;">${this.escapeHtml(exp.description)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.education.length > 0) {
      html += `<div style="margin-bottom: 25px;">
        <h2 style="font-size: 16pt; font-weight: bold; color: #2c3e50; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 3px solid #3498db;">Education</h2>
      `;
      data.education.forEach(edu => {
        html += `<div style="margin-bottom: 20px; padding-left: 15px; border-left: 3px solid #ecf0f1;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: bold; font-size: 12pt; color: #2c3e50;">${this.escapeHtml(edu.degree)}</div>
            <div style="font-weight: 600; font-size: 11pt; color: #3498db; margin-top: 3px;">${this.escapeHtml(edu.institution)}</div>
            <div style="font-size: 9pt; color: #7f8c8d; font-style: italic; margin-top: 3px;">${this.escapeHtml(edu.startDate)} - ${edu.endDate ? this.escapeHtml(edu.endDate) : 'Present'}</div>
          </div>
          ${edu.field ? `<div style="margin-top: 8px; color: #555;">Field: ${this.escapeHtml(edu.field)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    html += `</div></div>`;
    return html;
  }

  renderMinimalTemplate(data: ResumeData): string {
    let html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: left; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
          <h1 style="font-size: 32pt; font-weight: 300; letter-spacing: 2px; margin-bottom: 15px; color: #1a1a1a;">${this.escapeHtml(data.name)}</h1>
          <div style="font-size: 9pt; color: #666; display: flex; gap: 20px;">
            <span>${this.escapeHtml(data.email)}</span>
            <span>${this.escapeHtml(data.phone)}</span>
          </div>
        </div>
    `;

    if (data.experience.length > 0) {
      html += `<div style="margin-bottom: 35px;">
        <h2 style="font-size: 11pt; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-bottom: 20px;">Experience</h2>
      `;
      data.experience.forEach(exp => {
        html += `<div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 11pt; color: #1a1a1a; margin-bottom: 3px;">${this.escapeHtml(exp.position)}</div>
              <div style="font-size: 10pt; color: #666;">${this.escapeHtml(exp.company)}</div>
            </div>
            <div style="font-size: 9pt; color: #999; white-space: nowrap; margin-left: 20px;">${this.escapeHtml(exp.startDate)} - ${exp.endDate ? this.escapeHtml(exp.endDate) : 'Present'}</div>
          </div>
          ${exp.description ? `<div style="margin-top: 10px; color: #555; font-size: 9.5pt;">${this.escapeHtml(exp.description)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.education.length > 0) {
      html += `<div style="margin-bottom: 35px;">
        <h2 style="font-size: 11pt; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-bottom: 20px;">Education</h2>
      `;
      data.education.forEach(edu => {
        html += `<div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 11pt; color: #1a1a1a; margin-bottom: 3px;">${this.escapeHtml(edu.degree)}</div>
              <div style="font-size: 10pt; color: #666;">${this.escapeHtml(edu.institution)}</div>
            </div>
            <div style="font-size: 9pt; color: #999; white-space: nowrap; margin-left: 20px;">${this.escapeHtml(edu.startDate)} - ${edu.endDate ? this.escapeHtml(edu.endDate) : 'Present'}</div>
          </div>
          ${edu.field ? `<div style="margin-top: 10px; color: #555; font-size: 9.5pt;">Field: ${this.escapeHtml(edu.field)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.skills.length > 0) {
      html += `<div style="margin-bottom: 35px;">
        <h2 style="font-size: 11pt; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-bottom: 20px;">Skills</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      `;
      data.skills.forEach(skill => {
        html += `<div style="padding: 4px 12px; border: 1px solid #ddd; border-radius: 2px; font-size: 9pt; color: #555; background: #fafafa;">${this.escapeHtml(skill)}</div>`;
      });
      html += `</div></div>`;
    }

    html += `</div>`;
    return html;
  }

  renderExecutiveTemplate(data: ResumeData): string {
    let html = `
      <div style="font-family: Georgia, 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: 0 auto; border: 2px solid #1a1a1a; padding: 30px;">
        <div style="text-align: center; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="font-size: 36pt; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;">${this.escapeHtml(data.name)}</h1>
          <div style="font-size: 10pt; margin-top: 10px;">
            <span style="margin: 0 15px; font-weight: 500;">${this.escapeHtml(data.email)}</span>
            <span style="margin: 0 15px; font-weight: 500;">${this.escapeHtml(data.phone)}</span>
          </div>
        </div>
    `;

    if (data.experience.length > 0) {
      html += `<div style="margin-bottom: 30px;">
        <h2 style="font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px; margin-bottom: 20px;">Professional Experience</h2>
      `;
      data.experience.forEach(exp => {
        html += `<div style="margin-bottom: 25px; padding-left: 25px; border-left: 4px solid #1a1a1a;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <div>
              <div style="font-weight: bold; font-size: 13pt;">${this.escapeHtml(exp.position)}</div>
              <div style="font-weight: 600; font-size: 11pt; color: #333; margin-top: 3px;">${this.escapeHtml(exp.company)}</div>
            </div>
            <div style="font-style: italic; font-size: 10pt; color: #555;">${this.escapeHtml(exp.startDate)} - ${exp.endDate ? this.escapeHtml(exp.endDate) : 'Present'}</div>
          </div>
          ${exp.description ? `<div style="margin-top: 10px; text-align: justify; font-size: 10.5pt;">${this.escapeHtml(exp.description)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.education.length > 0) {
      html += `<div style="margin-bottom: 30px;">
        <h2 style="font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px; margin-bottom: 20px;">Education</h2>
      `;
      data.education.forEach(edu => {
        html += `<div style="margin-bottom: 25px; padding-left: 25px; border-left: 4px solid #1a1a1a;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <div>
              <div style="font-weight: bold; font-size: 13pt;">${this.escapeHtml(edu.degree)}</div>
              <div style="font-weight: 600; font-size: 11pt; color: #333; margin-top: 3px;">${this.escapeHtml(edu.institution)}</div>
            </div>
            <div style="font-style: italic; font-size: 10pt; color: #555;">${this.escapeHtml(edu.startDate)} - ${edu.endDate ? this.escapeHtml(edu.endDate) : 'Present'}</div>
          </div>
          ${edu.field ? `<div style="margin-top: 10px; text-align: justify; font-size: 10.5pt;">Field: ${this.escapeHtml(edu.field)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.skills.length > 0) {
      html += `<div style="margin-bottom: 30px;">
        <h2 style="font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px; margin-bottom: 20px;">Core Competencies</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px;">
      `;
      data.skills.forEach(skill => {
        html += `<div style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; text-align: center; font-size: 10pt; font-weight: 500;">${this.escapeHtml(skill)}</div>`;
      });
      html += `</div></div>`;
    }

    html += `</div>`;
    return html;
  }

  renderCreativeTemplate(data: ResumeData): string {
    let html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 40px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
          <h1 style="font-size: 34pt; font-weight: 700; margin-bottom: 15px; letter-spacing: 1px;">${this.escapeHtml(data.name)}</h1>
          <div style="font-size: 10pt; display: flex; justify-content: center; gap: 25px; margin-top: 10px;">
            <span style="background: rgba(255, 255, 255, 0.2); padding: 5px 15px; border-radius: 20px;">${this.escapeHtml(data.email)}</span>
            <span style="background: rgba(255, 255, 255, 0.2); padding: 5px 15px; border-radius: 20px;">${this.escapeHtml(data.phone)}</span>
          </div>
        </div>
    `;

    if (data.experience.length > 0) {
      html += `<div style="margin-bottom: 30px;">
        <h2 style="font-size: 18pt; font-weight: 700; color: #667eea; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #667eea;">Experience</h2>
      `;
      data.experience.forEach(exp => {
        html += `<div style="margin-bottom: 25px; padding: 20px; background: #f7fafc; border-radius: 8px; border-left: 5px solid #667eea;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <div style="font-weight: 700; font-size: 12pt; color: #2d3748; margin-bottom: 5px;">${this.escapeHtml(exp.position)}</div>
              <div style="font-weight: 600; font-size: 11pt; color: #667eea;">${this.escapeHtml(exp.company)}</div>
            </div>
            <div style="font-size: 9pt; color: #718096; background: #e2e8f0; padding: 5px 12px; border-radius: 15px; white-space: nowrap;">${this.escapeHtml(exp.startDate)} - ${exp.endDate ? this.escapeHtml(exp.endDate) : 'Present'}</div>
          </div>
          ${exp.description ? `<div style="margin-top: 10px; color: #4a5568; font-size: 10pt;">${this.escapeHtml(exp.description)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.education.length > 0) {
      html += `<div style="margin-bottom: 30px;">
        <h2 style="font-size: 18pt; font-weight: 700; color: #667eea; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #667eea;">Education</h2>
      `;
      data.education.forEach(edu => {
        html += `<div style="margin-bottom: 25px; padding: 20px; background: #f7fafc; border-radius: 8px; border-left: 5px solid #667eea;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <div style="font-weight: 700; font-size: 12pt; color: #2d3748; margin-bottom: 5px;">${this.escapeHtml(edu.degree)}</div>
              <div style="font-weight: 600; font-size: 11pt; color: #667eea;">${this.escapeHtml(edu.institution)}</div>
            </div>
            <div style="font-size: 9pt; color: #718096; background: #e2e8f0; padding: 5px 12px; border-radius: 15px; white-space: nowrap;">${this.escapeHtml(edu.startDate)} - ${edu.endDate ? this.escapeHtml(edu.endDate) : 'Present'}</div>
          </div>
          ${edu.field ? `<div style="margin-top: 10px; color: #4a5568; font-size: 10pt;">Field: ${this.escapeHtml(edu.field)}</div>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    if (data.skills.length > 0) {
      html += `<div style="margin-bottom: 30px;">
        <h2 style="font-size: 18pt; font-weight: 700; color: #667eea; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #667eea;">Skills</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
      `;
      data.skills.forEach(skill => {
        html += `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 9pt; font-weight: 600; box-shadow: 0 2px 5px rgba(102, 126, 234, 0.3);">${this.escapeHtml(skill)}</div>`;
      });
      html += `</div></div>`;
    }

    html += `</div>`;
    return html;
  }

  escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  generateResume() {
    const data = this.getResumeData();
    
    if (!data.name || !data.email) {
      alert('Please fill in at least name and email');
      return;
    }

    this.isLoading.set(true);
    
    this.resumeService.generateResume(
      data,
      this.selectedTemplate(),
      this.selectedFormat()
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resume-${Date.now()}.${this.selectedFormat()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error generating resume:', err);
        alert('Failed to generate resume. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
}

