import { useEffect, useState } from 'react';
import { DebateView } from './components/DebateView';
import { GradeView } from './components/GradeView';
import { Navbar } from './components/Navbar';
import { ProgressView } from './components/ProgressView';
import { SampleEssayView } from './components/SampleEssayView';
import type {
  ActiveTab,
  GradingHistoryEntry,
  SampleEssayResult,
  TeacherScores,
  VocabItem,
} from './types/ielts';
import {
  addVocabDeduplicated,
  attachSampleToHistory,
  loadHistory,
  loadTheme,
  loadVocab,
  saveHistory,
  saveTheme,
  saveVocab,
  updateHistoryTeacherScores,
  upsertHistoryEntry,
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('grade');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [history, setHistory] = useState<GradingHistoryEntry[]>(() =>
    loadHistory()
  );
  const [vocab, setVocab] = useState<VocabItem[]>(() => loadVocab());
  const [selectedHistoryEntry, setSelectedHistoryEntry] =
    useState<GradingHistoryEntry | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSaveGradingEntry = (entry: GradingHistoryEntry) => {
    setHistory((prev) => {
      const next = upsertHistoryEntry(prev, entry);
      saveHistory(next);
      return next;
    });
  };

  const handleUpdateTeacherScores = (id: string, scores: TeacherScores) => {
    setHistory((prev) => {
      const next = updateHistoryTeacherScores(prev, id, scores);
      saveHistory(next);
      return next;
    });
  };

  const handleAttachSampleEssay = (id: string, sample: SampleEssayResult) => {
    setHistory((prev) => {
      const next = attachSampleToHistory(prev, id, sample);
      saveHistory(next);
      return next;
    });
  };

  const handleDeleteHistoryEntry = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveHistory(next);
      return next;
    });
    if (selectedHistoryEntry?.id === id) {
      setSelectedHistoryEntry(null);
    }
  };

  const handleOpenHistoryEntry = (entry: GradingHistoryEntry) => {
    setSelectedHistoryEntry(entry);
    setActiveTab('grade');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveVocab = (item: {
    phrase: string;
    vietnamese_meaning: string;
    part_of_speech?: string;
    example_sentence?: string;
    source_topic?: string;
  }) => {
    setVocab((prev) => {
      const { list, added } = addVocabDeduplicated(prev, item);
      if (added) saveVocab(list);
      return list;
    });
  };

  const handleToggleVocabMastered = (id: string) => {
    setVocab((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, mastered: !item.mastered } : item
      );
      saveVocab(next);
      return next;
    });
  };

  const handleDeleteVocab = (id: string) => {
    setVocab((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveVocab(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FDF8F9] text-[#24171D] dark:bg-[#140F12] dark:text-[#F6EEF1] flex flex-col">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pt-8 md:pb-14">
        {activeTab === 'grade' && (
          <GradeView
            activeEntry={selectedHistoryEntry}
            savedVocab={vocab}
            onSaveGradingEntry={handleSaveGradingEntry}
            onUpdateTeacherScores={handleUpdateTeacherScores}
            onAttachSampleEssay={handleAttachSampleEssay}
            onSaveVocab={handleSaveVocab}
          />
        )}

        {activeTab === 'debate' && (
          <DebateView savedVocab={vocab} onSaveVocab={handleSaveVocab} />
        )}

        {activeTab === 'samples' && (
          <SampleEssayView savedVocab={vocab} onSaveVocab={handleSaveVocab} />
        )}

        {activeTab === 'progress' && (
          <ProgressView
            history={history}
            vocab={vocab}
            onOpenHistoryEntry={handleOpenHistoryEntry}
            onDeleteHistoryEntry={handleDeleteHistoryEntry}
            onAddVocab={handleSaveVocab}
            onToggleVocabMastered={handleToggleVocabMastered}
            onDeleteVocab={handleDeleteVocab}
          />
        )}
      </main>

      <footer className="hidden md:block border-t border-[#EDD8DF] bg-[#FFFBFD] py-5 text-xs text-[#735D67] dark:border-[#34262D] dark:bg-[#140F12] dark:text-[#9E8B94]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6">
          <span>IELTS WITH FELIX — Mèo Ăn Cỏ đang lọ mọ làm IELTS Writing Task 2</span>
        </div>
      </footer>
    </div>
  );
}
