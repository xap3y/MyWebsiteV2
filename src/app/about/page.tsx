import {Navigation} from "@/components/navigation";

export default function Page() {
    return (
        <>
            <Navigation animations={false}/>

            <main>
                <h1 className={"font-source-code-pro text-5xl text-center"}>About</h1>
            </main>
        </>
    )
}