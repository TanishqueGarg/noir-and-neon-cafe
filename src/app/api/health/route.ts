import { apiOk } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() { return apiOk({ service: "noir-neon", status: "ok" }); }
