import {Navigation} from "@/components/navigation";
import Projects from "@/app/projects/client";

export default function Page() {
    return (
        <>
            <Navigation animations={false} />

            <Projects />
        </>
    )
}