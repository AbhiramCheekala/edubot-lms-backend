import express from 'express';
import validate from '../../middlewares/validate.js';
import { findBinaryObject } from '../../validations/binaryObject.validation.js';
import { getBinaryObject } from '../../controllers/binaryObject.controller.js';

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 10 * 1024 * 1024 // 10 MB
//   },
//   fileFilter: (req, file, cb) => {
//     // Define dangerous file types
//     const dangerousTypes = [
//       'application/x-msdownload',
//       'application/x-msdos-program',
//       'application/x-msdos-windows',
//       'application/x-download',
//       'application/bat',
//       'application/x-bat',
//       'application/com',
//       'application/x-com',
//       'application/exe',
//       'application/x-exe',
//       'application/x-winexe',
//       'application/x-winhlp',
//       'application/x-winhelp',
//       'application/x-javascript',
//       'application/x-vbs',
//       'application/x-vbscript',
//       'application/x-scriptlet'
//     ];

//     if (dangerousTypes.includes(file.mimetype)) {
//       cb(null, false);
//     } else {
//       cb(null, true);
//     }
//   }
// });

const router = express.Router();

router.route('/:binaryObjectId').get(validate(findBinaryObject), getBinaryObject);

export default router;
