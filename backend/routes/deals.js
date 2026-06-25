const createCrudRoutes = require("../utils/createCrudRoutes");

module.exports = createCrudRoutes("deals.json", {
  createRoles: ["superadmin", "admin"],
  updateRoles: ["superadmin", "admin"],
  deleteRoles: ["superadmin", "admin"],
  requiredFields: ["title", "customer", "stage", "value"],
  defaults: () => ({ probability: 50 }),
});
