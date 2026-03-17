import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import DiceGame from "@/app/minigames/dice/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Dice",
}

export default function DiceMinigamePage() {

    return (
        <>
            <Navigation animations={false} value={"minigames"} back={true} />
            <DiceGame />
        </>
    )
}