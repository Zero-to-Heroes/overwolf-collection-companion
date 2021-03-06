import { BgsStatsFilterId } from '../../../../../models/battlegrounds/post-match/bgs-stats-filter-id.type';
import { MainWindowState } from '../../../../../models/mainwindow/main-window-state';
import { NavigationReplays } from '../../../../../models/mainwindow/navigation/navigation-replays';
import { NavigationState } from '../../../../../models/mainwindow/navigation/navigation-state';
import { SelectMatchStatsTabEvent } from '../../events/replays/select-match-stats-tab-event';
import { Processor } from '../processor';

export class SelectMatchStatsTabProcessor implements Processor {
	public async process(
		event: SelectMatchStatsTabEvent,
		currentState: MainWindowState,
		stateHistory,
		navigationState: NavigationState,
	): Promise<[MainWindowState, NavigationState]> {
		const selectedStatsTabs: readonly BgsStatsFilterId[] = navigationState.navigationReplays.selectedStatsTabs.map(
			(tab, index) => (index === event.tabIndex ? event.tab : tab),
		);
		const newReplays = navigationState.navigationReplays.update({
			selectedStatsTabs: selectedStatsTabs,
		} as NavigationReplays);
		return [
			null,
			navigationState.update({
				isVisible: true,
				currentApp: 'replays',
				navigationReplays: newReplays,
			} as NavigationState),
		];
	}
}
