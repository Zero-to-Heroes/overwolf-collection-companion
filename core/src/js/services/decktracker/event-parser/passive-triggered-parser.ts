import { AllCardsService } from '@firestone-hs/replay-parser';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

export class PassiveTriggeredParser implements EventParser {
	constructor(private readonly helper: DeckManipulationHelper, private readonly allCards: AllCardsService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.type === GameEvent.PASSIVE_BUFF;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();
		if (!cardId) {
			console.log('no cardId for passive');
			return currentState;
		}

		// console.log('triggring passive', cardId, controllerId, localPlayer, entityId, gameEvent);
		const isPlayer = controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;

		const cardData = cardId ? this.allCards.getCard(cardId) : null;
		const card = DeckCard.create({
			cardId: cardId,
			entityId: entityId,
			cardName: cardData && cardData.name,
			manaCost: cardData && cardData.cost,
			rarity: cardData && cardData.rarity ? cardData.rarity.toLowerCase() : null,
		} as DeckCard);

		const newGlobalEffects: readonly DeckCard[] = this.helper.addSingleCardToZone(deck.globalEffects, card);
		const newPlayerDeck = Object.assign(new DeckState(), deck, {
			globalEffects: newGlobalEffects,
		});
		return Object.assign(new GameState(), currentState, {
			[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return GameEvent.PASSIVE_BUFF;
	}
}
