"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatInr } from "@/lib/format/money";
import type { BalanceTrendPoint } from "@/lib/aggregate/accounts";

export function BalanceTrendChart({ data }: { data: BalanceTrendPoint[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-foreground/50">No balance history yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatInr(value)} width={90} />
        <Tooltip formatter={(value) => formatInr(Number(value))} />
        <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
