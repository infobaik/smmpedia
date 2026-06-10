// src/api/index.ts
import { Hono } from 'hono'
import { authRouter } from './auth'
import { cloudinaryRouter } from './cloudinary'
import { medanpediaRouter } from './medanpedia'
import { ordersRouter } from './orders'
import { cronRouter } from './cron'
import { webhookRouter } from './webhook'
import { checkRouter } from './check'
import { paymentRouter } from './payment'

export const apiRouter = new Hono()

apiRouter.route('/auth', authRouter)
apiRouter.route('/cloudinary', cloudinaryRouter)
apiRouter.route('/medanpedia', medanpediaRouter)
apiRouter.route('/orders', ordersRouter)
apiRouter.route('/cron', cronRouter)
apiRouter.route('/webhook', webhookRouter)
apiRouter.route('/check', checkRouter)
apiRouter.route('/payment', paymentRouter)
