const express = require('express');
const router = express.Router();
const Registration = require('../models/registration');

router.post('/register', async(req, res) => {
    const reg = new Registration(req.body);
    const result = await reg.save();
    res.send(result);
});

router.put('/status/:id', async(req, res) => {

    try {

        const updated = await Registration.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );

        res.send(updated);

    } catch (error) {
        res.status(500).send(error);
    }

});

router.get('/participants', async(req, res) => {
    const data = await Registration.find()
    .populate('event_id')
    .populate('user_id');

    res.send(data);

});

     

module.exports = router;