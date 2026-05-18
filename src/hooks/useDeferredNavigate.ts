"use client";

import { useNavigationLoading } from "@/context/NavigationLoadingContext";

export function useDeferredNavigate() {
  const { navigate } = useNavigationLoading();
  return navigate;
}
