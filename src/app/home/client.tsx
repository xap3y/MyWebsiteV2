'use client';
// @ts-ignore
import curDot from 'cursor-dot'

import {useEffect, useState} from "react";
import {UserInfo} from "@/types/lanyard";
import {getMyDetails} from "@/util/lanyard";
import {socials} from "@/util/config";
import {Icon} from "@iconify/react";

interface Props {
    loading: boolean;
}

export default function Home( {loading }: Props) {

    const [discordDetails, setDiscordDetails] = useState<UserInfo | undefined>(undefined);

    useEffect(() => {
        getMyDetails().then((details) => {
            setDiscordDetails(details);
        });
    }, []);

    return (
        <>
            <main className={`${loading ? "animate-fadeBlur" : ""} flex flex-col justify-center items-center mt-48`}>

                <h1 className={`font-bold font-roboto xl:text-6xl lg:text-5xl text-4xl ${loading ? "animate-fadeOpacity" : ""}`}>Hello, I'm <span className={"text-yellow-100"}>xap3y</span></h1>
                <p className={"text-battleship_gray mt-5"}>Developer</p>

                <div className="flex justify-center">
                    <ul className="flex flex-row gap-0.5">
                        {
                            socials.map((social) => (
                                <li key={social.name} className="mr-3 pt-3 transition-all hover:-translate-y-1 transform-gpu">
                                    <a href={social.link} title={social.name}>
                                        <Icon icon={social.icon} width={32} height={32} />
                                    </a>
                                </li>
                            ))
                        }
                    </ul>
                </div>
            </main>
        </>
    )
}