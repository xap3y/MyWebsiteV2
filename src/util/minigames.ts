import {Project} from "@/types/project";
import {Minigame} from "@/types/core";

export const minigames: Minigame[] = [
    {
        key: "blackjack",
        name: "Blackjack",
        description: "Play a classic game of Blackjack against the dealer.",
        slug: "blackjack",
        tags: ["Card Game", "Casino"],
        enabled: true
    },
    {
        key: "crash",
        name: "Crash",
        description: "Play a classic game of Blackjack against the dealer.",
        slug: "crash",
        tags: ["Crash Game", "Casino"],
        enabled: true
    }
];