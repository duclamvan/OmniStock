/**
 * GLS Shipping Helper Utilities
 * Provides country mapping, payload formatting, and copy-to-clipboard functionality
 */

// Country mappings for GLS (German labels required)
export const GLS_COUNTRY_MAP: Record<string, string> = {
  'Germany': 'Deutschland',
  'Belgium': 'Belgien',
  'Netherlands': 'Niederlande',
  'Austria': 'Österreich',
  'France': 'Frankreich',
  'Czech Republic': 'Tschechien',
  'Denmark': 'Dänemark',
  'Poland': 'Polen',
  'Switzerland': 'Schweiz',
  'Italy': 'Italien',
  'Spain': 'Spanien',
  'Sweden': 'Schweden',
  'Norway': 'Norwegen',
  'Finland': 'Finnland',
  'Portugal': 'Portugal',
  'Luxembourg': 'Luxemburg',
  'Ireland': 'Irland',
  'Slovakia': 'Slowakei',
  'Slovenia': 'Slowenien',
  'Croatia': 'Kroatien',
  'Hungary': 'Ungarn',
  'Romania': 'Rumänien',
  'Bulgaria': 'Bulgarien',
  'Greece': 'Griechenland'
};

export interface GLSRecipientData {
  name: string;
  company?: string;
  street: string;
  houseNumber?: string;
  postalCode: string;
  city: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface GLSCopyOptions {
  recipientData: GLSRecipientData;
  packageSize?: string; // XS, S, M, L, XL
  weight?: number;
}

/**
 * Format GLS shipping data as tab-separated values for easy pasting
 * Order matches GLS form fields: First Name, Last Name, Company, Street, House Number, 
 * Postal Code, City, Country, Email, Phone, Package Size, Weight
 */
export function formatGLSPayload(options: GLSCopyOptions): string {
  const { recipientData, packageSize = 'M', weight } = options;
  
  // Split name into first and last name
  const nameParts = (recipientData.name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Convert country to German label
  const germanCountry = GLS_COUNTRY_MAP[recipientData.country] || recipientData.country;
  
  // Create tab-separated payload
  // Format: FirstName\tLastName\tCompany\tStreet\tHouseNumber\tPostalCode\tCity\tCountry\tEmail\tPhone\tPackageSize\tWeight
  const fields = [
    firstName,
    lastName,
    recipientData.company || '',
    recipientData.street || '',
    recipientData.houseNumber || '',
    recipientData.postalCode || '',
    recipientData.city || '',
    germanCountry || '',
    recipientData.email || '',
    recipientData.phone || '',
    packageSize || 'M',
    weight ? weight.toFixed(2) : ''
  ];
  
  // Also create a readable version for display
  const readableText = `
GLS Shipping Details
====================
First Name: ${firstName}
Last Name: ${lastName}
Company: ${recipientData.company || '-'}
Street: ${recipientData.street}
House Number: ${recipientData.houseNumber || '-'}
Postal Code: ${recipientData.postalCode}
City: ${recipientData.city}
Country: ${germanCountry}
Email: ${recipientData.email || '-'}
Phone: ${recipientData.phone || '-'}
Package Size: ${packageSize}${weight ? `\nWeight: ${weight} kg` : ''}

Tab-Separated Data (for copy-paste):
${fields.join('\t')}
`.trim();
  
  // Return tab-separated format for clipboard
  return fields.join('\t');
}

/**
 * Copy GLS shipping details to clipboard
 * Returns true on success, false on failure
 */
export async function copyGLSDetailsToClipboard(options: GLSCopyOptions): Promise<boolean> {
  try {
    const payload = formatGLSPayload(options);
    await navigator.clipboard.writeText(payload);
    return true;
  } catch (error) {
    console.error('Failed to copy GLS details to clipboard:', error);
    return false;
  }
}

/**
 * Get readable GLS shipping details for display/logging
 */
export function getReadableGLSDetails(options: GLSCopyOptions): string {
  const { recipientData, packageSize = 'M', weight } = options;
  
  const nameParts = (recipientData.name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const germanCountry = GLS_COUNTRY_MAP[recipientData.country] || recipientData.country;
  
  return `
GLS Shipping Details
====================
Name: ${firstName} ${lastName}
Company: ${recipientData.company || '-'}
Address: ${recipientData.street} ${recipientData.houseNumber || ''}
City: ${recipientData.postalCode} ${recipientData.city}
Country: ${germanCountry}
Contact: ${recipientData.email || '-'} / ${recipientData.phone || '-'}
Package: Size ${packageSize}${weight ? `, ${weight} kg` : ''}
`.trim();
}
