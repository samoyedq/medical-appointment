const UserController = require ('../user/user_controller');
// const { validationResult } = require('express-validator');

module.exports = app => { 
    app.post('/api/set-up-2fa', UserController.setupTwoFactor);
    app.post('/api/verify-2fa', UserController.verifyTwoFactor);  
    app.get('/api/test',(req,res)=>{res.json({message:"the api is working"})});
    app.post('/api/login', UserController.unifiedLogin);

    // GET /api/get/session => returns user + role
    app.get('/api/get/session', UserController.getSession);
  
    // POST /api/logout => clears the session
    app.post('/api/logout', UserController.unifiedLogout);
    app.post('/api/verify-email-otp', UserController.verifyEmailOTP);
    app.post('/api/disable-2fa', UserController.unableTwoFactorEnabled);
    //For Post
   
    app.get('/api/verify-token', UserController.verifyToken);
}
