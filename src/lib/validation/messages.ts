export type ValidationMessages = {
  requiredField: (fieldName: string) => string;
  emailRequired: string;
  emailInvalid: string;
  phoneInvalid: string;
  urlInvalid: string;
  passwordRequired: string;
  passwordMinLength: string;
  passwordsMismatch: string;
  startDateRequired: string;
  endDateRequired: string;
  storeTypeMaxWords: string;
  contactEmailInvalid: string;
  productNameRequired: string;
  productPriceRequired: string;
  productCategoryRequired: string;
  productStockRequired: string;
  extraFieldRequired: string;
  extraFieldsIncomplete: string;
  extraFieldsDuplicateName: string;
};

export const defaultValidationMessages: ValidationMessages = {
  requiredField: (fieldName: string) => `${fieldName} is required.`,
  emailRequired: "Email is required.",
  emailInvalid: "Please enter a valid email address.",
  phoneInvalid: "Phone number must start with 01 and be exactly 11 digits.",
  urlInvalid: "Please enter a valid URL.",
  passwordRequired: "Password is required.",
  passwordMinLength: "Password must be at least 8 characters.",
  passwordsMismatch: "Passwords do not match.",
  startDateRequired: "Start date is required.",
  endDateRequired: "End date is required.",
  storeTypeMaxWords: "Store type must be at most 4 words.",
  contactEmailInvalid: "Please enter a valid contact email.",
  productNameRequired: "Product name is required.",
  productPriceRequired: "Price is required.",
  productCategoryRequired: "Category is required.",
  productStockRequired: "Stock is required.",
  extraFieldRequired: "This field is required.",
  extraFieldsIncomplete: "Complete all fields (add a name) before saving.",
  extraFieldsDuplicateName: "Field names must be unique within each entity type.",
};
