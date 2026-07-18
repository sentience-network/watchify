import Link from "next/link";

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: "/library", label: "Free library" },
  { href: "/content", label: "Content" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/safety", label: "Safety" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line pt-8 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-display text-sm font-semibold text-white">
          Watch<span className="text-teal">ify</span>
          <span className="ml-2 font-body text-xs font-normal text-mist/60">
            Social movie nights, safely.
          </span>
        </p>
        <nav className="flex flex-wrap gap-3 text-xs text-mist/80">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-teal-soft">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
