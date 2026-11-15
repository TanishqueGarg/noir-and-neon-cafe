"use client";
import { useRouter } from "next/navigation";
function csrf(){const entry=document.cookie.split("; ").find(value=>value.startsWith("nn_admin_csrf=")||value.startsWith("__Host-nn_admin_csrf="));return decodeURIComponent(entry?.split("=").slice(1).join("=")||"")}
export function ResolveInquiry({id}:{id:string}){const router=useRouter();return <button className="rounded-full border border-line px-4 py-2 text-xs" onClick={async()=>{await fetch(`/api/admin/contact/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json","x-csrf-token":csrf()},body:JSON.stringify({status:"RESOLVED"})});router.refresh()}}>Mark resolved</button>}
