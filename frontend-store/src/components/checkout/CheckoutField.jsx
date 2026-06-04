export function CheckoutField({ error, label, registration, children, ...inputProps }) {
  return (
    <label className="checkout-field">
      <span>{label}</span>
      {children || <input className="text-input" {...registration} {...inputProps} />}
      {error ? <small>{error.message}</small> : null}
    </label>
  );
}
