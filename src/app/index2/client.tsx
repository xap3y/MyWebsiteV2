import React, {useState} from "react";
import Home from "@/app/home/client";
import About from "@/app/about/client";
import Projects from "@/app/projects/client";
import Links from "@/app/links/client";

interface Props {
    value: string;
}

export default function Index2({ value }: Props) {

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
                    <About />
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