import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

type LightTheme = typeof colors.light;
export type AppColors = LightTheme & { radius: number };

export function useColors(): AppColors {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;
  return { ...theme, radius: colors.radius } as AppColors;
}
