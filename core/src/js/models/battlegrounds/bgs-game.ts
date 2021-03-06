import { BattleResultHistory } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import { Race } from '@firestone-hs/reference-data';
import { normalizeHeroCardId } from '../../services/battlegrounds/bgs-utils';
import { RealTimeStatsState } from '../../services/battlegrounds/store/real-time-stats/real-time-stats';
import { Preferences } from '../preferences';
import { BgsFaceOffWithSimulation } from './bgs-face-off-with-simulation';
import { BgsPlayer } from './bgs-player';

export class BgsGame {
	readonly reviewId: string;
	readonly players: readonly BgsPlayer[] = [];
	readonly currentTurn: number = 1;
	readonly phase: 'recruit' | 'combat';
	readonly faceOffs: readonly BgsFaceOffWithSimulation[] = [];
	// readonly battleResultHistory: readonly BattleResultHistory[] = [];
	readonly replayXml: string;
	readonly mmrAtStart: number;
	readonly pogoHoppersCount: number;
	readonly availableRaces: readonly Race[];
	readonly bannedRaces: readonly Race[];
	readonly hasPrizes: boolean;
	readonly lastOpponentCardId: string;
	readonly liveStats: RealTimeStatsState;
	readonly gameEnded: boolean;

	public static create(base: BgsGame): BgsGame {
		return Object.assign(new BgsGame(), base);
	}

	public update(base: BgsGame) {
		return Object.assign(new BgsGame(), this, base);
	}

	public updatePlayer(newPlayer: BgsPlayer): BgsGame {
		const newPlayers: readonly BgsPlayer[] = this.players.map((player) =>
			normalizeHeroCardId(player.cardId) === normalizeHeroCardId(newPlayer.cardId) ? newPlayer : player,
		);
		return this.update({ players: newPlayers } as BgsGame);
	}

	public getMainPlayer(): BgsPlayer {
		const mainPlayer = this.players.find((player) => player.isMainPlayer);
		if (!mainPlayer) {
			if (this.players.length === 8) {
				console.error(
					'Could not find main player',
					this.players.map((player) => ({
						cardId: player.cardId,
						isMainPlayer: player.isMainPlayer,
						name: player.name,
					})),
				);
			}
		}
		return mainPlayer;
	}

	public updateLastFaceOff(opponentHeroCardId: string, faceOff: BgsFaceOffWithSimulation): BgsGame {
		if (!this.faceOffs?.length) {
			console.error(
				'[face-off] [bgs-next-opponent] trying to update non-existing face-off',
				this.faceOffs,
				faceOff,
			);
			return this;
		}

		const matchingFaceOffs = this.faceOffs
			.filter((f) => f.opponentCardId === opponentHeroCardId)
			.filter((f) => {
				if (faceOff.battleInfo) {
					return !f.battleInfo;
				}
				if (faceOff.battleResult) {
					return !f.battleResult;
				}
				if (faceOff.result) {
					return !f.result;
				}
				return true;
			})
			.reverse();
		if (!matchingFaceOffs.length) {
			console.error(
				'[face-off] [bgs-next-opponent] no matching face-off',
				opponentHeroCardId,
				this.faceOffs.map(
					(f) =>
						`${f.playerCardId} vs ${f.opponentCardId}, t${f.turn}, ${f.result}, ${f.battleInfo != null}, ${
							f.battleResult != null
						}`,
				),
				new Error().stack,
			);
			return this;
		}

		const lastFaceOff = matchingFaceOffs[0];
		console.debug(
			'[bgs-next-opponent] found face-off',
			lastFaceOff,
			matchingFaceOffs,
			this.faceOffs,
			opponentHeroCardId,
			faceOff,
		);
		const updatedFaceOff = lastFaceOff.update(faceOff);
		updatedFaceOff.checkIntegrity(this);
		console.debug('[bgs-next-opponent] updated face-off', updatedFaceOff);
		const updatedFaceOffs: readonly BgsFaceOffWithSimulation[] = this.faceOffs.map((f) =>
			f.id === updatedFaceOff.id ? updatedFaceOff : f,
		);
		console.debug('[bgs-next-opponent] updated face-offs', updatedFaceOffs, this.faceOffs);
		return this.update({
			faceOffs: updatedFaceOffs,
		} as BgsGame);
	}

	// public updateActualBattleResult(result: string): BgsGame {
	// 	const newBattleResultHistory: readonly BattleResultHistory[] = [
	// 		...(this.battleResultHistory || []),
	// 		{
	// 			turn: this.currentTurn,
	// 			simulationResult: this.battleResult,
	// 			actualResult: result,
	// 		},
	// 	] as readonly BattleResultHistory[];
	// 	// console.warn('updatedBattleHistory', result, this.battleResult, this.battleResultHistory);
	// 	return Object.assign(new BgsGame(), this, {
	// 		battleResultHistory: newBattleResultHistory,
	// 	} as BgsGame);
	// }

	// Not all players finish their battles at the same time. So you might still be in battle, but
	// another player might have already gone back to the tavern and levelled up for instance
	public getCurrentTurnAdjustedForAsyncPlay(): number {
		// console.debug('getting current turn adjusted', this.currentTurn, this.phase, this);
		if (this.phase === 'combat') {
			return this.currentTurn + 1;
		}
		return this.currentTurn;
	}

	// For backward-compatibility
	public buildBattleResultHistory(): readonly BattleResultHistory[] {
		return this.faceOffs.map((faceOff) => ({
			turn: faceOff.turn,
			actualResult: faceOff.result,
			simulationResult: faceOff.battleResult,
		}));
	}

	public getRelevantFaceOff(prefs: Preferences): BgsFaceOffWithSimulation {
		if (this.phase === 'combat') {
			if (prefs?.bgsShowSimResultsOnlyOnRecruit) {
				return null;
			}
			return this.lastFaceOff();
		}

		if (prefs?.bgsHideSimResultsOnRecruit) {
			return null;
		} else {
			return this.lastNonEmptyFaceOff();
		}
	}

	// Used for next opponent panel
	public lastFaceOff(): BgsFaceOffWithSimulation {
		if (!this.faceOffs?.length) {
			return null;
		}
		return this.faceOffs[this.faceOffs.length - 1];
	}

	private lastNonEmptyFaceOff(): BgsFaceOffWithSimulation {
		if (!this.faceOffs?.length) {
			return null;
		}
		return this.faceOffs
			.filter((faceOff) => faceOff.battleResult)
			.reverse()
			.shift();
	}
}
