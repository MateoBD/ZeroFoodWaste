import { act, fireEvent, render } from '@testing-library/react-native';
import type { NativeSyntheticEvent } from 'react-native';

import { openFoodFactsProvider } from '@/features/barcode/api/openFoodFactsClient';
import { BarcodeScannerScreen } from './BarcodeScannerScreen';

let mockScanHandler: ((result: { data: string }) => Promise<void> | void) | undefined;
let mockSheetIndex = 0;
let mockPermission = { granted: true, canAskAgain: true };
let mockCatalog = [{ provider: 'themealdb' as const, id: '2', name: 'Milk' }];
const mockAddItem = jest.fn();
const mockRouterBack = jest.fn();
const mockScrollTo = jest.fn();
let mockSheetProps: {
  keyboardBehavior?: string;
  keyboardBlurBehavior?: string;
  android_keyboardInputMode?: string;
  enableContentPanningGesture?: boolean;
  animationConfigs?: { duration?: number };
  snapPoints?: string[];
} = {};
let mockScrollProps: { keyboardDismissMode?: string; keyboardShouldPersistTaps?: string } = {};

jest.mock('expo-camera', () => ({
  CameraView: ({ onBarcodeScanned }: { onBarcodeScanned?: (result: { data: string }) => Promise<void> | void }) => {
    mockScanHandler = onBarcodeScanned;
    return null;
  },
  useCameraPermissions: () => [mockPermission, jest.fn()],
}));
jest.mock('expo-router', () => ({ router: { back: (...args: unknown[]) => mockRouterBack(...args) } }));
jest.mock('./PantryContext', () => ({ usePantry: () => ({ addItem: mockAddItem }) }));
jest.mock('@/features/recipes/useIngredientCatalog', () => ({
  useIngredientCatalog: () => ({ items: mockCatalog, status: 'ready' }),
}));
jest.mock('@/features/barcode/api/openFoodFactsClient', () => ({
  openFoodFactsProvider: { getByBarcode: jest.fn() },
}));
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { ScrollView, TextInput, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockBottomSheet({ children, index, onChange, onAnimate, ref, ...props }: { children: React.ReactNode; index: number; onChange?: (index: number) => void; onAnimate?: (fromIndex: number, toIndex: number) => void; ref?: React.Ref<unknown>; keyboardBehavior?: string; keyboardBlurBehavior?: string; android_keyboardInputMode?: string }) {
      mockSheetProps = props;
      React.useImperativeHandle(ref, () => ({
        snapToIndex: (index: number) => {
          onAnimate?.(mockSheetIndex, index);
          mockSheetIndex = index;
          onChange?.(index);
        },
      }));
      return (
        <View
          testID="scan-entry-sheet"
          accessibilityValue={{ now: index }}
          onAccessibilityAction={(event: NativeSyntheticEvent<{ actionName: string }>) => {
            const nextIndex = event.nativeEvent.actionName === 'collapse' ? 0 : 1;
            onAnimate?.(mockSheetIndex, nextIndex);
            mockSheetIndex = nextIndex;
            onChange?.(nextIndex);
          }}
        >
          {children}
        </View>
      );
    },
    BottomSheetScrollView: React.forwardRef(function MockSheetScrollView({ children, ...props }: { children: React.ReactNode }, ref: React.Ref<unknown>) {
      mockScrollProps = props;
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return <ScrollView {...props}>{children}</ScrollView>;
    }),
    BottomSheetTextInput: TextInput,
    useBottomSheetTimingConfigs: (config: unknown) => config,
  };
});

describe('BarcodeScannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSheetIndex = 0;
    mockPermission = { granted: true, canAskAgain: true };
    mockCatalog = [{ provider: 'themealdb', id: '2', name: 'Milk' }];
    mockSheetProps = {};
    mockScrollProps = {};
  });

  it('expands and saves the package name with its suggested English ingredient', async () => {
    jest.mocked(openFoodFactsProvider.getByBarcode).mockResolvedValue({
      barcode: '123', name: 'Mjölk', brand: null, imageUrl: null,
      recipeIngredientCandidates: ['milk'], provider: 'openfoodfacts',
    });
    const screen = await render(<BarcodeScannerScreen />);

    await act(async () => { await mockScanHandler?.({ data: '123' }); });

    expect(mockSheetIndex).toBe(1);
    expect(screen.getByLabelText('Food name').props.value).toBe('Mjölk');
    expect(screen.getByLabelText('Choose a recipe ingredient').props.value).toBe('Milk');
    expect(screen.getByLabelText('Quantity (units)').props.value).toBe('1');
    await fireEvent.changeText(screen.getByLabelText('Quantity (units)'), '4');
    await fireEvent.press(screen.getByRole('button', { name: 'Increase quantity' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Decrease quantity' }));
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockAddItem).toHaveBeenCalledWith({
      name: 'Mjölk', expirationDate: '2999-10-15',
      quantity: 4,
      recipeIngredient: { provider: 'themealdb', id: '2', name: 'Milk' },
    });
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('allows the suggested ingredient to be removed without changing the package name', async () => {
    jest.mocked(openFoodFactsProvider.getByBarcode).mockResolvedValue({
      barcode: '123', name: 'Mellanmjölk', brand: null, imageUrl: null,
      recipeIngredientCandidates: ['milk'], provider: 'openfoodfacts',
    });
    const screen = await render(<BarcodeScannerScreen />);
    await act(async () => { await mockScanHandler?.({ data: '123' }); });

    await fireEvent.press(screen.getByRole('button', { name: 'Remove recipe ingredient' }));
    expect(screen.getByLabelText('Choose a recipe ingredient').props.value).toBe('');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockAddItem).toHaveBeenCalledWith({
      name: 'Mellanmjölk', expirationDate: '2999-10-15', recipeIngredient: null, quantity: 1,
    });
  });

  it('lets the user replace the suggested ingredient without changing the package name', async () => {
    mockCatalog = [
      { provider: 'themealdb', id: '2', name: 'Milk' },
      { provider: 'themealdb', id: '3', name: 'Chicken' },
    ];
    jest.mocked(openFoodFactsProvider.getByBarcode).mockResolvedValue({
      barcode: '123', name: 'Ready meal', brand: null, imageUrl: null,
      recipeIngredientCandidates: ['milk'], provider: 'openfoodfacts',
    });
    const screen = await render(<BarcodeScannerScreen />);
    await act(async () => { await mockScanHandler?.({ data: '123' }); });

    await fireEvent.changeText(screen.getByLabelText('Choose a recipe ingredient'), 'chick');
    await fireEvent.press(screen.getByRole('button', { name: 'Recipe ingredient: Chicken' }));
    expect(screen.getByLabelText('Food name').props.value).toBe('Ready meal');
    await fireEvent.changeText(screen.getByLabelText('Expiration date'), '2999-10-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockAddItem).toHaveBeenCalledWith({
      name: 'Ready meal', expirationDate: '2999-10-15',
      quantity: 1,
      recipeIngredient: { provider: 'themealdb', id: '3', name: 'Chicken' },
    });
  });

  it('does not replace a manual draft when an earlier lookup finishes', async () => {
    let resolveLookup!: (product: Awaited<ReturnType<typeof openFoodFactsProvider.getByBarcode>>) => void;
    jest.mocked(openFoodFactsProvider.getByBarcode).mockReturnValue(new Promise((resolve) => {
      resolveLookup = resolve;
    }));
    const screen = await render(<BarcodeScannerScreen />);
    let pendingScan: Promise<void> | void;
    await act(async () => {
      pendingScan = mockScanHandler?.({ data: '123' });
      await Promise.resolve();
    });

    await fireEvent(screen.getByTestId('scan-entry-sheet'), 'accessibilityAction', {
      nativeEvent: { actionName: 'expand' },
    });
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'Bread');
    await act(async () => {
      resolveLookup({
        barcode: '123', name: 'Milk', brand: null, imageUrl: null,
        recipeIngredientCandidates: ['milk'], provider: 'openfoodfacts',
      });
      await pendingScan;
    });

    expect(screen.getByLabelText('Food name').props.value).toBe('Bread');
  });

  it('keeps manual entry available when a barcode is unknown', async () => {
    jest.mocked(openFoodFactsProvider.getByBarcode).mockResolvedValue(null);
    const screen = await render(<BarcodeScannerScreen />);
    await act(async () => { await mockScanHandler?.({ data: '404' }); });

    expect(mockSheetIndex).toBe(1);
    expect(screen.getByText("We couldn't find this product. Slide down to scan another barcode or enter it manually.")).toBeTruthy();
    expect(screen.getByLabelText('Food name').props.value).toBe('');
  });

  it('resumes scanning when the sheet moves down and pauses when it moves up', async () => {
    jest.mocked(openFoodFactsProvider.getByBarcode).mockResolvedValue({
      barcode: '123', name: 'Milk carton', brand: null, imageUrl: null,
      recipeIngredientCandidates: ['milk'], provider: 'openfoodfacts',
    });
    const screen = await render(<BarcodeScannerScreen />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    await act(async () => { await mockScanHandler?.({ data: '123' }); });

    expect(mockScanHandler).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Scan again' })).toBeNull();
    await fireEvent(screen.getByTestId('scan-entry-sheet'), 'accessibilityAction', {
      nativeEvent: { actionName: 'collapse' },
    });

    expect(mockScanHandler).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.getByLabelText('Food name').props.value).toBe('Milk carton');
    await fireEvent(screen.getByTestId('scan-entry-sheet'), 'accessibilityAction', {
      nativeEvent: { actionName: 'expand' },
    });
    expect(mockScanHandler).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('opens the manual form when camera permission is denied', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    const screen = await render(<BarcodeScannerScreen />);

    expect(screen.getByTestId('scan-entry-sheet').props.accessibilityValue.now).toBe(1);
    expect(screen.getByLabelText('Food name')).toBeTruthy();
    expect(screen.getByText('Camera access is needed to scan barcodes.')).toBeTruthy();
  });

  it('expands the entry sheet and pauses scanning before showing ingredient help', async () => {
    const screen = await render(<BarcodeScannerScreen />);

    expect(mockSheetIndex).toBe(0);
    expect(mockScanHandler).toBeDefined();

    await fireEvent.press(screen.getByRole('button', { name: 'About recipe ingredients' }));

    expect(mockSheetIndex).toBe(1);
    expect(mockScanHandler).toBeUndefined();
    expect(screen.getByText(
      'This optional link helps match your food to recipes. Choose the closest ingredient in English; it does not change the food name. You can save without one.',
    )).toBeTruthy();
  });

  it('expands and scrolls to recipe suggestions when the keyboard field is focused', async () => {
    const screen = await render(<BarcodeScannerScreen />);
    expect(mockSheetProps).toMatchObject({
      keyboardBehavior: 'fillParent',
      keyboardBlurBehavior: 'restore',
      android_keyboardInputMode: 'adjustResize',
      enableContentPanningGesture: false,
      animationConfigs: { duration: 420 },
      snapPoints: ['50%', '100%'],
    });
    expect(mockScrollProps).toMatchObject({ keyboardDismissMode: 'none', keyboardShouldPersistTaps: 'always' });

    await fireEvent(screen.getByTestId('pantry-item-form'), 'layout', { nativeEvent: { layout: { y: 120 } } });
    await fireEvent(screen.getByTestId('recipe-ingredient-section'), 'layout', { nativeEvent: { layout: { y: 90 } } });
    await fireEvent(screen.getByLabelText('Choose a recipe ingredient'), 'focus');
    expect(mockSheetIndex).toBe(1);
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 194, animated: true });

    mockScrollTo.mockClear();
    await fireEvent.changeText(screen.getByLabelText('Choose a recipe ingredient'), 'mi');
    await fireEvent(screen.getByTestId('recipe-ingredient-section'), 'layout', { nativeEvent: { layout: { y: 90 } } });
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 194, animated: true });
  });

  it('keeps every recipe match selectable while the keyboard stays open', async () => {
    mockCatalog = [
      { provider: 'themealdb', id: '1', name: 'Milk' },
      { provider: 'themealdb', id: '2', name: 'Milk Chocolate' },
      { provider: 'themealdb', id: '3', name: 'Milk Powder' },
      { provider: 'themealdb', id: '4', name: 'Milkshake' },
      { provider: 'themealdb', id: '5', name: 'Milk Substitute' },
    ];
    const screen = await render(<BarcodeScannerScreen />);
    await fireEvent.changeText(screen.getByLabelText('Food name'), 'My carton');
    await fireEvent(screen.getByLabelText('Choose a recipe ingredient'), 'focus');
    await fireEvent.changeText(screen.getByLabelText('Choose a recipe ingredient'), 'milk');

    expect(screen.getAllByRole('button', { name: /^Recipe ingredient: Milk/ })).toHaveLength(5);
    await fireEvent.press(screen.getByRole('button', { name: 'Recipe ingredient: Milk Substitute' }));
    expect(screen.getByLabelText('Food name').props.value).toBe('My carton');
    expect(screen.getByText('Recipe ingredient: Milk Substitute')).toBeTruthy();
  });
});
