"use client";

import { createContext, useContext } from "react";
import { STAMP_GOAL, STAMP_REWARD } from "@/lib/stamps";

export type TenantView = {
  slug: string;
  name: string;
  clubName: string;
  tagline: string;
  logo: string | null;
  color: string;
  accent: string;
  goal: number;
  reward: string;
  google: boolean;
  apple: boolean;
};

export const TenantViewContext = createContext<TenantView | null>(null);

export function useTenantView() {
  const tenant = useContext(TenantViewContext);
  return {
    tenant,
    logo: tenant ? tenant.logo : process.env.NEXT_PUBLIC_LOGO_PATH || "/logo.png",
    name: tenant?.name || process.env.NEXT_PUBLIC_BRAND_NAME || "Club",
    clubName: tenant?.clubName || process.env.NEXT_PUBLIC_CLUB_NAME || "Club",
    goal: tenant?.goal ?? STAMP_GOAL,
    reward: tenant?.reward || STAMP_REWARD,
    link: (path: string) => tenant ? `/n/${tenant.slug}${path === "/" ? "/registro" : path}` : path,
    api: (path: string) => tenant ? `${path}${path.includes("?") ? "&" : "?"}negocio=${tenant.slug}` : path,
  };
}
