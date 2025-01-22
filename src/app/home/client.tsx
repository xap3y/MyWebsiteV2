'use client';
// @ts-ignore
import curDot from 'cursor-dot'

import {ReactNode, useEffect, useState} from "react";
import {UserInfo} from "@/types/lanyard";
import {getMyDetails} from "@/util/lanyard";
import {socials} from "@/util/config";

interface Props {
    loading: boolean;
}

export default function Home( {loading }: Props) {

    const [discordDetails, setDiscordDetails] = useState<UserInfo | undefined>(undefined);

    type Status = "online" | "idle" | "dnd" | "offline";

    const statusColors: Record<Status, string> = {
        online: "bg-green-500",
        idle: "bg-yellow-500",
        dnd: "bg-red-500",
        offline: "bg-gray-800"
    };

    const [color, setColor] = useState<string>(statusColors.offline);

    const handleStatusChange = (status: string) => {
        if (status in statusColors) {
            setColor(statusColors[status as Status]);
        }
    };

    useEffect(() => {
        curDot({
            zIndex: 2,
            diameter: 5,
            borderWidth: 1,
            borderColor: 'transparent',
            easing: 4,
            background: 'whitesmoke'
        });

        getMyDetails().then((details) => {
            setDiscordDetails(details);
            handleStatusChange(details.discord_status);
            console.log(details)
        });
    }, []);

    return (
        <>
            <main className={`${loading ? "animate-fadeBlur" : ""} flex flex-col justify-center items-center mt-48`}>

                <h1 className={`font-bold font-roboto text-6xl ${loading ? "animate-fadeOpacity" : ""}`}>@XAP3Y</h1>
                <p className={"text-battleship_gray mt-5"}>Developer</p>

                <div className="flex justify-center">
                    <ul className="flex flex-row gap-0.5">
                        {
                            socials.map((social) => (
                                <li key={social.name} className="mr-3 pt-3">
                                    <a href={social.link} title={social.name}>
                                        <img
                                            className="h-[30px] w-[30px] transition-all hover:-translate-y-1 transform-gpu"
                                            src={`/icons/${social.icon}`}
                                            alt={`${social.name} icon`}
                                        />
                                    </a>
                                </li>
                            ))
                        }
                    </ul>
                </div>

                {/*<div className={"flex flex-row gap-4"}>
                        <p>DISCORD: </p>
                        <div className={`w-8 h-8 rounded-full ${color}`}></div>
                    </div>*/}
            </main>
        </>
    )
}