# Workflow Cheatsheet 🚀

## Golden Rules

### 1. **Code First**

- Implement solution immediately
- Avoid exploration commands
- Don't ask permission, just do it

### 2. **Minimize Commands**

- Use file tools over terminal
- Only run commands for actual functionality
- Skip status/verification commands

### 3. **Tool Priority**

```
edit_file > read_file > codebase_search > run_terminal_cmd
```

## Quick Decision Tree

```
User asks for something
├── Simple/Clear request? → edit_file (DO IT)
├── Complex/Ambiguous? → TEXT-ONLY verification first
│   ├── Analyze & propose solution
│   ├── Wait for user confirmation
│   └── Then implement: Frontend → Backend → Database
├── Need to understand existing code? → read_file/codebase_search
├── Need to install package? → npm install
└── Actually need terminal? → run_terminal_cmd (rarely)
```

## Verification Template 🔍

**For complex requests, always use:**

```
**Phân tích yêu cầu:**
- Hiểu vấn đề: [current state]
- Đề xuất giải pháp: [proposed solution]
- Tác động: [implications]
- Alternatives: [other options]

**Implementation Plan:**
1. Frontend: [changes needed]
2. Backend: [changes needed]
3. Database: [if any]

**Xác nhận:** Approach này có ổn không?
```

## Implementation Flow Order

```
1. Frontend (UI/UX) → 2. Backend (API) → 3. Database → 4. Integration
```

## Common Anti-Patterns ❌

```bash
# Don't do these
ls src/                    # Use file_search instead
cat package.json          # Use read_file instead
npm run build             # Only when fixing errors
git status                # Only when user asks
echo "checking..."        # No verification noise

# Don't code complex features without verification
User: "Add real-time chat" → *starts coding immediately*
```

## Preferred Actions ✅

```tsx
// For simple requests - direct implementation
edit_file("src/component.tsx", {
  // Direct solution
})

// For understanding - semantic search
codebase_search("authentication logic")

// For file inspection - targeted reading
read_file("package.json", lines: [1, 20])

// For complex requests - verify first
**Text analysis** → User confirmation → Implementation
```

## Success Metrics

- **< 2 terminal commands per task**
- **Clear verification for complex changes**
- **Systematic implementation flow**
- **No surprise breaking changes**
- **Action within first response (simple) or after confirmation (complex)**

---

_Remember: Verify Complex, Code Simple_
