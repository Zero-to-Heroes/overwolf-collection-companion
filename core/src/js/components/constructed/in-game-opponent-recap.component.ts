import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	ViewRef,
} from '@angular/core';
import {
	ArchetypeConfig,
	ArchetypeScore,
	computeArchetypeScores,
} from '@firestone-hs/categorize-deck/dist/archetype-service';
import { ArchetypeResults, DeckList } from '@firestone-hs/cron-build-ranked-archetypes/dist/archetype-stats';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { GameState } from '../../models/decktracker/game-state';
import { GameStateEvent } from '../../models/decktracker/game-state-event';
import { GameEvent } from '../../models/game-event';
import { SetCard } from '../../models/set';
import { DeckstringOverrideEvent } from '../../services/decktracker/event/deckstring-override-event';
import { OverwolfService } from '../../services/overwolf.service';

declare let amplitude: any;

@Component({
	selector: 'in-game-opponent-recap',
	styleUrls: [
		`../../../css/global/components-global.scss`,
		`../../../css/component/constructed/in-game-opponent-recap.component.scss`,
	],
	template: `
		<div class="in-game-opponent-recap">
			<div class="played-cards-container">
				<div class="header">Played Cards</div>
				<deck-list class="played-cards" *ngIf="playedCards?.length" [cards]="playedCards"> </deck-list>
				<div class="no-cards-played" *ngIf="!playedCards?.length">
					Opponent has not played any cards yet
				</div>
			</div>
			<div class="archetype-guess">
				<div class="header">Archetype Guess</div>
				<div class="container">
					<div class="no-archetype-name" *ngIf="!archetypes?.length">
						Could not find any matching archetype
					</div>
					<div class="archetypes-list" *ngIf="archetypes?.length">
						<div class="archetype" *ngFor="let archetype of archetypes">
							<div class="archetype-name">
								{{ archetype.name }} ({{ archetype.archetypeProbability.toFixed(0) }}%)
							</div>
							<deck-list
								class="full-list"
								*ngIf="archetype.decklist?.cards?.length"
								[cards]="archetype.decklist?.cards"
							>
							</deck-list>
							<div class="decklist-popularity">Popularity: {{ archetype.popularity.toFixed(1) }}%</div>
							<button
								class="use-decklist-button"
								(mousedown)="useDecklist(archetype)"
								helpTooltip="Use this decklist in the opponent's tracker. It might cause a short lag while cards still in deck are recomputed."
							>
								<span>Use decklist</span>
							</button>

							<div class="no-archetype-list" *ngIf="!archetype.decklist?.cards?.length">
								Could not find any proposed list
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InGameOpponentRecapComponent implements AfterViewInit {
	@Input() set state(value: GameState) {
		this._state = value;
		this.updateInfo();
	}

	_state: GameState;
	playedCards: readonly string[];
	playedCardsAsCollection: readonly SetCard[];
	archetypes: readonly Archetype[];

	private deckUpdater: EventEmitter<GameEvent | GameStateEvent>;

	constructor(
		private readonly ow: OverwolfService,
		private readonly allCards: AllCardsService,
		private readonly cdr: ChangeDetectorRef,
	) {}

	async ngAfterViewInit() {
		this.deckUpdater = this.ow.getMainWindow().deckUpdater;
	}

	useDecklist(archetype: Archetype) {
		this.deckUpdater.next(new DeckstringOverrideEvent(archetype.name, archetype.decklist.deckstring));
	}

	private updateInfo() {
		if (!this._state?.opponentDeck?.cardsPlayedFromInitialDeck?.length || !this.allCards.getCards()?.length) {
			this.playedCards = [];
			return;
		}

		if (this.playedCards === this._state.opponentDeck.cardsPlayedFromInitialDeck) {
			return;
		}

		this.archetypes = [];

		setTimeout(() => {
			this.playedCards = this._state.opponentDeck.cardsPlayedFromInitialDeck;
			this.playedCardsAsCollection = this.formatCardsAsCollection(this.playedCards);
			console.log('playedCards', this.playedCards);
			// const format = 'standard';
			const format = this._state.metadata.formatType === 1 ? 'wild' : 'standard';
			const configForFormat = this._state.archetypesConfig.filter(conf => conf.gameFormat === format);
			// TODO: use prefs to filter on the right time period
			const stats: readonly ArchetypeResults[] = this._state.archetypesStats.lastPatch.filter(
				stat => stat.gameFormat === format,
			);
			const opponentClass = this._state.opponentDeck.hero?.playerClass;

			const archetypeScores: readonly ArchetypeScore[] = computeArchetypeScores(
				configForFormat,
				this.playedCards,
				opponentClass,
				format,
			);
			console.log('scores', archetypeScores);
			const topScores = archetypeScores.slice(0, 3).filter(score => score.points > 0);
			console.log('top scores', topScores);

			this.archetypes = this.consolidateArchetypes(topScores, configForFormat, stats);
			console.log('build archetypes', this.archetypes);
			if (!(this.cdr as ViewRef)?.destroyed) {
				this.cdr.detectChanges();
			}
		});
	}

	private consolidateArchetypes(
		topScores: ArchetypeScore[],
		config: readonly ArchetypeConfig[],
		stats: readonly ArchetypeResults[],
	): readonly Archetype[] {
		if (topScores.length === 0) {
			return [];
		}

		const maxScore = topScores[0].points;
		const relativeScores: ArchetypeScore[] = topScores
			.map(score => ({
				archetypeId: score.archetypeId,
				points: score.points / maxScore,
			}))
			.filter(score => score.points >= 0.3);
		console.log('relativeScores', relativeScores);

		// A single archetype, propose 3 decklists
		if (relativeScores.length === 1) {
			return [...this.buildArchetypes(relativeScores[0], config, stats).slice(0, 3)] as readonly Archetype[];
		}

		if (relativeScores.length === 2) {
			return [
				...this.buildArchetypes(relativeScores[0], config, stats).slice(0, 2),
				...this.buildArchetypes(relativeScores[1], config, stats).slice(0, 1),
			] as readonly Archetype[];
		}

		if (relativeScores.length === 3) {
			return [
				...this.buildArchetypes(relativeScores[0], config, stats).slice(0, 1),
				...this.buildArchetypes(relativeScores[1], config, stats).slice(0, 1),
				...this.buildArchetypes(relativeScores[2], config, stats).slice(0, 1),
			] as readonly Archetype[];
		}
	}

	private buildArchetypes(
		archetypeScore: ArchetypeScore,
		config: readonly ArchetypeConfig[],
		stats: readonly ArchetypeResults[],
	): readonly Archetype[] {
		const archetype = this.findArchetype(stats, archetypeScore.archetypeId);
		const configForArchetype: readonly ArchetypeConfig[] = config.filter(
			conf => conf.class + '_' + conf.archetype === archetypeScore.archetypeId,
		);
		// console.log('archetype', archetypeScore, archetype, configForArchetype, stats);
		if (!archetype) {
			// Can happen if the archetype doesn't have enough games played, so we don't have it in the json
			console.warn('no info for archetype', archetypeScore.archetypeId);
			return [];
		}

		const relevantLists = this.buildRelevantLists(archetype, configForArchetype);

		const totalMatches = relevantLists.map(list => list.wins + list.losses).reduce((a, b) => a + b, 0);
		const decklists = relevantLists.sort((a, b) => b.wins + b.losses - (a.wins + a.losses)).slice(0, 3);
		// console.log('decklists', decklists);

		return decklists.map(decklist => ({
			name: archetypeScore.archetypeId,
			archetypeProbability: 100 * archetypeScore.points,
			decklist: decklist,
			popularity: (100 * (decklist.wins + decklist.losses)) / totalMatches,
			deckstring: decklist.deckstring,
		}));
	}

	private buildRelevantLists(
		archetype: ArchetypeResults,
		configForArchetype: readonly ArchetypeConfig[],
	): InternalDeckList[] {
		const fullLists = [...archetype.decklists].filter(decklist =>
			this.hasAllPlayedCards(decklist, this.playedCards),
		);
		// console.log('fullLists', fullLists);
		if (fullLists?.length) {
			return fullLists;
		}

		// We could not find any list that contains all the played cards, so we fallback to some
		// lists that match approximately
		return [...archetype.decklists]
			.map(decklist => ({
				decklist: decklist,
				score: this.buildScore(decklist, configForArchetype, this.playedCards),
			}))
			.sort((a, b) => b.score - a.score)
			.map(
				item =>
					({
						...item.decklist,
						score: item.score,
						approximate: true,
					} as InternalDeckList),
			);
	}

	private buildScore(
		decklist: DeckList,
		configForArchetype: readonly ArchetypeConfig[],
		playedCards: readonly string[],
	): number {
		return playedCards
			.map(cardId => configForArchetype.find(conf => conf.cardId === cardId))
			.filter(conf => conf)
			.map(conf => conf.points)
			.reduce((a, b) => a + b, 0);
	}

	private findArchetype(stats: readonly ArchetypeResults[], archetypeId: string): ArchetypeResults {
		return stats.find(archetype => archetype.archetypeId === archetypeId);
	}

	private hasAllPlayedCards(decklist: DeckList, playedCards: readonly string[]): boolean {
		let cardsLeftInList = [...decklist.cards];
		for (const card of playedCards) {
			const index = cardsLeftInList.indexOf(card);
			if (index === -1) {
				return false;
			}
			cardsLeftInList = cardsLeftInList.splice(index, 1);
		}
		return true;
	}

	private formatCardsAsCollection(cards: readonly string[]): readonly SetCard[] {
		const result: { [cardId: string]: SetCard } = {};
		for (const card of cards) {
			if (!result[card]) {
				result[card] = new SetCard(card, null, null, null, null, null, 0);
			}
			result[card] = new SetCard(card, null, null, null, null, null, result[card].ownedNonPremium + 1);
		}
		return Object.values(result);
	}
}

interface Archetype {
	readonly name: string;
	readonly archetypeProbability: number;
	readonly decklist: DeckList;
	readonly popularity: number;
	readonly deckstring: string;
}

interface InternalDeckList extends DeckList {
	readonly approximate?: boolean;
	readonly score?: number;
}