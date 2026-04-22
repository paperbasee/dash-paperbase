import { createElement, forwardRef, type ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const navigation = createNavigation(routing);

type NavigationLinkProps = ComponentProps<typeof navigation.Link>;

const Link = forwardRef<HTMLAnchorElement, NavigationLinkProps>(
  function AppLink({ prefetch, ...props }, ref) {
    const resolvedPrefetch =
      prefetch ?? (process.env.NODE_ENV === "production" ? undefined : false);

    return createElement(navigation.Link, {
      ...props,
      ref,
      prefetch: resolvedPrefetch,
    });
  }
);

export const { redirect, usePathname, useRouter, getPathname } = navigation;
export { Link };
