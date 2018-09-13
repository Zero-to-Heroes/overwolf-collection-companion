import { Component, NgZone, Input, SimpleChanges, ViewEncapsulation, ElementRef, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { IOption } from 'ng-select';
import { sortBy, cloneDeep } from 'lodash'

import { AllCardsService } from '../../services/all-cards.service';

import { Card } from '../../models/card';
import { Set, SetCard } from '../../models/set';

declare var overwolf: any;

@Component({
	selector: 'cards',
	styleUrls: [
		`../../../css/component/collection/cards.component.scss`,
		`../../../css/global/scrollbar.scss`,
	],
	encapsulation: ViewEncapsulation.None,
	template: `
		<div class="cards">
			<span *ngIf="_set && !_searchString" class="set-title">
				<img src="{{'/Files/assets/images/sets/' + _set.id + '.png'}}" class="set-logo" />
				<span class="text set-name">{{_set.name}}</span>
			</span>
			<span *ngIf="!_set && _searchString" class="set-title">
				<span class="text set-name">{{_searchString}}</span>
			</span>
			<div class="show-filter" *ngIf="_activeCards" [ngStyle]="{'display': _searchString ? 'none' : 'flex'}">
				<span class="label">Show</span>
				<ng-select
					[options]="selectOptions"
					[(ngModel)]="_activeFilter"
					(selected)="selectFilter($event)"
					(opened)="refresh()"
					(closed)="refresh()"
					[noFilter]="1">
					<ng-template
				        #optionTemplate
				        let-option="option">
				        <span>{{option?.label}}</span>
				        <i class="i-30" *ngIf="option.value == _activeFilter">
							<svg class="svg-icon-fill">
								<use xlink:href="/Files/assets/svg/sprite.svg#selected_dropdown"/>
							</svg>
						</i>
				    </ng-template>
				</ng-select>
			</div>
			<ul class="cards-list" *ngIf="_activeCards">
				<li *ngFor="let card of _activeCards">
					<card-view [card]="card">/</card-view>
				</li>
			</ul>
			<collection-empty-state [set]="_set" [activeFilter]="_activeFilter" [searchString]="_searchString" *ngIf="_activeCards.length == 0"></collection-empty-state>
			<ul class="pagination" *ngIf="_numberOfPages > 1">
				<li class="arrow previous" (click)="previousPage()" [ngClass]="_currentPage == 0 ? 'disabled' : ''">
					<i class="i-30">
						<svg class="svg-icon-fill">
							<use xlink:href="/Files/assets/svg/sprite.svg#arrow"/>
						</svg>
					</i>
				</li>
				<li *ngFor="let page of _pages" [ngClass]="_currentPage == page ? 'active' : ''" (click)="goToPage(page)">{{page + 1}}</li>
				<li class="arrow next" (click)="nextPage()" [ngClass]="_currentPage >= _numberOfPages - 1 ? 'disabled' : ''">
					<i class="i-30">
						<svg class="svg-icon-fill">
							<use xlink:href="/Files/assets/svg/sprite.svg#arrow"/>
						</svg>
					</i>
				</li>
			</ul>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsComponent implements AfterViewInit {

	readonly MAX_CARDS_DISPLAYED_PER_PAGE = 100000;

	readonly FILTER_OWN = 'own';
	readonly FILTER_GOLDEN_OWN = 'goldenown';
	readonly FILTER_DONT_OWN = 'dontown';
	readonly FILTER_ALL = 'all';

	selectOptions: Array<IOption> = [
		{label: this.labelFor(this.FILTER_OWN), value: this.FILTER_OWN},
		{label: this.labelFor(this.FILTER_GOLDEN_OWN), value: this.FILTER_GOLDEN_OWN},
		{label: this.labelFor(this.FILTER_DONT_OWN), value: this.FILTER_DONT_OWN},
		{label: this.labelFor(this.FILTER_ALL), value: this.FILTER_ALL},
	]

	_searchString: string;
	_cardList: SetCard[];
	_activeCards: SetCard[];
	_set: Set;
	_cardsIndexRangeStart = 0;
	_numberOfPages: number;
	_currentPage = 0;
	_pages: number[] = [];
	_activeFilter = this.FILTER_ALL;

	constructor(private elRef: ElementRef, private cdr: ChangeDetectorRef) {

	}

	ngAfterViewInit() {
		let singleEl: HTMLElement = this.elRef.nativeElement.querySelector('.single');
		let caretEl = singleEl.appendChild(document.createElement('i'));
		caretEl.innerHTML =
			`<svg class="svg-icon-fill">
				<use xlink:href="/Files/assets/svg/sprite.svg#arrow"/>
			</svg>`;
		caretEl.classList.add('i-30');
		caretEl.classList.add('caret');
		setTimeout(() => this.cdr.detectChanges());
	}

	@Input('set') set cardSet(set: Set) {
		this._currentPage = 0;
		this._set = set;
	}

	@Input('cardList') set cardList(cardList: SetCard[]) {
		this._currentPage = 0;
		this._cardList = sortBy(cardList, "cost", "name");
		this.updateShownCards();
	}

	@Input('searchString') set searchString(searchString: string) {
		this._currentPage = 0;
		this._searchString = searchString;
	}

	selectFilter(option: IOption) {
		// console.log('selected item', option, this._activeFilter);
		this._activeFilter = option.value;
		this._currentPage = 0;
		this.updateShownCards();
	}

	refresh() {
		this.cdr.detectChanges();
	}

	previousPage() {
		this._currentPage = Math.max(0, this._currentPage - 1);
		this.updateShownCards();
	}

	nextPage() {
		this._currentPage = Math.min(this._numberOfPages - 1, this._currentPage + 1);
		this.updateShownCards();
	}

	goToPage(page: number) {
		this._currentPage = page;
		this.updateShownCards();
	}

	trackByCardId(card: Card, index: number) {
		return card.id;
	}

	private updateShownCards() {
		// console.log('updating card list', this._cardList);
		this._cardsIndexRangeStart = this._currentPage * this.MAX_CARDS_DISPLAYED_PER_PAGE;
		let filteredCards = this._cardList.filter(this.filterFunction());
		this._pages = [];
		this._numberOfPages = Math.ceil(filteredCards.length / this.MAX_CARDS_DISPLAYED_PER_PAGE);
		// console.log('number of pages', this._numberOfPages, filteredCards);
		for (let i = 0; i < this._numberOfPages; i++) {
			this._pages.push(i);
		}
		this._activeCards = filteredCards.slice(
			this._cardsIndexRangeStart,
			this._cardsIndexRangeStart + this.MAX_CARDS_DISPLAYED_PER_PAGE);
			console.log('showing cards', this._currentPage, this._cardsIndexRangeStart);
			console.log('active cards', this._activeCards);
		this.cdr.detectChanges();
	}

	private filterFunction() {
		switch (this._activeFilter) {
			case this.FILTER_ALL:
				return (card: SetCard) => true;
			case this.FILTER_OWN:
				return (card: SetCard) => (card.ownedNonPremium + card.ownedPremium > 0);
			case this.FILTER_GOLDEN_OWN:
				return (card: SetCard) => (card.ownedPremium > 0);
			case this.FILTER_DONT_OWN:
				return (card: SetCard) => (card.ownedNonPremium + card.ownedPremium == 0);
			default:
				console.log('unknown filter', this._activeFilter);
		}
	}

	private labelFor(filter: string) {
		switch (filter) {
			case this.FILTER_ALL: return 'All existing cards';
			case this.FILTER_OWN: return 'Only cards I have';
			case this.FILTER_GOLDEN_OWN: return 'Only golden cards I have';
			case this.FILTER_DONT_OWN: return 'Only cards I do not have';
			default: console.log('unknown filter', filter);
		}
	}
}
