const JWT = require('jsonwebtoken');
const secret = "abc@123";

function createTokenforUser(user){
    const payload = {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
    };
    const token = JWT.sign(payload,secret);
    return token;
}

function validateToken(token){
    const payload = JWT.verify(token, secret);
    return payload;
}

module.exports={
    createTokenforUser,
    validateToken,
}