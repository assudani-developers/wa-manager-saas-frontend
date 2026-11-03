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
      return;
    }

    // Strict protection: /users is SaaS Master Admin ONLY
    if (pathname === "/users") {
      try {
        const role = localStorage.getItem("user_role");
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const isMaster = role === "master_admin" || user?.role === "master_admin" || user?.username?.toLowerCase() === "piyushassudani";
        if (!isMaster) {
          router.push("/chat");
          return;
        }
      } catch (e) {
        router.push("/chat");
        return;
      }
    }

    setIsAuthorized(true);
  }, [pathname, router]);

  // Don't render children until we've verified auth status
  if (!isAuthorized && pathname !== "/login" && pathname !== "/privacy") {
    return null; 
  }

  return <>{children}</>;
}
