'use client';

import React, { useMemo, useState } from "react";
import { projects } from "@/util/projects";
import ProjectCard from "@/components/ProjectCard";
import ProjectModal from "@/components/ProjectModal";

export default function Projects() {
    const [openName, setOpenName] = useState<string | null>(null);

    const selectedProject = useMemo(
        () => projects.find((p) => p.name === openName) || null,
        [openName]
    );

    return (
        <main className="animate-fadeBlur">
            <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 pt-10">
                <h1 className="font-bold text-4xl sm:text-5xl text-center">
                    My Projects
                </h1>
                <p className="text-center text-white/60 mt-4">
                    A selection of things I’ve built and maintained.
                </p>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.name}
                            project={project}
                            onOpen={() => setOpenName(project.name)}
                        />
                    ))}
                </div>

                <div className="mt-16 h-1" />
            </div>

            <ProjectModal
                project={selectedProject}
                open={!!selectedProject}
                onClose={() => setOpenName(null)}
            />
        </main>
    );
}