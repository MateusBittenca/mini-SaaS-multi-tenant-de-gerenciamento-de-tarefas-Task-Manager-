import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetTokenParamSchema,
} from '../schemas/auth.schema';
import { authRateLimiter } from '../middlewares/rateLimit';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);
router.get(
  '/reset-password/:token',
  validate({ params: resetTokenParamSchema }),
  authController.getResetToken
);
router.post(
  '/reset-password/:token',
  authRateLimiter,
  validate({ params: resetTokenParamSchema, body: resetPasswordSchema }),
  authController.resetPassword
);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

router.get('/me', authMiddleware, authController.getMe);
router.patch('/me', authMiddleware, validate({ body: updateProfileSchema }), authController.updateMe);

export default router;
