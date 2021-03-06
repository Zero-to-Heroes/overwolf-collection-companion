import { EventEmitter, Injectable } from '@angular/core';
import { ArenaClassFilterType } from '../models/arena/arena-class-filter.type';
import { ArenaTimeFilterType } from '../models/arena/arena-time-filter.type';
import { BgsStatsFilterId } from '../models/battlegrounds/post-match/bgs-stats-filter-id.type';
import { DuelsClassFilterType } from '../models/duels/duels-class-filter.type';
import { DuelsGameModeFilterType } from '../models/duels/duels-game-mode-filter.type';
import { DuelsHeroSortFilterType } from '../models/duels/duels-hero-sort-filter.type';
import { DuelsStatTypeFilterType } from '../models/duels/duels-stat-type-filter.type';
import { DuelsTimeFilterType } from '../models/duels/duels-time-filter.type';
import { DuelsTopDecksDustFilterType } from '../models/duels/duels-top-decks-dust-filter.type';
import { DuelsTreasureSortFilterType } from '../models/duels/duels-treasure-sort-filter.type';
import { DuelsTreasureStatTypeFilterType } from '../models/duels/duels-treasure-stat-type-filter.type';
import { BgsActiveTimeFilterType } from '../models/mainwindow/battlegrounds/bgs-active-time-filter.type';
import { BgsHeroSortFilterType } from '../models/mainwindow/battlegrounds/bgs-hero-sort-filter.type';
import { BgsRankFilterType } from '../models/mainwindow/battlegrounds/bgs-rank-filter.type';
import { MmrGroupFilterType } from '../models/mainwindow/battlegrounds/mmr-group-filter-type';
import { CurrentAppType } from '../models/mainwindow/current-app.type';
import { DeckFilters } from '../models/mainwindow/decktracker/deck-filters';
import { ReplaysFilterCategoryType } from '../models/mainwindow/replays/replays-filter-category.type';
import { FORCE_LOCAL_PROP, Preferences } from '../models/preferences';
import { Ftue } from '../models/preferences/ftue';
import { ApiRunner } from './api-runner';
import { GenericIndexedDbService } from './generic-indexed-db.service';
import { OutOfCardsToken } from './mainwindow/out-of-cards.service';
import { OverwolfService } from './overwolf.service';
import { capitalizeFirstLetter } from './utils';

declare let amplitude;

const PREF_UPDATE_URL = 'https://api.firestoneapp.com/userPrefs/post/preferences/{proxy+}';
const PREF_RETRIEVE_URL = 'https://api.firestoneapp.com/userPrefs/get/preferences/{proxy+}';

@Injectable()
export class PreferencesService {
	public static readonly DECKTRACKER_OVERLAY_DISPLAY = 'DECKTRACKER_OVERLAY_DISPLAY';
	public static readonly DECKTRACKER_MATCH_OVERLAY_DISPLAY = 'DECKTRACKER_MATCH_OVERLAY_DISPLAY';
	public static readonly DECKTRACKER_OVERLAY_SIZE = 'DECKTRACKER_OVERLAY_SIZE';
	public static readonly TWITCH_CONNECTION_STATUS = 'TWITCH_CONNECTION_STATUS';

	private preferencesEventBus = new EventEmitter<any>();

	constructor(
		private indexedDb: GenericIndexedDbService,
		private ow: OverwolfService,
		private readonly api: ApiRunner,
	) {
		// It will create one per window that uses the service, but we don't really care
		// We just have to always use the one from the MainWindow
		window['preferencesEventBus'] = this.preferencesEventBus;
	}

	public getPreferences(): Promise<Preferences> {
		return this.indexedDb.getUserPreferences();
	}

	public async reset() {
		const currentPrefs = await this.getPreferences();
		const newPrefs: Preferences = Object.assign(new Preferences(), {
			desktopDeckHiddenDeckCodes: currentPrefs.desktopDeckHiddenDeckCodes,
			desktopDeckStatsReset: currentPrefs.desktopDeckStatsReset,
		} as Preferences);
		await this.savePreferences(newPrefs);
	}

	public async resetDecktrackerPositions() {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = {
			...prefs,
			decktrackerPosition: undefined,
			opponentOverlayPosition: undefined,
		};
		await this.savePreferences(newPrefs);
	}

	public async setValue(field: string, pref: boolean | number): Promise<Preferences> {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, [field]: pref };
		await this.savePreferences(newPrefs);
		return newPrefs;
	}

	public async setGlobalFtueDone() {
		const prefs = await this.getPreferences();
		const ftue: Ftue = { ...prefs.ftue, hasSeenGlobalFtue: true };
		const newPrefs: Preferences = { ...prefs, ftue: ftue };
		await this.savePreferences(newPrefs);
	}

	public async updateReplayFilterDeckstring(type: ReplaysFilterCategoryType, value: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, replaysFilterDeckstring: value };
		await this.savePreferences(newPrefs);
	}

	public async updateReplayFilterGameMode(type: ReplaysFilterCategoryType, value: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, replaysFilterGameMode: value };
		await this.savePreferences(newPrefs);
	}

	public async updateReplayFilterBgHero(type: ReplaysFilterCategoryType, value: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, replaysFilterBgHero: value };
		await this.savePreferences(newPrefs);
	}

	public async updateReplayFilterPlayerClass(type: ReplaysFilterCategoryType, value: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, replaysFilterPlayerClass: value };
		await this.savePreferences(newPrefs);
	}

	public async updateReplayFilterOpponentClass(type: ReplaysFilterCategoryType, value: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, replaysFilterOpponentClass: value };
		await this.savePreferences(newPrefs);
	}

	public async setDontShowNewVersionNotif(value: boolean) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, dontShowNewVersionNotif: value };
		await this.savePreferences(newPrefs);
	}

	public async setMainVisibleSection(value: CurrentAppType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, currentMainVisibleSection: value };
		await this.savePreferences(newPrefs);
	}

	public async setContactEmail(value: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, contactEmail: value };
		await this.savePreferences(newPrefs);
	}

	public async updateAdvancedSettings(advancedSettings: boolean) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, advancedModeToggledOn: advancedSettings };
		await this.savePreferences(newPrefs);
	}

	public async setHasSeenVideoCaptureChangeNotif(pref: boolean) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, hasSeenVideoCaptureChangeNotif: pref };
		await this.savePreferences(newPrefs);
	}

	public async setTwitchAccessToken(pref: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, twitchAccessToken: pref };
		await this.savePreferences(newPrefs, PreferencesService.TWITCH_CONNECTION_STATUS);
	}

	public async setTwitchUserName(pref: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, twitchUserName: pref };
		await this.savePreferences(newPrefs, PreferencesService.TWITCH_CONNECTION_STATUS);
	}

	public async disconnectTwitch() {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, twitchAccessToken: undefined };
		await this.savePreferences(newPrefs, PreferencesService.TWITCH_CONNECTION_STATUS);
	}

	public async udpateOutOfCardsToken(token: OutOfCardsToken) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, outOfCardsToken: token };
		await this.savePreferences(newPrefs);
	}

	public async acknowledgeFtue(pref: string) {
		const prefs = await this.getPreferences();
		const ftue = prefs.ftue;
		const newFtue = { ...ftue, [pref]: true } as Ftue;
		const newPrefs: Preferences = { ...prefs, ftue: newFtue };
		await this.savePreferences(newPrefs);
	}

	public async acknowledgeReleaseNotes(version: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, lastSeenReleaseNotes: version };
		await this.savePreferences(newPrefs);
	}

	public async updateTrackerPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, decktrackerPosition: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async updateOpponentTrackerPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, opponentOverlayPosition: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async updateSecretsHelperPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, secretsHelperPosition: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsSimulationWidgetPosition(left: any, top: any) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsSimulationWidgetPosition: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsBannedTribedPosition(left: any, top: any) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsBannedTribesWidgetPosition: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsMinionsListPosition(left: any, top: any) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsMinionsListPosition: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async updateCounterPosition(activeCounter: string, side: string, left: any, top: any) {
		const prefs = await this.getPreferences();
		const propertyName = this.buildCounterPropertyName(activeCounter, side);
		const newPrefs: Preferences = { ...prefs, [propertyName]: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async getCounterPosition(activeCounter: string, side: string) {
		const prefs = await this.getPreferences();
		return prefs[this.buildCounterPropertyName(activeCounter, side)];
	}

	public async updateSecretsHelperWidgetPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, secretsHelperWidgetPosition: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsOverlayButtonPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsOverlayButtonPosition: { left, top } };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsSelectedTabs(selectedStats: readonly BgsStatsFilterId[]) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsSelectedTabs2: selectedStats };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsNumberOfDisplayedTabs(tabsNumber: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsNumberOfDisplayedTabs: tabsNumber };
		await this.savePreferences(newPrefs);
	}

	public async setZoneToggleDefaultClose(name: string, side: string, close: boolean) {
		const prefs = await this.getPreferences();
		const propertyName = 'overlayZoneToggleDefaultClose_' + side + '_' + name;
		const newPrefs: Preferences = { ...prefs, [propertyName]: close };
		await this.savePreferences(newPrefs);
	}

	public async getZoneToggleDefaultClose(name: string, side: string) {
		const prefs = await this.getPreferences();
		const propertyName = 'overlayZoneToggleDefaultClose_' + side + '_' + name;
		return prefs[propertyName];
	}

	public async updateBgsTimeFilter(value: BgsActiveTimeFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsActiveTimeFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsRankFilter(value: BgsRankFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsActiveRankFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsHeroSortFilter(value: BgsHeroSortFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsActiveHeroSortFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsHeroFilter(value: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsActiveHeroFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateBgsMmrGroupFilter(value: MmrGroupFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, bgsActiveMmrGroupFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsHeroSortFilter(value: DuelsHeroSortFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveHeroSortFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsTreasureSortFilter(value: DuelsTreasureSortFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveTreasureSortFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsTreasurePassiveTypeFilter(value: DuelsTreasureStatTypeFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveTreasureStatTypeFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsStatTypeFilter(value: DuelsStatTypeFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveStatTypeFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsGameModeFilter(value: DuelsGameModeFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveGameModeFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsTimeFilter(value: DuelsTimeFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveTimeFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsTopDecksClassFilter(value: DuelsClassFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveTopDecksClassFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsTopDecksDustFilter(value: DuelsTopDecksDustFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveTopDecksDustFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsMmrFilter(value: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsActiveMmrFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateDuelsDeckName(deckstring: string, newName: string) {
		const prefs = await this.getPreferences();
		const names = prefs.duelsPersonalDeckNames;
		names[deckstring] = newName;
		const newPrefs: Preferences = { ...prefs, duelsPersonalDeckNames: names };
		await this.savePreferences(newPrefs);
	}

	public async updateArenaTimeFilter(value: ArenaTimeFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, arenaActiveTimeFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async updateArenaClassFilter(value: ArenaClassFilterType) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, arenaActiveClassFilter: value };
		await this.savePreferences(newPrefs);
	}

	public async setDesktopDeckFilters(value: DeckFilters) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, desktopDeckFilters: value };
		await this.savePreferences(newPrefs);
		return newPrefs;
	}

	public async updateDesktopDecktrackerChangeMatchupAsPercentages(value: boolean) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, desktopDeckShowMatchupAsPercentages: value };
		await this.savePreferences(newPrefs);
		return newPrefs;
	}

	public async setDeckResetDates(deckstring: string, newResetDates: readonly number[]) {
		const prefs = await this.getPreferences();
		const newReset = {
			...prefs.desktopDeckStatsReset,
			[deckstring]: newResetDates,
		};
		const newPrefs: Preferences = { ...prefs, desktopDeckStatsReset: newReset };
		this.savePreferences(newPrefs);
		return newPrefs;
	}

	public async setDeckDeleteDates(deckstring: string, newDeleteDates: readonly number[]) {
		const prefs = await this.getPreferences();
		const newDelete = {
			...prefs.desktopDeckDeletes,
			[deckstring]: newDeleteDates,
		};
		console.debug('newDelete', newDelete);
		const newPrefs: Preferences = { ...prefs, desktopDeckDeletes: newDelete };
		await this.savePreferences(newPrefs);
		return newPrefs;
	}

	public async setDesktopDeckHiddenDeckCodes(value: string[]): Promise<Preferences> {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, desktopDeckHiddenDeckCodes: value };
		this.savePreferences(newPrefs);
		return newPrefs;
	}

	public async setDuelsPersonalDeckHiddenDeckCodes(value: string[]): Promise<Preferences> {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, duelsPersonalDeckHiddenDeckCodes: value };
		this.savePreferences(newPrefs);
		return newPrefs;
	}

	public async savePreferences(userPrefs: Preferences, eventName: string = null) {
		await this.indexedDb.saveUserPreferences(userPrefs);
		// console.log('broadcasting new prefs', userPrefs);
		const eventBus: EventEmitter<any> = this.ow.getMainWindow().preferencesEventBus;
		eventBus.next({
			name: eventName,
			preferences: userPrefs,
		});
	}

	public async updateRemotePreferences() {
		const userPrefs = await this.getPreferences();
		console.log('[preferences] prefs from DB', userPrefs);
		const currentUser = await this.ow.getCurrentUser();
		const prefsWithDate: Preferences = {
			...userPrefs,
			lastUpdateDate: new Date(),
		};
		const prefsToSync = new Preferences();
		for (const prop in prefsWithDate) {
			const meta = Reflect.getMetadata(FORCE_LOCAL_PROP, prefsToSync, prop);
			if (!meta) {
				prefsToSync[prop] = prefsWithDate[prop];
			}
		}
		console.log('no-format', '[preferences] saving remote prefs', prefsToSync);
		await this.api.callPostApi(PREF_UPDATE_URL, {
			userId: currentUser.userId,
			userName: currentUser.username,
			prefs: prefsToSync,
		});
	}

	public async loadRemotePrefs(): Promise<Preferences | undefined> {
		const currentUser = await this.ow.getCurrentUser();
		const result: any = await this.api.callPostApi(PREF_RETRIEVE_URL, {
			userId: currentUser.userId,
			userName: currentUser.username,
		});
		// console.debug('result from remote', result);
		return result;
	}

	private buildCounterPropertyName(activeCounter: string, side: string): string {
		return side + capitalizeFirstLetter(activeCounter) + 'CounterWidgetPosition';
	}
}
