// Runs from the default branch, never from pull request code.
const REPORT = '<!-- kyro-weekly-report -->';
const safe = value => String(value).replace(/[\r\n]/g, ' ').replace(/@/g, '@\u200b').replace(/[<>|]/g, '');

function reportBody(issues, pulls, runs, now = new Date()) {
  const active = issues.filter(x => !x.pull_request && !x.body?.includes(REPORT));
  const blocked = active.filter(x => x.labels.some(l => l.name === 'status:blocked'));
  const stale = active.filter(x => now - new Date(x.updated_at) > 14 * 86400000);
  const failed = runs.filter(x => ['failure', 'timed_out', 'action_required'].includes(x.conclusion));
  const list = values => values.length ? values.slice(0, 30).map(x => `- [#${x.number} ${safe(x.title)}](${x.html_url})`).join('\n') : '- None';
  return `${REPORT}\n# Weekly repository health\n\nUpdated: ${now.toISOString().slice(0, 10)} (UTC)\n\n` +
    `Open issues: ${active.length} Â· Open pull requests: ${pulls.length}\n\n` +
    `## Blocked work\n${list(blocked)}\n\n## Awaiting review\n${list(pulls.filter(x => !x.draft))}\n\n` +
    `## Issues without activity for 14 days\n${list(stale)}\n\n` +
    `## Recent failed workflow runs\n${failed.length ? failed.slice(0, 15).map(x => `- [${safe(x.name)}](${x.html_url}): ${x.conclusion}`).join('\n') : '- None in the latest 30 runs'}\n\n` +
    '## Next steps\n- Triage new work and give ready issues an owner and acceptance criteria.\n- Resolve blockers and review ready pull requests before starting more work.\n- Link dependencies between shared libraries and consuming plugins.\n\nThis report never closes issues or merges pull requests.\n';
}

async function run({github, context, core}) {
  const repo = context.repo;
  const item = context.payload.issue || context.payload.pull_request;
  if (context.eventName === 'issues' && context.payload.action === 'opened') {
    if (item.body?.includes(REPORT)) return;
    const labels = ['needs-triage'];
    if (/^\[bug\]/i.test(item.title)) labels.push('type:bug');
    if (/^\[feature\]/i.test(item.title)) labels.push('type:feature');
    await github.rest.issues.addLabels({...repo, issue_number: item.number, labels});
    return;
  }
  if (context.eventName === 'pull_request_target') {
    const files = await github.paginate(github.rest.pulls.listFiles, {...repo, pull_number: item.number, per_page: 100});
    const labels = [];
    if (files.some(x => x.filename.startsWith('.github/'))) labels.push('area:automation');
    if (files.some(x => /(^|\/)(composer\.(json|lock)|pom\.xml)$/.test(x.filename))) labels.push('type:dependencies');
    if (files.some(x => /(^|\/)(README[^/]*|.*\.md)$/.test(x.filename))) labels.push('type:documentation');
    if (labels.length) await github.rest.issues.addLabels({...repo, issue_number: item.number, labels});
    return;
  }
  const [issues, pulls, runs] = await Promise.all([
    github.paginate(github.rest.issues.listForRepo, {...repo, state: 'open', per_page: 100}),
    github.paginate(github.rest.pulls.list, {...repo, state: 'open', per_page: 100}),
    github.rest.actions.listWorkflowRunsForRepo({...repo, per_page: 30}),
  ]);
  const body = reportBody(issues, pulls, runs.data.workflow_runs);
  // Match only our bot's marker; never overwrite a human issue.
  const previous = issues.find(x => x.user?.login === 'github-actions[bot]' && x.body?.startsWith(REPORT));
  if (previous) await github.rest.issues.update({...repo, issue_number: previous.number, body});
  else await github.rest.issues.create({...repo, title: 'Weekly repository health', body, labels: ['type:maintenance', 'automation:report']});
  await core.summary.addRaw(body).write();
}
module.exports = {run, reportBody};
