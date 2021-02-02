export class FeatureFlags {
	// Deprecated, features are part of prod now
	public static readonly ENABLE_BG_DESKTOP = true;
	public static readonly ENABLE_DECK_DETAILS = true;
	public static readonly ENABLE_XP_NOTIFICATION = true;
	public static readonly ENABLE_DUELS = true;
	public static readonly ENABLE_NEW_VERSION_NOTIFICATION = true;
	public static readonly SHOW_HS_ACHIEVEMENTS = true;
	public static readonly ENABLE_BG_LAST_ROUND_OPPONENT_ICON = true;

	// When changing these feature flags, don't forget to update the new-version component
	public static readonly ENABLE_CLIPBOARD_SHARE = true;
	public static readonly ENABLE_BG_SIMULATION_PLAY_ON_OVERLAY = true;
	public static readonly ENABLE_BG_OPPONENT_MOUSE_OVER = true;
	public static readonly ENABLE_BG_MINIONS_LIST = true;

	public static readonly ENABLE_BG_SIMULATION_HIDE_ON_RECRUIT = true;
	public static readonly ENABLE_DECKTRACKER_RESET_POSITIONS = false;
	public static readonly ENABLE_REDDIT_SHARE = false;
	public static readonly ENABLE_BG_TRIBE_HIGHLIGHT = false;
	public static readonly SHOW_CONSTRUCTED_SECONDARY_WINDOW = false;
	public static readonly ENABLE_RANKED_ARCHETYPE = false;

	// Deprecated, feature is sidelined for now
	public static readonly ENABLE_CONSTRUCTED_RANKING_GRAPH = false;
}
