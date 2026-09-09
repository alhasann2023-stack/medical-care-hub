import 'dotenv/config';

import {
  initializeApp,
  applicationDefault,
  getApps
} from 'firebase-admin/app';

import {
  getAuth
} from 'firebase-admin/auth';

async function main() {
  try {
    console.log('GOOGLE_APPLICATION_CREDENTIALS =');
    console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (getApps().length === 0) {
      initializeApp({
        credential: applicationDefault()
      });
    }

    const auth = getAuth();

    console.log('Firebase Admin initialized successfully.');

    const users = await auth.listUsers(1);

    console.log(
      'Firebase Authentication connection successful.'
    );

    console.log(
      'Users found:',
      users.users.length
    );

  } catch (error) {
    console.error(
      'FIREBASE ADMIN TEST FAILED:'
    );

    console.error(error);

    process.exit(1);
  }
}

main();