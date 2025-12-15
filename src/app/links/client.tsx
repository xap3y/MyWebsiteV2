'use client';

import { linktree } from "@/util/config";
import { Icon } from "@iconify/react";
import React from "react";

export default function Links() {
    return (
        <main className="animate-fadeBlur">
            <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 pt-10">
                <h1 className="text-4xl sm:text-5xl font-bold text-center">
                    Linktree
                </h1>
                <p className="mt-3 text-center text-white/60">
                    Quick links to my profiles and platforms.
                </p>

                <div className="mt-10 grid grid-cols-1 gap-3">
                    {linktree.map((link) => (
                        <a
                            key={link.name}
                            href={link.link}
                            target="_blank"
                            rel="noreferrer"
                            draggable={false}
                            className="group block"
                        >
                            {/* Keep your border style from box-primary, but make the INSIDE use platform bg */}
                            <div className="box-primary p-0 overflow-hidden">
                                <div
                                    className={[
                                        "rounded-[6px]", // sits inside the box-primary border
                                        link.bg, // platform gradient background
                                        "px-4 sm:px-5 py-4",
                                        "flex items-center gap-4",
                                        "transition-all duration-200",
                                        "group-hover:brightness-110 group-hover:shadow-xl",
                                        "group-active:scale-[0.99]",
                                    ].join(" ")}
                                >
                                    {/* icon chip to keep readability on bright gradients */}
                                    <div className="h-11 w-11 rounded-xl bg-black/25 border border-white/15 flex items-center justify-center shrink-0">
                                        {link.img ? <Icon icon={link.img} width={26} height={26} /> : null}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg sm:text-xl font-bold truncate">
                                            {link.name}
                                        </h2>
                                        {link.desc ? (
                                            <p className="mt-0.5 text-xs sm:text-sm text-white/80 truncate">
                                                {link.desc}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="text-white/80 group-hover:text-white transition-colors select-none">
                                        →
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>

                <div className="mt-16 h-1" />
            </div>
        </main>
    );
}