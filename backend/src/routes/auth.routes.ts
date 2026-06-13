import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/auth.schema';
import { authRateLimiter } from '../middlewares/rateLimit';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

router.get('/me', authMiddleware, authController.getMe);
router.patch('/me', authMiddleware, validate({ body: updateProfileSchema }), authController.updateMe);

export default router;
