import {
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  HomeIcon,
  InboxStackIcon,
  LifebuoyIcon,
  MegaphoneIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import type { NavigationIconName } from "@/lib/navigation";
import type { ComponentType, SVGProps } from "react";

const icons = {
  banknotes: BanknotesIcon,
  "chart-bar": ChartBarIcon,
  cog: Cog6ToothIcon,
  "clipboard-check": ClipboardDocumentCheckIcon,
  home: HomeIcon,
  "inbox-stack": InboxStackIcon,
  lifebuoy: LifebuoyIcon,
  megaphone: MegaphoneIcon,
  puzzle: PuzzlePieceIcon,
  "shield-check": ShieldCheckIcon,
  sparkles: SparklesIcon,
  "user-group": UserGroupIcon
} satisfies Record<NavigationIconName, ComponentType<SVGProps<SVGSVGElement>>>;

export function NavigationIcon({
  name,
  className,
  "aria-hidden": ariaHidden = true
}: {
  name: NavigationIconName;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const Icon = icons[name];

  return <Icon className={className} aria-hidden={ariaHidden} />;
}
