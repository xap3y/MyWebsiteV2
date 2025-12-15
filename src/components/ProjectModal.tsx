'use client';

import React, { useEffect, useState } from "react";
import { Project, ProjectButton } from "@/types/project";
import { Icon } from "@iconify/react";

export default function ProjectModal({
                                         open,
                                         project,
                                         onClose,
                                     }: {
    open: boolean;
    project: Project | null;
    onClose: () => void;
}) {
    // Hooks MUST be before any early returns (fixes hook order warning)
    const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    // Close zoomed image when modal closes / project changes
    useEffect(() => {
        if (!open) setActiveImageIndex(null);
    }, [open, project]);

    if (!open || !project) return null;

    const buttons = [project.left_button, project.right_button].filter(
        Boolean
    ) as ProjectButton[];

    return (
        <div className="fixed inset-0 z-50">
            {/* overlay */}
            <button
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 bg-black/60"
            />

            {/* modal */}
            <div className="absolute inset-x-0 top-10 mx-auto w-[92vw] max-w-3xl">
                <div className="box-primary shadow-2xl overflow-hidden">
                    {project.large_image && (
                        <div className="relative h-52 sm:h-64">
                            <div
                                className="absolute inset-0 bg-center bg-cover"
                                style={{ backgroundImage: `url(${project.large_image})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 rounded-lg px-3 py-1.5 text-xs box-primary hover:bg-white/10 transition"
                            >
                                Close
                            </button>
                        </div>
                    )}

                    <div className="p-5 sm:p-6">
                        {!project.large_image && (
                            <div className="flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="rounded-lg px-3 py-1.5 text-xs box-primary hover:bg-white/10 transition"
                                >
                                    Close
                                </button>
                            </div>
                        )}

                        <h2 className="text-2xl sm:text-3xl font-bold">{project.name}</h2>

                        {/* Tags: show ALL in modal, wrap (no scrollbar) */}
                        {project.tags?.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {project.tags.map((tag) => (
                                    <img
                                        className="h-6 w-auto"
                                        key={tag}
                                        alt="tech"
                                        src={tag}
                                        draggable={false}
                                        loading="lazy"
                                    />
                                ))}
                            </div>
                        )}

                        <p className="mt-4 text-sm sm:text-base text-white/75 leading-relaxed whitespace-pre-wrap">
                            {project.description}
                        </p>

                        {/* Gallery (wrap grid, click to zoom inline; no new tab) */}
                        {project.gallery?.length ? (
                            <div className="mt-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-white/90">Gallery</h3>
                                    <span className="text-xs text-white/50">
                    {project.gallery.length} image(s)
                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-3">
                                    {project.gallery.map((src, idx) => (
                                        <button
                                            key={src}
                                            type="button"
                                            onClick={() => setActiveImageIndex(idx)}
                                            className="group relative rounded-xl border border-white/10 overflow-hidden"
                                        >
                                            <img
                                                src={src}
                                                alt={`gallery-${idx}`}
                                                className="h-28 sm:h-32 w-auto max-w-[80vw] sm:max-w-[220px] object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                                draggable={false}
                                                loading="lazy"
                                            />
                                            <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                                        </button>
                                    ))}
                                </div>

                                {activeImageIndex !== null && (
                                    <div className="fixed inset-0 z-[60]">
                                        <button
                                            aria-label="Close image"
                                            onClick={() => setActiveImageIndex(null)}
                                            className="absolute inset-0 bg-black/70"
                                        />

                                        <div className="absolute inset-0 flex items-center justify-center p-4">
                                            <div className="relative max-w-5xl w-full">
                                                <div className="box-primary overflow-hidden">
                                                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-grey3/60">
                            <span className="text-xs text-white/60">
                              {activeImageIndex + 1} / {project.gallery.length}
                            </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    setActiveImageIndex((i) =>
                                                                        i === null ? null : Math.max(0, i - 1)
                                                                    )
                                                                }
                                                                className="rounded-lg px-3 py-1.5 text-xs box-primary disabled:opacity-50"
                                                                disabled={activeImageIndex === 0}
                                                            >
                                                                Prev
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setActiveImageIndex((i) =>
                                                                        i === null
                                                                            ? null
                                                                            : Math.min(project.gallery.length - 1, i + 1)
                                                                    )
                                                                }
                                                                className="rounded-lg px-3 py-1.5 text-xs box-primary disabled:opacity-50"
                                                                disabled={activeImageIndex === project.gallery.length - 1}
                                                            >
                                                                Next
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveImageIndex(null)}
                                                                className="rounded-lg px-3 py-1.5 text-xs box-primary"
                                                            >
                                                                Close
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 sm:p-4 flex items-center justify-center">
                                                        <img
                                                            src={project.gallery[activeImageIndex]}
                                                            alt="zoomed"
                                                            className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
                                                            draggable={false}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Buttons */}
                        {buttons.length > 0 && (
                            <div className="mt-6 flex flex-wrap gap-2">
                                {buttons.map((b) => (
                                    <a
                                        key={b.href + b.label}
                                        href={b.href}
                                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold border border-white/10 box-primary hover:bg-white/10 transition"
                                    >
                                        {/* @ts-ignore */}
                                        {b.icon && <Icon icon={b.icon} width={18} height={18} />}
                                        <span>{b.label}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}