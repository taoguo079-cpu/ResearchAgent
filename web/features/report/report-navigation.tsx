"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { ReportHeadingIndex } from "@/lib/markdown/report-headings";

export type ReportTab = "report" | "papers" | "run";
type ReportContents = { headingIndex: ReportHeadingIndex; loading: boolean };
type NavigationState = {
  report: ReportContents | null;
  activeTab: ReportTab;
  isTaskSidebarOpen: boolean;
};
type NavigationAction =
  | { type: "publish"; report: ReportContents }
  | { type: "clear" }
  | { type: "tab"; tab: ReportTab }
  | { type: "toggle" }
  | { type: "close" };

const initialState: NavigationState = {
  report: null,
  activeTab: "report",
  isTaskSidebarOpen: false,
};

function reduceNavigation(state: NavigationState, action: NavigationAction) {
  switch (action.type) {
    case "publish":
      return { ...state, report: action.report };
    case "clear":
      return initialState;
    case "tab":
      return {
        ...state,
        activeTab: action.tab,
        isTaskSidebarOpen: action.tab !== "report",
      };
    case "toggle":
      return { ...state, isTaskSidebarOpen: !state.isTaskSidebarOpen };
    case "close":
      return { ...state, isTaskSidebarOpen: false };
  }
}

type ReportNavigation = NavigationState & {
  publishReport: (report: ReportContents) => void;
  clearReport: () => void;
  setActiveTab: (tab: ReportTab) => void;
  toggleTaskSidebar: () => void;
  closeTaskSidebar: () => void;
};

const ReportNavigationContext = createContext<ReportNavigation | null>(null);

export function ReportNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reduceNavigation, initialState);
  const publishReport = useCallback(
    (report: ReportContents) => dispatch({ type: "publish", report }),
    [],
  );
  const clearReport = useCallback(() => dispatch({ type: "clear" }), []);
  const setActiveTab = useCallback(
    (tab: ReportTab) => dispatch({ type: "tab", tab }),
    [],
  );
  const toggleTaskSidebar = useCallback(() => dispatch({ type: "toggle" }), []);
  const closeTaskSidebar = useCallback(() => dispatch({ type: "close" }), []);
  const value = useMemo(
    () => ({
      ...state,
      publishReport,
      clearReport,
      setActiveTab,
      toggleTaskSidebar,
      closeTaskSidebar,
    }),
    [
      state,
      publishReport,
      clearReport,
      setActiveTab,
      toggleTaskSidebar,
      closeTaskSidebar,
    ],
  );

  return (
    <ReportNavigationContext.Provider value={value}>
      {children}
    </ReportNavigationContext.Provider>
  );
}

export function useReportNavigation() {
  return useContext(ReportNavigationContext);
}
