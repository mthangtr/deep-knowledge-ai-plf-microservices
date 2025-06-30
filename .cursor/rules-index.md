# Cursor Rules Index

Tổng hợp các rules đã được tối ưu cho Next.js 15 development workflow.

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
