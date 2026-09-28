import express, { Request, Response } from 'express';
import { HttpStatusCode } from '../enums/App';
import { apiLimiter, createAccountLimiter } from '../utils/rateLimiter';
import { authenticate } from '../middleware/authentication';
import { GamesController } from '../controllers';
const router = express.Router();

router
    .get('/', async (req: Request, res: Response) => {
        try {
            res.status(HttpStatusCode.OK).json({ message: 'Admin Connected' });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Internal server error' });
        }
    })

    .post('/bet/color-changer', apiLimiter, authenticate, GamesController.placeBetColorChangeGame)
    .post('/bet/dice-roll', apiLimiter, authenticate, GamesController.placeBetDiceRoll)
    .post('/bet/dragon-tiger', apiLimiter, authenticate, GamesController.placeBetDragonTiger)
    .post('/bet/super-over', apiLimiter, authenticate, GamesController.placeBetSuperOver)
    .post('/bet/marble-race', apiLimiter, authenticate, GamesController.placeBetMarbleRace)
    .get('/gameTransactions', apiLimiter, authenticate, GamesController.getGameTransactions)

export default router