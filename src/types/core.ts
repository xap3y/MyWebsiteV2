export interface Technology {
    label: string;
    icon: string;
    link?: string;
}

export interface Minigame {
    key: string;
    name: string;
    description: string;
    slug: string;
    tags?: string[];
    enabled?: boolean;
}