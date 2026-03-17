import {Project} from "@/types/project";

export const projects: Project[] = [
    {
        name: "XAP3Y.eu",
        url: "https://xap3y.eu",
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
            "https://img.shields.io/badge/WebSocket-4353FF?style=flat&logo=socket.io&logoColor=white",
            "https://img.shields.io/badge/Loki-808080?logo=data:image/png;base64,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"

        ],
        left_button: {
            label: "View portal",
            href: "https://xap3y.space",
        },
        /*right_button: {
            label: "API Docs",
            href: "https://docs.xap3y.space",
        },*/
        gallery: [
            "/img/space/02.png",
            "/img/space/03.png",
            "/img/space/04.png",
            "/img/space/05.png",
            "/img/space/06.png",
            "/img/space/07.png",
            "/img/space/08.png",
            "/img/space/09.png",
        ]
    },
    {
        name: "XaGUI",
        url: "https://xagui.xap3y.eu",
        description: "Lightweight Minecraft menu API. This API allows you to easily set button actions, define onClose and onOpen actions, and perform fast icon updates without reopening the GUI. You can also create multi-page GUI's.",
        tags: [
            "https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white",
            "https://img.shields.io/badge/Kotlin-%237F52FF.svg?logo=kotlin&logoColor=white"
        ],
        right_button: {
            label: "Docs + Examples",
            href: "https://xagui.xap3y.eu",
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
    /*{
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
    },*/
    {
        name: "AdventCalendar Plugin",
        description: "A plugin for Minecraft servers that adds Advent calendar to the game. Players can open one door every day and get random rewards. The plugin also includes a custom GUI menu.",
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
    {
        name: "CLI Multitool",
        description: "Command-line multitool, I did it only to understand programming more.",
        tags: [
            "https://custom-icon-badges.demolab.com/badge/C%23-%23239120.svg?logo=cshrp&logoColor=white"
        ],
        gallery: [
            "/img/mt/01.png",
            "/img/mt/02.png",
            "/img/mt/03.png",
            "/img/mt/04.png",
            "/img/mt/05.png",
            "/img/mt/06.png",
        ]
    },
]
