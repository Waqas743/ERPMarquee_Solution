const base = process.env.BASE_URL || 'http://localhost:3000';

async function main() {
  try {
    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'info@grandmarquee.com', password: 'admin123' }),
    });
    const login = await loginRes.json();
    if (!loginRes.ok || !login.token) {
      console.error('LOGIN FAIL', login);
      process.exit(1);
    }
    const token = login.token;
    const tenantId = login.user?.tenantId;
    const headers = { Authorization: `Bearer ${token}` };

    const results = [];
    const T = async (path) => {
      try {
        const res = await fetch(`${base}${path}`, { headers });
        const text = await res.text();
        let count = 0;
        try {
          const json = JSON.parse(text);
          count = Array.isArray(json) ? json.length : (typeof json === 'object' && json !== null ? Object.keys(json).length : 1);
        } catch {
          count = text.length;
        }
        results.push(`${path}: OK (${count})`);
        return text;
      } catch (e) {
        results.push(`${path}: FAIL ${e.message}`);
        return null;
      }
    };

    const paths = [
      `/api/branches?tenantId=${tenantId}`,
      `/api/users?tenantId=${tenantId}`,
      `/api/roles?tenantId=${tenantId}`,
      `/api/halls?tenantId=${tenantId}`,
      `/api/menu-categories?tenantId=${tenantId}`,
      `/api/menu-items?tenantId=${tenantId}`,
      `/api/add-ons?tenantId=${tenantId}`,
      `/api/event-packages?tenantId=${tenantId}`,
      `/api/tasks?tenantId=${tenantId}`,
      `/api/reports/package-revenue?tenantId=${tenantId}`,
      `/api/reports/popular-items?tenantId=${tenantId}`,
      `/api/settings?tenantId=${tenantId}`,
      `/api/bookings?tenantId=${tenantId}`,
      `/api/dashboard/stats?tenantId=${tenantId}`,
      `/api/dashboard/calendar?tenantId=${tenantId}`,
      `/api/dashboard/upcoming-events?tenantId=${tenantId}`,
      `/api/dashboard/completed-events?tenantId=${tenantId}`,
      `/api/dashboard/invoices?tenantId=${tenantId}`,
      `/api/dashboard/charts?tenantId=${tenantId}`,
    ];

    // Batch basic endpoints
    await Promise.all(paths.map((p) => T(p)));

    // Drill down booking detail
    const bookingsText = await T(`/api/bookings?tenantId=${tenantId}`);
    let firstBookingId = null;
    try {
      const bookings = JSON.parse(bookingsText || '[]');
      if (Array.isArray(bookings) && bookings.length > 0) {
        firstBookingId = bookings[0].id;
      }
    } catch {}
    if (firstBookingId) {
      await T(`/api/bookings/${firstBookingId}`);
      await T(`/api/bookings/${firstBookingId}/payments`);
      await T(`/api/bookings/${firstBookingId}/approvals`);
      await T(`/api/bookings/${firstBookingId}/menu-items`);
      await T(`/api/bookings/${firstBookingId}/add-ons`);
      await T(`/api/bookings/${firstBookingId}/contract`);
    }

    // Drill down package detail
    const pkgsText = await T(`/api/event-packages?tenantId=${tenantId}`);
    try {
      const pkgs = JSON.parse(pkgsText || '[]');
      if (Array.isArray(pkgs) && pkgs.length > 0) {
        await T(`/api/event-packages/${pkgs[0].id}`);
      }
    } catch {}

    // Hall calendar
    const hallsText = await T(`/api/halls?tenantId=${tenantId}`);
    try {
      const halls = JSON.parse(hallsText || '[]');
      if (Array.isArray(halls) && halls.length > 0) {
        await T(`/api/hall-calendar?hallId=${halls[0].id}`);
      }
    } catch {}

    console.log('--- Endpoint Verification ---');
    for (const line of results) console.log(line);
    const failures = results.filter((l) => l.includes(': FAIL '));
    if (failures.length > 0) {
      console.error('FAILURES:', failures.length);
      process.exit(2);
    } else {
      console.log('ALL OK');
    }
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
}

main();

