import {Navigation} from "@/components/navigation";
import React from "react";
import Minigames from "@/app/minigames/client";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: "@XAP3Y - Minigames",
}

export default function MinigamesPage() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <Minigames />
        </>
    )
}