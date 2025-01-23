import {Navigation} from "@/components/navigation";
import React from "react";

interface PageProps {
    params: {
        value: string,
        setValue: React.Dispatch<React.SetStateAction<string>>
    };
}

export default function Page({params}: PageProps) {

    return (
        <>
            <Navigation value={params.value} setValue={params.setValue} animations={false} />
        </>
    )
}