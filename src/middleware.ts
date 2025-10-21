import {NextFetchEvent, NextRequest, NextResponse} from "next/server";

const DISCORD_WEBHOOK_URL = process.env.DSC || "";

const blockedUserAgents = ["whatsapp", "facebook", "python", "curl", "postman", "bot", "crawl"];

export function middleware(req: NextRequest, event: NextFetchEvent) {

    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        "unknown";

    const ua = req.headers.get("user-agent") || "unknown";

    for (const blockedUA of blockedUserAgents) {
        if (ua.toLowerCase().includes(blockedUA)) {
            return new NextResponse("Forbidden", {status: 403});
        }
    }

    const route = req.nextUrl.pathname + req.nextUrl.search;

    if (process.env.NODE_ENV == "development") {
        console.log(`[Middleware] ${ip} -> ${route} | UA: ${ua}`);
        return NextResponse.next();
    }

    if (
        !route.includes("apple-touch-icon") &&
        !ip.startsWith("::ffff") &&
        !ua.includes("vercel-favicon") &&
        !ua.includes("vercel-screenshot")
    ) {
        // Run in the background so we don't block the request
        event.waitUntil(postToDiscordWebhook(ip, route, ua));
    }

    return NextResponse.next();
}

async function postToDiscordWebhook(ip: string, route: string, ua: string) {
    const content = `IP: ${ip}\nRoute: ${route}\nTime: ${new Date().toLocaleString()}\nUA: ${ua}`;
    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        });
    } catch {
        // Silently ignore failures to avoid impacting requests
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|robots.txt|sitemap.xml).*)"],
};