import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { getPublicMenu } from "@/services/public-data.server";
export const metadata: Metadata = { title: "Menu", description: "Explore signature coffee, cold brews, breakfast, sandwiches and desserts." };
export default async function MenuPage(){const items=await getPublicMenu();return <section className="min-h-screen px-5 pb-28 pt-32 lg:px-10"><div className="mx-auto max-w-[1600px]"><div className="grid gap-8 lg:grid-cols-[1fr_.6fr] lg:items-end"><div><p className="eyebrow">24+ ways into the night</p><h1 className="display-title mt-5">Full<br/><span className="text-blue">spectrum.</span></h1></div><p className="max-w-lg pb-3 text-sm leading-7 text-muted">Coffee with clarity. Food with intent. Prices include applicable taxes. Availability is checked again before an order is saved.</p></div><MenuBrowser items={items}/></div></section>}
