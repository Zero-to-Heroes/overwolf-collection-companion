import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewRef } from '@angular/core';
import { GameTag } from '@firestone-hs/reference-data';
import { Entity } from '@firestone-hs/replay-parser';
import { BgsBattleInfo } from '@firestone-hs/simulate-bgs-battle/dist/bgs-battle-info';
import { BgsBoardInfo } from '@firestone-hs/simulate-bgs-battle/dist/bgs-board-info';
import { BoardEntity } from '@firestone-hs/simulate-bgs-battle/dist/board-entity';
import { SimulationResult } from '@firestone-hs/simulate-bgs-battle/dist/simulation-result';
import { BgsFaceOffWithSimulation } from '../../../models/battlegrounds/bgs-face-off-with-simulation';
import { BgsBattleSimulationService } from '../../../services/battlegrounds/bgs-battle-simulation.service';
import { PreferencesService } from '../../../services/preferences.service';

@Component({
	selector: 'bgs-battle',
	styleUrls: [
		`../../../../css/global/reset-styles.scss`,
		`../../../../css/global/scrollbar.scss`,
		`../../../../css/component/battlegrounds/battles/bgs-battle.component.scss`,
	],
	template: `
		<div class="bgs-battle">
			<div class="battle-boards">
				<bgs-battle-side
					class="opponent"
					[player]="opponent"
					(entitiesUpdated)="onOpponentEntitiesUpdated($event)"
				></bgs-battle-side>
				<div class="versus">Vs.</div>
				<bgs-battle-side
					class="player"
					[player]="player"
					(entitiesUpdated)="onPlayerEntitiesUpdated($event)"
				></bgs-battle-side>
			</div>
			<div class="simulations">
				<div class="result actual">
					<div class="label">Actual</div>
					<bgs-battle-status
						[showReplayLink]="true"
						[battleSimulationStatus]="'done'"
						[nextBattle]="actualBattle"
					></bgs-battle-status>
				</div>
				<div class="result new">
					<div class="label">New</div>
					<bgs-battle-status
						[showReplayLink]="true"
						[battleSimulationStatus]="newBattleStatus"
						[nextBattle]="newBattle"
					></bgs-battle-status>
				</div>
				<div class="controls">
					<div class="button reset">Reset</div>
					<div class="button simulate" (click)="simulateNewBattle()">Simulate</div>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsBattleComponent {
	@Input() set faceOff(value: BgsFaceOffWithSimulation) {
		this._faceOff = value;
		this.updateInfo();
	}

	_faceOff: BgsFaceOffWithSimulation;
	opponent: BgsBoardInfo;
	player: BgsBoardInfo;
	actualBattle: SimulationResult;

	newBattle: SimulationResult;
	newBattleStatus: 'empty' | 'waiting-for-result' | 'done' = 'done';

	private newOpponentEntities: readonly Entity[];
	private newPlayerEntities: readonly Entity[];

	constructor(
		private readonly simulationService: BgsBattleSimulationService,
		private readonly prefs: PreferencesService,
		private readonly cdr: ChangeDetectorRef,
	) {}

	onOpponentEntitiesUpdated(newEntities: readonly Entity[]) {
		this.newOpponentEntities = newEntities;
	}

	onPlayerEntitiesUpdated(newEntities: readonly Entity[]) {
		this.newPlayerEntities = newEntities;
	}

	// For now do it purely in the UI, let's see later on if we want to use the store
	async simulateNewBattle() {
		this.newBattleStatus = 'waiting-for-result';
		this.newBattle = null;
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}

		const battleInfo: BgsBattleInfo = {
			playerBoard: {
				player: this.player.player,
				secrets: this.player.secrets,
				board: this.newPlayerEntities ? this.buildBoard(this.newPlayerEntities) : this.player.board,
			},
			opponentBoard: {
				player: this.player.player,
				secrets: this.player.secrets,
				board: this.newOpponentEntities ? this.buildBoard(this.newOpponentEntities) : this.opponent.board,
			},
			options: {
				...this._faceOff.battleInfo.options,
				numberOfSimulations: 10000,
			},
		};
		const prefs = await this.prefs.getPreferences();
		const newSim = await this.simulationService.simulateLocalBattle(battleInfo, prefs);
		this.newBattle = newSim;
		this.newBattleStatus = 'done';
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	private buildBoard(entities: readonly Entity[]): BoardEntity[] {
		return entities.map((entity) => this.buildEntity(entity));
	}

	private buildEntity(entity: Entity): BoardEntity {
		// TODO: enchantments
		console.error('still needs to build enchantments');
		return {
			entityId: entity.id,
			cardId: entity.cardID,
			attack: entity.getTag(GameTag.ATK),
			health: entity.getTag(GameTag.HEALTH),
			divineShield: entity.getTag(GameTag.DIVINE_SHIELD) === 1,
			friendly: true,
			megaWindfury: entity.getTag(GameTag.MEGA_WINDFURY) === 1,
			windfury: entity.getTag(GameTag.WINDFURY) === 1,
			poisonous: entity.getTag(GameTag.POISONOUS) === 1,
			reborn: entity.getTag(GameTag.REBORN) === 1,
			taunt: entity.getTag(GameTag.TAUNT) === 1,
			enchantments: [],
		};
	}

	private updateInfo() {
		this.opponent = this._faceOff.battleInfo?.opponentBoard;
		this.player = this._faceOff.battleInfo?.playerBoard;
		this.actualBattle = this._faceOff.battleResult;
		this.newBattle = this._faceOff.battleResult;
	}
}
