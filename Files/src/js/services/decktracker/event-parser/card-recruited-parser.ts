import { EventParser } from "./event-parser";
import { GameEvent } from "../../../models/game-event";
import { GameState } from "../../../models/decktracker/game-state";
import { DeckCard } from "../../../models/decktracker/deck-card";
import { DeckState } from "../../../models/decktracker/deck-state";
import { DeckEvents } from "./deck-events";
import { DeckManipulationHelper as DeckManipulationHelper } from "./deck-manipulation-helper";

export class CardRecruitedParser implements EventParser {

    constructor() { }

    applies(gameEvent: GameEvent): boolean {
		return gameEvent.type === GameEvent.RECRUIT_CARD;
    }    
    
    parse(currentState: GameState, gameEvent: GameEvent): GameState {
		if (currentState.playerDeck.deckList.length === 0) {
			return currentState;
		}
		const cardId: string = gameEvent.data[0];
		const controllerId: string = gameEvent.data[1];
		const localPlayer = gameEvent.data[2];
		const entityId: number = gameEvent.data[4];
		
		const isPlayer = cardId && controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;
		const card = DeckManipulationHelper.findCardInZone(deck.deck, cardId, entityId);

		const newDeck: ReadonlyArray<DeckCard> = DeckManipulationHelper.removeSingleCardFromZone(deck.deck, cardId, entityId);
        const cardWithZone = Object.assign(new DeckCard(), card, {
            zone: 'PLAY',
		} as DeckCard);
		
		const newBoard: ReadonlyArray<DeckCard> = DeckManipulationHelper.addSingleCardToZone(deck.board, cardWithZone);
		const newPlayerDeck = Object.assign(new DeckState(), deck, 
			{
				deck: newDeck,
				board: newBoard
			} as DeckState);
		return Object.assign(new GameState(), currentState, 
			{ 
				[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck
			});
	}

	event(): string {
		return DeckEvents.RECRUIT_CARD;
	}
}