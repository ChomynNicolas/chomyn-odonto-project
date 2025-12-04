"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SvgMaskIcon } from "@/components/icons/SvgMaskIcon";
import { useUserSession } from "@/hooks/useUserSession";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

export function UserMenu({ align = "end", side = "bottom" }: UserMenuProps) {
  const { name, email, roleConfig, initials, image, isLoading, isAuthenticated } =
    useUserSession();

  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: "/signin",
        redirect: true,
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Estado de carga - mostrar skeleton
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="hidden sm:flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  // No autenticado - mostrar botón de login
  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          window.location.href = "/signin";
        }}
        aria-label="Iniciar sesión"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Iniciar sesión</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          aria-label={`Menú de usuario: ${name}`}
        >
          {/* Badge de rol con ícono - visible desde sm */}
          {roleConfig && (
            <Badge
              className={cn(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex",
                roleConfig.badgeClass
              )}
              title={roleConfig.label}
            >
              <SvgMaskIcon
                name={roleConfig.iconName}
                sizeClassName="h-3.5 w-3.5"
                className={roleConfig.iconColor}
                aria-hidden
              />
              <span className="hidden lg:inline">{roleConfig.label}</span>
            </Badge>
          )}

          {/* Avatar */}
          <Avatar className="h-8 w-8">
            {image && <AvatarImage src={image} alt={name} />}
            <AvatarFallback className="bg-teal-500 dark:bg-teal-600 text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Nombre - visible desde sm */}
          <span className="hidden sm:inline text-sm font-medium text-gray-900 dark:text-gray-100">
            {name}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} side={side} className="w-56">
        {/* Header con información del usuario */}
        <div className="px-2 py-1.5">
          <DropdownMenuLabel className="px-0 font-semibold">{name}</DropdownMenuLabel>
          {email && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate px-0">{email}</p>
          )}
          {roleConfig && (
            <Badge
              className={cn(
                "mt-1.5 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                roleConfig.badgeClass
              )}
            >
              <SvgMaskIcon
                name={roleConfig.iconName}
                sizeClassName="h-3.5 w-3.5"
                className={roleConfig.iconColor}
                aria-hidden
              />
              {roleConfig.label}
            </Badge>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Cerrar Sesión */}
        <DropdownMenuItem
          onClick={handleSignOut}
          variant="destructive"
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

