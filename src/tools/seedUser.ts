
import dotenv from 'dotenv';
dotenv.config();

import { AuthService } from '../services/authService';
import { UserDao } from '../dao';
import crypto from 'crypto';

async function seedUser() {
  const email = 'steve@vitality.io';
  console.log(`Checking user: ${email}`);
  
  const user = await UserDao.findByEmail(email);
  const password = crypto.randomBytes(12).toString("base64url");
  const hashedPassword = await AuthService.hashPassword(password);

  if (!user) {
    console.log('User not found. Creating new user...');
    const newUser = await UserDao.create({
      email,
      password: hashedPassword,
    });
    
    if (newUser) {
      console.log(`User created successfully.`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    } else {
      console.log('Failed to create user.');
    }
  } else {
    console.log(`User found. Updating password...`);
    
    const updatedUser = await UserDao.update(user.id, {
      password: hashedPassword,
    });

    if (updatedUser) {
      console.log('User password updated successfully.');
      console.log(`Email: ${email}`);
      console.log(`New Password: ${password}`);
      
      // Test verification
      const isMatch = await AuthService.verifyPassword(password, updatedUser.password);
      console.log(`Verification test: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.log('Failed to update user password.');
    }
  }
  
  process.exit(0);
}

seedUser().catch(err => {
  console.error(err);
  process.exit(1);
});
