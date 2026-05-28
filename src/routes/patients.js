import {Router} from 'express';
import {createPatient, searchPatients, getPatientById} from '../controllers/patients.controller.js'

const router = Router();

router.post('/', createPatient);
router.get('/:patient_id', getPatientById);
router.get('/', searchPatients);

export default router;