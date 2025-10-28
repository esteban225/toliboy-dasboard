import { Component, OnInit } from '@angular/core';
import { Project, Task } from './project-manager.model';

@Component({
  selector: 'app-project-manager',
  templateUrl: './project-manager.component.html',
  styleUrls: ['./project-manager.component.scss']
})
export class ProjectManagerComponent implements OnInit {
  projects: Project[] = [];
  tasks: Task[] = [];
  selectedProject: Project | null = null;

  constructor() { }

  ngOnInit(): void {
    this.loadProjects();
  }

  private loadProjects(): void {
    // Datos de ejemplo
    this.projects = [
      {
        id: 1,
        name: 'Dashboard Redesign',
        description: 'Rediseño completo del dashboard administrativo',
        status: 'in-progress',
        priority: 'high',
        startDate: '2024-10-01',
        endDate: '2024-12-15',
        progress: 65,
        teamMembers: ['Juan Pérez', 'María García', 'Carlos López'],
        budget: 15000,
        tags: ['UI/UX', 'Frontend', 'Design']
      },
      {
        id: 2,
        name: 'API Integration',
        description: 'Integración con APIs de terceros',
        status: 'planning',
        priority: 'medium',
        startDate: '2024-11-01',
        endDate: '2024-12-30',
        progress: 25,
        teamMembers: ['Ana Martín', 'Pedro Sánchez'],
        budget: 8000,
        tags: ['Backend', 'API', 'Integration']
      }
    ];

    this.tasks = [
      {
        id: 1,
        projectId: 1,
        title: 'Diseñar mockups iniciales',
        status: 'done',
        assignedTo: 'María García',
        dueDate: '2024-10-15',
        priority: 'high'
      },
      {
        id: 2,
        projectId: 1,
        title: 'Implementar componentes base',
        status: 'in-progress',
        assignedTo: 'Juan Pérez',
        dueDate: '2024-11-01',
        priority: 'high'
      }
    ];
  }

  onProjectSelect(project: Project): void {
    this.selectedProject = project;
  }

  getStatusClass(status: string): string {
    const classes = {
      'planning': 'badge bg-warning',
      'in-progress': 'badge bg-primary',
      'completed': 'badge bg-success',
      'on-hold': 'badge bg-secondary'
    };
    return classes[status as keyof typeof classes] || 'badge bg-light';
  }

  getPriorityClass(priority: string): string {
    const classes = {
      'low': 'badge bg-info',
      'medium': 'badge bg-warning',
      'high': 'badge bg-danger',
      'urgent': 'badge bg-dark'
    };
    return classes[priority as keyof typeof classes] || 'badge bg-light';
  }
}