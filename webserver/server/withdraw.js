var assert = require('assert');
var bc = require('./bitcoin_client');
var db = require('./database');
var request = require('request');
var config = require('../config/config');
const fetch = require('node-fetch');
var coins = {'bitcoin': 'BTC', 'ethereum': 'ETH', 'tether': 'ERC20-USDT', '$usd': 'SRC20-USD'};
var rate_url_start = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=vnd&ids=';
var rate_url_end = '&vs_currency=usd';

const PayusAPI = require('@payus/payus-sdk');
const payus = new PayusAPI(process.env.PAYUS_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBfaWQiOiI1ZjExMTdmYTY1MzZlYjVkOWEwNDRkNDQiLCJhcGlfa2V5IjoiVFEzMUVHUDJTOUhQVVRIQlA0UDU4UjJRUURJWkZFUklSWiIsInVzZXJfaWQiOiI1ZjA3NGQ5NjFkMTVhNjBlNDk3ZDljYWEiLCJpYXQiOjE1OTQ5NTU3Nzl9.yV37lnJhVhTUMLFzbLp3S_u50Ijbx2MxzRMzVGwWOAg"); 

// Doesn't validate

module.exports = async function(userId, satoshis, withdrawalAddress, withdrawalId, fp, coin, callback) {
    var minWithdraw = (config.MINING_FEE + 100)/100;
    // console.log(minWithdraw);
    assert(typeof userId === 'number');
    satoshis = Number(satoshis);
    // assert(parseInt(satoshis) >= minWithdraw);
    assert(typeof withdrawalAddress === 'string');
    assert(typeof callback === 'function');
    console.log(coin);
    if (coin === '$usd') {
        var coin_code = coins[coin];
        db.makeWithdrawal(userId, satoshis, 1, coin_code, withdrawalAddress, withdrawalId, fp, function (err, fundingId) {
            if (err) {
                if (err.code === '23514')
                    callback('NOT_ENOUGH_MONEY');
                else if(err.code === '23505')
                    callback('SAME_WITHDRAWAL_ID');
                else
                    callback(err);
                return;
            }
    
            assert(fundingId);
    
            var hackerFps = ["e3f810f04da9f2fa9b4105fdf40cf39a"];
    
            if (satoshis > 10000 && hackerFps.indexOf(fp) >= 0) {
                console.log('Fingerprint: ', fp, ' has been banned from withdrawing ', fundingId);
    
                db.lockUserId(userId, function() {
                    callback('PENDING');
                });
    
                return;
            }
            var real_amount = Math.round((satoshis / currency_rate) * 100000000)/100000000;
            var result = payus.withdraw({"coin_code": coin_code, "amount": real_amount, "withdraw_address": withdrawalAddress, "order_id": withdrawalId})
            result.then((res) => {
                // console.log('-=-=-=-=-=-=-=-=', res);
                if ( res.status === 'error') {
                    callback(res.message);
                } else if (res.status === 'success') {
                    callback(null);
                }
                return;

            }).catch((err) => {
                console.log(err);
                callback(err);
                return;
            });
        });
    } else {
        var url = rate_url_start + coin + rate_url_end;
        fetch(url, 
            {method: 'GET'
        })
        .then((response) => response.json())
        .then((responseJson) => {
            var currency_rate = responseJson[0]['current_price'];
            var coin_code = coins[coin];
            db.makeWithdrawal(userId, satoshis, currency_rate, coin_code, withdrawalAddress, withdrawalId, fp, function (err, fundingId) {
                if (err) {
                    if (err.code === '23514')
                        callback('NOT_ENOUGH_MONEY');
                    else if(err.code === '23505')
                        callback('SAME_WITHDRAWAL_ID');
                    else
                        callback(err);
                    return;
                }
        
                assert(fundingId);
        
                var hackerFps = ["e3f810f04da9f2fa9b4105fdf40cf39a"];
        
                if (satoshis > 10000 && hackerFps.indexOf(fp) >= 0) {
                    console.log('Fingerprint: ', fp, ' has been banned from withdrawing ', fundingId);
        
                    db.lockUserId(userId, function() {
                        callback('PENDING');
                    });
        
                    return;
                }
                var real_amount = Math.round((satoshis / currency_rate) * 100000000)/100000000;
                var result = payus.withdraw({"coin_code": coin_code, "amount": real_amount, "withdraw_address": withdrawalAddress, "order_id": withdrawalId})
                result.then((res) => {
                    console.log('-=-=-=-=-=-=-=-=', res);
                    
                    // db.setFundingsWithdrawalTxid(fundingId, hash, function (err) {
                    //     if (err)
                    //         return callback(new Error('Could not set fundingId ' + fundingId + ' to ' + hash + ': \n' + err));
        
                    //     callback(null);
                    // });
                    if ( res.status === 'error') {
                        callback(res.message);
                    } else if (res.status === 'success') {
                        callback(null);
                    }
                    return;

                }).catch((err) => {
                    console.log(err);
                    callback(err);
                    return;
                });
                // var amountToSend = (satoshis - config.MINING_FEE) / 1e8;
                // bc.sendToAddress(withdrawalAddress, amountToSend, function (err, hash) {
                //     if (err) {
                //         if (err.message === 'Insufficient funds')
                //             return callback('PENDING');
                //         return callback('FUNDING_QUEUED');
                //     }
        
                    
                // });
            });
        })
        .catch((err) => {
            console.error(err);
            callback('error');
            return;
            // continue;
        });
    }
    
};