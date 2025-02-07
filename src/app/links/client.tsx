import {linktree} from "@/util/config";
import {Icon} from "@iconify/react";


export default function Links() {
    return (
        <>
            <main className={"animate-fadeBlur"}>

                <div className={"flex flex-col items-center gap-8"}>
                    <h1 className={"text-4xl font-bold mt-10 border-b-2 p-2 text-center"}>Linktree</h1>

                    <div className={"flex flex-col items-center gap-2"}>
                        {
                            linktree.map((link) => (
                                <a key={link.name} href={link.link} draggable={false}>
                                    <div className={"rounded p-2 bg-primary shadow-xl transition-all duration-300 hover:bg-primary_light w-56"}>
                                        <div className={"rounded border-2 border-primary_light bg-primary hover:bg-primary_light hover:border-primary p-4"}>
                                                <div className={"flex flex-row items-center gap-2 justify-center select-none"}>
                                                    <Icon icon={link.img} width={32} height={32} />
                                                    <h2 className={"text-2xl font-bold"}>{link.name}</h2>
                                                </div>
                                        </div>
                                    </div>
                                </a>
                            ))
                        }
                    </div>
                </div>
            </main>
        </>
    );
}