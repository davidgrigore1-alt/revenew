import {
  ChartBarIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  HomeIcon,
  InboxStackIcon,
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

export const dashboardNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Inbox Comercial", href: "/inbox", icon: InboxStackIcon },
  { name: "Oportunități", href: "/opportunities", icon: SparklesIcon },
  { name: "Analizeaza oportunitate", href: "/opportunities/analyze", icon: SparklesIcon },
  { name: "Lead-uri", href: "/leads", icon: UserGroupIcon },
  { name: "Outreach", href: "/outreach", icon: MegaphoneIcon },
  { name: "Rapoarte", href: "/reports", icon: ChartBarIcon },
  { name: "Demo", href: "/demo", icon: ClipboardDocumentCheckIcon },
  { name: "Ajutor", href: "/help", icon: QuestionMarkCircleIcon },
  { name: "Setări", href: "/settings", icon: Cog6ToothIcon },
  { name: "Admin", href: "/admin", icon: ShieldCheckIcon }
];
