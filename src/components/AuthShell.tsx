import { Brand } from "./Brand";

export function AuthShell({ tieuDe, moTa, children }: { tieuDe: string; moTa?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-ivory px-4 py-10">
      <div className="mx-auto max-w-sm">
        <div className="mb-8 flex justify-center">
          <Brand lon sub="Khách mời" />
        </div>
        <div className="card overflow-hidden">
          <div className="h-1.5 bg-brand" />
          <div className="p-7">
            <h1 className="font-display text-xl text-ink">{tieuDe}</h1>
            {moTa && <p className="mt-1 text-sm text-ink-muted">{moTa}</p>}
            <div className="mt-5">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
