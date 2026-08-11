import { useState, useEffect } from 'react';
import { fetchCategories, createAsset } from '../api';
import { colors } from '../theme';

export default function CreateAsset({ onBack, onCreated }) {
  const [categories, setCategories] = useState([]);
  const [assetCode, setAssetCode] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [datePurchased, setDatePurchased] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [condition, setCondition] = useState('Good');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setCategoryId(String(cats[0].id));
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!assetCode.trim() || !description.trim()) {
      setError('Asset code and description are required.');
      return;
    }
    setLoading(true);
    try {
      await createAsset({
        asset_code: assetCode.trim(),
        description: description.trim(),
        asset_category_id: categoryId ? parseInt(categoryId, 10) : null,
        serial_number: serialNumber || null,
        date_of_purchase: datePurchased || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        supplier: supplier || null,
        condition,
      });
      onCreated(assetCode.trim());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create asset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, maxWidth: 550, margin: '0 auto' }}>
      <button onClick={onBack} style={backButtonStyle}>← Back</button>
      <h1 style={{ color: colors.ink }}>Add New Asset</h1>
      {error && <p style={{ color: colors.danger }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input style={inputStyle} placeholder="Asset Code * (e.g. KDT003000)" value={assetCode} onChange={(e) => setAssetCode(e.target.value)} />
        <input style={inputStyle} placeholder="Description *" value={description} onChange={(e) => setDescription(e.target.value)} />

        <select style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input style={inputStyle} placeholder="Serial Number" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />

        <label style={labelStyle}>Purchase Date</label>
        <input style={inputStyle} type="date" value={datePurchased} onChange={(e) => setDatePurchased(e.target.value)} />

        <input style={inputStyle} placeholder="Purchase Price" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
        <input style={inputStyle} placeholder="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />

        <select style={inputStyle} value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
          <option value="Faulty">Faulty</option>
        </select>

        <button type="submit" style={submitStyle} disabled={loading}>
          {loading ? 'Creating...' : 'Create Asset'}
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, color: colors.grayText, marginBottom: 4 };
const inputStyle = { display: 'block', width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid ' + colors.border, boxSizing: 'border-box' };
const submitStyle = { padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' };
const backButtonStyle = { marginBottom: 20, padding: '8px 16px', background: colors.gray, border: 'none', borderRadius: 6, cursor: 'pointer' };