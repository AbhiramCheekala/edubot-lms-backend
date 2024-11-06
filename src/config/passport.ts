// import { Strategy as JwtStrategy, ExtractJwt, VerifyCallback } from 'passport-jwt';
// import config from './config.js';
// import { db } from '../db/db.js';
// import { TokenType, UserTable } from '../db/schema/index.js';
// import { eq } from 'drizzle-orm';
// import { TokenTypes } from '../constants/TokenTypes.js';

// const jwtOptions = {
//   secretOrKey: config.jwt.secret,
//   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
// };

// const jwtVerify: VerifyCallback = async (payload, done) => {
//   try {
//     if (payload.type !== TokenTypes.ACCESS) {
//       throw new Error('Invalid token type');
//     }
//     const user = await db.query.UserTable.findFirst({
//       columns: {
//         id: true,
//         email: true,
//         name: true
//       },
//       where: eq(UserTable.id, payload.sub as number)
//     });
//     if (!user) {
//       return done(null, false);
//     }
//     done(null, user);
//   } catch (error) {
//     done(error, false);
//   }
// };

// export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
