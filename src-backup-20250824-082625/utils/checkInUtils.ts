
export const navigateToHome = () => {
  window.location.href = '/';
};

export const navigateToProgress = () => {
  window.location.href = '/progress';
};

export const scrollToIncompleteSection = (completedSections: Set<string>) => {
  const incompleteSection = ['mood', 'wellness', 'assessments'].find(
    section => !completedSections.has(section)
  );
  if (incompleteSection) {
    document.getElementById(incompleteSection)?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }
};

export const showToastNotification = (
  message: string, 
  type: 'success' | 'error',
  setShowToast: React.Dispatch<React.SetStateAction<{ message: string; type: 'success' | 'error' } | null>>
) => {
  setShowToast({ message, type });
  setTimeout(() => setShowToast(null), 3000);
};
