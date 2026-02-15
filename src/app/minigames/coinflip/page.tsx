import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import CoinFlipGame from "@/app/minigames/coinflip/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Coin Flip",
}

export default function CrashMinigamePage() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <CoinFlipGame />
        </>
    )
}