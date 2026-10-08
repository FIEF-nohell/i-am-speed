"""Bootstrap v13: deterministic local retrieval over .docs/ metadata. Report-only; prints JSON."""
import argparse
import fnmatch
import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]


def load(path):
    text = path.read_text(encoding='utf-8-sig')
    lines = text.splitlines()
    if not lines or lines[0] != '---' or '---' not in lines[1:]:
        return None, text
    end = lines.index('---', 1)
    meta = yaml.safe_load('\n'.join(lines[1:end]))
    return (meta if isinstance(meta, dict) else None), '\n'.join(lines[end + 1:])


def words(text):
    return set(re.findall(r'[a-z0-9]{3,}', text.lower()))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--task', default='')
    parser.add_argument('--path', action='append', default=[], help='affected path (repeatable)')
    parser.add_argument('--action', default='')
    parser.add_argument('--role', default='')
    args = parser.parse_args()
    query = words(' '.join([args.task, args.action, args.role]))
    paths = [p.replace(chr(92), '/') for p in args.path]
    selected, considered, problems, seen = [], 0, [], {}

    for folder, kind in (('rules', 'rule'), ('learnings', 'learning'), ('decisions', 'decision')):
        for path in sorted((ROOT / '.docs' / folder).rglob('*.md')):
            if path.name == 'README.md':
                continue
            rel = path.relative_to(ROOT).as_posix()
            try:
                meta, body = load(path)
            except Exception as error:
                problems.append(f'{rel}: unreadable metadata ({error}); inspect manually')
                continue
            if meta is None:
                problems.append(f'{rel}: legacy/unmanaged; not scored')
                continue
            considered += 1
            ident = str(meta.get('id', path.stem))
            if kind == 'learning' and ident in seen:
                problems.append(f'duplicate id {ident}: {seen[ident]} and {rel}')
            seen.setdefault(ident, rel)
            status = meta.get('status')
            if kind == 'decision':
                if status != 'accepted':
                    continue
            elif status != 'active':
                continue
            scope = str(meta.get('scope', ''))
            scoped = scope == '**' or any(fnmatch.fnmatch(p, scope) for p in paths)
            if kind == 'rule':
                if not scoped:
                    continue
                reason = 'universal rule' if scope == '**' else f'scope {scope} matches affected path'
                selected.append({'id': ident, 'kind': kind, 'revision': meta.get('last-reviewed'),
                                 'reason': reason, 'priority': meta.get('priority'),
                                 'confidence': meta.get('confidence'), 'path': rel})
                continue
            applies = meta.get('applies-to', meta.get('scope', []))
            applies = applies if isinstance(applies, list) else [str(applies)]
            path_hit = any(fnmatch.fnmatch(p, a) for p in paths for a in map(str, applies))
            lexical = query & (words(' '.join(map(str, meta.get('tags', []) or [])) + ' ' + ident.replace('-', ' ')))
            if not (path_hit or lexical):
                continue
            reason = ' and '.join(filter(None, [
                'applies-to matches affected path' if path_hit else '',
                'lexical match: ' + ', '.join(sorted(lexical)) if lexical else '']))
            selected.append({'id': ident, 'kind': kind, 'revision': meta.get('last-reviewed', meta.get('date')),
                             'reason': reason, 'confidence': meta.get('confidence'),
                             'evidence-refs': meta.get('evidence-refs', []), 'path': rel})

    coverage = 'incomplete: no in-scope learnings or decisions were scored' if considered == 0 else 'scored'
    print(json.dumps({'selected': selected, 'considered': considered, 'coverage': coverage,
                      'problems': problems}, indent=2, default=str))


if __name__ == '__main__':
    main()
