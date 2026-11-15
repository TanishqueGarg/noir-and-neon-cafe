import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
export const apiOk = <T>(data:T,status=200)=>NextResponse.json<ApiResponse<T>>({ok:true,data},{status});
export const apiError = (code:string,message:string,status=400)=>NextResponse.json<ApiResponse<never>>({ok:false,error:{code,message}},{status});
