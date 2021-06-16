import { BattlegroundsState } from '../../../../models/battlegrounds/battlegrounds-state';
import { BgsGame } from '../../../../models/battlegrounds/bgs-game';
import { BgsPanel } from '../../../../models/battlegrounds/bgs-panel';
import { BgsNextOpponentOverviewPanel } from '../../../../models/battlegrounds/in-game/bgs-next-opponent-overview-panel';
import { BgsTurnStartEvent } from '../events/bgs-turn-start-event';
import { BattlegroundsStoreEvent } from '../events/_battlegrounds-store-event';
import { EventParser } from './_event-parser';

export class BgsTurnStartParser implements EventParser {
	public applies(gameEvent: BattlegroundsStoreEvent, state: BattlegroundsState): boolean {
		return state && state.currentGame && gameEvent.type === 'BgsTurnStartEvent';
	}

	public async parse(currentState: BattlegroundsState, event: BgsTurnStartEvent): Promise<BattlegroundsState> {
		const newPanelId = event.turnNumber === 1 ? 'bgs-next-opponent-overview' : currentState.currentPanelId;

		const newCurrentTurn = Math.ceil(event.turnNumber / 2);
		const newNextOpponentPanel: BgsNextOpponentOverviewPanel = this.rebuildNextOpponentPanel(
			currentState,
			newCurrentTurn,
		);
		const panels: readonly BgsPanel[] = currentState.panels.map((stage) =>
			stage.id === newNextOpponentPanel.id ? newNextOpponentPanel : stage,
		);
		console.log('updating turn', newCurrentTurn);
		return currentState.update({
			currentGame: currentState.currentGame.update({
				currentTurn: newCurrentTurn,
			} as BgsGame),
			panels: panels,
			currentPanelId: newPanelId,
		} as BattlegroundsState);
	}

	private rebuildNextOpponentPanel(
		currentState: BattlegroundsState,
		newCurrentTurn: number,
	): BgsNextOpponentOverviewPanel {
		return (currentState.panels.find(
			(panel) => panel.id === 'bgs-next-opponent-overview',
		) as BgsNextOpponentOverviewPanel).update({
			name: `Turn ${newCurrentTurn} - Next opponent`,
		} as BgsNextOpponentOverviewPanel);
	}
}
