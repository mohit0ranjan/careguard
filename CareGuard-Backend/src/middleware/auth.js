import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        req.user = null; // Proceed as guest
        return next();
    }

    try {
        const splitToken = token.split(' ')[1]; // Format: "Bearer tokenHere"
        const decoded = jwt.verify(splitToken || token, process.env.JWT_SECRET);

        req.user = decoded; // Contains id, role (from token sign payload)
        next();
    } catch (error) {
        console.error('Token validation error:', error.message);
        req.user = null; // Token is invalid, but proceed as guest
        next();
    }
};

export default authMiddleware;
