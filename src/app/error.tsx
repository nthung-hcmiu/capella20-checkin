"use client";

import { LoiTrang } from "@/components/LoiTrang";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <LoiTrang error={error} reset={reset} />;
}
