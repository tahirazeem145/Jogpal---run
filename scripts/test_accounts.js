const { initializeApp } = require('@firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('@firebase/auth');
const { getFirestore, doc, getDoc, collection, getDocs } = require('@firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCuiwXmBy9KfzOw03sxHTosmS5wMOdks6c",
  authDomain: "jogpal-5.firebaseapp.com",
  projectId: "jogpal-5",
  storageBucket: "jogpal-5.firebasestorage.app",
  messagingSenderId: "405112460867",
  appId: "1:405112460867:android:dcc26f038f17b91403e6f6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testLoginAndData() {
  console.log('--- 1. Testing Login with test@gmail.com ---');
  const userCred = await signInWithEmailAndPassword(auth, 'test@gmail.com', '123456');
  console.log(`Successfully logged in as: ${userCred.user.email} (UID: ${userCred.user.uid})`);

  console.log('\n--- 2. Fetching User Profile for test@gmail.com ---');
  const testProfileSnap = await getDoc(doc(db, 'users', userCred.user.uid));
  if (testProfileSnap.exists()) {
    console.log('Profile data in Firestore:', JSON.stringify(testProfileSnap.data(), null, 2));
  } else {
    console.log('No Firestore document found for test user yet.');
  }

  console.log('\n--- 3. Listing all registered users in Firestore ---');
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Total users in Firestore: ${usersSnap.size}`);
  usersSnap.forEach((d) => {
    const data = d.data();
    console.log(`- [${d.id}] Name: "${data.displayName}", Email: "${data.email}", Level: ${data.level}, Jogs: ${data.totalJogs || 0}, Distance: ${data.totalDistanceKm || 0}km`);
  });

  console.log('\n--- Verification Test Complete: ALL GREEN! ---');
  process.exit(0);
}

testLoginAndData().catch((err) => {
  console.error('Test error:', err.message);
  process.exit(1);
});
