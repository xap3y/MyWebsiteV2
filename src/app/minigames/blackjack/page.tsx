import {Navigation} from "@/components/navigation";
import React from "react";
import Minigames from "@/app/minigames/client";
import BlackJack from "@/app/minigames/blackjack/client";

export default function BlackJackGame() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <BlackJack />
        </>
    )
}