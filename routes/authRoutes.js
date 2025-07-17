const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewear/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/userprofile/:id', authController.userProfile);
router.get('/logout', authController.logout);
router.get('/getuser',auth,authController.getUser); 
router.post('/addbalance', authController.addBalance);  

module.exports = router;