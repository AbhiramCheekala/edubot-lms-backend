// "26d149f5-76e0-40c8-bf48-2c41cf5b47cc":"Text",
//     "c7e8fa0f-4496-4902-bdeb-d706678aadf0":"Code Assist",
//     "9e9c418b-265a-4be7-a992-bd72bbea528e":"Text to Sql",
//     "c5000ff5-e2cc-4fc1-8b3f-51786293259f":"Text to Excel"

export const PlatformTypes = {
  Text: '26d149f5-76e0-40c8-bf48-2c41cf5b47cc',
  CodeAssist: 'c7e8fa0f-4496-4902-bdeb-d706678aadf0',
  TextToSql: '9e9c418b-265a-4be7-a992-bd72bbea528e',
  TextToExcel: 'c5000ff5-e2cc-4fc1-8b3f-51786293259f'
} as const;

export const PlatformTypesReverse = Object.fromEntries(
  Object.entries(PlatformTypes).map(([key, value]) => [value, key])
) as Record<PlatformTypeValue, PlatformType>;

export type PlatformType = keyof typeof PlatformTypes;
export type PlatformTypeValue = (typeof PlatformTypes)[PlatformType];
