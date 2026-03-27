export interface PhoneCountryCode {
  country: string;
  iso2: string;
  dialCode: string;
  label: string;
}

export const phoneCountryCodes: PhoneCountryCode[] = [
  { country: "United States", iso2: "US", dialCode: "+1", label: "United States (+1)" },
  { country: "Canada", iso2: "CA", dialCode: "+1", label: "Canada (+1)" },
  { country: "United Kingdom", iso2: "GB", dialCode: "+44", label: "United Kingdom (+44)" },
  { country: "China", iso2: "CN", dialCode: "+86", label: "China (+86)" },
  { country: "Nigeria", iso2: "NG", dialCode: "+234", label: "Nigeria (+234)" },
  { country: "Kenya", iso2: "KE", dialCode: "+254", label: "Kenya (+254)" },
  { country: "South Africa", iso2: "ZA", dialCode: "+27", label: "South Africa (+27)" },
  { country: "France", iso2: "FR", dialCode: "+33", label: "France (+33)" },
  { country: "Germany", iso2: "DE", dialCode: "+49", label: "Germany (+49)" },
  { country: "India", iso2: "IN", dialCode: "+91", label: "India (+91)" },
  { country: "Australia", iso2: "AU", dialCode: "+61", label: "Australia (+61)" },
  { country: "Brazil", iso2: "BR", dialCode: "+55", label: "Brazil (+55)" },
  { country: "Mexico", iso2: "MX", dialCode: "+52", label: "Mexico (+52)" },
  { country: "Japan", iso2: "JP", dialCode: "+81", label: "Japan (+81)" },
  { country: "South Korea", iso2: "KR", dialCode: "+82", label: "South Korea (+82)" },
  { country: "United Arab Emirates", iso2: "AE", dialCode: "+971", label: "United Arab Emirates (+971)" },
  { country: "Saudi Arabia", iso2: "SA", dialCode: "+966", label: "Saudi Arabia (+966)" },
  { country: "Egypt", iso2: "EG", dialCode: "+20", label: "Egypt (+20)" }
];

export const phoneCountryCodeByIso = new Map<string, PhoneCountryCode>(
  phoneCountryCodes.map((entry) => [entry.iso2, entry] as const)
);

export function findPhoneCountryCodeByIso(iso2: string): PhoneCountryCode | undefined {
  return phoneCountryCodeByIso.get(iso2.trim().toUpperCase());
}

