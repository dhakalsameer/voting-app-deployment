import { useState, useEffect } from "react";

export default function DataTable({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found.",
  rowClassName,
  pageSize = 10,
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [data.length]);

  if (!data.length) {
    return null;
  }

  const totalPages = Math.ceil(data.length / pageSize);
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, data.length);
  const pageData = data.slice(start, end);

  const getKey = (row, index) => {
    if (keyExtractor) return keyExtractor(row, index);
    return row.id ?? row.student_id ?? index;
  };

  const cellValue = (row, col) => {
    if (col.render) return col.render(row);
    return row[col.key] ?? "—";
  };

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(i);
  }

  return (
    <>
      <div className="hidden md:block rounded-xl border border-app overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-base">
            <thead className="bg-app-elevated border-b border-app">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-app-muted-text ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${col.className || ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-app/40">
              {pageData.map((row, index) => (
                <tr
                  key={getKey(row, index)}
                  className={`hover:bg-app-accent-soft transition-colors ${rowClassName?.(row) || ""}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-4 text-base text-app-body ${
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
        {pageData.map((row, index) => (
          <div
            key={getKey(row, index)}
            className={`rounded-xl border border-app bg-app-surface p-5 space-y-3 ${rowClassName?.(row) || ""}`}
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-sm font-bold uppercase tracking-wider text-app-muted-text">
                    {col.label}
                  </span>
                  <span className="text-base text-right text-app-body ml-2 flex-1 min-w-0 break-words">
                    {cellValue(row, col)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-app-muted-text">
            Showing {start + 1}–{end} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-app-muted-text hover:text-app-heading hover:bg-app-elevated transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Prev
            </button>
            {pages.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  p === safePage
                    ? "text-app-accent bg-app-accent-soft"
                    : "text-app-muted-text hover:text-app-heading hover:bg-app-elevated"
                }`}
              >
                {p + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage === totalPages - 1}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-app-muted-text hover:text-app-heading hover:bg-app-elevated transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
