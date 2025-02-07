'use client';

import { Project, ProjectButton } from "@/types/project";
import {useEffect, useRef, useState} from "react";
import { Icon } from '@iconify/react';
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

export default function ProjectCard({ project }: { project: Project }) {
    const { name, tags, description, large_image, gallery, left_button, right_button } = project;

    let hasBothButtons: boolean = false;
    if (left_button && right_button) {
        hasBothButtons = true;
    }

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (!scrollRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

            setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 1);
        };

        const element = scrollRef.current;
        if (element) {
            element.addEventListener("scroll", handleScroll);
            handleScroll();
        }

        return () => element?.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className={"rounded-lg border-4 border-secondary bg-primary_light lg:w-[430px] w-72"}>

            { large_image && <div className={"h-44 rounded-t-lg bg-no-repeat bg-cover bg-center"} style={{ backgroundImage: "url(" + large_image + ")" } }></div> }

            <div className={"flex justify-center items-center py-6 text-2xl font-bold border-t-2 border-secondary"}>
                <p className={"border-b-2"}>{name}</p>
            </div>

            <div className="relative overflow-x-scroll flex justify-center p-4 py-3.5 custom-scroll border-t-2 border-secondary select-none">
                <div className="inline-flex gap-4">
                    {
                        tags.map((tag) => (
                            <img className={"shadow-lg"} key={tag} alt={tag} src={tag} draggable={false} />
                        ))
                    }
                </div>
            </div>

            {/*<div className={"flex flex-row justify-start gap-4 p-4 overflow-scroll items-start min-w-0 select-none"}>
                {
                    tags.map((tag) => (
                        <img className={"shadow-lg"} key={tag} alt={tag} src={tag} draggable={false} />
                    ))
                }
            </div>*/}

            <div ref={scrollRef} className={`text-center border-t-2 border-secondary p-4 max-h-[400px] h-[200px] overflow-y-scroll custom-scroll ${
                isAtBottom ? "no-bottom-fade" : "custom-fade-vertical"
            }`}>
                <p>{description}</p>
            </div>

            <div className={`flex items-center ${hasBothButtons ? "justify-between" : "justify-center"} p-4 border-t-2 border-secondary`}>
                { left_button && <ProjectButtonComponent button={left_button} /> }
                { right_button && <ProjectButtonComponent button={right_button} /> }
            </div>
        </div>
    );
}

function ProjectButtonComponent({ button }: { button: ProjectButton }) {
    return (
        <a href={button.href} className={"lg:text-lg text-xs flex flex-row gap-3 border-2 rounded p-2 hover:bg-primary hover:border-secondary transform transition-all duration-200 font-bold shadow-lg"}>
            {/* @ts-ignore */}
            {button.icon && <div className={"w-[25px]"}><Icon icon={button.icon} width={25} height={25} /></div>}
            <button>
                {button.label}
            </button>
        </a>
    );
}
