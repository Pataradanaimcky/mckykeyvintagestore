import Link from "next/link";
import { site } from "@/config/site";
import { BrandMark } from "./BrandMark";
import { Container } from "./Container";
import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 bg-canvas/80 backdrop-blur-md">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <BrandMark className="h-8 w-8" />
          {site.name}
        </Link>
        <NavLinks />
      </Container>
    </header>
  );
}
