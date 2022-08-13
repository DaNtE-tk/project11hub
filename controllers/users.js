var express = require('express');
require("dotenv").config();
const User = require("../model/user");
const Bid = require("../model/bid");
const matches = require("../model/mcreate");
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


// ////REGISTRATION//////
app.post("/register",upload.none(), async (req, res, next) => {
  try {
    const { first_name, last_name, email, password,role} = req.body;
    if (!(email && password && first_name && last_name)) {
      res.status(400).send("All input is required");
    }
    const oldUser = await User.findOne({ email });
    if (oldUser) {
        console.log(oldUser);
      return res.status(409).json({status:409, message:"User Already Exist. Please Login", success:false, data:oldUser});
    }
    encryptedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      first_name,
      last_name,
      role,
      email: email.toLowerCase(),
      password: encryptedPassword,
     
    });
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "20h",
      }
    );
    user.token = token;
    return res.status(409).json({status:201, message:"User creation successful", success:true, data:user});
  } catch (err) {
    console.log(err);
  }
});

// /////USER LOGIN/////////
app.post("/login",upload.none(), async (req, res) => {
  try {
    const {uid,password} = req.body;
    if (!(uid && password)) {
     return res.status(400).send("All input is required");
    }
    const user = await User.findOne({uid:uid,status:"active"});
    console.log(user);
    if(!user){
       return  res.status(400).send("Invalid Credentials"); 
    }
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { user_id: user._id, uid:user.uid, role:user.role },
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

// /////////CO-ADMIN/////////////////
// app.get("/coadmin",sessionCheck.isCoadmin, (req,res)=>{
//   try{
//       var user = 'COADMIN LOGGED-IN';
//       res.status(200).json(user);
//   } catch(err){
//       res.status(400).json(err);
//   }
// });

// ///// UID CREATION FUNCTION ///////////
function uidcreate(level,count){
    let name_ext;
    switch(level) {
  case 'subadmin':
      name_ext='SUB';
      break;
  case 'master':
      name_ext='MA';
      break;
  case 'super agent':
      name_ext='SA';
      break;
  case 'agent':
      name_ext='A'
      break;
  case 'client':
      name_ext='C'
      break;
}
// return name_ext;
    const uid = name_ext+count;
    return uid;
};

// ///////SUB-ADMIN///////////////////
app.get("/subadmin",sessionCheck.isSubadmin,upload.none(), async (req,res)=>{
    try{
       res.status(200).json({status:200, message:'SUBADMIN LOGGED-IN',success:true});
   } catch(err){
       console.log(err);
       res.status(400).json({status:400, message:err, success:false, data:null});
   }
});


app.post("/subadmin/subadmin-downline",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
    owner_uid = req.user.uid;
    role = req.body.role
    const users = await User.find({createdBy:owner_uid,role:role});
    if(users.length<1){
            res.status(400).send({status:400,message:"No child users found!",success:false,data:null});
        }
    else{
        res.status(200).json({status:200,message:"Downline line of subadmin "+owner_uid+" for role : "+role,success:true,data:users});
        }

    }catch(err){
        console.log(err);
        res.status(500).json({status:500,message:"Internal server error",success:false,dala:null});
    }
});

app.post("/subadmin/master-create",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
   try{
       let count = await User.estimatedDocumentCount();
       
       const { first_name, last_name,contact_no, email, password, reference} = req.body;
       const {limit, share,cassinoShare,cassinoCommission,cassinoStatus,commissionType,matchCommission,sessionCommission} = req.body;
       const role = "master", status="active";
    if (!(email && password && first_name && last_name && contact_no && limit && share && commissionType)) {
      res.status(400).json({status:400,message:'All input is required',succes:false, data:null});
    }

    const oldUser = await User.findOne({ email });
    if (oldUser) {
        console.log(oldUser);
      return res.status(409).json({status:409, message:"User Already Exist. Please Login", success:false, data:oldUser});
    }
    // encryptedPassword = await bcrypt.hash(password,10);
    
    const uid = uidcreate(role,count+1);
    count+=1;
    
    const owner_uid = req.user.uid;
    
    let cStatus
    if(cassinoStatus == 'OFF' || cassinoStatus=='off'){
        cStatus = 0
    }else if(cassinoStatus == 'ON'|| cassinoStatus=='on'){
        cStatus=1;
    }
    
    const user = await User.create({
        uid,
        first_name,
        last_name,
        contact_no,
        status,
        role,
        email: email.toLowerCase(),
        password: password,
        createdBy: owner_uid,
        reference,
        limit,
        share,
        cassinoShare,
        cassinoCommission,
        cassinoStatus:cStatus,
        commissionType,
        matchCommission,
        sessionCommission,
    });
    console.log("\n"+user);
    
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "20h",
      }
    );
    
    user.token = token;
    return res.status(201).json({status:201, message:"Master creation successful", success:true, data:user});
   }catch(err){
     console.log(err); 
     res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
   };
});


app.get("/subadmin/my-masters/", sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        console.log(owner_uid);
        const role = "master";
        const masters = await User.find({role:"master", createdBy:owner_uid});
        if(masters.length<1){
            res.status(400).send({status:400,message:'No master data found.',data:null});
        }
        res.status(200).json({status:200, message:'Masters list',success:true,data:masters});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});

app.post("/subadmin/master-downline",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
     owner_uid = req.user.uid;
    master_uid = req.body.master_uid;
    console.log(master_uid);
    const superagents = await User.find({createdBy:owner_uid,role:"superagent", members:{master:master_uid}});
    if(superagents.length<1){
            res.status(400).send({status:400,message:"No child superagent found!",success:false,data:null});
        }
    else{
        res.status(200).json({status:200,message:"Downline line of master "+master_uid,success:true,data:superagents});
        }

    }catch(err){
        console.log(err);
        res.status(500).json({status:500,message:"Internal server error",success:false,dala:null});
    }
});

app.get("/subadmin/master-active/", sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        console.log(owner_uid);
        const role = "master";
        const masters = await User.find({role:"master",status:"active", createdBy:owner_uid});
        if(masters.length<1){
            res.status(400).send({status:400,message:"No active master found!",success:false,data:null});
        }
        res.status(200).json({status:200,message:'Active Masters',success:true,data:masters});
    }catch(err){
        console.log(err);
        res.status(500).json({status:500,message:'Internal server error',success:false, data:err});
    }
});

app.post("/subadmin/detail-master",sessionCheck.isSubadmin, upload.none(), async(req,res) =>{
   try{
        const uid = req.body.uid;
         const data = await User.find({uid});
      res.status(201).json({status:201, message:"Master Details", success:true, data});
       
   } catch(err){
      res.status(500).json({status:500,message:"Internal server error",success:false,data:null});
   }
});
app.post("/subadmin/edit-master",sessionCheck.isSubadmin, upload.none(), async(req,res) =>{
   try{
       const uid = req.body.uid;
       const { first_name, last_name,contact_no, email, password, reference} = req.body;
       const {limit, share,cassinoShare,cassinoCommission,cassinoStatus,commissionType,matchCommission,sessionCommission} = req.body;
    
        await User.updateOne({uid},{$set:{first_name:first_name,
                                  last_name:last_name,
                                  email:email,
                                  password:password,
                                  reference:reference,
                                  contact_no:contact_no,
                                  limit:limit,
                                  share:share,
                                  cassinoShare:cassinoShare,
                                  cassinoStatus:cassinoStatus,
                                  commissionType:commissionType,
                                  matchCommission:matchCommission,
                                  sessionCommission:sessionCommission
                                }}).exec();
    
    const updated_user = await User.find({uid});
    
      res.status(201).json({status:201, message:"Edit success", success:true, data:updated_user});
       
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error",success:false,data:null});
   }
});

app.post("/subadmin/activate-master", sessionCheck.isSubadmin,upload.none(),async (req,res)=>{
    try{
        const {uid} = req.body;
        await User.updateOne({uid:uid}, {$set:{status:"active"}}).exec();
        const master = await User.find({uid:req.body.uid});
        res.status(201).json(master);
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});

app.post("/subadmin/change-master-limit", sessionCheck.isSubadmin, upload.none(),async(req,res)=>{
   try{
       const {uid,limit} = req.body;
       await User.updateOne({uid}, {$set:{limit:limit}});
       const user = await User.find({uid});
       res.status(201).json({status:201,message:"limit changed", success:true,data:user});
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error", success:false,data:null});
   }
});

app.post("/subadmin/deactivate-master/", sessionCheck.isSubadmin, upload.none(),async (req,res)=>{
    try{
        const {uid} = req.body;
        await User.updateOne({uid:uid,createdBy:req.user.uid}, {$set:{status:"inactive"}}).exec();
        const master = await User.find({uid:req.body.uid});
        res.status(201).json(master);
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});

app.post("/subadmin/deactivate-all-master", sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        await User.updateMany({role:"master", createdBy:req.user.uid}, {$set:{status:"inactive"}}).exec();
        const masters = await User.find({});
        res.status(201).json({status:201,message:'All masters deactivated',success:true, data:masters});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});


app.post("/subadmin/super-agent-create",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
   try{
       let count = await User.estimatedDocumentCount();
       
       const { first_name, last_name,contact_no, email, password, reference, master} = req.body;
       const {limit, share,cassinoShare,cassinoCommission,cassinoStatus,commissionType,matchCommission,sessionCommission} = req.body;
       const role = "superagent", status="active";
    if (!(email && password && first_name && last_name && contact_no && limit && share && commissionType)) {
      res.status(400).json({status:400,message:"All input is required",success:false,data:null});
    }

    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res.status(409).json({status:409,message:"User Already Exist. Please Login",success:false,data:oldUser});
    }
    
    const uid = uidcreate(role,count+1);
    count+=1;
    
    const owner_uid = req.user.uid;
    
    let cStatus
    if(cassinoStatus == 'OFF' || cassinoStatus=='off'){
        cStatus = 0
    }else if(cassinoStatus == 'ON'|| cassinoStatus=='on'){
        cStatus=1;
    }
    
    const user = await User.create({
        uid,
        first_name,
        last_name,
        contact_no,
        status,
        role,
        email: email.toLowerCase(),
        password: password,
        createdBy:owner_uid,
        reference,
        limit,
        share,
        cassinoShare,
        cassinoCommission,
        cassinoStatus:cStatus,
        commissionType,
        matchCommission,
        sessionCommission,
        members:{
            "master":master,
        },
    });
    
    const new_agent = User.find({uid:uid});
    console.log(new_agent);
    
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "20h",
      }
    );
    
    user.token = token;
    return res.status(201).json({status:201, message:"Super agent creation successful", success:true, data:user});
   }catch(err){
     console.log(err);
     return res.status(500).json({status:500,message:'Internal server error',success:false, data:err});
   };
});

app.get("/subadmin/my-superagents",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        const superagents = await User.find({role:"superagent", createdBy:owner_uid});
        if(superagents.length<1){
            res.status(400).json({status:400,message:'No  data found.',data:null});
        }
        res.status(200).json({status:200, message:'Super agent list',success:true,data:superagents});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});


app.get("/subadmin/all-active-superagents",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        const active_superagents = await User.find({role:"superagent", createdBy:owner_uid, status:"active"});
        console.log(active_superagents);
        if(active_superagents.length<1){
            res.status(400).json({status:400, message:"No superagent data found.", success:false, data:null});
         }
        else{
            res.status(200).json({status:200, message:"All active Super agents", success:true, data:active_superagents});
        }
    
    }catch(err){
        res.status(500).json({status:500, message:"Internal server error", data:err});
    }
});


app.post("/subadmin/superagent-downline",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
    owner_uid = req.user.uid;
    superagent_uid = req.body.superagent_uid;
    console.log(superagent_uid);
    const agents = await User.find({createdBy:owner_uid,role:"agent", members:{superagent:superagent_uid}});
    if(agents.length<1){
            res.status(400).send({status:400,message:"No child agents found!",success:false,data:null});
        }
    else{
        res.status(200).json({status:200,message:"Downline line of superagent "+superagent_uid,success:true,data:agents});
        }

    }catch(err){
        console.log(err);
        res.status(500).json({status:500,message:"Internal server error",success:false,dala:null});
    }
});

app.post("/subadmin/detail-superagent",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        const uid = req.body.uid;
        console.log(uid);
        const superagent = await User.find({uid:uid, createdBy:owner_uid, role:"superagent"});
        console.log(superagent);
        if(superagent.length<1){
            res.status(400).json({status:400,message:"No superagent found",success:false, data:null});
        }
        res.status(200).json({status:200, message:"Super Agent Detail",success:true, data:superagent});
    }catch(err){
        console.log(err);
        res.status(500).json({status:500, message:"Internal server error", success:false, data:null});
    }
});

app.post("/subadmin/edit-superagent",sessionCheck.isSubadmin, upload.none(), async(req,res) =>{
   try{
       const uid = req.body.uid;
       const { first_name, last_name,contact_no, email, password, reference} = req.body;
       const {limit, share,cassinoShare,cassinoCommission,cassinoStatus,commissionType,matchCommission,sessionCommission} = req.body;
    
        await User.updateOne({uid},{$set:{first_name:first_name,
                                  last_name:last_name,
                                  email:email,
                                  password:password,
                                  reference:reference,
                                  contact_no:contact_no,
                                  limit:limit,
                                  share:share,
                                  cassinoShare:cassinoShare,
                                  cassinoStatus:cassinoStatus,
                                  commissionType:commissionType,
                                  matchCommission:matchCommission,
                                  sessionCommission:sessionCommission
                                }}).exec();
    
    const updated_user = await User.find({uid});
    
      res.status(201).json({status:201, message:"Edit success", success:true, data:updated_user});
       
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error",success:false,data:null});
   }
});


app.post("/subadmin/activate-superagent", sessionCheck.isSubadmin,upload.none(),async (req,res)=>{
    try{
        const uid = req.body.uid;
        await User.updateOne({uid:uid}, {$set:{status:"active"}}).exec();
        const superagent = await User.find({uid});
        res.status(201).json({stauts:201, message:"Activation success", success:true, data:superagent});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});

app.post("/subadmin/change-superagent-limit", sessionCheck.isSubadmin, upload.none(),async(req,res)=>{
   try{
       const {uid,limit} = req.body;
       await User.updateOne({uid}, {$set:{limit:limit}});
       const user = await User.find({uid});
       res.status(201).json({status:201,message:"limit changed", success:true,data:user});
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error", success:false,data:null});
   }
});


app.post("/subadmin/deactivate-superagent/", sessionCheck.isSubadmin, upload.none(),async (req,res)=>{
    try{
        const uid = req.body.uid;
        await User.updateOne({uid:uid}, {$set:{status:"inactive"}}).exec();
        const superagent = await User.find({uid});
        res.status(201).json({status:201,message:"Superagent deactivated",success:true,data:superagent});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});


app.post("/subadmin/deactivate-all-superagents", sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        await User.updateMany({role:"superagent", createdBy:req.user.uid}, {$set:{status:"inactive"}}).exec();
        const superagents = await User.find({role:"superagent", createdBy:req.user.uid});
        res.status(201).json({status:201,message:'All superagents deactivated',success:true, data:superagents});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});

app.post("/subadmin/agent-create", sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
   try{
       let count = await User.estimatedDocumentCount();
       
       const { first_name, last_name,contact_no, email, password, reference, superagent} = req.body;
       const {limit, share,cassinoShare,cassinoCommission,cassinoStatus,commissionType,matchCommission,sessionCommission} = req.body;
       const role = "agent", status="active";
    if (!(email && password && first_name && last_name && contact_no && limit && share && commissionType)) {
      res.status(400).json({status:400,message:"All input is required",success:false,data:null});
    }

    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res.status(409).json({status:409,message:"User Already Exist. Please Login",success:false,data:oldUser});
    }
    
    const uid = uidcreate(role,count+1);
    count+=1;
    
    const owner_uid = req.user.uid;
    
    let cStatus
    if(cassinoStatus == 'OFF' || cassinoStatus=='off'){
        cStatus = 0
    }else if(cassinoStatus == 'ON'|| cassinoStatus=='on'){
        cStatus=1;
    }
    
    const user = await User.create({
        uid,
        first_name,
        last_name,
        contact_no,
        status,
        role,
        email: email.toLowerCase(),
        password: password,
        createdBy:owner_uid,
        reference,
        limit,
        share,
        cassinoShare,
        cassinoCommission,
        cassinoStatus:cStatus,
        commissionType,
        matchCommission,
        sessionCommission,
        members:{
            "superagent":superagent
        },
    });
    
    const new_agent = User.find({uid:uid});
    console.log(new_agent);
    
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "20h",
      }
    );

    user.token = token;
    return res.status(201).json({status:201, message:"Agent creation successful", success:true, data:user});
       
   } catch(err){
       console.log(err);
       res.status(500).json({status:500, message:"Internal server error", success:false, data:null});
   }
});

app.get("/subadmin/my-agents",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
   try{
       const owner_uid = req.user.uid;
        const agents = await User.find({role:"agent", createdBy:owner_uid});
        if(agents.length<1){
            res.status(400).json({status:400,message:'No  data found.',data:null});
        }
        res.status(200).json({status:200, message:'Super agent list',success:true,data:agents});
       
       
   } catch(err){
       console.log(err);
       res.status(500).json({status:500, message:"Internal server error", success:false, data:null});
   }
});


app.get("/subadmin/all-active-agents",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        const active_agents = await User.find({role:"agent", createdBy:owner_uid, status:"active"});
        console.log(active_agents);
        if(active_agents.length<1){
            res.status(400).json({status:400, message:"No agent data found.", success:false, data:null});
         }
        else{
            res.status(200).json({status:200, message:"All active agents", success:true, data:active_agents});
        }
    
    }catch(err){
        res.status(500).json({status:500, message:"Internal server error", data:err});
    }
});


app.post("/subadmin/agent-downline",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
    owner_uid = req.user.uid;
    agent_uid = req.body.agent_uid;
    console.log(agent_uid);
    const clients = await User.find({createdBy:owner_uid,role:"client", members:{agent:agent_uid}});
    if(clients.length<1){
            res.status(400).send({status:400,message:"No child clients found!",success:false,data:null});
        }
    else{
        res.status(200).json({status:200,message:"Downline line of agent "+agent_uid,success:true,data:clients});
        }

    }catch(err){
        console.log(err);
        res.status(500).json({status:500,message:"Internal server error",success:false,dala:null});
    }
});

app.post("/subadmin/detail-agent",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        const uid = req.body.uid;
        console.log(uid);
        const agent = await User.find({uid:uid, createdBy:owner_uid, role:"agent"});
        console.log(agent);
        if(agent.length<1){
            res.status(400).json({status:400,message:"No agent found",success:false, data:null});
        }
        res.status(200).json({status:200, message:"Agent Detail",success:true, data:agent});
    }catch(err){
        console.log(err);
        res.status(500).json({status:500, message:"Internal server error", success:false, data:null});
    }
});

app.post("/subadmin/edit-agent",sessionCheck.isSubadmin, upload.none(), async(req,res) =>{
   try{
       const uid = req.body.uid;
       const { first_name, last_name,contact_no, email, password, reference} = req.body;
       const {limit, share,cassinoShare,cassinoCommission,cassinoStatus,commissionType,matchCommission,sessionCommission} = req.body;
    
        await User.updateOne({uid},{$set:{first_name:first_name,
                                  last_name:last_name,
                                  email:email,
                                  password:password,
                                  reference:reference,
                                  contact_no:contact_no,
                                  limit:limit,
                                  share:share,
                                  cassinoShare:cassinoShare,
                                  cassinoStatus:cassinoStatus,
                                  commissionType:commissionType,
                                  matchCommission:matchCommission,
                                  sessionCommission:sessionCommission
                                }}).exec();
    
    const updated_user = await User.find({uid});
    
      res.status(201).json({status:201, message:"Edit success", success:true, data:updated_user});
       
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error",success:false,data:null});
   }
});


app.post("/subadmin/activate-agent", sessionCheck.isSubadmin,upload.none(),async (req,res)=>{
    try{
        const uid = req.body.uid;
        await User.updateOne({uid:uid,role:"agent"}, {$set:{status:"active"}}).exec();
        const agent = await User.find({uid});
        res.status(201).json({stauts:201, message:"Activation success", success:true, data:agent});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});

app.post("/subadmin/change-agent-limit", sessionCheck.isSubadmin, upload.none(),async(req,res)=>{
   try{
       const {uid,limit} = req.body;
       await User.updateOne({uid:uid, role:"agent"}, {$set:{limit:limit}});
       const user = await User.find({uid});
       res.status(201).json({status:201,message:"limit changed", success:true,data:user});
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error", success:false,data:null});
   }
});


app.post("/subadmin/deactivate-agent/", sessionCheck.isSubadmin, upload.none(),async (req,res)=>{
    try{
        const uid = req.body.uid;
        await User.updateOne({uid:uid,role:"agent"}, {$set:{status:"inactive"}}).exec();
        const agent = await User.find({uid});
        res.status(201).json({status:201,message:"Agent deactivated",success:true,data:agent});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});


app.post("/subadmin/deactivate-all-agents", sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        await User.updateMany({role:"agent", createdBy:req.user.uid}, {$set:{status:"inactive"}}).exec();
        const agents = await User.find({role:"agent", createdBy:req.user.uid});
        res.status(201).json({status:201,message:'All agents deactivated',success:true, data:agents});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});


app.post("/subadmin/client-create", sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
   try{
       let count = await User.estimatedDocumentCount();
       
       const { first_name, last_name,contact_no, email, password, reference, agent} = req.body;
       const {limit, share,cassinoShare,cassinoCommission,cassinoStatus,commissionType,matchCommission,sessionCommission} = req.body;
       const role = "client", status="active";
    if (!(email && password && first_name && last_name && contact_no && limit && share && commissionType)) {
      res.status(400).json({status:400,message:"All input is required",success:false,data:null});
    }

    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res.status(409).json({status:409,message:"User Already Exist. Please Login",success:false,data:oldUser});
    }
    
    const uid = uidcreate(role,count+1);
    count+=1;
    
    const owner_uid = req.user.uid;
    
    let cStatus
    if(cassinoStatus == 'OFF' || cassinoStatus=='off'){
        cStatus = 0
    }else if(cassinoStatus == 'ON'|| cassinoStatus=='on'){
        cStatus=1;
    }
    
    const user = await User.create({
        uid,
        first_name,
        last_name,
        contact_no,
        status,
        role,
        email: email.toLowerCase(),
        password: password,
        createdBy:owner_uid,
        reference,
        limit,
        share,
        cassinoShare,
        cassinoCommission,
        cassinoStatus:cStatus,
        commissionType,
        matchCommission,
        sessionCommission,
        members:{
            "agent":agent
        },
    });
    
    const new_client = User.find({uid:uid});
    console.log(new_client);
    
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "20h",
      }
    );

    user.token = token;
    return res.status(201).json({status:201, message:"Client creation successful", success:true, data:user});
       
   } catch(err){
       console.log(err);
       res.status(500).json({status:500, message:"Internal server error", success:false, data:null});
   }
});

app.get("/subadmin/my-clients",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
   try{
       const owner_uid = req.user.uid;
        const clients = await User.find({role:"client", createdBy:owner_uid});
        if(clients.length<1){
            res.status(400).json({status:400,message:'No  data found.',data:null});
        }
        res.status(200).json({status:200, message:'Client list',success:true,data:clients});
   } catch(err){
       console.log(err);
       res.status(500).json({status:500, message:"Internal server error", success:false, data:null});
   }
});


app.get("/subadmin/all-active-clients",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        const active_clients = await User.find({role:"client", createdBy:owner_uid, status:"active"});
        if(active_clients.length<1){
            res.status(400).json({status:400, message:"No client data found.", success:false, data:null});
         }
        else{
            res.status(200).json({status:200, message:"All active clients", success:true, data:active_clients});
        }
    
    }catch(err){
        res.status(500).json({status:500, message:"Internal server error", data:err});
    }
});


app.post("/subadmin/detail-client",sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        const owner_uid = req.user.uid;
        const uid = req.body.uid;
        console.log(uid);
        const client = await User.find({uid:uid, createdBy:owner_uid, role:"client"});
        console.log(client);
        if(client.length<1){
            res.status(400).json({status:400,message:"No client found",success:false, data:null});
        }
        else{
            res.status(200).json({status:200, message:"Client details",success:true, data:client});
        }
        
    }catch(err){
        console.log(err);
        res.status(500).json({status:500, message:"Internal server error", success:false, data:null});
    }
});

app.post("/subadmin/edit-client",sessionCheck.isSubadmin, upload.none(), async(req,res) =>{
   try{
       const uid = req.body.uid;
       const { first_name, last_name,contact_no, email, password, reference} = req.body;
       const {limit, share,cassinoShare,cassinoCommission,cassinoStatus,commissionType,matchCommission,sessionCommission} = req.body;
    
        await User.updateOne({uid},{$set:{first_name:first_name,
                                  last_name:last_name,
                                  email:email,
                                  password:password,
                                  reference:reference,
                                  contact_no:contact_no,
                                  limit:limit,
                                  share:share,
                                  cassinoShare:cassinoShare,
                                  cassinoStatus:cassinoStatus,
                                  commissionType:commissionType,
                                  matchCommission:matchCommission,
                                  sessionCommission:sessionCommission
                                }}).exec();
    
    const updated_user = await User.find({uid});
    
      res.status(201).json({status:201, message:"Edit success", success:true, data:updated_user});
       
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error",success:false,data:null});
   }
});


app.post("/subadmin/activate-client", sessionCheck.isSubadmin,upload.none(),async (req,res)=>{
    try{
        const uid = req.body.uid;
        await User.updateOne({uid:uid,role:"client"}, {$set:{status:"active"}}).exec();
        const client = await User.find({uid});
        res.status(201).json({stauts:201, message:"Activation success", success:true, data:client});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});

app.post("/subadmin/change-client-limit", sessionCheck.isSubadmin, upload.none(),async(req,res)=>{
   try{
       const {uid,limit} = req.body;
       await User.updateOne({uid:uid,role:"client"}, {$set:{limit:limit}});
       const user = await User.find({uid});
       res.status(201).json({status:201,message:"limit changed", success:true,data:user});
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error", success:false,data:null});
   }
});


app.post("/subadmin/deactivate-client/", sessionCheck.isSubadmin, upload.none(),async (req,res)=>{
    try{
        const uid = req.body.uid;
        await User.updateOne({uid:uid, role:"client"}, {$set:{status:"inactive"}}).exec();
        const client = await User.find({uid});
        res.status(201).json({status:201,message:"Client deactivated",success:true,data:client});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});


app.post("/subadmin/deactivate-all-clients", sessionCheck.isSubadmin, upload.none(), async (req,res)=>{
    try{
        await User.updateMany({role:"client", createdBy:req.user.uid}, {$set:{status:"inactive"}}).exec();
        const clients = await User.find({role:"client", createdBy:req.user.uid});
        res.status(201).json({status:201,message:'All agents deactivated',success:true, data:clients});
    }catch(err){
        console.log(err);
        res.status(500).json({staus:500,message:'Internal server error',success:false, data:err});
    }
});


app.get("/subadmin/in-play",sessionCheck.isSubadmin,upload.none(),async (req,res)=>{
   try{
      const now = new Date();
      console.log(now);
      const active_matches = await matches.find({date_time:{$gt:now}});
      if(active_matches.length<1){
          res.status(400).json({status:400,message:"No match data vailable",success:false,data:null});
      }
      else{
          res.status(200).json({status:200,message:"In-play data",success:true,data:active_matches});
      }
   } catch(err){
       console.log(err);
       res.status(500).json({status:500,message:"Internal server error",success:false,data:null});
   }
});


// /////////AGENT///////////////////
app.get("/agent",sessionCheck.isAgent, (req,res) => {
    try{
        var user = 'AGENT LOGGED-IN';
        res.status(200).json(user);
    }catch(err){
        res.status(400).json(err);
    }
});


// /////////SUPER-AGENT///////////////////
app.get("/superagent",sessionCheck.isSuperagent, (req,res) => {
    try{
        var user = 'SUPER_AGENT LOGGED-IN';
        res.status(200).json(user);
    }catch(err){
        res.status(400).json(err);
    }
});

// /////////MASTER///////////////////
app.get("/master",sessionCheck.isMaster, (req,res) => {
    try{
        var user = 'MASTER LOGGED-IN';
        res.status(200).json(user);
    }catch(err){
        res.status(400).json(err);
    }
});


// ///////USER/////////
app.get("/user",sessionCheck.isAuth, (req, res) => {
     try {
          var user = 'USER LOGGED-IN';
          res.status(200).json(user);
     }catch(err){
         res.status(400).json(err);
     }
});

// ///////HOME////////////
app.get("/home",sessionCheck.isAuth,async (req, res) => {
  try {
         const data = await  matches.find().exec();
          res.status(200).json(data);
     }catch(err){
         res.status(400).json(err);
     }
});

// ///////SINGLE MATCH///////////
app.post("/singlematch",sessionCheck.isAuth,async (req, res) => {
  try {
      const { match_id } = req.body;
    if (!match_id) {
     return res.status(400).send("All input is required");
        
    }
      
         const data = await  matches.findOne({_id:match_id}).exec();
          res.status(200).json(data);
     }catch(err){
         res.status(400).json(err);
     }
});



app.get("/session",sessionCheck.isAuth, async (req, res) => {

  res.render('user/session');
});


app.get("/yourbet",sessionCheck.isAuth, (req, res) => {
  res.render('user/yourbet');
});

// ///BID CREATION////////
var rate=0.00;
var userWallet=50000;
var toppos=0;
var botpos=0;


 function bet(rate, amount,mode,state){
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
    // temptoppos.toFixed(2);
    };

app.post("/createbid",sessionCheck.isAuth,upload.none(), async (req, res) => {
    try {
     var { rate, amount, mode, state } = req.body;
        if(!(rate, amount && mode && state)){
     return res.status(400).send("All input is required");
    }
    rate = parseFloat(rate);
    amount = parseInt(amount);
    var result = bet(rate, amount, mode, state);
    
    // res.redirect('/session');
        
          const data = [result[0], result[1]] ;
          res.send({rate:rate, amount:amount,top_position:result[0],bottom_position:result[1]});
        //   res.status(200).json(data);
     }catch(err){
         res.status(400).json(err);
     }
});

// ////LOGOUT//////
app.get('/logout',(req,res) => {
    req.session.destroy();
    res.redirect('/index');
});

module.exports = app;
