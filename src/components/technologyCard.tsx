'use client';

import React from "react";
import { Icon } from "@iconify/react";

export function TechnologyCard({ label, icon }: { label: string; icon: string }) {
    return (
        <div
            className={[
                // “pill button” look
                "group inline-flex items-center gap-2",
                "px-3.5 py-2",
                "rounded-2xl",
                // keep your theme but make it feel like a button
                "bg-primary2/60 border border-primary0/70",
                "transition-all duration-200",
                "hover:bg-primary2/80 hover:border-primary0",
                "hover:-translate-y-0.5 hover:shadow-xl",
                "active:translate-y-0 active:shadow-none active:scale-[0.99]",
                "select-none",
            ].join(" ")}
        >
      <span
          className={[
              "h-8 w-8 rounded-xl",
              "bg-black/20 border border-white/10",
              "flex items-center justify-center",
              "transition-colors duration-200",
              "group-hover:bg-black/30",
          ].join(" ")}
      >
          {
              (icon.startsWith("http") || icon.startsWith("/")) ? (
                  <img src={icon} alt={label} className="w-5 h-5" />
              ) : <Icon icon={icon} width={18} height={18} />
          }
      </span>

            <span className="text-sm font-semibold text-white/90 whitespace-nowrap">
        {label}
      </span>
        </div>
    );
}