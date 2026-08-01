import re

with open('app/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

def get_func(name):
    match = re.search(r'function\s+' + name + r'\s*\([^)]*\)\s*\{', html)
    if not match: return "Not found"
    start = match.start()
    open_braces = 0
    in_func = False
    for i in range(start, len(html)):
        if html[i] == '{':
            open_braces += 1
            in_func = True
        elif html[i] == '}':
            open_braces -= 1
            if in_func and open_braces == 0:
                return html[start:i+1]
    return "Failed to parse"

out = f"switchRole:\n{get_func('switchRole')}\n\nswitchPane:\n{get_func('switchPane')}\n\nrenderFeaturePane:\n{get_func('renderFeaturePane')}\n"

with open('functions.txt', 'w', encoding='utf-8') as f:
    f.write(out)
