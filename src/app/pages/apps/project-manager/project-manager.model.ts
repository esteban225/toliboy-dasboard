export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  progress: number;
  teamMembers: string[];
  budget: number;
  tags: string[];
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  assignedTo: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}