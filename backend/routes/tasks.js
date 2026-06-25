const createCrudRoutes = require("../utils/createCrudRoutes");

module.exports = createCrudRoutes("tasks.json", {
  createRoles: ["superadmin", "admin", "hr"],
  updateRoles: ["superadmin", "admin", "hr"],
  deleteRoles: ["superadmin", "admin"],
  requiredFields: ["title", "assignee", "priority", "dueDate"],
  defaults: () => ({ status: "Open" }),
});
