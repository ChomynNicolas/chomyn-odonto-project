"use client"

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton"
import { GlobalSearch } from "@/components/header/GlobalSearch"
import { UserMenu } from "@/components/header/UserMenu"
import { CurrentPatientInfo } from "@/components/header/CurrentPatientInfo"
import { useSidebar } from "@/context/SidebarContext"
import Image from "next/image"
import Link from "next/link"
import type React from "react"

interface MenuIconProps {
  isOpen: boolean
}

function MenuIcon({ isOpen }: MenuIconProps) {
  if (isOpen) {
    return (
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
    )
  }

  return (
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
  )
}

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar()
    } else {
      toggleMobileSidebar()
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-800 dark:bg-gray-900/95 dark:supports-[backdrop-filter]:bg-gray-900/80">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:gap-4 lg:h-[72px] lg:px-6">
        {/* Left Section: Toggle + Logo */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:h-11 lg:w-11"
          >
            <MenuIcon isOpen={isMobileOpen} />
          </button>

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

        {/* Center Section: Global Search (visible from md) */}
        <div className="hidden md:flex md:flex-1 md:justify-center md:max-w-xl">
          <GlobalSearch />
        </div>

        {/* Current Patient Info (visible from md) */}
        <CurrentPatientInfo />

        {/* Right Section: Theme Toggle + User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggleButton />

          <div className="hidden h-8 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default AppHeader
