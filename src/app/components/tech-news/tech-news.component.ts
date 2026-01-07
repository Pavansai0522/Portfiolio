import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService, TechNewsArticle } from '../../services/api.service';

@Component({
  selector: 'app-tech-news',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './tech-news.component.html',
  styleUrl: './tech-news.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechNewsComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly articles = signal<TechNewsArticle[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTechNews();
  }

  private loadTechNews(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.apiService.getTechNews().subscribe({
      next: (response) => {
        this.articles.set(response.articles || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading tech news:', err);
        this.error.set('Failed to load tech news');
        this.isLoading.set(false);
      }
    });
  }

  protected refreshNews(): void {
    this.loadTechNews();
  }

  protected openArticle(url: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  protected handleImageError(event: Event, title: string): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      const encodedTitle = encodeURIComponent(title.substring(0, 20));
      img.src = `https://via.placeholder.com/400x200/6366f1/ffffff?text=${encodedTitle}`;
    }
  }
}
