"use client";

import Link from "next/link";
import { FaPlay } from "react-icons/fa";
import {Minigame} from "@/types/core";
import {minigames} from "@/util/minigames";

export default function Minigames() {
    const games: Minigame[] = minigames as Minigame[];

    const blackjack = games.find((g) => g.slug === "blackjack" || g.key === "blackjack");

    if (!blackjack) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-semibold mb-2">Minigames</h1>
                <p className="text-gray-400">Blackjack is not available.</p>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Minigames</h1>
                    <p className="text-gray-400">Pick a game to play.</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                    href={`/minigames/${blackjack.slug}`}
                    className="group relative rounded-xl box-primary p-4 shadow-sm transition"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-white group-hover:text-sky-200 transition">
                                {blackjack.name}
                            </h2>
                            <p className="text-sm text-gray-300 mt-1">{blackjack.description}</p>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/80 group-hover:bg-white/20 group-hover:text-white transition">
              <FaPlay />
            </span>
                    </div>

                    {blackjack.tags && blackjack.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {blackjack.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-md bg-white/10 text-gray-200 border border-white/10"
                                >
                  {tag}
                </span>
                            ))}
                        </div>
                    ) : null}
                </Link>
            </div>
        </div>
    );
}