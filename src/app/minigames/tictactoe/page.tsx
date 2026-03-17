import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import TicTacToeGame from "@/app/minigames/tictactoe/client";

export const metadata: Metadata = {
    title: "@XAP3Y - TicTacToe",
}

export default function DiceMinigamePage() {

    return (
        <>
            <Navigation animations={false} value={"minigames"} back={true} />
            <TicTacToeGame />
        </>
    )
}