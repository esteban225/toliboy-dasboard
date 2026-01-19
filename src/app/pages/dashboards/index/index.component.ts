import { Component, Renderer2} from '@angular/core';
import { Observable } from 'rxjs';

// Get Data
import { SourceModel, campaignModel } from './index.model';
import { campaign, sourceData, sessionData } from '../../../core/data/analytics';
import { DecimalPipe } from '@angular/common';
import { IndexService } from './index.service';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss'],
  providers: [IndexService, DecimalPipe]
})

// Index Xomponent
export class IndexComponent {

  performanceChart: any;
  realizedChart: any;
  balanceoverviewChart: any;
  usersActivityChart: any;
  shadesheatmapChart: any;
  semiradialbarChart: any;
  SourceList!: SourceModel[];
  CampaignList!: Observable<campaignModel[]>;
  total: Observable<number>;
  sources: any;
  campaigns: any;
  sessionList: any;
  stacked: any;
  selectSort: any = 'Source';
  user: any = {};

  constructor(public service: IndexService,private renderer: Renderer2) {
    this.CampaignList = service.countries$;
    this.total = service.total$;
    this.user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    // Fetch Data
    this.sources = sourceData;
    this.sessionList = sessionData;

    setTimeout(() => {
      this.CampaignList.subscribe(x => {
        this.campaigns = Object.assign([], x);
      });
      document.getElementById('elmLoader')?.classList.add('d-none')
    }, 1000)

    this.stacked = [
      {
        type: undefined,
        value: 69,
      },
      {
        type: 'success',
        value: 31,
      },
    ]

  }

  ngAfterViewInit() {
    this.renderer.addClass(document.body, 'dashboard-topbar-wrapper');
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'dashboard-topbar-wrapper');
  }

  num: number = 0;

  option = {
    startVal: this.num,
    useEasing: true,
    duration: 2,
    decimalPlaces: 2,
  };

}