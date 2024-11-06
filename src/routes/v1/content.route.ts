import express from 'express';
import multer from 'multer';
import { getContent, postContent } from '../../controllers/content.controller.js';
import validate from '../../middlewares/validate.js';
import { createContent, findContent } from '../../validations/content.validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Define dangerous file types
    const dangerousTypes = [
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-msdos-windows',
      'application/x-download',
      'application/bat',
      'application/x-bat',
      'application/com',
      'application/x-com',
      'application/exe',
      'application/x-exe',
      'application/x-winexe',
      'application/x-winhlp',
      'application/x-winhelp',
      'application/x-javascript',
      'application/x-vbs',
      'application/x-vbscript',
      'application/x-scriptlet'
    ];

    if (dangerousTypes.includes(file.mimetype)) {
      cb(null, false);
    } else {
      cb(null, true);
    }
  }
});

const router = express.Router();

router.route('/').post(upload.single('file'), validate(createContent), postContent);
router.route('/:contentId').get(validate(findContent), getContent);

export default router;
