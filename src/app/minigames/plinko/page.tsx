import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import PlinkoGame from "@/app/minigames/plinko/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Plinko",
}

export default function DiceMinigamePage() {

    return (
        <>
            <Navigation animations={false} value={"minigames"} back={true} />
            <PlinkoGame />
        </>
    )
}