import {Project} from "@/types/project";

export const projects: Project[] = [
    {
        name: "XAP3Y.tech",
        url: "https://xap3y.fun",
        description: "My personal website, built with TS, React, Next.js and Tailwind CSS. Hosted on Vercel.",
        tags: [
            "https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white",
            "https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB",
            "https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white",
            "https://img.shields.io/badge/Vercel-%23000000.svg?logo=vercel&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/MyWebsiteV2",
            icon: "mdi:github",
        }
    },
    {
        name: "Space",
        url: "https://space.xap3y.tech",
        description: "Image/file hosting service, pastebin host, temp email and URL shortener. API made with Java and Spring Boot, and a frontend made with React and Next.js. Inspired by pays.host",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white",
            "https://img.shields.io/badge/Spring%20Boot-6DB33F?logo=springboot&logoColor=fff",
            "https://img.shields.io/badge/MariaDB-003545?logo=mariadb&logoColor=white",
            "https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB",
            "https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white",
            "https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff",
            "https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare",
            "https://img.shields.io/static/v1?label=%20&message=Cloudflare%20R2&color=222&logo=Cloudflare"

        ],
        left_button: {
            label: "View portal",
            href: "https://xap3y.space",
        },
        right_button: {
            label: "API Docs",
            href: "https://docs.xap3y.space",
        },
    },
    {
        name: "XaGUI",
        url: "https://xagui.xap3y.space",
        description: "Lightweight Minecraft menu API. This API allows you to easily set button actions, define onClose and onOpen actions, and perform fast icon updates without reopening the GUI. You can also create multi-page GUI's.",
        tags: [
            "https://img.shields.io/badge/Kotlin-%237F52FF.svg?logo=kotlin&logoColor=white"
        ],
        right_button: {
            label: "Docs + Examples",
            href: "https://xagui.xap3y.space",
        },
        left_button: {
            label: "Maven central",
            href: "https://central.sonatype.com/artifact/eu.xap3y/xagui"
        }
    },
    {
        name: "Connect4",
        url: "https://www.spigotmc.org/resources/connect-four-1v1-gui-minigame-1-8-8-1-21.117864/",
        description: "1vs1 Connect4 GUI minigame for Minecraft servers. It is created using my GUI library XaGUI and it's fully compatible with any Minecraft server bukkit platform and versions up to 1.21.x",
        tags: [
            "https://img.shields.io/badge/Kotlin-%237F52FF.svg?logo=kotlin&logoColor=white"
        ],
        right_button: {
            label: "SpigotMC",
            href: "https://www.spigotmc.org/resources/connect-four-1v1-gui-minigame-1-8-8-1-21.117864/",
        },
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/ConnectFour"
        },
        gallery: [
            "https://api.xap3y.tech/v1/image/get/LFP8R5SX"
        ]
    },
    {
        name: "Vip system",
        url: "https://playcore.cz",
        description: "Introducing the ultimate VIP System for Minecraft server! This versatile plugin allows players to redeem codes purchased from e-shop, granting them VIP status or exclusive kits. Featuring an intuitive GUI management system, MySQL support for seamless data handling, and clickable messages for easy interaction. With 18 commands and 8 GUI menus, it's fully compatible with Minecraft versions up to 1.21.x",
        tags: [
            "https://img.shields.io/badge/Kotlin-%237F52FF.svg?logo=kotlin&logoColor=white",
            "https://img.shields.io/badge/MariaDB-003545?logo=mariadb&logoColor=white"
        ],
        right_button: {
            label: "Store",
            href: "https://playcore.cz",
        }
    },
    {
        name: "Prison Minigame",
        description: "Minecraft prison minigame with custom GUI, enchants, level system, tool upgrading, prestiges, crates, and unique features. This project is developed in Java and Bukkit API, providing a unique and engaging prison experience for players. The minigame is currently not available to play",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://git.xap3y.tech/ravenode/Prison"
        }
    },
    {
        name: "McGeocaching",
        description: "Geocaching remake for Minecraft. Including BlueMap API integration, custom GUI menu and unique features.",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/McGeocaching"
        }
    },
    {
        name: "RandomEvent Plugin", //Players need to do random event every 30 mins, like craft apple, gest most mob kills, get drunk first, etc.
        description: "A plugin for Minecraft servers that adds random events to the game. Players need to do random event every 30 mins, like craft something, get most mob kills, get drunk first (Brewery hook), etc.",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/RandomEvent"
        }
    },
    {
        name: "EggHunt Plugin",
        description: "A plugin for Minecraft servers that adds Easter egg hunt to the game. Players need to find eggs hidden around the map and collect them.",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/McGeocaching"
        }
    },
]
