import { EventEmitter, Injectable } from '@angular/core';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { CollectionCardType } from '../../models/collection/collection-card-type.type';
import { InternalCardInfo } from '../../models/collection/internal-card-info';
import { MemoryUpdate } from '../../models/memory/memory-update';
import { CardPackInfo, PackInfo } from '../../models/memory/pack-info';
import { Events } from '../events.service';
import { dustFor, dustForPremium } from '../hs-utils';
import { NewCardEvent } from '../mainwindow/store/events/collection/new-card-event';
import { NewPackEvent } from '../mainwindow/store/events/collection/new-pack-event';
import { MainWindowStoreEvent } from '../mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../overwolf.service';
import { MemoryInspectionService } from '../plugins/memory-inspection.service';
import { PreferencesService } from '../preferences.service';
import { groupByFunction } from '../utils';
import { CardNotificationsService } from './card-notifications.service';
import { CollectionManager } from './collection-manager.service';

// Only works when cards are logged in the Achievements.log
@Injectable()
export class CardsMonitorService {
	private stateUpdater: EventEmitter<MainWindowStoreEvent>;
	private pendingTimeout;

	constructor(
		private readonly cards: AllCardsService,
		private readonly events: Events,
		private readonly ow: OverwolfService,
		private readonly collectionManager: CollectionManager,
		private readonly prefs: PreferencesService,
		private readonly notifications: CardNotificationsService,
		private readonly memoryService: MemoryInspectionService,
	) {
		this.init();
	}

	private async init() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
		window['triggerMemoryUpdate'] = async (cardId: string) => {
			this.triggerMemoryDetection();
		};

		// We do this to force the population of the initial memory for cards
		this.triggerMemoryDetection(false);
	}

	/**
	 * The game doesn't log cards received in the Achievements.log anymore.
	 * We might be able to use the Net.log, but it needs to be added to the OW 
	 * config first.
	 * A pack opening looks like this:
	 * D 09:24:45.5861915 Handling card collection modification (collection version 4643): {
		  AmountSeen: 0
		  AssetCardId: 61171
		  Premium: 0
		  Quantity: 1
		}
	 */
	public receiveLogLine(data: string) {
		if (!data?.length) {
			return;
		}

		if (!data.includes('Handling card collection modification')) {
			return;
		}

		console.debug('[cards-monitor] received log line', data);
		// To give time to log lines to appear
		if (this.pendingTimeout) {
			clearTimeout(this.pendingTimeout);
		}
		this.pendingTimeout = setTimeout(() => this.triggerMemoryDetection(), 400);
	}

	private async triggerMemoryDetection(process = true) {
		console.log('[cards-monitor] triggerging memory detection');
		const changes: MemoryUpdate = await this.memoryService.getMemoryChanges();
		console.log('[cards-monitor] memoryChanges detection', process && changes);
		if (!process || !changes) {
			return;
		}

		if (changes.OpenedPack) {
			this.handleNewPack(changes.OpenedPack);
		}
		// Cards received outside of packs
		else if (changes?.NewCards) {
			this.handleNewCards(changes.NewCards, !changes.OpenedPack);
		}
	}

	private async handleNewPack(pack: PackInfo) {
		const boosterId = pack.BoosterId;
		// Get the collection as it was before opening cards
		const collection = await this.collectionManager.getCollection(true);
		const packCards: readonly InternalCardInfo[] = pack.Cards.map((card) => {
			const cardInCollection = collection.find((c) => c.id === card.CardId);
			return {
				cardId: card.CardId,
				// No diamond card in pack, so we can leave it like this for now
				cardType: card.Premium ? 'GOLDEN' : 'NORMAL',
				isNew:
					!cardInCollection ||
					(card.Premium ? cardInCollection.premiumCount === 0 : cardInCollection.count === 0),
				// TODO: handle the case where two copies of the same card are in the same pack
				isSecondCopy:
					cardInCollection &&
					(card.Premium ? cardInCollection.premiumCount === 1 : cardInCollection.count === 1),
			};
		});
		const setId = this.cards.getCard(packCards[0].cardId)?.set?.toLowerCase();
		console.log('[cards-monitor] notifying new pack opening', setId, boosterId, packCards);

		this.events.broadcast(Events.NEW_PACK, setId, packCards, boosterId);
		this.stateUpdater.next(new NewPackEvent(setId, boosterId, packCards));

		const groupedBy: { [key: string]: readonly InternalCardInfo[] } = groupByFunction(
			(card: InternalCardInfo) => card.cardId + card.cardType,
		)(packCards);
		for (const data of Object.values(groupedBy)) {
			const cardId = data[0].cardId;
			const type = data[0].cardType;
			const cardInCollection = collection.find((c) => c.id === cardId);
			const existingCount = !cardInCollection
				? 0
				: data[0].cardType === 'GOLDEN'
				? cardInCollection.premiumCount
				: cardInCollection.count;
			// console.debug('handling', data, existingCount, cardId, type, cardInCollection);
			for (let i = existingCount; i < existingCount + data.length; i++) {
				this.handleNotification(cardId, type, i + 1, false);
			}
		}
	}

	private async handleNewCards(newCards: readonly CardPackInfo[], showNotifs = true) {
		// Put in place a protection to avoid renotifying the whole initial collection
		if (newCards?.length && newCards.length > 30) {
			console.warn('[card-parser] not processing cards, too many', newCards.length);
			return;
		}

		const groupedBy: { [key: string]: readonly CardPackInfo[] } = groupByFunction(
			(card: CardPackInfo) => card.CardId + card.Premium,
		)(newCards);
		console.log('[card-parser] groupedBy', groupedBy, newCards);
		const collection = await this.collectionManager.getCollection(true);
		for (const data of Object.values(groupedBy)) {
			const cardId = data[0].CardId;
			const type = data[0].Premium ? 'GOLDEN' : 'NORMAL';
			const cardInCollection = collection.find((c) => c.id === cardId);
			const existingCount = data[0].Premium ? cardInCollection.premiumCount : cardInCollection.count;
			// console.debug('handling', data, existingCount, cardId, type, cardInCollection);
			for (let i = existingCount; i < existingCount + data.length; i++) {
				this.handleNotification(cardId, type, i + 1, showNotifs);
			}
		}
	}

	private async handleNotification(cardId: string, type: CollectionCardType, newCount: number, showNotifs = true) {
		const prefs = await this.prefs.getPreferences();
		const isDust = this.hasReachedMaxCollectibleOf(cardId, newCount);
		if (prefs.showCardsOutsideOfPacks && showNotifs) {
			if (!isDust) {
				this.notifications.createNewCardToast(cardId, newCount === 2, type);
			} else {
				const dbCard = this.cards.getCard(cardId);
				if (!dbCard) {
					return;
				}
				const dust = type === 'GOLDEN' ? dustForPremium(dbCard?.rarity) : dustFor(dbCard?.rarity);
				this.notifications.createDustToast(dust, 1);
			}
		}
		this.stateUpdater.next(new NewCardEvent(cardId, type, newCount, isDust));
	}

	private hasReachedMaxCollectibleOf(cardId: string, newCount: number): boolean {
		const dbCard = this.cards.getCard(cardId);
		if (!dbCard) {
			console.warn('unknown card', cardId, newCount);
			return false;
		}
		return dbCard.rarity === 'Legendary' ? newCount >= 2 : newCount >= 3;
	}
}
