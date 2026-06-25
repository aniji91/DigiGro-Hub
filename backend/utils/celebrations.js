function parseDateParts(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getYearsOfService(joiningDate, onDate) {
  const join = parseDateParts(joiningDate);
  const ref = parseDateParts(onDate);
  if (!join || !ref) return 0;
  let years = ref.year - join.year;
  if (ref.month < join.month || (ref.month === join.month && ref.day < join.day)) {
    years -= 1;
  }
  return years;
}

function nextOccurrence(sourceDate, fromDate, daysAhead = 7) {
  const parts = parseDateParts(sourceDate);
  if (!parts) return null;

  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(candidate.getDate() + offset);
    if (
      candidate.getMonth() + 1 === parts.month &&
      candidate.getDate() === parts.day
    ) {
      const date = toDateString(candidate);
      return { date, isToday: offset === 0 };
    }
  }

  return null;
}

function getCelebrations(employees, options = {}) {
  const daysAhead = options.daysAhead ?? 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results = [];

  for (const emp of employees) {
    if (emp.dob) {
      const occ = nextOccurrence(emp.dob, today, daysAhead);
      if (occ) {
        results.push({
          id: `birthday-${emp.id}-${occ.date}`,
          type: "birthday",
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department || "",
          position: emp.position || "",
          date: occ.date,
          isToday: occ.isToday,
          message: occ.isToday
            ? `Happy Birthday, ${emp.name}! Wishing you a wonderful day.`
            : `${emp.name}'s birthday is on ${formatDisplayDate(occ.date)}.`,
        });
      }
    }

    if (emp.joiningDate) {
      const occ = nextOccurrence(emp.joiningDate, today, daysAhead);
      if (occ) {
        const years = getYearsOfService(emp.joiningDate, occ.date);
        if (years >= 1) {
          const yearLabel = years === 1 ? "1 year" : `${years} years`;
          results.push({
            id: `anniversary-${emp.id}-${occ.date}`,
            type: "anniversary",
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department || "",
            position: emp.position || "",
            date: occ.date,
            isToday: occ.isToday,
            years,
            message: occ.isToday
              ? `Congratulations ${emp.name} on ${yearLabel} with DigiGro!`
              : `${emp.name} completes ${yearLabel} on ${formatDisplayDate(occ.date)}.`,
          });
        }
      }
    }
  }

  return results.sort((a, b) => {
    if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.employeeName.localeCompare(b.employeeName);
  });
}

function formatDisplayDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

module.exports = {
  getCelebrations,
  formatDisplayDate,
};
