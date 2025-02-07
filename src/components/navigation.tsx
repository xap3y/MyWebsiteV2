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

export function Navigation({animations, setValue}: Props) {

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
                        className={`hidden lg:flex rounded-xl bg-secondary shadow-xl border-battleship_gray gap-5 items-center px-5 py-3 mr-10 ${animations ? "animate-fadeInRight" : ""}`}>
                        <NavButton onClick={() => handleClick("home")} icon={<FaHome size={30}/>} label="HOME" route="/home"/>
                        <VerLine/>
                        <NavButton onClick={() => handleClick("about")} icon={<IoMdInformationCircleOutline size={30}/>} label="ABOUT" route="/about"/>
                        <VerLine/>
                        <NavButton onClick={() => handleClick("projects")} icon={<HiOutlineCollection size={30}/>} label="PROJECTS" route="/projects"/>
                        <VerLine/>
                        <NavButton onClick={() => handleClick("links")} icon={<RiLinksFill size={30}/>} label="LINKTREE" route="/links"/>
                    </nav>

                    {/* Mobile & Tablet ONLY */}
                    <nav
                        className={`lg:hidden fixed bottom-0 left-0 w-full bg-primary_light p-4 flex overflow-x-auto overflow-y-hidden scrollbar-hide justify-center gap-4 ${animations ? "animate-fadeInBottom" : ""}`}>
                        <NavButtonMobile onClick={() => handleClick("home")} className={animations ? "animate-fadeInBottom" : ""} icon={<FaHome size={30}/>} label="Home"
                                         route="/home"/>
                        <NavButtonMobile onClick={() => handleClick("about")} className={animations ? "animate-fadeInBottom2" : ""}
                                         icon={<IoMdInformationCircleOutline size={30}/>} label="About" route="/about"/>
                        <NavButtonMobile onClick={() => handleClick("projects")} className={animations ? "animate-fadeInBottom3" : ""} icon={<HiOutlineCollection size={30}/>}
                                         label="Projects" route="/projects"/>
                        <NavButtonMobile onClick={() => handleClick("links")} className={animations ? "animate-fadeInBottom4" : ""} icon={<RiLinksFill size={30}/>}
                                         label="LinkTree" route="/links"/>
                    </nav>
                </div>
            </header>
            <div
                className={`w-full border-b-4 border-primary_light ${animations ? "animate-extendBorder" : ""} origin-center absolute left-1/2 transform -translate-x-1/2`}/>
            <div className={"w-full h-5"}></div>
        </>
    )
}