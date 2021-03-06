import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AllCardsService } from '@firestone-hs/replay-parser';
import { VisualDeckCard } from '../../../models/decktracker/visual-deck-card';
import { Option } from './option';

@Component({
	selector: 'loot-bundle',
	styleUrls: [
		`../../../../css/global/menu.scss`,
		`../../../../css/component/duels/desktop/loot-bundle.component.scss`,
	],
	template: `
		<div class="loot-bundle">
			<div class="cards">
				<li class="card-container" *ngFor="let card of cards">
					<deck-card class="card" [card]="card" *ngIf="card"></deck-card>
				</li>
			</div>
			<div class="header">{{ bundleName }}</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LootBundleComponent {
	@Input() set option(value: Option) {
		if (!value) {
			return;
		}
		// console.log('setting loot', value);
		this.bundleName = this.allCards.getCard(value.cardId)?.name;
		this.cards = value.contents.map((cardId) => {
			const card = this.allCards.getCard(cardId);
			return cardId == '0'
				? null
				: VisualDeckCard.create({
						cardId: cardId,
						cardName: card.name,
						manaCost: card.cost,
				  } as VisualDeckCard);
		});
	}

	bundleName: string;
	cards: readonly VisualDeckCard[];

	constructor(private readonly allCards: AllCardsService) {}
}
