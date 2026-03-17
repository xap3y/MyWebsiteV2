import {Navigation} from "@/components/navigation";
import React from "react";
import {Metadata} from "next";
import HiLoGame from "@/app/minigames/hilo/client";

export const metadata: Metadata = {
    title: "@XAP3Y - Hi-Lo",
}

export default function HiLoPage() {

    return (
        <>
            <Navigation animations={false} value={"minigames"} back={true} />
            <HiLoGame />
        </>
    )
}
