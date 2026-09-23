import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, ButtonText } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { useMessages } from '@/i18n/useMessages';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type PantryItem = { id: string; name: string };

function keyExtractor(item: PantryItem) {
  return item.id;
}

export function PantrySampleScreen() {
  const [groceries, setGroceries] = useState<{ id: string; name: string }[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [foodName, setFoodName] = useState('');
  const t = useMessages();
  const { colors } = useTheme();
  
  function handleSave() {
    setGroceries((current) => [...current, { id: Date.now().toString(), name: foodName }]);
    setFoodName('');
    setIsFormVisible(false);
  }

  function renderItem({ item }: ListRenderItemInfo<PantryItem>) {
    return (
      <Surface style={styles.row} accessible accessibilityLabel={item.name}>
        <View style={styles.rowText}>
          <AppText style={styles.foodName}>{item.name}</AppText>
        </View>
      </Surface>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        data={groceries}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="title" accessibilityRole="header">{t('screenTitle')}</AppText>
            <Button onPress={() => setIsFormVisible((value) => !value)}>
              <ButtonText>+ Add food</ButtonText>
            </Button>
            {isFormVisible && (
              <View>
                <TextInput
                  placeholder="Food name"
                  style={styles.input}
                  value={foodName}
                  onChangeText={setFoodName}
                />
                <Button onPress={handleSave}>
                  <ButtonText>Save</ButtonText>
                </Button>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={<AppText variant="muted">Your pantry is empty</AppText>}
        ItemSeparatorComponent={ItemSeparator}
      />
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  sectionTitle: { fontWeight: '700' },
  row: { minHeight: 76, justifyContent: 'center' },
  rowText: { gap: spacing.xs },
  foodName: { fontWeight: '600' },
  separator: { height: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    padding: spacing.sm,
  },
});
