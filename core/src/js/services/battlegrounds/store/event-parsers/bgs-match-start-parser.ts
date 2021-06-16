import { BattlegroundsState } from '../../../../models/battlegrounds/battlegrounds-state';
import { BgsGame } from '../../../../models/battlegrounds/bgs-game';
import { Preferences } from '../../../../models/preferences';
import { VisualAchievement } from '../../../../models/visual-achievement';
import { GameStateService } from '../../../decktracker/game-state.service';
import { PreferencesService } from '../../../preferences.service';
import { BgsMatchStartEvent } from '../events/bgs-match-start-event';
import { BattlegroundsStoreEvent } from '../events/_battlegrounds-store-event';
import { BgsInitParser } from './bgs-init-parser';
import { EventParser } from './_event-parser';

export class BgsMatchStartParser implements EventParser {
	constructor(private readonly prefs: PreferencesService, private readonly gameState: GameStateService) {}

	public applies(gameEvent: BattlegroundsStoreEvent, state: BattlegroundsState): boolean {
		return state && gameEvent.type === 'BgsMatchStartEvent';
	}

	public async parse(currentState: BattlegroundsState, event: BgsMatchStartEvent): Promise<BattlegroundsState> {
		if (currentState.reconnectOngoing) {
			console.warn('reconnect, returning');
			return currentState;
		} else {
			const heroesAchievementCategory = event.mainWindowState.achievements.findCategory(
				'hearthstone_game_sub_13',
			);

			if (!heroesAchievementCategory) {
				console.error('missing achievements category for BG', 'hearthstone_game_sub_13');
			}

			const heroAchievements: readonly VisualAchievement[] =
				heroesAchievementCategory?.retrieveAllAchievements() ?? [];
			const reviewId = await this.gameState.getCurrentReviewId();
			const newGame: BgsGame = BgsGame.create({
				reviewId: reviewId,
			} as BgsGame);
			console.log('created new bgs game with reviewId', reviewId);
			const prefs: Preferences = await this.prefs.getPreferences();
			return currentState.update({
				inGame: true,
				currentGame: newGame,
				forceOpen: prefs.bgsShowHeroSelectionScreen,
				panels: BgsInitParser.buildEmptyPanels(currentState, prefs),
				heroAchievements: heroAchievements,
				heroSelectionDone: false,
			} as BattlegroundsState);
		}
	}
}
