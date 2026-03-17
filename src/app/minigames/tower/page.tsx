import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import TowerGame from "@/app/minigames/tower/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Tower",
}

export default function TowerPage() {

    return (
        <>
            <Navigation animations={false} value={"minigames"} back={true} />
            <TowerGame />
        </>
    )
}