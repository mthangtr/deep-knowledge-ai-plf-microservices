# Workflow Documentation 🚀

## Golden Rules

### 1. Code First (with Context Awareness)

#### ✅ Khi nào nên code ngay:

- UI components đơn giản (button, text, layout)
- Style changes, spacing, icon,...
- File nhỏ, self-contained, không ảnh hưởng logic

#### ⛔ Khi nào KHÔNG nên code ngay:

- Liên quan đến auth, flow chính, dữ liệu
- Tác động nhiều file hoặc dependency chéo
- Flow không chắc chắn (e.g. add "chat feature")

#### 👉 Thay vào đó:

- **Phân tích trước**: Viết plan, chờ xác nhận
- Sử dụng `verification-flow.mdc` với template

### 2. Tool Priority

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

## Core Rules (Always Apply)

### 0. **minimal-commands.mdc** 🔥

- **"Code, don't command"** philosophy
- Avoid unnecessary terminal commands
- Direct implementation over exploration
- 90% code changes, 10% commands

### 0.5. **verification-flow.mdc** 🔍

- **Text-only verification** for complex requests
- Frontend → Backend → Database implementation flow
- No code until user confirms approach
- Clear analysis before implementation

### 1. **typescript-best.mdc**

- Enforce strict TypeScript patterns
- Type safety và modern TS features
- Zod validation, branded types, no enums

### 2. **component-style.mdc**

- React component best practices
- Stateless components, logic separation
- Accessibility và performance patterns

### 3. **ui-ux.mdc**

- UI library choices (Shadcn/UI, Radix)
- Responsive design, dark mode
- Accessibility standards (WCAG)

### 4. **error-debug.mdc**

- Error boundaries và recovery strategies
- Debug tools và logging
- Developer-friendly error messages

### 5. **project-structure.mdc**

- Next.js 15 App Router structure
- Naming conventions
- Client/Server component guidelines

### 6. **api-server.mdc**

- API route patterns
- Input validation với Zod
- Rate limiting và security

### 7. **testing-lint.mdc**

- ESLint/Prettier configuration
- Testing strategies (unit, integration, e2e)
- Git hooks và CI/CD

### 8. **performance.mdc**

- Image optimization
- Code splitting strategies
- Core Web Vitals optimization

### 9. **dev-experience.mdc**

- Fast refresh, incremental builds
- Development tools (Storybook)
- Environment management

### 10. **workflow-automation.mdc**

- **Tool usage principles**: Code first, commands last
- **Action before explanation**: No unnecessary delays
- Code generation với Cursor AI
- Snippets và templates
- Git workflow và automation

## Optional Rules (Apply When Needed)

### 11. **database.mdc**

- Database patterns (khi cần)
- Migrations, pooling, soft deletes

### 12. **security.mdc**

- Security best practices (khi deploy)
- CSRF, XSS protection, JWT

### 13. **monitoring.mdc**

- Production monitoring
- Health checks, metrics
- Correlation IDs

### 14. **seo-i18n.mdc**

- SEO optimization
- Internationalization setup
- Metadata management

## Usage Tips

1. **Review regularly**: Update rules theo project needs
2. **Team alignment**: Share với team members
3. **Customize**: Modify rules cho specific requirements
4. **Cursor AI**: Rules tự động apply khi code với Cursor

## Quick Commands

```bash
# View all rules
ls .cursor/rules/

# Search specific pattern
grep -r "pattern" .cursor/rules/

# Apply formatting to all files
npm run lint:fix && npm run format
```
