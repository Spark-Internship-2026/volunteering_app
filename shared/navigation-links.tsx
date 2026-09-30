import Link from "next/link";

type NavigationItem = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type NavigationLinksProps = {
  items: NavigationItem[];
  className?: string;
};

function linkClassName(variant: NavigationItem["variant"]) {
  const baseClassName =
    "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition";

  if (variant === "primary") {
    return `${baseClassName} bg-blue-700 text-white hover:bg-blue-800`;
  }

  return `${baseClassName} border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100`;
}

export function NavigationLinks({
  items,
  className = "",
}: NavigationLinksProps) {
  return (
    <nav
      aria-label="Page navigation"
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {items.map((item) => (
        <Link
          className={linkClassName(item.variant)}
          href={item.href}
          key={`${item.href}-${item.label}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
