const express = require('express');
const assert = require('assert');
const router = express.Router();
var database = require('../../controller/database');

router.post('/play-data', (req, res) => {
    database.getPlays(function(err, chats) {
        if (err){
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).send(chats);
    })
});

router.post('/play-delete', (req, res) => {
    var condition = req.body;
    console.log(condition);
    database.deletePlay(req.body, function(err){
        if(err) {
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).json({message: 'Play history deleted successfully. Refreshing data...', success: true})
    });
    // return res.status(200).send()
});

module.exports = router;