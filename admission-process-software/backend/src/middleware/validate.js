/** validate(schema) parses req.body with a zod schema and replaces it with the cleaned data. */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = {};
    for (const issue of result.error.issues) errors[issue.path.join('.') || 'form'] = issue.message;
    return res.status(400).json({ message: 'Please correct the highlighted fields', errors });
  }
  req.body = result.data;
  return next();
};
module.exports = { validate };
