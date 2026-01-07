import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioDataService, PortfolioData } from '../../services/portfolio-data.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent {
  protected readonly portfolioService = inject(PortfolioDataService);
  protected readonly portfolioData = this.portfolioService.portfolioData;
  
  protected readonly isEditing = signal(false);
  protected readonly formData = signal<Partial<PortfolioData>>({});

  protected readonly hasSkills = computed(() => {
    const skills = this.formData().skills;
    return skills && skills.length > 0;
  });

  constructor() {
    // Initialize form data from portfolio data
    this.formData.set({ ...this.portfolioData() });
  }

  protected toggleEdit(): void {
    if (this.isEditing()) {
      this.saveData();
    } else {
      this.formData.set({ ...this.portfolioData() });
    }
    this.isEditing.update(v => !v);
  }

  protected onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const target = e.target;
        if (target?.result && typeof target.result === 'string') {
          this.formData.update(current => ({ ...current, profileImage: target.result as string }));
          this.portfolioService.updatePortfolioData({ profileImage: target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  protected addSkill(): void {
    const skill = prompt('Enter a skill:');
    if (skill && skill.trim()) {
      this.formData.update(current => {
        const skills = current.skills || [];
        return { ...current, skills: [...skills, skill.trim()] };
      });
    }
  }

  protected removeSkill(index: number): void {
    this.formData.update(current => {
      const skills = current.skills || [];
      const newSkills = [...skills];
      newSkills.splice(index, 1);
      return { ...current, skills: newSkills };
    });
  }

  protected updateName(value: string): void {
    this.formData.update(f => ({ ...f, name: value }));
  }

  protected updateTitle(value: string): void {
    this.formData.update(f => ({ ...f, title: value }));
  }

  protected updateEmail(value: string): void {
    this.formData.update(f => ({ ...f, email: value }));
  }

  protected updatePhone(value: string): void {
    this.formData.update(f => ({ ...f, phone: value }));
  }

  protected updateLocation(value: string): void {
    this.formData.update(f => ({ ...f, location: value }));
  }

  protected updateBio(value: string): void {
    this.formData.update(f => ({ ...f, bio: value }));
  }

  private saveData(): void {
    this.portfolioService.updatePortfolioData(this.formData());
  }
}
