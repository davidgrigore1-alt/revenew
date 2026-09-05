"use client";

import { createContext } from "react";

// Select popups must share the modal top layer, rather than portal into inert body content.
export const OverlayPortalContext = createContext<HTMLElement | null>(null);
