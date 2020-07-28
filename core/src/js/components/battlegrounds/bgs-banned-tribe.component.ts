import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Race } from '@firestone-hs/reference-data';
import { getTribeIcon } from '../../services/battlegrounds/bgs-utils';
import { capitalizeFirstLetter } from '../../services/utils';

declare let amplitude;

@Component({
	selector: 'bgs-banned-tribe',
	styleUrls: [
		'../../../css/global/components-global.scss',
		`../../../css/global/cdk-overlay.scss`,
		'../../../css/component/battlegrounds/bgs-banned-tribe.component.scss',
		`../../../css/themes/battlegrounds-theme.scss`,
	],
	template: `
		<div class="bgs-banned-tribe" [helpTooltip]="tooltip" *ngIf="image">
			<div class="background"></div>
			<img class="icon" [src]="image" />
			<img
				class="crossed"
				src="https://static.zerotoheroes.com/hearthstone/asset/coliseum/images/mulligan_discard.png"
			/>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsBannedTribeComponent {
	image: string;
	tooltip: string;

	@Input() set tribe(value: Race) {
		if (!value) {
			this.image = undefined;
			return;
		}
		this.image = getTribeIcon(value);
		const exceptionCards = this.getExceptions(value);
		const exceptions =
			exceptionCards && exceptionCards.length > 0 ? 'Exceptions: ' + exceptionCards.join(', ') : '';
		this.tooltip = `${this.getTribeName(value)}s won't appear in this run. ${exceptions}`;
	}

	private getExceptions(value: Race): string[] {
		switch (value) {
			case Race.BEAST:
				return []; //return ['Megasaur'];
			case Race.DEMON:
				return [];
			case Race.DRAGON:
				return [];
			case Race.MECH:
				return []; //return ['Zoobot'];
			case Race.MURLOC:
				return [];
			case Race.PIRATE:
				return [];
		}
		return [];
	}

	private getTribeName(value: Race): string {
		return capitalizeFirstLetter(Race[value].toLowerCase());
	}
}
