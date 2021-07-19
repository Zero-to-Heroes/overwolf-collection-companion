import { EventEmitter, Injectable } from '@angular/core';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { BgsHeroStat } from '../../models/battlegrounds/stats/bgs-hero-stat';
import { BgsStats } from '../../models/battlegrounds/stats/bgs-stats';
import { BattlegroundsAppState } from '../../models/mainwindow/battlegrounds/battlegrounds-app-state';
import { BattlegroundsCategory } from '../../models/mainwindow/battlegrounds/battlegrounds-category';
import { BattlegroundsPerfectGamesCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-perfect-games-category';
import { BattlegroundsPersonalHeroesCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-heroes-category';
import { BattlegroundsPersonalRatingCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-rating-category';
import { BattlegroundsPersonalStatsCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-stats-category';
import { BattlegroundsPersonalStatsHeroDetailsCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-stats-hero-details-category';
import { BattlegroundsSimulatorCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-simulator-category';
import { BgsHeroStatsFilterId } from '../../models/mainwindow/battlegrounds/categories/bgs-hero-stats-filter-id';
import { GameStat } from '../../models/mainwindow/stats/game-stat';
import { GameStats } from '../../models/mainwindow/stats/game-stats';
import { ApiRunner } from '../api-runner';
import { Events } from '../events.service';
import { MainWindowStoreEvent } from '../mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../overwolf.service';
import { PatchesConfigService } from '../patches-config.service';
import { PreferencesService } from '../preferences.service';
import { BgsBuilderService } from './bgs-builder.service';
import { BgsGlobalStatsService } from './bgs-global-stats.service';
import { BgsStatUpdateParser } from './store/event-parsers/bgs-stat-update-parser';
import { BgsInitEvent } from './store/events/bgs-init-event';
import { BgsStatUpdateEvent } from './store/events/bgs-stat-update-event';
import { BattlegroundsStoreEvent } from './store/events/_battlegrounds-store-event';

const RETRIEVE_PERFECT_GAMES_ENDPOINT = 'https://static.zerotoheroes.com/api/bgs-perfect-games.json?v=5';

@Injectable()
export class BgsInitService {
	private mainWindowStateUpdater: EventEmitter<MainWindowStoreEvent>;
	private bgsStateUpdater: EventEmitter<BattlegroundsStoreEvent>;

	constructor(
		private readonly events: Events,
		private readonly bgsGlobalStats: BgsGlobalStatsService,
		private readonly ow: OverwolfService,
		private readonly cards: AllCardsService,
		private readonly patchesService: PatchesConfigService,
		private readonly api: ApiRunner,
		private readonly prefs: PreferencesService,
		private readonly bgsBuilder: BgsBuilderService,
	) {
		this.events.on(Events.GAME_STATS_UPDATED).subscribe((event) => {
			const newGameStats: GameStats = event.data[0];
			console.log('[bgs-init] match stats updated');
			this.bgsStateUpdater?.next(new BgsStatUpdateEvent(newGameStats));
		});
		setTimeout(() => {
			this.bgsStateUpdater = this.ow.getMainWindow().battlegroundsUpdater;
			this.mainWindowStateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
		});
	}

	public async init(matchStats: GameStats): Promise<BgsStats> {
		console.log('[bgs-init] bgs init starting');
		const [bgsGlobalStats, prefs] = await Promise.all([
			this.bgsGlobalStats.loadGlobalStats(),
			this.prefs.getPreferences(),
		]);
		console.log('[bgs-init] loaded global stats', bgsGlobalStats?.heroStats?.length);
		const patchConfig = await this.patchesService.getConf();
		const currentBattlegroundsMetaPatch = patchConfig?.patches
			? patchConfig.patches.find((patch) => patch.number === patchConfig.currentBattlegroundsMetaPatch)
			: null;

		const statsWithPatch = bgsGlobalStats?.update({
			currentBattlegroundsMetaPatch: currentBattlegroundsMetaPatch,
		} as BgsStats);

		const bgsMatchStats = matchStats?.stats?.filter((stat) => stat.gameMode === 'battlegrounds');
		if (!bgsMatchStats || bgsMatchStats.length === 0) {
			console.log('[bgs-init] no bgs match stats');
			this.bgsStateUpdater.next(new BgsInitEvent([], statsWithPatch));
			return statsWithPatch;
		}
		const bgsStatsForCurrentPatch = this.bgsBuilder.filterBgsMatchStats(
			bgsMatchStats,
			prefs,
			currentBattlegroundsMetaPatch.number,
		);
		const heroStatsWithPlayer: readonly BgsHeroStat[] = BgsStatUpdateParser.buildHeroStats(
			statsWithPatch,
			bgsStatsForCurrentPatch,
			this.cards,
		);

		const statsWithPlayer = statsWithPatch?.update({
			heroStats: heroStatsWithPlayer,
		} as BgsStats);
		this.bgsStateUpdater.next(new BgsInitEvent(bgsStatsForCurrentPatch, statsWithPlayer));
		return statsWithPatch;
	}

	public async loadPerfectGames(): Promise<readonly GameStat[]> {
		const result = await this.api.callGetApi<readonly GameStat[]>(RETRIEVE_PERFECT_GAMES_ENDPOINT);
		console.debug('[bgs-init] perfect games', result);
		return (result ?? [])
			.map((res) =>
				GameStat.create({
					...res,
					gameFormat: 'wild',
					gameMode: 'battlegrounds',
					additionalResult: '1',
					bgsPerfectGame: true,
				} as GameStat),
			)
			.filter((stat) => stat.playerRank);
	}

	public async initBattlegoundsAppState(
		bgsGlobalStats: BgsStats,
		perfectGames: readonly GameStat[],
	): Promise<BattlegroundsAppState> {
		const categories: readonly BattlegroundsCategory[] = [
			this.buildPersonalHeroesCategory(bgsGlobalStats),
			this.buildPersonalRatingCategory(),
			this.buildPersonalStatsCategory(),
			this.buildPerfectGamesCategory(),
			this.buildSimulatorCategory(),
		];
		return BattlegroundsAppState.create({
			categories: categories,
			globalStats: bgsGlobalStats,
			perfectGames: perfectGames,
			loading: false,
		} as BattlegroundsAppState);
	}

	private buildPersonalHeroesCategory(bgsGlobalStats: BgsStats): BattlegroundsCategory {
		// console.log('building stats', bgsGlobalStats);
		const heroDetailCategories: readonly BattlegroundsCategory[] = bgsGlobalStats?.heroStats
			.filter((heroStat) => heroStat.id !== 'average')
			.map((heroStat) =>
				BattlegroundsPersonalStatsHeroDetailsCategory.create({
					id: 'bgs-category-personal-hero-details-' + heroStat.id,
					name: this.cards.getCard(heroStat.id)?.name,
					heroId: heroStat.id,
					tabs: [
						'winrate-stats',
						'mmr',
						'warband-stats',
						'final-warbands',
					] as readonly BgsHeroStatsFilterId[],
				} as BattlegroundsPersonalStatsHeroDetailsCategory),
			);
		return BattlegroundsPersonalHeroesCategory.create({
			enabled: true,
			categories: heroDetailCategories,
		} as BattlegroundsPersonalHeroesCategory);
	}

	private buildPersonalRatingCategory(): BattlegroundsCategory {
		return BattlegroundsPersonalRatingCategory.create({
			enabled: true,
		} as BattlegroundsPersonalRatingCategory);
	}

	private buildPerfectGamesCategory(): BattlegroundsCategory {
		return BattlegroundsPerfectGamesCategory.create({
			enabled: true,
		} as BattlegroundsPerfectGamesCategory);
	}

	private buildPersonalStatsCategory(): BattlegroundsCategory {
		return BattlegroundsPersonalStatsCategory.create({
			enabled: true,
		} as BattlegroundsPersonalStatsCategory);
	}

	private buildSimulatorCategory(): BattlegroundsCategory {
		return BattlegroundsSimulatorCategory.create({
			enabled: true,
		} as BattlegroundsSimulatorCategory);
	}
}
