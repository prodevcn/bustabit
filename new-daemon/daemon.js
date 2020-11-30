if (process.env.NODE_ENV !== 'production') require('dotenv').config();
process.on('uncaughtException', err => console.error(err, err.stack));
process.on('unhandledRejection', err => console.error(err, err.stack));

var assert = require('better-assert');
var async = require('async');
var db = require('./src/db');
var fs = require('fs');
var rate = ['bitcoin', 'ethereum', 'bitcoin-cash', 'litecoin', 'tether', 'ripple', 'tron', '$usd'];
var rate_url_start = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=vnd&ids=';
var rate_url_end = '&vs_currency=usd';

const PayusAPI = require('@payus/payus-sdk');
const payus = new PayusAPI(process.env.PAYUS_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBfaWQiOiI1ZjExMTdmYTY1MzZlYjVkOWEwNDRkNDQiLCJhcGlfa2V5IjoiVFEzMUVHUDJTOUhQVVRIQlA0UDU4UjJRUURJWkZFUklSWiIsInVzZXJfaWQiOiI1ZjA3NGQ5NjFkMTVhNjBlNDk3ZDljYWEiLCJpYXQiOjE1OTQ5NTU3Nzl9.yV37lnJhVhTUMLFzbLp3S_u50Ijbx2MxzRMzVGwWOAg");
const fetch = require('node-fetch');

var coins = ['BTC', 'ETH', 'BCH', 'LTC', 'ERC20-USDT', 'XRP', 'TRX', 'SRC20-USD'];
fs.writeFileSync('last-transaction-time.txt', '0');

startBlockLoop();

function startBlockLoop() {
    var loop = setInterval( function(){
        blockLoop();
    }, 600000);
    // blockLoop();
}

async function blockLoop() {
    var endTime = Math.round(new Date().getTime()/1000);
    var lastTransactionTime = fs.readFileSync('last-transaction-time.txt', 'utf8');
    var blocks=[];
    var transaction_type = 0; // deposit: 0, withdraw: 1
    var coin_rate = {};
    for(let i=0; i < rate.length; i ++){
        var url = rate_url_start + rate[i] + rate_url_end;
        console.log(url);
        if (i == 7) {
            coin_rate[coins[i]] = 1;
        } else {
            await fetch(url, 
                {method: 'GET'
            })
            .then((response) => response.json())
            .then((responseJson) => {
                // console.log(i, responseJson);
                coin_rate[coins[i]] = responseJson[0]['current_price'];
                // console.log('@@@@@@@@@@@@@222', responseJson[0]['current_price']);
            })
            .catch((err) => {
                console.error(err);
                // continue;
            });
        }
        
    }
    
    // console.log('\\\\\\\\\\\\', coin_rate);
    await db.getUserList(async function(err, userList) {
        for (let i=0; i < coins.length; i++){
              
                var transactions=[];            
                var result = await payus.getDepositTransactions({"coin_code": coins[i], "time": {"start": lastTransactionTime, "end": endTime}}); 
                if (result.status != 'success') continue;
                // console.log(i, result);
                transactions = result.data.transactions;
                if (transactions.length == 0) continue;
                console.log(i, transactions);

                for(let j=0; j < transactions.length; j++) {
                    var transaction={};
                    transaction.coin_code =  coins[i];
                    transaction.amount = transactions[j].amount;
                    transaction.created = transactions[j].timereceived;
                    transaction.from_address = '_';
                    transaction.to_address = transactions[j].address;
                    transaction.txid = transactions[j].txid;
                    // transaction.usd_amount = 1000;
                    transaction.transaction_type = 0;
                    // console.log(transaction);                    
                    for (let index =0; index < userList.length; index ++) {
                        var flag = JSON.stringify(userList[index].coin_addresses).includes(transactions[j].address);
                        if (flag == true) {
                            transaction.userId = userList[index].id;
                            console.log(transaction)
                        }
                    }                    
        //             // console.log(transaction.userId);
                    blocks.push(transaction);    
                    console.log(blocks);                
                }
            
        }
        db.addTransactions(blocks, coin_rate, function(err, res) {
            if (err)
                console.error(err);
            console.log(res);
        });
    });   
    await fs.unlinkSync('last-transaction-time.txt');
    // fs.readFileSync('last-transaction-time.txt');
    fs.writeFileSync('last-transaction-time.txt', String(endTime)); 
       
}