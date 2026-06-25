const createCrudRoutes = require("../utils/createCrudRoutes");

module.exports = createCrudRoutes("customers.json", {
  createRoles: ["superadmin", "admin"],
  updateRoles: ["superadmin", "admin"],
  deleteRoles: ["superadmin", "admin"],
  requiredFields: ["name", "email", "company"],
  defaults: () => ({ status: "Active", phone: "" }),
});
