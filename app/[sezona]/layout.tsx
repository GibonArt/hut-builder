import { notFound } from "next/navigation";
import { SezonaProvider } from "@/components/SezonaProvider";
import { TypyKaretProvider } from "@/components/TypyKaretProvider";
import { parseSezona } from "@/lib/sezona";

export default async function SezonaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sezona: string }>;
}) {
  const { sezona: raw } = await params;
  const sezona = parseSezona(raw);
  if (!sezona) notFound();

  return (
    <SezonaProvider sezona={sezona}>
      <TypyKaretProvider>{children}</TypyKaretProvider>
    </SezonaProvider>
  );
}
