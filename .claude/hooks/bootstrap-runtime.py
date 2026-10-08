"""Bootstrap v13: compact startup context, git health, task evidence, retrieval, governance checks, passive updates."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
BUDGET = 16000  # Unicode characters, including headers and optional notice.
TTL = 86400
MANIFEST = '.claude/bootstrap-manifest.json'


def read(path):
    return path.read_text(encoding='utf-8-sig')


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate key: ' + str(key))
        result[key] = value
    return result


def parse_json(text):
    def invalid(value):
        raise ValueError('non-JSON constant: ' + value)
    return json.loads(text, object_pairs_hook=unique, parse_constant=invalid)


def frontmatter(path):
    import yaml  # Verified at bootstrap time; never install during a session hook.
    class StrictLoader(yaml.SafeLoader):
        pass
    def mapping(loader, node):
        return unique(loader.construct_pairs(node, deep=True))
    StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
    text = read(path)
    lines = text.splitlines()
    if not lines or lines[0] != '---':
        return None, text
    end = lines.index('---', 1)
    meta = yaml.load('\n'.join(lines[1:end]), Loader=StrictLoader)
    if not isinstance(meta, dict):
        raise ValueError('frontmatter must be a mapping')
    return meta, '\n'.join(lines[end + 1:])


def scope_ok(scope):
    # Deliberate grammar: global ** or relative slash-separated glob segments.
    return isinstance(scope, str) and bool(re.fullmatch(r'[A-Za-z0-9_.*/?@-]+', scope)) and not (
        scope.startswith('/') or any(p in ('', '.', '..') for p in scope.split('/')))


def documents(folder):
    return sorted(p for p in (ROOT / '.docs' / folder).rglob('*.md') if p.name != 'README.md')


def manifest():
    return parse_json(read(ROOT / MANIFEST))


def https_url(value):
    if not isinstance(value, str) or len(value) > 2048 or re.search(r'[\s<>"`\\]', value):
        return False
    parsed = urllib.parse.urlsplit(value)
    return parsed.scheme == 'https' and bool(parsed.hostname) and not parsed.username and not parsed.password


def update_config():
    m = manifest()
    source = m.get('update-source')
    if os.environ.get('CLAUDE_BOOTSTRAP_UPDATE_CHECK', '').lower() in ('0', 'false', 'off'):
        return None
    if not isinstance(source, dict) or source.get('enabled') is not True or source.get('trusted') is not True:
        return None
    if not https_url(source.get('metadata-url')) or not https_url(source.get('details-url')):
        return None
    version = m.get('bootstrap-version')
    if type(version) is not int or version < 1:
        return None
    base = Path(os.environ.get('LOCALAPPDATA') or os.environ.get('XDG_CACHE_HOME') or (Path.home() / '.cache'))
    base = base.expanduser().resolve()
    # Never let a project-local environment override turn cache writes into worktree changes.
    if base == ROOT or ROOT in base.parents:
        return None
    key = hashlib.sha256((str(ROOT) + json.dumps(source, sort_keys=True)).encode()).hexdigest()
    return version, source, base / 'claude-bootstrap' / (key + '.json')


def cached(config):
    value = parse_json(read(config[2]))
    age = time.time() - value['checked-at']
    return value if 0 <= age < TTL else None


def notice():
    try:
        config = update_config()
        data = cached(config) if config else None
        if data and type(data.get('version')) is int and data['version'] > config[0] and data.get('details-url') == config[1]['details-url']:
            return f"Bootstrap v{config[0]} is installed; v{data['version']} is available. {data['details-url']}"
    except Exception:
        pass
    return ''


def refresh(event):
    if event.get('source') != 'startup':
        return
    config = update_config()
    if not config:
        return
    try:
        if cached(config):
            return
    except Exception:
        pass
    # A daemon worker plus join imposes a total deadline even on DNS and slow responses.
    result = {}
    def fetch():
        try:
            class NoRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, *args, **kwargs):
                    return None
            request = urllib.request.Request(config[1]['metadata-url'], headers={'Accept': 'application/json'})
            with urllib.request.build_opener(NoRedirect).open(request, timeout=2) as response:
                raw = response.read(4097)
            if len(raw) > 4096:
                return
            data = parse_json(raw.decode('utf-8'))
            if type(data.get('version')) is int and 0 < data['version'] < 1000000 and data.get('details-url') == config[1]['details-url']:
                result.update(version=data['version'], **{'details-url': data['details-url']})
        except Exception:
            pass
    worker = threading.Thread(target=fetch, daemon=True)
    worker.start()
    worker.join(2.5)
    # Negative results are cached too. No release prose, code, or payload is retained.
    value = {'checked-at': time.time(), **dict(result)}
    path = config[2]
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.' + str(os.getpid()) + '.tmp')
    try:
        temporary.write_text(json.dumps(value), encoding='utf-8')
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def run_git(*args, timeout=2):
    return subprocess.run(
        ['git', *args], cwd=ROOT, text=True, capture_output=True, timeout=timeout, check=False
    )


def git_health():
    if not (ROOT / '.git').exists():
        return 'not a Git repository'
    lines = []
    branch = run_git('branch', '--show-current').stdout.strip() or 'detached HEAD'
    dirty = run_git('status', '--porcelain').stdout.splitlines()
    lines.append('branch: ' + branch)
    lines.append('worktree: ' + ('dirty (' + str(len(dirty)) + ' changed entries)' if dirty else 'clean'))
    upstream = run_git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
    if upstream.returncode != 0:
        lines.append('upstream: none configured; remote freshness unknown')
    else:
        upstream_name = upstream.stdout.strip()
        fetch = run_git('fetch', '--quiet', timeout=3)
        if fetch.returncode != 0:
            lines.append('remote check: fetch failed or timed out; freshness unknown')
        counts = run_git('rev-list', '--left-right', '--count', 'HEAD...' + upstream_name)
        if counts.returncode == 0:
            ahead, behind = [int(x) for x in counts.stdout.split()]
            state = 'up to date' if ahead == 0 and behind == 0 else (
                f'ahead {ahead}, behind {behind}' if ahead and behind else
                f'ahead {ahead}' if ahead else f'behind {behind}'
            )
            lines.append('upstream: ' + upstream_name + ' (' + state + ')')
    recent = run_git('log', '-3', '--pretty=format:%h %s')
    if recent.returncode == 0 and recent.stdout.strip():
        lines.append('recent commits:\n' + recent.stdout.strip())
    return '\n'.join(lines)


def plan_git_evidence(meta):
    base = meta.get('base')
    if not isinstance(base, str) or not base:
        return 'git evidence: plan has no usable base sha'
    commits = run_git('log', '--max-count=3', '--pretty=format:%h %s', base + '..HEAD')
    changed = run_git('diff', '--name-only', base + '..HEAD')
    if commits.returncode != 0 or changed.returncode != 0:
        return 'git evidence: unable to compare plan base with HEAD'
    commit_lines = commits.stdout.splitlines()
    changed_lines = changed.stdout.splitlines()
    return (
        'git evidence: ' + str(len(commit_lines)) + ' of the latest post-base commits shown; '
        + str(len(changed_lines)) + ' files changed since base'
        + ('\nrecent post-base commits:\n' + '\n'.join(commit_lines) if commit_lines else '')
        + ('\nchanged since base: ' + ', '.join(changed_lines[:20]) if changed_lines else '')
    )


def context(source='startup'):
    chunks = ['## Project context (auto-injected by session-start hook)']
    problems = []
    universal = []
    for path in documents('rules'):
        try:
            meta, body = frontmatter(path)
            if meta is None:
                problems.append(str(path.relative_to(ROOT)) + ': legacy/unmanaged rule; inspect before governed work')
            elif meta.get('status') not in ('active', 'candidate', 'superseded') or not scope_ok(meta.get('scope')):
                problems.append(str(path.relative_to(ROOT)) + ': invalid status/scope; inspect before governed work')
            elif meta.get('status') == 'active' and meta.get('scope') == '**':
                universal.append(
                    '- ' + str(meta.get('id', path.stem)) + ' [' + str(meta.get('priority', 'unknown')) + '] '
                    + path.relative_to(ROOT).as_posix()
                )
        except Exception:
            problems.append(str(path.relative_to(ROOT)) + ': unreadable metadata; inspect before governed work')
    if universal:
        chunks.append(
            '### Active universal policy index\n'
            + '\n'.join(universal)
            + '\nFull bodies are intentionally not preloaded. Retrieve applicable rule bodies before governed work.'
        )
    if source == 'startup':
        try:
            chunks.append('### Git health (read-only worktree check)\n' + git_health())
        except Exception as error:
            chunks.append('### Git health\ncheck incomplete: ' + str(error))
    for path in documents('plans'):
        try:
            meta, body = frontmatter(path)
            if meta and meta.get('status') == 'in-progress':
                next_task = next((line.strip() for line in body.splitlines() if re.match(r'\s*- \[ \]', line)), 'none')
                log = body.split('## Log', 1)[-1] if '## Log' in body else ''
                last = next((line for line in reversed(log.splitlines()) if line.startswith('- ')), 'none')
                chunks.append(
                    f"### Plan: {path.relative_to(ROOT).as_posix()}\n"
                    f"goal: {meta.get('goal', 'unknown')}\nnext: {next_task}\nlast log: {last}\n"
                    + plan_git_evidence(meta)
                )
        except Exception:
            problems.append(str(path.relative_to(ROOT)) + ': plan metadata unreadable; inspect resume state')
    if problems:
        chunks.append('### Governance attention\n' + '\n'.join(problems))
    if source == 'startup':
        update = notice()
        if update:
            chunks.append('### Passive bootstrap notice\n' + update)
    full = '\n\n'.join(chunks) + '\n'
    if len(full) > BUDGET:
        # Do not present truncated rule bodies as complete policy.
        output = ('## Project context (auto-injected by session-start hook)\n'
                  'CONTEXT BUDGET EXCEEDED. Before work, read active universal rules and in-progress plans from .docs/. '
                  'Retrieve scoped policy for affected paths. No rule body was silently truncated.\n')
        return output, len(full)
    return full, len(full)


def verify():
    import yaml  # Missing parser is an incomplete check, not a clean result.
    findings = []
    try:
        ledger = manifest()
        if ledger.get('schema-version') != 1 or type(ledger.get('bootstrap-version')) is not int:
            findings.append('manifest: invalid schema/installed version')
        records = ledger['artifacts']
        ownership = {r['path']: r['ownership'] for r in records}
        if len(ownership) != len(records):
            findings.append('manifest: duplicate artifact paths')
        for record in records:
            required = ('path', 'ownership', 'bootstrap-version', 'template-version', 'digest', 'source')
            if any(key not in record for key in required):
                findings.append('manifest: incomplete artifact record ' + str(record.get('path')))
            path = Path(record['path'])
            resolved = (ROOT / path).resolve()
            if path.is_absolute() or ROOT not in resolved.parents or '\\' in record['path'] or '..' in path.parts:
                findings.append('manifest: invalid artifact path ' + str(path))
            elif not resolved.exists():
                findings.append('manifest: missing artifact ' + str(path))
            if record['ownership'] not in ('managed', 'merged', 'seeded-user-editable', 'adopted/legacy'):
                findings.append('manifest: invalid ownership ' + str(path))
            if record.get('digest') is not None and (not isinstance(record.get('digest'), str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', record['digest'])):
                findings.append('manifest: invalid digest ' + str(path))
            if record['ownership'] == 'merged' and not (record.get('blocks') or record.get('json-entries')):
                findings.append('manifest: merged file lacks managed boundaries ' + str(path))
            if resolved.is_file() and ROOT in resolved.parents:
                for block in record.get('blocks', []):
                    text = read(resolved)
                    begin = '<!-- bootstrap:BEGIN ' + block['id'] + ' -->'
                    end = '<!-- bootstrap:END ' + block['id'] + ' -->'
                    if text.count(begin) != 1 or text.count(end) != 1 or text.index(begin) >= text.index(end):
                        findings.append('manifest: missing/ambiguous managed block ' + str(path) + ':' + block['id'])
    except Exception as error:
        ownership = {}
        findings.append('manifest: ' + str(error))
    def report(path, message):
        relative = path.relative_to(ROOT).as_posix()
        findings.append(f"{relative} [{ownership.get(relative, 'legacy/unmanaged')}]: {message}")
    ids = {}
    for folder in ('rules', 'learnings'):
        for path in documents(folder):
            try:
                meta, body = frontmatter(path)
                if meta is None:
                    report(path, 'missing metadata; preserved')
                    continue
                required = ('id', 'status', 'scope', 'priority', 'owner', 'confidence', 'last-reviewed')
                missing = [key for key in required if key not in meta]
                if missing:
                    report(path, 'missing metadata: ' + ', '.join(missing))
                if folder == 'learnings':
                    learning_required = ('date', 'tags', 'severity', 'applies-to', 'evidence-refs', 'validates-with', 'invalidates-when')
                    learning_missing = [key for key in learning_required if key not in meta]
                    if learning_missing:
                        report(path, 'missing learning metadata: ' + ', '.join(learning_missing))
                    if meta.get('severity') not in ('low', 'medium', 'high'):
                        report(path, 'invalid learning severity')
                    for key in ('tags', 'applies-to', 'evidence-refs', 'validates-with', 'invalidates-when'):
                        if key in meta and not isinstance(meta[key], list):
                            report(path, key + ' must be a list')
                if meta.get('status') not in ('active', 'candidate', 'superseded'):
                    report(path, 'invalid status')
                if not scope_ok(meta.get('scope')):
                    report(path, 'invalid scope')
                if meta.get('priority') not in ('required', 'preferred', 'advisory'):
                    report(path, 'invalid priority')
                if meta.get('confidence') not in ('verified', 'supported', 'tentative'):
                    report(path, 'invalid confidence')
                if not isinstance(meta.get('owner'), str) or not meta['owner'].strip():
                    report(path, 'invalid owner')
                if meta.get('status') == 'active':
                    ident = meta.get('id')
                    if not isinstance(ident, str) or not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*', ident):
                        report(path, 'invalid active ID')
                    elif ident in ids:
                        report(path, 'duplicate active ID with ' + ids[ident])
                    else:
                        ids[ident] = path.relative_to(ROOT).as_posix()
                if 'last-reviewed' in meta:
                    age = (dt.date.today() - dt.date.fromisoformat(str(meta['last-reviewed']))).days
                    if age < 0:
                        report(path, 'review date is in the future')
                    if folder == 'learnings' and meta.get('status') == 'active' and meta.get('severity') == 'high' and age > 90:
                        report(path, 'high-severity learning overdue for review (90 days)')
            except Exception as error:
                report(path, 'frontmatter invalid/unverified: ' + str(error))
    for path in documents('plans'):
        try:
            meta, body = frontmatter(path)
            required = ('status', 'created', 'updated', 'base', 'goal')
            if meta is None:
                report(path, 'missing plan metadata; resume state is unverified')
                continue
            missing = [key for key in required if key not in meta]
            if missing:
                report(path, 'missing plan metadata: ' + ', '.join(missing))
            if meta.get('status') not in ('in-progress', 'done', 'abandoned'):
                report(path, 'invalid plan status')
            if not body.strip():
                report(path, 'plan body is empty')
        except Exception as error:
            report(path, 'plan invalid/unverified: ' + str(error))
    for path in documents('decisions'):
        try:
            meta, body = frontmatter(path)
            required = ('date', 'status', 'scope', 'tags')
            if meta is None:
                report(path, 'missing decision metadata; preserved')
                continue
            missing = [key for key in required if key not in meta]
            if missing:
                report(path, 'missing decision metadata: ' + ', '.join(missing))
            if meta.get('status') not in ('accepted', 'proposed', 'superseded'):
                report(path, 'invalid decision status')
            if not isinstance(meta.get('tags'), list):
                report(path, 'decision tags must be a list')
            if not body.strip():
                report(path, 'decision body is empty')
        except Exception as error:
            report(path, 'decision invalid/unverified: ' + str(error))
    for path in documents('evidence'):
        try:
            meta, body = frontmatter(path)
            required = ('task-id', 'objective', 'outcome', 'code-revision', 'retrieved-memory', 'applied-memory', 'learning-disposition')
            if meta is None:
                report(path, 'missing task-evidence metadata; preserved')
                continue
            missing = [key for key in required if key not in meta]
            if missing:
                report(path, 'missing task-evidence metadata: ' + ', '.join(missing))
            if meta.get('outcome') not in ('succeeded', 'failed', 'blocked', 'abandoned'):
                report(path, 'invalid task-evidence outcome')
            if meta.get('learning-disposition') not in ('proposed', 'none', 'pending'):
                report(path, 'invalid learning disposition')
            for key in ('retrieved-memory', 'applied-memory'):
                if key in meta and not isinstance(meta[key], list):
                    report(path, key + ' must be a list')
            if not body.strip():
                report(path, 'task-evidence body is empty')
        except Exception as error:
            report(path, 'task-evidence invalid/unverified: ' + str(error))
    agents_doc = ROOT / 'AGENTS.md'
    try:
        agents_text = read(agents_doc)
        table = agents_text.split('## Available agents', 1)[1].split('### Routing heuristics', 1)[0]
        rows = re.findall(r'^\| `([a-z0-9-]+)` \| (.*?) \| (.*?) \|$', table, re.M)
        registrations = {}
        for name, description, output in rows:
            if name in registrations:
                report(agents_doc, 'duplicate registration: ' + name)
            registrations[name] = description
        existing = set()
        for path in sorted((ROOT / '.claude/agents').glob('*.md')):
            if path.name == 'README.md':
                continue
            existing.add(path.stem)
            try:
                meta, body = frontmatter(path)
                if not meta or meta.get('name') != path.stem or not isinstance(meta.get('description'), str) or not meta['description'].strip():
                    raise ValueError('name/description missing or filename mismatch')
                if 'tools' in meta and not isinstance(meta['tools'], (str, list)):
                    raise ValueError('tools must be a string or list')
                if isinstance(meta.get('tools'), list) and any(not isinstance(tool, str) for tool in meta['tools']):
                    raise ValueError('tool names must be strings')
                if 'model' in meta and not isinstance(meta['model'], str):
                    raise ValueError('model must be a string')
                if not body.strip():
                    raise ValueError('agent body is empty')
                expected = ' '.join(meta['description'].split()).replace('|', '&#124;')
                if registrations.get(path.stem) != expected:
                    report(path, 'missing or stale AGENTS.md description registration')
            except Exception as error:
                report(path, 'agent definition invalid/unverified: ' + str(error))
        for name in sorted(set(registrations) - existing):
            report(agents_doc, 'registered agent missing: ' + name)
    except Exception as error:
        report(agents_doc, 'agents table unverified: ' + str(error))
    for path in (ROOT / '.claude/settings.json', ROOT / '.claude/settings.local.json'):
        if not path.exists():
            if path.name == 'settings.json':
                report(path, 'missing settings')
            continue
        try:
            settings = parse_json(read(path))
            if not isinstance(settings, dict):
                raise ValueError('settings must be an object')
            for key in ('allow', 'deny', 'ask'):
                values = settings.get('permissions', {}).get(key, [])
                if not isinstance(values, list) or any(not isinstance(value, str) for value in values):
                    raise ValueError('permissions.' + key + ' must be a list of strings')
            for group in settings.get('hooks', {}).get('SessionStart', []):
                if 'matcher' in group and not isinstance(group['matcher'], str):
                    raise ValueError('hook matcher must be a string')
                for hook in group['hooks']:
                    if hook.get('type') == 'command' and not isinstance(hook.get('command'), str):
                        raise ValueError('command hook lacks command string')
                    if 'async' in hook and type(hook['async']) is not bool:
                        raise ValueError('hook async must be boolean')
        except Exception as error:
            report(path, 'settings invalid/unverified: ' + str(error))
    scan = {ROOT / 'AGENTS.md', ROOT / 'CLAUDE.md', *documents('rules'), *documents('learnings')}
    scan.update((ROOT / '.claude/agents').glob('*.md'))
    scan.update(ROOT / name for name in ownership if name.endswith('.md') and ROOT in (ROOT / name).resolve().parents)
    stale = re.compile(r'AGENTS\.md is (?:a full |a )?mirror of CLAUDE\.md|update BOTH CLAUDE\.md and AGENTS\.md|all real content lives here', re.I)
    for path in sorted(scan):
        if path.exists() and stale.search(read(path)):
            report(path, 'possible stale canonical/pointer claim; inspect context, never auto-rewrite')
    pointer = ROOT / 'CLAUDE.md'
    if not pointer.exists() or '@AGENTS.md' not in read(pointer).splitlines():
        report(pointer, 'missing @AGENTS.md pointer import')
    output, wanted = context()
    if wanted > BUDGET or len(output) > BUDGET:
        findings.append(f'context: {wanted} requested characters, {len(output)} emitted; budget {BUDGET}')
    for finding in sorted(set(findings)):
        print(finding)
    return 1 if findings else 0


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'verify':
        try:
            sys.exit(verify())
        except Exception as error:
            print('governance verification incomplete: ' + str(error))
            sys.exit(2)
    else:
        try:
            event = parse_json(sys.stdin.read())
            if mode == 'context':
                print(context(event.get('source', 'unknown'))[0], end='')
            elif mode == 'update':
                refresh(event)
        except Exception:
            # Updates fail silently; missing context is handled by AGENTS.md's fallback.
            pass
