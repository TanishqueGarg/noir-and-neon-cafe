"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="grid min-h-[80vh] place-items-center px-5 text-center"><div><p className="eyebrow">Something went cold</p><h1 className="mt-3 font-display text-7xl uppercase">Try another pour.</h1><p className="mx-auto mt-4 max-w-md text-muted">The page hit an unexpected error. Your cart is still stored on this device.</p><Button className="mt-8" onClick={reset}>Try again</Button></div></div>;
}
