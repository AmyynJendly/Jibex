import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconName } from './Icon';
import { Fonts, Radii, Spacing, Typography, morphIn, useColors } from '../constants';

interface EmptyStateProps {
  icon?: IconName;
  /** Overrides `icon` — for parcel-shaped empties, which get the brand box. */
  illustration?: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Shown in place of a list that has nothing in it.
 *
 * This used to be an icon bobbing up and down forever on top of a large gold
 * radial glow. Both had to go: the halo read as a stray light leak rather
 * than as design, and a permanent loop in an empty list keeps drawing the
 * eye to the one part of the screen with nothing to say — an empty runsheet
 * is usually good news, and it shouldn't pulse for attention.
 *
 * What replaces it is a framed tile: bordered, grounded, and still. It reads
 * as a deliberate placeholder — the shape of the thing that will be here —
 * instead of a floating object. The only motion left is the one-shot
 * entrance, so it settles once and then stays put.
 */
export function EmptyState({ icon, illustration, title, subtitle }: EmptyStateProps) {
  const colors = useColors();

  return (
    <Animated.View entering={morphIn()} style={styles.container}>
      <View
        style={[
          styles.iconTile,
          { backgroundColor: colors.neutralSoft, borderColor: colors.separator },
        ]}>
        {illustration ?? <Icon name={icon ?? 'ellipse-outline'} size={26} color={colors.textTertiary} />}
      </View>
      <View style={styles.copy}>
        <Text style={[Typography.callout, styles.title, { color: colors.textSecondary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[Typography.footnote, styles.subtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: Spacing.huge,
    paddingBottom: Spacing.huge,
    gap: Spacing.lg,
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: Radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontFamily: Fonts.archivoSemiBold,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});
