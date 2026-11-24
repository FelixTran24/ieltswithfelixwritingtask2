import { useState } from 'react';
import {
  BookOpen,
  FileCheck2,
  MessageSquareText,
  Moon,
  Sun,
  TrendingUp,
} from 'lucide-react';
import type { ActiveTab } from '../types/ielts';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  mobileLabel: string;
  icon: typeof FileCheck2;
}> = [
  { id: 'grade', label: 'CHẤM BÀI', mobileLabel: 'CHẤM BÀI', icon: FileCheck2 },
  {
    id: 'debate',
    label: 'DEBATE ARENA',
    mobileLabel: 'DEBATE',
    icon: MessageSquareText,
  },
  { id: 'samples', label: 'BÀI MẪU', mobileLabel: 'BÀI MẪU', icon: BookOpen },
  {
    id: 'progress',
    label: 'TIẾN BỘ & TỪ VỰNG',
    mobileLabel: 'TIẾN BỘ',
    icon: TrendingUp,
  },
];

export function Navbar({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
}: NavbarProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#EDD8DF] bg-[#FFFBFD]/92 backdrop-blur-md dark:border-[#34262D] dark:bg-[#140F12]/92">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:h-16 md:gap-8">
          {/* Zone 1: Brand Logo + Wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('grade')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:focus-visible:ring-[#F497B6] rounded-lg"
            aria-label="IELTS WITH FELIX - Về trang Chấm bài"
          >
            {!logoError ? (
              <span className="flex h-9 w-10 items-center justify-center overflow-hidden rounded-lg border border-[#F1D2DC] bg-[#FDF5F7] shrink-0 dark:border-[#49323D] dark:bg-[#FDF5F7]">
                <img
                  src="/assets/aistudio/Untitled_design__1__6ce74cd5.png"
                  alt="Logo IELTS WITH FELIX"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="h-full w-full object-cover object-[50%_22%] scale-135"
                />
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#9D0B3A] text-xs font-bold text-white shrink-0">
                IF
              </span>
            )}
            <span className="text-base font-bold tracking-tight text-[#8F0E39] dark:text-[#F8B6CC] whitespace-nowrap">
              IELTS WITH FELIX
            </span>
          </button>

          {/* Zone 2: Primary Navigation (Desktop) */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:focus-visible:ring-[#F497B6] rounded ${
                    isActive
                      ? 'text-[#9D0B3A] dark:text-[#F5A3BF]'
                      : 'text-[#614D56] hover:text-[#24171D] dark:text-[#BBA7B0] dark:hover:text-[#F6EEF1]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[#9D0B3A] dark:bg-[#F5A3BF]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Utility Action (Theme Toggle) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={
                theme === 'dark'
                  ? 'Chuyển sang giao diện sáng'
                  : 'Chuyển sang giao diện tối'
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E9D1DA] bg-white px-3.5 text-xs font-medium text-[#3E2B34] transition-colors hover:bg-[#FDF0F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D0B3A] dark:border-[#3E2E36] dark:bg-[#1E171B] dark:text-[#EFE4E8] dark:hover:bg-[#2A2025] whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-[#F5A3BF]" aria-hidden="true" />
                  <span>Chế độ sáng</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-[#9D0B3A]" aria-hidden="true" />
                  <span>Chế độ tối</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (total sticky height stays <= 14% of 844px viewport) */}
      <nav
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#EDD8DF] bg-[#FFFBFD]/95 backdrop-blur-md md:hidden dark:border-[#34262D] dark:bg-[#140F12]/95"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9D0B3A] ${
                isActive
                  ? 'text-[#9D0B3A] dark:text-[#F5A3BF]'
                  : 'text-[#6A555E] dark:text-[#A9959E]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-full">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
