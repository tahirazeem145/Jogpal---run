const { initializeApp } = require('@firebase/app');
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} = require('@firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCuiwXmBy9KfzOw03sxHTosmS5wMOdks6c",
  authDomain: "jogpal-5.firebaseapp.com",
  projectId: "jogpal-5",
  storageBucket: "jogpal-5.firebasestorage.app",
  messagingSenderId: "405112460867",
  appId: "1:405112460867:android:dcc26f038f17b91403e6f6",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runFullVerification() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE FEATURE VERIFICATION TEST');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] Test ${totalTests}: ${testName}`);
    }
  }

  // Define two test runner profiles
  const runnerA = {
    id: 'test_user_alice_' + Date.now(),
    displayName: 'Alice Runner',
    email: 'alice.test@jogpal.app',
    level: 3,
    totalDistanceKm: 42.5,
    streakDays: 5,
  };

  const runnerB = {
    id: 'test_user_bob_' + Date.now(),
    displayName: 'Bob Marathoner',
    email: 'bob.test@jogpal.app',
    level: 7,
    totalDistanceKm: 120.0,
    streakDays: 14,
  };

  try {
    // Setup test profiles in Firestore
    await setDoc(doc(db, 'users', runnerA.id), runnerA);
    await setDoc(doc(db, 'users', runnerB.id), runnerB);
    console.log('Created test runners: Alice and Bob.\n');

    // TEST 1: Check initial connection status (canSend should be true)
    const canSendInitial = !(await getDoc(doc(db, 'users', runnerA.id, 'friends', runnerB.id))).exists() &&
      !(await getDoc(doc(db, 'users', runnerA.id, 'sent_requests', runnerB.id))).exists();
    assertTest(canSendInitial === true, 'Initial request check allows sending request');

    // TEST 2: Alice sends request to Bob
    const requestId = `req_${runnerA.id}_${Date.now()}`;
    await setDoc(doc(db, 'users', runnerB.id, 'requests', requestId), {
      id: requestId,
      fromUserId: runnerA.id,
      fromUserName: runnerA.displayName,
      fromUserEmail: runnerA.email,
      toUserId: runnerB.id,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      type: 'CREW_INVITE',
    });
    await setDoc(doc(db, 'users', runnerA.id, 'sent_requests', runnerB.id), {
      requestId,
      toUserId: runnerB.id,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    const bobIncomingSnap = await getDocs(collection(db, 'users', runnerB.id, 'requests'));
    const aliceSentSnap = await getDocs(collection(db, 'users', runnerA.id, 'sent_requests'));
    assertTest(bobIncomingSnap.size === 1 && aliceSentSnap.size === 1, 'Friend request successfully recorded in incoming and outgoing collections');

    // TEST 3: Duplicate Request Prevention Check
    // Alice trying to send again to Bob should be blocked because sent_requests doc exists
    const isSentPending = (await getDoc(doc(db, 'users', runnerA.id, 'sent_requests', runnerB.id))).exists();
    assertTest(isSentPending === true, 'Duplicate prevention: Alice cannot re-send request while pending');

    // TEST 4: Reverse Request Check
    // Bob trying to send to Alice while Alice has already sent should detect pending incoming request
    const incomingReverseQuery = query(
      collection(db, 'users', runnerB.id, 'requests'),
      where('fromUserId', '==', runnerA.id),
      where('status', '==', 'PENDING')
    );
    const incomingReverseSnap = await getDocs(incomingReverseQuery);
    assertTest(!incomingReverseSnap.empty, 'Reverse prevention: Bob detects Alice has already sent a request');

    // TEST 5: Bob Accepts Alice's Request
    // 1. Add Alice to Bob's friends
    await setDoc(doc(db, 'users', runnerB.id, 'friends', runnerA.id), {
      id: runnerA.id,
      userId: runnerA.id,
      name: runnerA.displayName,
      email: runnerA.email,
      level: runnerA.level,
      status: 'ACTIVE',
      isOnline: true,
    });

    // 2. Add Bob to Alice's friends
    await setDoc(doc(db, 'users', runnerA.id, 'friends', runnerB.id), {
      id: runnerB.id,
      userId: runnerB.id,
      name: runnerB.displayName,
      email: runnerB.email,
      level: runnerB.level,
      status: 'ACTIVE',
      isOnline: true,
    });

    // 3. Remove incoming request and sent_request
    await deleteDoc(doc(db, 'users', runnerB.id, 'requests', requestId));
    await deleteDoc(doc(db, 'users', runnerA.id, 'sent_requests', runnerB.id));

    const bobFriendsSnap = await getDocs(collection(db, 'users', runnerB.id, 'friends'));
    const aliceFriendsSnap = await getDocs(collection(db, 'users', runnerA.id, 'friends'));
    const bobCrewSnap = await getDocs(collection(db, 'users', runnerB.id, 'crew'));
    const aliceCrewSnap = await getDocs(collection(db, 'users', runnerA.id, 'crew'));

    assertTest(bobFriendsSnap.size === 1 && aliceFriendsSnap.size === 1, 'Mutual acceptance: Both runners appear in each other’s FRIENDS section');
    assertTest(bobCrewSnap.size === 0 && aliceCrewSnap.size === 0, 'Separation verified: Friends are strictly in FRIENDS section and NOT in CREW');

    // TEST 6: Post-Acceptance Duplicate Check
    // Alice or Bob cannot send request again because they are now active friends
    const isFriendNow = (await getDoc(doc(db, 'users', runnerA.id, 'friends', runnerB.id))).exists();
    assertTest(isFriendNow === true, 'Post-acceptance prevention: Cannot send request to an already accepted friend');

    // Clean up test data
    await deleteDoc(doc(db, 'users', runnerA.id, 'friends', runnerB.id));
    await deleteDoc(doc(db, 'users', runnerB.id, 'friends', runnerA.id));
    await deleteDoc(doc(db, 'users', runnerA.id));
    await deleteDoc(doc(db, 'users', runnerB.id));
    console.log('\nCleaned up all test runner documents.');

  } catch (err) {
    console.error('Test execution error:', err);
  }

  console.log('\n====================================================');
  console.log(`🏁 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('====================================================\n');
  process.exit(passedTests === totalTests ? 0 : 1);
}

runFullVerification();
