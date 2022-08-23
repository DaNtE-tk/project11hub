
module.exports = {
    isAuth: function(req, res, next){
        // console.log('Session Check',req.session); 
        sessionVar=req.session;
        if(!sessionVar.userdetail){
            res.redirect('/');
        }else{
            next(); 
        }
    },
    isSuperAdmin: function(req, res, next){
        sessionVar=req.session;
        if(sessionVar.userdetail.role != 'Super Admin'){
            res.redirect('/admin-login/');
        }else{
            next(); 
        }
    },
    ispowerAdmin: function(req,res,next){
        sessionVar = req.session;
        if(sessionVar.userdetails.role != 'owner'){
            res.redirect('/power-login');
        }else{
            next();
        }
    }
}