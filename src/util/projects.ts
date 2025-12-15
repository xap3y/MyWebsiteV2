import {Project} from "@/types/project";

export const projects: Project[] = [
    {
        name: "XAP3Y.fun",
        url: "https://xap3y.fun",
        description: "My personal website, built with TS, React, Next.js and Tailwind CSS.",
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
        url: "https://xap3y.space",
        description: "Image/file hosting service, pastebin host, temp email and URL shortener. API made with Java and Spring Boot, and a frontend made with React and Next.js.",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white",
            "https://img.shields.io/badge/Spring%20Boot-6DB33F?logo=springboot&logoColor=fff",
            "https://img.shields.io/badge/MariaDB-003545?logo=mariadb&logoColor=white",
            "https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB",
            "https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white",
            "https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff",
            "https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare",
            "https://img.shields.io/static/v1?label=%20&message=Cloudflare%20R2&color=222&logo=Cloudflare",
            "https://img.shields.io/badge/WebSocket-4353FF?style=flat&logo=socket.io&logoColor=white"

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
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white",
            "https://img.shields.io/badge/Kotlin-%237F52FF.svg?logo=kotlin&logoColor=white"
        ],
        right_button: {
            label: "Docs + Examples",
            href: "https://xagui.xap3y.space",
        },
        left_button: {
            label: "Maven central",
            href: "https://central.sonatype.com/artifact/eu.xap3y/xagui",
        }
    },
    {
        name: "Connect4",
        url: "https://www.spigotmc.org/resources/connect-four-1v1-gui-minigame-1-8-8-1-21.117864/",
        description: "1vs1 Connect4 GUI minigame for Minecraft servers. It is created using my GUI library XaGUI and it's fully compatible with any Minecraft server bukkit platform and versions up to 1.21.x",
        tags: [
            "https://img.shields.io/badge/Kotlin-%237F52FF.svg?logo=kotlin&logoColor=white",
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white",
            "https://camo.githubusercontent.com/5125932a75d16561bc2c03be7b787f859264f0dccdc1ee9f3c211ff4ecb182a4/68747470733a2f2f696d672e736869656c64732e696f2f7370696765742f646f776e6c6f6164732f313137383634"
        ],
        right_button: {
            label: "SpigotMC",
            href: "https://www.spigotmc.org/resources/connect-four-1v1-gui-minigame-1-8-8-1-21.117864/",
            icon: "simple-icons:spigotmc"
        },
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/ConnectFour",
            icon: "mdi:github"
        },
        gallery: [
            "/img/cf/01.png",
            "/img/cf/02.png",
        ]
    },
    {
        name: "Vip system",
        url: "https://playcore.cz",
        description: "Introducing the ultimate VIP System for Minecraft server! This versatile plugin allows players to redeem codes purchased from e-shop, granting them VIP status or exclusive kits. Featuring an intuitive GUI management system, MySQL support for seamless data handling, and clickable messages for easy interaction. With 18 commands and 8 GUI menus, it's fully compatible with Minecraft versions up to 1.21.x",
        tags: [
            "https://img.shields.io/badge/Kotlin-%237F52FF.svg?logo=kotlin&logoColor=white",
            "https://img.shields.io/badge/MariaDB-003545?logo=mariadb&logoColor=white",
            "https://img.shields.io/badge/WebSocket-4353FF?style=flat&logo=socket.io&logoColor=white"
        ],
        right_button: {
            label: "Store",
            href: "https://playcore.cz",
        },
        gallery: [
            "/img/vip/01.png",
            "/img/vip/02.png",
            "/img/vip/03.png",
            "/img/vip/04.png",
            "/img/vip/05.png",
            "/img/vip/06.png",
            "/img/vip/07.png",
            "/img/vip/08.gif",
        ]
    },
    {
        name: "Mentions Plugin",
        description: "A plugin for Minecraft servers that adds Easter egg hunt to the game. Players need to find eggs hidden around the map and collect them.",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/McGeocaching",
            icon: "mdi:github"
        },
        right_button: {
            label: "Download",
            href: "https://modrinth.com/plugin/chat-mentions",
            icon: "simple-icons:modrinth"
        },
        gallery: [
            "/img/mentions/01.png",
            "/img/mentions/02.png"
        ]
    },
    {
        name: "Prison Minigame",
        description: "Minecraft prison minigame with custom GUI, enchants, level system, tool upgrading, prestiges, crates, and unique features. This project is developed in Java and Bukkit API, providing a unique and engaging prison experience for players. The minigame is currently not available to play",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ]
    },
    {
        name: "McGeocaching & EggHunt",
        description: "Geocaching remake for Minecraft. Including BlueMap API integration, custom GUI menu and unique features. Also including EggHunt which adds Easter/Christmas/Halloween hunt to the game. Players have to find eggs/pumpkins or presents hidden around the map and collect them",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/McGeocaching",
            icon: "mdi:github",
        },
        gallery: [
            "/img/geo/01.gif",
            "/img/geo/02.gif",
            "/img/geo/03.gif",
            "/img/geo/04.gif",
            "/img/geo/05.gif",
        ]
    },
    {
        name: "RandomEvent Plugin", //Players need to do random event every 30 mins, like craft apple, gest most mob kills, get drunk first, etc.
        description: "A plugin for Minecraft servers that adds random events to the game. Players need to do random event every 30 mins, like craft something, get most mob kills, get drunk first (Brewery hook), etc.",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/RandomEvent",
            icon: "mdi:github"
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
            href: "https://github.com/xap3y/McGeocaching",
            icon: "mdi:github"
        }
    },
    {
        name: "AdventCalendar Plugin",
        description: "A plugin for Minecraft servers that adds Easter egg hunt to the game. Players need to find eggs hidden around the map and collect them.",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white"
        ],
        left_button: {
            label: "Source",
            href: "https://github.com/xap3y/McGeocaching",
            icon: "mdi:github"
        },
        gallery: [
            "/img/ac/01.png",
        ]
    },
]
