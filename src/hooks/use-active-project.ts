import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectsQuery } from "@/lib/data";

const KEY = "instastudio.activeProject";
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const read = () => (typeof window === "undefined" ? null : window.localStorage.getItem(KEY));

export function setActiveProject(id: string) {
  window.localStorage.setItem(KEY, id);
  listeners.forEach((l) => l());
}

export function useActiveProject() {
  const { data = [], isLoading } = useQuery(projectsQuery());
  const stored = useSyncExternalStore(subscribe, read, () => null);
  const projects = data.filter((p) => p.status !== "archived");
  const current = projects.find((p) => p.id === stored) ?? projects[0] ?? null;
  return { projects, current, select: setActiveProject, isLoading };
}
