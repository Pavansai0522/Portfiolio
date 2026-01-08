import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PortfolioDataService, PortfolioData, Experience, Education, Achievement } from '../../services/portfolio-data.service';
import { AboutComponent } from '../about/about.component';
import { ResumeSectionComponent } from '../resume-section/resume-section.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AboutComponent, ResumeSectionComponent],
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

  // ==================== Experience Methods ====================
  protected openExperienceForm(experience?: Experience): void {
    if (experience) {
      this.editingExperienceId.set(experience.id);
      this.experienceForm.set({ ...experience });
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
  }

  protected saveExperience(): void {
    const form = this.experienceForm();
    const id = this.editingExperienceId();
    
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
  }

  protected saveEducation(): void {
    const form = this.educationForm();
    const id = this.editingEducationId();
    
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
