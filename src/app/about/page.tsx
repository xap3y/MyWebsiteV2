import {Navigation} from "@/components/navigation";
import About from "@/app/about/client";

export default function Page() {
    return (
        <>
            <Navigation animations={false}/>

            <About/>
        </>
    )
}