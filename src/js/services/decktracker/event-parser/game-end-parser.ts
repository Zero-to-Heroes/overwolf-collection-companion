import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { AllCardsService } from '../../all-cards.service';
import { DeckParserService } from '../deck-parser.service';
import { DeckEvents } from './deck-events';
import { EventParser } from './event-parser';

export class GameEndParser implements EventParser {
	constructor(private deckParser: DeckParserService, private allCards: AllCardsService) {}

	applies(gameEvent: GameEvent): boolean {
		return gameEvent.type === GameEvent.GAME_END;
	}

	async parse(): Promise<GameState> {
		return new GameState();
	}

	event(): string {
		return DeckEvents.GAME_END;
	}
}
