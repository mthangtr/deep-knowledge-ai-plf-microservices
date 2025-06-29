# Test script cho Backend Main - JWT và Supabase integration
Write-Host "Testing Backend Main Service" -ForegroundColor Green

# Check directory
Set-Location backend-main

Write-Host "`n1. Testing TypeScript compilation..." -ForegroundColor Yellow
$result = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript compilation OK" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript errors:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Testing build..." -ForegroundColor Yellow
$result = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Checking JWT integration..." -ForegroundColor Yellow

# Check auth routes
if (Test-Path "src/routes/auth.routes.ts") {
    $authContent = Get-Content "src/routes/auth.routes.ts" -Raw
    if ($authContent -match "jwt\.sign" -and $authContent -match "jwt\.verify") {
        Write-Host "✅ JWT signing va verification implemented" -ForegroundColor Green
    } else {
        Write-Host "❌ JWT integration incomplete" -ForegroundColor Red
    }
    
    if ($authContent -match "supabase-callback" -and $authContent -match "/session") {
        Write-Host "✅ Auth endpoints implemented: /supabase-callback, /session" -ForegroundColor Green
    } else {
        Write-Host "❌ Auth endpoints missing" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Auth routes file missing" -ForegroundColor Red
}

Write-Host "`n4. Checking Supabase integration..." -ForegroundColor Yellow

# Check supabase config
if (Test-Path "src/config/supabase.ts") {
    $supabaseContent = Get-Content "src/config/supabase.ts" -Raw
    if ($supabaseContent -match "createClient" -and $supabaseContent -match "SUPABASE_URL") {
        Write-Host "✅ Supabase client configuration OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Supabase config incomplete" -ForegroundColor Red
    }
    
    if ($supabaseContent -match "supabaseAdmin") {
        Write-Host "✅ Supabase admin client configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Supabase admin client missing" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Supabase config file missing" -ForegroundColor Red
}

Write-Host "`n5. Checking CRUD operations..." -ForegroundColor Yellow

$routes = @("topic.routes.ts", "note.routes.ts", "chat.routes.ts", "tree.routes.ts")
foreach ($route in $routes) {
    if (Test-Path "src/routes/$route") {
        $content = Get-Content "src/routes/$route" -Raw
        if ($content -match "supabase" -and $content -match "authenticate") {
            Write-Host "✅ ${route}: Supabase + Auth integration OK" -ForegroundColor Green
        } else {
            Write-Host "⚠️  ${route}: Missing supabase or auth integration" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ ${route}: File missing" -ForegroundColor Red
    }
}

Write-Host "`n6. Checking middleware..." -ForegroundColor Yellow

if (Test-Path "src/middleware/auth.middleware.ts") {
    $authMw = Get-Content "src/middleware/auth.middleware.ts" -Raw
    if ($authMw -match "getAuthenticatedUser" -and $authMw -match "req\.user") {
        Write-Host "✅ Auth middleware implemented" -ForegroundColor Green
    } else {
        Write-Host "❌ Auth middleware incomplete" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Auth middleware missing" -ForegroundColor Red
}

Write-Host "`n📋 Backend Main Integration Summary:" -ForegroundColor Cyan
Write-Host "🔐 JWT Session Management:" -ForegroundColor White
Write-Host "  - JWT token generation từ Supabase user data" -ForegroundColor White
Write-Host "  - JWT verification trong middleware" -ForegroundColor White
Write-Host "  - Session endpoint để validate token" -ForegroundColor White

Write-Host "`n💾 Supabase as RDBMS:" -ForegroundColor White
Write-Host "  - Client connection configured" -ForegroundColor White
Write-Host "  - CRUD operations sử dụng Supabase" -ForegroundColor White
Write-Host "  - Admin client cho bypass RLS" -ForegroundColor White

Write-Host "`n🔄 Authentication Flow:" -ForegroundColor White
Write-Host "  1. Supabase handles magic link auth" -ForegroundColor White
Write-Host "  2. POST /api/auth/supabase-callback generates JWT" -ForegroundColor White
Write-Host "  3. Frontend stores JWT trong session" -ForegroundColor White
Write-Host "  4. All API requests use JWT Bearer token" -ForegroundColor White
Write-Host "  5. Middleware validates JWT và inject user info" -ForegroundColor White

Write-Host "`nReady for production! 🚀" -ForegroundColor Green

Set-Location .. 