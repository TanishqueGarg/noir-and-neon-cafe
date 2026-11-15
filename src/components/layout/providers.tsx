"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { CartDrawer } from "@/components/cart/cart-drawer";

export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}<CartDrawer /></ToastProvider>;
}
