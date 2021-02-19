import { AllCardsService } from '@firestone-hs/replay-parser';
import { GameState } from '../../../models/decktracker/game-state';
import { GameStateEvent } from '../../../models/decktracker/game-state-event';
import { GameEvent } from '../../../models/game-event';
import { Preferences } from '../../../models/preferences';
import { SceneMode } from '../../../models/scenes';
import { OverwolfService } from '../../overwolf.service';
import { PreferencesService } from '../../preferences.service';
import { AbstractOverlayHandler } from './_abstract-overlay-handler';

export class PlayerDeckOverlayHandler extends AbstractOverlayHandler {
	private closedByUser: boolean;
	private onGameScreen: boolean;
	private gameStarted: boolean;

	constructor(ow: OverwolfService, allCards: AllCardsService, prefs: PreferencesService) {
		super(
			OverwolfService.DECKTRACKER_WINDOW,
			prefs => true,
			(state, prefs, showDecktrackerFromGameMode) => !this.closedByUser && !state.isBattlegrounds(),
			ow,
			prefs,
			allCards,
			true,
		);
		this.name = 'decktracker-player';
	}

	public processEvent(gameEvent: GameEvent | GameStateEvent, state: GameState, showDecktrackerFromGameMode: boolean) {
		super.processEvent(gameEvent, state, showDecktrackerFromGameMode);
		if (gameEvent.type === 'CLOSE_TRACKER') {
			this.closedByUser = true;
			this.updateOverlay(state, showDecktrackerFromGameMode);
		} else if (gameEvent.type === GameEvent.GAME_START) {
			this.closedByUser = false;
			this.gameStarted = true;
			this.updateOverlay(state, showDecktrackerFromGameMode, false, true);
		} else if (gameEvent.type === GameEvent.SCENE_CHANGED_MINDVISION) {
			this.onGameScreen = (gameEvent as GameEvent).additionalData.scene === SceneMode.GAMEPLAY;
			console.log('[player-deck] received scene changed', (gameEvent as GameEvent).additionalData.scene);
			this.updateOverlay(state, showDecktrackerFromGameMode, false, true);
		}
	}

	protected shouldShow(canShow: boolean, shouldShowFromState: boolean, prefs: Preferences) {
		if (this.closedByUser || !this.gameStarted) {
			console.debug(`[${this.name}] should not show`, this.closedByUser, this.gameStarted);
			return false;
		}

		if (!prefs.decktrackerCloseOnGameEnd) {
			return true;
		}

		// We explicitely don't check for null, so that if the memory updates are broken
		// we still somehow show the info
		if (this.onGameScreen === false) {
			console.debug(`[${this.name}] not on game screen`, this.onGameScreen);
			return false;
		}

		return canShow && shouldShowFromState;
	}
}
