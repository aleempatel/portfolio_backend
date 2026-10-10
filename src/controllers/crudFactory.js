const asyncHandler = require('../utils/asyncHandler');

// Builds standard GET-all / POST / PUT / DELETE handlers for a simple Mongoose model.
// `allowedFields` restricts which body fields can be written (whitelist), so extra/unknown
// fields sent by a client are silently ignored rather than saved.
function crudFactory(Model, allowedFields, { label = 'Item', resourceName = 'items' } = {}) {
  function pick(body) {
    const out = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) out[key] = body[key];
    }
    return out;
  }

  const getAll = asyncHandler(async (_req, res) => {
    const items = await Model.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: items });
  });

  const create = asyncHandler(async (req, res) => {
    const item = await Model.create(pick(req.body));
    res.status(201).json({ success: true, data: item, message: `${label} added.` });
  });

  const update = asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ success: false, message: `${label} not found.` });
    }
    res.json({ success: true, data: item, message: `${label} updated.` });
  });

  const remove = asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: `${label} not found.` });
    }
    res.json({ success: true, message: `${label} deleted.` });
  });

  return { getAll, create, update, remove };
}

module.exports = crudFactory;
