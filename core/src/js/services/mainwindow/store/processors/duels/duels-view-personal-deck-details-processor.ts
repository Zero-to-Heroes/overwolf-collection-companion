import { MainWindowState } from '../../../../../models/mainwindow/main-window-state';
import { NavigationDuels } from '../../../../../models/mainwindow/navigation/navigation-duels';
import { NavigationState } from '../../../../../models/mainwindow/navigation/navigation-state';
import { DuelsViewPersonalDeckDetailsEvent } from '../../events/duels/duels-view-personal-deck-details-event';
import { Processor } from '../processor';

export class DuelsViewPersonalDeckDetailsProcessor implements Processor {
	public async process(
		event: DuelsViewPersonalDeckDetailsEvent,
		currentState: MainWindowState,
		stateHistory,
		navigationState: NavigationState,
	): Promise<[MainWindowState, NavigationState]> {
		return [
			null,
			navigationState.update({
				navigationDuels: navigationState.navigationDuels.update({
					selectedCategoryId: 'duels-personal-deck-details',
					selectedPersonalDeckstring: event.deckstring,
					menuDisplayType: 'breadcrumbs',
					expandedRunIds: [] as readonly string[],
				} as NavigationDuels),
				text: this.getDeckName(currentState, event.deckstring),
			} as NavigationState),
		];
	}

	private getDeckName(currentState: MainWindowState, deckstring: string): string {
		const deck = currentState?.duels?.playerStats?.personalDeckStats?.find(
			deck => deck.initialDeckList === deckstring,
		);
		// console.log('found deck', deck, currentState);
		return deck?.deckName;
	}
}
