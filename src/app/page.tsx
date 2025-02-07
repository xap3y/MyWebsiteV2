'use client';
import {Navigation} from "@/components/navigation";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import Index2 from "@/app/index2/client";
import {getMyDetails} from "@/util/lanyard";
import {UserInfo} from "@/types/lanyard";

export default function page() {

    const router = useRouter();

    const [value, setValue] = useState<string>("home");

    const [isLoaded, setIsLoaded] = useState(false);
    const texts = ["Привет",          "Vítejte",         "स्वागत",     "ကြိုဆိုပါတယ်။", "Willkommen",  "いらっしゃいませ",   "환영", "Bienvenida", "Bem-vindo", "خوش آمدید"];
    const fonts = ["playwrite-vn-400", "kode-mono-700", "fleur-de-leah-regular", "caesar-dressing-regular", "sixtyfour-default"];
    const [currentText, setCurrentText] = useState("Welcome");
    const [opacity, setOpacity] = useState(1);
    const [blur, setBlur] = useState(0);
    const [fontIndex, setFontIndex] = useState(0);

    const [discordDetails, setDiscordDetails] = useState<UserInfo>();

    type Status = "online" | "idle" | "dnd" | "offline";


    useEffect(() => {

        getMyDetails().then((details) => {
            setDiscordDetails(details);
            console.log(details)
        });

        setInterval(() => {
            getMyDetails().then((details) => {
                setDiscordDetails(details);
            });
        }, 10000);

        setTimeout(() => {
            let index = 0;
            let fontInd = 0;

            const intervalId = setInterval(() => {
                setCurrentText(texts[index]);
                setOpacity(prevOpacity => Math.max(prevOpacity - 0.08, 0));
                setBlur(prevBlur => prevBlur + 0.18);
                fontInd = (fontInd + 1) % fonts.length;
                index = (index + 1) % texts.length;
                setFontIndex(fontInd);
            }, 120);

            setTimeout(() => {
                setIsLoaded(true);
                clearInterval(intervalId);
            }, 1200);
        }, 300);
    }, [router]);

    const getFontClass = () => fonts[fontIndex];

    return (
        <>
            {!isLoaded && (
                <>
                    <div className="fixed inset-0 flex items-center justify-center bg-transparent bg-opacity-50 z-50">
                        <p
                            className={`text-center text-white text-5xl font-extrabold transition-opacity ${getFontClass()}`}
                            style={{
                                opacity: opacity,
                                filter: `blur(${blur}px)`
                            }}
                            id={"loadingText"}
                        >
                            {currentText}
                        </p>
                    </div>
                </>
            )}

            {isLoaded && (
                <>
                    <Navigation setValue={setValue} animations={true} />

                    <Index2 value={value} discord={discordDetails} />
                </>
            )}
        </>
    );
}
