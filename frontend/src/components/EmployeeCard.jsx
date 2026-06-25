export default function EmployeeCard({ employee, onEdit, onDelete }) {
  return (
    <div className="employee-card">
      <div className="card-header">
        <h3>{employee.name}</h3>
        <span className="badge">{employee.department}</span>
      </div>
      <p className="email">{employee.email}</p>
      <p>
        <strong>Position:</strong> {employee.position}
      </p>
      <p>
        <strong>Salary:</strong> ${employee.salary.toLocaleString()}
      </p>
      {(onEdit || onDelete) && (
        <div className="card-actions">
          {onEdit && (
            <button type="button" className="btn-edit" onClick={() => onEdit(employee)}>
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn-delete" onClick={() => onDelete(employee.id)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
