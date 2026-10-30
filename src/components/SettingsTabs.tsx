"use client";
import { UserRound, ShieldCheck, Wallet } from "lucide-react";
export type SettingsTab = "profile" | "security" | "payments";
const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "payments", label: "Payments", icon: Wallet },
] as const;
export default function SettingsTabs({
  value,
  onChange,
}: {
  value: SettingsTab;
  onChange: (value: SettingsTab) => void;
}) {
  return (
    <div
      className="settings-tabs"
      role="tablist"
      aria-label="Settings sections"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          id={`settings-${tab.id}-tab`}
          role="tab"
          aria-selected={value === tab.id}
          aria-controls={`settings-${tab.id}-panel`}
          tabIndex={value === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
            else if (event.key === "ArrowLeft")
              next = (index + tabs.length - 1) % tabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = tabs.length - 1;
            else return;
            event.preventDefault();
            onChange(tabs[next].id);
            document.getElementById(`settings-${tabs[next].id}-tab`)?.focus();
          }}
        >
          <tab.icon size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
