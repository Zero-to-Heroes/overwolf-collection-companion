import { CardIds, Race } from '@firestone-hs/reference-data';

export const getTribeIcon = (tribe: string | Race): string => {
	let referenceCardId: string;
	switch (tribe) {
		case 'Mech':
		case Race.MECH:
			referenceCardId = 'TB_BaconShop_HP_041b';
			break;
		case 'Beast':
		case Race.BEAST:
			referenceCardId = 'TB_BaconShop_HP_041a';
			break;
		case 'Demon':
		case Race.DEMON:
			referenceCardId = 'TB_BaconShop_HP_041d';
			break;
		case 'Dragon':
		case Race.DRAGON:
			referenceCardId = 'TB_BaconShop_HP_041f';
			break;
		case 'Murloc':
		case Race.MURLOC:
			referenceCardId = 'TB_BaconShop_HP_041c';
			break;
		case 'Pirate':
		case Race.PIRATE:
			referenceCardId = 'TB_BaconShop_HP_041g';
			break;
		default:
			referenceCardId = CardIds.NonCollectible.Neutral.ZappSlywick;
			break;
	}
	return `https://static.zerotoheroes.com/hearthstone/cardart/256x/${referenceCardId}.jpg`;
};

export const getHeroPower = (heroCardId: string): string => {
	switch (heroCardId) {
		case 'TB_BaconShop_HERO_01':
			return 'TB_BaconShop_HP_001';
		case 'TB_BaconShop_HERO_02':
			return 'TB_BaconShop_HP_011';
		case 'TB_BaconShop_HERO_08':
			return 'TB_BaconShop_HP_069';
		case 'TB_BaconShop_HERO_11':
			return 'TB_BaconShop_HP_019';
		case 'TB_BaconShop_HERO_12':
			return 'TB_BaconShop_HP_041';
		case 'TB_BaconShop_HERO_14':
			return 'TB_BaconShop_HP_037a';
		case 'TB_BaconShop_HERO_15':
			return 'TB_BaconShop_HP_010';
		case 'TB_BaconShop_HERO_16':
			return 'TB_BaconShop_HP_044';
		case 'TB_BaconShop_HERO_17':
			return 'TB_BaconShop_HP_015';
		case 'TB_BaconShop_HERO_18':
			return 'TB_BaconShop_HP_072';
		case 'TB_BaconShop_HERO_20':
			return 'TB_BaconShop_HP_018';
		case 'TB_BaconShop_HERO_21':
			return 'TB_BaconShop_HP_020';
		case 'TB_BaconShop_HERO_22':
			return 'TB_BaconShop_HP_024';
		case 'TB_BaconShop_HERO_23':
			return 'TB_BaconShop_HP_022';
		case 'TB_BaconShop_HERO_25':
			return 'TB_BaconShop_HP_049';
		case 'TB_BaconShop_HERO_27':
			return 'TB_BaconShop_HP_014';
		case 'TB_BaconShop_HERO_28':
			return 'TB_BaconShop_HP_028';
		case 'TB_BaconShop_HERO_30':
			return 'TB_BaconShop_HP_043';
		case 'TB_BaconShop_HERO_31':
			return 'TB_BaconShop_HP_009';
		case 'TB_BaconShop_HERO_33':
			return 'TB_BaconShop_HP_033';
		case 'TB_BaconShop_HERO_34':
			return 'TB_BaconShop_HP_035';
		case 'TB_BaconShop_HERO_35':
			return 'TB_BaconShop_HP_039';
		case 'TB_BaconShop_HERO_36':
			return 'TB_BaconShop_HP_042';
		case 'TB_BaconShop_HERO_37':
			return 'TB_BaconShop_HP_036';
		case 'TB_BaconShop_HERO_38':
			return 'TB_BaconShop_HP_038';
		case 'TB_BaconShop_HERO_39':
			return 'TB_BaconShop_HP_040';
		case 'TB_BaconShop_HERO_40':
			return 'TB_BaconShop_HP_057';
		case 'TB_BaconShop_HERO_41':
			return 'TB_BaconShop_HP_046';
		case 'TB_BaconShop_HERO_42':
			return 'TB_BaconShop_HP_047';
		case 'TB_BaconShop_HERO_43':
			return 'TB_BaconShop_HP_048';
		case 'TB_BaconShop_HERO_44':
			return 'TB_BaconShop_HP_050';
		case 'TB_BaconShop_HERO_45':
			return 'TB_BaconShop_HP_053';
		case 'TB_BaconShop_HERO_47':
			return 'TB_BaconShop_HP_051';
		case 'TB_BaconShop_HERO_49':
			return 'TB_BaconShop_HP_054';
		case 'TB_BaconShop_HERO_50':
			return 'TB_BaconShop_HP_077';
		case 'TB_BaconShop_HERO_52':
			return 'TB_BaconShop_HP_061';
		case 'TB_BaconShop_HERO_53':
			return 'TB_BaconShop_HP_062';
		case 'TB_BaconShop_HERO_55':
			return 'TB_BaconShop_HP_056';
		case 'TB_BaconShop_HERO_56':
			return 'TB_BaconShop_HP_064';
		case 'TB_BaconShop_HERO_57':
			return 'TB_BaconShop_HP_063';
		case 'TB_BaconShop_HERO_58':
			return 'TB_BaconShop_HP_052';
		case 'TB_BaconShop_HERO_59t':
			return 'TB_BaconShop_HP_065t2';
		case 'TB_BaconShop_HERO_59':
			return 'TB_BaconShop_HP_065';
		case 'TB_BaconShop_HERO_60':
			return 'TB_BaconShop_HP_066';
		case 'TB_BaconShop_HERO_61':
			return 'TB_BaconShop_HP_067';
		case 'TB_BaconShop_HERO_62':
			return 'TB_BaconShop_HP_068';
		case 'TB_BaconShop_HERO_64':
			return 'TB_BaconShop_HP_074';
		case 'TB_BaconShop_HERO_67':
			return 'TB_BaconShop_HP_075';
		case 'TB_BaconShop_HERO_68':
			return 'TB_BaconShop_HP_076';
	}
};

export const normalizeHeroCardId = (heroCardId: string): string => {
	if (heroCardId === 'TB_BaconShop_HERO_59t') {
		return 'TB_BaconShop_HERO_59';
	}
	return heroCardId;
};
