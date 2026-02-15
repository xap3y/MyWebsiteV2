"use client";

import Link from "next/link";
import { FaPlay } from "react-icons/fa";
import { Minigame } from "@/types/core";
import { minigames } from "@/util/minigames";
import { motion } from "framer-motion";

const tagColors: Record<string, string> = {
    luck: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    strategy: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cards: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dice: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    classic: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    new: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

function getTagStyle(tag: string) {
    const key = tag.toLowerCase();
    return tagColors[key] ?? "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
}

const containerVariants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.06,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function Minigames() {
    const games: Minigame[] = (minigames as Minigame[]).filter((g) => g.enabled !== false);

    if (!games.length) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-5xl mb-4">🎮</div>
                    <h1 className="text-2xl font-bold text-white mb-2">No Games Available</h1>
                    <p className="text-neutral-500 text-sm">Check back later for new games.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 xl:pb-0 pb-24">
            {/* Header */}
            <div className="mb-8 sm:mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-1 rounded-full bg-emerald-500" />
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                        Minigames
                    </h1>
                </div>
                <p className="text-neutral-500 text-sm sm:text-base ml-[1.1rem] sm:ml-[1.2rem]">
                    Pick a game and test your luck.
                </p>
                <div className="mt-4 flex items-center gap-3 ml-[1.1rem]">
                    <span className="text-xs font-mono text-neutral-600 bg-neutral-800/50 px-3 py-1 rounded-full">
                        {games.length} {games.length === 1 ? "game" : "games"} available
                    </span>
                </div>
            </div>

            {/* Game Grid */}
            <motion.div
                className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {games.map((game) => (
                    // @ts-ignore
                    <motion.div key={game.key ?? game.slug} variants={cardVariants}>
                        <Link
                            href={`/minigames/${game.slug}`}
                            className="group relative flex flex-col rounded-2xl box-primary p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-neutral-700 h-full overflow-hidden"
                        >
                            {/* Hover glow */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-transparent opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none" />

                            <div className="flex items-start justify-between gap-4 relative z-10">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors duration-300 truncate">
                                        {game.name}
                                    </h2>
                                    <p className="text-sm text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                                        {game.description}
                                    </p>
                                </div>

                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-500 group-hover:bg-emerald-500 group-hover:border-emerald-400 group-hover:text-neutral-950 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/20">
                                    <FaPlay className="text-xs ml-0.5" />
                                </span>
                            </div>

                            {game.tags && game.tags.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-1.5 relative z-10">
                                    {game.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md border ${getTagStyle(tag)}`}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Bottom accent line on hover */}
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}