'use client';

import {Navigation} from "@/components/navigation";
import {projects} from "@/util/projects";

export default function Projects() {
    return (
        <>
            <main>
                <h1 className={"font-source-code-pro text-5xl text-center"}>Projects</h1>
                <p className={"text-red-700 text-4xl font-bold py-12 text-center"}>In LIMBO!</p>
                {
                    projects.map((project) => (
                        <div key={project.name} className="flex flex-row justify-center items-center w-full">
                            <div className="flex flex-col w-1/2">
                                <h2 className="text-3xl font-bold">{project.name}</h2>
                                <a href={project.url} className="text-lg text-blue-500">{project.url}</a>
                                <p className="text-lg">{project.description}</p>
                            </div>
                            <div className="flex flex-col w-1/2">
                                <img src={project.small_image} alt={project.name} className="rounded-lg"/>
                            </div>
                        </div>
                    ))
                }
            </main>
        </>
    )
}