const express = require('express');
const { protect } = require('../middleware/auth');

// Builds standard GET/POST/PUT/DELETE routes from a controller produced by crudFactory.
// GET is public (the portfolio site reads it); POST/PUT/DELETE require admin auth.
function crudRoutes(controller) {
  const router = express.Router();
  router.get('/', controller.getAll);
  router.post('/', protect, controller.create);
  router.put('/:id', protect, controller.update);
  router.delete('/:id', protect, controller.remove);
  return router;
}

module.exports = crudRoutes;
