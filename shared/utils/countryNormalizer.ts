type CountryData = {
  iso: string;
  en: string;
  de: string;
  cs: string;
  vi: string;
  ppl: string;
  dhl: string;
  gls: string;
};

const COUNTRY_DATABASE: CountryData[] = [
  { iso: 'CZ', en: 'Czech Republic', de: 'Tschechien', cs: 'Česko', vi: 'Cộng hòa Séc', ppl: 'CZ', dhl: 'Tschechien', gls: 'Tschechien' },
  { iso: 'DE', en: 'Germany', de: 'Deutschland', cs: 'Německo', vi: 'Đức', ppl: 'DE', dhl: 'Deutschland', gls: 'Deutschland' },
  { iso: 'AT', en: 'Austria', de: 'Österreich', cs: 'Rakousko', vi: 'Áo', ppl: 'AT', dhl: 'Österreich', gls: 'Österreich' },
  { iso: 'SK', en: 'Slovakia', de: 'Slowakei', cs: 'Slovensko', vi: 'Slovakia', ppl: 'SK', dhl: 'Slowakei', gls: 'Slowakei' },
  { iso: 'PL', en: 'Poland', de: 'Polen', cs: 'Polsko', vi: 'Ba Lan', ppl: 'PL', dhl: 'Polen', gls: 'Polen' },
  { iso: 'HU', en: 'Hungary', de: 'Ungarn', cs: 'Maďarsko', vi: 'Hungary', ppl: 'HU', dhl: 'Ungarn', gls: 'Ungarn' },
  { iso: 'FR', en: 'France', de: 'Frankreich', cs: 'Francie', vi: 'Pháp', ppl: 'FR', dhl: 'Frankreich', gls: 'Frankreich' },
  { iso: 'IT', en: 'Italy', de: 'Italien', cs: 'Itálie', vi: 'Ý', ppl: 'IT', dhl: 'Italien', gls: 'Italien' },
  { iso: 'ES', en: 'Spain', de: 'Spanien', cs: 'Španělsko', vi: 'Tây Ban Nha', ppl: 'ES', dhl: 'Spanien', gls: 'Spanien' },
  { iso: 'PT', en: 'Portugal', de: 'Portugal', cs: 'Portugalsko', vi: 'Bồ Đào Nha', ppl: 'PT', dhl: 'Portugal', gls: 'Portugal' },
  { iso: 'NL', en: 'Netherlands', de: 'Niederlande', cs: 'Nizozemsko', vi: 'Hà Lan', ppl: 'NL', dhl: 'Niederlande', gls: 'Niederlande' },
  { iso: 'BE', en: 'Belgium', de: 'Belgien', cs: 'Belgie', vi: 'Bỉ', ppl: 'BE', dhl: 'Belgien', gls: 'Belgien' },
  { iso: 'LU', en: 'Luxembourg', de: 'Luxemburg', cs: 'Lucembursko', vi: 'Luxembourg', ppl: 'LU', dhl: 'Luxemburg', gls: 'Luxemburg' },
  { iso: 'CH', en: 'Switzerland', de: 'Schweiz', cs: 'Švýcarsko', vi: 'Thụy Sĩ', ppl: 'CH', dhl: 'Schweiz', gls: 'Schweiz' },
  { iso: 'GB', en: 'United Kingdom', de: 'Vereinigtes Königreich', cs: 'Spojené království', vi: 'Vương quốc Anh', ppl: 'GB', dhl: 'Vereinigtes Königreich', gls: 'Vereinigtes Königreich' },
  { iso: 'IE', en: 'Ireland', de: 'Irland', cs: 'Irsko', vi: 'Ireland', ppl: 'IE', dhl: 'Irland', gls: 'Irland' },
  { iso: 'DK', en: 'Denmark', de: 'Dänemark', cs: 'Dánsko', vi: 'Đan Mạch', ppl: 'DK', dhl: 'Dänemark', gls: 'Dänemark' },
  { iso: 'SE', en: 'Sweden', de: 'Schweden', cs: 'Švédsko', vi: 'Thụy Điển', ppl: 'SE', dhl: 'Schweden', gls: 'Schweden' },
  { iso: 'NO', en: 'Norway', de: 'Norwegen', cs: 'Norsko', vi: 'Na Uy', ppl: 'NO', dhl: 'Norwegen', gls: 'Norwegen' },
  { iso: 'FI', en: 'Finland', de: 'Finnland', cs: 'Finsko', vi: 'Phần Lan', ppl: 'FI', dhl: 'Finnland', gls: 'Finnland' },
  { iso: 'EE', en: 'Estonia', de: 'Estland', cs: 'Estonsko', vi: 'Estonia', ppl: 'EE', dhl: 'Estland', gls: 'Estland' },
  { iso: 'LV', en: 'Latvia', de: 'Lettland', cs: 'Lotyšsko', vi: 'Latvia', ppl: 'LV', dhl: 'Lettland', gls: 'Lettland' },
  { iso: 'LT', en: 'Lithuania', de: 'Litauen', cs: 'Litva', vi: 'Lithuania', ppl: 'LT', dhl: 'Litauen', gls: 'Litauen' },
  { iso: 'RO', en: 'Romania', de: 'Rumänien', cs: 'Rumunsko', vi: 'Romania', ppl: 'RO', dhl: 'Rumänien', gls: 'Rumänien' },
  { iso: 'BG', en: 'Bulgaria', de: 'Bulgarien', cs: 'Bulharsko', vi: 'Bulgaria', ppl: 'BG', dhl: 'Bulgarien', gls: 'Bulgarien' },
  { iso: 'GR', en: 'Greece', de: 'Griechenland', cs: 'Řecko', vi: 'Hy Lạp', ppl: 'GR', dhl: 'Griechenland', gls: 'Griechenland' },
  { iso: 'HR', en: 'Croatia', de: 'Kroatien', cs: 'Chorvatsko', vi: 'Croatia', ppl: 'HR', dhl: 'Kroatien', gls: 'Kroatien' },
  { iso: 'SI', en: 'Slovenia', de: 'Slowenien', cs: 'Slovinsko', vi: 'Slovenia', ppl: 'SI', dhl: 'Slowenien', gls: 'Slowenien' },
  { iso: 'RS', en: 'Serbia', de: 'Serbien', cs: 'Srbsko', vi: 'Serbia', ppl: 'RS', dhl: 'Serbien', gls: 'Serbien' },
  { iso: 'UA', en: 'Ukraine', de: 'Ukraine', cs: 'Ukrajina', vi: 'Ukraine', ppl: 'UA', dhl: 'Ukraine', gls: 'Ukraine' },
  { iso: 'RU', en: 'Russia', de: 'Russland', cs: 'Rusko', vi: 'Nga', ppl: 'RU', dhl: 'Russland', gls: 'Russland' },
  { iso: 'TR', en: 'Turkey', de: 'Türkei', cs: 'Turecko', vi: 'Thổ Nhĩ Kỳ', ppl: 'TR', dhl: 'Türkei', gls: 'Türkei' },
  { iso: 'US', en: 'United States', de: 'Vereinigte Staaten', cs: 'Spojené státy', vi: 'Hoa Kỳ', ppl: 'US', dhl: 'Vereinigte Staaten', gls: 'Vereinigte Staaten' },
  { iso: 'CA', en: 'Canada', de: 'Kanada', cs: 'Kanada', vi: 'Canada', ppl: 'CA', dhl: 'Kanada', gls: 'Kanada' },
  { iso: 'MX', en: 'Mexico', de: 'Mexiko', cs: 'Mexiko', vi: 'Mexico', ppl: 'MX', dhl: 'Mexiko', gls: 'Mexiko' },
  { iso: 'BR', en: 'Brazil', de: 'Brasilien', cs: 'Brazílie', vi: 'Brazil', ppl: 'BR', dhl: 'Brasilien', gls: 'Brasilien' },
  { iso: 'AR', en: 'Argentina', de: 'Argentinien', cs: 'Argentina', vi: 'Argentina', ppl: 'AR', dhl: 'Argentinien', gls: 'Argentinien' },
  { iso: 'CN', en: 'China', de: 'China', cs: 'Čína', vi: 'Trung Quốc', ppl: 'CN', dhl: 'China', gls: 'China' },
  { iso: 'JP', en: 'Japan', de: 'Japan', cs: 'Japonsko', vi: 'Nhật Bản', ppl: 'JP', dhl: 'Japan', gls: 'Japan' },
  { iso: 'KR', en: 'South Korea', de: 'Südkorea', cs: 'Jižní Korea', vi: 'Hàn Quốc', ppl: 'KR', dhl: 'Südkorea', gls: 'Südkorea' },
  { iso: 'IN', en: 'India', de: 'Indien', cs: 'Indie', vi: 'Ấn Độ', ppl: 'IN', dhl: 'Indien', gls: 'Indien' },
  { iso: 'AU', en: 'Australia', de: 'Australien', cs: 'Austrálie', vi: 'Úc', ppl: 'AU', dhl: 'Australien', gls: 'Australien' },
  { iso: 'NZ', en: 'New Zealand', de: 'Neuseeland', cs: 'Nový Zéland', vi: 'New Zealand', ppl: 'NZ', dhl: 'Neuseeland', gls: 'Neuseeland' },
  { iso: 'VN', en: 'Vietnam', de: 'Vietnam', cs: 'Vietnam', vi: 'Việt Nam', ppl: 'VN', dhl: 'Vietnam', gls: 'Vietnam' },
  { iso: 'TH', en: 'Thailand', de: 'Thailand', cs: 'Thajsko', vi: 'Thái Lan', ppl: 'TH', dhl: 'Thailand', gls: 'Thailand' },
  { iso: 'SG', en: 'Singapore', de: 'Singapur', cs: 'Singapur', vi: 'Singapore', ppl: 'SG', dhl: 'Singapur', gls: 'Singapur' },
  { iso: 'MY', en: 'Malaysia', de: 'Malaysia', cs: 'Malajsie', vi: 'Malaysia', ppl: 'MY', dhl: 'Malaysia', gls: 'Malaysia' },
  { iso: 'ID', en: 'Indonesia', de: 'Indonesien', cs: 'Indonésie', vi: 'Indonesia', ppl: 'ID', dhl: 'Indonesien', gls: 'Indonesien' },
  { iso: 'PH', en: 'Philippines', de: 'Philippinen', cs: 'Filipíny', vi: 'Philippines', ppl: 'PH', dhl: 'Philippinen', gls: 'Philippinen' },
  { iso: 'ZA', en: 'South Africa', de: 'Südafrika', cs: 'Jižní Afrika', vi: 'Nam Phi', ppl: 'ZA', dhl: 'Südafrika', gls: 'Südafrika' },
  { iso: 'EG', en: 'Egypt', de: 'Ägypten', cs: 'Egypt', vi: 'Ai Cập', ppl: 'EG', dhl: 'Ägypten', gls: 'Ägypten' },
  { iso: 'SA', en: 'Saudi Arabia', de: 'Saudi-Arabien', cs: 'Saúdská Arábie', vi: 'Ả Rập Xê Út', ppl: 'SA', dhl: 'Saudi-Arabien', gls: 'Saudi-Arabien' },
  { iso: 'AE', en: 'United Arab Emirates', de: 'Vereinigte Arabische Emirate', cs: 'Spojené arabské emiráty', vi: 'UAE', ppl: 'AE', dhl: 'Vereinigte Arabische Emirate', gls: 'Vereinigte Arabische Emirate' },
  { iso: 'IL', en: 'Israel', de: 'Israel', cs: 'Izrael', vi: 'Israel', ppl: 'IL', dhl: 'Israel', gls: 'Israel' },
  { iso: 'MT', en: 'Malta', de: 'Malta', cs: 'Malta', vi: 'Malta', ppl: 'MT', dhl: 'Malta', gls: 'Malta' },
  { iso: 'CY', en: 'Cyprus', de: 'Zypern', cs: 'Kypr', vi: 'Síp', ppl: 'CY', dhl: 'Zypern', gls: 'Zypern' },
  { iso: 'IS', en: 'Iceland', de: 'Island', cs: 'Island', vi: 'Iceland', ppl: 'IS', dhl: 'Island', gls: 'Island' },
  { iso: 'ME', en: 'Montenegro', de: 'Montenegro', cs: 'Černá Hora', vi: 'Montenegro', ppl: 'ME', dhl: 'Montenegro', gls: 'Montenegro' },
  { iso: 'MK', en: 'North Macedonia', de: 'Nordmazedonien', cs: 'Severní Makedonie', vi: 'Bắc Macedonia', ppl: 'MK', dhl: 'Nordmazedonien', gls: 'Nordmazedonien' },
  { iso: 'AL', en: 'Albania', de: 'Albanien', cs: 'Albánie', vi: 'Albania', ppl: 'AL', dhl: 'Albanien', gls: 'Albanien' },
  { iso: 'BA', en: 'Bosnia and Herzegovina', de: 'Bosnien und Herzegowina', cs: 'Bosna a Hercegovina', vi: 'Bosnia', ppl: 'BA', dhl: 'Bosnien und Herzegowina', gls: 'Bosnien und Herzegowina' },
  { iso: 'AD', en: 'Andorra', de: 'Andorra', cs: 'Andorra', vi: 'Andorra', ppl: 'AD', dhl: 'Andorra', gls: 'Andorra' },
  { iso: 'MC', en: 'Monaco', de: 'Monaco', cs: 'Monako', vi: 'Monaco', ppl: 'MC', dhl: 'Monaco', gls: 'Monaco' },
  { iso: 'LI', en: 'Liechtenstein', de: 'Liechtenstein', cs: 'Lichtenštejnsko', vi: 'Liechtenstein', ppl: 'LI', dhl: 'Liechtenstein', gls: 'Liechtenstein' },
  { iso: 'SM', en: 'San Marino', de: 'San Marino', cs: 'San Marino', vi: 'San Marino', ppl: 'SM', dhl: 'San Marino', gls: 'San Marino' },
  { iso: 'VA', en: 'Vatican City', de: 'Vatikanstadt', cs: 'Vatikán', vi: 'Vatican', ppl: 'VA', dhl: 'Vatikanstadt', gls: 'Vatikanstadt' },
  { iso: 'BY', en: 'Belarus', de: 'Belarus', cs: 'Bělorusko', vi: 'Belarus', ppl: 'BY', dhl: 'Belarus', gls: 'Belarus' },
  { iso: 'MD', en: 'Moldova', de: 'Moldawien', cs: 'Moldavsko', vi: 'Moldova', ppl: 'MD', dhl: 'Moldawien', gls: 'Moldawien' },
];

const ALIAS_MAP: Record<string, string> = {
  'czechia': 'CZ',
  'cesko': 'CZ',
  'česko': 'CZ',
  'česká republika': 'CZ',
  'ceska republika': 'CZ',
  'czech': 'CZ',
  'tschechien': 'CZ',
  'tschechische republik': 'CZ',
  'deutschland': 'DE',
  'nemecko': 'DE',
  'německo': 'DE',
  'österreich': 'AT',
  'oesterreich': 'AT',
  'rakusko': 'AT',
  'rakousko': 'AT',
  'slovensko': 'SK',
  'slowakei': 'SK',
  'slovak republic': 'SK',
  'polska': 'PL',
  'polsko': 'PL',
  'polen': 'PL',
  'magyarorszag': 'HU',
  'magyarország': 'HU',
  'madarsko': 'HU',
  'maďarsko': 'HU',
  'ungarn': 'HU',
  'frankreich': 'FR',
  'francie': 'FR',
  'phap': 'FR',
  'pháp': 'FR',
  'italien': 'IT',
  'italie': 'IT',
  'itálie': 'IT',
  'spanien': 'ES',
  'spanelsko': 'ES',
  'španělsko': 'ES',
  'tay ban nha': 'ES',
  'tây ban nha': 'ES',
  'niederlande': 'NL',
  'holandsko': 'NL',
  'nizozemsko': 'NL',
  'ha lan': 'NL',
  'hà lan': 'NL',
  'holland': 'NL',
  'belgien': 'BE',
  'belgie': 'BE',
  'bi': 'BE',
  'bỉ': 'BE',
  'luxemburg': 'LU',
  'lucembursko': 'LU',
  'schweiz': 'CH',
  'svycarsko': 'CH',
  'švýcarsko': 'CH',
  'thuy si': 'CH',
  'thụy sĩ': 'CH',
  'united kingdom': 'GB',
  'great britain': 'GB',
  'uk': 'GB',
  'england': 'GB',
  'spojene kralovstvi': 'GB',
  'spojené království': 'GB',
  'vuong quoc anh': 'GB',
  'vương quốc anh': 'GB',
  'irland': 'IE',
  'irsko': 'IE',
  'danemark': 'DK',
  'dänemark': 'DK',
  'dansko': 'DK',
  'dánsko': 'DK',
  'dan mach': 'DK',
  'đan mạch': 'DK',
  'schweden': 'SE',
  'svedsko': 'SE',
  'švédsko': 'SE',
  'thuy dien': 'SE',
  'thụy điển': 'SE',
  'norwegen': 'NO',
  'norsko': 'NO',
  'na uy': 'NO',
  'finnland': 'FI',
  'finsko': 'FI',
  'phan lan': 'FI',
  'phần lan': 'FI',
  'estland': 'EE',
  'estonsko': 'EE',
  'lettland': 'LV',
  'lotyssko': 'LV',
  'lotyšsko': 'LV',
  'litauen': 'LT',
  'litva': 'LT',
  'rumanien': 'RO',
  'rumänien': 'RO',
  'rumunsko': 'RO',
  'bulgarien': 'BG',
  'bulharsko': 'BG',
  'griechenland': 'GR',
  'recko': 'GR',
  'řecko': 'GR',
  'hy lap': 'GR',
  'hy lạp': 'GR',
  'kroatien': 'HR',
  'chorvatsko': 'HR',
  'slowenien': 'SI',
  'slovinsko': 'SI',
  'serbien': 'RS',
  'srbsko': 'RS',
  'ukrajina': 'UA',
  'russland': 'RU',
  'rusko': 'RU',
  'nga': 'RU',
  'turkei': 'TR',
  'türkei': 'TR',
  'turecko': 'TR',
  'tho nhi ky': 'TR',
  'thổ nhĩ kỳ': 'TR',
  'vereinigte staaten': 'US',
  'spojene staty': 'US',
  'spojené státy': 'US',
  'usa': 'US',
  'hoa ky': 'US',
  'hoa kỳ': 'US',
  'america': 'US',
  'kanada': 'CA',
  'mexiko': 'MX',
  'brasilien': 'BR',
  'brazilie': 'BR',
  'brazílie': 'BR',
  'argentinien': 'AR',
  'cina': 'CN',
  'čína': 'CN',
  'trung quoc': 'CN',
  'trung quốc': 'CN',
  'japonsko': 'JP',
  'nhat ban': 'JP',
  'nhật bản': 'JP',
  'sudkorea': 'KR',
  'südkorea': 'KR',
  'jizni korea': 'KR',
  'jižní korea': 'KR',
  'han quoc': 'KR',
  'hàn quốc': 'KR',
  'korea': 'KR',
  'indien': 'IN',
  'indie': 'IN',
  'an do': 'IN',
  'ấn độ': 'IN',
  'australien': 'AU',
  'australie': 'AU',
  'austrálie': 'AU',
  'uc': 'AU',
  'úc': 'AU',
  'neuseeland': 'NZ',
  'novy zeland': 'NZ',
  'nový zéland': 'NZ',
  'viet nam': 'VN',
  'việt nam': 'VN',
  'thajsko': 'TH',
  'thai lan': 'TH',
  'thái lan': 'TH',
  'singapur': 'SG',
  'malajsie': 'MY',
  'indonesien': 'ID',
  'indonesie': 'ID',
  'indonésie': 'ID',
  'philippinen': 'PH',
  'filipiny': 'PH',
  'filipíny': 'PH',
  'sudafrika': 'ZA',
  'südafrika': 'ZA',
  'jizni afrika': 'ZA',
  'jižní afrika': 'ZA',
  'nam phi': 'ZA',
  'agypten': 'EG',
  'ägypten': 'EG',
  'ai cap': 'EG',
  'ai cập': 'EG',
  'saudi-arabien': 'SA',
  'saudska arabie': 'SA',
  'saúdská arábie': 'SA',
  'a rap xe ut': 'SA',
  'ả rập xê út': 'SA',
  'vereinigte arabische emirate': 'AE',
  'spojene arabske emiraty': 'AE',
  'spojené arabské emiráty': 'AE',
  'zypern': 'CY',
  'kypr': 'CY',
  'sip': 'CY',
  'síp': 'CY',
  'island': 'IS',
  'cerna hora': 'ME',
  'černá hora': 'ME',
  'nordmazedonien': 'MK',
  'severni makedonie': 'MK',
  'severní makedonie': 'MK',
  'bac macedonia': 'MK',
  'bắc macedonia': 'MK',
  'macedonia': 'MK',
  'albanien': 'AL',
  'albanie': 'AL',
  'albánie': 'AL',
  'bosnien und herzegowina': 'BA',
  'bosna a hercegovina': 'BA',
  'bosnia': 'BA',
  'monako': 'MC',
  'lichtenstejnsko': 'LI',
  'lichtenštejnsko': 'LI',
  'vatikanstadt': 'VA',
  'vatikan': 'VA',
  'vatikán': 'VA',
  'belorusko': 'BY',
  'bělorusko': 'BY',
  'moldawien': 'MD',
  'moldavsko': 'MD',
  'portugalsko': 'PT',
};

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function countryToIso(country: string | null | undefined): string | null {
  if (!country) return null;
  
  const normalized = country.toLowerCase().trim();
  
  if (normalized.length === 2 && /^[a-z]{2}$/i.test(normalized)) {
    const upper = normalized.toUpperCase();
    const found = COUNTRY_DATABASE.find(c => c.iso === upper);
    if (found) return found.iso;
  }
  
  if (ALIAS_MAP[normalized]) {
    return ALIAS_MAP[normalized];
  }
  
  const withoutDiacritics = removeDiacritics(normalized);
  if (ALIAS_MAP[withoutDiacritics]) {
    return ALIAS_MAP[withoutDiacritics];
  }
  
  for (const c of COUNTRY_DATABASE) {
    if (
      c.en.toLowerCase() === normalized ||
      c.de.toLowerCase() === normalized ||
      c.cs.toLowerCase() === normalized ||
      c.vi.toLowerCase() === normalized ||
      removeDiacritics(c.en.toLowerCase()) === withoutDiacritics ||
      removeDiacritics(c.de.toLowerCase()) === withoutDiacritics ||
      removeDiacritics(c.cs.toLowerCase()) === withoutDiacritics ||
      removeDiacritics(c.vi.toLowerCase()) === withoutDiacritics
    ) {
      return c.iso;
    }
  }
  
  return null;
}

export type SupportedLanguage = 'en' | 'de' | 'cs' | 'vi';
export type ShippingCarrier = 'ppl' | 'dhl' | 'gls';

export function getLocalizedCountryName(
  country: string | null | undefined,
  language: SupportedLanguage = 'en'
): string {
  if (!country) return '';
  
  const iso = countryToIso(country);
  if (!iso) {
    return country;
  }
  
  const found = COUNTRY_DATABASE.find(c => c.iso === iso);
  if (!found) {
    return country;
  }
  
  return found[language] || found.en;
}

export function getCountryForCarrier(
  country: string | null | undefined,
  carrier: ShippingCarrier
): string {
  if (!country) return '';
  
  const iso = countryToIso(country);
  if (!iso) {
    return country;
  }
  
  const found = COUNTRY_DATABASE.find(c => c.iso === iso);
  if (!found) {
    return country;
  }
  
  return found[carrier] || found.iso;
}

export function normalizeCountryForStorage(country: string | null | undefined): string {
  if (!country) return '';
  
  const iso = countryToIso(country);
  if (!iso) {
    return country;
  }
  
  const found = COUNTRY_DATABASE.find(c => c.iso === iso);
  return found ? found.en : country;
}

export function getCountryFlag(country: string | null | undefined): string {
  if (!country) return '';
  
  const iso = countryToIso(country);
  if (!iso) return '🌍';
  
  const flags: Record<string, string> = {
    'AT': '🇦🇹', 'BE': '🇧🇪', 'BG': '🇧🇬', 'HR': '🇭🇷', 'CY': '🇨🇾', 'CZ': '🇨🇿', 'DK': '🇩🇰',
    'EE': '🇪🇪', 'FI': '🇫🇮', 'FR': '🇫🇷', 'DE': '🇩🇪', 'GR': '🇬🇷', 'HU': '🇭🇺', 'IE': '🇮🇪',
    'IT': '🇮🇹', 'LV': '🇱🇻', 'LT': '🇱🇹', 'LU': '🇱🇺', 'MT': '🇲🇹', 'NL': '🇳🇱', 'PL': '🇵🇱',
    'PT': '🇵🇹', 'RO': '🇷🇴', 'SK': '🇸🇰', 'SI': '🇸🇮', 'ES': '🇪🇸', 'SE': '🇸🇪', 'GB': '🇬🇧',
    'US': '🇺🇸', 'CN': '🇨🇳', 'VN': '🇻🇳', 'JP': '🇯🇵', 'KR': '🇰🇷', 'IN': '🇮🇳', 'AU': '🇦🇺',
    'CA': '🇨🇦', 'BR': '🇧🇷', 'MX': '🇲🇽', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪',
    'ZA': '🇿🇦', 'EG': '🇪🇬', 'NG': '🇳🇬', 'KE': '🇰🇪', 'TH': '🇹🇭', 'ID': '🇮🇩', 'MY': '🇲🇾',
    'PH': '🇵🇭', 'SG': '🇸🇬', 'NZ': '🇳🇿', 'RU': '🇷🇺', 'TR': '🇹🇷', 'SA': '🇸🇦', 'AE': '🇦🇪',
    'CH': '🇨🇭', 'NO': '🇳🇴', 'IS': '🇮🇸', 'UA': '🇺🇦', 'BY': '🇧🇾', 'AL': '🇦🇱', 'AD': '🇦🇩',
    'BA': '🇧🇦', 'LI': '🇱🇮', 'MC': '🇲🇨', 'ME': '🇲🇪', 'MK': '🇲🇰', 'RS': '🇷🇸', 'VA': '🇻🇦',
    'IL': '🇮🇱', 'MD': '🇲🇩', 'SM': '🇸🇲',
  };
  
  return flags[iso] || '🌍';
}

export function getAllCountries(language: SupportedLanguage = 'en'): { iso: string; name: string }[] {
  return COUNTRY_DATABASE.map(c => ({
    iso: c.iso,
    name: c[language] || c.en
  })).sort((a, b) => a.name.localeCompare(b.name));
}
