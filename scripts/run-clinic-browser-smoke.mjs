const BASE_URL = process.env.CLINIC_SMOKE_BASE_URL || "http://localhost:3000";
const SMOKE_EMAIL = process.env.CLINIC_SMOKE_EMAIL || "hello@skinaid.mn";

const SCENARIOS = [
  {
    key: "owner-command-center",
    role: "owner",
    label: "Owner command center",
    bootstrapPath: `/api/dev/bootstrap-session?role=owner&email=${encodeURIComponent(SMOKE_EMAIL)}&next=/dashboard`,
    focusPath: "/dashboard",
    focusMarker: "clinic command center",
    expectedNav: [
      { href: "/pulse", label: "Pulse" },
      { href: "/schedule", label: "Schedule" },
      { href: "/patients", label: "Patients" },
      { href: "/treatments", label: "Treatments" },
      { href: "/checkout", label: "Checkout" },
      { href: "/billing", label: "Billing" },
      { href: "/notifications", label: "Notifications" },
      { href: "/reports", label: "Reports" },
      { href: "/clinic", label: "Clinic" }
    ],
    drilldownPages: [
      { path: "/reports", marker: "Reports" },
      { path: "/notifications", marker: "Notifications" },
      { path: "/patients", marker: "Patients" }
    ],
    dynamicChecks: [
      "patient_detail",
      "patient_follow_up_form",
      "reports_filters",
      "reports_export",
      "report_preset_form",
      "notifications_filter_form",
      "follow_up_mutation",
      "notification_retry_mutation",
      "report_preset_mutation"
    ]
  },
  {
    key: "front-desk-handoff",
    role: "front_desk",
    label: "Front desk handoff",
    bootstrapPath: `/api/dev/bootstrap-session?role=front_desk&email=${encodeURIComponent(SMOKE_EMAIL)}&next=/schedule`,
    focusPath: "/schedule",
    focusMarker: "Appointments",
    expectedNav: [
      { href: "/pulse", label: "Pulse" },
      { href: "/schedule", label: "Schedule" },
      { href: "/patients", label: "Patients" },
      { href: "/checkout", label: "Checkout" },
      { href: "/billing", label: "Billing" },
      { href: "/notifications", label: "Notifications" },
      { href: "/reports", label: "Reports" }
    ],
    drilldownPages: [
      { path: "/patients", marker: "Follow-up queue" },
      { path: "/checkout", marker: "Checkout POS" }
    ],
    dynamicChecks: ["patient_detail", "patient_follow_up_form", "notifications_filter_form", "notification_retry_mutation"]
  },
  {
    key: "provider-treatment",
    role: "provider",
    label: "Provider treatment workflow",
    bootstrapPath: `/api/dev/bootstrap-session?role=provider&email=${encodeURIComponent(SMOKE_EMAIL)}&next=/treatments`,
    focusPath: "/treatments",
    focusMarker: "Treatments",
    expectedNav: [
      { href: "/pulse", label: "Pulse" },
      { href: "/schedule", label: "Schedule" },
      { href: "/patients", label: "Patients" },
      { href: "/treatments", label: "Treatments" },
      { href: "/notifications", label: "Notifications" }
    ],
    drilldownPages: [
      { path: "/patients", marker: "Patients" },
      { path: "/notifications", marker: "Notifications" }
    ],
    dynamicChecks: ["patient_detail", "patient_follow_up_form", "notifications_filter_form"]
  },
  {
    key: "billing-reconciliation",
    role: "billing",
    label: "Billing reconciliation workflow",
    bootstrapPath: `/api/dev/bootstrap-session?role=billing&email=${encodeURIComponent(SMOKE_EMAIL)}&next=/checkout`,
    focusPath: "/checkout",
    focusMarker: "Checkout POS",
    expectedNav: [
      { href: "/pulse", label: "Pulse" },
      { href: "/patients", label: "Patients" },
      { href: "/checkout", label: "Checkout" },
      { href: "/billing", label: "Billing" },
      { href: "/notifications", label: "Notifications" },
      { href: "/reports", label: "Reports" }
    ],
    drilldownPages: [
      { path: "/billing", marker: "Billing" },
      { path: "/reports", marker: "Reports" },
      { path: "/notifications", marker: "Notifications" }
    ],
    dynamicChecks: ["reports_filters", "reports_export", "report_preset_form", "notifications_filter_form", "notification_retry_mutation"]
  }
];

function getCookiePairs(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const fallback = headers.get("set-cookie");
  return fallback ? [fallback] : [];
}

function updateCookieJar(cookieJar, headers) {
  for (const rawCookie of getCookiePairs(headers)) {
    const [pair] = rawCookie.split(";");
    const [name, ...rest] = pair.split("=");
    cookieJar.set(name.trim(), rest.join("=").trim());
  }
}

function toCookieHeader(cookieJar) {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function fetchWithCookies(pathname, cookieJar) {
  const response = await fetch(new URL(pathname, BASE_URL), {
    redirect: "manual",
    headers: cookieJar.size > 0 ? { cookie: toCookieHeader(cookieJar) } : undefined
  });

  updateCookieJar(cookieJar, response.headers);
  return response;
}

async function postJsonWithCookies(pathname, body, cookieJar) {
  const response = await fetch(new URL(pathname, BASE_URL), {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      ...(cookieJar.size > 0 ? { cookie: toCookieHeader(cookieJar) } : {})
    },
    body: JSON.stringify(body)
  });

  updateCookieJar(cookieJar, response.headers);
  return response;
}

function extractSidebarNav(html) {
  const matches = html.matchAll(
    /data-sidebar-nav-item="([^"]+)"[^>]*data-sidebar-nav-label="([^"]+)"/g
  );

  return Array.from(matches, ([, href, label]) => ({ href, label }));
}

function extractFirstPatientDetailHref(html) {
  const match = html.match(/href="(\/patients\/[^"\/?]+)"/);
  return match ? match[1] : null;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toTimestamp(value) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

async function runDynamicCheck(check, cookieJar, scenario) {
  if (check === "patient_detail") {
    const patientsResponse = await fetchWithCookies("/patients", cookieJar);
    assert(patientsResponse.ok, `[${scenario.key}] patients page failed with ${patientsResponse.status}`);
    const patientsHtml = await patientsResponse.text();
    const detailHref = extractFirstPatientDetailHref(patientsHtml);
    assert(detailHref, `[${scenario.key}] patient detail link not found on /patients`);

    const detailResponse = await fetchWithCookies(detailHref, cookieJar);
    assert(detailResponse.ok, `[${scenario.key}] patient detail failed with ${detailResponse.status}`);
    const detailHtml = await detailResponse.text();
    assert(
      detailHtml.includes("Quick handoff") ||
        detailHtml.includes("Notification history") ||
        detailHtml.includes("Patient CRM detail view") ||
        detailHtml.includes("Patient detail"),
      `[${scenario.key}] patient detail markers not found on ${detailHref}`
    );
    return;
  }

  if (check === "patient_follow_up_form") {
    const patientsResponse = await fetchWithCookies("/patients", cookieJar);
    assert(patientsResponse.ok, `[${scenario.key}] patients page failed with ${patientsResponse.status}`);
    const patientsHtml = await patientsResponse.text();
    const detailHref = extractFirstPatientDetailHref(patientsHtml);
    assert(detailHref, `[${scenario.key}] patient detail link not found on /patients`);

    const detailResponse = await fetchWithCookies(detailHref, cookieJar);
    assert(detailResponse.ok, `[${scenario.key}] patient detail failed with ${detailResponse.status}`);
    const detailHtml = await detailResponse.text();
    assert(
      detailHtml.includes("Snooze 3d") &&
        detailHtml.includes("Assign owner") &&
        detailHtml.includes("Update stage"),
      `[${scenario.key}] patient follow-up form markers missing on ${detailHref}`
    );
    return;
  }

  if (check === "reports_filters") {
    const reportsResponse = await fetchWithCookies("/reports?range=7d&provider=all&location=all", cookieJar);
    assert(reportsResponse.ok, `[${scenario.key}] filtered reports failed with ${reportsResponse.status}`);
    const reportsHtml = await reportsResponse.text();
    assert(
      reportsHtml.includes("Report filters") && reportsHtml.includes("CSV export"),
      `[${scenario.key}] report filter markers missing on filtered reports view`
    );
    return;
  }

  if (check === "report_preset_form") {
    const reportsResponse = await fetchWithCookies("/reports?range=7d&provider=all&location=all", cookieJar);
    assert(reportsResponse.ok, `[${scenario.key}] reports page for preset form failed with ${reportsResponse.status}`);
    const reportsHtml = await reportsResponse.text();
    assert(
      reportsHtml.includes("Save current preset") &&
        reportsHtml.includes("Preset хадгалах") &&
        reportsHtml.includes("Preset name"),
      `[${scenario.key}] report preset form markers missing on /reports`
    );
    return;
  }

  if (check === "reports_export") {
    const reportsResponse = await fetchWithCookies("/reports?range=7d&provider=all&location=all", cookieJar);
    assert(reportsResponse.ok, `[${scenario.key}] reports page for export failed with ${reportsResponse.status}`);
    const reportsHtml = await reportsResponse.text();
    assert(
      reportsHtml.includes("/reports/export?range=7d") || reportsHtml.includes("CSV export"),
      `[${scenario.key}] reports export link missing on filtered reports view`
    );
    return;
  }

  if (check === "notifications_filter_form") {
    const notificationsResponse = await fetchWithCookies(
      "/notifications?range=7d&status=failed&channel=all&provider=all",
      cookieJar
    );
    assert(
      notificationsResponse.ok,
      `[${scenario.key}] notifications filter page failed with ${notificationsResponse.status}`
    );
    const notificationsHtml = await notificationsResponse.text();
    assert(
      notificationsHtml.includes("Filters") &&
        notificationsHtml.includes("Apply filters") &&
        notificationsHtml.includes("All statuses") &&
        notificationsHtml.includes("All channels") &&
        notificationsHtml.includes("All providers") &&
        (notificationsHtml.includes("Delivery history") || notificationsHtml.includes("Failed attempts")),
      `[${scenario.key}] notification filter form content missing on /notifications`
    );
    return;
  }

  if (check === "notifications_actions_panel") {
    const notificationsResponse = await fetchWithCookies("/notifications?range=7d&status=all&channel=all&provider=all", cookieJar);
    assert(
      notificationsResponse.ok,
      `[${scenario.key}] notifications actions page failed with ${notificationsResponse.status}`
    );
    const notificationsHtml = await notificationsResponse.text();
    assert(
      notificationsHtml.includes("Retry & requeue queue") &&
        (notificationsHtml.includes("Retry now") ||
          notificationsHtml.includes("Requeue") ||
          notificationsHtml.includes("Тохирох reminder/follow-up job алга байна.")),
      `[${scenario.key}] notifications actions panel missing on /notifications`
    );
    return;
  }

  if (check === "follow_up_mutation") {
    const response = await postJsonWithCookies(
      "/api/dev/clinic-smoke-mutations",
      { operation: "follow_up_roundtrip" },
      cookieJar
    );
    assert(response.ok, `[${scenario.key}] follow-up mutation failed with ${response.status}`);
    const payload = await response.json();
    assert(payload?.ok === true, `[${scenario.key}] follow-up mutation did not return ok=true`);
    assert(payload?.operation === "follow_up_roundtrip", `[${scenario.key}] follow-up mutation echoed wrong operation`);
    const result = payload?.result;
    assert(
      result?.afterUpdate?.lifecycleStage === "follow_up_due",
      `[${scenario.key}] follow-up lifecycle stage did not update`
    );
    assert(
      toTimestamp(result?.afterUpdate?.nextFollowUpAt) === toTimestamp(result?.updatedNextFollowUpAt),
      `[${scenario.key}] follow-up next date did not update as expected`
    );
    assert(
      toTimestamp(result?.afterUpdate?.lastContactedAt) === toTimestamp(result?.updatedLastContactedAt),
      `[${scenario.key}] follow-up last contacted date did not update as expected`
    );
    assert(
      result?.afterRestore?.lifecycleStage === result?.before?.lifecycleStage,
      `[${scenario.key}] follow-up lifecycle stage did not restore to baseline`
    );
    assert(
      result?.afterRestore?.nextFollowUpAt === result?.before?.nextFollowUpAt,
      `[${scenario.key}] follow-up next date did not restore to baseline`
    );
    assert(
      result?.afterRestore?.lastContactedAt === result?.before?.lastContactedAt,
      `[${scenario.key}] follow-up last contacted did not restore to baseline`
    );
    return;
  }

  if (check === "notification_retry_mutation") {
    const response = await postJsonWithCookies(
      "/api/dev/clinic-smoke-mutations",
      { operation: "notification_retry_roundtrip" },
      cookieJar
    );
    assert(response.ok, `[${scenario.key}] notification retry mutation failed with ${response.status}`);
    const payload = await response.json();
    assert(payload?.ok === true, `[${scenario.key}] notification retry mutation did not return ok=true`);
    assert(
      payload?.operation === "notification_retry_roundtrip",
      `[${scenario.key}] notification retry mutation echoed wrong operation`
    );
    const result = payload?.result;
    assert(result?.beforeStatus === "failed", `[${scenario.key}] notification retry seed was not failed`);
    assert(result?.status === "queued", `[${scenario.key}] notification retry result was not queued`);
    assert(
      result?.countsAfterSeed?.failed === result?.countsBefore?.failed + 1,
      `[${scenario.key}] failed count did not increase after retry seed`
    );
    assert(
      result?.countsAfterRetry?.failed === result?.countsBefore?.failed,
      `[${scenario.key}] failed count did not drop back after retry`
    );
    assert(
      result?.countsAfterRetry?.queued === result?.countsBefore?.queued + 1,
      `[${scenario.key}] queued count did not increase after retry`
    );
    assert(
      result?.countsAfterCleanup?.queued === result?.countsBefore?.queued,
      `[${scenario.key}] queued count did not return to baseline after cleanup`
    );
    assert(
      result?.countsAfterCleanup?.failed === result?.countsBefore?.failed,
      `[${scenario.key}] failed count did not return to baseline after cleanup`
    );
    return;
  }

  if (check === "checkout_payment_mutation") {
    const response = await postJsonWithCookies(
      "/api/dev/clinic-smoke-mutations",
      { operation: "checkout_payment_roundtrip" },
      cookieJar
    );
    assert(response.ok, `[${scenario.key}] checkout payment mutation failed with ${response.status}`);
    const payload = await response.json();
    assert(payload?.ok === true, `[${scenario.key}] checkout payment mutation did not return ok=true`);
    assert(
      payload?.operation === "checkout_payment_roundtrip",
      `[${scenario.key}] checkout payment mutation echoed wrong operation`
    );
    const result = payload?.result;
    assert(result?.beforeStatus === "unpaid", `[${scenario.key}] checkout seed was not unpaid`);
    assert(result?.afterPaymentStatus === "partial", `[${scenario.key}] checkout did not become partial after payment`);
    assert(
      result?.countsAfterCheckout?.checkouts === result?.countsBefore?.checkouts + 1,
      `[${scenario.key}] checkout count did not increase after temp checkout create`
    );
    assert(
      result?.countsAfterPayment?.payments === result?.countsBefore?.payments + 1,
      `[${scenario.key}] payment count did not increase after temp payment create`
    );
    assert(
      result?.countsAfterCleanup?.checkouts === result?.countsBefore?.checkouts,
      `[${scenario.key}] checkout count did not restore after cleanup`
    );
    assert(
      result?.countsAfterCleanup?.payments === result?.countsBefore?.payments,
      `[${scenario.key}] payment count did not restore after cleanup`
    );
    return;
  }

  if (check === "report_preset_mutation") {
    const response = await postJsonWithCookies(
      "/api/dev/clinic-smoke-mutations",
      { operation: "report_preset_roundtrip" },
      cookieJar
    );
    assert(response.ok, `[${scenario.key}] report preset mutation failed with ${response.status}`);
    const payload = await response.json();
    assert(payload?.ok === true, `[${scenario.key}] report preset mutation did not return ok=true`);
    assert(
      payload?.operation === "report_preset_roundtrip",
      `[${scenario.key}] report preset mutation echoed wrong operation`
    );
    const result = payload?.result;
    assert(
      result?.countAfterInsert === result?.countBefore + 1,
      `[${scenario.key}] report preset count did not increase after insert`
    );
    assert(
      result?.countAfterDelete === result?.countBefore,
      `[${scenario.key}] report preset count did not restore after delete`
    );
  }
}

async function runScenario(scenario) {
  const cookieJar = new Map();
  const bootstrapResponse = await fetchWithCookies(scenario.bootstrapPath, cookieJar);
  assert(
    bootstrapResponse.status >= 300 && bootstrapResponse.status < 400,
    `[${scenario.key}] bootstrap redirect expected, got ${bootstrapResponse.status}`
  );

  const focusResponse = await fetchWithCookies(scenario.focusPath, cookieJar);
  assert(focusResponse.ok, `[${scenario.key}] focus page failed with ${focusResponse.status}`);

  const html = await focusResponse.text();
  assert(
    html.includes(scenario.focusMarker),
    `[${scenario.key}] focus marker "${scenario.focusMarker}" not found on ${scenario.focusPath}`
  );

  const navItems = extractSidebarNav(html);
  for (const item of scenario.expectedNav) {
    assert(
      navItems.some((navItem) => navItem.href === item.href && navItem.label === item.label),
      `[${scenario.key}] missing nav item ${item.label} (${item.href})`
    );
  }

  for (const page of scenario.drilldownPages) {
    const pageResponse = await fetchWithCookies(page.path, cookieJar);
    assert(pageResponse.ok, `[${scenario.key}] drilldown ${page.path} failed with ${pageResponse.status}`);
    const pageHtml = await pageResponse.text();
    assert(
      pageHtml.includes(page.marker),
      `[${scenario.key}] drilldown marker "${page.marker}" not found on ${page.path}`
    );
  }

  for (const check of scenario.dynamicChecks) {
    await runDynamicCheck(check, cookieJar, scenario);
  }

  console.log(`PASS ${scenario.key} -> ${scenario.focusPath}`);
}

async function main() {
  for (const scenario of SCENARIOS) {
    await runScenario(scenario);
  }

  console.log(`Clinic browser smoke passed for ${SCENARIOS.length} scenarios on ${BASE_URL} using ${SMOKE_EMAIL}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
