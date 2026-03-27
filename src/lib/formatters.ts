export function formatCurrencyAmount(
  amount: number | null | undefined,
  currency = "USD",
  locale = "en-US"
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "";
  }

  const normalizedCurrency = currency.trim().toUpperCase();

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${normalizedCurrency}`;
  }
}

