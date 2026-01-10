import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PortfolioDataService, PortfolioData, Experience, Education, Achievement } from '../../services/portfolio-data.service';
import { AboutComponent } from '../about/about.component';
import { ResumeSectionComponent } from '../resume-section/resume-section.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    AboutComponent, 
    ResumeSectionComponent,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly portfolioService = inject(PortfolioDataService);
  protected readonly portfolioData = this.portfolioService.portfolioData;
  
  protected readonly isEditing = signal(false);
  protected readonly formData = signal<Partial<PortfolioData>>({});
  protected readonly activeTab = signal<'overview' | 'experience' | 'education' | 'achievements' | 'resume'>('overview');

  ngOnInit(): void {
    // Check for tab query parameter
    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['overview', 'experience', 'education', 'achievements', 'resume'].includes(params['tab'])) {
        this.setActiveTab(params['tab'] as any);
      }
    });
  }

  // Experience management
  protected readonly showExperienceForm = signal(false);
  protected readonly editingExperienceId = signal<string | null>(null);
  protected readonly experienceForm = signal<Partial<Experience>>({
    company: '',
    position: '',
    description: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    location: ''
  });
  protected readonly experienceStartDate = signal<Date | null>(null);
  protected readonly experienceEndDate = signal<Date | null>(null);

  // Education management
  protected readonly showEducationForm = signal(false);
  protected readonly editingEducationId = signal<string | null>(null);
  protected readonly educationForm = signal<Partial<Education>>({
    institution: '',
    degree: '',
    field: '',
    description: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    location: ''
  });
  protected readonly educationStartDate = signal<Date | null>(null);
  protected readonly educationEndDate = signal<Date | null>(null);

  // Achievement management
  protected readonly showAchievementForm = signal(false);
  protected readonly editingAchievementId = signal<string | null>(null);
  protected readonly achievementForm = signal<Partial<Achievement>>({
    title: '',
    issuer: '',
    description: '',
    date: '',
    url: '',
    type: 'achievement'
  });

  constructor() {
    // Initialize form data from portfolio data
    this.formData.set({ ...this.portfolioData() });
  }

  protected setActiveTab(tab: 'overview' | 'experience' | 'education' | 'achievements' | 'resume'): void {
    this.activeTab.set(tab);
    // Reset forms when switching tabs
    this.showExperienceForm.set(false);
    this.showEducationForm.set(false);
    this.showAchievementForm.set(false);
    this.editingExperienceId.set(null);
    this.editingEducationId.set(null);
    this.editingAchievementId.set(null);
  }

  // Helper methods for date conversion
  protected parseDateString(dateStr: string): Date | null {
    if (!dateStr) return null;
    // Try to parse formats like "Jan 2020", "January 2020", "2020-01", etc.
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
    
    // Try ISO format or other standard formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return null;
  }

  protected formatDateForDisplay(date: Date | null): string {
    if (!date) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // ==================== Experience Methods ====================
  protected openExperienceForm(experience?: Experience): void {
    if (experience) {
      this.editingExperienceId.set(experience.id);
      this.experienceForm.set({ ...experience });
      this.experienceStartDate.set(this.parseDateString(experience.startDate || ''));
      this.experienceEndDate.set(this.parseDateString(experience.endDate || ''));
    } else {
      this.editingExperienceId.set(null);
      this.experienceForm.set({
        company: '',
        position: '',
        description: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        location: ''
      });
      this.experienceStartDate.set(null);
      this.experienceEndDate.set(null);
    }
    this.showExperienceForm.set(true);
  }

  protected closeExperienceForm(): void {
    this.showExperienceForm.set(false);
    this.editingExperienceId.set(null);
    this.experienceForm.set({
      company: '',
      position: '',
      description: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      location: ''
    });
    this.experienceStartDate.set(null);
    this.experienceEndDate.set(null);
  }

  protected onExperienceStartDateChange(date: Date | null): void {
    this.experienceStartDate.set(date);
    if (date) {
      const form = this.experienceForm();
      this.experienceForm.set({ ...form, startDate: this.formatDateForDisplay(date) });
    }
  }

  protected onExperienceEndDateChange(date: Date | null): void {
    this.experienceEndDate.set(date);
    if (date) {
      const form = this.experienceForm();
      this.experienceForm.set({ ...form, endDate: this.formatDateForDisplay(date) });
    } else {
      const form = this.experienceForm();
      this.experienceForm.set({ ...form, endDate: '' });
    }
  }

  protected onExperienceIsCurrentChange(isCurrent: boolean): void {
    const form = this.experienceForm();
    this.experienceForm.set({ ...form, isCurrent });
    if (isCurrent) {
      this.experienceEndDate.set(null);
      this.experienceForm.set({ ...form, isCurrent, endDate: '' });
    }
  }

  protected saveExperience(): void {
    const form = this.experienceForm();
    const id = this.editingExperienceId();
    
    // Update dates from date pickers if they exist
    if (this.experienceStartDate()) {
      form.startDate = this.formatDateForDisplay(this.experienceStartDate()!);
    }
    if (this.experienceEndDate()) {
      form.endDate = this.formatDateForDisplay(this.experienceEndDate()!);
    } else if (form.isCurrent) {
      form.endDate = '';
    }
    
    if (!form.company || !form.position) {
      alert('Company and Position are required');
      return;
    }

    if (id) {
      this.portfolioService.updateExperience(id, form);
    } else {
      this.portfolioService.addExperience(form as Omit<Experience, 'id'>);
    }
    
    this.closeExperienceForm();
  }

  protected deleteExperience(id: string): void {
    if (confirm('Are you sure you want to delete this experience?')) {
      this.portfolioService.deleteExperience(id);
    }
  }

  // ==================== Education Methods ====================
  protected openEducationForm(education?: Education): void {
    if (education) {
      this.editingEducationId.set(education.id);
      this.educationForm.set({ ...education });
      this.educationStartDate.set(this.parseDateString(education.startDate || ''));
      this.educationEndDate.set(this.parseDateString(education.endDate || ''));
    } else {
      this.editingEducationId.set(null);
      this.educationForm.set({
        institution: '',
        degree: '',
        field: '',
        description: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        location: ''
      });
      this.educationStartDate.set(null);
      this.educationEndDate.set(null);
    }
    this.showEducationForm.set(true);
  }

  protected closeEducationForm(): void {
    this.showEducationForm.set(false);
    this.editingEducationId.set(null);
    this.educationForm.set({
      institution: '',
      degree: '',
      field: '',
      description: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      location: ''
    });
    this.educationStartDate.set(null);
    this.educationEndDate.set(null);
  }

  protected onEducationStartDateChange(date: Date | null): void {
    this.educationStartDate.set(date);
    if (date) {
      const form = this.educationForm();
      this.educationForm.set({ ...form, startDate: this.formatDateForDisplay(date) });
    }
  }

  protected onEducationEndDateChange(date: Date | null): void {
    this.educationEndDate.set(date);
    if (date) {
      const form = this.educationForm();
      this.educationForm.set({ ...form, endDate: this.formatDateForDisplay(date) });
    } else {
      const form = this.educationForm();
      this.educationForm.set({ ...form, endDate: '' });
    }
  }

  protected onEducationIsCurrentChange(isCurrent: boolean): void {
    const form = this.educationForm();
    this.educationForm.set({ ...form, isCurrent });
    if (isCurrent) {
      this.educationEndDate.set(null);
      this.educationForm.set({ ...form, isCurrent, endDate: '' });
    }
  }

  protected saveEducation(): void {
    const form = this.educationForm();
    const id = this.editingEducationId();
    
    // Update dates from date pickers if they exist
    if (this.educationStartDate()) {
      form.startDate = this.formatDateForDisplay(this.educationStartDate()!);
    }
    if (this.educationEndDate()) {
      form.endDate = this.formatDateForDisplay(this.educationEndDate()!);
    } else if (form.isCurrent) {
      form.endDate = '';
    }
    
    if (!form.institution || !form.degree) {
      alert('Institution and Degree are required');
      return;
    }

    if (id) {
      this.portfolioService.updateEducation(id, form);
    } else {
      this.portfolioService.addEducation(form as Omit<Education, 'id'>);
    }
    
    this.closeEducationForm();
  }

  protected deleteEducation(id: string): void {
    if (confirm('Are you sure you want to delete this education?')) {
      this.portfolioService.deleteEducation(id);
    }
  }

  // ==================== Achievement Methods ====================
  protected openAchievementForm(achievement?: Achievement): void {
    if (achievement) {
      this.editingAchievementId.set(achievement.id);
      this.achievementForm.set({ ...achievement });
    } else {
      this.editingAchievementId.set(null);
      this.achievementForm.set({
        title: '',
        issuer: '',
        description: '',
        date: '',
        url: '',
        type: 'achievement'
      });
    }
    this.showAchievementForm.set(true);
  }

  protected closeAchievementForm(): void {
    this.showAchievementForm.set(false);
    this.editingAchievementId.set(null);
    this.achievementForm.set({
      title: '',
      issuer: '',
      description: '',
      date: '',
      url: '',
      type: 'achievement'
    });
  }

  protected saveAchievement(): void {
    const form = this.achievementForm();
    const id = this.editingAchievementId();
    
    if (!form.title) {
      alert('Title is required');
      return;
    }

    if (id) {
      this.portfolioService.updateAchievement(id, form);
    } else {
      this.portfolioService.addAchievement(form as Omit<Achievement, 'id'>);
    }
    
    this.closeAchievementForm();
  }

  protected deleteAchievement(id: string): void {
    if (confirm('Are you sure you want to delete this achievement?')) {
      this.portfolioService.deleteAchievement(id);
    }
  }
}
