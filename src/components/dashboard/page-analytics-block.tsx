import type { DailyMetricSummary, PostMetricSummary, SyncJobSummary } from "@/modules/sync/data";

function impressionsProxy(d: DailyMetricSummary): number | null {
  return d.impressions ?? d.reach ?? null;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pctChange(prev: number, next: number): string | null {
  if (prev <= 0) return null;
  const p = Math.round(((next - prev) / prev) * 1000) / 10;
  if (p > 0) return `+${p}%`;
  return `${p}%`;
}

function MiniSparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 36;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="ui-sparkline-wrap" title={label}>
      <svg className="ui-sparkline" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
        <polyline fill="none" stroke="var(--color-accent)" strokeWidth="1.5" points={pts} />
      </svg>
    </div>
  );
}

function compareWindows(
  series: DailyMetricSummary[],
  pick: (d: DailyMetricSummary) => number | null
): { recentAvg: number; priorAvg: number; change: string | null } | null {
  if (series.length < 14) return null;
  const prev7rows = series.slice(-14, -7);
  const last7rows = series.slice(-7);
  const priorVals = prev7rows.map(pick).filter((v): v is number => v != null && !Number.isNaN(v));
  const recentVals = last7rows.map(pick).filter((v): v is number => v != null && !Number.isNaN(v));
  if (priorVals.length < 3 || recentVals.length < 3) return null;
  const priorAvg = avg(priorVals);
  const recentAvg = avg(recentVals);
  if (priorAvg == null || recentAvg == null || priorAvg === 0) return null;
  return { recentAvg, priorAvg, change: pctChange(priorAvg, recentAvg) };
}

export function PageAnalyticsBlock(props: {
  pageName: string;
  dailySeries: DailyMetricSummary[];
  posts: PostMetricSummary[];
  latestJob: SyncJobSummary | null;
  lastSucceededJob: SyncJobSummary | null;
  latestMetricDate: string | null;
  pageLastSyncedAt: string | null;
}) {
  const { pageName, dailySeries, posts, latestJob, lastSucceededJob, latestMetricDate, pageLastSyncedAt } = props;

  const impSeries = dailySeries.map((d) => impressionsProxy(d)).filter((v): v is number => v != null);
  const engSeries = dailySeries
    .map((d) => (d.engagement_rate != null ? d.engagement_rate : d.engaged_users))
    .filter((v): v is number => v != null && !Number.isNaN(v));
  const fanSeries = dailySeries.map((d) => d.followers_count).filter((v): v is number => v != null);

  const impCompare = compareWindows(dailySeries, impressionsProxy);
  const engCompare = compareWindows(dailySeries, (d) => d.engagement_rate ?? d.engaged_users ?? null);

  const now = Date.now();
  const weekMs = 7 * 86400000;
  const posts7d = posts.filter((p) => {
    const t = new Date(p.post_created_at).getTime();
    return !Number.isNaN(t) && now - t <= weekMs;
  });

  let maxGapDays = 0;
  if (posts.length >= 2) {
    const sorted = [...posts].sort(
      (a, b) => new Date(b.post_created_at).getTime() - new Date(a.post_created_at).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = new Date(sorted[i].post_created_at).getTime();
      const b = new Date(sorted[i + 1].post_created_at).getTime();
      const gap = Math.abs(a - b) / 86400000;
      if (gap > maxGapDays) maxGapDays = gap;
    }
  }

  const typeCounts = new Map<string, number>();
  for (const p of posts) {
    const k = p.post_type ?? "unknown";
    typeCounts.set(k, (typeCounts.get(k) ?? 0) + 1);
  }
  const typeRows = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);

  const leaderboard = [...posts]
    .sort((a, b) => {
      const ia = a.impressions ?? 0;
      const ib = b.impressions ?? 0;
      if (ib !== ia) return ib - ia;
      return (b.engagements ?? 0) - (a.engagements ?? 0);
    })
    .slice(0, 5);

  return (
    <div className="ui-dashboard-analytics">
      <h4 className="ui-dashboard-analytics__title">Аналитик — {pageName}</h4>
      <p className="ui-text-faint" style={{ margin: "0 0 var(--space-3)" }}>
        Meta sync-ийн нормчилсон daily болон post метрик. Урт хугацааны trend-д илүү олон өдрийн синк хэрэгтэй.
      </p>

      <div className="ui-sync-health">
        <span className="ui-sync-health__label">Синкийн төлөв</span>
        <ul className="ui-sync-health__list">
          <li>
            Сүүлийн job:{" "}
            {latestJob ? (
              <>
                <strong>{latestJob.status}</strong> ({latestJob.job_type})
                {latestJob.finished_at ? ` · ${latestJob.finished_at}` : null}
              </>
            ) : (
              "—"
            )}
          </li>
          <li>
            Сүүлийн амжилттай синк:{" "}
            {lastSucceededJob?.finished_at ?? lastSucceededJob?.created_at ?? "—"}
          </li>
          <li>
            Хуудас (Meta): сүүлд синклэгдсэн: {pageLastSyncedAt ?? "—"}
          </li>
          <li>
            Сүүлийн daily мөрийн огноо: {latestMetricDate ?? "—"}
          </li>
        </ul>
      </div>

      <div className="ui-kpi-row">
        <div className="ui-kpi-card">
          <div className="ui-kpi-card__label">Reach / impressions (өдөр тутам)</div>
          {impSeries.length >= 2 ? <MiniSparkline values={impSeries} label="Impressions proxy trend" /> : null}
          <div className="ui-kpi-card__meta">
            {impCompare ? (
              <>
                Сүүлийн 7 өдөр vs өмнөх 7: дундаж {Math.round(impCompare.recentAvg)} vs{" "}
                {Math.round(impCompare.priorAvg)}
                {impCompare.change ? (
                  <span className={impCompare.change.startsWith("-") ? "ui-text-error" : "ui-text-muted"}>
                    {" "}
                    ({impCompare.change})
                  </span>
                ) : null}
              </>
            ) : (
              <span className="ui-text-faint">Харьцуулалтад хамгийн багадаа 14 өдрийн өгөгдөл шаардлагатай.</span>
            )}
          </div>
        </div>
        <div className="ui-kpi-card">
          <div className="ui-kpi-card__label">Engagement (rate эсвэл engaged)</div>
          {engSeries.length >= 2 ? <MiniSparkline values={engSeries} label="Engagement trend" /> : null}
          <div className="ui-kpi-card__meta">
            {engCompare ? (
              <>
                Сүүлийн 7 vs өмнөх 7: дундаж {engCompare.recentAvg.toFixed(2)} vs {engCompare.priorAvg.toFixed(2)}
                {engCompare.change ? (
                  <span className={engCompare.change.startsWith("-") ? "ui-text-error" : "ui-text-muted"}>
                    {" "}
                    ({engCompare.change})
                  </span>
                ) : null}
              </>
            ) : (
              <span className="ui-text-faint">Харьцуулалтад хамгийн багадаа 14 өдрийн өгөгдөл шаардлагатай.</span>
            )}
          </div>
        </div>
        <div className="ui-kpi-card">
          <div className="ui-kpi-card__label">Дагагчид (сүүлийн цэгүүд)</div>
          {fanSeries.length >= 2 ? <MiniSparkline values={fanSeries} label="Followers trend" /> : null}
          <div className="ui-kpi-card__meta ui-text-faint">
            {fanSeries.length > 0 ? `Сүүлийн утга: ${fanSeries[fanSeries.length - 1]}` : "Өгөгдөл байхгүй"}
          </div>
        </div>
      </div>

      <div className="ui-analytics-two-col">
        <div>
          <h5 className="ui-dashboard-analytics__subtitle">Постын идэвх (sample)</h5>
          <p className="ui-text-muted" style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)" }}>
            Сүүлийн 7 хоногт: <strong>{posts7d.length}</strong> пост (хадгалагдсан метрик дээр). Хоорондын хамгийн урт
            завсар: ~{Math.round(maxGapDays)} өдөр.
          </p>
        </div>
        <div>
          <h5 className="ui-dashboard-analytics__subtitle">Пост төрлөөр (сүүлийн {posts.length})</h5>
          {typeRows.length === 0 ? (
            <p className="ui-text-faint" style={{ margin: 0 }}>
              Пост байхгүй.
            </p>
          ) : (
            <ul className="ui-analytics-mini-list">
              {typeRows.map(([t, n]) => (
                <li key={t}>
                  <code>{t}</code> — {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h5 className="ui-dashboard-analytics__subtitle">Топ постууд (impressions)</h5>
        {leaderboard.length === 0 ? (
          <p className="ui-text-faint" style={{ margin: 0 }}>
            Постын метрик байхгүй.
          </p>
        ) : (
          <div className="ui-table-wrap" style={{ marginTop: "var(--space-2)" }}>
            <table className="ui-table ui-table--compact">
              <thead>
                <tr>
                  <th>Огноо</th>
                  <th>Төрөл</th>
                  <th>Impr.</th>
                  <th>Eng.</th>
                  <th>Товч</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((p) => (
                  <tr key={p.meta_post_id}>
                    <td className="ui-table__muted">{p.post_created_at.slice(0, 10)}</td>
                    <td>
                      <code style={{ fontSize: "var(--text-xs)" }}>{p.post_type ?? "—"}</code>
                    </td>
                    <td>{p.impressions ?? "—"}</td>
                    <td>{p.engagements ?? "—"}</td>
                    <td style={{ maxWidth: "12rem" }} className="ui-text-faint">
                      {(p.message_excerpt ?? "").slice(0, 48)}
                      {(p.message_excerpt?.length ?? 0) > 48 ? "…" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
