import {Router} from 'express';
import {createAppointment, getAppointments} from '../controllers/appointments.controller.js';

const router = Router();

router.post('/:patient_id', createAppointment);
router.get('/', getAppointments);

export default router;