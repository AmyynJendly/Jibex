import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Fonts, Spacing, Typography, useColors } from '../constants';
import { GlassSurface } from './GlassSurface';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** The glass pill switcher used for list filters (Scheduled/Completed, All/Pending/Delivered, ...). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useColors();

  return (
    <GlassSurface style={styles.wrapper}>
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable key={segment.value} onPress={() => onChange(segment.value)} style={styles.segment}>
            {active && (
              <>
                <GlassSurface
                  style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
                  tintColor={colors.accent}
                  tintOpacity={0.42}
                  glassEffectStyle="regular"
                  isInteractive
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                  locations={[0, 0.6]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 10, pointerEvents: 'none' }]}
                />
              </>
            )}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                Typography.subhead,
                {
                  color: active ? '#fff' : colors.textSecondary,
                  fontFamily: active ? Fonts.archivoBold : Fonts.archivoSemiBold,
                },
              ]}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: 14,
    padding: 4,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
