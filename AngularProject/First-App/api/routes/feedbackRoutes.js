const express = require('express');
const router = express.Router();
const Feedback = require('../models/feedback');

router.post('/add', async(req, res) => {
    const feedback = new Feedback(req.body);
    const result = await feedback.save();
    res.send(result);
});

router.get('/all', async(req, res) => {
    const data = await Feedback.find();
    res.send(data);
});

module.exports = router;