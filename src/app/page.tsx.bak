'use client';
import {Navigation} from "@/components/navigation";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import Home from "@/app/home/client";

export default function page() {

    const router = useRouter();

    const [isLoaded, setIsLoaded] = useState(false);
    const texts = ["Привет",          "Vítejte",         "स्वागत",     "ကြိုဆိုပါတယ်။", "Willkommen",  "いらっしゃいませ",   "환영", "Bienvenida", "Bem-vindo", "خوش آمدید"];
    const fonts = ["playwrite-vn-400", "kode-mono-700", "fleur-de-leah-regular", "caesar-dressing-regular", "sixtyfour-default"];
    const [currentText, setCurrentText] = useState("Welcome");
    const [opacity, setOpacity] = useState(1);
    const [blur, setBlur] = useState(0);
    const [fontIndex, setFontIndex] = useState(0);


    useEffect(() => {

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

            setTimeout(() => {
                router.replace("/home", { scroll: false});
            }, 2000);

            return () => clearInterval(intervalId);
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
                    <Navigation animations={true} />

                    <Home loading={true} />
                </>
            )}
        </>
    );
}
