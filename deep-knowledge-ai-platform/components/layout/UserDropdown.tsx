'use client';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User, CreditCard, ChevronDown, Palette } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PlanBadge } from "./PlanBadge";
import { SimpleThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

interface UserDropdownProps {
    collapsed?: boolean;
}

export function UserDropdown({ collapsed = false }: UserDropdownProps) {
    const { user, isAuthenticated, logout, isLoading } = useAuth();

    if (!isAuthenticated || !user) {
        return (
            <Link href="/signin">
                <Button
                    variant="outline"
                    size={collapsed ? "icon" : "sm"}
                    className="w-full"
                >
                    {!collapsed && "Đăng nhập"}
                    {collapsed && <User className="h-4 w-4" />}
                </Button>
            </Link>
        );
    }

    if (collapsed) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        disabled={isLoading}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                    >
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                            <AvatarFallback className="bg-card text-foreground text-xs">
                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" side="right">
                    <div className="flex items-center justify-start gap-2 p-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                            <AvatarFallback className="bg-card text-foreground text-xs">
                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1 leading-none">
                            {user.name && (
                                <p className="font-medium text-sm">{user.name}</p>
                            )}
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1">
                        <PlanBadge />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            Hồ sơ
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/plans" className="cursor-pointer">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Quản lý gói
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            Cài đặt
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            <span className="text-sm">Giao diện</span>
                        </div>
                        <SimpleThemeToggle variant="ghost" size="sm" />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer text-status-error focus:text-status-error"
                        onClick={() => logout()}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Đăng xuất
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    disabled={isLoading}
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto bg-transparent"
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 select-none">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                                <AvatarFallback className="bg-card text-foreground text-xs">
                                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm line-clamp-1">
                                {user.name || user.email}
                            </span>
                        </div>
                        <PlanBadge />
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                        <AvatarFallback className="bg-card text-foreground text-xs">
                            {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1 leading-none">
                        {user.name && (
                            <p className="font-medium text-sm">{user.name}</p>
                        )}
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Hồ sơ
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/plans" className="cursor-pointer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Quản lý gói
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Cài đặt
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        <span className="text-sm">Giao diện</span>
                    </div>
                    <SimpleThemeToggle variant="ghost" size="sm" />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer text-status-error focus:text-status-error"
                    onClick={() => logout()}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 