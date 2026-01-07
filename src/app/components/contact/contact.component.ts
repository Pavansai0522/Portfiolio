import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioDataService, PortfolioData } from '../../services/portfolio-data.service';

interface ContactFormData {
  email: string;
  phone: string;
  socialLinks: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactComponent {
  protected readonly portfolioService = inject(PortfolioDataService);
  protected readonly portfolioData = this.portfolioService.portfolioData;
  
  protected readonly isEditing = signal(false);
  protected readonly formData = signal<ContactFormData>({
    email: '',
    phone: '',
    socialLinks: {}
  });

  constructor() {
    const data = this.portfolioData();
    this.formData.set({
      email: data.email || '',
      phone: data.phone || '',
      socialLinks: { ...data.socialLinks }
    });
  }

  protected toggleEdit(): void {
    if (this.isEditing()) {
      this.saveData();
    } else {
      const data = this.portfolioData();
      this.formData.set({
        email: data.email || '',
        phone: data.phone || '',
        socialLinks: { ...data.socialLinks }
      });
    }
    this.isEditing.update(v => !v);
  }

  protected updateEmail(value: string): void {
    this.formData.update(f => ({ ...f, email: value }));
  }

  protected updatePhone(value: string): void {
    this.formData.update(f => ({ ...f, phone: value }));
  }

  protected updateLinkedIn(value: string): void {
    this.formData.update(f => ({ ...f, socialLinks: { ...f.socialLinks, linkedin: value } }));
  }

  protected updateGithub(value: string): void {
    this.formData.update(f => ({ ...f, socialLinks: { ...f.socialLinks, github: value } }));
  }

  protected updateTwitter(value: string): void {
    this.formData.update(f => ({ ...f, socialLinks: { ...f.socialLinks, twitter: value } }));
  }

  protected updateWebsite(value: string): void {
    this.formData.update(f => ({ ...f, socialLinks: { ...f.socialLinks, website: value } }));
  }

  private saveData(): void {
    this.portfolioService.updatePortfolioData({
      email: this.formData().email,
      phone: this.formData().phone,
      socialLinks: this.formData().socialLinks
    });
  }
}
