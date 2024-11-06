import express from 'express';
import roleController from '../../controllers/role.controller.js';
import validate from '../../middlewares/validate.js';
import { getRole, getRoles } from '../../validations/role.validation.js';

const router = express.Router();

router.route('/').get(validate(getRoles), roleController.getRoles);

router.route('/:roleId').get(validate(getRole), roleController.getRole);

export default router;
