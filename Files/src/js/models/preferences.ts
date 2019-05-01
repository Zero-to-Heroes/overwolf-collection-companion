export class Preferences {

	readonly id: number = 1;
	readonly hasSeenPityTimerFtue: boolean;
	readonly dontConfirmVideoReplayDeletion: boolean;
	readonly dontRecordAchievements: boolean;
	readonly hasSeenVideoCaptureChangeNotif: boolean;
	readonly decktrackerShowArena: boolean;
	readonly decktrackerShowRanked: boolean = true;
	readonly decktrackerShowTavernBrawl: boolean = true;
	readonly decktrackerShowPractice: boolean = true;
	readonly decktrackerShowFriendly: boolean = true;
	readonly decktrackerShowCasual: boolean = true;
	readonly overlayDisplayMode: string;
    readonly launchAppOnGameStart: boolean = true;
}
