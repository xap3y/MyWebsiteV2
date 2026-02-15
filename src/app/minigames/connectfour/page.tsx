import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import ConnectFourGame from "@/app/minigames/connectfour/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Connect Four",
}

export default function DiceMinigamePage() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <ConnectFourGame />
        </>
    )
}