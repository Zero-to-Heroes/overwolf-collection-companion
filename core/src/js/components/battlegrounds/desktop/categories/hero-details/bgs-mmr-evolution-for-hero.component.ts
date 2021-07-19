import {
	ChangeDetectionStrategy, Component
} from '@angular/core';
import { ChartDataSets } from 'chart.js';
import { Label } from 'ng2-charts';
import { Observable } from 'rxjs/internal/Observable';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { GameStat } from '../../../../../models/mainwindow/stats/game-stat';
import { AppUiStoreService, cdLog, currentBgHeroId } from '../../../../../services/app-ui-store.service';
import { arraysEqual } from '../../../../../services/utils';

@Component({
	selector: 'bgs-mmr-evolution-for-hero',
	styleUrls: [
		`../../../../../../css/global/components-global.scss`,
		`../../../../../../css/component/battlegrounds/desktop/categories/hero-details/bgs-mmr-evolution-for-hero.component.scss`,
	],
	template: `
		<div class="bgs-mmr-evolution-for-hero">
			<graph-with-single-value
				[data]="(value$ | async).data"
				[labels]="(value$ | async).labels"
				emptyStateMessage="Start playing Battlegrounds with this hero to collect some information"
			></graph-with-single-value>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsMmrEvolutionForHeroComponent {
	value$: Observable<Value>;

	constructor(private readonly store: AppUiStoreService) {
		this.value$ = this.store
			.listen$(
				([main, nav]) => main.stats.gameStats.stats.filter((stat) => stat.gameMode === 'battlegrounds'),
				([main, nav]) => currentBgHeroId(main, nav),
			)
			.pipe()
			.pipe(
				filter(([heroStats, heroId]) => !!heroStats && !!heroId),
				distinctUntilChanged((a, b) => arraysEqual(a, b)),
				map(([heroStats, heroId]) => this.buildValue(heroStats, heroId)),
				tap((values: Value) => cdLog('emitting in ', this.constructor.name, values)),
			);
	}

	private buildValue(matchStats: readonly GameStat[], heroId: string) {
		const mmrDeltas = matchStats
			.filter((match) => match.playerCardId === heroId)
			.filter((match) => match.playerRank && match.newPlayerRank)
			.map((match) => parseInt(match.newPlayerRank) - parseInt(match.playerRank))
			.reverse();
		const finalResult = [0];
		for (let i = 0; i < mmrDeltas?.length; i++) {
			finalResult[i + 1] = finalResult[i] + mmrDeltas[i];
		}
		const result = {
			data: [
				{
					data: finalResult,
					label: 'Rating',
				},
			],
			labels: Array.from(Array(finalResult.length), (_, i) => i + 1).map((matchIndex) => '' + matchIndex),
		};
		console.debug('result', result);
		return result;
	}
}

interface Value {
	readonly data: ChartDataSets[];
	readonly labels: Label;
}
