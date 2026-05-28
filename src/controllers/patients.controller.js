import { query } from '../config/db.js';
import logger from '../logger/index.js';
import { context } from '../helper/common.helper.js';

export const createPatient = async (req, res) => {
  const { name, phone, email } = req.body;

  // Validation
  if (!name || !phone || !email) {
    logger.warn({
      event: 'validation_failed',
      reason: 'missing_fields',
      request_id: req.requestId,
      practice_id: req.practiceId,
    });
    return res.status(400).json({ error: 'name, phone, email required' });
  }

  try {
    const result = await query(
      req.dbPool,
      `INSERT INTO patients (name, phone, email) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, phone, email],
      context(req)
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error({
      event: 'request_failed',
      error: err.message,
      stack: err.stack,
      request_id: req.requestId,
      practice_id: req.practiceId,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export const getPatientById = async (req, res) => {
  const { patient_id } = req.params;

  try {
    const result = await query(
      req.dbPool,
      `SELECT * FROM patients WHERE patient_id = $1`,
      [patient_id],
      context(req)
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found in this practice' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error({
      event: 'request_failed',
      error: err.message,
      stack: err.stack,
      request_id: req.requestId,
      practice_id: req.practiceId,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export const searchPatients = async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let result;

    if (search) {
      result = await query(
        req.dbPool,
        `SELECT * FROM patients 
         WHERE name ILIKE $1 OR phone = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [`%${search}%`, search, limit, offset],
        context(req)
      );
    } else {
      result = await query(
        req.dbPool,
        `SELECT * FROM patients 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset],
        context(req)
      );
    }

    return res.json({
      data: result.rows,
      page: parseInt(page),
      limit: parseInt(limit),
      count: result.rows.length,
    });
  } catch (err) {
    logger.error({
      event: 'request_failed',
      error: err.message,
      stack: err.stack,
      request_id: req.requestId,
      practice_id: req.practiceId,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
