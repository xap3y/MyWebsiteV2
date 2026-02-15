import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import MinesGame from "@/app/minigames/mines/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Mines",
}

export default function DiceMinigamePage() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <MinesGame />
        </>
    )
}