import {UserInfo} from "@/types/lanyard";

const URL_BASE = "https://api.lanyard.rest/v1/users/853316867544449025";

export async function getMyDetails(): Promise<UserInfo> {
    const req = await fetch(URL_BASE);

    let userInfo: UserInfo = {
        discord_status: "offline",
        listening_to_spotify: false,
    }

    if (req.status != 200) return userInfo;

    const json = await req.json();

    userInfo = {
        discord_status: json.data.discord_status,
        listening_to_spotify: json.data.listening_to_spotify,
    }

    if (userInfo.listening_to_spotify) {
        userInfo.spotify = {
            album: json.data.spotify.album,
            album_art_url: json.data.spotify.album_art_url,
            artist: json.data.spotify.artist,
            song: json.data.spotify.song,
            track_id: json.data.spotify.track_id,
            timestamps: json.data.spotify.timestamps
        }
    }
    return userInfo;
}