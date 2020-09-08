import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BattlegroundsCategory } from '../../../models/mainwindow/battlegrounds/battlegrounds-category';
import { MainWindowState } from '../../../models/mainwindow/main-window-state';
import { NavigationState } from '../../../models/mainwindow/navigation/navigation-state';

@Component({
	selector: 'battlegrounds-category-details',
	styleUrls: [
		`../../../../css/component/app-section.component.scss`,
		`../../../../css/component/battlegrounds/desktop/battlegrounds-category-details.component.scss`,
	],
	template: `
		<div class="battlegrounds-category-details" scrollable>
			<battlegrounds-personal-stats-heroes
				[hidden]="navigation.navigationBattlegrounds.selectedCategoryId !== 'bgs-category-personal-heroes'"
				[category]="category"
				[state]="state.battlegrounds"
			>
			</battlegrounds-personal-stats-heroes>
			<battlegrounds-personal-stats-rating
				[hidden]="navigation.navigationBattlegrounds.selectedCategoryId !== 'bgs-category-personal-rating'"
				[category]="category"
				[state]="state.battlegrounds"
			>
			</battlegrounds-personal-stats-rating>
			<battlegrounds-personal-stats-stats
				[hidden]="navigation.navigationBattlegrounds.selectedCategoryId !== 'bgs-category-personal-stats'"
				[category]="category"
				[state]="state"
			>
			</battlegrounds-personal-stats-stats>
			<battlegrounds-personal-stats-hero-details
				[hidden]="
					!navigation.navigationBattlegrounds.selectedCategoryId ||
					navigation.navigationBattlegrounds.selectedCategoryId.indexOf(
						'bgs-category-personal-hero-details'
					) === -1
				"
				[category]="category"
				[state]="state"
			>
			</battlegrounds-personal-stats-hero-details>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsCategoryDetailsComponent {
	@Input() category: BattlegroundsCategory;
	@Input() state: MainWindowState;
	@Input() navigation: NavigationState;
}