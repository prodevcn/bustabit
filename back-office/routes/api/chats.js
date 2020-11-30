const express = require('express');
const assert = require('assert');
const router = express.Router();
var database = require('../../controller/database');

router.post('/chat-data', (req, res) => {
    database.getChats(function(err, chats) {
        if (err){
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).send(chats);
    })
});

router.post('/chat-delete', (req, res) => {
    var condition = req.body;
    database.deleteChat(req.body, function(err){
        if(err) {
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).json({message: 'Message deleted successfully. Refreshing data...', success: true})
    });
    // return res.status(200).send()
});

module.exports = router;