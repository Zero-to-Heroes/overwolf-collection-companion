import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
	selector: 'settings-achievements',
	styleUrls: [
		`../../../css/global/components-global.scss`,
		`../../../css/component/settings/settings-achievements.component.scss`
	],
	template: `
		<ul class="achievements">
			<settings-achievements-menu 
					[selectedMenu]="selectedMenu"
					(onMenuSelected)="onMenuSelected($event)">	
			</settings-achievements-menu>
			<ng-container [ngSwitch]="selectedMenu">
				<settings-achievements-capture *ngSwitchCase="'capture'"></settings-achievements-capture>
				<settings-achievements-storage *ngSwitchCase="'storage'"></settings-achievements-storage>
			</ng-container>
		</ul>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAchievementsComponent {
	
	selectedMenu: string = 'capture';

	onMenuSelected(selectedMenuItem) {
		this.selectedMenu = selectedMenuItem;
	}
}
