export const ACTIVE_SUBJECT_STORAGE_KEY = 'active-study-subject-id';
export const SUBJECT_CHANGED_EVENT = 'study-subject-changed';

export function getActiveSubjectId() {
  if (typeof window === 'undefined') return null;

  return window.localStorage.getItem(ACTIVE_SUBJECT_STORAGE_KEY);
}

export function setActiveSubjectId(subjectId: string | null) {
  if (typeof window === 'undefined') return;

  if (subjectId) {
    window.localStorage.setItem(ACTIVE_SUBJECT_STORAGE_KEY, subjectId);
  } else {
    window.localStorage.removeItem(ACTIVE_SUBJECT_STORAGE_KEY);
  }

  window.dispatchEvent(new Event(SUBJECT_CHANGED_EVENT));
}
