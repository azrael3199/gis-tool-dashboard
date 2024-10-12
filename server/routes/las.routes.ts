import { Router } from 'express';
import {
  getUploadedFiles,
  getVisiblePoints,
  uploadLasFile,
} from '../controllers/las.controller';
import fileUpload from 'express-fileupload';

const router = Router();

router.post('/upload', fileUpload(), uploadLasFile);
router.get('/files', getUploadedFiles);
router.post('/visible-points', getVisiblePoints);

export default router;
