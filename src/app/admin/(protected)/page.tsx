import { db } from "@/lib/db";
import { ProcessEmailButton } from "@/components/admin/admin-client";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";
export default async function AdminOverview() {
  await requireAdminPage();
  const [orders,reservations,inquiries,subscribers,menu,email] = await Promise.all([db.order.count({where:{status:"PENDING"}}),db.reservation.count({where:{status:"PENDING"}}),db.contactInquiry.count({where:{status:"OPEN"}}),db.newsletterSubscriber.count({where:{active:true}}),db.menuItem.count({where:{active:true}}),db.emailDelivery.count({where:{status:{in:["PENDING","RETRYABLE","FAILED"]}}})]);
  const cards=[["Pending orders",orders],["Table requests",reservations],["Open inquiries",inquiries],["Subscribers",subscribers],["Active menu",menu],["Email attention",email]];
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Operations</p><h1 className="mt-3 font-display text-6xl uppercase">Dashboard</h1></div><ProcessEmailButton/></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value])=><div className="panel-elevated p-6" key={String(label)}><p className="text-xs uppercase tracking-widest text-muted">{label}</p><p className="mt-4 font-display text-6xl">{value}</p></div>)}</div><p className="mt-8 max-w-3xl text-sm leading-7 text-muted">All counts are read from PostgreSQL. Email attention includes queued, retryable, and permanently failed jobs; provider acceptance is not presented as final inbox delivery.</p></div>;
}
