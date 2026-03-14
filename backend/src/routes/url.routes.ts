import {Router} from 'express';
import { createShortUrl, getUrlAnalytics, redirectToOriginalUrl } from '../controllers/url.controller';

const router = Router();

router.post('/shorten' , createShortUrl);

router.get("/:shortCode", redirectToOriginalUrl);

router.get("/analytics/:shortCode", getUrlAnalytics);

export default router;