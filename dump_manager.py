import json
with open('app/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
import re
manager_matches = []
for m in re.finditer(r'Manager', html):
    start = max(0, m.start() - 60)
    end = min(len(html), m.end() + 60)
    manager_matches.append(html[start:end].replace('\n', ' '))
with open('manager_matches.json', 'w', encoding='utf-8') as out:
    json.dump(manager_matches, out, indent=2)
