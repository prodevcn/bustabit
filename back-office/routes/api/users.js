const express = require('express');
const assert = require('assert');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');
const validateUpdateUserInput = require('../../validation/updateUser');
var database = require('../../controller/database');

// router.post('/user-add',)
router.post('/register', (req, res) => {
    const { errors, isValid } = validateRegisterInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
        console.log(errors);
    }
    
    var username = req.body.name;
    var password = req.body.password;
    var email = req.body.email;
    
    database.createUser(username, password, email, function(err){
        if(err) {
            console.error('err');
            res.status(400).json(err);
        } else {
            res.status(200).json({status: 'success'}).end();
        }
    }); 
    
});
router.post('/login', (req, res) => {
    const { errors, isValid } = validateLoginInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
    }
    const email = req.body.email;
    const password = req.body.password;
    database.validateUser(email, password, function(err, user) {
        if (err) {
            console.log('[Login] Error for ', email, ' err: ', err);

            if (err === 'NO_USER')
                return res.status(404).json({ email: 'Email not found' });
            if (err === 'WRONG_PASSWORD') {
                // assert(userId);
                return res.status(400).json({password: 'Password incorrect'});
            }
            return next(new Error('Unable to validate user ' + username + ': \n' + err));
        }
        
        const payload = {
            id: user.id,
            name: user.username,
        };
        jwt.sign(
            payload,
            keys.secretOrKey,
            {
                expiresIn: 31556926 // 1 year in seconds
            },
            (err, token) => {
                res.status(200).json({
                    success: true,
                    token: 'Bearer' + token
                });
            }
        ); 
    });   
});


router.post('/user-data', (req, res) => {
    database.getUsers(function(err, users) {
        if (err){
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).send(users);
    })
});

router.post('/user-delete', (req, res) => {
    var condition = req.body;
    database.deleteUser(req.body, function(err){
        if(err) {
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).json({message: 'User deleted successfully. Refreshing data...', success: true})
    });
    // return res.status(200).send()
});
router.post('/user-update', (req, res) => {
    const { errors, isValid } = validateUpdateUserInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
    }
    database.updateUser(req.body, function(err){
        if(err) {
            console.error(err);
            return res.status(400).send(err);
        }
        return res.status(200).json({ message: 'User updated successfully. Refreshing data...', success: true });
    });

});

// router.post('/user-add', (req, res) => {
//     const { errors, isValid } = validateRegisterInput(req.body);
//     if (!isValid) {
//         return res.status(400).json(errors);
//     }
//     database.addUser(req.body, function(err, user){
//         if(err) {
//             console.error(err);
//             res.status(400).json(err);
//         }
//         res.status(200).json({message: 'User added successfully. Refreshing...'})
//     });
//     User.findOne({ email: req.body.email }).then(user => {
//         if (user) {
//             return res.status(400).json({ email: 'Email already exists' });
//         } else {
//             const newUser = new User({
//                 name: req.body.name,
//                 email: req.body.email,
//                 password: req.body.password
//             });
//             bcrypt.genSalt(10, (err, salt) => {
//                 bcrypt.hash(newUser.password, salt, (err, hash) => {
//                     if (err) throw err;
//                     newUser.password = hash;
//                     newUser
//                         .save()
//                         .then(user => {
//                             return res.status(200).json({message: 'User added successfully. Refreshing data...'})
//                         }).catch(err => console.log(err));
//                 });
//             });
//         }
//     });
// });

module.exports = router;