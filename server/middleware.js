const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = 'supersecretaccesstoken';
const REFRESH_TOKEN_SECRET = 'supersecretrefreshtoken';

function generateAccessToken(user) {
	return jwt.sign(
		{
			username: user.username,
			role: user.role,
		},
		ACCESS_TOKEN_SECRET,
		{ expiresIn: '10m' }
	);
}

function generateRefreshToken(user) {
	return jwt.sign(
		{
			username: user.username,
			role: user.role,
		},
		REFRESH_TOKEN_SECRET
	);
}

function verifyRefreshToken(token, callback) {
	return jwt.verify(token, REFRESH_TOKEN_SECRET, callback);
}

function authenticateJWT(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader)
        return res.status(401).json({ message: 'Brak tokena' });
	
    const token = authHeader.split(' ')[1];
	jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
		if (err) 
            return res.status(403).json({ message: 'Błędny token' });
        
		req.user = user;
		next();
	});
}

function authorizeAdmin(req, res, next) {
       if ( req.user.role !== 'ADMIN') {
	       return res.status(403).json({ message: 'Brak uprawnień ADMIN' });
       }
       next();
}

module.exports = {
	generateAccessToken,
	generateRefreshToken,
	verifyRefreshToken,
	authenticateJWT,
	authorizeAdmin,
};
