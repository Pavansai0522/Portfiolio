import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AboutComponent } from '../about/about.component';
import { ProjectsComponent } from '../projects/projects.component';
import { ContactComponent } from '../contact/contact.component';
import { PortfolioDataService } from '../../services/portfolio-data.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [AboutComponent, ProjectsComponent, ContactComponent],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly portfolioService = inject(PortfolioDataService);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Reload portfolio data on initial load
    this.portfolioService.reloadPortfolioData();
    
    // Reload portfolio data whenever navigating to this route
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        filter(() => this.router.url.startsWith('/portfolio')),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.portfolioService.reloadPortfolioData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
