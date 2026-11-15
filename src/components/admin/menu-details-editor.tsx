"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function csrf() { const entry=document.cookie.split("; ").find(value=>value.startsWith("nn_admin_csrf=")||value.startsWith("__Host-nn_admin_csrf=")); return decodeURIComponent(entry?.split("=").slice(1).join("=")||""); }
export function MenuDetailsEditor({ item }:{ item:{id:string;name:string;description:string;longDescription:string} }) {
  const router=useRouter(); const [message,setMessage]=useState("");
  return <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-lime-muted">Edit name and descriptions</summary><form className="mt-3 grid gap-3" onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);const response=await fetch(`/api/admin/menu/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json","x-csrf-token":csrf()},body:JSON.stringify({name:data.get("name"),description:data.get("description"),longDescription:data.get("longDescription")})});const result=await response.json();setMessage(result.ok?"Saved":result.error?.message||"Failed");if(result.ok)router.refresh();}}><input className="field" name="name" defaultValue={item.name} required/><textarea className="field min-h-20" name="description" defaultValue={item.description} required/><textarea className="field min-h-28" name="longDescription" defaultValue={item.longDescription} required/><button className="w-fit rounded-full border border-line px-4 py-2 text-xs font-bold">Save copy</button>{message&&<p className="text-xs text-muted">{message}</p>}</form></details>;
}
