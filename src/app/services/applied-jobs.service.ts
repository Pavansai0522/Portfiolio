import { Injectable, signal, computed } from '@angular/core';
import { JobListing } from './api.service';

export interface AppliedJob extends JobListing {
  appliedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppliedJobsService {
  private readonly storageKey = 'applied_jobs';
  private readonly appliedJobsSignal = signal<AppliedJob[]>(this.loadAppliedJobs());

  readonly appliedJobs = this.appliedJobsSignal.asReadonly();
  readonly appliedJobsCount = computed(() => this.appliedJobs().length);

  constructor() {
    // Load from localStorage on initialization
    this.loadAppliedJobs();
  }

  /**
   * Add a job to applied jobs list
   */
  addAppliedJob(job: JobListing): void {
    const appliedJob: AppliedJob = {
      ...job,
      appliedAt: new Date().toISOString()
    };

    const currentJobs = this.appliedJobsSignal();
    
    // Check if job is already applied
    const isAlreadyApplied = currentJobs.some(j => j.id === job.id);
    
    if (!isAlreadyApplied) {
      const updatedJobs = [...currentJobs, appliedJob];
      this.appliedJobsSignal.set(updatedJobs);
      this.saveAppliedJobs(updatedJobs);
    }
  }

  /**
   * Remove a job from applied jobs list
   */
  removeAppliedJob(jobId: number): void {
    const updatedJobs = this.appliedJobsSignal().filter(job => job.id !== jobId);
    this.appliedJobsSignal.set(updatedJobs);
    this.saveAppliedJobs(updatedJobs);
  }

  /**
   * Check if a job is already applied
   */
  isJobApplied(jobId: number): boolean {
    return this.appliedJobsSignal().some(job => job.id === jobId);
  }

  /**
   * Get recent applied jobs (last 5)
   */
  getRecentAppliedJobs(limit: number = 5): AppliedJob[] {
    return this.appliedJobsSignal()
      .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Load applied jobs from localStorage
   */
  private loadAppliedJobs(): AppliedJob[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading applied jobs:', error);
    }
    return [];
  }

  /**
   * Save applied jobs to localStorage
   */
  private saveAppliedJobs(jobs: AppliedJob[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(jobs));
    } catch (error) {
      console.error('Error saving applied jobs:', error);
    }
  }

  /**
   * Clear applied jobs (used on logout)
   */
  clearAppliedJobs(): void {
    this.appliedJobsSignal.set([]);
    localStorage.removeItem(this.storageKey);
  }
}

