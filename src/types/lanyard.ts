export type DiscordStatus = "online" | "idle" | "dnd" | "offline";

export interface LanyardResponse {
    success: boolean;
    data: LanyardUserData;
}

export interface LanyardUserData {
    discord_status: DiscordStatus;
    listening_to_spotify: boolean;

    active_on_discord_web: boolean;
    active_on_discord_desktop: boolean;
    active_on_discord_mobile: boolean;
    active_on_discord_embedded?: boolean;
    spotify?: LanyardSpotify;
    activities?: LanyardActivity[];
    discord_user?: LanyardDiscordUser;
}

export interface LanyardSpotify {
    album: string;
    album_art_url: string;
    artist: string;
    song: string;
    track_id: string;
    timestamps: LanyardTimestamps;
}

export interface LanyardTimestamps {
    start: number;
    end?: number;
}

export type LanyardActivityType = 0 | 1 | 2 | 3 | 4 | 5;

export interface LanyardActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

export interface LanyardActivity {
    id?: string;
    name: string;
    type: LanyardActivityType;
    details?: string;
    state?: string;
    created_at?: number;
    application_id?: string;
    session_id?: string;
    timestamps?: LanyardTimestamps;
    assets?: LanyardActivityAssets;
}

export interface LanyardDiscordUser {
    id: string;
    username: string;
    discriminator: string;
    global_name?: string;
    display_name?: string;
    avatar?: string;
    public_flags?: number;
}

export interface UserInfo {
    discord_status: DiscordStatus;
    listening_to_spotify: boolean;
    is_mobile: boolean;
    is_desktop: boolean;
    is_web: boolean;
    spotify?: LanyardSpotify;
    activities?: LanyardActivity[];
}