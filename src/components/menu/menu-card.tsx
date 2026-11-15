import Image from "next/image";
import Link from "next/link";
import type { MenuItem } from "@/types";
import { formatINR } from "@/lib/utils";
import { AddToCartButton } from "./add-to-cart-button";

const positions = ["center","42% center","58% center","70% center"];
export function MenuCard({ item, index }: { item: MenuItem; index: number }) {
  return <article className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-surface transition duration-300 hover:-translate-y-1 hover:border-white/25"><Link href={`/menu/${item.slug}`} className="relative block aspect-[4/3] overflow-hidden"><Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" style={{objectPosition:item.imagePosition||positions[index%positions.length]}}/><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"/>{item.badge&&<span className="absolute left-4 top-4 rounded-full bg-lime px-3 py-1 text-[9px] font-black uppercase tracking-widest text-ink">{item.badge}</span>}<p className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 font-display text-xl backdrop-blur">{formatINR(item.price)}</p></Link><div className="p-5"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-blue">{item.category}</p><div className="mt-2 flex items-start justify-between gap-3"><div><Link href={`/menu/${item.slug}`}><h3 className="font-display text-3xl uppercase transition group-hover:text-lime">{item.name}</h3></Link><p className="mt-2 min-h-10 text-xs leading-5 text-muted">{item.description}</p></div><AddToCartButton item={item} compact/></div><div className="mt-4 flex flex-wrap gap-1.5">{item.dietary.map(tag=><span key={tag} className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white/55">{tag}</span>)}</div></div></article>;
}
