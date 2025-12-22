import React, { useState } from 'react';
import { useMenu } from '../hooks/useMenu';
import { MenuItem, MenuItemModifier, MenuItemVariant } from '../types';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Select } from '../../../shared/components/ui/Select';
import { Badge } from '../../../shared/components/ui/Badge';
import { useAuth } from '../../auth/hooks/useAuth';
import { formatCurrency } from '../../../shared/lib/utils';
import { KitchenStation } from '../../../shared/types';

const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const normalizeVariants = (variants?: MenuItemVariant[]): MenuItemVariant[] =>
  Array.isArray(variants) ? variants : [];

const normalizeModifiers = (modifiers?: MenuItemModifier[]): MenuItemModifier[] =>
  Array.isArray(modifiers) ? modifiers : [];

const parseAllergens = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const formatAllergens = (allergens?: string[]): string =>
  (Array.isArray(allergens) ? allergens : []).join(', ');

const VariantsEditor: React.FC<{
  variants: MenuItemVariant[];
  currency: string;
  t: (key: string, defaultValue?: string) => string;
  onChange: (next: MenuItemVariant[]) => void;
}> = ({ variants, currency, t, onChange }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-secondary">{t('admin.menu.variants')}</p>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('admin.menu.variantName')}
        />
        <Input
          type="number"
          value={price || ''}
          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
          placeholder={t('admin.menu.variantPrice')}
        />
        <Button
          onClick={() => {
            if (!name.trim()) return;
            onChange([...variants, { id: makeId('variant'), name: name.trim(), price }]);
            setName('');
            setPrice(0);
          }}
          variant="secondary"
        >
          {t('admin.menu.addVariant')}
        </Button>
      </div>
      {variants.length > 0 && (
        <div className="space-y-1">
          {variants.map((v) => (
            <div key={v.id} className="bg-gray-100 p-2 rounded-lg space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t('admin.menu.variantName')}
                  </label>
                  <Input
                    value={v.name}
                    onChange={(e) =>
                      onChange(
                        variants.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t('admin.menu.variantPrice')}
                  </label>
                  <Input
                    type="number"
                    value={Number.isFinite(v.price) ? v.price : 0}
                    onChange={(e) => {
                      const nextPrice = parseFloat(e.target.value) || 0;
                      onChange(
                        variants.map((x) => (x.id === v.id ? { ...x, price: nextPrice } : x)),
                      );
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                {t('general.price')}: {formatCurrency(v.price, currency)}
              </p>
              <button
                type="button"
                className="text-xs text-red-600 hover:text-red-800"
                onClick={() => onChange(variants.filter((x) => x.id !== v.id))}
              >
                {t('general.delete', 'Delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ModifiersEditor: React.FC<{
  modifiers: MenuItemModifier[];
  currency: string;
  t: (key: string, defaultValue?: string) => string;
  onChange: (next: MenuItemModifier[]) => void;
}> = ({ modifiers, currency, t, onChange }) => {
  const [modifierName, setModifierName] = useState('');

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-secondary">{t('admin.menu.modifiers')}</p>
      <div className="flex gap-2">
        <Input
          value={modifierName}
          onChange={(e) => setModifierName(e.target.value)}
          placeholder={t('admin.menu.modifierName')}
        />
        <Button
          onClick={() => {
            if (!modifierName.trim()) return;
            onChange([
              ...modifiers,
              { id: makeId('modifier'), name: modifierName.trim(), options: [] },
            ]);
            setModifierName('');
          }}
          variant="secondary"
        >
          {t('admin.menu.addModifier')}
        </Button>
      </div>

      {modifiers.length > 0 && (
        <div className="space-y-3">
          {modifiers.map((m) => (
            <div key={m.id} className="bg-gray-100 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t('admin.menu.modifierName')}
                  </label>
                  <Input
                    value={m.name}
                    onChange={(e) =>
                      onChange(
                        modifiers.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:text-red-800"
                  onClick={() => onChange(modifiers.filter((x) => x.id !== m.id))}
                >
                  {t('general.delete', 'Delete')}
                </button>
              </div>

              <ModifierOptionsEditor
                modifier={m}
                currency={currency}
                t={t}
                onChange={(nextModifier) =>
                  onChange(modifiers.map((x) => (x.id === m.id ? nextModifier : x)))
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ModifierOptionsEditor: React.FC<{
  modifier: MenuItemModifier;
  currency: string;
  t: (key: string, defaultValue?: string) => string;
  onChange: (next: MenuItemModifier) => void;
}> = ({ modifier, currency, t, onChange }) => {
  const [optionName, setOptionName] = useState('');
  const [priceDelta, setPriceDelta] = useState<number>(0);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={optionName}
          onChange={(e) => setOptionName(e.target.value)}
          placeholder={t('admin.menu.optionName')}
        />
        <Input
          type="number"
          value={priceDelta || ''}
          onChange={(e) => setPriceDelta(parseFloat(e.target.value) || 0)}
          placeholder={t('admin.menu.optionPriceDelta')}
        />
        <Button
          onClick={() => {
            if (!optionName.trim()) return;
            onChange({
              ...modifier,
              options: [
                ...modifier.options,
                { id: makeId('option'), name: optionName.trim(), priceDelta },
              ],
            });
            setOptionName('');
            setPriceDelta(0);
          }}
          variant="secondary"
        >
          {t('admin.menu.addOption')}
        </Button>
      </div>

      {modifier.options.length > 0 && (
        <div className="space-y-1">
          {modifier.options.map((opt) => (
            <div key={opt.id} className="bg-light-bg p-2 rounded-lg space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t('admin.menu.optionName')}
                  </label>
                  <Input
                    value={opt.name}
                    onChange={(e) =>
                      onChange({
                        ...modifier,
                        options: modifier.options.map((x) =>
                          x.id === opt.id ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t('admin.menu.optionPriceDelta')}
                  </label>
                  <Input
                    type="number"
                    value={Number.isFinite(opt.priceDelta) ? opt.priceDelta : 0}
                    onChange={(e) => {
                      const nextDelta = parseFloat(e.target.value) || 0;
                      onChange({
                        ...modifier,
                        options: modifier.options.map((x) =>
                          x.id === opt.id ? { ...x, priceDelta: nextDelta } : x,
                        ),
                      });
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                +{formatCurrency(opt.priceDelta, currency)}
              </p>
              <button
                type="button"
                className="text-xs text-red-600 hover:text-red-800"
                onClick={() =>
                  onChange({
                    ...modifier,
                    options: modifier.options.filter((x) => x.id !== opt.id),
                  })
                }
              >
                {t('general.delete', 'Delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MenuManagement: React.FC = () => {
  const { menuCategories, menuItems, addCategory, addMenuItem, updateMenuItem } = useMenu();
  const { t } = useLanguage();
  const { authState } = useAuth();
  const currency = authState?.tenant?.currency || 'USD';
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newMenuItem, setNewMenuItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    isAvailable: true,
    bundleItemIds: undefined,
    station: KitchenStation.HOT,
    variants: [],
    modifiers: [],
    allergens: [],
  });

  const [newAllergensText, setNewAllergensText] = useState('');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MenuItem | null>(null);

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await addCategory(newCategoryName);
      setNewCategoryName('');
    }
  };

  const handleAddMenuItem = async () => {
    const variants = normalizeVariants(newMenuItem.variants);
    if (
      newMenuItem.name &&
      newMenuItem.name.trim() &&
      newMenuItem.categoryId &&
      ((newMenuItem.price ?? 0) > 0 || variants.length > 0)
    ) {
      const normalizedPrice =
        (newMenuItem.price ?? 0) > 0
          ? (newMenuItem.price as number)
          : variants.length > 0
            ? variants[0].price
            : 0;
      await addMenuItem({
        ...(newMenuItem as Omit<MenuItem, 'id' | 'tenantId'>),
        price: normalizedPrice,
        variants,
        modifiers: normalizeModifiers(newMenuItem.modifiers),
        allergens: parseAllergens(newAllergensText),
      });
      setNewMenuItem({
        name: '',
        description: '',
        price: 0,
        categoryId: '',
        isAvailable: true,
        bundleItemIds: undefined,
        station: KitchenStation.HOT,
        variants: [],
        modifiers: [],
        allergens: [],
      });
      setNewAllergensText('');
    }
  };

  const handleAvailabilityToggle = async (item: MenuItem) => {
    await updateMenuItem({ ...item, isAvailable: !item.isAvailable });
  };

  const startEdit = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditDraft({
      ...item,
      variants: normalizeVariants(item.variants),
      modifiers: normalizeModifiers(item.modifiers),
    });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    const variants = normalizeVariants(editDraft.variants);
    const normalizedPrice =
      (editDraft.price ?? 0) > 0 ? editDraft.price : variants.length > 0 ? variants[0].price : 0;
    await updateMenuItem({
      ...editDraft,
      price: normalizedPrice,
      variants,
      modifiers: normalizeModifiers(editDraft.modifiers),
      allergens: Array.isArray(editDraft.allergens) ? editDraft.allergens : [],
    });
    cancelEdit();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('general.category', 'Categories')}</h3>
        <div className="space-y-4 bg-light-bg p-4 rounded-xl">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('admin.menu.categoryName')}
            </label>
            <Input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t('admin.menu.categoryName')}
            />
          </div>
          <Button onClick={handleAddCategory} className="w-full py-2">
            {t('admin.menu.addCategory')}
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {menuCategories.map((cat) => (
            <li key={cat.id} className="bg-gray-100 p-3 rounded-lg text-sm">
              {cat.name}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">{t('admin.menu.itemName', 'Menu Items')}</h3>
        <div className="space-y-4 bg-light-bg p-4 rounded-xl">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('admin.menu.itemName')}
            </label>
            <Input
              value={newMenuItem.name || ''}
              onChange={(e) => setNewMenuItem((p) => ({ ...p, name: e.target.value }))}
              placeholder={t('admin.menu.itemName')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('general.description')}
            </label>
            <Input
              value={newMenuItem.description || ''}
              onChange={(e) => setNewMenuItem((p) => ({ ...p, description: e.target.value }))}
              placeholder={t('general.description')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('general.price')}
            </label>
            <Input
              type="number"
              value={newMenuItem.price || ''}
              onChange={(e) =>
                setNewMenuItem((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))
              }
              placeholder={t('general.price')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('general.category')}
            </label>
            <Select
              value={newMenuItem.categoryId || ''}
              onChange={(e) => setNewMenuItem((p) => ({ ...p, categoryId: e.target.value }))}
            >
              <option value="">{t('general.category')}</option>
              {menuCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('general.station')}
            </label>
            <Select
              value={newMenuItem.station || KitchenStation.HOT}
              onChange={(e) =>
                setNewMenuItem((p) => ({ ...p, station: e.target.value as KitchenStation }))
              }
            >
              <option value={KitchenStation.BAR}>{t('kitchen.stations.bar')}</option>
              <option value={KitchenStation.HOT}>{t('kitchen.stations.hot')}</option>
              <option value={KitchenStation.COLD}>{t('kitchen.stations.cold')}</option>
              <option value={KitchenStation.DESSERT}>{t('kitchen.stations.dessert')}</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('general.allergens')}
            </label>
            <Input
              value={newAllergensText}
              onChange={(e) => setNewAllergensText(e.target.value)}
              placeholder={t('general.allergensPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={newMenuItem.bundleItemIds !== undefined}
                onChange={(e) =>
                  setNewMenuItem((p) => ({
                    ...p,
                    bundleItemIds: e.target.checked ? [] : undefined,
                  }))
                }
              />
              {t('admin.menu.bundle')}
            </label>
            {newMenuItem.bundleItemIds !== undefined && (
              <div className="bg-gray-100 p-3 rounded-lg space-y-2">
                <p className="text-sm font-medium text-text-secondary">
                  {t('admin.menu.bundleItems')}
                </p>
                <div className="max-h-40 overflow-auto space-y-1">
                  {menuItems
                    .filter((mi) => mi.bundleItemIds === undefined)
                    .map((mi) => {
                      const checked = (newMenuItem.bundleItemIds ?? []).includes(mi.id);
                      return (
                        <label key={mi.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextChecked = e.target.checked;
                              setNewMenuItem((p) => {
                                const current = Array.isArray(p.bundleItemIds)
                                  ? p.bundleItemIds
                                  : [];
                                const next = nextChecked
                                  ? Array.from(new Set([...current, mi.id]))
                                  : current.filter((id) => id !== mi.id);
                                return { ...p, bundleItemIds: next };
                              });
                            }}
                          />
                          <span className="text-text-primary">{mi.name}</span>
                          <span className="text-xs text-text-secondary">
                            ({formatCurrency(mi.price, currency)})
                          </span>
                        </label>
                      );
                    })}
                </div>
                {(newMenuItem.bundleItemIds ?? []).length === 0 && (
                  <p className="text-xs text-text-secondary">{t('admin.menu.bundleSelectHint')}</p>
                )}
              </div>
            )}
          </div>

          <VariantsEditor
            variants={normalizeVariants(newMenuItem.variants)}
            currency={currency}
            t={t}
            onChange={(next) => setNewMenuItem((p) => ({ ...p, variants: next }))}
          />
          <ModifiersEditor
            modifiers={normalizeModifiers(newMenuItem.modifiers)}
            currency={currency}
            t={t}
            onChange={(next) => setNewMenuItem((p) => ({ ...p, modifiers: next }))}
          />

          <Button onClick={handleAddMenuItem} className="w-full py-2">
            {t('admin.menu.addItem')}
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {menuItems.map((item) => (
            <li key={item.id} className="bg-gray-100 p-3 rounded-lg text-sm">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-text-secondary text-xs">
                    {item.description} - {formatCurrency(item.price, currency)}
                  </p>
                  {item.bundleItemIds !== undefined && (
                    <p className="text-text-secondary text-xs">
                      <span className="font-medium">{t('general.bundle')}</span>
                      {Array.isArray(item.bundleItemIds) && item.bundleItemIds.length > 0
                        ? ` • ${item.bundleItemIds
                            .map((id) => menuItems.find((mi) => mi.id === id)?.name)
                            .filter(Boolean)
                            .join(', ')}`
                        : ''}
                    </p>
                  )}
                  {item.station && (
                    <p className="text-text-secondary text-xs">
                      {t('general.station')}: {t(`kitchen.stations.${item.station.toLowerCase()}`)}
                    </p>
                  )}
                  {(item.variants?.length || item.modifiers?.length) && (
                    <p className="text-text-secondary text-xs">
                      {(item.variants?.length || 0) > 0
                        ? `${item.variants?.length} ${t('admin.menu.variants')}`
                        : null}
                      {(item.variants?.length || 0) > 0 && (item.modifiers?.length || 0) > 0
                        ? ' • '
                        : null}
                      {(item.modifiers?.length || 0) > 0
                        ? `${item.modifiers?.length} ${t('admin.menu.modifiers')}`
                        : null}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => (editingItemId === item.id ? cancelEdit() : startEdit(item))}
                    variant="secondary"
                  >
                    {editingItemId === item.id ? t('general.cancel') : t('general.edit')}
                  </Button>
                  <button onClick={() => handleAvailabilityToggle(item)}>
                    <Badge variant={item.isAvailable ? 'green' : 'red'}>
                      {item.isAvailable ? t('general.available') : t('general.unavailable')}
                    </Badge>
                  </button>
                </div>
              </div>

              {editingItemId === item.id && editDraft && (
                <div className="mt-3 bg-light-bg p-3 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        {t('admin.menu.itemName')}
                      </label>
                      <Input
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft((p) => (p ? { ...p, name: e.target.value } : p))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        {t('general.price')}
                      </label>
                      <Input
                        type="number"
                        value={editDraft.price || ''}
                        onChange={(e) =>
                          setEditDraft((p) =>
                            p ? { ...p, price: parseFloat(e.target.value) || 0 } : p,
                          )
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        {t('general.description')}
                      </label>
                      <Input
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft((p) => (p ? { ...p, description: e.target.value } : p))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        {t('general.category')}
                      </label>
                      <Select
                        value={editDraft.categoryId}
                        onChange={(e) =>
                          setEditDraft((p) => (p ? { ...p, categoryId: e.target.value } : p))
                        }
                      >
                        {menuCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        {t('general.station')}
                      </label>
                      <Select
                        value={editDraft.station || KitchenStation.HOT}
                        onChange={(e) =>
                          setEditDraft((p) =>
                            p ? { ...p, station: e.target.value as KitchenStation } : p,
                          )
                        }
                      >
                        <option value={KitchenStation.BAR}>{t('kitchen.stations.bar')}</option>
                        <option value={KitchenStation.HOT}>{t('kitchen.stations.hot')}</option>
                        <option value={KitchenStation.COLD}>{t('kitchen.stations.cold')}</option>
                        <option value={KitchenStation.DESSERT}>
                          {t('kitchen.stations.dessert')}
                        </option>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        {t('general.allergens')}
                      </label>
                      <Input
                        value={formatAllergens(editDraft.allergens)}
                        onChange={(e) =>
                          setEditDraft((p) =>
                            p ? { ...p, allergens: parseAllergens(e.target.value) } : p,
                          )
                        }
                        placeholder={t('general.allergensPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                      <input
                        type="checkbox"
                        checked={editDraft.bundleItemIds !== undefined}
                        onChange={(e) =>
                          setEditDraft((p) =>
                            p ? { ...p, bundleItemIds: e.target.checked ? [] : undefined } : p,
                          )
                        }
                      />
                      {t('admin.menu.bundle')}
                    </label>
                    {editDraft.bundleItemIds !== undefined && (
                      <div className="bg-gray-100 p-3 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-text-secondary">
                          {t('admin.menu.bundleItems')}
                        </p>
                        <div className="max-h-40 overflow-auto space-y-1">
                          {menuItems
                            .filter(
                              (mi) => mi.id !== editDraft.id && mi.bundleItemIds === undefined,
                            )
                            .map((mi) => {
                              const checked = (editDraft.bundleItemIds ?? []).includes(mi.id);
                              return (
                                <label key={mi.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const nextChecked = e.target.checked;
                                      setEditDraft((p) => {
                                        if (!p) return p;
                                        const current = Array.isArray(p.bundleItemIds)
                                          ? p.bundleItemIds
                                          : [];
                                        const next = nextChecked
                                          ? Array.from(new Set([...current, mi.id]))
                                          : current.filter((id) => id !== mi.id);
                                        return { ...p, bundleItemIds: next };
                                      });
                                    }}
                                  />
                                  <span className="text-text-primary">{mi.name}</span>
                                  <span className="text-xs text-text-secondary">
                                    ({formatCurrency(mi.price, currency)})
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                        {(editDraft.bundleItemIds ?? []).length === 0 && (
                          <p className="text-xs text-text-secondary">
                            {t('admin.menu.bundleSelectHint')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <VariantsEditor
                    variants={normalizeVariants(editDraft.variants)}
                    currency={currency}
                    t={t}
                    onChange={(next) => setEditDraft((p) => (p ? { ...p, variants: next } : p))}
                  />
                  <ModifiersEditor
                    modifiers={normalizeModifiers(editDraft.modifiers)}
                    currency={currency}
                    t={t}
                    onChange={(next) => setEditDraft((p) => (p ? { ...p, modifiers: next } : p))}
                  />

                  <div className="flex gap-2">
                    <Button onClick={saveEdit} className="py-2">
                      {t('general.save')}
                    </Button>
                    <Button onClick={cancelEdit} variant="secondary" className="py-2">
                      {t('general.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MenuManagement;
