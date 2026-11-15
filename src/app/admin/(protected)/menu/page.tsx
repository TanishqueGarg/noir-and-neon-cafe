import { db } from "@/lib/db";
import { CreateMenuForm, MenuQuickEditor } from "@/components/admin/admin-client";
import { MenuDetailsEditor } from "@/components/admin/menu-details-editor";
import { formatINR } from "@/lib/utils";
import { requireAdminPage } from "@/lib/admin-page";
export const dynamic="force-dynamic";
export default async function MenuAdmin(){await requireAdminPage();const items=await db.menuItem.findMany({orderBy:[{category:"asc"},{sortOrder:"asc"}]});return <div><p className="eyebrow">Database catalog</p><h1 className="mt-3 font-display text-6xl uppercase">Menu</h1><div className="mt-8"><CreateMenuForm/></div><div className="mt-6 space-y-3">{items.map(item=><article className="panel-elevated grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-start" key={item.id}><div><p className="font-bold">{item.name} <span className="ml-2 text-xs text-muted">{formatINR(item.price)}</span></p><p className="mt-1 text-xs text-muted">{item.category} · {item.slug} · {item.active?"active":"inactive"} · {item.available?"available":"unavailable"}</p><MenuDetailsEditor item={item}/></div><MenuQuickEditor item={item}/></article>)}</div></div>}
