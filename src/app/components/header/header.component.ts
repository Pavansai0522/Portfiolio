import { Component, ChangeDetectionStrategy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PortfolioDataService } from '../../services/portfolio-data.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  protected readonly portfolioService = inject(PortfolioDataService);
  protected readonly portfolioData = this.portfolioService.portfolioData;
  protected readonly authService = inject(AuthService);
  
  // Expose auth state for template
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isDropdownOpen = signal(false);
  protected readonly isMobileMenuOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.isDropdownOpen.set(false);
    }
  }

  protected logout(): void {
    this.authService.logout();
    this.isDropdownOpen.set(false);
  }

  protected toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen.update(value => !value);
  }

  protected closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
