import { BattleResultHistory } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import { CardIds, Race } from '@firestone-hs/reference-data';
import { SimulationResult } from '@firestone-hs/simulate-bgs-battle/dist/simulation-result';
import { normalizeHeroCardId } from '../../services/battlegrounds/bgs-utils';
import { RealTimeStatsState } from '../../services/battlegrounds/store/real-time-stats/real-time-stats';
import { BattleInfoMessage } from './battle-info-message.type';
import { BgsFaceOffWithSimulation } from './bgs-face-off-with-simulation';
import { BgsPlayer } from './bgs-player';

export class BgsGame {
	readonly reviewId: string;
	readonly players: readonly BgsPlayer[] = [];
	readonly currentTurn: number = 1;
	readonly phase: 'recruit' | 'combat';
	readonly faceOffs: readonly BgsFaceOffWithSimulation[] = [];
	readonly battleInfoStatus: 'empty' | 'waiting-for-result' | 'done';
	readonly battleInfoMesage: BattleInfoMessage;
	// readonly battleResultHistory: readonly BattleResultHistory[] = [];
	readonly replayXml: string;
	readonly mmrAtStart: number;
	readonly pogoHoppersCount: number;
	readonly availableRaces: readonly Race[];
	readonly bannedRaces: readonly Race[];
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
			console.error('[face-off] trying to update non-existing face-off', this.faceOffs, faceOff);
			return this;
		}

		const lastFaceOff = this.faceOffs[this.faceOffs.length - 1];
		if (
			lastFaceOff?.opponentCardId !== opponentHeroCardId &&
			opponentHeroCardId !== CardIds.NonCollectible.Neutral.KelthuzadBattlegrounds
		) {
			console.error(
				'[face-off] trying to update incorrect face-off',
				lastFaceOff?.opponentCardId,
				opponentHeroCardId,
				this.faceOffs,
			);
			return this;
		}

		const updatedFaceOff = Object.assign(new BgsFaceOffWithSimulation(), lastFaceOff, faceOff);
		updatedFaceOff.checkIntegrity(this);
		const updatedFaceOffs: readonly BgsFaceOffWithSimulation[] = [...this.faceOffs.slice(0, -1), updatedFaceOff];
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
	public lastBattleResult(): SimulationResult {
		if (!this.faceOffs?.length) {
			return null;
		}
		return this.faceOffs[this.faceOffs.length - 1].battleResult;
	}
}
