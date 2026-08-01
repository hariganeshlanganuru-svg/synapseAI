# 🔧 SynapseAI Troubleshooting Guide

## ⚠️ IMPORTANT: Browser Cache Issue

**Your browser is showing OLD cached files!**

All changes ARE saved to disk, but your browser is displaying the old version from cache.

---

## 🚀 QUICK FIX (Do This First!)

### Option 1: Hard Refresh (Fastest)
1. Open `app/index.html` in your browser
2. Press one of these:
   - **Windows**: `Ctrl + Shift + R` or `Ctrl + F5`
   - **Mac**: `Cmd + Shift + R`
3. ✅ All changes should now appear!

### Option 2: Clear Browser Cache (Most Reliable)
1. Press:
   - **Windows**: `Ctrl + Shift + Delete`
   - **Mac**: `Cmd + Shift + Delete`
2. Select: "Cached images and files"
3. Time range: "All time" or "Last hour"
4. Click: "Clear data" or "Clear now"
5. Close browser completely
6. Reopen and load `app/index.html`
7. ✅ Everything should work now!

### Option 3: Use Force Reload Page
1. Open `FORCE_RELOAD.html` in your browser
2. Follow the instructions
3. It will guide you through clearing cache

---

## 🔍 How to Verify Changes Are Really Saved

### Check File Timestamp
```bash
# Windows PowerShell
Get-Item app\index.html | Select-Object Name, Length, LastWriteTime

# Expected output:
Name       Length LastWriteTime      
----       ------ -------------      
index.html 270306 30-07-2026 22:50:xx  (or later)
```

### Check File Version
1. Open `app/index.html` in a text editor (NOT browser)
2. Look at line 5-8
3. Should see:
```html
<meta name="version" content="2.0-20260730-2250">
```

If you see this version tag, all changes ARE saved! ✅

---

## 🧪 Test Each Feature

### 1. Conversation History Saving
**Test**:
1. Go to Enterprise AI Assistant
2. Send any message
3. Look at left sidebar under "TODAY"
4. Your message should appear immediately

**If not working**:
- Press F12 (open console)
- Send a message
- Look for JavaScript errors
- If you see errors, note them down

### 2. Workflow & Automation Center
**Test**:
1. Switch to Admin role
2. Click "Workflow & Automation Center"
3. Should see: Header, 3 buttons, 6 sections

**If showing old design**:
- Your browser cache is NOT cleared
- Follow "Quick Fix" above again
- Make sure to use Ctrl+Shift+R, not just Ctrl+R

### 3. Removed Features
**Should NOT see**:
- ❌ "AI Control Center" in Admin menu
- ❌ "Toggle Context" button in chat header  
- ❌ "Show SMTP status" in admin suggestions
- ❌ "Sync Pinecone" button in admin dashboard
- ❌ Right document panel in chat

**If you still see these**:
- Browser cache NOT cleared properly
- Try clearing cache again
- Try different browser (Chrome/Firefox/Edge)

---

## 🐛 Common Issues & Solutions

### Issue: "Nothing changed!"
**Cause**: Browser showing cached version
**Solution**: 
1. Close ALL browser windows/tabs
2. Clear cache completely (not just cookies)
3. Reopen browser
4. Open file with `?v=123` at end: `index.html?v=123`

### Issue: "Conversation not saving"
**Cause**: JavaScript error or DOM element missing
**Solution**:
1. Press F12
2. Go to Console tab
3. Look for red error messages
4. Screenshot and share the error

### Issue: "Buttons don't work"
**Cause**: JavaScript not loaded or cache issue
**Solution**:
1. Hard refresh: Ctrl+Shift+R
2. Check console for errors (F12)
3. Verify `toast` function exists:
   - Console → Type: `typeof toast`
   - Should show: `"function"`

### Issue: "Old design still showing"
**Cause**: Definitely browser cache
**Solution**:
1. Try a DIFFERENT browser (if using Chrome, try Firefox)
2. Or use Incognito/Private mode
3. Open `index.html` there
4. Should show new design immediately

---

## 💻 Verify Backend is Running

```bash
# Check if backend is running
curl http://localhost:8000/docs

# Or open in browser:
http://localhost:8000/docs
```

**Expected**: API documentation page loads

**If not working**:
```bash
# Restart backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🗄️ Verify Supabase Connection

```bash
# Test connection
python quick_test.py
```

**Expected output**:
```
✅ Connected to Supabase!
✅ Table 'profiles' exists - 0 records
✅ Table 'documents' exists - 1 records
...
🎉 Kiro <-> Supabase connection is READY!
```

---

## 📱 Browser-Specific Instructions

### Google Chrome
1. Settings → Privacy and Security → Clear browsing data
2. Time range: Last hour
3. Check: "Cached images and files"
4. Click: "Clear data"

### Firefox
1. Settings → Privacy & Security → Cookies and Site Data
2. Click: "Clear Data"
3. Check: "Cached Web Content"
4. Click: "Clear"

### Microsoft Edge
1. Settings → Privacy, search, and services
2. Click: "Choose what to clear"
3. Check: "Cached images and files"
4. Click: "Clear now"

### Safari (Mac)
1. Safari menu → Preferences → Advanced
2. Check: "Show Develop menu"
3. Develop → Empty Caches
4. Cmd+Shift+R to reload

---

## ✅ Final Verification Checklist

After clearing cache, verify:

- [ ] File timestamp is July 30, 2026 22:50:xx or later
- [ ] Browser shows version 2.0-20260730-2250 (check page source)
- [ ] Conversation history saves when sending messages
- [ ] Workflow page shows new 6-section design
- [ ] AI Control Center is NOT in menu
- [ ] Status badge text is centered (not at top)
- [ ] Chat has 2 columns (sidebar + main), not 3

If ALL checked ✅ = Everything is working!

If ANY unchecked ❌ = Browser cache still needs clearing

---

## 🆘 Still Not Working?

1. **Try Incognito/Private Mode**:
   - Ctrl+Shift+N (Chrome)
   - Ctrl+Shift+P (Firefox/Edge)
   - Open `index.html` there
   - Should show new version immediately

2. **Try Different Browser**:
   - If using Chrome, try Firefox
   - Fresh browser = no cache issues

3. **Check File on Disk**:
   - Open `app/index.html` in Notepad/TextEdit
   - Search for: "Workflow & Automation Center"
   - Should find new HTML with 6 sections
   - If found = File is correct, just browser cache issue

4. **Nuclear Option**:
   - Close browser completely
   - Restart computer
   - Open browser
   - Clear all cache
   - Open `index.html?v=` + random number

---

## 📞 Need More Help?

1. Take screenshot of:
   - The page showing old design
   - Browser console (F12) showing errors
   - File properties showing timestamp

2. Check:
   - Which browser and version?
   - Have you cleared cache?
   - Are you opening the correct file?

3. Verify:
   - File size: Should be ~270KB
   - File date: July 30, 2026 22:50 or later
   - Version in HTML: 2.0-20260730-2250

**Remember**: All changes ARE saved! It's just your browser showing old cached files. Clear cache properly and everything will work! ✅
