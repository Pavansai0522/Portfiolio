import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
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

  protected readonly jobs = signal<JobListing[]>([]);
  protected readonly isLoadingJobs = signal(true);
  protected readonly errorJobs = signal<string | null>(null);
  protected readonly appliedJobsService_readonly = this.appliedJobsService;

  ngOnInit(): void {
    this.loadJobs();
  }

  private loadJobs(): void {
    this.isLoadingJobs.set(true);
    this.errorJobs.set(null);

    this.apiService.getJobs().subscribe({
      next: (response) => {
        this.jobs.set(response.jobs || []);
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
}
