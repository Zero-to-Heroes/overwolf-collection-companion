import { Injectable, EventEmitter } from '@angular/core';

import { GameEvent } from '../../models/game-event';
import { CompletedAchievement } from '../../models/completed-achievement';

import { AchievementsRefereee } from './achievements-referee.service';
import { AchievementsRepository } from './achievements-repository.service';

import { Events } from '../events.service';
import { GameEvents } from '../game-events.service';
import { OwNotificationsService } from '../notifications.service';

declare var ga;

@Injectable()
export class AchievementsMonitor {

	public newAchievements = new EventEmitter<CompletedAchievement>();

	constructor(
		private gameEvents: GameEvents,
		private achievementsReferee: AchievementsRefereee,
		private repository: AchievementsRepository,
		private events: Events) {

		this.gameEvents.allEvents.subscribe(
			(gameEvent: GameEvent) => {
				this.handleEvent(gameEvent);
			}
		);
		this.newAchievements.subscribe(
			(newAchievement: CompletedAchievement) => {
				console.log('[achievements] WOOOOOOHOOOOOOOOO!!!! New achievement!', newAchievement);
				ga('send', 'event', 'new-achievement', newAchievement.id);
				this.events.broadcast(Events.NEW_ACHIEVEMENT, newAchievement);
				// this.notifications.html(`<div class="message-container"><img src="${newAchievement.icon}"><div class="message">Achievement unlocked! ${newAchievement.title}</div></div>`)
			}
		);
		console.log('listening for achievement completion events');
	}

	private handleEvent(gameEvent: GameEvent) {
		// console.log('[achievements] handling events', gameEvent);
		for (let achievement of this.repository.challengeModules) {
			achievement.detect(gameEvent, (data) => {
				this.achievementsReferee.complete(achievement, (newAchievement) => {
					this.newAchievements.next(newAchievement);
				}, data);
			});
		}
	}
}
