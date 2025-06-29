'use client';

import { useAuth } from "@/hooks/use-auth";
import { BaseComponentProps } from "@/types";
import { CreditCard, LogOut, User, Palette } from "lucide-react";
import Link from "next/link";
import { PlanBadge } from "./PlanBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { AvatarImage } from "../ui/avatar";
import { AvatarFallback } from "../ui/avatar";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { SimpleThemeToggle } from "../ui/theme-toggle";

interface AuthenticatedDropdownProps extends BaseComponentProps { }

export const AuthenticatedDropdown: React.FC<AuthenticatedDropdownProps> = ({ className = "" }) => {
    const { user, isAuthenticated, logout, isLoading } = useAuth();

    return (
        <div className="flex items-center space-x-3">
            {/* Theme Toggle - Always visible */}
            <SimpleThemeToggle variant="ghost" size="icon" />

            {isAuthenticated && user ? (
                <>
                    <PlanBadge />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button disabled={isLoading} variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                                    <AvatarFallback className="bg-card text-foreground">
                                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
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
                                    Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/plans" className="cursor-pointer">
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Manage Plan
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer text-status-error focus:text-status-error"
                                onClick={() => logout()}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            ) : (
                <Link href="/signin">
                    <Button
                        variant="outline"
                        className="bg-transparent text-foreground"
                    >
                        Login
                    </Button>
                </Link>
            )}
        </div>
    );
};