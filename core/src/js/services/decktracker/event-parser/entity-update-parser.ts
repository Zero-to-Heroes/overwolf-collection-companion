import { AllCardsService } from '@firestone-hs/replay-parser';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

export class EntityUpdateParser implements EventParser {
	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.type === GameEvent.ENTITY_UPDATE;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		// console.debug('entity updated', gameEvent, currentState);
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();
		// console.debug('info', cardId, controllerId, localPlayer, entityId);
		const isPlayer = controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;
		// console.debug('isPlayer', isPlayer, deck);

		const cardInHand = this.helper.findCardInZone(deck.hand, null, entityId);
		// console.debug('cardInHand', cardInHand);
		const cardInDeck = this.helper.findCardInZone(deck.deck, null, entityId);
		const cardInOther = this.helper.findCardInZone(deck.otherZone, null, entityId);

		const newCardInHand =
			// If we don't restrict it to the current player, we create some info leaks in the opponent's hand (eg with Baku)
			cardInHand && cardInHand.cardId !== cardId && isPlayer
				? cardInHand.update({ cardId: cardId, cardName: this.allCards.getCard(cardId)?.name } as DeckCard)
				: null;
		// console.debug('newCardInHand', newCardInHand);
		const newCardInDeck =
			cardInDeck && cardInDeck.cardId !== cardId
				? cardInDeck.update({ cardId: cardId, cardName: this.allCards.getCard(cardId)?.name } as DeckCard)
				: null;
		const newCardInOther =
			cardInOther && cardInOther.cardId !== cardId
				? cardInOther.update({ cardId: cardId, cardName: this.allCards.getCard(cardId)?.name } as DeckCard)
				: null;

		const newHand = newCardInHand ? this.helper.replaceCardInZone(deck.hand, newCardInHand) : deck.hand;
		// console.debug('newHand', newHand);
		const newDeck = newCardInDeck ? this.helper.replaceCardInZone(deck.deck, newCardInDeck) : deck.deck;
		const newOther = newCardInOther
			? this.helper.replaceCardInZone(deck.otherZone, newCardInOther)
			: deck.otherZone;

		const newPlayerDeck = Object.assign(new DeckState(), deck, {
			hand: newHand,
			deck: newDeck,
			otherZone: newOther,
		});

		return Object.assign(new GameState(), currentState, {
			[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return GameEvent.ENTITY_UPDATE;
	}
}
