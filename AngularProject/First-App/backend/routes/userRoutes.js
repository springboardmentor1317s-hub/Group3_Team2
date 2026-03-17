const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async(req, res) => {
    const user = new User(req.body);
    const result = await user.save();
    res.send(result);
});

router.post('/login', async(req, res) => {

    const user = await User.findOne({
        email:req.body.email,
        password:req.body.password
    });

    if(user){
        res.send(user);
    }
    else{
        res.send("Invalid Login");
    }

});

module.exports = router;