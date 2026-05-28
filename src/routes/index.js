import {Router} from 'express'

// custom imports
import appointment from './appointments.js'
import patient from './patients.js'

const router = Router()

router.use('/patients', patient)
router.use('/appointments', appointment)

export default router