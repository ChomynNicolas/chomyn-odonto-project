// src/lib/utils/extract-ip.ts
/**
 * Utility function to extract client IP address from Next.js Request/NextRequest
 * Handles various proxy headers and localhost cases
 */

import type { NextRequest } from "next/server"

/**
 * Extracts client IP address from request headers
 * Prioritizes real client IP over proxy IPs
 * Normalizes localhost addresses
 */
export function extractClientIP(req: NextRequest | Request): string | null {
  const headers = req.headers
  
  // 1. Try x-forwarded-for (first IP in chain if behind proxy)
  const xForwardedFor = headers.get("x-forwarded-for")
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim()
    if (firstIp && !isLocalhostIP(firstIp)) {
      return firstIp
    }
    // If it's localhost, we'll handle it below
  }
  
  // 2. Try x-real-ip (set by some proxies)
  const xRealIp = headers.get("x-real-ip")
  if (xRealIp && !isLocalhostIP(xRealIp)) {
    return xRealIp
  }
  
  // 3. Try cf-connecting-ip (Cloudflare)
  const cfIp = headers.get("cf-connecting-ip")
  if (cfIp && !isLocalhostIP(cfIp)) {
    return cfIp
  }
  
  // 4. If we have localhost IPs, normalize them
  const localhostIp = xForwardedFor?.split(",")[0]?.trim() || xRealIp
  if (localhostIp && isLocalhostIP(localhostIp)) {
    return "localhost"
  }
  
  return null
}

/**
 * Checks if an IP address is a localhost address
 */
function isLocalhostIP(ip: string): boolean {
  return ip === "::1" || ip === "127.0.0.1" || ip === "localhost" || ip.startsWith("127.")
}

/**
 * Formats IP address for display
 * Shows "localhost" for localhost IPs, otherwise shows the IP as-is
 */
export function formatIPForDisplay(ip: string | null | undefined): string | null {
  if (!ip) return null
  
  // Normalize localhost addresses
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("127.")) {
    return "localhost"
  }
  
  return ip
}

