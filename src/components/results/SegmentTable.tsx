import type { SimulationResult } from "@/domain/types";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SEGMENTS } from "@/domain/labels";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { UNVALIDATED_LABEL } from "./metricDisplay";
import { InfoTip } from "@/components/common/InfoTip";

export function SegmentTable({ result }: { result: SimulationResult }) {
  const showInc = result.objective !== "acquisition" && result.objective !== "product_adoption";
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Segment</TableHead>
          <TableHead className="text-right">Uygun müşteri</TableHead>
          <TableHead className="text-right">Kampanyasız da</TableHead>
          <TableHead className="text-right">Hak kazanan</TableHead>
          <TableHead className="text-right">Oran</TableHead>
          <TableHead className="text-right">Maliyet</TableHead>
          {showInc && (
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">
                Tahmini ek ciro {!result.incrementalValidated && <InfoTip content={UNVALIDATED_LABEL} />}
              </span>
            </TableHead>
          )}
          <TableHead className="text-right">Veri kapsamı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {result.segments.map((s) => (
          <TableRow key={s.segmentId}>
            <TableCell>
              <span className="flex items-center gap-2 font-medium">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEGMENTS[s.segmentId].color }} />
                {SEGMENTS[s.segmentId].name}
              </span>
            </TableCell>
            <TableCell className="tabular text-right">{formatNumber(s.eligibleCustomers)}</TableCell>
            <TableCell className="tabular text-right text-ink-soft">{formatNumber(s.naturalQualifiers)}</TableCell>
            <TableCell className="tabular text-right font-medium">{formatNumber(s.qualifiedCustomers)}</TableCell>
            <TableCell className="tabular text-right">{formatPercent(s.qualificationRate, 1)}</TableCell>
            <TableCell className="tabular text-right">{formatCurrency(s.totalCost)}</TableCell>
            {showInc && (
              <TableCell className={`tabular text-right ${result.incrementalValidated ? "" : "text-ink-soft/70"}`}>
                {result.incrementalValidated ? "" : "~"}
                {formatCurrency(s.incrementalSpending, { compact: true })}
              </TableCell>
            )}
            <TableCell className="tabular text-right">{formatPercent(s.dataCoverage)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell className="font-semibold">Toplam</TableCell>
          <TableCell className="tabular text-right">{formatNumber(result.eligibleCustomers)}</TableCell>
          <TableCell className="tabular text-right text-ink-soft">{formatNumber(result.naturalQualifiers)}</TableCell>
          <TableCell className="tabular text-right font-semibold">{formatNumber(result.qualifiedCustomers)}</TableCell>
          <TableCell className="tabular text-right">{formatPercent(result.qualificationRate, 1)}</TableCell>
          <TableCell className="tabular text-right">{formatCurrency(result.totalCost)}</TableCell>
          {showInc && (
            <TableCell className="tabular text-right">
              {result.incrementalValidated ? "" : "~"}
              {formatCurrency(result.incrementalSpending, { compact: true })}
            </TableCell>
          )}
          <TableCell className="tabular text-right">{formatPercent(result.reliability.dataCoverage)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
