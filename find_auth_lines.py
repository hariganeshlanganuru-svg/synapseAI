with open('app/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Check switchRole function location
for i, line in enumerate(html.splitlines()):
    if 'function switchRole(' in line or 'registeredUsers' in line or 'function showLandingPage(' in line:
        print(f"Line {i+1}: {line.strip()[:90]}")
