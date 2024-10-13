import express from 'express';
import { getProfile } from '../controllers/profileController.mjs';

const router = express.Router();

router.get('/data', getProfile);

export default router;
