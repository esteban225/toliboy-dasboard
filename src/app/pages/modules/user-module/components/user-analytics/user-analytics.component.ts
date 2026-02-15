import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexPlotOptions,
  ApexYAxis,
  ApexXAxis,
  ApexFill,
  ApexTooltip,
  ApexStroke,
  ApexLegend,
  ApexTitleSubtitle,
  ApexResponsive,
  ApexNonAxisChartSeries,
  ApexGrid
} from 'ng-apexcharts';
import { UserService } from '../../services/user.service';
import { WorklogService } from '../../services/worklog.service';
import { UserData } from '../../models/userData.model';
import { Worklog } from '../../models/worklog.model';

export interface ChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  title: ApexTitleSubtitle;
  colors: string[];
  grid: ApexGrid;
  responsive: ApexResponsive[];
}

export interface DonutChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  responsive: ApexResponsive[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
}

interface UserAnalytics {
  userId: number;
  userName: string;
  totalHours: number;
  overtimeHours: number;
  workDays: number;
  avgHoursPerDay: number;
  roleId: number;
}

interface DailyStats {
  date: string;
  totalHours: number;
  userCount: number;
}

@Component({
  selector: 'app-user-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgApexchartsModule],
  templateUrl: './user-analytics.component.html',
  styleUrl: './user-analytics.component.scss'
})
export class UserAnalyticsComponent implements OnInit, OnDestroy {
  @ViewChild('hoursChart') hoursChart!: ChartComponent;
  @ViewChild('trendChart') trendChart!: ChartComponent;
  @ViewChild('roleChart') roleChart!: ChartComponent;

  filterForm!: FormGroup;
  users: UserData[] = [];
  worklogs: Worklog[] = [];
  userAnalytics: UserAnalytics[] = [];
  dailyStats: DailyStats[] = [];

  loading = false;
  dataLoaded = false;

  // KPIs
  totalUsers = 0;
  totalHours = 0;
  totalOvertimeHours = 0;
  avgHoursPerUser = 0;
  activeUsersCount = 0;

  // Chart options
  hoursChartOptions!: Partial<ChartOptions>;
  trendChartOptions!: Partial<ChartOptions>;
  roleChartOptions!: Partial<DonutChartOptions>;

  readonly roleOptions = [
    { id: 1, label: 'Desarrollador', color: '#17a2b8' },
    { id: 2, label: 'Gerente General', color: '#0d6efd' },
    { id: 3, label: 'Ingeniero de planta', color: '#198754' },
    { id: 4, label: 'Ingeniero de producción', color: '#ffc107' },
    { id: 5, label: 'Trazabilidad', color: '#6c757d' },
    { id: 6, label: 'Operador', color: '#212529' }
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly worklogService: WorklogService
  ) {
    this.initForm();
    this.initCharts();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filterForm = this.fb.group({
      startDate: [this.formatDate(firstDayOfMonth)],
      endDate: [this.formatDate(today)],
      roleId: ['all']
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private initCharts(): void {
    this.hoursChartOptions = {
      series: [{ name: 'Horas trabajadas', data: [] }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: true }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}h`,
        offsetX: 20,
        style: { fontSize: '12px', colors: ['#304758'] }
      },
      xaxis: {
        categories: [],
        title: { text: 'Horas' }
      },
      yaxis: { title: { text: '' } },
      fill: { opacity: 1 },
      tooltip: {
        y: { formatter: (val: number) => `${val.toFixed(2)} horas` }
      },
      colors: ['#0d6efd'],
      stroke: { show: true, width: 2, colors: ['transparent'] },
      legend: { show: false },
      title: { text: 'Horas por Usuario', align: 'left' },
      grid: { borderColor: '#f1f1f1' },
      responsive: []
    };

    this.trendChartOptions = {
      series: [{ name: 'Horas totales', data: [] }],
      chart: {
        type: 'area',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: true }
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      xaxis: {
        type: 'datetime',
        categories: [],
        title: { text: 'Fecha' }
      },
      yaxis: { title: { text: 'Horas' } },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.2,
          stops: [0, 90, 100]
        }
      },
      tooltip: {
        x: { format: 'dd MMM yyyy' },
        y: { formatter: (val: number) => `${val.toFixed(2)} horas` }
      },
      colors: ['#198754'],
      legend: { show: false },
      title: { text: 'Tendencia de Horas Diarias', align: 'left' },
      plotOptions: {},
      grid: { borderColor: '#f1f1f1' },
      responsive: []
    };

    this.roleChartOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 350
      },
      labels: [],
      colors: this.roleOptions.map(r => r.color),
      legend: {
        position: 'bottom',
        horizontalAlign: 'center'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Horas',
                formatter: () => `${this.totalHours.toFixed(1)}h`
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { width: 280 },
            legend: { position: 'bottom' }
          }
        }
      ]
    };
  }

  loadData(): void {
    this.loading = true;
    
    const filters: any = { per_page: 100 };

    
    forkJoin({
      users: this.userService.getUsers(),
      worklogs: this.worklogService.getWorklogs(filters)
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: ({ users, worklogs }) => {
          this.users = users ?? [];
          this.worklogs = worklogs?.data ?? [];
          this.processData();
          this.dataLoaded = true;
        },
        error: () => {
          this.users = [];
          this.worklogs = [];
        }
      });
  }

  onFilterChange(): void {
    this.processData();
  }

  private processData(): void {
    const { startDate, endDate, roleId } = this.filterForm.value;
    
    // Filtrar worklogs por fecha (formato ISO: 2026-02-14T05:00:00.000000Z)
    let filteredWorklogs = this.worklogs.filter(w => {
      if (!w.date) return false;
      const date = w.date.split('T')[0]; // Extraer solo la fecha del formato ISO
      return date >= startDate && date <= endDate;
    });

    // Filtrar usuarios por rol si aplica
    let filteredUsers = this.users;
    if (roleId !== 'all') {
      filteredUsers = this.users.filter(u => u.role_id === Number(roleId));
      const userIds = new Set(filteredUsers.map(u => u.id));
      filteredWorklogs = filteredWorklogs.filter(w => userIds.has(w.user_id));
    }

    this.calculateKPIs(filteredWorklogs, filteredUsers);
    this.calculateUserAnalytics(filteredWorklogs, filteredUsers);
    this.calculateDailyStats(filteredWorklogs);
    this.updateCharts();
  }

  private calculateKPIs(worklogs: Worklog[], users: UserData[]): void {
    this.totalUsers = users.length;
    this.activeUsersCount = users.filter(u => u.is_active).length;
    
    const uniqueUserIds = new Set(worklogs.map(w => w.user_id));
    
    this.totalHours = worklogs.reduce((acc, w) => {
      return acc + this.calculateHoursDiff(w.start_time, w.end_time);
    }, 0);

    this.totalOvertimeHours = worklogs.reduce((acc, w) => {
      const hours = this.calculateHoursDiff(w.start_time, w.end_time);
      return acc + Math.max(0, hours - 8);
    }, 0);

    this.avgHoursPerUser = uniqueUserIds.size > 0 
      ? this.totalHours / uniqueUserIds.size 
      : 0;
  }

  private calculateUserAnalytics(worklogs: Worklog[], users: UserData[]): void {
    const userMap = new Map<number, UserAnalytics>();

    users.forEach(user => {
      userMap.set(user.id!, {
        userId: user.id!,
        userName: user.name || `Usuario ${user.id}`,
        totalHours: 0,
        overtimeHours: 0,
        workDays: 0,
        avgHoursPerDay: 0,
        roleId: user.role_id || 6
      });
    });

    const userDates = new Map<number, Set<string>>();

    worklogs.forEach(w => {
      const analytics = userMap.get(w.user_id);
      if (analytics) {
        const hours = this.calculateHoursDiff(w.start_time, w.end_time);
        analytics.totalHours += hours;
        analytics.overtimeHours += Math.max(0, hours - 8);

        if (!userDates.has(w.user_id)) {
          userDates.set(w.user_id, new Set());
        }
        if (w.date) {
          userDates.get(w.user_id)!.add(w.date.split('T')[0]); // ISO format
        }
      }
    });

    userMap.forEach((analytics, userId) => {
      const dates = userDates.get(userId);
      analytics.workDays = dates ? dates.size : 0;
      analytics.avgHoursPerDay = analytics.workDays > 0 
        ? analytics.totalHours / analytics.workDays 
        : 0;
    });

    this.userAnalytics = Array.from(userMap.values())
      .filter(a => a.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours);
  }

  private calculateDailyStats(worklogs: Worklog[]): void {
    const dailyMap = new Map<string, { totalHours: number; users: Set<number> }>();

    worklogs.forEach(w => {
      if (!w.date) return;
      const date = w.date.split('T')[0]; // ISO format: 2026-02-14T05:00:00.000000Z
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { totalHours: 0, users: new Set() });
      }
      
      const stats = dailyMap.get(date)!;
      stats.totalHours += this.calculateHoursDiff(w.start_time, w.end_time);
      stats.users.add(w.user_id);
    });

    this.dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        totalHours: stats.totalHours,
        userCount: stats.users.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private updateCharts(): void {
    // Actualizar gráfico de barras por usuario (top 10)
    const top10Users = this.userAnalytics.slice(0, 10);
    this.hoursChartOptions = {
      ...this.hoursChartOptions,
      series: [{ name: 'Horas trabajadas', data: top10Users.map(u => Number(u.totalHours.toFixed(2))) }],
      xaxis: {
        ...this.hoursChartOptions.xaxis,
        categories: top10Users.map(u => u.userName.split(' ')[0])
      }
    };

    // Actualizar gráfico de tendencia
    this.trendChartOptions = {
      ...this.trendChartOptions,
      series: [{ 
        name: 'Horas totales', 
        data: this.dailyStats.map(d => ({
          x: new Date(d.date).getTime(),
          y: Number(d.totalHours.toFixed(2))
        }))
      }]
    };

    // Actualizar gráfico de distribución por rol
    const roleHours = new Map<number, number>();
    this.userAnalytics.forEach(u => {
      const current = roleHours.get(u.roleId) || 0;
      roleHours.set(u.roleId, current + u.totalHours);
    });

    const roleData = this.roleOptions
      .filter(r => roleHours.has(r.id))
      .map(r => ({
        label: r.label,
        value: roleHours.get(r.id) || 0,
        color: r.color
      }));

    this.roleChartOptions = {
      ...this.roleChartOptions,
      series: roleData.map(r => Number(r.value.toFixed(2))),
      labels: roleData.map(r => r.label),
      colors: roleData.map(r => r.color)
    };
  }

  // Utilidades
  calculateHoursDiff(start: string | null | undefined, end: string | null | undefined): number {
    if (!start || !end) return 0;
    
    const startTime = this.extractTimeAsMinutes(start);
    const endTime = this.extractTimeAsMinutes(end);
    
    if (startTime === null || endTime === null) return 0;
    
    let diff = endTime - startTime;
    if (diff < 0) diff += 24 * 60;
    
    return diff / 60;
  }

  private extractTimeAsMinutes(timestamp: string): number | null {
    const match = timestamp.match(/(\d{2}):(\d{2})/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }

  getRoleName(roleId: number): string {
    return this.roleOptions.find(r => r.id === roleId)?.label || 'Sin rol';
  }

  getRoleBadgeClass(roleId: number): string {
    const classes: Record<number, string> = {
      1: 'bg-info text-dark',
      2: 'bg-primary',
      3: 'bg-success',
      4: 'bg-warning text-dark',
      5: 'bg-secondary',
      6: 'bg-dark'
    };
    return classes[roleId] || 'bg-secondary';
  }

  getInitials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }
}
