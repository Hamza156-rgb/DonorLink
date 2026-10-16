#!/usr/bin/env node
// Seeds the LOCAL Firebase emulators with test logins and fictional donors. Never touches a real project.
// Usage: start the emulators (npm run emulators), then: npm run seed
// All names and numbers below are made up for local testing.

const PROJECT = 'demo-donorlink';
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`;
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };   // emulator-only admin token

if (!PROJECT.startsWith('demo-') || ![AUTH, FS].every(u => /\/\/(127\.0\.0\.1|localhost):\d+$/.test(u))) {
  console.error('Refusing to seed: this script only runs against local emulators with a demo- project.'); process.exit(1);
}

// ---------- Test logins (local only)
const LOGINS = [
  { email: 'donor@donorlink.test', password: 'Donor@12345', fullName: 'Ali Hassan', phone: '+923000000001', preferredContact: 'whatsapp', verified: true,
    donor: { bloodGroup: 'O+', city: 'Lahore', province: 'Punjab', availability: 'available' } },
  { email: 'seeker@donorlink.test', password: 'Seeker@12345', fullName: 'Sana Malik', phone: '+923000000002', preferredContact: 'phone', verified: true },
  { email: 'newuser@donorlink.test', password: 'Newuser@12345', fullName: 'Usman Tariq', phone: '+923000000003', preferredContact: 'in_app', verified: false },
];

// ---------- Fictional donors
const FIRST = ['Ahmed','Fatima','Bilal','Ayesha','Hamza','Zainab','Usman','Maryam','Hassan','Hira','Umar','Sana','Ali','Khadija','Saad','Iqra',
  'Imran','Rabia','Faisal','Mehwish','Kamran','Noor','Asad','Amna','Zeeshan','Saba','Waqas','Laiba','Junaid','Areeba','Shahid','Mahnoor',
  'Tariq','Hafsa','Adeel','Bushra','Naveed','Sidra','Danish','Anum'];
const LAST = ['Raza','Khan','Malik','Siddiqui','Qureshi','Butt','Chaudhry','Sheikh','Awan','Mirza','Baloch','Shah','Abbasi','Hussain','Iqbal',
  'Javed','Rana','Gondal','Jutt','Yousafzai','Afridi','Soomro','Memon','Bhatti','Niazi','Akhtar'];
const CITIES = [ // [city, province, weight]
  ['Lahore','Punjab',10],['Karachi','Sindh',10],['Islamabad','Islamabad Capital Territory',6],['Rawalpindi','Punjab',6],['Faisalabad','Punjab',5],
  ['Peshawar','Khyber Pakhtunkhwa',5],['Multan','Punjab',4],['Quetta','Balochistan',3],['Hyderabad','Sindh',3],['Gujranwala','Punjab',3],
  ['Sialkot','Punjab',2],['Bahawalpur','Punjab',2],['Sukkur','Sindh',2],['Abbottabad','Khyber Pakhtunkhwa',2],['Mardan','Khyber Pakhtunkhwa',1],
  ['Sargodha','Punjab',1],['Larkana','Sindh',1],['Gilgit','Gilgit-Baltistan',1],['Muzaffarabad','Azad Kashmir',1],['Gwadar','Balochistan',1],
  ['Mirpur','Azad Kashmir',1],['Dera Ismail Khan','Khyber Pakhtunkhwa',1],['Skardu','Gilgit-Baltistan',1],['Turbat','Balochistan',1],
];
const GROUPS = [['O+',35],['B+',28],['A+',20],['AB+',7],['O-',4],['B-',3],['A-',2],['AB-',1]];

let seed = 20261016;   // deterministic, so every run produces the same data
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const weighted = (xs) => { const t = xs.reduce((s, x) => s + x.at(-1), 0); let r = rnd() * t; for (const x of xs) if ((r -= x.at(-1)) < 0) return x; return xs[0]; };

function donors() {
  const out = [];
  for (let i = 0; i < 18; i++) out.push({ group: 'O+', city: 'Lahore', province: 'Punjab' });   // > 15 so "Load more" shows
  for (let i = 0; i < 62; i++) { const [city, province] = weighted(CITIES); out.push({ group: weighted(GROUPS)[0], city, province }); }
  for (const g of ['A-', 'B-', 'AB-', 'O-']) out.push({ group: g, city: 'Karachi', province: 'Sindh' });   // every group has someone in Karachi
  return out.map((d, i) => {
    const r = rnd();
    return {
      id: `demo-donor-${String(i + 1).padStart(3, '0')}`,
      displayName: `${pick(FIRST)} ${pick(LAST)[0]}.`,   // first name + initial: listed donors stay hard to identify
      bloodGroup: d.group, city: d.city, province: d.province,
      availability: r < 0.72 ? 'available' : r < 0.92 ? 'temporarily_unavailable' : 'not_donating',
      discoverable: i % 23 !== 7,                         // a few opted out of search; they must never appear
      verified: rnd() < 0.3,
      updatedAt: new Date(Date.now() - Math.floor(rnd() * 30 * 24 * 60) * 60_000),
    };
  });
}

// ---------- REST helpers (emulator endpoints)
const val = (v) => v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'boolean' ? { booleanValue: v }
  : v && typeof v === 'object' ? { mapValue: { fields: fields(v) } } : { stringValue: String(v) };
function fields(o) { return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)])); }
async function call(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${init?.method ?? 'GET'} ${url} → ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
const putDoc = (path, data) => call(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: fields(data) }) });

async function main() {
  try { await fetch(`${AUTH}/`); await fetch(`${FS}/`); }
  catch { console.error(`Emulators aren't running. Start them first: npm run emulators`); process.exit(1); }

  // Fresh start, so running the script twice gives the same result.
  await call(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await call(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });

  const uid = {};
  for (const l of LOGINS) {
    const { localId } = await call(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: l.email, password: l.password, returnSecureToken: true }) });
    await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
      method: 'POST', headers: OWNER, body: JSON.stringify({ localId, displayName: l.fullName, emailVerified: l.verified }) });
    uid[l.email] = localId;
    const now = new Date();
    await putDoc(`privateProfiles/${localId}`, { fullName: l.fullName, email: l.email, phone: l.phone, preferredContact: l.preferredContact, createdAt: now, updatedAt: now });
    if (l.donor) await putDoc(`publicDonorProfiles/${localId}`, { displayName: 'Ali H.', ...l.donor, discoverable: true, verified: true, updatedAt: now });
  }

  const list = donors();
  for (let i = 0; i < list.length; i += 20)
    await Promise.all(list.slice(i, i + 20).map(({ id, ...d }) => putDoc(`publicDonorProfiles/${id}`, d)));

  // ---------- Sample contact requests in every state (see Requests tab)
  const ali = uid['donor@donorlink.test'], sana = uid['seeker@donorlink.test'], d = (i) => list[i];
  const ago = (min) => new Date(Date.now() - min * 60_000);
  const reqs = [
    { fromUid: sana, toUid: ali, fromName: 'Sana Malik', toName: 'Ali H.', status: 'pending', bloodGroup: 'O+', urgency: 'today', hospital: 'Mayo Hospital, Lahore', city: 'Lahore',
      message: 'My father is in surgical ward 3. The blood bank needs 2 bags of O+ before 6 pm.', createdAt: ago(18) },
    { fromUid: 'demo-requester-1', toUid: ali, fromName: 'Bilal Khan', toName: 'Ali H.', status: 'pending', bloodGroup: 'O+', urgency: 'this_week', hospital: 'Services Hospital, Lahore', city: 'Lahore',
      message: 'Planned operation on Friday for my mother.', createdAt: ago(130) },
    { fromUid: 'demo-requester-2', toUid: ali, fromName: 'Hira Shah', toName: 'Ali H.', status: 'accepted', bloodGroup: 'O+', urgency: 'today', hospital: 'Jinnah Hospital, Lahore', city: 'Lahore',
      message: '', createdAt: ago(60 * 26), respondedAt: ago(60 * 25), sharedContact: { name: 'Ali Hassan', phone: '+923000000001', preferredContact: 'whatsapp' } },
    { fromUid: sana, toUid: d(2).id, fromName: 'Sana Malik', toName: d(2).displayName, status: 'accepted', bloodGroup: d(2).bloodGroup, urgency: 'today', hospital: 'Mayo Hospital, Lahore', city: d(2).city,
      message: 'Thank you for helping.', createdAt: ago(240), respondedAt: ago(200), sharedContact: { name: `${d(2).displayName.split(' ')[0]} (demo donor)`, phone: '+923000000010', preferredContact: 'whatsapp' } },
    { fromUid: sana, toUid: d(5).id, fromName: 'Sana Malik', toName: d(5).displayName, status: 'pending', bloodGroup: d(5).bloodGroup, urgency: 'today', hospital: 'Mayo Hospital, Lahore', city: d(5).city, message: '', createdAt: ago(45) },
    { fromUid: sana, toUid: d(7).id, fromName: 'Sana Malik', toName: d(7).displayName, status: 'declined', bloodGroup: d(7).bloodGroup, urgency: 'this_week', hospital: 'Ganga Ram Hospital, Lahore', city: d(7).city, message: '', createdAt: ago(60 * 30), respondedAt: ago(60 * 29) },
  ];
  for (const r of reqs) await putDoc(`contactRequests/${r.fromUid}_${r.toUid}`, { ...r, updatedAt: r.respondedAt ?? r.createdAt });

  const byGroup = Object.fromEntries(GROUPS.map(([g]) => [g, list.filter(d => d.bloodGroup === g && d.discoverable).length]));
  console.log(`\n✔ Seeded ${list.length + 1} donor profiles (${list.filter(d => !d.discoverable).length} hidden from search) and ${LOGINS.length} logins.`);
  console.log('  Searchable donors by group:', Object.entries(byGroup).map(([g, n]) => `${g} ${n}`).join(' · '));
  console.log(`  ${reqs.length} sample contact requests (pending, accepted, declined) for the donor and seeker logins.`);
  console.log('\n  Local test logins (emulator only):');
  for (const l of LOGINS) console.log(`   ${l.email.padEnd(24)} ${l.password.padEnd(14)} ${l.verified ? (l.donor ? 'verified · listed donor (O+ Lahore)' : 'verified · seeker') : 'NOT verified · tests the verify-email screen'}`);
  console.log('\n  Emulator UI: http://127.0.0.1:4000   App: http://localhost:8100\n');
}

main().catch((e) => { console.error('Seeding failed:', e.message); process.exit(1); });
