import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioDataService, Project } from '../../services/portfolio-data.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsComponent {
  protected readonly portfolioService = inject(PortfolioDataService);
  protected readonly portfolioData = this.portfolioService.portfolioData;
  
  protected readonly isAddingProject = signal(false);
  protected readonly isEditingProject = signal<number | null>(null);
  protected readonly newProject = signal<Partial<Project>>({
    title: '',
    description: '',
    technologies: [],
    image: null,
    link: ''
  });
  protected readonly projectForm = signal<Partial<Project>>({});

  protected readonly hasProjects = computed(() => this.portfolioData().projects.length > 0);

  protected startAddingProject(): void {
    this.isAddingProject.set(true);
    this.newProject.set({
      title: '',
      description: '',
      technologies: [],
      image: null,
      link: ''
    });
  }

  protected cancelAddingProject(): void {
    this.isAddingProject.set(false);
    this.isEditingProject.set(null);
  }

  protected startEditingProject(project: Project): void {
    this.isEditingProject.set(project.id);
    this.projectForm.set({ ...project });
  }

  protected onProjectImageUpload(event: Event, isNew: boolean): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const target = e.target;
        if (target?.result && typeof target.result === 'string') {
          if (isNew) {
            this.newProject.update(p => ({ ...p, image: target.result as string }));
          } else {
            this.projectForm.update(p => ({ ...p, image: target.result as string }));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  }

  protected addTechnology(isNew: boolean): void {
    const tech = prompt('Enter a technology:');
    if (tech && tech.trim()) {
      if (isNew) {
        this.newProject.update(p => {
          const technologies = p.technologies || [];
          return { ...p, technologies: [...technologies, tech.trim()] };
        });
      } else {
        this.projectForm.update(p => {
          const technologies = p.technologies || [];
          return { ...p, technologies: [...technologies, tech.trim()] };
        });
      }
    }
  }

  protected removeTechnology(index: number, isNew: boolean): void {
    if (isNew) {
      this.newProject.update(p => {
        const technologies = p.technologies || [];
        const newTechs = [...technologies];
        newTechs.splice(index, 1);
        return { ...p, technologies: newTechs };
      });
    } else {
      this.projectForm.update(p => {
        const technologies = p.technologies || [];
        const newTechs = [...technologies];
        newTechs.splice(index, 1);
        return { ...p, technologies: newTechs };
      });
    }
  }

  protected saveProject(): void {
    const editingId = this.isEditingProject();
    if (editingId !== null) {
      this.portfolioService.updateProject(editingId, this.projectForm());
      this.isEditingProject.set(null);
    } else {
      const project = {
        title: this.newProject().title || '',
        description: this.newProject().description || '',
        technologies: this.newProject().technologies || [],
        image: this.newProject().image || null,
        link: this.newProject().link
      };
      this.portfolioService.addProject(project);
      this.isAddingProject.set(false);
    }
  }

  protected deleteProject(id: number): void {
    if (confirm('Are you sure you want to delete this project?')) {
      this.portfolioService.deleteProject(id);
    }
  }

  protected updateNewProjectTitle(value: string): void {
    this.newProject.update(p => ({ ...p, title: value }));
  }

  protected updateNewProjectDescription(value: string): void {
    this.newProject.update(p => ({ ...p, description: value }));
  }

  protected updateNewProjectLink(value: string): void {
    this.newProject.update(p => ({ ...p, link: value }));
  }

  protected updateProjectFormTitle(value: string): void {
    this.projectForm.update(p => ({ ...p, title: value }));
  }

  protected updateProjectFormDescription(value: string): void {
    this.projectForm.update(p => ({ ...p, description: value }));
  }

  protected updateProjectFormLink(value: string): void {
    this.projectForm.update(p => ({ ...p, link: value }));
  }
}
