#!/usr/bin/env node
/**
 * API smoke test for a deployed environment (intended for Vercel previews).
 *
 *   SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke.mjs https://<preview>.vercel.app
 *
 * Env:
 *   SMOKE_BASE_URL         Base URL (alternative to the positional argument)
 *   SMOKE_EMAIL            Dedicated test user (must already exist and be confirmed)
 *   SMOKE_PASSWORD         Its password
 *   SMOKE_BYPASS_SECRET    Optional Vercel "Protection Bypass for Automation" secret,
 *                          sent as x-vercel-protection-bypass for protected previews
 *
 * Creates a throwaway group (plus event, items, poll, etc.), exercises the main
 * API routes with it, then deletes the group. Group deletion is a soft delete, so
 * point this at a preview/scratch database, not prod. Does not touch routes that
 * send email/SMS or call third parties (auth/sms, forgot-password, invitations,
 * calendar/google).
 *
 * Exit code 1 if any check fails.
 */

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || '').replace(/\/+$/, '');
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
const BYPASS = process.env.SMOKE_BYPASS_SECRET;

if (!BASE || !EMAIL || !PASSWORD) {
  console.error(
    'Usage: SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke.mjs <base-url>\n' +
      '(SMOKE_BASE_URL may be used instead of the argument.)'
  );
  process.exit(2);
}

const RUN_ID = `smoke-${Date.now().toString(36)}`;
const results = [];
let token = null;
let idToken = null;

function headers(extra = {}, authed = true) {
  const h = { 'content-type': 'application/json', ...extra };
  if (BYPASS) h['x-vercel-protection-bypass'] = BYPASS;
  if (authed && token) {
    // Routes authenticate with either the Bearer header or the accessToken cookie.
    h.authorization = `Bearer ${token}`;
    h.cookie = `accessToken=${token}; idToken=${idToken}`;
  }
  return h;
}

async function call(method, path, body, { authed = true } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: headers({}, authed),
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON body (e.g. a redirect or an HTML protection page)
  }
  return { status: res.status, json, text };
}

/** Find the first `id` in a response: data.id, else the first nested object's id. */
function findId(json) {
  const data = json?.data ?? json;
  if (!data || typeof data !== 'object') return undefined;
  if (typeof data.id === 'string') return data.id;
  for (const v of Object.values(data)) {
    if (v && typeof v === 'object' && typeof v.id === 'string') return v.id;
  }
  return undefined;
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const out = await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ok    ${name}`);
    return out;
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - started, error: err.message });
    console.log(`  FAIL  ${name}\n        ${err.message}`);
    return undefined;
  }
}

function expect(res, statuses, label = '') {
  const allowed = Array.isArray(statuses) ? statuses : [statuses];
  if (!allowed.includes(res.status)) {
    const snippet = res.text.slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(`${label}expected ${allowed.join('/')}, got ${res.status}: ${snippet}`);
  }
  return res;
}

async function main() {
  console.log(`Smoke test ${RUN_ID} against ${BASE}\n`);

  // --- Unauthenticated behavior -------------------------------------------------
  console.log('Unauthenticated');
  await step('GET /api/groups without auth -> 401', async () => {
    expect(await call('GET', '/api/groups', undefined, { authed: false }), 401);
  });
  await step('GET /api/auth/me without auth -> 401', async () => {
    expect(await call('GET', '/api/auth/me', undefined, { authed: false }), 401);
  });
  await step('POST /api/auth/login with bad body -> 4xx', async () => {
    const res = await call('POST', '/api/auth/login', { email: 'nope' }, { authed: false });
    expect(res, [400, 401, 422]);
  });

  // --- Login ----------------------------------------------------------------------
  console.log('\nAuth');
  const loggedIn = await step('POST /api/auth/login', async () => {
    const res = expect(await call('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, { authed: false }), 200);
    if (!res.json?.accessToken || !res.json?.idToken) throw new Error('login response missing tokens');
    token = res.json.accessToken;
    idToken = res.json.idToken;
    return true;
  });
  if (!loggedIn) {
    console.log('\nLogin failed; cannot continue with authenticated checks.');
    return;
  }

  await step('GET /api/auth/me', async () => {
    expect(await call('GET', '/api/auth/me'), 200);
  });
  await step('GET /api/users/profile', async () => {
    expect(await call('GET', '/api/users/profile'), 200);
  });
  await step('GET /api/user/invitations', async () => {
    expect(await call('GET', '/api/user/invitations'), 200);
  });
  await step('GET /api/circles', async () => {
    expect(await call('GET', '/api/circles'), 200);
  });

  // --- Group ----------------------------------------------------------------------
  console.log('\nGroup');
  let groupId;
  let inviteCode;
  await step('POST /api/groups', async () => {
    const res = expect(await call('POST', '/api/groups', { name: `Smoke ${RUN_ID}`, description: 'Automated smoke test' }), 201);
    groupId = res.json?.group?.id;
    inviteCode = res.json?.group?.invite_code;
    if (!groupId) throw new Error('no group id in response');
  });
  if (!groupId) {
    console.log('\nGroup creation failed; skipping the rest.');
    return;
  }

  try {
    const g = `/api/groups/${groupId}`;
    await step('GET /api/groups (lists new group)', async () => {
      const res = expect(await call('GET', '/api/groups'), 200);
      if (!JSON.stringify(res.json).includes(groupId)) throw new Error('new group missing from list');
    });
    await step('GET group', async () => expect(await call('GET', g), 200));
    await step('GET group members', async () => expect(await call('GET', `${g}/members`), 200));
    await step('GET group invitations', async () => expect(await call('GET', `${g}/invitations`), 200));
    await step('GET group dashboard-widgets', async () => expect(await call('GET', `${g}/dashboard-widgets`), 200));
    await step('GET group availabilities', async () => expect(await call('GET', `${g}/availabilities`), 200));
    await step('GET group availability-overview', async () => expect(await call('GET', `${g}/availability-overview`), 200));
    await step('GET group logistics-categories', async () => expect(await call('GET', `${g}/logistics-categories`), 200));
    if (inviteCode) {
      await step('GET invite by code', async () => expect(await call('GET', `/api/groups/invite/${inviteCode}`), 200));
    }

    // --- Wishlist ---------------------------------------------------------------
    console.log('\nWishlist');
    const wishId = await step('POST wishlist item', async () => {
      const res = expect(await call('POST', `${g}/wishlist`, { title: 'Smoke wish', description: 'x' }), 201);
      return findId(res.json);
    });
    await step('GET wishlist', async () => expect(await call('GET', `${g}/wishlist`), 200));
    if (wishId) {
      await step('DELETE wishlist item', async () => expect(await call('DELETE', `${g}/wishlist/${wishId}`), 200));
    }

    // --- Event ------------------------------------------------------------------
    console.log('\nEvent');
    let eventId;
    await step('POST event', async () => {
      const date = new Date(Date.now() + 14 * 86400_000).toISOString();
      const res = expect(
        await call('POST', `${g}/events`, { title: `Smoke event ${RUN_ID}`, date, threshold: 2, location: 'Nowhere' }),
        201
      );
      eventId = res.json?.data?.event?.id;
      if (!eventId) throw new Error('no event id in response');
    });
    if (!eventId) return;
    const e = `${g}/events/${eventId}`;

    await step('GET events', async () => expect(await call('GET', `${g}/events`), 200));
    await step('GET event', async () => expect(await call('GET', e), 200));
    await step('GET event dashboard-widgets', async () => expect(await call('GET', `${e}/dashboard-widgets`), 200));
    await step('POST rsvp', async () => expect(await call('POST', `${e}/rsvp`, { status: 'in' }), 200));
    await step('GET rsvp-status', async () => expect(await call('GET', `${e}/rsvp-status`), 200));
    await step('GET confirmation', async () => expect(await call('GET', `${e}/confirmation`), [200, 404]));
    await step('GET group calendar', async () => expect(await call('GET', `${g}/calendar`), 200));

    // Comments
    await step('POST + GET event comment', async () => {
      expect(await call('POST', `${e}/comments`, { content: 'smoke comment' }), 201);
      const res = expect(await call('GET', `${e}/comments`), 200);
      if (!res.text.includes('smoke comment')) throw new Error('comment not returned');
    });

    // Checklist
    const checkId = await step('POST checklist item', async () => {
      const res = expect(await call('POST', `${e}/checklist`, { title: 'Smoke item' }), 201);
      return findId(res.json);
    });
    await step('GET checklist', async () => expect(await call('GET', `${e}/checklist`), 200));
    if (checkId) {
      await step('POST checklist item comment', async () => {
        expect(await call('POST', `${e}/checklist/${checkId}/comments`, { content: 'smoke' }), 201);
      });
      await step('GET checklist item comments', async () => expect(await call('GET', `${e}/checklist/${checkId}/comments`), 200));
      await step('DELETE checklist item', async () => expect(await call('DELETE', `${e}/checklist/${checkId}`), 200));
    }

    // Logistics
    const logId = await step('POST logistics item', async () => {
      const res = expect(await call('POST', `${e}/logistics`, { category: 'Food', title: 'Smoke snacks', capacity: 2 }), 201);
      return findId(res.json);
    });
    await step('GET logistics', async () => expect(await call('GET', `${e}/logistics`), 200));
    if (logId) {
      await step('POST logistics claim', async () => expect(await call('POST', `${e}/logistics/${logId}/claims`, {}), [200, 201]));
      await step('DELETE logistics item', async () => expect(await call('DELETE', `${e}/logistics/${logId}`), 200));
    }

    // Timeline
    const tlId = await step('POST timeline item', async () => {
      const res = expect(await call('POST', `${e}/timeline`, { item_time: '18:00', title: 'Smoke kickoff' }), 201);
      return findId(res.json);
    });
    await step('GET timeline', async () => expect(await call('GET', `${e}/timeline`), 200));
    if (tlId) {
      await step('DELETE timeline item', async () => expect(await call('DELETE', `${e}/timeline/${tlId}`), 200));
    }

    // Notes
    const noteId = await step('POST note', async () => {
      const res = expect(await call('POST', `${e}/notes`, { title: 'Smoke note', body: 'hello' }), 201);
      return findId(res.json);
    });
    await step('GET notes', async () => expect(await call('GET', `${e}/notes`), 200));
    if (noteId) {
      await step('DELETE note', async () => expect(await call('DELETE', `${e}/notes/${noteId}`), 200));
    }

    // Polls
    const poll = await step('POST poll', async () => {
      const res = expect(await call('POST', `${e}/polls`, { question: 'Smoke?', options: ['Yes', 'No'] }), 201);
      return res.json;
    });
    await step('GET polls', async () => expect(await call('GET', `${e}/polls`), 200));
    const pollId = findId(poll);
    const optionId = poll?.data?.options?.[0]?.id ?? poll?.data?.poll?.options?.[0]?.id;
    if (pollId && optionId) {
      await step('POST poll vote', async () => expect(await call('POST', `${e}/polls/${pollId}/vote`, { option_id: optionId }), 200));
    }
    if (pollId) {
      await step('POST + GET poll comment', async () => {
        expect(await call('POST', `${e}/polls/${pollId}/comments`, { content: 'smoke' }), 201);
        expect(await call('GET', `${e}/polls/${pollId}/comments`), 200);
      });
      await step('DELETE poll', async () => expect(await call('DELETE', `${e}/polls/${pollId}`), 200));
    }

    // Public link
    console.log('\nPublic event link');
    let publicToken;
    await step('POST public-link', async () => {
      const res = expect(await call('POST', `/api/events/${eventId}/public-link`, {}), [200, 201]);
      publicToken = res.json?.data?.publicToken ?? res.json?.publicToken;
      if (!publicToken) throw new Error('no publicToken in response');
    });
    if (publicToken) {
      await step('GET public event (no auth)', async () => {
        expect(await call('GET', `/api/events/public/${publicToken}`, undefined, { authed: false }), 200);
      });
      await step('GET public planning (no auth)', async () => {
        expect(await call('GET', `/api/events/public/${publicToken}/planning`, undefined, { authed: false }), 200);
      });
      await step('DELETE public-link', async () => expect(await call('DELETE', `/api/events/${eventId}/public-link`), 200));
      await step('GET public event after revoke -> 404', async () => {
        expect(await call('GET', `/api/events/public/${publicToken}`, undefined, { authed: false }), [403, 404, 410]);
      });
    }
  } finally {
    console.log('\nCleanup');
    await step('DELETE group', async () => expect(await call('DELETE', `/api/groups/${groupId}`), 200));
    await step('GET deleted group -> 404', async () => expect(await call('GET', `/api/groups/${groupId}`), [403, 404]));
  }
}

try {
  await main();
} catch (err) {
  console.error('\nUnexpected error:', err);
  results.push({ name: 'script', ok: false, error: String(err) });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('Failed:');
  for (const f of failed) console.log(`  - ${f.name}: ${f.error}`);
  process.exit(1);
}
