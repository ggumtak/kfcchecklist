"use client";

import type { PropsWithChildren } from "react";

import { ChecklistProvider } from "@/features/checklist/context/checklist-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return <ChecklistProvider>{children}</ChecklistProvider>;
}
