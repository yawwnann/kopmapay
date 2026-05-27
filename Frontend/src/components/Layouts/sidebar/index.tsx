"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/api-helpers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronDownIcon } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

interface NavItem {
  title: string;
  icon?: any;
  url?: string;
  roles?: string[];
  items?: NavItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [userRole, setUserRole] = useState<"ADMIN" | "ANGGOTA" | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setUserRole(user.role);
    }
  }, []);

  // Check if any item in dropdown is active
  const isDropdownActive = (item: NavItem) => {
    if (item.items) {
      return item.items.some((subItem) => pathname === subItem.url);
    }
    return false;
  };

  // Toggle dropdown menu
  const toggleMenu = (title: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedMenus(newExpanded);
  };

  // Check if path is active
  const isPathActive = (url?: string) => {
    return url ? pathname === url : false;
  };

  // Filter and organize nav data based on user role
  const filteredNavData: NavSection[] = NAV_DATA.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(userRole!);
    }),
  })).filter((section) => section.items.length > 0);

  // Auto-expand active dropdown menus on load
  useEffect(() => {
    const newExpanded = new Set(expandedMenus);
    filteredNavData.forEach((section) => {
      section.items.forEach((item) => {
        if (item.items && isDropdownActive(item)) {
          newExpanded.add(item.title);
        }
      });
    });
    setExpandedMenus(newExpanded);
  }, [pathname]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "overflow-hidden border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark",
          isMobile
            ? "fixed bottom-0 left-0 top-0 z-50 w-[290px] transition-transform duration-300 ease-linear"
            : "fixed left-0 top-0 z-40 h-screen w-[290px] shrink-0",
          !isOpen && isMobile && "-translate-x-full",
        )}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
        suppressHydrationWarning
      >
        <div className="flex h-full flex-col pl-[25px] pr-[7px]">
          <div className="relative pr-4.5">
            <Link
              href={"/"}
              onClick={() => isMobile && toggleSidebar()}
              className="block"
            >
              <Logo />
            </Link>

            {/* Close button for mobile */}
            {isMobile && isOpen && (
              <button
                onClick={toggleSidebar}
                className="absolute right-4.5 top-1/2 -translate-y-1/2"
              >
                <span className="sr-only">Close Menu</span>
                <ArrowLeftIcon className="size-7" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto pr-3 min-[850px]:mt-4">
            {filteredNavData.map((section) => (
              <div key={section.label} className="mb-6">
                <h2 className="mb-4 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {section.label}
                </h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      // Check if item has sub-items (dropdown menu)
                      const hasSubItems = item.items && item.items.length > 0;
                      const isExpanded = expandedMenus.has(item.title);
                      const isActive = isDropdownActive(item);

                      if (hasSubItems) {
                        return (
                          <li key={item.title}>
                            <button
                              onClick={() => toggleMenu(item.title)}
                              className={cn(
                                "flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-dark-4 hover:bg-gray-100 dark:text-dark-6 dark:hover:bg-white/5",
                              )}
                            >
                              {item.icon && (
                                <item.icon
                                  className="size-5 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                              <span className="flex-1 text-left">{item.title}</span>
                              <ChevronDownIcon
                                className={cn(
                                  "size-4 shrink-0 transition-transform duration-200",
                                  isExpanded && "rotate-180",
                                )}
                              />
                            </button>

                            {/* Dropdown sub-items */}
                            <div
                              className={cn(
                                "ml-4 overflow-hidden transition-all duration-300",
                                isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                              )}
                            >
                              <ul className="mt-1 space-y-0.5 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
                                {item.items!.map((subItem) => {
                                  const isSubItemActive = pathname === subItem.url;
                                  return (
                                    <li key={subItem.title}>
                                      <MenuItem
                                        as="link"
                                        href={subItem.url!}
                                        isActive={isSubItemActive}
                                        className={cn(
                                          "flex items-center gap-3 whitespace-nowrap py-2 text-sm",
                                          isSubItemActive
                                            ? "text-primary"
                                            : "text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white",
                                        )}
                                      >
                                        <span className="size-1.5 rounded-full bg-current" />
                                        <span>{subItem.title}</span>
                                      </MenuItem>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </li>
                        );
                      }

                      // Single item (no dropdown)
                      return (
                        <li key={item.title}>
                          <MenuItem
                            as="link"
                            href={item.url!}
                            isActive={isPathActive(item.url)}
                            className="flex items-center gap-3 whitespace-nowrap py-2.5 text-sm"
                          >
                            {item.icon && (
                              <item.icon
                                className="size-5 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span>{item.title}</span>
                          </MenuItem>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}