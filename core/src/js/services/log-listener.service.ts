import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Events } from './events.service';
import { ListenObject, OverwolfService } from './overwolf.service';

@Injectable()
export class LogListenerService {
	public subject = new Subject();

	private logFile: string;
	private callback: (input: string) => void;

	private monitoring: boolean;
	private fileInitiallyPresent: boolean;
	private logsLocation: string;
	private existingLineHandler: (input: string) => void;

	constructor(private ow: OverwolfService) {}

	public configure(
		logFile: string,
		newLineHandler: (input: string) => void,
		existingLineHandler: (input: string) => void = null,
	): LogListenerService {
		this.logFile = logFile;
		this.callback = newLineHandler;
		console.log('[log-listener] [' + this.logFile + '] initializing', this.logFile);
		this.monitoring = false;
		this.fileInitiallyPresent = true;
		this.existingLineHandler = existingLineHandler;
		if (existingLineHandler) {
			console.log('[log-listener] [' + this.logFile + '] will read from start of file');
		}
		return this;
	}

	public subscribe(observer: any): LogListenerService {
		this.subject.subscribe(observer);
		return this;
	}

	public start() {
		this.configureLogListeners();
	}

	async configureLogListeners() {
		this.ow.addGameInfoUpdatedListener(async (res: any) => {
			// console.log('onGameInfoUpdated: ' + JSON.stringify(res));
			if (!res?.gameInfo) {
				return;
			}

			this.logsLocation = res.gameInfo.executionPath.split('Hearthstone.exe')[0] + 'Logs\\' + this.logFile;
			if (this.ow.gameLaunched(res)) {
				this.registerLogMonitor();
			} else if (!(await this.ow.inGame())) {
				console.log('[log-listener] [' + this.logFile + '] Left the game, cleaning log file');
				await this.ow.writeFileContents(this.logsLocation, '');
				console.log('[log-listener] [' + this.logFile + '] Cleaned log file');
			}
		});
		const gameInfo = await this.ow.getRunningGameInfo();
		if (this.ow.gameRunning(gameInfo)) {
			console.log('[log-listener] [' + this.logFile + '] Game is running!', gameInfo.executionPath);
			this.logsLocation = gameInfo.executionPath.split('Hearthstone.exe')[0] + 'Logs\\' + this.logFile;
			this.registerLogMonitor();
		} else {
			console.log('[log-listener] [' + this.logFile + '] Game not launched, returning', gameInfo);
		}
	}

	registerLogMonitor() {
		if (this.monitoring) {
			// console.log('[log-listener] [' + this.logFile + '] \tlog hooks already registered, returning');
			return;
		}
		console.log('[log-listener] [' + this.logFile + '] registering hooks?');
		this.monitoring = true;

		console.log('[log-listener] [' + this.logFile + '] getting logs from', this.logsLocation);
		this.listenOnFile(this.logsLocation);
	}

	listenOnFile(logsLocation: string): void {
		this.subject.next(Events.START_LOG_FILE_DETECTION);
		this.listenOnFileCreation(logsLocation);
	}

	async listenOnFileCreation(logsLocation: string) {
		// console.log('[log-listener] [' + this.logFile + '] listening on file creation');
		const fileExists = await this.ow.fileExists(logsLocation);
		if (!fileExists) {
			await this.ow.writeFileContents(logsLocation, '');
		}
		this.listenOnFileUpdate(logsLocation);
		// if (fileExists) {
		// } else {
		// 	this.ow.writeFileContents(logsLocation, '', 'UTF8');
		// 	this.fileInitiallyPresent = false;
		// 	setTimeout(() => {
		// 		this.listenOnFileCreation(logsLocation);
		// 	}, 2000);
		// }
	}

	async listenOnFileUpdate(logsLocation: string) {
		const fileIdentifier = this.logFile;
		console.log('[log-listener] [' + this.logFile + '] preparing to listen on file update', logsLocation);
		let lastLineIsNew = true;

		try {
			const skipToEnd = this.fileInitiallyPresent && !this.existingLineHandler;
			const options = {
				skipToEnd: skipToEnd,
			};
			const handler = (lineInfo: ListenObject) => {
				// console.log('[log-listener] [' + this.logFile + '] received line info', lineInfo);
				if (!lineInfo.success) {
					console.warn(
						'[log-listener] [' + this.logFile + '] received an error on file: ',
						fileIdentifier,
						lineInfo.error,
					);
					return;
				}
				if (lineInfo.state === 'truncated') {
					console.log(
						'[log-listener] [' +
							this.logFile +
							'] truncated log file - HS probably just overwrote the file. Restarting listening',
					);
					this.callback('truncated');
					this.ow.listenOnFile(fileIdentifier, logsLocation, options, handler);
					return;
				}
				const info: {
					readonly index: number;
					readonly isNew: boolean;
					readonly position: number;
					readonly oef: boolean;
				} = lineInfo.info ? JSON.parse(lineInfo.info) : null;
				// console.log('info', info);
				if (info && !info.isNew) {
					lastLineIsNew = false;
					if (this.existingLineHandler) {
						this.existingLineHandler(lineInfo.content);
					}
				} else {
					if (!lastLineIsNew && this.existingLineHandler) {
						lastLineIsNew = true;
						console.log(
							'[log-listener] [' + this.logFile + '] finished catching up with existing data',
							info,
							lineInfo,
							lastLineIsNew,
						);
						this.existingLineHandler('end_of_existing_data');
					}
					this.callback(lineInfo.content);
				}
			};
			// console.log('skipping to end?', skipToEnd);
			this.ow.listenOnFile(fileIdentifier, logsLocation, options, handler);
			console.log('[log-listener] [' + this.logFile + '] listening on file update', logsLocation);

			// const plugin = await this.io.get();
			// plugin.onFileListenerChanged.addListener(handler);

			// console.log('[log-listener] [' + this.logFile + '] skipping to the end?', skipToEnd);
			// plugin.listenOnFile(
			// 	fileIdentifier,
			// 	logsLocation,
			// 	skipToEnd,
			// 	(id: string, status: boolean, initData: any) => {
			// 		if (id === fileIdentifier) {
			// 			if (status) {
			// 				console.log('[' + id + '] now streaming...', this.fileInitiallyPresent, initData);
			// 				this.subject.next(Events.STREAMING_LOG_FILE);
			// 			} else {
			// 				console.error('[log-listener] [' + this.logFile + '] something bad happened with: ', id);
			// 			}
			// 		}
			// 	},
			// );
		} catch (e) {
			console.error('Exception while listener on logs', fileIdentifier, e);
		}
	}
}
