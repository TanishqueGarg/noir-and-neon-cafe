import type { BusinessSetting } from "@prisma/client";
import { SettingsForm as ClientSettingsForm } from "@/components/admin/admin-client";

export function SettingsForm({ settings }: { settings: BusinessSetting }) {
  const values = { ...settings, updatedAt: settings.updatedAt.toISOString() };
  return <ClientSettingsForm settings={values} />;
}
