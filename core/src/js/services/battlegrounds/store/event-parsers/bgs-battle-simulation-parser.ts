import { BattlegroundsState } from '../../../../models/battlegrounds/battlegrounds-state';
import { BgsFaceOffWithSimulation } from '../../../../models/battlegrounds/bgs-face-off-with-simulation';
import { BgsGame } from '../../../../models/battlegrounds/bgs-game';
import { PreferencesService } from '../../../preferences.service';
import { normalizeHeroCardId } from '../../bgs-utils';
import { BattlegroundsBattleSimulationEvent } from '../events/battlegrounds-battle-simulation-event';
import { BattlegroundsStoreEvent } from '../events/_battlegrounds-store-event';
import { EventParser } from './_event-parser';

export class BgsBattleSimulationParser implements EventParser {
	constructor(private readonly prefs: PreferencesService) {}

	public applies(gameEvent: BattlegroundsStoreEvent, state: BattlegroundsState): boolean {
		return state && state.currentGame && gameEvent.type === 'BattlegroundsBattleSimulationEvent';
	}

	public async parse(
		currentState: BattlegroundsState,
		event: BattlegroundsBattleSimulationEvent,
	): Promise<BattlegroundsState> {
		const prefs = await this.prefs.getPreferences();
		const showSimulation = !prefs.bgsShowSimResultsOnlyOnRecruit;
		const gameAfterFaceOff: BgsGame = currentState.currentGame.updateLastFaceOff(
			normalizeHeroCardId(event.opponentHeroCardId),
			{
				battleResult: event.result,
			} as BgsFaceOffWithSimulation,
		);
		return currentState.update({
			currentGame: gameAfterFaceOff.update({
				battleInfoStatus: showSimulation ? 'done' : 'empty',
			} as BgsGame),
		} as BattlegroundsState);
	}
}
