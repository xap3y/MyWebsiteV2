import { LanyardResponse, UserInfo } from "@/types/lanyard";

const URL_BASE = "https://api.lanyard.rest/v1/users/853316867544449025";

export interface UserInfo {
    discord_status: import("@/types/lanyard").DiscordStatus;
    listening_to_spotify: boolean;
    is_mobile: boolean;
    is_web: boolean;
    is_desktop: boolean;
    spotify?: import("@/types/lanyard").LanyardSpotify;
    activities?: import("@/types/lanyard").LanyardActivity[];
}

export async function getMyDetails(): Promise<UserInfo> {
    const req = await fetch(URL_BASE, { cache: "no-store" });

    const fallback: UserInfo = {
        discord_status: "offline",
        listening_to_spotify: false,
        is_mobile: false,
        is_desktop: false,
        is_web: false,
        activities: [],
    };

    if (req.status !== 200) return fallback;

    const json = (await req.json()) as LanyardResponse;

    const userInfo: UserInfo = {
        discord_status: json.data.discord_status,
        listening_to_spotify: json.data.listening_to_spotify,
        is_mobile: json.data.active_on_discord_mobile,
        is_web: json.data.active_on_discord_web,
        is_desktop: json.data.active_on_discord_desktop,
        activities: json.data.activities ?? [],
        spotify: json.data.listening_to_spotify ? json.data.spotify : undefined,
    };

    return userInfo;
}

export function resolveLanyardAssetUrl(input?: string): string | null {
    if (!input) return null;

    // already a normal url
    if (input.startsWith("http://") || input.startsWith("https://")) return input;

    // mp:external/.../https/<rest>
    if (input.startsWith("mp:external/")) {
        const marker = "/https/";
        const idx = input.indexOf(marker);
        if (idx !== -1) {
            return "https://" + input.slice(idx + marker.length);
        }
    }

    // unknown format
    return null;
}