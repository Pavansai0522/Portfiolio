import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService, JobListing } from '../../services/api.service';
import { AppliedJobsService } from '../../services/applied-jobs.service';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly appliedJobsService = inject(AppliedJobsService);

  protected readonly allJobs = signal<JobListing[]>([]);
  protected readonly isLoadingJobs = signal(true);
  protected readonly errorJobs = signal<string | null>(null);
  protected readonly appliedJobsService_readonly = this.appliedJobsService;
  
  // Filter state
  protected readonly isFilterModalOpen = signal(false);
  protected readonly selectedCategories = signal<Set<string>>(new Set());
  protected readonly tempSelectedCategories = signal<Set<string>>(new Set()); // Temporary selection in modal
  
  // Get unique categories from all jobs
  protected readonly availableCategories = computed(() => {
    const categories = new Set<string>();
    this.allJobs().forEach(job => {
      if (job.category) {
        categories.add(job.category);
      }
    });
    return Array.from(categories).sort();
  });
  
  // Filtered jobs based on selected categories
  protected readonly jobs = computed(() => {
    const selected = this.selectedCategories();
    if (selected.size === 0) {
      return this.allJobs();
    }
    return this.allJobs().filter(job => 
      job.category && selected.has(job.category)
    );
  });

  ngOnInit(): void {
    this.loadJobs();
  }

  private loadJobs(): void {
    this.isLoadingJobs.set(true);
    this.errorJobs.set(null);

    this.apiService.getJobs().subscribe({
      next: (response) => {
        this.allJobs.set(response.jobs || []);
        this.isLoadingJobs.set(false);
      },
      error: (err) => {
        console.error('Error loading jobs:', err);
        this.errorJobs.set('Failed to load job listings');
        this.isLoadingJobs.set(false);
      }
    });
  }

  protected refreshJobs(): void {
    this.loadJobs();
  }

  protected openJob(job: JobListing): void {
    if (job.url) {
      // Track the applied job
      this.appliedJobsService.addAppliedJob(job);
      window.open(job.url, '_blank', 'noopener,noreferrer');
    }
  }

  protected isJobApplied(jobId: number): boolean {
    return this.appliedJobsService.isJobApplied(jobId);
  }
  
  // Filter modal methods
  protected openFilterModal(): void {
    // Initialize temp selection with current selection
    this.tempSelectedCategories.set(new Set(this.selectedCategories()));
    this.isFilterModalOpen.set(true);
  }
  
  protected closeFilterModal(): void {
    // Reset temp selection when closing without applying
    this.tempSelectedCategories.set(new Set(this.selectedCategories()));
    this.isFilterModalOpen.set(false);
  }
  
  protected toggleCategory(category: string): void {
    // Update temporary selection (not the actual filter)
    const tempSelected = new Set(this.tempSelectedCategories());
    if (tempSelected.has(category)) {
      tempSelected.delete(category);
    } else {
      tempSelected.add(category);
    }
    this.tempSelectedCategories.set(tempSelected);
  }
  
  protected isCategorySelected(category: string): boolean {
    // Check temp selection when modal is open, actual selection otherwise
    if (this.isFilterModalOpen()) {
      return this.tempSelectedCategories().has(category);
    }
    return this.selectedCategories().has(category);
  }
  
  protected clearFilters(): void {
    // Clear temporary selection in modal
    if (this.isFilterModalOpen()) {
      this.tempSelectedCategories.set(new Set());
    } else {
      // Clear actual filters when not in modal
      this.selectedCategories.set(new Set());
    }
  }
  
  protected applyFilters(): void {
    // Apply temporary selection to actual filter
    this.selectedCategories.set(new Set(this.tempSelectedCategories()));
    this.closeFilterModal();
  }
  
  protected getActiveFiltersCount(): number {
    return this.selectedCategories().size;
  }
  
  protected getSelectedCategoriesArray(): string[] {
    return Array.from(this.selectedCategories());
  }
  
  protected getJobCountForCategory(category: string): number {
    return this.allJobs().filter(job => job.category === category).length;
  }
}
