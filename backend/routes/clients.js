const createCrudRoutes = require("../utils/createCrudRoutes");

module.exports = createCrudRoutes("clients.json", {
  createRoles: ["superadmin"],
  updateRoles: ["superadmin"],
  deleteRoles: ["superadmin"],
  requiredFields: ["name", "email", "company"],
  defaults: () => ({ status: "Active", phone: "", industry: "" }),
});
