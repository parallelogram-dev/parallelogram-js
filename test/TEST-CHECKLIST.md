# State Management System Test Checklist

## Test Environment
- **Test Page**: `test-state-system.html`
- **Local Server**: http://localhost:8080/test-state-system.html
- **Browser Console**: Open DevTools to monitor events and states

## Critical Tests

### Test 1: Multiple Components on Same Element
**Objective**: Verify that multiple components (Lazysrc + Reveal) can mount on the same element without conflicts.

**Elements to Check**:
1. Image 1, 2, 3 (all have both `data-lazysrc` and `data-reveal`)

**Expected Behavior**:
- Each image should have TWO state attributes:
  - `data-lazysrc="loading"` → `data-lazysrc="loaded"`
  - `data-reveal="hidden"` → `data-reveal="revealing"` → `data-reveal="revealed"`
- Both components should function independently
- No blocking or conflicts between components
- State indicators should show both states

**How to Verify**:
1. Open browser DevTools (Inspector)
2. Find the first image element
3. Check attributes - should see BOTH data-lazysrc and data-reveal with their states
4. Verify image loads AND reveals properly

**Console Commands**:
```javascript
// Get first multi-component image
const img = document.querySelector('[data-lazysrc][data-reveal]');
console.log('Lazysrc state:', img.getAttribute('data-lazysrc'));
console.log('Reveal state:', img.getAttribute('data-reveal'));
```

---

### Test 2: Reveal Component States
**Objective**: Verify reveal state transitions work correctly.

**Expected State Flow**:
```
"" (mounted) → "hidden" → "revealing" → "revealed"
```

**How to Verify**:
1. Scroll down to "Test 2" section
2. Watch state indicators update
3. Elements should fade in when scrolled into view

**Expected Results**:
- Initial state: `data-reveal=""` or `data-reveal="hidden"`
- When scrolled into view: `data-reveal="revealing"`
- After animation: `data-reveal="revealed"`
- Delays should work (200ms, 400ms)

---

### Test 3: Toggle Component States
**Objective**: Verify toggle state transitions work correctly.

**Expected State Flow**:
```
"" (mounted) → "opening" → "open" → "closing" → "closed"
```

**How to Verify**:
1. Click "Toggle Content 1" button
2. Watch state indicator
3. Watch content slide down
4. Click again to close

**Expected Results**:
- Initial state: `data-toggle=""` or `data-toggle="closed"`
- On click (opening): `data-toggle="opening"`
- After animation: `data-toggle="open"`
- On close click: `data-toggle="closing"` → `data-toggle="closed"`
- Content shows/hides smoothly

**Console Events**:
```
Toggle opened: <button> <div#toggle-content-1>
Toggle closed: <button> <div#toggle-content-1>
```

---

### Test 4: Lazysrc Component States
**Objective**: Verify lazysrc state transitions and error handling.

**Expected State Flow (Success)**:
```
"" (mounted) → "loading" → "loaded"
```

**Expected State Flow (Error)**:
```
"" (mounted) → "loading" → "error"
```

**How to Verify**:
1. Scroll to "Test 4" section
2. Check valid images: should show loading → loaded
3. Check invalid image: should show loading → error

**Expected Results**:
- Valid images: `data-lazysrc="loading"` → `data-lazysrc="loaded"`
- Invalid image: `data-lazysrc="loading"` → `data-lazysrc="error"`
- Error image shows red border and warning icon
- Loading shows shimmer animation

**Console Events**:
```
Lazysrc loading started: <img>
Lazysrc loaded: <img>
Lazysrc error: <img> [Error details]
```

---

### Test 5: Staggered Reveals
**Objective**: Verify FIFO queue staggering works correctly.

**Expected Behavior**:
- Items reveal in order (1, 2, 3, 4)
- Each item has 100ms delay between reveals
- Total animation time: ~400ms for all 4 items

**How to Verify**:
1. Scroll to "Test 5" section
2. Watch items reveal one after another
3. Verify order is preserved

---

### Test 6: Below-the-Fold Reveals
**Objective**: Verify elements only reveal when scrolled into view.

**Expected Behavior**:
- Elements start with `data-reveal="hidden"`
- Opacity: 0, transform: translateY(1rem)
- Only reveal when scrolled into viewport

**How to Verify**:
1. Before scrolling: Check state is "hidden"
2. Scroll down to elements
3. Verify they reveal when entering viewport

---

## Browser Console Inspection

### Check Component States
```javascript
// Get all elements with state
document.querySelectorAll('[data-lazysrc]').forEach(el => {
  console.log('Lazysrc:', el.getAttribute('data-lazysrc'), el);
});

document.querySelectorAll('[data-reveal]').forEach(el => {
  console.log('Reveal:', el.getAttribute('data-reveal'), el);
});

document.querySelectorAll('[data-toggle]').forEach(el => {
  console.log('Toggle:', el.getAttribute('data-toggle'), el);
});
```

### Check Multi-Component Elements
```javascript
// Find elements with multiple components
const multiElements = Array.from(document.querySelectorAll('[data-lazysrc]'))
  .filter(el => el.hasAttribute('data-reveal'));

console.log('Multi-component elements:', multiElements.length);
multiElements.forEach(el => {
  console.log({
    element: el,
    lazysrc: el.getAttribute('data-lazysrc'),
    reveal: el.getAttribute('data-reveal')
  });
});
```

### Monitor State Changes
```javascript
// Watch for attribute changes
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.type === 'attributes') {
      const attrName = mutation.attributeName;
      const newValue = mutation.target.getAttribute(attrName);
      console.log(`${attrName} changed to: "${newValue}"`, mutation.target);
    }
  });
});

document.querySelectorAll('[data-lazysrc], [data-reveal], [data-toggle]').forEach(el => {
  observer.observe(el, { attributes: true });
});

console.log('Watching for state changes...');
```

---

## Success Criteria

### CRITICAL: Multi-Component Support
- [ ] Elements with both `data-lazysrc` and `data-reveal` work correctly
- [ ] Both components mount without blocking each other
- [ ] Both state attributes are present and update independently
- [ ] No console errors related to component mounting

### State Transitions
- [ ] All state transitions follow expected flow
- [ ] No stuck states or infinite loops
- [ ] States update in DOM attributes
- [ ] CSS styling applies based on states

### Performance
- [ ] No memory leaks (check DevTools Performance tab)
- [ ] State updates are efficient
- [ ] Lazy loading works correctly
- [ ] Animations are smooth

### Console Output
- [ ] Events fire in correct order
- [ ] No errors or warnings
- [ ] Debug logs show component lifecycle

---

## Known Issues to Watch For

### Potential Problems
1. **Component Blocking**: If only one component mounts on multi-component elements
2. **State Conflicts**: If one component's state overwrites another's
3. **Memory Leaks**: If components don't clean up properly
4. **Race Conditions**: If state updates conflict
5. **CSS Not Applied**: If attribute selectors don't match

### Fixed Issues
- Generic `data-component-mounted` blocking (REMOVED)
- Components now use component-specific state tracking
- PageManager uses `instance.isMounted(element)` check

---

## Test Results

Date: ___________
Tester: ___________

| Test | Status | Notes |
|------|--------|-------|
| Multi-component elements | Pass / Fail | |
| Reveal state transitions | Pass / Fail | |
| Toggle state transitions | Pass / Fail | |
| Lazysrc state transitions | Pass / Fail | |
| Error handling | Pass / Fail | |
| Staggered reveals | Pass / Fail | |
| Below-fold reveals | Pass / Fail | |
| CSS state styling | Pass / Fail | |
| Performance | Pass / Fail | |
| No console errors | Pass / Fail | |

**Overall Result**: PASS / FAIL

**Additional Notes**:
___________________________________________
___________________________________________
___________________________________________
