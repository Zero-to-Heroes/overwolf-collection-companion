import { CompletedAchievement } from '../../../../models/completed-achievement';
import { GameEvent } from '../../../../models/game-event';
import { Requirement } from '../requirements/_requirement';
import { Challenge } from './challenge';

export class GenericChallenge implements Challenge {
	readonly achievementId: string;
	readonly resetEvents: readonly string[];
	readonly stateProperties: readonly string[];
	readonly requirements: readonly Requirement[];

	protected correctMode = false;
	protected callback = undefined;

	constructor(achievementId: string, resetEvents: readonly string[], requirements: readonly Requirement[]) {
		this.achievementId = achievementId;
		this.resetEvents = resetEvents || [];
		this.requirements = requirements || [];
	}

	public detect(gameEvent: GameEvent, callback: Function) {
		// TODO: looks weird to do this for every event
		if (!this.callback) {
			this.callback = callback;
		}
		if (this.resetEvents.indexOf(gameEvent.type) !== -1) {
			this.resetState();
		}
		this.requirements.forEach(req => req.test(gameEvent));
		this.testCompletion();
	}

	public defaultAchievement() {
		return new CompletedAchievement(this.achievementId, 0, []);
	}

	public getRecordingDuration(): number {
		return 15000;
	}

	public getRecordPastDurationMillis(): number {
		return 2000;
	}

	public notificationTimeout(): number {
		return 1000;
	}

	protected testCompletion() {
		// console.log('handling completion', this.correctMode, this.callback, this);
		const allRequirementsCompleted = this.requirements.every(req => req.isCompleted());
		if (this.callback && allRequirementsCompleted) {
			this.requirements.forEach(req => req.afterAchievementCompletionReset());
			this.callback();
		}
	}

	private resetState(): void {
		this.callback = undefined;
		this.correctMode = undefined;
		this.requirements.forEach(req => req.reset());
	}
}
