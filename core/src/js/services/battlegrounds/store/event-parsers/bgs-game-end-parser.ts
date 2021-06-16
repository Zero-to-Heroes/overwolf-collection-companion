import { BgsBestStat } from '@firestone-hs/compute-bgs-run-stats/dist/model/bgs-best-stat';
import { Race } from '@firestone-hs/reference-data';
import { BattlegroundsState } from '../../../../models/battlegrounds/battlegrounds-state';
import { BgsGame } from '../../../../models/battlegrounds/bgs-game';
import { BgsPanel } from '../../../../models/battlegrounds/bgs-panel';
import { BgsPlayer } from '../../../../models/battlegrounds/bgs-player';
import { BgsBattlesPanel } from '../../../../models/battlegrounds/in-game/bgs-battles-panel';
import { BgsPostMatchStats } from '../../../../models/battlegrounds/post-match/bgs-post-match-stats';
import { BgsPostMatchStatsPanel } from '../../../../models/battlegrounds/post-match/bgs-post-match-stats-panel';
import { Preferences } from '../../../../models/preferences';
import { MemoryInspectionService } from '../../../plugins/memory-inspection.service';
import { PreferencesService } from '../../../preferences.service';
import { BgsGameEndEvent } from '../events/bgs-game-end-event';
import { BattlegroundsStoreEvent } from '../events/_battlegrounds-store-event';
import { EventParser } from './_event-parser';

// TODO: coins wasted doesn't take into account hero powers that let you have more coins (Bel'ial)
export class BgsGameEndParser implements EventParser {
	constructor(private readonly prefs: PreferencesService, private readonly memory: MemoryInspectionService) {}

	public applies(gameEvent: BattlegroundsStoreEvent, state: BattlegroundsState): boolean {
		return state && state.currentGame && gameEvent.type === 'BgsGameEndEvent';
	}

	public async parse(currentState: BattlegroundsState, event: BgsGameEndEvent): Promise<BattlegroundsState> {
		const prefs: Preferences = await this.prefs.getPreferences();
		console.log('will build post-match info', prefs.bgsForceShowPostMatchStats);
		const newBestUserStats: readonly BgsBestStat[] = event.newBestStats;
		const newPostMatchStatsStage: BgsPostMatchStatsPanel = this.buildPostMatchPanel(
			currentState,
			event.postMatchStats,
			newBestUserStats,
			prefs,
		);
		const newBattlesPanel: BgsBattlesPanel = this.buildBattlesPanel(currentState, prefs);
		const panels: readonly BgsPanel[] = currentState.panels
			.map((panel) => (panel.id === newPostMatchStatsStage.id ? newPostMatchStatsStage : panel))
			.map((panel) => (panel.id === newBattlesPanel.id ? newBattlesPanel : panel));
		const shouldHideResultsOnRecruit = prefs.bgsHideSimResultsOnRecruit && !prefs.bgsShowSimResultsOnlyOnRecruit;
		return currentState.update({
			panels: panels,
			currentPanelId: 'bgs-post-match-stats',
			forceOpen: prefs.bgsEnableApp && prefs.bgsForceShowPostMatchStats && prefs.bgsFullToggle ? true : false,
			highlightedMinions: [] as readonly string[],
			highlightedTribes: [] as readonly Race[],
			heroSelectionDone: false,
			currentGame: currentState.currentGame.update({
				gameEnded: true,
				reviewId: event.reviewId,
				// battleInfo: shouldHideResultsOnRecruit ? undefined : currentState.currentGame.battleInfo,
				// battleResult: shouldHideResultsOnRecruit ? undefined : currentState.currentGame.battleResult,
				battleInfoStatus:
					shouldHideResultsOnRecruit || !currentState.currentGame.lastBattleResult() ? 'empty' : 'done',
				battleInfoMesage:
					shouldHideResultsOnRecruit || !currentState.currentGame.lastBattleResult()
						? undefined
						: currentState.currentGame.battleInfoMesage,
			} as BgsGame),
		} as BattlegroundsState);
	}

	private buildBattlesPanel(currentState: BattlegroundsState, prefs: Preferences): BgsBattlesPanel {
		// TODO: add somewhere the info about whether the user is a premium subscriber
		return BgsBattlesPanel.create({
			faceOffs: currentState.currentGame.faceOffs,
		} as BgsBattlesPanel);
	}

	private buildPostMatchPanel(
		currentState: BattlegroundsState,
		postMatchStats: BgsPostMatchStats,
		newBestUserStats: readonly BgsBestStat[],
		prefs: Preferences,
	): BgsPostMatchStatsPanel {
		const player: BgsPlayer = currentState.currentGame.getMainPlayer();
		const finalPosition = player?.leaderboardPlace;
		console.log('post match stats');
		return BgsPostMatchStatsPanel.create({
			stats: postMatchStats,
			newBestUserStats: newBestUserStats,
			globalStats: currentState.globalStats,
			player: player,
			selectedStats: prefs.bgsSelectedTabs2,
			tabs: ['hp-by-turn', 'winrate-per-turn', 'warband-total-stats-by-turn', 'warband-composition-by-turn'],
			// isComputing: false,
			name: 'You finished #' + finalPosition,
		} as BgsPostMatchStatsPanel);
	}
}
