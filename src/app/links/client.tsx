import {linktree} from "@/util/config";


export default function Links() {
    return (
        <>
            <main className={"animate-fadeBlur"}>
                <div className="w-full min-h-screen flex justify-center">
                    <div className="flex flex-col justify-center items-center h-full space-y-6">
                        <div className="flex flex-col items-center">
                            {/*<img alt="my profile icon" width="250" height="250" src="./icons/mypfp.png"
                             className="rounded-full" loading="lazy"/>*/}
                            <div className="flex flex-col items-center mb-4">
                                <h1 className={"font-source-code-pro text-5xl text-center mb-10"}>Linktree</h1>
                                {/*<h1 className="text-2xl text-white font-bold pt-3 font-mono">Linktree</h1>*/}
                                {/*<a href="https://xap3y.tech" className="text-white opacity-[.6]">xap3y.tech</a>*/}
                            </div>
                            <div className="flex flex-col space-y-3 scroll-smooth">
                                {
                                    linktree.map((link) => (
                                        <a key={link.name} href={link.link}>
                                            <div className={`relative flex flex-row justify-between transition-all cursor-pointer 
                                        shadow-md hover:scale-95 w-80 p-2 rounded-xl shadow-neutral-700`}
                                                 style={{backgroundColor: link.backgroundcolor}}>
                                                <div
                                                    className="top-0 left-0 rounded-xl z-0 backdrop-brightness-75 absolute w-full h-full"></div>
                                                <div className="z-10 text-white">
                                                    <p className="text-xl font-bold">{link.name}</p>
                                                    <p className="text-md italic opacity-70">{link?.desc}</p>
                                                </div>
                                                <span className="iconify x-10 w-8 h-8 fill-neutral-50 mr-2"
                                                      data-icon={link.img} style={{"color": link.color}}></span>
                                            </div>
                                        </a>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}