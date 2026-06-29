const createCrudRoutes = require("../utils/createCrudRoutes");

module.exports = createCrudRoutes("clients.json", {
  createRoles: ["superadmin", "product_manager"],
  updateRoles: ["superadmin", "product_manager"],
  deleteRoles: ["superadmin"],
  requiredFields: ["name", "email", "company"],
  defaults: () => ({ status: "Active", phone: "", industry: "" }),
});
