/* eslint-disable @typescript-eslint/no-use-before-define */
import { Injectable } from '@angular/core';
import { DeckFilters } from '../../../models/mainwindow/decktracker/deck-filters';
import { DeckSummary } from '../../../models/mainwindow/decktracker/deck-summary';
import { DecktrackerState } from '../../../models/mainwindow/decktracker/decktracker-state';
import { StatsState } from '../../../models/mainwindow/stats/stats-state';
import { Preferences } from '../../../models/preferences';
import { DecksStateBuilderService } from './decks-state-builder.service';

@Injectable()
export class DecktrackerStateLoaderService {
	constructor(private readonly decksStateBuilder: DecksStateBuilderService) {}

	public buildState(currentState: DecktrackerState, stats: StatsState, prefs: Preferences = null): DecktrackerState {
		const filters: DeckFilters = prefs?.desktopDeckFilters ?? currentState.filters ?? new DeckFilters();
		const decks: readonly DeckSummary[] = this.decksStateBuilder.buildState(stats, filters);
		return Object.assign(new DecktrackerState(), currentState, {
			decks: decks,
			filters: filters,
			isLoading: false,
		} as DecktrackerState);
	}
}
