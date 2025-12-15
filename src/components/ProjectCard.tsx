'use client';

import { Project, ProjectButton } from "@/types/project";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

export default function ProjectCard({
                                        project,
                                        onOpen,
                                    }: {
    project: Project;
    onOpen: () => void;
}) {
    const { name, tags, description, large_image, left_button, right_button } =
        project;

    const buttons = [left_button, right_button].filter(Boolean) as ProjectButton[];

    // clamp badges to what fits (no scroll). Modal can show all tags.
    const badgeWrapRef = useRef<HTMLDivElement | null>(null);
    const [visibleTagCount, setVisibleTagCount] = useState<number>(tags?.length ?? 0);
    const [measured, setMeasured] = useState(false);

    const measure = () => {
        const wrap = badgeWrapRef.current;
        if (!wrap) return;

        // ~2 rows (adjust if you want more/less)
        const maxHeight = 56;
        const children = Array.from(wrap.children) as HTMLElement[];

        children.forEach((c) => (c.style.display = ""));
        let visible = children.length;

        while (wrap.scrollHeight > maxHeight && visible > 0) {
            visible -= 1;
            children[visible].style.display = "none";
        }

        setVisibleTagCount(visible);
        setMeasured(true);
    };

    useLayoutEffect(() => {
        setMeasured(false);
    }, [tags]);

    useEffect(() => {
        const wrap = badgeWrapRef.current;
        if (!wrap) return;

        // images affect height → remeasure on load
        const imgs = wrap.querySelectorAll("img");
        const onImg = () => measure();
        imgs.forEach((img) => img.addEventListener("load", onImg));

        measure();
        const ro = new ResizeObserver(() => measure());
        ro.observe(wrap);

        return () => {
            imgs.forEach((img) => img.removeEventListener("load", onImg));
            ro.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tags]);

    const hiddenCount = Math.max(0, (tags?.length ?? 0) - visibleTagCount);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => e.key === "Enter" && onOpen()}
            className={[
                "box-primary overflow-hidden cursor-pointer select-none",
                // Bigger cards on desktop
                "w-full max-w-[520px] xl:max-w-[600px]",
                // Make internal layout consistent so buttons sit at bottom
                "flex flex-col",
                "transition-all duration-200",
                "hover:shadow-xl hover:-translate-y-0.5",
                "focus:outline-none focus:ring-2 focus:ring-telegram/60",
            ].join(" ")}
        >
            {large_image && (
                <div className="relative h-48 sm:h-52">
                    <div
                        className="absolute inset-0 bg-center bg-cover"
                        style={{ backgroundImage: `url(${large_image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                </div>
            )}

            {/* Content */}
            <div className="p-6 sm:p-7 flex flex-col flex-1">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                        {name}
                    </h3>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpen();
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg box-primary hover:bg-white/10 transition shrink-0"
                    >
                        Details
                    </button>
                </div>

                {tags?.length > 0 && (
                    <div className="mt-4">
                        <div className="relative">
                            <div className="max-h-[56px] overflow-hidden">
                                <div
                                    ref={badgeWrapRef}
                                    className="flex flex-wrap gap-2 items-center"
                                >
                                    {tags.map((tag) => (
                                        <img
                                            key={tag}
                                            src={tag}
                                            alt="tech"
                                            draggable={false}
                                            loading="lazy"
                                            className="h-6 w-auto shrink-0"
                                        />
                                    ))}
                                </div>
                            </div>

                            {hiddenCount > 0 && (
                                <>
                                    {/* subtle fade at bottom (transparent, no bg block) */}
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent" />
                                </>
                            )}
                        </div>

                        {measured && hiddenCount > 0 && (
                            <div className="mt-2 text-xs text-white/60">
                                +{hiddenCount} more (open for all)
                            </div>
                        )}
                    </div>
                )}

                {/* Description after badges */}
                <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed line-clamp-4 min-h-[4.5rem]">
                    {description}
                </p>

                {/* Push buttons to bottom consistently */}
                <div className="mt-auto pt-5">
                    {buttons.length > 0 && (
                        <div
                            className={`flex flex-wrap gap-2 ${
                                buttons.length === 1 ? "justify-start" : "justify-between"
                            }`}
                        >
                            {left_button && <ProjectButtonComponent button={left_button} />}
                            {right_button && <ProjectButtonComponent button={right_button} />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProjectButtonComponent({ button }: { button: ProjectButton }) {
    return (
        <a
            href={button.href}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold border border-white/10 box-primary hover:bg-white/10 transition"
        >
            {/* @ts-ignore */}
            {button.icon && <Icon icon={button.icon} width={18} height={18} />}
            <span>{button.label}</span>
        </a>
    );
}