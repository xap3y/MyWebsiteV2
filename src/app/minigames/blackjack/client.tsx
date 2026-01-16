"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank =
    | "A"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K";

type Card = {
    suit: Suit;
    rank: Rank;
    id: string;
};

type GamePhase =
    | "idle"
    | "betting"
    | "dealing"
    | "playerTurn"
    | "dealerTurn"
    | "roundEnd";

type RoundResult = "win" | "lose" | "push";
type InsuranceDecision = "none" | "taken" | "declined";

type BlackjackHistoryEntry = {
    id: string;
    date: string;
    bet: number;
    totalBet: number;
    bets: number[];
    result: RoundResult[];
    dealerHand: Card[];
    playerHands: Card[][];
    doubled: boolean;
    split: boolean;
    net: number;
    insuranceBet: number;
    insuranceDecision: InsuranceDecision;
    insurancePayout: number;
};

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const STORAGE_KEY = "blackjack_bankroll_v1";
const HISTORY_STORAGE_KEY = "blackjack_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY_ENTRIES = 500;

function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function cardValue(rank: Rank): number {
    if (rank === "A") return 11;
    if (["K", "Q", "J"].includes(rank)) return 10;
    return parseInt(rank, 10);
}

function scoreHand(cards: Card[]): { total: number; soft: boolean } {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        total += cardValue(c.rank);
        if (c.rank === "A") aces += 1;
    }
    let soft = false;
    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }
    if (aces > 0 && total <= 21) soft = true;
    return { total, soft };
}

function isNaturalBlackjack(cards: Card[]): boolean {
    if (cards.length !== 2) return false;
    const { total } = scoreHand(cards);
    return total === 21;
}

function formatCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function safeReadHistory(): BlackjackHistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeHistory(entries: BlackjackHistoryEntry[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

function generateId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `bj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const chipValues = [10, 25, 50, 100, 250];

export default function BlackJack() {
    const [playerHands, setPlayerHands] = useState<Card[][]>([[]]);
    const [activeHandIndex, setActiveHandIndex] = useState(0);
    const [bets, setBets] = useState<number[]>([MIN_BET]);
    const [dealer, setDealer] = useState<Card[]>([]);
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [message, setMessage] = useState<string>("Place your bet to begin.");
    const [dealerSoft17, setDealerSoft17] = useState<"stand" | "hit">("stand");
    const [revealDealer, setRevealDealer] = useState<boolean>(false);
    const [roundResult, setRoundResult] = useState<RoundResult[]>([]);
    const [roundDelta, setRoundDelta] = useState<number | null>(null);
    const [hasSplit, setHasSplit] = useState(false);
    const [hasDoubled, setHasDoubled] = useState(false);
    const [insuranceDecision, setInsuranceDecision] = useState<InsuranceDecision>("none");
    const [insuranceBet, setInsuranceBet] = useState(0);

    const deckRef = useRef<Card[]>([]);
    const idCounter = useRef(0);
    const dealTimersRef = useRef<number[]>([]);
    const betTimestampRef = useRef<string | null>(null);
    const deckRefillThreshold = 15;

    const activeHand = playerHands[activeHandIndex] || [];
    const dealerScore = useMemo(() => scoreHand(dealer), [dealer]);

    const totalBet = useMemo(() => {
        if (bets.length === 0) return bet;
        return bets.reduce((a, b) => a + b, 0);
    }, [bets, bet]);

    const createDeck = useCallback((): Card[] => {
        const deck: Card[] = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                idCounter.current += 1;
                deck.push({
                    suit,
                    rank,
                    id: `${rank}-${suit}-${idCounter.current}`,
                });
            }
        }
        return shuffle(deck);
    }, []);

    const initDeck = useCallback(() => {
        deckRef.current = createDeck();
    }, [createDeck]);

    const drawCard = useCallback((): Card | null => {
        if (deckRef.current.length === 0) {
            initDeck();
        }
        return deckRef.current.pop() ?? null;
    }, [initDeck]);

    const clearDealTimers = useCallback(() => {
        dealTimersRef.current.forEach((t) => clearTimeout(t));
        dealTimersRef.current = [];
    }, []);

    useEffect(() => {
        console.log("Bankroll changed:", bankroll);
        console.log("Current phase:", phase);
        if (bankroll <= 0 && (phase === "betting" || phase === "roundEnd")) {
            setBankroll(100);
        }
    }, [bankroll, phase])

    useEffect(() => {
        initDeck();
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setBankroll(Number(saved));
        setPhase("betting");
        return () => clearDealTimers();
    }, [initDeck, clearDealTimers]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(bankroll));
    }, [bankroll]);

    const giveCardToHand = useCallback(
        (handIndex: number) => {
            const card = drawCard();
            if (!card) return;
            setPlayerHands((hands) => {
                const next = hands.map((h) => [...h]);
                next[handIndex].push(card);
                return next;
            });
        },
        [drawCard]
    );

    const giveCardDealer = useCallback(() => {
        const card = drawCard();
        if (!card) return;
        setDealer((d) => [...d, card]);
    }, [drawCard]);

    const resetRound = (msg: string) => {
        setPhase("roundEnd");
        setMessage(msg);
    };

    const finalizeRound = useCallback(
        (dealerFinalTotal: number, dealerBJ: boolean) => {
            const results: RoundResult[] = [];
            let payout = 0;
            let insurancePayout = 0;

            playerHands.forEach((hand, idx) => {
                const p = scoreHand(hand).total;
                const betVal = bets[idx];
                const playerBJ = isNaturalBlackjack(hand);

                if (playerBJ && !dealerBJ) {
                    results[idx] = "win";
                    payout += betVal * 2.5;
                    return;
                }

                if (playerBJ && dealerBJ) {
                    results[idx] = "push";
                    payout += betVal;
                    return;
                }

                if (!playerBJ && dealerBJ) {
                    results[idx] = "lose";
                    return;
                }

                if (p > 21) {
                    results[idx] = "lose";
                } else if (dealerFinalTotal > 21) {
                    results[idx] = "win";
                    payout += betVal * 2;
                } else if (p > dealerFinalTotal) {
                    results[idx] = "win";
                    payout += betVal * 2;
                } else if (p < dealerFinalTotal) {
                    results[idx] = "lose";
                } else {
                    results[idx] = "push";
                    payout += betVal;
                }
            });

            if (insuranceDecision === "taken" && dealerBJ) {
                insurancePayout = insuranceBet * 3;
            }

            const net = payout + insurancePayout - totalBet - insuranceBet;
            setBankroll((b) => b + payout + insurancePayout);
            setRoundResult(results);
            setRoundDelta(net);
            resetRound("Round complete.");

            const entry: BlackjackHistoryEntry = {
                id: generateId(),
                date: betTimestampRef.current ?? new Date().toISOString(),
                bet,
                totalBet,
                bets: [...bets],
                result: results,
                dealerHand: [...dealer],
                playerHands: playerHands.map((h) => [...h]),
                doubled: hasDoubled,
                split: hasSplit,
                net,
                insuranceBet,
                insuranceDecision,
                insurancePayout,
            };

            const history = safeReadHistory();
            const next = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
            writeHistory(next);
        },
        [playerHands, totalBet, dealer, bet, hasDoubled, hasSplit, insuranceBet, insuranceDecision]
    );

    const startRound = () => {
        if (phase === "dealing" || phase === "playerTurn" || phase === "dealerTurn") return;

        if (bet < MIN_BET) {
            setMessage(`Minimum bet is ${formatCurrency(MIN_BET)}.`);
            return;
        }
        if (bet > bankroll) {
            setMessage("You don't have enough balance.");
            return;
        }

        clearDealTimers();
        setRoundResult([]);
        setRoundDelta(null);
        setHasSplit(false);
        setHasDoubled(false);
        setInsuranceDecision("none");
        setInsuranceBet(0);
        setMessage("Dealing...");
        setRevealDealer(false);
        setPlayerHands([[]]);
        setActiveHandIndex(0);
        setDealer([]);
        setPhase("dealing");
        setBets([bet]);
        setBankroll((b) => b - bet);
        betTimestampRef.current = new Date().toISOString();

        if (deckRef.current.length < deckRefillThreshold) {
            initDeck();
        }

        const schedule = (fn: () => void, delay: number) => {
            const id = window.setTimeout(fn, delay);
            dealTimersRef.current.push(id);
        };

        schedule(() => giveCardToHand(0), 150);
        schedule(() => giveCardDealer(), 350);
        schedule(() => giveCardToHand(0), 550);
        schedule(() => giveCardDealer(), 750);
        schedule(() => {
            setPhase("playerTurn");
            setMessage("Your turn. Hit, Stand, Double, or Split.");
        }, 900);
    };

    const hit = () => {
        if (phase !== "playerTurn") return;
        if (isNaturalBlackjack(activeHand)) return;
        if (scoreHand(activeHand).total >= 21) return;
        giveCardToHand(activeHandIndex);
    };

    const stand = () => {
        if (phase !== "playerTurn") return;
        nextHandOrDealer();
    };

    const canDouble =
        phase === "playerTurn" &&
        activeHand.length === 2 &&
        bankroll >= bets[activeHandIndex] &&
        !isNaturalBlackjack(activeHand);

    const doubleDown = () => {
        if (!canDouble) return;
        setHasDoubled(true);
        setBets((b) => {
            const next = [...b];
            next[activeHandIndex] *= 2;
            return next;
        });
        setBankroll((b) => b - bets[activeHandIndex]);
        giveCardToHand(activeHandIndex);
        nextHandOrDealer(true);
    };

    const canSplit =
        phase === "playerTurn" &&
        !hasSplit &&
        activeHand.length === 2 &&
        activeHand[0]?.rank === activeHand[1]?.rank &&
        bankroll >= bets[activeHandIndex];

    const split = () => {
        if (!canSplit) return;
        setHasSplit(true);
        setBankroll((b) => b - bets[activeHandIndex]);

        setPlayerHands((hands) => {
            const current = hands[activeHandIndex];
            const left = [current[0]];
            const right = [current[1]];
            const next = hands.map((h) => [...h]);
            next.splice(activeHandIndex, 1, left, right);
            return next;
        });
        setBets((b) => {
            const next = [...b];
            next.splice(activeHandIndex, 1, b[activeHandIndex], b[activeHandIndex]);
            return next;
        });

        setTimeout(() => {
            giveCardToHand(activeHandIndex);
            giveCardToHand(activeHandIndex + 1);
        }, 50);
    };

    const nextHandOrDealer = (forceEnd?: boolean) => {
        const nextIndex = activeHandIndex + 1;
        if (nextIndex < playerHands.length && !forceEnd) {
            setActiveHandIndex(nextIndex);
            setMessage(`Playing hand ${nextIndex + 1} of ${playerHands.length}`);
        } else {
            setPhase("dealerTurn");
            setMessage("Dealer's turn...");
            setRevealDealer(true);
        }
    };

    useEffect(() => {
        if (phase === "playerTurn" && activeHand.length > 0) {
            const { total } = scoreHand(activeHand);
            if (isNaturalBlackjack(activeHand)) {
                nextHandOrDealer();
                return;
            }
            if (total > 21) {
                setRoundResult((r) => {
                    const next = [...r];
                    next[activeHandIndex] = "lose";
                    return next;
                });
                nextHandOrDealer();
            }
        }
    }, [activeHand, phase, activeHandIndex]);

    useEffect(() => {
        if (phase !== "dealerTurn") return;

        const dealerBJ = isNaturalBlackjack(dealer);
        const allBusted = playerHands.every((h) => scoreHand(h).total > 21);
        const allBlackjack = playerHands.every((h) => isNaturalBlackjack(h));

        if (allBusted || (allBlackjack && !dealerBJ)) {
            setRevealDealer(true);
            const early = setTimeout(() => {
                finalizeRound(dealerScore.total, dealerBJ);
            }, 500);
            return () => clearTimeout(early);
        }

        const timer = setTimeout(() => {
            const { total, soft } = scoreHand(dealer);
            const shouldHit =
                total < 17 || (total === 17 && soft && dealerSoft17 === "hit");

            if (shouldHit) {
                giveCardDealer();
            } else {
                finalizeRound(total, dealerBJ);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [
        dealer,
        phase,
        dealerSoft17,
        playerHands,
        giveCardDealer,
        finalizeRound,
        dealerScore.total,
    ]);

    const setBetSafe = (value: number) => {
        if (phase === "dealing" || phase === "playerTurn" || phase === "dealerTurn") return;
        setBet(Math.max(MIN_BET, Math.min(value, bankroll)));
    };

    const showSplitHands = playerHands.length > 1;
    const hitDisabled =
        phase !== "playerTurn" ||
        isNaturalBlackjack(activeHand) ||
        scoreHand(activeHand).total >= 21;

    const canOfferInsurance =
        phase === "playerTurn" &&
        insuranceDecision === "none" &&
        dealer[0]?.rank === "A" &&
        playerHands.length === 1 &&
        activeHand.length === 2;

    const insuranceCost = bet / 2;
    const canTakeInsurance = canOfferInsurance && bankroll >= insuranceCost;

    const takeInsurance = () => {
        if (!canTakeInsurance) return;
        setInsuranceDecision("taken");
        setInsuranceBet(insuranceCost);
        setBankroll((b) => b - insuranceCost);
        setMessage(`Insurance taken for ${formatCurrency(insuranceCost)}.`);
    };

    const declineInsurance = () => {
        if (!canOfferInsurance) return;
        setInsuranceDecision("declined");
        setInsuranceBet(0);
        setMessage("Insurance declined.");
    };

    const canDeal = phase != "playerTurn" && phase != "dealerTurn" && phase != "dealing"

    return (
        <div className="w-full bg-transparent text-white lg:pb-0 pb-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
                <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Blackjack</h1>
                        <p className="text-xs mt-2 sm:text-sm text-neutral-300">
                            Blackjack pays 3:2. DAS. Insurance pays 2:1 and costs 50% of the original bet.
                        </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1 text-right">
                        <div className="text-[11px] sm:text-xs text-neutral-400">Balance</div>
                        <div className="text-xl sm:text-2xl font-semibold text-emerald-400">
                            {formatCurrency(bankroll)}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <div className="box-primary p-4 sm:p-6 shadow-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">Dealer</div>
                                <div className="text-sm sm:text-lg font-semibold">
                                    Score:{" "}
                                    <span className="text-neutral-200">
                    {revealDealer ? dealerScore.total : "?"}
                  </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-neutral-400">Dealer AI</span>
                                    <button
                                        type="button"
                                        disabled={(phase === "dealerTurn" || phase === "playerTurn" || phase === "dealing")}
                                        onClick={() =>
                                            setDealerSoft17((m) => (m === "stand" ? "hit" : "stand"))
                                        }
                                        className="rounded-full px-2 py-1 text-[11px] box-primary"
                                    >
                                        {dealerSoft17 === "stand" ? "Stand S17" : "Hit S17"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 sm:mt-4 flex min-h-[96px] sm:min-h-[120px] gap-2 sm:gap-3">
                            <Hand cards={dealer} hideSecond={!revealDealer} />
                        </div>

                        <div className="mt-6 sm:mt-8 border-t border-neutral-800 pt-4 sm:pt-6">
                            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">Player</div>

                            <div className={`mt-3 sm:mt-4 grid gap-3 sm:gap-4 ${showSplitHands ? "md:grid-cols-2" : ""}`}>
                                {playerHands.map((hand, idx) => {
                                    const { total, soft } = scoreHand(hand);
                                    const isActive = phase === "playerTurn" && idx === activeHandIndex;
                                    const result = roundResult[idx];
                                    const isBJ = isNaturalBlackjack(hand);

                                    return (
                                        <div
                                            key={`hand-${idx}`}
                                            className={`box-primary p-3 sm:p-4 ${
                                                isActive
                                                    ? "border-emerald-400/60 shadow-emerald-500/20"
                                                    : "border-neutral-800"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">
                                                    Hand {idx + 1}
                                                </div>
                                                <div className="text-[11px] text-neutral-400">
                                                    Bet: {formatCurrency(bets[idx] ?? bet)}
                                                </div>
                                            </div>

                                            <div className="mt-1 text-xs sm:text-sm text-neutral-200">
                                                Score: {total}
                                                {soft && (
                                                    <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                            Soft
                          </span>
                                                )}
                                                {isBJ && (
                                                    <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                            Blackjack
                          </span>
                                                )}
                                            </div>

                                            {result && (
                                                <div
                                                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                                        result === "win"
                                                            ? "bg-emerald-500/20 text-emerald-300"
                                                            : result === "lose"
                                                                ? "bg-rose-500/20 text-rose-300"
                                                                : "bg-amber-500/20 text-amber-300"
                                                    }`}
                                                >
                                                    {result.toUpperCase()}
                                                </div>
                                            )}

                                            <div className="mt-2 sm:mt-3 flex min-h-[120px] sm:min-h-[140px] gap-2 sm:gap-3">
                                                <Hand cards={hand} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {phase === "roundEnd" && roundDelta !== null && (
                                <div className="mt-3 box-primary px-3 py-2 text-xs sm:text-sm">
                                    {roundDelta > 0 && (
                                        <span className="text-emerald-300">
                      You won {formatCurrency(roundDelta)}.
                    </span>
                                    )}
                                    {roundDelta < 0 && (
                                        <span className="text-rose-300">
                      You lost {formatCurrency(Math.abs(roundDelta))}.
                    </span>
                                    )}
                                    {roundDelta === 0 && (
                                        <span className="text-amber-300">Push. Bet returned.</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {canOfferInsurance && (
                            <div className="mt-4 sm:mt-6 box-primary px-3 py-2 text-xs sm:text-sm">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-neutral-300">
                                        Dealer shows Ace. Take insurance for {formatCurrency(insuranceCost)}?
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={takeInsurance}
                                            disabled={!canTakeInsurance}
                                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-700"
                                        >
                                            Take Insurance
                                        </button>
                                        <button
                                            onClick={declineInsurance}
                                            className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-neutral-600"
                                        >
                                            No Insurance
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                            <button
                                onClick={hit}
                                disabled={hitDisabled}
                                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-700"
                            >
                                Hit
                            </button>
                            <button
                                onClick={stand}
                                disabled={phase !== "playerTurn"}
                                className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-neutral-700"
                            >
                                Stand
                            </button>
                            <button
                                onClick={doubleDown}
                                disabled={!canDouble}
                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-700"
                            >
                                Double
                            </button>
                            <button
                                onClick={split}
                                disabled={!canSplit}
                                className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-neutral-700"
                            >
                                Split
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl box-primary p-4 sm:p-6 shadow-xl">
                            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400">Betting</div>
                            <div className="mt-1 text-xl sm:text-2xl font-semibold text-amber-300">
                                {formatCurrency(bet)}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {chipValues.map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setBetSafe(bet + v)}
                                        className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20"
                                    >
                                        +{v}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setBetSafe(bet - 10)}
                                    className="rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700"
                                >
                                    -10
                                </button>
                                <button
                                    onClick={() => setBetSafe(bet - 25)}
                                    className="rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700"
                                >
                                    -25
                                </button>
                                <button
                                    onClick={() => setBetSafe(bet - 50)}
                                    className="rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700"
                                >
                                    -50
                                </button>
                                <button
                                    onClick={() => setBetSafe(bet - 100)}
                                    className="rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700"
                                >
                                    -100
                                </button>
                                <button
                                    onClick={() => setBetSafe(MIN_BET)}
                                    className="rounded-full border border-yellow-700 bg-yellow-800/30 px-2.5 py-1 text-[11px] font-semibold text-yellow-200 hover:bg-yellow-600/40"
                                >
                                    MIN
                                </button>
                                <button
                                    onClick={() => setBetSafe(bankroll)}
                                    className="rounded-full border border-red-700 bg-red-800/30 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-600/40"
                                >
                                    ALL IN
                                </button>
                            </div>

                            <div className="mt-4">
                                <button
                                    onClick={startRound}
                                    className={`w-full rounded-lg ${(canDeal) ? "bg-emerald-500 hover:bg-emerald-400" : "bg-emerald-800 cursor-not-allowed"} px-3 py-2 text-sm font-semibold text-white transition`}
                                >
                                    Deal
                                </button>
                            </div>

                            <div className="mt-3 text-[11px] text-neutral-400">
                                {message}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Hand({ cards, hideSecond = false }: { cards: Card[]; hideSecond?: boolean }) {
    return (
        <div className="flex flex-wrap gap-2 sm:gap-3">
            {cards.map((card, i) => {
                const isHidden = hideSecond && i === 1;
                return (
                    <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 12, rotate: -2 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{ duration: 0.35 }}
                        className={`relative h-[96px] w-[68px] sm:h-[110px] sm:w-[80px] rounded-xl border shadow-md ${
                            isHidden
                                ? "border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900"
                                : "border-neutral-600 bg-white"
                        }`}
                    >
                        {!isHidden && (
                            <div
                                className={`flex h-full flex-col justify-between p-2 ${
                                    isRed(card.suit) ? "text-rose-500" : "text-neutral-900"
                                }`}
                            >
                                <div className="text-[11px] font-bold">{card.rank}</div>
                                <div className="text-xl">{card.suit}</div>
                                <div className="text-right text-[11px] font-bold">{card.rank}</div>
                            </div>
                        )}
                        {isHidden && (
                            <div className="flex h-full items-center justify-center text-[11px] text-neutral-400">
                                Hidden
                            </div>
                        )}
                    </motion.div>
                );
            })}
            <AnimatePresence>
                {cards.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        className="rounded-lg border border-dashed border-neutral-700 px-3 py-6 text-[11px] text-neutral-500"
                    >
                        Waiting for cards...
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function isRed(suit: Suit) {
    return suit === "♥" || suit === "♦";
}