import React, {useState} from "react";
import Home from "@/app/home/client";
import About from "@/app/about/client";
import Projects from "@/app/projects/client";
import Links from "@/app/links/client";
import {UserInfo} from "@/types/lanyard";

interface Props {
    value: string;
    discord?: UserInfo;
}

export default function Index2({ value, discord }: Props) {

    return (
        <>
            {
                (value == "home") &&
                <>
                    <Home loading={true} />
                </>
            }

            {
                (value == "about") &&
                <>
                    <About discord={discord} />
                </>
            }

            {
                (value == "projects") &&
                <>
                    <Projects />
                </>
            }

            {
                (value == "links") &&
                <>
                    <Links />
                </>
            }
        </>
    );
}