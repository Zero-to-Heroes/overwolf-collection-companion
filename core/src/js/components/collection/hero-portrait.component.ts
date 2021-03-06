import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ReferenceCard } from '@firestone-hs/reference-data';
import { formatClass } from '../../services/hs-utils';
import { CollectionReferenceCard } from './collection-reference-card';

@Component({
	selector: 'hero-portrait',
	styleUrls: [`../../../css/component/collection/hero-portrait.component.scss`],
	template: `
		<div class="hero-portrait" [ngClass]="{ 'missing': isMissing(_heroPortrait) }" rotateOnMouseOver>
			<div class="perspective-wrapper" rotateOnMouseOver>
				<img [src]="image" />
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroPortraitComponent {
	@Input() set heroPortrait(value: CollectionReferenceCard | ReferenceCard) {
		this._heroPortrait = value;
		this.image = `https://static.zerotoheroes.com/hearthstone/fullcard/en/compressed/${value.id}.png?v=3`;
		this.playerClass = formatClass(value.playerClass);
	}

	_heroPortrait: CollectionReferenceCard | ReferenceCard;
	image: string;
	playerClass: string;

	isMissing(portrait: CollectionReferenceCard | ReferenceCard): boolean {
		// A ReferenceCard
		if ((portrait as CollectionReferenceCard).numberOwned == null) {
			return false;
		}

		return (portrait as CollectionReferenceCard).numberOwned === 0;
	}
}
