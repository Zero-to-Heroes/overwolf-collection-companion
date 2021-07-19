import { EventEmitter, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { BattlegroundsPersonalStatsHeroDetailsCategory } from '../models/mainwindow/battlegrounds/categories/battlegrounds-personal-stats-hero-details-category';
import { MainWindowState } from '../models/mainwindow/main-window-state';
import { NavigationState } from '../models/mainwindow/navigation/navigation-state';
import { MainWindowStoreEvent } from './mainwindow/store/events/main-window-store-event';
import { OverwolfService } from './overwolf.service';

type Selector<T> = (fullState: [MainWindowState, NavigationState]) => T;

@Injectable()
export class AppUiStoreService {
	private mainStore: BehaviorSubject<[MainWindowState, NavigationState]>;
	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(private readonly ow: OverwolfService, private zone: NgZone) {
		this.mainStore = this.ow.getMainWindow()?.mainWindowStoreMerged;
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	public listen$<S extends Selector<any>[]>(
		...selectors: S
	): Observable<{ [K in keyof S]: S[K] extends Selector<infer T> ? T : never }> {
		return this.mainStore.asObservable().pipe(
			map((mainStore) => selectors.map((selector) => selector(mainStore))),
			distinctUntilChanged(),
		) as Observable<{ [K in keyof S]: S[K] extends Selector<infer T> ? T : never }>;
	}

	public send(event: MainWindowStoreEvent) {
		this.stateUpdater.next(event);
	}
}

// TODO: move this somewhere else? To a facade?
export const currentBgHeroId = (main: MainWindowState, nav: NavigationState): string => {
	return nav.navigationBattlegrounds.selectedCategoryId?.includes('bgs-category-personal-hero-details-')
		? (main.battlegrounds.findCategory(
				nav.navigationBattlegrounds.selectedCategoryId,
		  ) as BattlegroundsPersonalStatsHeroDetailsCategory)?.heroId
		: null;
};

export const cdLog = (...args) => console.debug('[cd]', ...args);
