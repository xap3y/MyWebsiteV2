export const socials = [
    {
        name: "GitHub",
        link: "https://github.com/xap3y",
        icon: "mdi:github",
    },
    {
        name: "Discord",
        link: "https://discordapp.com/users/853316867544449025",
        icon: "logos:discord-icon",
    },
    {
        name: "Mail",
        link: "mailto:e@xap3y.fun",
        icon: "material-symbols:mail",
    }
] satisfies {
    name: string;
    link: string;
    icon: string;
}[];

export const linktree = [
    {
        name: "My site",
        link: "https://xap3y.fun",
        desc: "Portfolio & projects",
        img: "mdi:home",
        // subtle “vercel-ish” dark gradient
        bg: "bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950",
    },
    {
        name: "GitHub",
        link: "https://github.com/xap3y",
        desc: "@xap3y",
        img: "mdi:github",
        bg: "bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-900",
    },
    {
        name: "Discord",
        link: "https://discordapp.com/users/853316867544449025",
        desc: "@xap3y",
        img: "ic:baseline-discord",
        bg: "bg-gradient-to-r from-[#5865F2] via-[#4752C4] to-[#3B3F9E]",
    },
    {
        name: "Telegram",
        link: "https://t.me/xap3y",
        desc: "@xap3y",
        img: "ic:baseline-telegram",
        bg: "bg-gradient-to-r from-[#2AABEE] via-[#229ED9] to-[#1C86EE]",
    },
    {
        name: "Ko-fi",
        link: "https://ko-fi.com/xap3y",
        desc: "Support my work",
        img: "simple-icons:kofi",
        bg: "bg-gradient-to-r from-[#FF5E5B] via-[#FF3D71] to-[#FF8A00]",
    },
    {
        name: "SpigotMC",
        link: "https://www.spigotmc.org/members/minecubek.797215/",
        desc: "@Minecubek",
        img: "simple-icons:spigotmc",
        bg: "bg-gradient-to-r from-[#F59E0B] via-[#F97316] to-[#EF4444]",
    },
    {
        name: "Modrinth",
        link: "https://modrinth.com/user/xap3y",
        desc: "@xap3y",
        img: "simple-icons:modrinth",
        bg: "bg-gradient-to-r from-[#1BD96A] via-[#16A34A] to-[#15803D]",
    },
    {
        name: "SkyCrypt",
        link: "https://sky.shiiyu.moe/stats/XAP3Y/Raspberry",
        desc: "Stats",
        img: "mdi:graph-box",
        bg: "bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600",
    },
    /*{
        name: "Space",
        link: "https://xap3y.space/user/xap3y",
        desc: "@xap3y",
        img: "token:space",
        bg: "bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800",
    },*/
] satisfies {
    name: string;
    link: string;
    desc?: string;
    img?: string;
    bg: string; // tailwind background classes (gradient)
}[];