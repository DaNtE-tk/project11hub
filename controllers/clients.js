var express = require('express');
require("dotenv").config();
const Match = require("../model/mcreate");
const User = require("../model/user");
const Session = require("../model/session");
const records = require("../model/mrecord");
const Ledger = require("../model/ledger");
const match_bhav = require("../model/mbhav");
const Bet = require("../model/bets");
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

app.use(function(req, res, next) {
  res.locals.user = req.session.userdetail;
  next();
});


app.post("/login", upload.none(), async (req,res)=>{
   try{
       const {uid,password} = req.body;
       if(!(uid&&password)){
           res.status(400).send({status:400,message:"Input insufficient",success:false,data:null});
       }
       const user = await User.findOne({uid:uid,password:password,status:"active"}).exec();
       console.log(user);
       if(!user){
          res.status(401).json({status:401,message:"Invalid Credentials",success:false}); 
       }
       const token = jwt.sign(
      { user_id: user._id, uid:user.uid, role:user.role},
      process.env.TOKEN_KEY,
      {
        expiresIn: "20h",
      }
    );
    user.token = token;
      res.status(200).json({status:200, message:"Client logged-in", success:true, data:user});
   } catch(err){
       console.log(err);
       res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

app.get("/in-play",sessionCheck.isClient, upload.none(), async(req,res)=>{
   try{
       const matches = await Match.find({status:"active"});
       console.log(matches.count);
       if(matches.length<1){
           res.status(400).json({status:400,message:"No match in-play",success:true,data:null});
       }else{
           res.status(200).json({status:200,message:"Matches in-play",success:true,data:matches});
       }
   } catch(err){
       console.log(err);
       res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

// MATCH SECTION
app.get('/match', sessionCheck.isClient, upload.none(), async (req,res)=>{
   try{
       const match_id = req.body.match_id;
       const match = await Match.findOne({market_id:match_id});
       if(!match){
           res.status(400).json({status:400,message:"No match corresponds to this match_id",success:false,data:null});
       }else{
           res.status(200).json({status:200,message:"Match data found",success:true,data:match});
       }
   } catch(err){
       console.log(err);
       res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});


var rate=0.00;
var toppos=0;
var botpos=0;


function bid(rate, amount,mode,state){
     amount = parseInt(amount);
       if(state=='top'){
            if(mode=='L'||mode=='l'){
                toppos += rate*amount;
                botpos += (-1)*amount;
            }
            else if(mode=='K'||mode=='k'){
             toppos += rate*amount*(-1);
             botpos += amount;
            }   
        }
        else if(state=='bottom'){
            if(mode=='L'||mode=='l'){
                toppos += (-1)*amount;
                botpos += rate*amount;
            }
            else if(mode=='K'||mode=='k'){
                toppos += amount;
                botpos += rate*amount*(-1);
            }
        };
        return [toppos.toFixed(0), botpos.toFixed(0)];
};

app.post("/match-bid",sessionCheck.isClient ,upload.none(), async (req, res) => {
    try {
     var { market_id, rate, amount, mode, state } = req.body;
     console.log(market_id,rate,amount,mode,state);
    if(!(rate, amount && mode && state)){
        return res.status(400).json({status:400, message:"All input is required",success:false,data:null});
    }
    rate = parseFloat(rate);
    amount = parseInt(amount);
    var result = bid(rate, amount, mode, state);

    const data = [result[0], result[1]] ;
    console.log(data);
    console.log(req.user.uid);
    const id = await Bet.estimatedDocumentCount()+1;
    
    const bet = await Bet.create({
        id,
        bet_type:"match",
        client_uid:req.user.uid,
        market_id,
        rate,
        amount,
        mode,
        state,
        top_position:result[0],
        bottom_position:result[1]
    });
    res.status(201).json({status:201,message:"Bet placed",data:bet});
     }catch(err){
         console.log(err);
         res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
     }
});

app.post("/session-bid",sessionCheck.isClient,upload.none(), async (req,res)=>{
   try{
       var {market_id,session_id,amount} = req.body;
       if(!(market_id&&session_id)){
           res.status(400).json({status:400,message:"In-sufficient data",success:false,data:null});
       }else{
           const session = await Session.findOne({id:session_id});
           
           const id = await Bet.estimatedDocumentCount()+1;
           await Bet.create({
               id,
               market_id,
               client_uid:req.user.uid,
               bet_type:"session",
               amount,
               name:session.name
           });
           const bet = await Bet.find({id});
           console.log(bet);
           res.status(201).json({status:201,message:"Bet placed",success:true,data:bet});
       }
   } catch(err){
       console.log(err);
       res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

app.get("/bets",sessionCheck.isClient,upload.none(), async(req,res)=>{
   try{
       const {market_id} = req.body;
       const uid = req.user.uid;
       const bets = await Bet.find({uid,market_id});
       if(bets.length<1){
           res.status(400).json({status:400,message:"No bets placed",success:true,data:null});
       }else{
           res.status(200).json({status:200,message:"Bets placed in this match : "+bets.length, success:true,data:bets});
       }
   }catch(err){
         console.log(err);
         res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

app.get("/match-bets",sessionCheck.isClient,upload.none(),async(req,res)=>{
   try{
       const {market_id} = req.body;
       const match = await Match.findOne({market_id});
       if(!match){
           res.status(400).json({status:400,message:"Invalid market_id",success:false,data:null});
       }else{
        const match_bets = await Bet.find({market_id,bet_type:"match"});
       if(match_bets.length<1){
           res.status(400).json({status:400,message:"No match-bets palced",success:false,data:null});
       }else{
           console.log(match_bets);
           res.status(200).json({status:200,message:"Match bets",success:true,data:match_bets});
       }   
       }
   } catch(err){
         console.log(err);
         res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

app.get("/session-bets",sessionCheck.isClient,upload.none(),async(req,res)=>{
   try{
       const {market_id} = req.body;
       const match = await Match.findOne({market_id});
       if(!match){
           res.status(400).send({status:400,message:"Invalid market_id",success:false,data:null});
       }else{
        const session_bets = await Bet.find({market_id,bet_type:"session"});
       if(session_bets.length<1){
           res.status(400).json({status:400,message:"No session-bets palced",success:false,data:null});
       }else{
           console.log(session_bets);
           res.status(200).json({status:200,message:"Session bets",success:true,data:session_bets});
       }   
       }
   } catch(err){
         console.log(err);
         res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

// PROFILE SECTION
app.get("/profile",sessionCheck.isClient,upload.none(), async (req,res)=>{
   try{
       const uid = req.user.uid;
       const user = await User.findOne({uid});
       if(!user){
           res.status(400).json({sttus:400,message:"No user corresponding to this id",success:false,data:null});
       }else{
       res.status(200).json({status:200,message:"client data",success:true,data:user});    
       }
   } catch(err){
         console.log(err);
         res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

app.get("/complete-matches",sessionCheck.isClient,upload.none(),async (req,res)=>{
   try{
       const client_uid = req.user.uid;
       console.log(client_uid);
       const bets = await Bet.find({client_uid});
       if(bets.length<1){
           res.status(400).json({status:400,message:"No bets placed",success:false,data:null});
       }else{
           res.status(200).json({status:200,message:"All bets placed",success:true,data:bets});
       }
   } catch(err){
         console.log(err);
         res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

app.post("/change-password",sessionCheck.isClient, upload.none(), async (req,res)=>{
   try{
       const uid = req.user.uid;
       const {current_pass,new_pass, confirm} = req.body;
       const user = await User.findOne({uid:uid,password:current_pass});
      
      if(!user){
          res.status(409).json({status:409,message:"Enter valid current password",success:false,data:null});
      }else{
       if(new_pass==confirm){
          await User.updateOne({uid},{$set:{password:new_pass}}).exec();
          res.status(201).json({status:201,message:"Password update success",success:true,data:null});
      }
      else{
          res.status(409).json({status:409,message:"Passwords miss-match, enter again.",success:false,data:null});
      }   
      }
   } catch(err){
       console.log(err);
       res.status(500).json({status:500, message:"Internal server error", success:false, data:err});
   }
});

// LEDGER
app.get("/ledger",sessionCheck.isClient, upload.none(), async (req,res)=>{
   try{
       const client_uid = req.user.uid;
       const client = await User.findOne({uid:client_uid});
    //   const credit = Ledger.find({client_uid},{"sum(won)":1});
    //   console.log(credit);
    
    //   Ledger.aggregate([{$group:{_id:"$id","client_uid":{"first":"$client_uid"},"total_credit":{$sum:"$won"}}}],function(err,result){
    //       if(err){
    //           console.log(err);
    //       }else{
    //           console.log(result);
    //       }
    //   });
      const total_credit = 0;
      const total_debit = 0;
      const balance = total_credit+total_debit;
      console.log(client);
       
       
       const data = await Ledger.find({client_uid}).sort({id:-1});
       if(data.length<1){
           res.status(400).json({status:400,message:"No ledger data",success:false,data:null});
       }else{
           res.status(200).json({status:200,message:" Ledger data for client : "+client_uid,success:true,total_credit:total_credit,total_debit:total_debit,balance:balance,data:data});
       }
   } catch(err){
         console.log(err);
         res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   }
});

module.exports = app;