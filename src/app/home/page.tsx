import {Navigation} from "@/components/navigation";
import Home from "@/app/home/client";

export default function Page() {
    return (
        <>
            <Navigation animations={false} />

            <Home loading={false} />

        </>
    )
}