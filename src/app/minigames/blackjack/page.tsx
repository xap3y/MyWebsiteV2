import {Navigation} from "@/components/navigation";
import React from "react";
import BlackJack from "@/app/minigames/blackjack/client";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: "@XAP3Y - BlackJack",
}

export default function BlackJackGame() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <BlackJack />
        </>
    )
}