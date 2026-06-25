const createCrudRoutes = require("../utils/createCrudRoutes");

module.exports = createCrudRoutes("leads.json", {
  createRoles: ["superadmin", "admin"],
  updateRoles: ["superadmin", "admin"],
  deleteRoles: ["superadmin", "admin"],
  requiredFields: ["name", "email", "source"],
  defaults: () => ({ status: "New", value: 0 }),
});
