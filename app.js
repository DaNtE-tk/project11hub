var createError = require('http-errors');
require("dotenv").config();
var express = require('express');
var path = require('path');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var bodyParser  = require('body-parser'); 
const url = "mongodb://127.0.0.1:27017/test";
mongoose.connect(url, {
    useNewUrlParser: true,
});
const con= mongoose.connection;
con.on('open', ()=> {
  console.log('Database Connected');
});

var usersRouter = require('./controllers/users');
var adminRouter = require('./controllers/admin');
// var coadminRouter = require('./controllers/coadmin');
// var subadminRouter = require('./controllers/subadmin');
// var agentRouter = require('./controllers/agent');
// var superagentRouter = require('./controllers/superagent');
// var masterRouter = require('./controllers/master');

var app = express();
var sessionVar;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir777",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

app.use('/admin',function(req, res, next){
        sessionVar=req.session;
        if(sessionVar.userdetail.role != 'Super Admin'){
            res.redirect('/admin-login/');
        }else{
            next(); 
        }
    }); 
    
// app.use('/coadmin', function(req,res,next){
//     sessionVar=req.session;
//         if(sessionVar.userdetail.role != 'Coadmin'){
//             res.redirect('/coadmin-login/');
//         }else{
//             next(); 
//         }
// });

// app.use('/Subadmin', function(req,res,next){
//     sessionVar=req.session;
//         if(sessionVar.userdetail.role != 'Subadmin'){
//             res.redirect('/Subadmin-login/');
//         }else{
//             next(); 
//         }
// });

// app.use('/Agent', function(req,res,next){
//     sessionVar=req.session;
//         if(sessionVar.userdetail.role != 'Agent'){
//             res.redirect('/Agent-login/');
//         }else{
//             next(); 
//         }
// });

// app.use('/Superagent', function(req,res,next){
//     sessionVar=req.session;
//         if(sessionVar.userdetail.role != 'Super Agent'){
//             res.redirect('/Superagent-login/');
//         }else{
//             next(); 
//         }
// });

// app.use('/Master', function(req,res,next){
//     sessionVar=req.session;
//         if(sessionVar.userdetail.role != 'Master'){
//             res.redirect('/Master-login/');
//         }else{
//             next(); 
//         }
// });




app.use('/', usersRouter);
app.use('/admin-login', adminRouter);
app.use('/admin', adminRouter);
// app.use('/coadmin-login',coadminRouter);
// app.use('/Subadmin',subadminRouter);
// app.use('/Subadmin-login',subadminRouter);
// app.use('/Agent',agentRouter);
// app.use('/Agent-login',agentRouter);
// app.use('/Superagent-login',superagentRouter);
// app.use('/Master-login',masterRouter);


app.use(function(req, res, next) {
  next(createError(404));
});
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
