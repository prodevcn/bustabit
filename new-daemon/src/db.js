var assert = require('better-assert');
var async = require('async');
var pg = require('pg');
const {Client} = pg;
var databaseUrl = process.env.DATABASE_URL;
var coins = ['BTC', 'ETH', 'BCH', 'LTC', 'ERC20-USDT', 'XRP', 'TRX'];
// var rates = {'BTC': 9184.86, 'ETH': 238.92, 'BCH': 225.96, 'LTC': 42.55, 'ERC20-USDT':1, 'XRP': 0.19, 'TRX': 0.017}


if (!databaseUrl) {
    throw new Error('must se DATABASE_URL environment var');
}

pg.types.setTypeParser(20, function(val) {
    return val === null ? null : parseInt(val);
});

function connect(callback) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    return client.connect(function(err) {
        callback(err, client);
    });
}
function query(query, params, callback) {
    if (typeof params == 'function') {
        callback = params;
        params = [];
    }
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    client.connect((err) => {
        client.query(query, params, function(err, result) {
            client.end();
            if (err) {
                if (err.code === '40P01') {
                    console.error('[INTERNAL] Warning: Retrying deadlocked transaction: ', query, params);
                    return doIt();
                }
                return callback(err);
            }
            callback(null, result);
        });
    });
}

exports.query = query;

function getClient(runner, callback) {
    doIt();
    function doIt() {        
        connect( (err, client) => {
            if (err) {
                return callback(err);
            }
            function rollback(err) {
                client.query('ROLLBACK');

                if (err.code === '40P01') {
                    console.error('[INTERNAL_ERROR] Warning: Retrying deadlocked transaction..');
                    return doIt();
                }

                callback(err);
            }

            client.query('BEGIN', function (err) {
                if (err)
                    return rollback(err);

                runner(client, function (err, data) {
                    if (err)
                        return rollback(err);

                    client.query('COMMIT', function (err) {
                        if (err)
                            return rollback(err);

                        // done();
                        callback(null, data);
                    });
                });
            });
        });
    }
}

function getClient(runner, callback) {
    connect(function (err, client, done) {
        if (err) return callback(err);

        function rollback(err) {
            client.query('ROLLBACK', done);
            callback(err);
        }

        client.query('BEGIN', function (err) {
            if (err)
                return rollback(err);

            runner(client, function(err, data) {
                if (err)
                    return rollback(err);

                client.query('COMMIT', function (err) {
                    if (err)
                        return rollback(err);

                    done();
                    callback(null, data);
                });
            });
        });
    });
}
exports.getClient = function(callback) {
    var client = new pg.Client(databaseUrl);

    client.connect(function(err) {
        if (err) return callback(err);
        callback(null, client);
    });
};

exports.getUserList = function(callback) {
    query('SELECT * FROM users ORDER BY id ASC', function(err, result){
        if (result.rows.length == 0)
            return callback('Table is empty', null);
        return callback(null, result.rows);
    });
};

exports.addTransactions = function(transactions, rates, callback) {
    let values = [];
    let tmp = [];
    for (let i = 0; i < transactions.length; i++){
        values.push("('" + transactions[i].userId + "', '" + transactions[i].coin_code + "', '" + transactions[i].amount + "', '" + transactions[i].txid + "', '" + transactions[i].transaction_type + "', '" + transactions[i].created + "', '" + transactions[i].from_address + "', '" + transactions[i].to_address + "')");
        var amount = Math.round(transactions[i].amount * rates[transactions[i].coin_code]*100);
        tmp.push('UPDATE users SET balance_satoshis = balance_satoshis + ' + amount + ' WHERE id = ' + transactions[i].userId + ";");
    }
    values = values.join(',');
    tmp = tmp.join(' ');

    query('INSERT INTO transactions(user_id, coin_code, amount, transaction_txid, transaction_type, created, from_address, to_address) VALUES ' + values, function (err, result) {
        if(err) {
            console.error(err);
            return callback(err, null);
        }

        query(tmp, function(err, result){
            if (err) {
                return callback(err, null);
            }
            console.log(result)
            return callback(null, result);
        });            
    });        
}
