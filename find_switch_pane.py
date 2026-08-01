with open('app/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'function switchPane' in line or 'role-feature-container' in line:
        print(f"Line {i+1}: {line.strip()[:100]}")
