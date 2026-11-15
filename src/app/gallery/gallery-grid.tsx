"use client";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { images } from "@/data/images";

const gallery = [
  { src: images.interior, alt: "The café room after dark", className: "md:col-span-2 md:row-span-2" },
  { src: images.espresso, alt: "Espresso being pulled at the bar", className: "md:row-span-2" },
  { src: images.pastry, alt: "House desserts on dark stone", className: "md:col-span-2" },
  { src: images.social, alt: "Guests sharing coffee by the window", className: "" },
  { src: images.drinks, alt: "Espresso tonic and specialty drinks", className: "md:col-span-2" },
  { src: images.hero, alt: "Coffee counter and espresso at night", className: "md:col-span-2" },
];

export function GalleryGrid() {
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const close = () => setActive(null);
  const move = (direction: number) => setActive((current) => current === null ? null : (current + direction + gallery.length) % gallery.length);
  useEffect(() => {
    if (active === null) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; previous?.focus(); };
  }, [active]);
  return <><div className="grid auto-rows-[260px] gap-3 md:grid-cols-3 md:auto-rows-[300px]">{gallery.map((item,index)=><button key={`${item.src}-${index}`} onClick={()=>setActive(index)} className={`group relative overflow-hidden border border-line bg-surface text-left ${item.className}`} aria-label={`Open image: ${item.alt}`}><Image src={item.src} alt={item.alt} fill sizes="(max-width: 768px) 100vw, 66vw" className="object-cover transition duration-700 group-hover:scale-[1.025]"/><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70"/><div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4"><span className="max-w-[80%] text-xs font-bold uppercase tracking-widest text-white/80">{item.alt}</span><Maximize2 className="size-4 text-lime-muted"/></div></button>)}</div><AnimatePresence>{active!==null&&<motion.div role="dialog" aria-modal="true" aria-label="Gallery lightbox" className="fixed inset-0 z-[100] grid place-items-center bg-black/95 p-4 sm:p-10" initial={reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><button className="absolute inset-0" onClick={close} aria-label="Close lightbox background"/><motion.div key={active} className="relative z-10 h-[78vh] w-full max-w-6xl" initial={reduced?false:{opacity:0,scale:.985}} animate={{opacity:1,scale:1}}><Image src={gallery[active].src} alt={gallery[active].alt} fill priority sizes="95vw" className="object-contain"/></motion.div><button ref={closeRef} onClick={close} className="absolute right-5 top-5 z-20 grid size-12 place-items-center rounded-full border border-line bg-ink" aria-label="Close lightbox"><X/></button><button onClick={()=>move(-1)} className="absolute left-4 top-1/2 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink" aria-label="Previous image"><ChevronLeft/></button><button onClick={()=>move(1)} className="absolute right-4 top-1/2 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink" aria-label="Next image"><ChevronRight/></button><p className="absolute bottom-5 z-20 text-xs font-bold uppercase tracking-widest text-white/70">{active+1} / {gallery.length} · {gallery[active].alt}</p></motion.div>}</AnimatePresence></>;
}
