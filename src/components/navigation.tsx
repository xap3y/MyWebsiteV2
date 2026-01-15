'use client';

import { FaHome } from "react-icons/fa";
import { HiOutlineCollection } from "react-icons/hi";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { RiLinksFill } from "react-icons/ri";
import {NavButton, NavButtonMobile} from "@/components/navButton";
import {VerLine} from "@/components/verLine";
import React, {useEffect, useState} from "react";

interface Props {
    animations: boolean;
    value?: string;
    setValue?: React.Dispatch<React.SetStateAction<string>>;
}

export function Navigation({animations, value, setValue}: Props) {

    const [header, setHeader] = useState("XAP3Y");
    const [loading, setLoading] = useState(false);
    const headers = ["XAP3Y", "ксапей"];

    const decodeEffect = (target: string, cycles = 8, finalCycles = 5, interval = 150) => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const targetLength = target.length;

        let currentGuess = Array(targetLength).fill("");
        let step = 0;

        const intervalId = setInterval(() => {
            for (let i = 0; i < targetLength; i++) {
                if (step < cycles - finalCycles || currentGuess[i] !== target[i]) {
                    currentGuess[i] = characters.charAt(
                        Math.floor(Math.random() * characters.length)
                    );
                }
            }

            if (step >= cycles - finalCycles) {
                currentGuess[step - (cycles - finalCycles)] = target[step - (cycles - finalCycles)];
            }
            setHeader(currentGuess.join(""));

            step++;
            if (step >= cycles) {
                clearInterval(intervalId);
                setHeader(target);
            }
        }, interval);
    };

    const terminalEffect = (minInterval = 100, maxInterval = 300) => {

        let origin, target: string;
        if (header === headers[0]) {
            origin = headers[0];
            target = headers[1];
        } else {
            origin = headers[1];
            target = headers[0];
        }

        const steps: string[] = [];

        for (let i = origin.length; i >= 0; i--) {
            steps.push(origin.slice(0, i) + "_");
        }
        for (let i = 0; i <= target.length; i++) {
            steps.push(target.slice(0, i) + "_");
        }

        steps.push(target);

        const typeEffect = (index = 0) => {
            if (index < steps.length) {
                setHeader(steps[index]);
                const interval = Math.floor(
                    Math.random() * (maxInterval - minInterval + 1) + minInterval
                );
                setTimeout(() => typeEffect(index + 1), interval);
            }
        };

        typeEffect();
    };

    useEffect(() => {
        let interval;

        if (animations && !loading) {
            setLoading(true)
            decodeEffect("XAP3Y");
        }

        interval = setInterval(() => {
            terminalEffect();
        }, 8000);

        return () => {
            clearInterval(interval);
        };
    }, [header]);

    function handleClick(value: string) {
        if (setValue) {
            setValue(value);
        }
    }

    return (
        <>
            <header
                className={"w-full flex lg:flex-row p-4 lg:justify-between justify-center lg:pl-[10%] pl-[5%] relative overflow-hidden"}>
                <div className={`${animations ? "animate-fadeBlur" : ""} flex items-center`}>
                    <h1 className={`text-4xl font-source-code-pro ${animations ? "animate-fadeInTop lg:animate-fadeInLeft" : ""}`}>{"I'm " + header}</h1>
                </div>
                {/*<div className={"border-2 rounded-lg border-battleship_gray flex gap-5 items-center px-5 animate-fadeInRight"}>
                    <NavButton label={"HOME"} route={"/home"} />

                    <VerLine />

                    <NavButton label={"ABOUT"} route={"/about"} />

                    <VerLine />

                    <NavButton label={"PROJECTS"} route={"/projects"} />

                    <VerLine />

                    <NavButton label={"LINKTREE"} route={"/links"} />
                </div>*/}

                <div>

                    {/* Desktop ONLY */}
                    <nav
                        className={`hidden lg:flex box-primary shadow-xl gap-5 items-center px-5 py-3 mr-10 ${animations ? "animate-fadeInRight" : ""}`}>
                        <NavButton onClick={() => handleClick("home")} icon={<FaHome size={30}/>} label="HOME" route="/home"/>
                        <VerLine/>
                        <NavButton onClick={() => handleClick("about")} icon={<IoMdInformationCircleOutline size={30}/>} label="ABOUT" route="/about"/>
                        <VerLine/>
                        <NavButton onClick={() => handleClick("projects")} icon={<HiOutlineCollection size={30}/>} label="PROJECTS" route="/projects"/>
                        <VerLine/>
                        <NavButton onClick={() => handleClick("links")} icon={<RiLinksFill size={30}/>} label="LINKTREE" route="/links"/>
                    </nav>

                    {/* Mobile & Tablet ONLY */}
                    <nav className="z-50 lg:hidden fixed bottom-0 left-0 w-full border-t border-neutral-800 bg-black/80 backdrop-blur-md px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
                        <div className="flex items-center justify-between max-w-md mx-auto">
                            <VercelTab
                                active={value === "home"}
                                onClick={() => handleClick("home")}
                                icon={<FaHome size={20} />}
                                label="Home"
                            />
                            <VercelTab
                                active={value === "about"}
                                onClick={() => handleClick("about")}
                                icon={<IoMdInformationCircleOutline size={20} />}
                                label="About"
                            />
                            <VercelTab
                                active={value === "projects"}
                                onClick={() => handleClick("projects")}
                                icon={<HiOutlineCollection size={20} />}
                                label="Projects"
                            />
                            <VercelTab
                                active={value === "links"}
                                onClick={() => handleClick("links")}
                                icon={<RiLinksFill size={20} />}
                                label="Links"
                            />
                        </div>
                    </nav>
                </div>
            </header>
            <div
                className={`w-full border-b-4 border-primary_light ${animations ? "animate-extendBorder" : ""} origin-center absolute left-1/2 transform -translate-x-1/2`}/>
            <div className={"w-full h-5"}></div>
        </>
    )
}

function VercelTab({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-1 flex-col items-center gap-1 py-2 px-1 transition-all duration-200 ${
                active ? "text-white" : "text-neutral-500 hover:text-neutral-300"
            }`}
        >
            <div className="relative">
                {icon}
                {/* Optional: Subtle glow for active item */}
                {active && (
                    <div className="absolute inset-0 blur-md bg-white/20 -z-10" />
                )}
            </div>
            <span className="text-[11px] font-medium tracking-tight">
                {label}
            </span>
            {/* The Vercel "Active" indicator - a simple, sharp top border or bottom line */}
            <div className={`absolute top-0 w-1/4 h-[2px] bg-white transition-transform duration-300 ${
                active ? "scale-x-100" : "scale-x-0"
            }`} />
        </button>
    );
}