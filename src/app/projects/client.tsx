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

                </div>

                <p className={"text-center text-5xl opacity-80 my-32"}>More coming soon!</p>
                <div className={"mt-40 w-0.5 h-0.5"}></div>
            </main>
        </>
    )
}