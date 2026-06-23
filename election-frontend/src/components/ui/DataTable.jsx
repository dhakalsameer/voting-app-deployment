export default function DataTable({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found.",
  rowClassName,
}) {
  if (!data.length) {
    return null;
  }

  const getKey = (row, index) => {
    if (keyExtractor) return keyExtractor(row, index);
    return row.id ?? row.student_id ?? index;
  };

  const cellValue = (row, col) => {
    if (col.render) return col.render(row);
    return row[col.key] ?? "—";
  };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block glass-panel rounded-2xl border border-app overflow-hidden shadow-card">
        <div className="table-responsive">
          <table className="w-full text-sm">
            <thead className="bg-app-elevated border-b border-app">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 lg:px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-widest text-app-muted ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${col.className || ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-app/40 bg-app-muted/30">
              {data.map((row, index) => (
                <tr
                  key={getKey(row, index)}
                  className={`hover:bg-emerald-500/5 transition-colors ${rowClassName?.(row) || ""}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 lg:px-5 py-3.5 text-sm text-app-body ${
                        col.align === "right" ? "text-right" : "text-left"
                      } ${col.cellClassName || ""}`}
                    >
                      {cellValue(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {data.map((row, index) => (
          <div
            key={getKey(row, index)}
            className={`glass-panel rounded-xl border border-app p-4 space-y-2.5 ${rowClassName?.(row) || ""}`}
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-xs font-mono font-bold uppercase tracking-wider text-app-muted">
                    {col.label}
                  </span>
                  <span className={`text-sm text-right text-app-body ${col.cellClassName || ""}`}>
                    {cellValue(row, col)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}