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
        key: "roulette",
        name: "Roulette",
        description: "Place your bets on the roulette wheel and see where the ball lands.",
        slug: "roulette",
        tags: ["Roulette Game", "Casino"],
        enabled: true
    },
    {
        key: "crash",
        name: "Crash",
        description: "Bet on how high the multiplier will go before it crashes.",
        slug: "crash",
        tags: ["Crash Game", "Casino"],
        enabled: true
    },
    {
        key: "plinko",
        name: "Plinko",
        description: "Drop a ball down the Plinko board and win prizes based on where it lands.",
        slug: "plinko",
        tags: ["Plinko Game", "Casino"],
        enabled: true
    },
    {
        key: "dice",
        name: "Dice",
        description: "Roll the dice and bet on the outcome.",
        slug: "dice",
        tags: ["Dice Game", "Casino"],
        enabled: true
    },
    {
        key: "mines",
        name: "Mines",
        description: "Uncover safe tiles and avoid the hidden mines! The more safe tiles you uncover, the bigger your winnings.",
        slug: "mines",
        tags: ["Mines Game", "Casino"],
        enabled: true
    },
    {
        key: "coinflip",
        name: "Coin Flip",
        description: "Bet on heads or tails and flip the coin to see if you win.",
        slug: "coinflip",
        tags: ["Coin Flip Game", "Casino"],
        enabled: true
    },
    {
        key: "tictactoe",
        name: "Tic Tac Toe",
        description: "Play a game of Tic Tac Toe against the computer.",
        slug: "tictactoe",
        tags: ["Tic Tac Toe Game", "Classic"],
        enabled: true
    },
    {
        key: "connectfour",
        name: "Connect4",
        description: "Play a game of Connect4 against the computer.",
        slug: "connectfour",
        tags: ["Connect4 Game", "Classic"],
        enabled: true
    }
];