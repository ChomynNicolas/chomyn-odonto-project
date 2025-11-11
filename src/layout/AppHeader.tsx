"use client"

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton"
import NotificationDropdown from "@/components/header/NotificationDropdown"
import { UserIdentity } from "@/components/header/UserIdentity"
import { useSidebar } from "@/context/SidebarContext"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import type React from "react"
import { useEffect, useRef, useState } from "react"

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const isLoading = status === "loading"

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar()
    } else {
      toggleMobileSidebar()
    }
  }

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen)
  }

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const userName = session?.user?.name ?? session?.user?.username ?? "Invitado"
  const userRole = session?.user?.role

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:gap-4 lg:h-[72px] lg:px-6">
        {/* Left Section: Toggle + Logo */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Sidebar Toggle Button */}
          <button
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:h-11 lg:w-11"
          >
            {isMobileOpen ? (
              // Close Icon
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              // Menu Icon
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3 6C3 5.58579 3.33579 5.25 3.75 5.25H20.25C20.6642 5.25 21 5.58579 21 6C21 6.41421 20.6642 6.75 20.25 6.75H3.75C3.33579 6.75 3 6.41421 3 6ZM3 12C3 11.5858 3.33579 11.25 3.75 11.25H20.25C20.6642 11.25 21 11.5858 21 12C21 12.4142 20.6642 12.75 20.25 12.75H3.75C3.33579 12.75 3 12.4142 3 12ZM3.75 17.25C3.33579 17.25 3 17.5858 3 18C3 18.4142 3.33579 18.75 3.75 18.75H13.25C13.6642 18.75 14 18.4142 14 18C14 17.5858 13.6642 17.25 13.25 17.25H3.75Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          {/* Logo - visible on mobile */}
          <Link href="/" className="flex items-center lg:hidden">
            <Image
              width={154}
              height={32}
              className="h-7 w-auto dark:hidden"
              src="/images/logo/logo.svg"
              alt="Logo"
              priority
            />
            <Image
              width={154}
              height={32}
              className="hidden h-7 w-auto dark:block"
              src="/images/logo/logo-dark.svg"
              alt="Logo"
              priority
            />
          </Link>
        </div>

        {/* Right Section: Actions + User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Menu Toggle (visible only on small screens) */}
          <button
            onClick={toggleApplicationMenu}
            aria-label="Toggle application menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:hidden"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {/* Theme Toggle */}
          <ThemeToggleButton />

          {/* Notifications */}
          <NotificationDropdown />

          {/* Divider - hidden on mobile */}
          <div className="hidden h-8 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

          {/* User Identity */}
          <UserIdentity name={userName} role={userRole} variant="header" loading={isLoading} />
        </div>
      </div>
    </header>
  )
}

export default AppHeader
