"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { EventMaterial } from "@/lib/types";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { BarChart, DonutChart } from "@/components/ui/charts";
import { formatNumber, downloadCsv } from "@/lib/utils";
import { Package, Globe2, Tv, Download, Boxes } from "lucide-react";

export function MaterialsClient({
  materials, countries, channels,
}: {
  materials: (EventMaterial & { events?: { id: string; name: string; country: string } | null })[];
  countries: { name: string }[];
  channels: { id: string; name: string; color: string }[];
}) {
  const total = materials.reduce((s, m) => s + Number(m.quantity), 0);

  const byItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of materials) map.set(m.item, (map.get(m.item) ?? 0) + Number(m.quantity));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [materials]);

  const byCountry = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of materials) {
      const k = m.events?.country || "—";
      map.set(k, (map.get(k) ?? 0) + Number(m.quantity));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [materials]);

  const byChannel = useMemo(() => {
    // channel data would need event channel_ids; approximate via events join at page level
    const map = new Map<string, number>();
    for (const m of materials) {
      const k = m.events?.name ? "Per event below" : "—";
      map.set(k, (map.get(k) ?? 0) + Number(m.quantity));
    }
    return [...map.entries()];
  }, [materials]);

  const exportCsv = () => {
    downloadCsv("materials.csv", materials.map((m) => ({
      Item: m.item, Quantity: m.quantity, Unit: m.unit,
      Event: m.events?.name ?? "", Country: m.events?.country ?? "", Notes: m.notes,
    })));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Materials"
        description="Materials distributed across all events."
        actions={<button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>}
      />

      <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
        <StatCard label="Total Items" value={formatNumber(total)} icon={Boxes} tone="gold" />
        <StatCard label="Material Types" value={byItem.length} icon={Package} tone="brand" />
        <StatCard label="Countries" value={byCountry.length} icon={Globe2} tone="green" />
      </div>

      {materials.length === 0 ? (
        <div className="card"><EmptyState icon={Package} title="No materials recorded" description="Materials are tracked on each event page." /></div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="font-semibold text-[14px] mb-4">By Item Type</h3>
              <BarChart labels={byItem.map((x) => x[0])} datasets={[{ label: "Quantity", data: byItem.map((x) => x[1]), color: "#f59e0b" }]} horizontal height={Math.max(220, byItem.length * 36)} />
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-[14px] mb-4">By Country</h3>
              <DonutChart labels={byCountry.map((x) => x[0])} data={byCountry.map((x) => x[1])} height={260} />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Item</th><th className="text-right">Quantity</th><th>Unit</th><th>Event</th><th>Country</th></tr></thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.id}>
                      <td className="font-medium">{m.item}</td>
                      <td className="text-right tabular-nums font-semibold">{formatNumber(Number(m.quantity))}</td>
                      <td>{m.unit}</td>
                      <td>
                        {m.events?.id ? (
                          <Link href={`/events/${m.events.id}`} className="text-blue-700 hover:underline">{m.events.name}</Link>
                        ) : "—"}
                      </td>
                      <td>{m.events?.country ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
