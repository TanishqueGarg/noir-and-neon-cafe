import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { orderTransitions } from "@/services/admin-management.server";
import { StatusControl } from "@/components/admin/admin-client";
import { formatINR } from "@/lib/utils";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";
const statuses: OrderStatus[] = ["PENDING","ACCEPTED","READY","COMPLETED","REJECTED","CANCELLED"];
export default async function OrdersAdmin({ searchParams }:{searchParams:Promise<{status?:string}>}) {
  await requireAdminPage();
  const requested=(await searchParams).status;
  const status=statuses.includes(requested as OrderStatus)?requested as OrderStatus:undefined;
  const orders=await db.order.findMany({where:status?{status}:{},orderBy:{createdAt:"desc"},take:100,include:{customer:true,items:true}});
  return <div><p className="eyebrow">Pickup operations</p><h1 className="mt-3 font-display text-6xl uppercase">Orders</h1><div className="mt-5 flex gap-2 overflow-x-auto"><Link className="rounded-full border border-line px-4 py-2 text-xs" href="/admin/orders">All</Link>{statuses.map(value=><Link className={`rounded-full border px-4 py-2 text-xs ${status===value?"border-lime-muted text-lime-muted":"border-line text-muted"}`} href={`/admin/orders?status=${value}`} key={value}>{value}</Link>)}</div><div className="mt-8 space-y-4">{orders.map(order=><article className="panel-elevated p-5" key={order.id}><div className="flex flex-wrap justify-between gap-4"><div><p className="font-bold">{order.reference}</p><p className="mt-1 text-xs text-muted">{order.customer.name} · {order.customer.email} · {order.customer.mobile}</p></div><div className="text-right"><p className="font-display text-3xl">{formatINR(order.total)}</p><p className="text-xs text-lime-muted">{order.status}</p></div></div><ul className="mt-4 border-y border-line py-3 text-xs text-muted">{order.items.map(item=><li key={item.id}>{item.name} × {item.quantity} · {formatINR(item.unitPrice*item.quantity)}</li>)}</ul><div className="mt-4"><StatusControl endpoint={`/api/admin/orders/${order.id}`} current={order.status} options={orderTransitions[order.status]}/></div></article>)}{!orders.length&&<p className="panel p-8 text-muted">No matching orders.</p>}</div></div>;
}
