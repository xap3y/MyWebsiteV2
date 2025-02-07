import {ReactNode} from "react";


export interface Project {
    name: string;
    description: string;
    url?: string;
    large_image?: string;
    small_image?: string;
    gallery?: string[];
    tags: string[];
    left_button?: ProjectButton;
    right_button?: ProjectButton;
}

export interface ProjectData {
    projects: Project[];
}

export interface ProjectButton {
    label: string;
    href: string;
    text_color?: string;
    bg_color?: string;
    icon?: String;
}