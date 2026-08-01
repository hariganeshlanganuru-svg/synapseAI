with open('app/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'id="feat_notifications"' in line or 'id=\'feat_notifications\'' in line:
        print(f"Line {i+1}: {line.strip()[:100]}")
