import type { ReactNode } from "react";

export type DashboardTableColumn<Row> = {
  key: string;
  label: string;
  className?: string;
  render: (row: Row) => ReactNode;
};

type DashboardTableProps<Row extends { id: string }> = {
  rows: Row[];
  columns: DashboardTableColumn<Row>[];
  mobileRender: (row: Row) => ReactNode;
  empty: ReactNode;
};

export function DashboardTable<Row extends { id: string }>({ rows, columns, mobileRender, empty }: DashboardTableProps<Row>) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      <div className="hidden overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] xl:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-[rgb(var(--surface-subtle))] text-xs uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">
            <tr>
              {columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-3 font-semibold ${column.className ?? ""}`}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors duration-fast hover:bg-[rgb(var(--surface-muted)/0.68)]">
                {columns.map((column) => <td key={column.key} className={`px-4 py-3 align-middle ${column.className ?? ""}`}>{column.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 xl:hidden">{rows.map((row) => <div key={row.id}>{mobileRender(row)}</div>)}</div>
    </>
  );
}
