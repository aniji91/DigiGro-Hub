import { useEffect, useState } from "react";

const EMPTY_FORM = {
  name: "",
  email: "",
  department: "",
  position: "",
  salary: "",
};

export default function EmployeeForm({ onSubmit, editingEmployee, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editingEmployee) {
      setForm({
        name: editingEmployee.name,
        email: editingEmployee.email,
        department: editingEmployee.department,
        position: editingEmployee.position,
        salary: String(editingEmployee.salary),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingEmployee]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
    if (!editingEmployee) {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h2>{editingEmployee ? "Edit Employee" : "Add Employee"}</h2>

      <label>
        Name
        <input name="name" value={form.name} onChange={handleChange} required />
      </label>

      <label>
        Email
        <input name="email" type="email" value={form.email} onChange={handleChange} required />
      </label>

      <label>
        Department
        <input name="department" value={form.department} onChange={handleChange} required />
      </label>

      <label>
        Position
        <input name="position" value={form.position} onChange={handleChange} required />
      </label>

      <label>
        Salary
        <input name="salary" type="number" value={form.salary} onChange={handleChange} required />
      </label>

      <div className="form-actions">
        <button type="submit">{editingEmployee ? "Update" : "Add"}</button>
        {editingEmployee && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
