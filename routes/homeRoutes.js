import express from 'express';
const router = express.Router();

router.get('/', (req, res) => res.render('index'));
router.get('/index', (req, res) => res.render('index'));

export default router;