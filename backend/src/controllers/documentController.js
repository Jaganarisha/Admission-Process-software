const crypto = require('crypto');
const path = require('path');
const env = require('../config/env');
const { query } = require('../config/db');
const apps = require('../models/applicationModel');
const storage = require('../services/storage');
const { STATUS, REQUIRED_DOCS, OPTIONAL_DOCS } = require('../services/statusMachine');
const { asyncHandler, HttpError } = require('../middleware/error');

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };
const DOC_TYPES = [...REQUIRED_DOCS, ...OPTIONAL_DOCS];

// Verify the real file signature, not just the client-supplied mimetype.
function signatureMatches(buf, mime) {
  if (mime === 'image/jpeg') return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === 'image/png') return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'application/pdf') return buf.length > 4 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
  return false;
}

const upload = asyncHandler(async (req, res) => {
  const { doc_type: type } = req.body;
  if (!DOC_TYPES.includes(type)) throw new HttpError(400, 'Unknown document type');
  const file = req.file;
  if (!file) throw new HttpError(400, 'Choose a file to upload');
  if (!ALLOWED[file.mimetype] || !signatureMatches(file.buffer, file.mimetype)) throw new HttpError(400, 'Only valid JPG, PNG or PDF files are allowed');
  if (type === 'PHOTO' && file.mimetype === 'application/pdf') throw new HttpError(400, 'Photograph must be a JPG or PNG image');

  const student = await apps.studentByUser(req.user.id);
  const appId = await apps.getOrCreate(student.id, env.academicYear);
  const { rows: appRows } = await query('SELECT status FROM applications WHERE id=$1', [appId]);
  const { rows: existing } = await query('SELECT id, status, storage_key FROM documents WHERE application_id=$1 AND doc_type=$2', [appId, type]);
  const status = appRows[0].status;
  const editable = status === STATUS.DRAFT || (existing[0]?.status === 'REJECTED' && ['SUBMITTED', 'UNDER_VERIFICATION'].includes(status));
  if (!editable) throw new HttpError(409, 'This document can no longer be changed');

  const key = `applications/${appId}/${type}-${crypto.randomBytes(8).toString('hex')}.${ALLOWED[file.mimetype]}`;
  await storage.put(key, file.buffer, file.mimetype);
  const safeName = path.basename(file.originalname).replace(/[^\w.\- ]/g, '_').slice(0, 120);
  const { rows } = await query(
    `INSERT INTO documents (application_id, doc_type, original_name, storage_key, mime_type, size_bytes)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (application_id, doc_type) DO UPDATE SET original_name=EXCLUDED.original_name, storage_key=EXCLUDED.storage_key,
       mime_type=EXCLUDED.mime_type, size_bytes=EXCLUDED.size_bytes, status='PENDING', remarks=NULL, verified_by=NULL, verified_at=NULL, uploaded_at=NOW()
     RETURNING id, doc_type, original_name, mime_type, size_bytes, status, remarks, uploaded_at`,
    [appId, type, safeName, key, file.mimetype, file.size]);
  if (existing[0]) storage.remove(existing[0].storage_key).catch(() => {});
  res.status(201).json({ document: rows[0] });
});

const remove = asyncHandler(async (req, res) => {
  const student = await apps.studentByUser(req.user.id);
  const { rows } = await query(
    `SELECT d.id, d.storage_key FROM documents d JOIN applications a ON a.id=d.application_id
     WHERE d.id=$1 AND a.student_id=$2 AND a.status='DRAFT'`, [Number(req.params.id), student.id]);
  if (!rows[0]) throw new HttpError(404, 'Document not found or can no longer be removed');
  await query('DELETE FROM documents WHERE id=$1', [rows[0].id]);
  storage.remove(rows[0].storage_key).catch(() => {});
  res.json({ ok: true });
});

/** Streams a document to its owner or to staff. Files are never publicly addressable. */
const file = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT d.original_name, d.storage_key, d.mime_type, s.user_id FROM documents d
     JOIN applications a ON a.id=d.application_id JOIN students s ON s.id=a.student_id WHERE d.id=$1`, [Number(req.params.id)]);
  const doc = rows[0];
  if (!doc || (req.user.role === 'student' && doc.user_id !== req.user.id)) throw new HttpError(404, 'Document not found');
  res.setHeader('Content-Type', doc.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name)}"`);
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
  (await storage.getStream(doc.storage_key)).pipe(res);
});

module.exports = { upload, remove, file };
