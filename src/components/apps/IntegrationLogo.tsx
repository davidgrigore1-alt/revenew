"use client";

import { ApplicationLogo } from "@/components/apps/ApplicationLogo";
import type { IntegrationCatalogItem } from "@/lib/integrations/catalog";

export function IntegrationLogo({
  item,
  size = "default",
  className
}: {
  item: IntegrationCatalogItem;
  size?: "default" | "large";
  className?: string;
}) {
  return <ApplicationLogo item={item} size={size} className={className} />;
}
