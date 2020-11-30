const express = require('express');
const assert = require('assert');
const router = express.Router();
var database = require('../../controller/database');

router.post('/transaction-data', (req, res) => {
    database.getTransactions(function(err, transactions) {
        if (err){
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).send(transactions);
    })
});

router.post('/transaction-delete', (req, res) => {
    var condition = req.body;
    database.deleteTransaction(req.body, function(err){
        if(err) {
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).json({message: 'Transaction deleted successfully. Refreshing data...', success: true})
    });
    // return res.status(200).send()
});

module.exports = router;