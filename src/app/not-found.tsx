import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-[64px] font-bold leading-none" style={{ color: "var(--brand)" }}>404</p>
        <h1 className="text-[18px] font-semibold mt-3">Page not found</h1>
        <p className="text-[13px] text-slate-500 mt-1">The page you are looking for does not exist or has been moved.</p>
        <Link href="/dashboard" className="btn btn-primary mt-5 inline-flex">Back to Dashboard</Link>
      </div>
    </div>
  );
}
