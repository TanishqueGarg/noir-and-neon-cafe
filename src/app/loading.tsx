export default function Loading() {
  return <div className="min-h-screen px-5 pt-32 lg:px-10"><div className="mx-auto max-w-[1600px] animate-pulse"><div className="h-4 w-24 rounded bg-white/10"/><div className="mt-6 h-24 max-w-3xl rounded bg-white/10"/><div className="mt-12 grid gap-5 md:grid-cols-3">{[0,1,2].map((n)=><div key={n} className="aspect-[4/5] rounded-3xl bg-white/5"/>)}</div></div></div>;
}
