import { Eye, Pencil, Trash2 } from "lucide-react";

export default function DataTable({ columns, rows, onView, onEdit, onDelete, canView, canEdit, canDelete, canEditRow }) {
  if (rows.length === 0) {
    return <div className="empty-state">No records found. Add your first entry to get started.</div>;
  }

  const showActions = canView || canEdit || canDelete;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {showActions && (
                <td>
                  <div className="table-actions">
                    {canView && onView && (
                      <button type="button" className="icon-action view" onClick={() => onView(row)} title="View">
                        <Eye size={15} />
                      </button>
                    )}
                    {canEdit && onEdit && (!canEditRow || canEditRow(row)) && (
                      <button type="button" className="icon-action edit" onClick={() => onEdit(row)} title="Edit">
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && onDelete && (
                      <button type="button" className="icon-action delete" onClick={() => onDelete(row.id)} title="Delete">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
