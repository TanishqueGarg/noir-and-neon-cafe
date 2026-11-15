import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { CreateTableForm, TableEditor } from "@/components/admin/admin-client";
import { SettingsForm } from "@/components/admin/settings-adapter";
export const dynamic="force-dynamic";
export default async function SettingsAdmin(){const auth=await requireAdminPage();if(auth.admin.role!=="OWNER")redirect("/admin");const [settings,tables]=await Promise.all([db.businessSetting.upsert({where:{id:"primary"},create:{id:"primary"},update:{}}),db.tableInventory.findMany({orderBy:{name:"asc"}})]);return <div><p className="eyebrow">Operational configuration</p><h1 className="mt-3 font-display text-6xl uppercase">Business</h1><div className="mt-8"><SettingsForm settings={settings}/></div><section className="mt-8"><h2 className="font-display text-4xl uppercase">Seating capacity</h2><div className="mt-4"><CreateTableForm/></div><div className="mt-4 space-y-3">{tables.map(table=><div className="panel-elevated flex flex-wrap items-center justify-between gap-4 p-4" key={table.id}><div><p className="font-bold">{table.name}</p><p className="text-xs text-muted">{table.seats} seats · {table.active?"active":"inactive"}</p></div><TableEditor table={table}/></div>)}</div></section></div>}
