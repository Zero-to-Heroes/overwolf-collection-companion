import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	HostListener,
	Input,
} from '@angular/core';
import { CardHistory } from '../../models/card-history';
import { SetCard } from '../../models/set';
import { LoadMoreCardHistoryEvent } from '../../services/mainwindow/store/events/collection/load-more-card-history-event';
import { ToggleShowOnlyNewCardsInHistoryEvent } from '../../services/mainwindow/store/events/collection/toggle-show-only-new-cards-in-history-event';
import { MainWindowStoreEvent } from '../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../services/overwolf.service';

@Component({
	selector: 'card-history',
	styleUrls: [
		`../../../css/component/collection/card-history.component.scss`,
		`../../../css/global/scrollbar.scss`,
		`../../../css/global/forms.scss`,
		`../../../css/global/toggle.scss`,
	],
	template: `
		<div class="card-history">
			<div class="history">
				<div class="top-container">
					<span class="title">My Card History</span>
					<section class="toggle-label">
						<preference-toggle
							field="collectionHistoryShowOnlyNewCards"
							label="Show only new cards"
							[toggleFunction]="toggleShowOnlyNewCards"
						></preference-toggle>
					</section>
				</div>
				<ul>
					<li *ngFor="let historyItem of shownHistory; trackBy: trackById">
						<card-history-item
							[historyItem]="historyItem"
							[active]="(_selectedCard && _selectedCard.id === historyItem.cardId) || false"
						>
						</card-history-item>
					</li>
					<li *ngIf="cardHistory && cardHistory.length < totalHistoryLength" class="more-data-container">
						<span class="more-data-text"
							>You've viewed {{ cardHistory.length }} of {{ totalHistoryLength }} cards</span
						>
						<button class="load-more-button" (mousedown)="loadMore()">Load More</button>
					</li>
					<section *ngIf="!cardHistory || cardHistory.length === 0" class="empty-state">
						<i class="i-60x78 pale-theme">
							<svg class="svg-icon-fill">
								<use xlink:href="/Files/assets/svg/sprite.svg#empty_state_my_card_history" />
							</svg>
						</i>
						<span>No history yet</span>
						<span>Open a pack to start one!</span>
					</section>
				</ul>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardHistoryComponent implements AfterViewInit {
	private readonly MAX_RESULTS_DISPLAYED = 1000;

	_selectedCard: SetCard;
	@Input() showOnlyNewCards: boolean;
	@Input() cardHistory: readonly CardHistory[];
	@Input() shownHistory: readonly CardHistory[];
	@Input() totalHistoryLength: number;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	@Input() set selectedCard(selectedCard: SetCard) {
		this._selectedCard = selectedCard;
	}

	constructor(private el: ElementRef, private ow: OverwolfService) {}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	loadMore() {
		this.stateUpdater.next(new LoadMoreCardHistoryEvent(this.MAX_RESULTS_DISPLAYED));
	}

	toggleShowOnlyNewCards = (newValue: boolean) => {
		this.stateUpdater.next(new ToggleShowOnlyNewCardsInHistoryEvent(newValue));
	};

	// Prevent the window from being dragged around if user scrolls with click
	@HostListener('mousedown', ['$event'])
	onHistoryClick(event: MouseEvent) {
		// console.log('handling history click', event);
		const rect = this.el.nativeElement.querySelector('.history').getBoundingClientRect();
		// console.log('element rect', rect);
		const scrollbarWidth = 7;
		if (event.offsetX >= rect.width - scrollbarWidth) {
			event.stopPropagation();
		}
	}

	trackById(index, history: CardHistory) {
		return history.id;
	}
}
