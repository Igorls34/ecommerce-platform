export function QuantitySelector({ value, onDecrease, onIncrease, onChange, min = 1 }) {
  return (
    <div className="quantity-selector">
      <button
        type="button"
        className="quantity-button quantity-selector__button"
        onClick={onDecrease}
      >
        -
      </button>
      <input
        type="number"
        min={min}
        value={value}
        onChange={onChange}
        className="quantity-input quantity-selector__input"
      />
      <button
        type="button"
        className="quantity-button quantity-selector__button"
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  );
}
