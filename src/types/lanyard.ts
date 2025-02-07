export interface UserInfo {
    discord_status: string;
    listening_to_spotify: boolean;
    spotify?: Spotify;
}

export interface Spotify {
    album: string;
    album_art_url: string;
    artist: string;
    song: string;
    track_id: string;
    timestamps: Timestamps;
}

interface Timestamps {
    start: number;
    end?: number;
}
