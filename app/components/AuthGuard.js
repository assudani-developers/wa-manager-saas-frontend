"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // We don't want to run the check on login or public privacy page
    if (pathname === "/login" || pathname === "/privacy") {
      setIsAuthorized(true);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, router]);

  // Don't render children until we've verified auth status
  if (!isAuthorized && pathname !== "/login" && pathname !== "/privacy") {
    return null; 
  }

  return <>{children}</>;
}
