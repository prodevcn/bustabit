var assert = require('assert');
var uuid = require('uuid');
var config = require('../config/config');
var async = require('async');
var pg = require('pg');
const {Client} = pg;
var passwordHash = require('password-hash');
var speakeasy = require('speakeasy');
var m = require('multiline');
const { isRecord } = require('immutable');

var databaseUrl = config.DATABASE_URL;
if (!databaseUrl)
 throw new Error('must set DATABASE_URL environment var');
console.log('DATABASE_URL: ', databaseUrl);
pg.types.setTypeParser(20, function(val){
    return val === null ? null : parseInt(val);
});


function connect(callback) {
    const client = new Client({
        connectionString: config.DATABASE_URL
    })
    return client.connect(function(err) {
        callback(err, client);
    });
}

function query(query, params, callback) {
    //third parameter is optional
    if (typeof params == 'function') {
        callback = params;
        params = [];
    }
    const client = new Client({
        connectionString: config.DATABASE_URL
    })
    client.connect((err) => {
        if (err) return callback(err);
        client.query(query, params, function(err, result) {
            if (err) {
                if (err.code === '40P01') {
                    console.error('[INTERNAL] Warning: Retrying deadlocked transaction: ', query, params);
                    return doIt();
                }
                client.end();
                return callback(err);
            }
            client.end();
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

exports.createUser = function(username, password, email, callback) {
    assert(username && password);
    getClient(
        function(client, callback) {
            var hashedPassword = passwordHash.generate(password);
            client.query('SELECT COUNT(*) count FROM admins WHERE lower(username) = lower($1) OR lower(email) = lower($2)', [username, email],
                function(err, data) {
                    if (err) return callback(err);
                    assert(data.rows.length === 1);
                    if (data.rows[0].count > 0)
                        return callback('USERNAME_TAKEN');
                    client.query('INSERT INTO admins (username, email, password) VALUES($1, $2, $3) RETURNING id',
                            [username, email, hashedPassword],
                            function(err, data) {
                                if (err)  {
                                    if (err.code === '23505')
                                        return callback('USERNAME_TAKEN');
                                    else {
                                        console.log=='>>>>>>>>>>';
                                        return callback(err);
                                    }
                                        
                                }

                                assert(data.rows.length === 1);
                                var user = data.rows[0];
                                callback(null);
                            }
                        );
                    });
        }
    , callback);
};

exports.validateUser = function(email, password, callback) {
    assert(email && password);
    query('SELECT * FROM admins WHERE lower(email) = lower($1)', [email], function (err, data) {
        if (err) {
            console.log(err);
            return callback(err);
        }

        if (data.rows.length === 0) {
            console.log(data.rows.length);
            return callback('NO_USER');
        }

        var user = data.rows[0];

        var verified = passwordHash.verify(password, user.password);
        if (!verified)
            return callback('WRONG_PASSWORD', user.id);
        callback(null, user);
    });
};

exports.getUsers = function (callback) {
    query('SELECT * FROM users', function (err, data){
        if (err) {
            console.error(err);
            return callback(err, null);
        }
        if (data.rows)
        return callback(null, data.rows);
    });
}
exports.updateUser = function (userData, callback) {
    var hashedPassword = passwordHash.generate(userData.password);
    query('UPDATE users SET email = $1, password = $2  WHERE id = $3', [userData.email, hashedPassword, userData.id], function(err, res) {
        if (err) {
            console.error(err);
            return callback(err, null);
        }
        assert(res.rowCount === 1);
        callback(null);
    });
}
// exports.addUsers = function (userData, callback) {
//     query('SELECT * FROM users WHERE username = $1 OR email = $2', [userData.name, userData.email], function(err, result){
//         if (err) {
//             console.error(err);
//             return callback(err, null);
//         }
//         if (result.rows > 0) {
//             return callback('please use other info');
//         }
//         query('INSERT INTO users (id, created, username, email, password, coin_address, balance_satoshis, balance_usd, gross_profit) ')
//         query('INSERT INTO recovery (id, user_id, ip)  values($1, $2, $3)', [recoveryId, userId, ipAddress], function(err, res) {
//             if (err) return callback(err);
//             callback(null, recoveryId);
//         });
//     });
// }
exports.getTransactions = function(callback) {
    query("SELECT * FROM transactions", function(err, result) {
        if (err) return callback(err);
        var data = result.rows;
        query("SELECT id, username FROM users", function(err1, result1){
            if(err) {
                console.error(err1);
                return callback(error1);
            }
            var users = result1.rows;
            for (let i=0; i < data.length; i++) {
                for (let j=0; j < users.length; j++){
                    if(data[i].id === users[j].id) {
                        data[i]['username'] = users[j].username;
                        data[i]['transaction_type'] = (data[i]['transaction_type'] === 0 ? 'deposit' : 'withdraw' ); 
                    }
                }
            }
            return callback(null, data);
        });
    });
};
exports.getChats = function(callback) {
    query("SELECT * FROM chat_messages", function(err, result) {
        if (err) return callback(err);
        var data = result.rows;
        query("SELECT id, username FROM users", function(err1, result1){
            if(err) {
                console.error(err1);
                return callback(error1);
            }
            var users = result1.rows;
            for (let i=0; i < data.length; i++) {
                for (let j=0; j < users.length; j++){
                    if(data[i]['user_id'] === users[j].id) {
                        data[i]['username'] = users[j].username;
                        data[i]['is_bot'] = (data[i]['is_bot'] === false ? 'human' : 'bot' ); 
                    }
                }
            }
            return callback(null, data);
        });
    });
};
exports.getGames = function(callback) {
    query("SELECT * FROM games", function(err, result) {
        if (err) return callback(err);
        var data = result.rows;
        query("SELECT id, username FROM users", function(err1, result1){
            if(err) {
                console.error(err1);
                return callback(error1);
            }
            var users = result1.rows;
            for (let i=0; i < data.length; i++) {
                data[i]['ended'] = (data[i]['ended'] === false ? 'false' : 'true' ); 
            }
            return callback(null, data);
        });
    });
};
exports.getPlays = function(callback) {
    query("SELECT * FROM plays", function(err, result) {
        if (err) return callback(err);
        var data = result.rows;
        query("SELECT id, username FROM users", function(err1, result1){
            if(err) {
                console.error(err1);
                return callback(error1);
            }
            var users = result1.rows;
            for (let i=0; i < data.length; i++) {
                for (let j=0; j < users.length; j++){
                    if(data[i]['user_id'] === users[j].id) {
                        data[i]['username'] = users[j].username;
                    }
                }
            }
            return callback(null, data);
        });
    });
};
exports.getTransfers = function(callback) {
    query("SELECT * FROM transfers", function(err, result) {
        if (err) return callback(err);
        var data = result.rows;
        query("SELECT id, username FROM users", function(err1, result1){
            if(err) {
                console.error(err1);
                return callback(error1);
            }
            var users = result1.rows;
            for (let i=0; i < data.length; i++) {
                for (let j=0; j < users.length; j++){
                    if(data[i]['from_user_id'] === users[j].id) {
                        data[i]['from_user_name'] = users[j].username;
                    }
                    if(data[i]['to_user_id'] === users[j].id) {
                        data[i]['to_user_name'] = users[j].username;
                    }
                }
            }
            return callback(null, data);
        });
    });
};
exports.deleteUser = function(condition, callback) {
    query("DELETE FROM users WHERE id = $1", [condition.id], function(err, result) {
        if(err) {
            console.error(err);
            callback(err);
        }
        return callback(null);
    });
}
exports.deleteTransaction = function(condition, callback) {
    query("DELETE FROM transactions WHERE id = $1", [condition.id], function(err, result) {
        if(err) {
            console.error(err);
            callback(err);
        }
        return callback(null);
    });
}
exports.deleteChat = function(condition, callback) {
    query("DELETE FROM chat_messages WHERE id = $1", [condition.id], function(err, result) {
        if(err) {
            console.error(err);
            callback(err);
        }
        return callback(null);
    });
}
exports.deletePlay = function(condition, callback) {
    query("DELETE FROM plays WHERE id = $1", [condition.id], function(err, result) {
        if(err) {
            console.error(err);
            callback(err);
        }
        return callback(null);
    });
}
exports.deleteTransfer = function(condition, callback) {
    query("DELETE FROM transfers WHERE id = $1", [condition.id], function(err, result) {
        if(err) {
            console.error(err);
            callback(err);
        }
        return callback(null);
    });
}