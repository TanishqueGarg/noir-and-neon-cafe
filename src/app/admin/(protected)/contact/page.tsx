import { db } from "@/lib/db";
import { ResolveInquiry } from "./resolve-inquiry";
import { requireAdminPage } from "@/lib/admin-page";
export const dynamic="force-dynamic";
export default async function ContactAdmin(){await requireAdminPage();const items=await db.contactInquiry.findMany({orderBy:{createdAt:"desc"},take:150});return <div><p className="eyebrow">Customer messages</p><h1 className="mt-3 font-display text-6xl uppercase">Contact</h1><div className="mt-8 space-y-4">{items.map(item=><article className="panel-elevated p-5" key={item.id}><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{item.subject}</p><p className="mt-1 text-xs text-muted">{item.name} · {item.email}</p></div><span className="text-xs text-lime-muted">{item.status}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/75">{item.message}</p>{item.status==="OPEN"&&<div className="mt-4"><ResolveInquiry id={item.id}/></div>}</article>)}</div></div>}
