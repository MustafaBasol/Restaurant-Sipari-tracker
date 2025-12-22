export const getMenuCategoryLabel = (
  name: string,
  t: (key: string, defaultValue?: string) => string,
): string => {
  const trimmed = name.trim();
  const key = getDefaultCategoryTranslationKey(trimmed);
  return key ? t(key, trimmed) : trimmed;
};

const getDefaultCategoryTranslationKey = (name: string): string | null => {
  const normalized = name.trim().toLowerCase();

  switch (normalized) {
    case 'appetizers':
      return 'menu.categories.appetizers';
    case 'main courses':
      return 'menu.categories.mainCourses';
    case 'desserts':
      return 'menu.categories.desserts';
    case 'drinks':
      return 'menu.categories.drinks';
    default:
      return null;
  }
};
