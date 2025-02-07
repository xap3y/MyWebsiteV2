import {projects} from "@/util/projects";
import ProjectCard from "@/components/ProjectCard";
import React from "react";

export default function Projects() {
    return (
        <>
            <main className={"animate-fadeBlur"}>
                <h1 className={"font-bold mt-10 text-5xl text-center"}>My Projects</h1>

                <div className={"flex flex-wrap gap-28 items-center justify-center overflow-auto mt-28 max-w-full lg:mx-24"}>

                    {
                        projects.map((project) => (
                            <ProjectCard key={project.name} project={project} />
                        ))
                    }
                    {/*<div className={"rounded-lg border-4 border-secondary bg-primary_light lg:w-[400px] w-72"}>
                        <div className={"h-36 rounded-t-lg"}>

                        </div>
                        <div className={"flex justify-center items-center bg-primary py-2 text-2xl font-bold border-t-2 border-secondary"}>
                            <p>Project Name</p>
                        </div>
                        <div className={"flex flex-row items-center justify-center gap-4 p-4 overflow-scroll custom-scroll custom-fade select-none"}>
                            <img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white" draggable={false} />
                            <img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white" draggable={false} />
                            <img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white" draggable={false} />
                            <img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white" draggable={false} />
                            <img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white" draggable={false} />
                            <img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white" draggable={false} />
                        </div>

                        <div ref={scrollRef} className={`border-t-2 border-secondary p-4 max-h-[400px] overflow-y-scroll custom-scroll ${
                            isAtBottom ? "no-bottom-fade" : "custom-fade-vertical"
                        }`}>
                            <p>My websitue</p>
                        </div>
                    </div>*/}

                </div>

                <p className={"text-center text-5xl opacity-80 my-32"}>More coming soon!</p>
                <div className={"mt-40 w-0.5 h-0.5"}></div>
            </main>
        </>
    )
}