import { Injectable } from '@angular/core';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { PackResult } from '@firestone-hs/retrieve-pack-stats';
import { Card } from '../../models/card';
import { CardBack } from '../../models/card-back';
import { Coin } from '../../models/coin';
import { PackInfo } from '../../models/collection/pack-info';
import { CoinInfo } from '../../models/memory/coin-info';
import { PityTimer } from '../../models/pity-timer';
import { Set, SetCard } from '../../models/set';
import { ApiRunner } from '../api-runner';
import { OverwolfService } from '../overwolf.service';
import { MemoryInspectionService } from '../plugins/memory-inspection.service';
import { groupByFunction } from '../utils';
import { IndexedDbService } from './indexed-db.service';
import { PackStatsService } from './pack-stats.service';
import { SetsService } from './sets-service.service';

const CARD_BACKS_URL = 'https://static.zerotoheroes.com/hearthstone/data/card-backs.json?v=4';

@Injectable()
export class CollectionManager {
	public static EPIC_PITY_TIMER = 10;
	public static LEGENDARY_PITY_TIMER = 40;

	private referenceCardBacks: readonly CardBack[];

	constructor(
		private readonly memoryReading: MemoryInspectionService,
		private readonly db: IndexedDbService,
		private readonly ow: OverwolfService,
		private readonly api: ApiRunner,
		private readonly allCards: AllCardsService,
		private readonly setsService: SetsService,
		private readonly packStatsService: PackStatsService,
	) {
		this.init();
	}

	public async getCollection(skipMemoryReading = false): Promise<Card[]> {
		console.log('[collection-manager] getting collection', skipMemoryReading);
		const collection = !skipMemoryReading ? await this.memoryReading.getCollection() : null;
		console.debug(
			'[collection-manager] got collection',
			collection?.filter((card) => card.id === 'BAR_705'),
		);
		if (!collection || collection.length === 0) {
			console.log('[collection-manager] retrieving collection from db');
			const collectionFromDb = await this.db.getCollection();
			console.log('[collection-manager] retrieved collection from db', collectionFromDb.length);
			return collectionFromDb;
		} else {
			console.log(
				'[collection-manager] retrieved collection from MindVision, updating collection in db',
				collection?.filter((card) => card.id === 'BAR_705'),
			);
			const savedCollection = await this.db.saveCollection(collection);
			return savedCollection;
		}
	}

	public async getPacks(): Promise<readonly PackInfo[]> {
		console.log('[collection-manager] getting pack info');
		const packInfo = (await this.memoryReading.getBoostersInfo()) ?? [];
		console.log('[collection-manager] retrieved pack info from memory', packInfo?.length);
		if (!packInfo || packInfo.length === 0) {
			console.log('[collection-manager] retrieving pack info from db');
			const packsFromDb = await this.db.getPackInfos();
			console.log('[collection-manager] retrieved pack info from db', packsFromDb.length);
			return packsFromDb;
		} else {
			const saved = await this.db.savePackInfos(packInfo);
			return saved;
		}
	}

	public async getPackStats(): Promise<readonly PackResult[]> {
		return this.packStatsService.getPackStats();
	}

	public async getCardBacks(): Promise<readonly CardBack[]> {
		console.log('[collection-manager] getting reference card backs');
		this.referenceCardBacks = this.referenceCardBacks ?? (await this.api.callGetApi(CARD_BACKS_URL)) ?? [];
		console.log('[collection-manager] getting card backs', this.referenceCardBacks?.length);
		const cardBacks = await this.memoryReading.getCardBacks();
		console.log('[collection-manager] retrieved card backs from MindVision', cardBacks?.length);
		if (!cardBacks || cardBacks.length === 0) {
			console.log('[collection-manager] retrieving card backs from db');
			const cardBacksFromDb = await this.db.getCardBacks();
			console.log('[collection-manager] retrieved card backs from db', cardBacksFromDb.length);
			console.debug('[collection-manager] card from db', cardBacksFromDb);
			// We do this so that if we update the reference, we still see them until the info
			// has been refreshed from the in-game memory
			const merged = this.mergeCardBacksData(this.referenceCardBacks, cardBacksFromDb);
			console.debug('[collection-manager] merged cards from db', merged);
			return merged;
		} else {
			const merged = this.mergeCardBacksData(this.referenceCardBacks, cardBacks);
			console.debug('[collection-manager] updating card backs in db', merged);
			const saved = await this.db.saveCardBacks(merged);
			return saved;
		}
	}

	public async getCoins(): Promise<readonly Coin[]> {
		console.log('[collection-manager] getting coin');
		const memoryCoins: readonly CoinInfo[] = await this.memoryReading.getCoins();
		if (!memoryCoins || memoryCoins.length === 0) {
			console.log('[collection-manager] retrieving coins from db');
			const coinsFromDb = await this.db.getCoins();
			console.log('[collection-manager] retrieved coins from db', coinsFromDb.length);
			return coinsFromDb;
		} else {
			const refCoins = this.allCards
				.getCards()
				.filter((card) => card.name === 'The Coin')
				.filter((card) => card.type === 'Spell');
			const coins: readonly Coin[] = refCoins.map((coin) => ({
				cardId: coin.id,
				owned: memoryCoins.find((c) => c.CoinId === coin.dbfId) != null,
				cardDbfId: coin.dbfId,
			}));
			console.log('[collection-manager] updating coins in db', coins);
			const saved = await this.db.saveCoins(coins);
			return saved;
		}
	}

	private mergeCardBacksData(
		referenceCardBacks: readonly CardBack[],
		ownedCardBacks: readonly CardBack[],
	): readonly CardBack[] {
		return referenceCardBacks.map((cardBack) => {
			const owned = ownedCardBacks.find((cb) => cb.id === cardBack.id);
			return owned?.owned
				? ({
						...cardBack,
						owned: true,
				  } as CardBack)
				: cardBack;
		});
	}

	// type is NORMAL or GOLDEN
	public inCollection(collection: Card[], cardId: string): Card {
		for (const card of collection) {
			if (card.id === cardId) {
				return card;
			}
		}
		return null;
	}

	public async buildSets(collection: readonly Card[], packStats: readonly PackResult[]): Promise<readonly Set[]> {
		const pityTimers: readonly PityTimer[] = this.buildPityTimers(packStats);
		return this.buildSetsFromCollection(collection, pityTimers);
	}

	private async buildSetsFromCollection(
		collection: readonly Card[],
		pityTimers: readonly PityTimer[],
	): Promise<readonly Set[]> {
		return this.setsService
			.getAllSets()
			.map((set) => ({ set: set, pityTimer: pityTimers.filter((timer) => timer.setId === set.id)[0] }))
			.map((set) => this.mergeSet(collection, set.set, set.pityTimer));
	}

	private mergeSet(collection: readonly Card[], set: Set, pityTimer: PityTimer): Set {
		const updatedCards: SetCard[] = this.mergeFullCards(collection, set.allCards);
		const ownedLimitCollectibleCards = updatedCards
			.map((card: SetCard) => card.getNumberCollected())
			.reduce((c1, c2) => c1 + c2, 0);
		const ownedLimitCollectiblePremiumCards = updatedCards
			.map((card: SetCard) => card.getNumberCollectedPremium())
			.reduce((c1, c2) => c1 + c2, 0);
		return new Set(
			set.id,
			set.name,
			set.launchDate,
			set.standard,
			updatedCards,
			pityTimer,
			ownedLimitCollectibleCards,
			ownedLimitCollectiblePremiumCards,
		);
	}

	private mergeFullCards(collection: readonly Card[], setCards: readonly SetCard[]): SetCard[] {
		return setCards.map((card: SetCard) => {
			const collectionCard: Card = collection.find((collectionCard: Card) => collectionCard.id === card.id);
			const ownedNonPremium = collectionCard ? collectionCard.count : 0;
			const ownedPremium = collectionCard ? collectionCard.premiumCount : 0;
			const ownedDiamond = collectionCard ? collectionCard.diamondCount : 0;
			return new SetCard(
				card.id,
				card.name,
				card.cardClass,
				card.rarity,
				card.cost,
				ownedNonPremium,
				ownedPremium,
				ownedDiamond,
			);
		});
	}

	public buildPityTimers(packStats: readonly PackResult[]): readonly PityTimer[] {
		const groupedBySet: { [setId: string]: readonly PackResult[] } = groupByFunction((pack: PackResult) =>
			this.setsService.normalizeSetId(pack.setId),
		)(packStats);
		return Object.keys(groupedBySet).map((setId) => {
			const packsForSet: readonly PackResult[] = [...groupedBySet[setId]].sort(
				(a, b) => b.creationDate - a.creationDate,
			);
			const legendaryPityTimer = this.buildPityTimer(packsForSet, 'legendary');
			const epicPityTimer = this.buildPityTimer(packsForSet, 'epic');
			return {
				setId: setId,
				packsUntilGuaranteedLegendary: legendaryPityTimer,
				packsUntilGuaranteedEpic: epicPityTimer,
			};
		});
	}

	private buildPityTimer(packsForSet: readonly PackResult[], type: 'legendary' | 'epic') {
		let result = type === 'epic' ? CollectionManager.EPIC_PITY_TIMER : CollectionManager.LEGENDARY_PITY_TIMER;
		for (let i = 0; i < packsForSet.length; i++) {
			if (packsForSet[i].cards.some((card) => card.cardRarity === type)) {
				break;
			}
			result--;
		}
		return result;
	}

	private init() {
		this.ow.addGameInfoUpdatedListener(async (res: any) => {
			if ((res.gameChanged || res.runningChanged) && (await this.ow.inGame())) {
				await Promise.all([this.getCollection(), this.getCardBacks(), this.getPacks()]);
			}
		});
	}
}
