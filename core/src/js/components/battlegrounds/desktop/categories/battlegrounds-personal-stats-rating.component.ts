import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChartDataSets } from 'chart.js';
import { Label } from 'ng2-charts';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { BgsActiveTimeFilterType } from '../../../../models/mainwindow/battlegrounds/bgs-active-time-filter.type';
import { MmrGroupFilterType } from '../../../../models/mainwindow/battlegrounds/mmr-group-filter-type';
import { GameStat } from '../../../../models/mainwindow/stats/game-stat';
import { AppUiStoreService, cdLog } from '../../../../services/app-ui-store.service';
import { arraysEqual, formatDate, groupByFunction } from '../../../../services/utils';

@Component({
	selector: 'battlegrounds-personal-stats-rating',
	styleUrls: [
		`../../../../../css/global/components-global.scss`,
		`../../../../../css/component/battlegrounds/desktop/categories/battlegrounds-personal-stats-rating.component.scss`,
	],
	template: `
		<div class="battlegrounds-personal-stats-rating">
			<div class="header">MMR / Matches</div>
			<graph-with-single-value
				[data]="(value$ | async).data"
				[labels]="(value$ | async).labels"
				emptyStateMessage="Start playing Battlegrounds to collect some information"
			></graph-with-single-value>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsPersonalStatsRatingComponent {
	value$: Observable<Value>;

	constructor(private readonly store: AppUiStoreService) {
		this.value$ = this.store
			.listen$(
				([main, nav]) =>
					main.stats.gameStats.stats
						.filter((stat) => stat.gameMode === 'battlegrounds')
						.filter((stat) => stat.playerRank),
				([main, nav]) => main.battlegrounds.activeTimeFilter,
				([main, nav]) => main.battlegrounds.activeGroupMmrFilter,
				([main, nav]) => main.battlegrounds.globalStats.currentBattlegroundsMetaPatch?.number,
			)
			.pipe(
				filter(
					([stats, timeFilter, mmrFilter, currentBattlegroundsMetaPatch]) =>
						!!stats && !!currentBattlegroundsMetaPatch,
				),
				distinctUntilChanged((a, b) => this.compare(a, b)),
				map(([stats, timeFilter, mmrFilter, currentBattlegroundsMetaPatch]) =>
					this.buildValue(stats, timeFilter, mmrFilter, currentBattlegroundsMetaPatch),
				),
				tap((values: Value) => cdLog('emitting in ', this.constructor.name, values)),
			);
	}

	private buildValue(
		stats: readonly GameStat[],
		timeFilter: BgsActiveTimeFilterType,
		mmrFilter: MmrGroupFilterType,
		currentBattlegroundsMetaPatch: number,
	): Value {
		const data = [...stats].reverse();
		const fakeMatchWithCurrentMmr: GameStat = data[data.length - 1].newPlayerRank
			? GameStat.create({
					...data[data.length - 1],
					playerRank: data[data.length - 1].newPlayerRank,
			  } as GameStat)
			: null;
		const dataWithCurrentMmr = fakeMatchWithCurrentMmr ? [...data, fakeMatchWithCurrentMmr] : data;
		const dataWithTime = dataWithCurrentMmr.filter((stat) =>
			this.timeFilter(stat, timeFilter, currentBattlegroundsMetaPatch),
		);
		// Remove the first match if we're on a "last patch" filter
		const finalData =
			timeFilter === 'last-patch'
				? [
						GameStat.create({
							...dataWithTime[0],
							playerRank: '0',
						} as GameStat),
						...dataWithTime.slice(1),
				  ]
				: dataWithTime;
		if (mmrFilter === 'per-day') {
			const groupedByDay = groupByFunction((match: GameStat) => formatDate(new Date(match.creationTimestamp)))(
				finalData,
			);
			//console.log('groupedByDay', groupedByDay);
			const values = Object.values(groupedByDay).map((games: readonly GameStat[]) =>
				parseInt(games[games.length - 1].playerRank),
			);
			const labels = Object.keys(groupedByDay);
			return {
				data: [
					{
						data: values,
						label: 'Rating',
					},
				],
				labels: labels,
			} as Value;
		} else {
			const data = finalData.map((match) => parseInt(match.playerRank));
			return {
				data: [
					{
						data: data,
						label: 'Rating',
					},
				],
				labels: Array.from(Array(data.length), (_, i) => i + 1).map((matchIndex) => '' + matchIndex),
			} as Value;
		}
	}

	private timeFilter(stat: GameStat, timeFilter: string, currentBattlegroundsMetaPatch: number): boolean {
		if (!timeFilter) {
			return true;
		}

		switch (timeFilter) {
			case 'last-patch':
				return stat.buildNumber >= currentBattlegroundsMetaPatch;
			case 'past-30':
				return Date.now() - stat.creationTimestamp <= 30 * 24 * 60 * 60 * 1000;
			case 'past-7':
				return Date.now() - stat.creationTimestamp <= 7 * 24 * 60 * 60 * 1000;
			case 'all-time':
			default:
				return true;
		}
	}

	private compare(
		a: [GameStat[], BgsActiveTimeFilterType, MmrGroupFilterType, number],
		b: [GameStat[], BgsActiveTimeFilterType, MmrGroupFilterType, number],
	): boolean {
		if (a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3]) {
			return false;
		}
		return arraysEqual(a[0], b[0]);
	}
}

interface Value {
	readonly data: ChartDataSets[];
	readonly labels: Label;
}
