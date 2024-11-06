import express from 'express';
import { verifyToken } from '../../middlewares/verifyToken.js';
const router = express.Router();

router.route('/').get(verifyToken, (req, res) => {
  res.json({ permissionSet: req.accountInfo?.permissionSet });
});
export default router;
