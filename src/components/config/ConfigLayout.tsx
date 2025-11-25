"use client"

import { ReactNode } from "react"
import ConfigSidebar from "./ConfigSidebar"
import ConfigHeader from "./ConfigHeader"
import { ConfigErrorBoundary } from "./ConfigErrorBoundary"

export default function ConfigLayout({ children }: { children: ReactNode }) {
  return (
    <ConfigErrorBoundary>
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
        <ConfigSidebar />
        <main className="flex-1 lg:ml-[280px] transition-all duration-300" id="config-main-content">
          <div className="p-4 lg:p-6">
            <ConfigHeader />
            {children}
          </div>
        </main>
      </div>
    </ConfigErrorBoundary>
  )
}

