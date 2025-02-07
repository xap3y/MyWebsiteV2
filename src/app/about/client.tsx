import {AboutMeLink} from "@/components/aboutmeLink";
import {Icon} from "@iconify/react";
import {technologies} from "@/util/technologies";
import {TechnologyCard} from "@/components/technologyCard";
import {UserInfo} from "@/types/lanyard";
import React from "react";

interface Props {
    discord?: UserInfo;
}

export default function About({discord}: Props) {


    let color = "bg-gray-800";
    if (discord) {
        if (discord.discord_status == "online") {
            color = "bg-green-600";
        } else if (discord.discord_status == "idle") {
            color = "bg-yellow-500";
        } else if (discord.discord_status == "dnd") {
            color = "bg-red-500";
        }
    }

    let songName;
    let artistName;

    if (discord?.listening_to_spotify) {
        if (discord.spotify?.song) {
            songName = discord.spotify.song.substring(0, 20);
            if (discord.spotify.song.length > 20) {
                songName += "...";
            }
        }

        if (discord.spotify?.artist) {
            artistName = discord.spotify.artist.substring(0, 20);
            if (discord.spotify.artist.length > 20) {
                artistName += "...";
            }
        }
    }

    return (
        <>

            <main className={"animate-fadeBlur"}>
                <h1 className={"font-bold text-5xl text-center mt-28"}>About me</h1>

                <div className={"mt-20 xl:mx-96 lg:mx-64 md:mx-40 mx-6 text-2xl"}>
                    <p>
                        I am developer from Czech Republic with a passion for creating innovative solutions, and I am currently engaged in various projects. Most of my work is open-source and on <AboutMeLink label={"GitHub"} href={"https://github.com/xap3y"} />. You can also check Projects page on this website.
                    </p>
                </div>

                <p className={"font-bold text-5xl text-center mt-28"}>Technologies</p>

                <div className={"border-2 border-secondary_light rounded p-4 mt-10 lg:mx-56 mx-20 justify-center flex flex-wrap gap-4 select-none"}>

                    {
                        technologies.map((tech) => (
                            <div key={tech.label}>
                                <TechnologyCard label={tech.label} icon={tech.icon} />
                            </div>
                        ))
                    }
                </div>

                <p className={"font-bold text-5xl text-center mt-28"}>Contact</p>

                <a href={"https://discordapp.com/users/853316867544449025"}>
                    <div className={"flex flex-col justify-center items-center gap-4 mt-10 mb-10 rounded select-none"}>
                        {/* DISCORD CARD */}

                        <div className={"flex flex-col bg-secondary_light rounded"}>
                            <div className={"flex flex-row items-center justify-between gap-4 bg-secondary px-2 opacity-70"}>

                                <div className={"flex items-center gap-2"}>
                                    <Icon icon={"ic:baseline-discord"} />
                                    <p className={"mr-12"}>discord</p>
                                </div>


                                <Icon icon={"material-symbols:close"} />
                            </div>

                            <div className={"flex flew-row items-center gap-4 p-1"}>
                                <div className={"w-10 h-10"}>
                                    <img alt={"pfp"}
                                         className={"rounded-full"}
                                         src="https://cdn.discordapp.com/avatars/853316867544449025/d9946346aa0b0daf0a94b9aa12174300.webp?size=100"
                                    />
                                </div>

                                <div className={"flex flex-col gap-1"}>
                                    <div className={"flex flex-row items-center"}>


                                        {
                                            discord?.discord_status == "idle" ? <div className={"w-3 h-3 mr-3 pb-2"}><Icon icon={"si:moon-fill"} color={"yellow"} /> </div>: <div className={`rounded-full ml-1 ${color} w-3 h-3 mr-2`}></div>
                                        }


                                        <p className={"mr-1"}>xap3y</p>
                                        <img className={"w-5"} src="https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png" />
                                        <img className={"w-5"} src="https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png" />
                                    </div>
                                    <div className={"flex flex-row items-center gap-2"}>
                                        {
                                            discord?.listening_to_spotify ? <div className={"flex flex-row items-center gap-2"}>
                                                <Icon icon={"mdi:music"} width={20} height={20} />

                                                <div>
                                                    <p className={"opacity-80 text-xs"}>{songName}</p>
                                                    <p className={"opacity-80 text-xs"}>{artistName}</p>
                                                </div>
                                            </div> : <div></div>
                                        }

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>

                <div className={"mt-40 w-0.5 h-0.5"}></div>
            </main>

        </>
    );
}