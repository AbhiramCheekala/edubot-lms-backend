import express from 'express';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { requirePermissions } from '../../middlewares/permissionMiddleware.js';
import { resolveSecurityFilters } from '../../middlewares/resolveSecurityFilters.js';
import validate from '../../middlewares/validate.js';
import {
  getStudentNotesForContent,
  putNoteForContent
} from '../../controllers/readingMaterial.controller.js';
import { SecurityFilterParam } from '../../permissions/securityFilterTypes.js';
import { Actions } from '../../permissions/Actions.js';
import { DataAccessScopes } from '../../permissions/DataAccessScopes.js';
import { check, guard, or } from '../../permissions/PermissionGuards.js';
import {
  getNotesValidation,
  putNoteValidation
} from '../../validations/readingMaterialNote.validation.js';
const router = express.Router();

const readRmNotes = guard(or(check(Actions.rmnotes.read, DataAccessScopes.self.id)));

const writeRmNotes = guard(or(check(Actions.rmnotes.write, DataAccessScopes.self.id)));

const securityFilterParamsRead: SecurityFilterParam[] = [
  { identifier: 'rmNotesReadScopes', action: Actions.rmnotes.read }
];

const securityFilterParamsWrite: SecurityFilterParam[] = [
  { identifier: 'rmNotesWriteScopes', action: Actions.rmnotes.write }
];

router
  .route('/:contentId')
  .get(
    verifyToken,
    requirePermissions(readRmNotes),
    resolveSecurityFilters(securityFilterParamsRead),
    validate(getNotesValidation),
    getStudentNotesForContent
  )
  .put(
    verifyToken,
    requirePermissions(writeRmNotes),
    resolveSecurityFilters(securityFilterParamsWrite),
    validate(putNoteValidation),
    putNoteForContent
  );

export default router;
