import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import RouletteGame from "@/app/minigames/roulette/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Roulette",
}

export default function RoulettePage() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <RouletteGame />
        </>
    )
}