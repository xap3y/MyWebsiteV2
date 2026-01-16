import {Navigation} from "@/components/navigation";
import React from "react";
import Minigames from "@/app/minigames/client";

export default function MinigamesPage() {

    return (
        <>
            <Navigation animations={false} back={true} />
            <Minigames />
        </>
    )
}