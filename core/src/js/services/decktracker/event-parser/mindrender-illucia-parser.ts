import { AllCardsService } from '@firestone-hs/replay-parser';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

// The logs contain the info about the cards (hand + deck) that change controllers,
// but we also need to update everything else, like the decklist
export class MindrenderIlluciaParser implements EventParser {
	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return (
			state &&
			(gameEvent.type === GameEvent.MINDRENDER_ILLUCIA_START ||
				gameEvent.type === GameEvent.MINDRENDER_ILLUCIA_END)
		);
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		console.debug('handling mindrender illucia', gameEvent, currentState);
		const newPlayerDeck = this.swapDecks(currentState.playerDeck, currentState.opponentDeck);
		const newOpponentDeck = this.swapDecks(currentState.opponentDeck, currentState.playerDeck);
		return currentState.update({
			playerDeck: newPlayerDeck,
			opponentDeck: newOpponentDeck,
		} as GameState);
	}

	private swapDecks(firstDeck: DeckState, secondDeck: DeckState): DeckState {
		return firstDeck.update({
			cardsLeftInDeck: secondDeck.cardsLeftInDeck,
			cardsPlayedFromInitialDeck: secondDeck.cardsPlayedFromInitialDeck,
			deck: secondDeck.deck,
			deckList: secondDeck.deckList,
			dynamicZones: secondDeck.dynamicZones,
			hand: secondDeck.hand,
			unknownRealCardsInDeck: secondDeck.unknownRealCardsInDeck,
			deckstring: secondDeck.deckstring,
		} as DeckState);
	}

	event(): string {
		return 'MINDRENDER_ILLUCIA_START';
	}
}
