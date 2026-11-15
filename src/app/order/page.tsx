import type { Metadata } from "next";
import { OrderForm } from "./order-form";
export const metadata:Metadata={title:"Order Online",description:"Build a pay-at-counter pickup order."};
export default function OrderPage(){return <section className="min-h-screen px-5 pb-28 pt-32 lg:px-10"><div className="mx-auto max-w-[1500px]"><p className="eyebrow">Pay at counter · Pickup only</p><h1 className="mt-4 font-display text-7xl uppercase leading-[.85] sm:text-9xl">Order for<br/><span className="text-blue">the road.</span></h1><div className="mt-12"><OrderForm/></div></div></section>}
