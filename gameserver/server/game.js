var assert = require('better-assert');
var async = require('async');
var db = require('./database');
var events = require('events');
var util = require('util');
var _ = require('lodash');
var lib = require('./lib');
var SortedArray = require('./sorted_array');
var config = require('./config');
var fs = require('fs');

var tickRate = 150; // ping the client every X miliseconds
var afterCrashTime = 3000; // how long from game_crash -> game_starting
var restartTime = 5000; // How long from  game_starting -> game_started

function Game(lastGameId, lastHash, bankroll, gameHistory) {
    var self = this;
    self.communityPool = 0;
    fs.readFile('communitypool.txt', 'utf8', function(err, data){
        if (err) return;
        self.communityPool = Number(data);
    });
    fs.readFile('jackpothistory.txt', 'utf8', function(err, data){
        if (err) {
            self.jackpotHistory = [];
            return;
        }
        try {
            self.jackpotHistory = JSON.parse(data);
        } catch (e) {
            self.jackpotHistory = [];
        }
    });
      
    self.bankroll = bankroll;
    self.maxWin;

    self.gameShuttingDown = false;
    self.startTime; // time game started. If before game started, is an estimate...
    self.crashPoint; // when the game crashes, 0 means instant crash
    self.gameDuration; // how long till the game will crash..

    self.forcePoint = null; // The point we force terminate the game

    self.state = 'ENDED'; // 'STARTING' | 'BLOCKING' | 'IN_PROGRESS' |  'ENDED'
    self.pending = {}; // Set of players pending a joined
    self.pendingCount = 0;
    self.joined = new SortedArray(); // A list of joins, before the game is in progress

    self.players = {}; // An object of userName ->  { playId: ..., autoCashOut: .... }
    self.gameId = lastGameId;
    self.gameHistory = gameHistory;

    self.lastHash = lastHash;
    self.hash = null;

    events.EventEmitter.call(self);
    function runGame() {

        db.createGame(self.gameId + 1, function (err, info) {
            if (err) {
                console.log('Could not create game', err, ' retrying in 2 sec..');
                setTimeout(runGame, 2000);
                return;
            }
            
            self.state = 'STARTING';
            self.crashPoint = info.crashPoint;

            if (config.CRASH_AT) {
                assert(!config.PRODUCTION);
                self.crashPoint = parseInt(config.CRASH_AT);
            }

            self.hash = info.hash;
            self.gameId++;
            self.startTime = new Date(Date.now() + restartTime);
            self.players = {}; // An object of userName ->  { user: ..., playId: ..., autoCashOut: ...., status: ... }
            self.gameDuration = Math.ceil(inverseGrowth(self.crashPoint + 1)); // how long till the game will crash..
            self.maxWin = Math.round(self.bankroll * 0.03); // Risk 3% per game

            self.emit('game_starting', {
                game_id: self.gameId,
                max_win: self.maxWin,
                time_till_start: restartTime
            });
            // console.log('info.hash = ', self.hash);
            setTimeout(blockGame, restartTime);
        });
    }

    function communityPoolRun() {
        self.state = 'communitypool';
        let data = [];
        let totalBet = 0;
        let i = 0;
        Object.keys(self.players).forEach(function(player) {
            var record = self.players[player];
            if (record.status === 'CASHED_OUT' && Number(record.stoppedAt) == 999) {                
                data.push([player, record.bet]);
                totalBet += record.bet;
            }
        });

        Object.keys(self.players).forEach(function(player) {
            var record = self.players[player];
            if (record.status === 'CASHED_OUT' && Number(record.stoppedAt) == 999) {                
                data[i++].push(self.communityPool / totalBet * record.bet);
            }
        });
        for (let j = 0; j < i; j++) {
            db.addCommunityPool(data[j][0], data[j][2]);
        }
        self.emit('jackpot_run_starting', {s: 99, names: data});
        setTimeout(function() {
            runGame();
        }, 3000);
    }
    function jackpotRun() {
        self.state = 'jackpot_run_starting';
        self.jackpotState = 1;
        let names = [];
        const firstPeek = 1.5, secondPeek = 5, thirdPeek = 10;        
        let peekValue = 0, jackpotValue = 0;
        if (Number(self.crashPoint) / 100 >= firstPeek) { peekValue = firstPeek; jackpotValue = 2000; }
        if (Number(self.crashPoint) / 100 >= secondPeek) {peekValue = secondPeek; jackpotValue = 5000; }
        if (Number(self.crashPoint) / 100 >= thirdPeek) {peekValue = thirdPeek; jackpotValue = 10000; }
        Object.keys(self.players).forEach(function(player) {
            var record = self.players[player];
            if (record.status === 'CASHED_OUT' && Number(record.stoppedAt) / 100 >= Number(peekValue)) {
                names.push(player);
            }
        });

        if (names.length == 0) {
            self.emit('jackpot_run_starting', {s: 14, names: {names: 'NO PLAYER SELECTED'}} );
            setTimeout(function() {
                self.emit('jackpot_run_starting', {s: 14, names: {names: 'RUNNING BACK INTO GAME!'}} );
                setTimeout(function() {
                    runGame();
                }, 2000);
            }, 2000);
            return;
        }

        self.emit('jackpot_run_starting', {s: 1});
        let s = 2;
        let k = setInterval(function() {
            self.jackpotState = s;
            self.emit('jackpot_run_starting', {s : s++});
            if (s == 10) clearInterval(k);
        }, 1000);
        // let names = ['this', 'testname', 'goodone', 'john', 'break'];

        let nameCount = parseInt(Math.random() * 10000000) % 15 + 15;
        setTimeout(() => {
            self.emit('jackpot_run_starting', {s : 11, names: {names, count: nameCount}});
        }, 10000);
        setTimeout(() => {
            self.emit('jackpot_run_starting', {s : 12, names: {names: names[(nameCount - 1 + names.length) % names.length], count: nameCount}});
        }, 11000 + nameCount * 600);

        setTimeout(() => {
            let wheelList = [
                {text: "1", color: Math.random() > 0.5 ? 'cyan' : 'brown'},                    
                {text: "RESPIN", color: Math.random() > 0.5 ? 'green': 'pink'},
                {text: "3", color: Math.random() > 0.5 ? 'brown' : '#4B0082'},
                {text: "4", color: Math.random() > 0.5 ? 'cyan': '#1E90FF'},
                {text: "5", color: Math.random() > 0.5 ? 'brown' : '#FF1493'},
                {text: "6", color: Math.random() > 0.5 ? 'pink' : '#9932CC'},
                {text: "7", color: Math.random() > 0.5 ? 'purple' : '#8B008B'},
                {text: "JACKPOT", color: 'yellow,orange'},
                {text: "9", color: Math.random() > 0.5 ? 'pink' : '#B8860B'},
                {text: "a", color: Math.random() > 0.5 ? 'brown' : '#DC143C'},
                {text: "b", color: Math.random() > 0.5 ? 'pink' : '#D2691E'},
                {text: "RESPIN", color: Math.random() > 0.5 ? 'green' : '#5F9EA0'},
                {text: "c", color: Math.random() > 0.5 ? 'cyan' : 'pink'},
                {text: "d", color: Math.random() > 0.5 ? 'green' : 'lightblue'},
            ];
            for (let ik in wheelList) {
                if (wheelList[ik].text.length == 1) wheelList[ik].text = "0 mBTC";
            }
            let selected = -1;
            while (selected == -1 || wheelList[selected].text == 'RESPIN') {
                selected = parseInt(Math.random() * 100000000) % wheelList.length;
            }
            selected = 7;
            const totalAngle = (wheelList.length - selected - 0.5) / wheelList.length * 360.0 + 270 + 720 + (Math.random() - 0.5) * 360 / wheelList.length / 1.1
            let jackAngle = 1;
            self.emit('jackpot_run_starting', {s : 13, names: {
                names: names[(nameCount - 1 + names.length) % names.length], 
                count: nameCount,
                destinationAngle: totalAngle,
                list: wheelList
            }});
            
            let jackCircleTimer = setInterval(function() {      
                let acc;
                if (totalAngle - jackAngle < 5) acc = 0.03;
                else if (totalAngle - jackAngle < 15) acc = 0.04;
                else if (totalAngle - jackAngle < 25) acc = 0.05;            
                else if (totalAngle - jackAngle < 45) acc = 0.07;
                else if (totalAngle - jackAngle < 70) acc = 0.11;            
                else if (totalAngle - jackAngle < 90) acc = 0.12;
                else acc = Math.max(0.15, (totalAngle - jackAngle) / totalAngle);
                jackAngle += acc;

                if (jackAngle >= totalAngle) {
                    clearInterval(jackCircleTimer);
                    setTimeout(function() {
                        if (wheelList[selected].text == '0 mBTC') {
                            self.emit('jackpot_run_starting', {s : 14, names: {
                                names: "OUT OF LUCK"
                            }});
                            setTimeout(function() {
                                self.emit('jackpot_run_starting', {s : 14, names: {
                                    names: "TRY BETTER NEXT TIME!"
                                }});
                                setTimeout(function() {
                                    runGame();
                                }, 2000);
                            }, 1000);
                        } else if (wheelList[selected].text == 'JACKPOT') {
                            self.emit('jackpot_run_starting', {s : 14, names: {
                                names: names[(nameCount - 1 + names.length) % names.length] + " WON " + (jackpotValue * 0.9) + "$USD",
                                showGraph: true,
                                list: wheelList,
                                destinationAngle: totalAngle,
                                pValue: {name: names, index: (nameCount - 1 + names.length) % names.length, v: jackpotValue * 100}
                            }});
                            
                            let type = '';
                            if (self.crashPoint >= thirdPeek * 100) type = "MEGA";
                            else if (self.crashPoint >= secondPeek * 100) type = "MAJOR";
                            else if (self.crashPoint >= firstPeek * 100) type = "MINI";

                            self.jackpotHistory.push({username: names[(nameCount - 1 + names.length) % names.length], time : new Date().getTime(), value: type, prize: jackpotValue * 90});
                            for (let kkk = 0; kkk < names.length; kkk++) {
                                if (kkk != (nameCount - 1 + names.length) % names.length) {
                                    self.jackpotHistory.push({username: names[(nameCount - 1 + names.length) % names.length], time : new Date().getTime(), value: type, prize: jackpotValue * 10 / (names.length - 1)});
                                }
                            }                            
                            fs.writeFile('jackpothistory.txt', JSON.stringify(self.jackpotHistory), (err, r) => {});
                            db.addJackpot(names, (nameCount - 1 + names.length) % names.length, jackpotValue * 100, null);                            
                            setTimeout(function() {
                                self.emit('jackpot_run_starting', {s : 14, names: {
                                    showGraph: true,
                                    list: wheelList,
                                    destinationAngle: totalAngle,
                                    names: "CONGRATULATIONS!"
                                }});
                                setTimeout(function() {
                                    runGame();
                                }, 3000);
                            }, 2000);
                        } else {
                            self.emit('jackpot_run_starting', {s : 14, names: {
                                names: "OH NO " + wheelList[selected].text + " " + selected
                            }});
                            setTimeout(function() {
                                runGame();
                            }, 3000);
                        }
                    }, 8000);
                }
              }, 3);
        }, 13000 + nameCount * 600);
    }

    function blockGame() {
        self.state = 'BLOCKING'; // we're waiting for pending bets..
        // console.log('blockGame');
        loop();
        function loop() {
            if (self.pendingCount > 0) {
                console.log('Delaying game by 100ms for ', self.pendingCount , ' joins');
                return setTimeout(loop, 100);
            }
            startGame();
        }
    }

    function startGame() {
        self.state = 'IN_PROGRESS';
        self.startTime = new Date();
        self.pending = {};
        self.pendingCount = 0;
        // console.log(self.state);
        var bets = {};
        var arr = self.joined.getArray();
        for (var i = 0; i < arr.length; ++i) {
            var a = arr[i];
            bets[a.user.username] = a.bet;
            self.players[a.user.username] = a;
        }

        self.joined.clear();

        self.emit('game_started', bets);

        self.setForcePoint();

        callTick(0);
    }

    function callTick(elapsed) {
        var left = self.gameDuration - elapsed;
        var nextTick = Math.max(0, Math.min(left, tickRate));

        setTimeout(runTick, nextTick);
    }


    function runTick() {

        var elapsed = new Date() - self.startTime;
        var at = growthFunc(elapsed);

        self.runCashOuts(at);

        if (self.forcePoint <= at && self.forcePoint <= self.crashPoint) {
            self.cashOutAll(self.forcePoint, function (err) {
                console.log('Just forced cashed out everyone at: ', self.forcePoint, ' got err: ', err);

                endGame(true);
            });
            return;
        }

        // and run the next

        if (at > self.crashPoint)
            endGame(false); // oh noes, we crashed!
        else
            tick(elapsed);
    }

    function endGame(forced) {
        var gameId = self.gameId;
        var crashTime = Date.now();

        assert(self.crashPoint == 0 || self.crashPoint >= 100);

        var bonuses = [];

        if (self.crashPoint !== 0) {
            bonuses = calcBonuses(self.players);

            var givenOut = 0;
            Object.keys(self.players).forEach(function(player) {
                var record = self.players[player];

                givenOut += record.bet * 0.01;
                self.communityPool += record.bet * 0.001;
                if (record.status === 'CASHED_OUT') {
                    var given = record.stoppedAt * (record.bet / 100);
                    assert(lib.isInt(given) && given > 0);
                    givenOut += given;
                }
            });
            self.bankroll -= givenOut;
        }

        Object.keys(self.players).forEach(function(player) {
            var record = self.players[player];
            self.communityPool += record.bet * 0.001;
        });
        fs.writeFile('communitypool.txt', "" + self.communityPool, () => {});

        var playerInfo = self.getInfo().player_info;
        var bonusJson = {};
        bonuses.forEach(function(entry) {
            bonusJson[entry.user.username] = entry.amount;
            playerInfo[entry.user.username].bonus = entry.amount;
        });

        self.lastHash = self.hash;

        // oh noes, we crashed!
        self.emit('game_crash', {
            forced: forced,
            elapsed: self.gameDuration,
            game_crash: self.crashPoint, // We send 0 to client in instant crash
            bonuses: bonusJson,
            hash: self.lastHash
        });

        self.gameHistory.addCompletedGame({
            game_id: gameId,
            game_crash: self.crashPoint,
            created: self.startTime,
            player_info: playerInfo,
            hash: self.lastHash
        });
 
        var dbTimer;
        dbTimeout();
        function dbTimeout() {
            dbTimer = setTimeout(function() {
                console.log('Game', gameId, 'is still ending... Time since crash:',
                            ((Date.now() - crashTime)/1000).toFixed(3) + 's');
                dbTimeout();
            }, 1000);
        }

        db.endGame(gameId, bonuses, function(err) {
            if (err)
                console.log('ERROR could not end game id: ', gameId, ' got err: ', err);
            clearTimeout(dbTimer);

            if (self.gameShuttingDown)
                self.emit('shutdown');
            else { /*#####*/
                const firstPeek = 1.5, secondPeek = 5, thirdPeek = 10;
                if (self.crashPoint == 999) {
                    setTimeout(communityPoolRun, 1000);
                } else if (self.crashPoint >= firstPeek * 100)  {
                    setTimeout(jackpotRun, (crashTime + afterCrashTime) - Date.now());
                } else 
                    setTimeout(runGame, (crashTime + afterCrashTime) - Date.now());
            }
        });

        self.state = 'ENDED';
    }


    function tick(elapsed) {
        self.emit('game_tick', elapsed);
        callTick(elapsed);
    }

    runGame();
}

util.inherits(Game, events.EventEmitter);

Game.prototype.getInfo = function() {

    var playerInfo = {};

    for (var username in this.players) {
        var record = this.players[username];

        assert(lib.isInt(record.bet));
        var info = {
            bet: record.bet
        };

        if (record.status === 'CASHED_OUT') {
            assert(lib.isInt(record.stoppedAt));
            info['stopped_at'] = record.stoppedAt;
        }

        playerInfo[username] = info;
    }


    var res = {
        state: this.state,
        player_info: playerInfo,
        game_id: this.gameId, // game_id of current game, if game hasnt' started its the last game
        last_hash: this.lastHash,
        max_win: this.maxWin,
        // if the game is pending, elapsed is how long till it starts
        // if the game is running, elapsed is how long its running for
        /// if the game is ended, elapsed is how long since the game started
        elapsed: Date.now() - this.startTime,
        created: this.startTime,
        joined: this.joined.getArray().map(function(u) { return u.user.username; })
    };

    if (this.state === 'ENDED')
        res.crashed_at = this.crashPoint;

    return res;
};

// Calls callback with (err, booleanIfAbleToJoin)
Game.prototype.placeBet = function(user, betAmount, autoCashOut, callback) {
    var self = this;

    assert(typeof user.id === 'number');
    assert(typeof user.username === 'string');
    assert(lib.isInt(betAmount));
    assert(lib.isInt(autoCashOut) && autoCashOut >= 100);

    if (self.state !== 'STARTING')
        return callback('GAME_IN_PROGRESS');

    if (lib.hasOwnProperty(self.pending, user.username) || lib.hasOwnProperty(self.players, user.username))
        return callback('ALREADY_PLACED_BET');

    self.pending[user.username] = user.username;
    self.pendingCount++;

    db.placeBet(betAmount, autoCashOut, user.id, self.gameId, function(err, playId) {
        self.pendingCount--;

        if (err) {
            if (err.code == '23514' || err.sqlState == '23514') // constraint violation
                return callback('NOT_ENOUGH_MONEY');

            console.log('[INTERNAL_ERROR] could not play game, got error: ', err);
            callback(err);
        } else {
            assert(playId > 0);
            self.bankroll += betAmount;

            var index = self.joined.insert({ user: user, bet: betAmount, autoCashOut: autoCashOut, playId: playId, status: 'PLAYING' });

            self.emit('player_bet',  {
                username: user.username,
                index: index
            });

            callback(null);
        }
    });
};


Game.prototype.doCashOut = function(play, at, callback) {
    assert(typeof play.user.username === 'string');
    assert(typeof play.user.id == 'number');
    assert(typeof play.playId == 'number');
    assert(typeof at === 'number');
    assert(typeof callback === 'function');

    var self = this;

    var username = play.user.username;

    assert(self.players[username].status === 'PLAYING');
    self.players[username].status = 'CASHED_OUT';
    self.players[username].stoppedAt = at;

    var won = (self.players[username].bet / 100) * at;
    assert(lib.isInt(won));

    self.emit('cashed_out', {
        username: username,
        stopped_at: at
    });

    db.cashOut(play.user.id, play.playId, won, function(err) {
        if (err) {
            console.log('[INTERNAL_ERROR] could not cash out: ', username, ' at ', at, ' in ', play, ' because: ', err);
            return callback(err);
        }

        callback(null);
    });
};

Game.prototype.runCashOuts = function(at) {
    var self = this;

    var update = false;
    // Check for auto cashouts

    Object.keys(self.players).forEach(function (playerUserName) {
        var play = self.players[playerUserName];

        if (play.status === 'CASHED_OUT')
            return;

        assert(play.status === 'PLAYING');
        assert(play.autoCashOut);

        if (play.autoCashOut <= at && play.autoCashOut <= self.crashPoint && play.autoCashOut <= self.forcePoint) {

            self.doCashOut(play, play.autoCashOut, function (err) {
                if (err)
                    console.log('[INTERNAL_ERROR] could not auto cashout ', playerUserName, ' at ', play.autoCashOut);
            });
            update = true;
        }
    });

    if (update)
        self.setForcePoint();
};

Game.prototype.setForcePoint = function() {
   var self = this;

   var totalBet = 0; // how much satoshis is still in action
   var totalCashedOut = 0; // how much satoshis has been lost

   Object.keys(self.players).forEach(function(playerName) {
       var play = self.players[playerName];

       if (play.status === 'CASHED_OUT') {
           var amount = play.bet * (play.stoppedAt - 100) / 100;
           totalCashedOut += amount;
       } else {
           assert(play.status == 'PLAYING');
           assert(lib.isInt(play.bet));
           totalBet += play.bet;
       }
   });

   if (totalBet === 0) {
       self.forcePoint = Infinity; // the game can go until it crashes, there's no end.
   } else {
       var left = self.maxWin - totalCashedOut - (totalBet * 0.01);

       var ratio =  (left+totalBet) / totalBet;

       // in percent
       self.forcePoint = Math.max(Math.floor(ratio * 100), 101);
   }

};

Game.prototype.cashOut = function(user, callback) {
    var self = this;

    assert(typeof user.id === 'number');

    if (this.state !== 'IN_PROGRESS')
        return callback('GAME_NOT_IN_PROGRESS');

    var elapsed = new Date() - self.startTime;
    var at = growthFunc(elapsed);
    var play = lib.getOwnProperty(self.players, user.username);

    if (!play)
        return callback('NO_BET_PLACED');

    if (play.autoCashOut <= at)
        at = play.autoCashOut;

    if (self.forcePoint <= at)
        at = self.forcePoint;


    if (at > self.crashPoint)
        return callback('GAME_ALREADY_CRASHED');

    if (play.status === 'CASHED_OUT')
        return callback('ALREADY_CASHED_OUT');

    self.doCashOut(play, at, callback);
    self.setForcePoint();
};

Game.prototype.cashOutAll = function(at, callback) {
    var self = this;

    if (this.state !== 'IN_PROGRESS')
        return callback();

    console.log('Cashing everyone out at: ', at);

    assert(at >= 100);

    self.runCashOuts(at);

    if (at > self.crashPoint)
        return callback(); // game already crashed, sorry guys

    var tasks = [];

    Object.keys(self.players).forEach(function(playerName) {
        var play = self.players[playerName];

        if (play.status === 'PLAYING') {
            tasks.push(function (callback) {
                if (play.status === 'PLAYING')
                    self.doCashOut(play, at, callback);
                else
                    callback();
            });
        }
    });

    console.log('Needing to force cash out: ', tasks.length, ' players');

    async.parallelLimit(tasks, 4, function (err) {
        if (err) {
            console.error('[INTERNAL_ERROR] unable to cash out all players in ', self.gameId, ' at ', at);
            callback(err);
            return;
        }
        console.log('Emergency cashed out all players in gameId: ', self.gameId);

        callback();
    });
};

Game.prototype.shutDown = function() {
    var self = this;

    self.gameShuttingDown = true;
    self.emit('shuttingdown');

    // If the game has already ended, we can shutdown immediately.
    if (this.state === 'ENDED') {
        self.emit('shutdown');
    }
};

/// returns [ {playId: ?, user: ?, amount: ? }, ...]
function calcBonuses(input) {
    // first, lets sum the bets..

    function sortCashOuts(input) {
        function r(c) {
            return c.stoppedAt ? -c.stoppedAt : null;
        }

        return _.sortBy(input, r);
    }

    // slides fn across array, providing [listRecords, stoppedAt, totalBetAmount]
    function slideSameStoppedAt(arr, fn) {
        var i = 0;
        while (i < arr.length) {
            var tmp = [];
            var betAmount = 0;
            var sa = arr[i].stoppedAt;
            for (; i < arr.length && arr[i].stoppedAt === sa; ++i) {
                betAmount += arr[i].bet;
                tmp.push(arr[i]);
            }
            assert(tmp.length >= 1);
            fn(tmp, sa, betAmount);
        }
    }

    var results = [];

    var sorted = sortCashOuts(input);

    if (sorted.length  === 0)
        return results;

    var bonusPool = 0;
    var largestBet = 0;

    for (var i = 0; i < sorted.length; ++i) {
        var record = sorted[i];

        assert(record.status === 'CASHED_OUT' || record.status === 'PLAYING');
        assert(record.playId);
        var bet = record.bet;
        assert(lib.isInt(bet));

        bonusPool += bet / 100;
        assert(lib.isInt(bonusPool));

        largestBet = Math.max(largestBet, bet);
    }

    var maxWinRatio = bonusPool / largestBet;

    slideSameStoppedAt(sorted,
        function(listOfRecords, cashOutAmount, totalBetAmount) {
            if (bonusPool <= 0)
                return;

            var toAllocAll = Math.min(totalBetAmount * maxWinRatio, bonusPool);

            for (var i = 0; i < listOfRecords.length; ++i) {
                var toAlloc = Math.round((listOfRecords[i].bet / totalBetAmount) * toAllocAll);

                if (toAlloc <= 0)
                    continue;

                bonusPool -= toAlloc;

                var playId = listOfRecords[i].playId;
                assert(lib.isInt(playId));
                var user = listOfRecords[i].user;
                assert(user);

                results.push({
                    playId: playId,
                    user: user,
                    amount: toAlloc
                });
            }
        }
    );

    return results;
}


function growthFunc(ms) {
    var r = 0.00006;
    return Math.floor(100 * Math.pow(Math.E, r * ms));
}

function inverseGrowth(result) {
    var c = 16666.666667;
    return c * Math.log(0.01 * result);
}

module.exports = Game;
