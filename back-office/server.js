if (process.env.NODE_ENV !== 'production') require('dotenv').config();
process.on('uncaughtException', err => console.error(err, err.stack));
process.on('unhandledRejection', err => console.error(err, err.stack));

var config = require('./config/config');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const passport = require('passport');
const users = require('./routes/api/users');
const transactions = require('./routes/api/transactions');
const chats = require('./routes/api/chats');
const plays = require('./routes/api/plays');
const transfers = require('./routes/api/transfers');
const games = require('./routes/api/games');
const fs = require('fs');
const app = express();
const https = require('https');
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(passport.initialize());

app.use('/api/user', users);
app.use('/api/transaction', transactions);
app.use('/api/chat', chats);
app.use('/api/play', plays);
app.use('/api/transfer', transfers);
app.use('/api/game', games);
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', function (req, res){
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const port = config.PORT;
const options = {
	key: fs.readFileSync("/root/ssl/sonicxrocket.com.key"),
	cert: fs.readFileSync("/root/ssl/certificates/sonicxrocket.com.crt")
};

var server = https.createServer(options, app);
server.listen(port, '0.0.0.0', () => console.log(`Server up and running on port ${port} !`));
