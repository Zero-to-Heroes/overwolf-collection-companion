import { CardIds } from '@firestone-hs/reference-data';
import { BoardSecret } from '../../../models/decktracker/board-secret';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { COUNTERSPELLS } from '../../hs-utils';
import { SecretConfigService } from '../secret-config.service';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

export class SecretPlayedFromHandParser implements EventParser {
	constructor(private readonly helper: DeckManipulationHelper, private readonly secretConfig: SecretConfigService) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && (gameEvent.type === GameEvent.SECRET_PLAYED || gameEvent.type === GameEvent.SECRET_PUT_IN_PLAY);
	}

	async parse(
		currentState: GameState,
		gameEvent: GameEvent,
		additionalInfo?: {
			secretWillTrigger?: {
				cardId: string;
				reactingToCardId: string;
				reactingToEntityId: number;
			};
			minionsWillDie?: readonly {
				cardId: string;
				entityId: number;
			}[];
		},
	): Promise<GameState> {
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();

		const isPlayer = controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;
		const card = this.helper.findCardInZone(deck.hand, cardId, entityId);
		const cardWithZone = card.update({
			zone: 'SECRET',
		} as DeckCard);
		const secretClass: string = gameEvent.additionalData.playerClass;
		// console.log('secretClass', secretClass, gameEvent);

		const isCardCountered =
			((additionalInfo?.secretWillTrigger?.reactingToEntityId &&
				additionalInfo?.secretWillTrigger?.reactingToEntityId === entityId) ||
				(additionalInfo?.secretWillTrigger?.reactingToCardId &&
					additionalInfo?.secretWillTrigger?.reactingToCardId === cardId)) &&
			COUNTERSPELLS.includes(additionalInfo?.secretWillTrigger?.cardId);

		const newHand: readonly DeckCard[] = this.helper.removeSingleCardFromZone(deck.hand, cardId, entityId)[0];
		const previousOtherZone = deck.otherZone;
		const newOtherZone: readonly DeckCard[] = this.helper.addSingleCardToZone(
			previousOtherZone,
			isCardCountered && additionalInfo?.secretWillTrigger?.cardId === CardIds.Collectible.Paladin.OhMyYogg
				? // Since Yogg transforms the card
				  cardWithZone.update({
						entityId: undefined,
				  } as DeckCard)
				: cardWithZone,
		);
		const newPlayerDeck = Object.assign(new DeckState(), deck, {
			hand: newHand,
			otherZone: newOtherZone,
			secrets: isCardCountered
				? deck.secrets
				: ([
						...deck.secrets,
						BoardSecret.create(
							entityId,
							cardId,
							this.secretConfig.getValidSecrets(currentState.metadata, secretClass),
						),
				  ] as readonly BoardSecret[]),
			cardsPlayedThisTurn:
				isCardCountered || gameEvent.type === GameEvent.SECRET_PUT_IN_PLAY
					? deck.cardsPlayedThisTurn
					: ([...deck.cardsPlayedThisTurn, cardWithZone] as readonly DeckCard[]),
			spellsPlayedThisMatch:
				deck.spellsPlayedThisMatch +
				(!isCardCountered && gameEvent.type !== GameEvent.SECRET_PUT_IN_PLAY ? 1 : 0),
		} as DeckState);
		// console.log('[secret-turn-end] updated deck after secret played', newPlayerDeck);
		return Object.assign(new GameState(), currentState, {
			[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return GameEvent.SECRET_PLAYED;
	}
}
