const {Router} = require('express');
const User = require('../database/schemas/User');
const Code = require('../database/schemas/Code');
const {HashPassword , ComparePassword , GenerateCode} = require('../utils/helpers');
const {mailCode} = require('../utils/mail');
const router = Router();


router.get('/login' , (req , res) => {
    req.session.user = null;
    res.render('login.ejs' , {msg : null});
});

router.get('/register' , (req , res) => {
    req.session.user = null;
    res.render("register.ejs" , {msg : null});
});

router.post('/login' , async (req , res) => {
    const {email , password} = req.body;
    if (email && password) {
        const userDB = await User.findOne({email});
        if (!userDB) return res.status(401).render('login.ejs' , {msg : "Invalid Username / Password"});
        const isValid = await ComparePassword(password , userDB.password);
        if (isValid){
            req.session.user = userDB;
            //res.send(req.session.user);
            return res.redirect('/');
        }
        return res.status(401).render('login.ejs' , {msg : "Invalid Username / Password"});

    }
    else res.sendStatus(400);
});

router.get('/verify' , (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    else if (req.session.user.verified) return res.redirect('/');
    res.render('verify.ejs' , {msg : `Verification code sent to ${req.session.user.email}.`});
});

router.post('/verify' , async (req , res) => {
    if (!req.session.user) return res.redirect('/login');
    else if (req.session.user.verified) return res.redirect('/');
    const code = req.body.code;
    const userCode = await Code.findOne({email : req.session.user.email});
    if (!userCode){
        const code = GenerateCode();
        const newCodeUser = await Code.create({email: req.session.user.email , code});
        mailCode(req.session.user.email , code); 
        return res.render('verify.ejs' , {msg : `Code has expired! We have sent a new code to ${req.session.user.email}.`});
    }
    if (userCode.code == code) 
    {
        const userDB = await User.findOne({email : req.session.user.email});
        if (!userDB) return;
        await userDB.updateOne({verified : true});
        await Code.deleteOne({email: userDB.email});
        userDB.verified = true;
        req.session.user = userDB;
        return res.redirect('/');
    }
    return res.status(401).render('verify.ejs' , {msg : `Invalid Code!`})
});

router.post('/register' , async (req , res) => {
    const {email , name , password} = req.body;
    if (email && password){
        const userDB = await User.findOne({email});
        if (userDB) return res.status(400).send({msg: 'User Already exists'});
        const code = GenerateCode();
        if (mailCode(email , code))
        {
            const hashedPasswd = await HashPassword(password);
            const newUser = await User.create({email , name ,password :  hashedPasswd , verified:false});
            const newCodeUser = await Code.create({email , code}); 
            req.session.user = {email , name ,password :  hashedPasswd , verified:false};
            return res.redirect('/');
        }
        return res.status(500).render('register.ejs' , {msg: "Couldn't create user"});
    }
    else return res.sendStatus(400);

});

router.post('/delete' , async (req , res) => {
    if (!req.session.user || !req.session.user.verified)
    {
        return res.status(404).redirect('/register');
    }
    await User.deleteOne({email : req.session.user.email});
    req.session.user = null;
    return res.status(200).redirect('/register');
    
});

module.exports = router;