'use client';

import React, { useMemo } from "react";
import { AboutMeLink } from "@/components/aboutmeLink";
import { Icon } from "@iconify/react";
import { technologies } from "@/util/technologies";
import { TechnologyCard } from "@/components/technologyCard";
import { UserInfo } from "@/types/lanyard";
import {resolveLanyardAssetUrl} from "@/util/lanyard";

interface Props {
    discord?: UserInfo;
}

function statusColor(status?: UserInfo["discord_status"]) {
    if (status === "online") return "bg-green-500";
    if (status === "idle") return "bg-yellow-400";
    if (status === "dnd") return "bg-red-500";
    return "bg-gray-600";
}

function statusLabel(status?: UserInfo["discord_status"]) {
    if (status === "online") return "Online";
    if (status === "idle") return "Idle";
    if (status === "dnd") return "Do Not Disturb";
    return "Offline";
}

function platform(discord?: UserInfo) {
    if (!discord) return null;
    if (discord.is_mobile) return { icon: "mdi:cellphone", label: "Mobile" };
    if (discord.is_web) return { icon: "mdi:web", label: "Web" };
    if (discord.is_desktop) return { icon: "mdi:monitor", label: "Desktop" };
    return null;
}

export default function About({ discord }: Props) {
    const color = statusColor(discord?.discord_status);
    const plat = platform(discord);

    const spotify = useMemo(() => {
        if (!discord?.listening_to_spotify || !discord.spotify) return null;

        const song =
            discord.spotify.song.length > 32
                ? discord.spotify.song.slice(0, 32) + "…"
                : discord.spotify.song;

        const artist =
            discord.spotify.artist.length > 32
                ? discord.spotify.artist.slice(0, 32) + "…"
                : discord.spotify.artist;

        return {
            song,
            artist,
            albumArt: discord.spotify.album_art_url,
            trackId: discord.spotify.track_id,
        };
    }, [discord]);

    const otherActivity = useMemo(() => {
        const acts = discord?.activities ?? [];
        const nonSpotify = acts.filter((a) => {
            const name = (a?.name ?? "").toLowerCase();
            return name !== "spotify" && a?.type !== 2;
        });

        return nonSpotify.find((a) => a.type === 0) ?? nonSpotify[0] ?? null;
    }, [discord]);

    const activityImg = resolveLanyardAssetUrl(otherActivity?.assets?.large_image);

    return (
        <main className="animate-fadeBlur">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-12">
                {/* HERO */}
                <div className="text-center">
                    <h1 className="font-bold text-4xl sm:text-5xl">About me</h1>
                    <p className="mt-4 text-white/70 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
                        I am a developer from the Czech Republic with a passion for building
                        clean, fast, and practical apps. Most of my work is open-source on{" "}
                        <AboutMeLink label={"GitHub"} href={"https://github.com/xap3y"} />.
                        You can also check the Projects page on this website.
                    </p>
                </div>

                {/* TECHNOLOGIES */}
                <div className="mt-12">
                    <h2 className="font-bold text-3xl sm:text-4xl text-center">
                        Technologies
                    </h2>

                    <div className="mt-6 box-primary bg-transparent p-5">
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 select-none">
                            {technologies.map((tech) => (
                                (tech.link) ? (
                                    <div key={tech.label}>
                                        <a href={tech.link} target="_blank" rel="noreferrer">
                                            <TechnologyCard label={tech.label} icon={tech.icon}/>
                                        </a>
                                    </div>
                                ) : (
                                    <div key={tech.label}>
                                        <TechnologyCard label={tech.label} icon={tech.icon}/>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>

                {/* CONTACT */}
                <div className="mt-14 pb-16">
                    <h2 className="font-bold text-3xl sm:text-4xl text-center">
                        Contact
                    </h2>

                    <a
                        href={"https://discordapp.com/users/853316867544449025"}
                        target="_blank"
                        rel="noreferrer"
                        className="block mt-6"
                    >
                        <div
                            className={[
                                "box-primary",
                                "p-4 sm:p-5",
                                "transition-all duration-200",
                                "hover:brightness-110 hover:shadow-xl",
                                "active:scale-[0.99]",
                            ].join(" ")}
                        >
                            {/* Header bar (Discord-like) */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2 text-white/80">
                                    <Icon icon={"ic:baseline-discord"} width={18} height={18} />
                                    <span className="text-sm font-semibold">discord</span>
                                </div>
                                <Icon icon={"material-symbols:close"} className="text-white/50" />
                            </div>

                            {/* Body */}
                            <div className="mt-4 flex items-center gap-4">
                                <div className="relative w-12 h-12 shrink-0">
                                    <img
                                        alt={"pfp"}
                                        className={"rounded-full w-12 h-12 object-cover"}
                                        src="https://cdn.discordapp.com/avatars/853316867544449025/d9946346aa0b0daf0a94b9aa12174300.webp?size=128"
                                    />

                                    {/* Presence: dot on desktop, icon on mobile/web */}
                                    <div className="absolute -bottom-1 -right-1">
                                        {discord?.is_desktop ? (
                                            <div className={`w-4 h-4 rounded-full border-2 border-primary2 ${color}`} />
                                        ) : plat ? (
                                            <div
                                                className={[
                                                    "w-5 h-5 rounded-full border-2 border-primary2",
                                                    "flex items-center justify-center",
                                                    color,
                                                ].join(" ")}
                                                title={`${statusLabel(discord?.discord_status)} • ${plat.label}`}
                                            >
                                                <Icon icon={plat.icon} width={12} height={12} className="text-black/80" />
                                            </div>
                                        ) : (
                                            <div className={`w-4 h-4 rounded-full border-2 border-primary2 ${color}`} />
                                        )}
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="font-bold text-lg leading-tight">xap3y</p>
                                        <img
                                            className="w-[21px] h-5"
                                            alt="badge"
                                            src="https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png"
                                        />
                                        <img
                                            className="w-5 h-5"
                                            alt="badge"
                                            src="https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png"
                                        />
                                        <img
                                            className="w-5 h-5"
                                            alt="nitro"
                                            src="https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png"
                                        />
                                        <span className="ml-auto text-xs text-white/60">
                                              {statusLabel(discord?.discord_status)}
                                              {plat ? ` • ${plat.label}` : ""}
                                        </span>
                                    </div>

                                    {otherActivity ? (
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/20 shrink-0 flex items-center justify-center">
                                                <Icon icon="mdi:application" width={22} height={22} className="text-white/70" />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-xs text-white/60">Active</p>
                                                <p className="text-sm text-white/90 truncate">
                                                    {otherActivity.name}
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Spotify */}
                                    {spotify ? (
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/20 shrink-0">
                                                <img
                                                    src={spotify.albumArt}
                                                    alt="album art"
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    draggable={false}
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Icon icon={"mdi:spotify"} width={18} height={18} />
                                                    <span className="text-xs">Listening on Spotify</span>
                                                </div>
                                                <p className="text-sm text-white/90 truncate">{spotify.song}</p>
                                                <p className="text-xs text-white/60 truncate">{spotify.artist}</p>
                                            </div>

                                            {spotify.trackId ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault(); // don't trigger outer <a>
                                                        e.stopPropagation();
                                                        window.open(
                                                            `https://open.spotify.com/track/${spotify?.trackId || 0}`,
                                                            "_blank",
                                                            "noreferrer"
                                                        );
                                                    }}
                                                    className="ml-auto text-xs px-3 py-1.5 rounded-lg box-primary bg-transparent hover:bg-white/5 transition"
                                                >
                                                    Open
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-sm text-white/60">
                                            {discord ? "" : "Discord status unavailable."}
                                        </p>
                                    )}

                                    {
                                        (!spotify && !otherActivity && discord) ? (
                                            <p className="mt-3 text-sm text-white/60">
                                                Not doing much right now.
                                            </p>
                                        ) : null
                                    }
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </main>
    );
}