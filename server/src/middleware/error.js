import { ZodError } from 'zod';

export const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first.path.join('.');
    return res.status(422).json({ message: field ? `${field}: ${first.message}` : first.message, issues: err.issues });
  }
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This record already exists' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'This item is still in use and cannot be deleted' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong on our side' : err.message });
}
