var express = require('express');
require("dotenv").config();
const User = require("../model/user");
const matches = require("../model/mcreate");
const match_bhav = require("../model/mbhav");
const auth = require("../middleware/auth");
var sessionCheck= require('../middleware/tokencheck');
const app = express();
app.use(express.json());
const bcrypt = require("bcryptjs"); 
const jwt = require("jsonwebtoken");
var multer  = require('multer'); 
const path = require('path'); 
var uploads = multer({storage:storage});
var storage = multer.diskStorage({  
destination:(req,file,cb)=>{  
cb(null, path.join(__dirname, '../public/asset/'));
},filename:(req,file,cb)=>{  
cb(null, Date.now() + file.originalname);  
}  
});  
var upload = multer({storage:storage}); 
const fs = require('fs');

app.get('/', function(req, res, next) {
  res.render('admin/login');
});
app.post("/login",upload.none(), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!(email && password)) {
     return res.status(400).send("All input is required");
    }
    const user = await User.findOne({email:email, role:'Super Admin'});
    if(!user){
       return  res.status(400).send("Invalid Credentials"); 
    }
    if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign(
        { user_id: user._id, email:user.email, role:user.role },
        process.env.TOKEN_KEY,
        {
          expiresIn: "20h",
        }
      );
      user.token = token;
      res.status(200).json(user);
    }
  } catch (err) {
    console.log(err);
  }
});

app.get('/logout',(req,res) => {
    req.session.destroy();
    res.redirect('/admin-login/');
});

app.get("/dashbord",sessionCheck.isSuperAdmin, (req, res) => {
  res.render("admin/matches");
});
app.post("/new_match",sessionCheck.isSuperAdmin,async (req, res) => {
    data = await matches.find().exec();
    try{
        console.log(req.body);
        const newmatch = await matches.create({
            id:data.length +1,
            market_id:req.body.market_id,
             insert_type:req.body.insert_type,
            team1:req.body.team1,
            team2:req.body.team2,
            match_type:req.body.match_type,
        });
        res.status(201).json(newmatch);
    } catch (err) {
    console.log(err);
  }
});
app.get("/matchbhav",sessionCheck.isAuth, (req, res) => {
  res.render('admin/mbhav');
});
app.post("/new_bhav",sessionCheck.isSuperAdmin,async (req, res) => {
    const data = await matches.find().exec();
    try{
        console.log(req.body);
        const bhav = await match_bhav.create({
            id:data.length +1,
            market_id:req.body.market_id,
            team1:req.body.team1,
            team2:req.body.team2,
            lagai:req.body.lagai,
            khaai:req.body.khaai,
            insert_type:req.body.insert_type,
            match_amount:req.body.match_amount
        });
        res.status(201).json(bhav);
    } catch (err) {
    console.log(err);
  }
});



module.exports = app;