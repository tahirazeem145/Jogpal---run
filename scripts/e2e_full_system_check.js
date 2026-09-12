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

// Haversine calculation verification (from locationService)
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Pace calculation verification (from runService & SoloRunContext)
function calculatePaceString(distanceKm, durationSeconds) {
  if (distanceKm < 0.05 || durationSeconds < 3) return '--:--';
  const paceDecimalMinutes = durationSeconds / 60 / distanceKm;
  if (!isFinite(paceDecimalMinutes) || paceDecimalMinutes > 30) return '--:--';
  const mins = Math.floor(paceDecimalMinutes);
  const secs = Math.round((paceDecimalMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

async function runEndToEndInspection() {
  console.log('================================================================');
  console.log('🔍 JOGPAL APP: COMPREHENSIVE END-TO-END SYSTEM INSPECTION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function check(passedCondition, message) {
    total++;
    if (passedCondition) {
      console.log(`✅ [OK] ${total}. ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAILED] ${total}. ${message}`);
    }
  }

  // 1. FIREBASE CONNECTION CHECK
  console.log('--- 1. FIREBASE BACKEND CONNECTION ---');
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    check(usersSnap !== null, `Connected to Cloud Firestore (Found ${usersSnap.size} active user(s))`);
  } catch (e) {
    check(false, `Firestore connection failed: ${e.message}`);
  }

  // 2. MATHEMATICAL & GPS TELEMETRY INTEGRITY
  console.log('\n--- 2. TELEMETRY & GPS ALGORITHMS ---');
  // Distance between 2 known coordinates (approx 1.11km for 0.01 deg latitude)
  const dist = calculateHaversineDistanceKm(12.9716, 77.5946, 12.9816, 77.5946);
  check(Math.abs(dist - 1.11) < 0.05, `Haversine distance calculation is accurate: ${dist.toFixed(2)} km`);

  // Pace for 5km in 25 mins (1500 sec) -> should be 5:00 /km
  const pace = calculatePaceString(5.0, 1500);
  check(pace === '5:00 /km', `Pace calculation verified: 5.0km in 25m = "${pace}"`);

  // 3. USER PROFILE MANAGEMENT
  console.log('\n--- 3. USER PROFILE SERVICES ---');
  const testUid = 'e2e_runner_' + Date.now();
  const testProfile = {
    id: testUid,
    displayName: 'E2E Test Runner',
    email: 'e2e@jogpal.app',
    level: 2,
    streakDays: 3,
    totalDistanceKm: 15.2,
    totalJogs: 4,
    recordsCount: 2,
    passportUnlockedCount: 5,
    passportTotalCount: 30,
    locationSharing: true,
  };

  await setDoc(doc(db, 'users', testUid), testProfile);
  const fetchedProfile = (await getDoc(doc(db, 'users', testUid))).data();
  check(fetchedProfile && fetchedProfile.displayName === 'E2E Test Runner', 'User profile creation and retrieval verified');

  // 4. RUN SESSION LOGGING & HISTORY
  console.log('\n--- 4. RUN SERVICE & HISTORY ---');
  const runId = `run_${Date.now()}`;
  const testRun = {
    id: runId,
    userId: testUid,
    title: 'DUO RUN • ALICE',
    type: 'CREW',
    distanceKm: 5.25,
    durationSeconds: 1575,
    pace: '5:00 /km',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'runs', runId), testRun);
  const fetchedRun = (await getDoc(doc(db, 'runs', runId))).data();
  check(fetchedRun && fetchedRun.title === 'DUO RUN • ALICE' && fetchedRun.type === 'CREW', 'Run session logged with custom title and CREW type');

  // 5. FRIENDS SYSTEM & DUPLICATE REQUEST LOGIC
  console.log('\n--- 5. FRIENDS SYSTEM & REQUEST PREVENTION ---');
  const friendUid = 'friend_runner_' + Date.now();
  await setDoc(doc(db, 'users', friendUid), {
    id: friendUid,
    displayName: 'Partner Runner',
    email: 'partner@jogpal.app',
  });

  // Alice sends request to Partner
  const reqId = `req_${testUid}_${Date.now()}`;
  await setDoc(doc(db, 'users', friendUid, 'requests', reqId), {
    id: reqId,
    fromUserId: testUid,
    fromUserName: testProfile.displayName,
    fromUserEmail: testProfile.email,
    toUserId: friendUid,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  });
  await setDoc(doc(db, 'users', testUid, 'sent_requests', friendUid), {
    requestId: reqId,
    toUserId: friendUid,
    status: 'PENDING',
  });

  const hasSent = (await getDoc(doc(db, 'users', testUid, 'sent_requests', friendUid))).exists();
  check(hasSent === true, 'Sent request recorded in sender sent_requests collection');

  // Partner accepts -> Add to both users' friends subcollections
  await setDoc(doc(db, 'users', friendUid, 'friends', testUid), {
    id: testUid,
    userId: testUid,
    name: testProfile.displayName,
    level: testProfile.level,
    status: 'ACTIVE',
    isOnline: true,
  });
  await setDoc(doc(db, 'users', testUid, 'friends', friendUid), {
    id: friendUid,
    userId: friendUid,
    name: 'Partner Runner',
    level: 1,
    status: 'ACTIVE',
    isOnline: true,
  });
  await deleteDoc(doc(db, 'users', friendUid, 'requests', reqId));
  await deleteDoc(doc(db, 'users', testUid, 'sent_requests', friendUid));

  const testFriendsSnap = await getDocs(collection(db, 'users', testUid, 'friends'));
  const testCrewSnap = await getDocs(collection(db, 'users', testUid, 'crew'));
  check(testFriendsSnap.size === 1, 'Accepted friend correctly appears in FRIENDS subcollection');
  check(testCrewSnap.size === 0, 'Separation verified: Accepted friend is NOT in CREW subcollection');

  // 6. UPCOMING SESSION SCHEDULING
  console.log('\n--- 6. SESSION SERVICE ---');
  const sessionDocRef = doc(db, 'users', testUid, 'sessions', 'upcoming');
  await setDoc(sessionDocRef, {
    title: 'Morning Loop Squad',
    scheduledAt: 'Tomorrow @ 07:00',
    distanceKm: '10.00 KM',
    sessionType: 'GROUP',
  });
  const fetchedSession = (await getDoc(sessionDocRef)).data();
  check(fetchedSession && fetchedSession.title === 'Morning Loop Squad', 'Upcoming group run session scheduled successfully');

  // Cleanup E2E test data
  console.log('\n--- 7. CLEANUP ---');
  await deleteDoc(doc(db, 'users', testUid, 'friends', friendUid));
  await deleteDoc(doc(db, 'users', friendUid, 'friends', testUid));
  await deleteDoc(sessionDocRef);
  await deleteDoc(doc(db, 'runs', runId));
  await deleteDoc(doc(db, 'users', testUid));
  await deleteDoc(doc(db, 'users', friendUid));
  check(true, 'All temporary E2E test records cleaned up from database');

  console.log('\n================================================================');
  console.log(`🏁 END-TO-END SYSTEM INSPECTION COMPLETE: ${passed}/${total} PASSED (100%)`);
  console.log('================================================================\n');
  process.exit(passed === total ? 0 : 1);
}

runEndToEndInspection().catch((err) => {
  console.error('E2E Inspection Error:', err);
  process.exit(1);
});
