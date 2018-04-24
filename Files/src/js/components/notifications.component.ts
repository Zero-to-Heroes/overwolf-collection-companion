import { Component, NgZone, ElementRef, Renderer2, ViewChild, ViewEncapsulation } from '@angular/core';

import * as Raven from 'raven-js';

import { NotificationsService } from 'angular2-notifications';
import { DebugService } from '../services/debug.service';

declare var overwolf: any;

@Component({
	selector: 'notifications',
	styleUrls: [
		'../../css/global/components-global.scss',
		'../../css/component/notifications.component.scss',
	],
	encapsulation: ViewEncapsulation.None,
	template: `
		<div class="notifications">
			<simple-notifications [options]="toastOptions" (onCreate)="created($event)" (onDestroy)="destroyed($event)"></simple-notifications>
		</div>
	`,
})
export class NotificationsComponent {

	private timeout = 10000;
	private windowId: string;
	private mainWindowId: string;

	private toastOptions = {
		// timeOut: this.timeout,
		pauseOnHover: true,
		showProgressBar: false,
		clickToClose: false
	}

	constructor(
		private ngZone: NgZone,
		private notificationService: NotificationsService,
		private debugService: DebugService,
		private elRef: ElementRef) {

		overwolf.windows.onMessageReceived.addListener((message) => {
			console.log('received message in notification window', message);
			let messageObject = JSON.parse(message.content);
			this.sendNotification(messageObject.content, messageObject.cardId);
		})

		overwolf.windows.getCurrentWindow((result) => {
			this.windowId = result.window.id;

			// Change position to be bottom right?
			console.log('retrieved current notifications window', result, this.windowId);

			overwolf.windows.obtainDeclaredWindow("CollectionWindow", (result) => {
				if (result.status !== 'success') {
					console.warn('Could not get CollectionWindow', result);
				}
				this.mainWindowId = result.window.id;

				// overwolf.windows.sendMessage(this.mainWindowId, 'ack', 'ack', (result) => {
				// 	console.log('ack sent to main window', result);
				// });
			});
		})
		console.log('notifications windows initialized')
	}

	private sendNotification(htmlMessage: string, cardId?: string) {
		if (!this.windowId) {
			// console.log('Notification window isnt properly initialized yet, waiting');
			setTimeout(() => {
				this.sendNotification(htmlMessage);
			}, 100);
			return;
		}
		// console.log('received message, restoring notification window');
		overwolf.windows.restore(this.windowId, (result) => {
			// console.log('notifications window is on?', result);

			this.ngZone.run(() => {
				let toast = this.notificationService.html(htmlMessage);
				toast.click.subscribe((event) => {
					console.log('registered click on toast');
					if (cardId) {
						overwolf.windows.sendMessage(this.mainWindowId, 'click-card', cardId, (result) => {
							console.log('send click info to collection window', cardId, this.mainWindowId, result);
						});
					}
				})
			});
		})
	}

	private created(event) {
		console.log('created', event);
		this.resize();
	}

	private destroyed(event) {
		console.log('destroyed', event);
		this.resize();
	}

	private resize() {
		let wrapper = this.elRef.nativeElement.querySelector('.simple-notification-wrapper');
		overwolf.windows.getCurrentWindow((currentWindow) => {
			let height = wrapper.getBoundingClientRect().height + 20;
			let width = currentWindow.window.width;
			// console.log('and current window', currentWindow);
			// console.log('rect2', wrapper.getBoundingClientRect());
			overwolf.games.getRunningGameInfo((gameInfo) => {
				let gameWidth = gameInfo.width;
				let gameHeight = gameInfo.height;
				overwolf.windows.changeSize(currentWindow.window.id, width, height, (changeSize) => {
					// console.log('changed window size', changeSize);
					overwolf.windows.changePosition(currentWindow.window.id, (gameWidth - width), (gameHeight - height), (changePosition) => {
						// console.log('changed window position', changePosition);
						overwolf.windows.getCurrentWindow((tmp) => {
							// console.log('new window', tmp);
						});
					});
				});
			});
		});
	}
}
