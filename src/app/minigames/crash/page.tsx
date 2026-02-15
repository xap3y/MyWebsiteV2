import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import CrashGame from "@/app/minigames/crash/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Crash",
}

export default function CrashMinigamePage() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <CrashGame />
        </>
    )
}