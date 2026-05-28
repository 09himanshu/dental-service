import { query } from '../config/db.js';
import logger from '../logger/index.js';
import { context } from '../helper/common.helper.js';

export const createAppointment = async (req, res) => {
  const { scheduled_at, status, notes } = req.body;

  const patient_id = req.params.patient_id

  if(!patient_id) {
    logger.warn({
      event: 'validation_failed',
      reason: 'missing_patient_id',
      request_id: req.requestId,
      practice_id: req.practiceId,
    });
    return res.status(400).json({ error: 'Patient ID is required in URL' });
  }

  // Validation
  if (!scheduled_at || !status) {
    logger.warn({
      event: 'validation_failed',
      reason: 'missing_fields',
      request_id: req.requestId,
      practice_id: req.practiceId,
    });
    return res.status(400).json({ error: 'scheduled_at, status required' });
  }

  try {
    // Patient same DB mein exist karta hai?
    const patientCheck = await query(
      req.dbPool,
      `SELECT patient_id FROM patients WHERE patient_id = $1`,
      [patient_id],
      context(req)
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found in this practice' });
    }

    const result = await query(
      req.dbPool,
      `INSERT INTO appointments (patient_id, scheduled_at, status, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
      [patient_id, scheduled_at, status, notes || null],
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

export const getAppointments = async (req, res) => {
  const { from, to, status, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Dynamic query build karo
    let conditions = [];
    let params = [];
    let paramCount = 1;

    if (from) {
      conditions.push(`scheduled_at >= $${paramCount++}`);
      params.push(from);
    }

    if (to) {
      conditions.push(`scheduled_at <= $${paramCount++}`);
      params.push(to);
    }

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    params.push(limit, offset);

    const result = await query(
      req.dbPool,
      `SELECT a.*, p.name as patient_name 
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       ${whereClause}
       ORDER BY a.scheduled_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      params,
      context(req)
    );

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
