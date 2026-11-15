"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, MenuItem } from "@/types";

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  hasHydrated: boolean;
  addItem: (item: MenuItem, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  setDrawerOpen: (open: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      hasHydrated: false,
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.item.id === item.id);
          const items = existing
            ? state.items.map((entry) =>
                entry.item.id === item.id
                  ? { ...entry, quantity: Math.min(10, entry.quantity + quantity) }
                  : entry,
              )
            : [...state.items, { item, quantity }];
          return { items, drawerOpen: true };
        }),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((entry) => entry.item.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items
            .map((entry) =>
              entry.item.id === id
                ? { ...entry, quantity: Math.min(10, quantity) }
                : entry,
            )
            .filter((entry) => entry.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "noir-neon-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
