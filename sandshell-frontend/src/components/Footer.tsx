export default function Footer() {
  return (
    <footer className="border-t border-border/70 px-6 py-8 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 font-mono text-[12px] text-muted sm:flex-row">
        <span>© {new Date().getFullYear()} SandShell. All rights reserved.</span>

        <span className="rounded-full border border-border px-2.5 py-1 text-[11px]">
          v1.0
        </span>
      </div>
    </footer>
  );
}
