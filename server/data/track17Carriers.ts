export interface Track17Carrier {
  key: number;
  name: string;
  country: string;
  aliases?: string[];
}

export const COMMON_CARRIERS: Track17Carrier[] = [
  // Official 17TRACK carrier codes from API
  { key: 3011, name: "China Post", country: "CN", aliases: ["china post", "chinapost", "中国邮政"] },
  { key: 3013, name: "China EMS", country: "CN", aliases: ["ems china", "china ems", "ems"] },
  { key: 7041, name: "DHL Paket", country: "DE", aliases: ["dhl paket", "dhl germany", "dhl de", "dhl"] },
  { key: 100003, name: "FedEx", country: "INT", aliases: ["fedex", "federal express"] },
  { key: 100005, name: "GLS", country: "INT", aliases: ["gls", "general logistics systems"] },
  { key: 100010, name: "DPD", country: "INT", aliases: ["dpd", "dpd uk", "dynamic parcel distribution"] },
  { key: 100024, name: "GLS (IT)", country: "IT", aliases: ["gls it", "gls italy"] },
  { key: 100026, name: "DPD (IT)", country: "IT", aliases: ["brt bartolini", "dpd it", "dpd italy"] },
  { key: 21051, name: "USPS", country: "US", aliases: ["usps", "us postal service", "us post"] },
  { key: 100001, name: "SF Express", country: "CN", aliases: ["sf express", "sf", "顺丰", "shunfeng"] },
  { key: 100002, name: "YTO Express", country: "CN", aliases: ["yto", "yto express", "圆通"] },
  { key: 100004, name: "STO Express", country: "CN", aliases: ["sto", "sto express", "申通"] },
  { key: 100006, name: "Yunda Express", country: "CN", aliases: ["yunda", "yunda express", "韵达"] },
  { key: 100011, name: "Yanwen", country: "CN", aliases: ["yanwen", "yanwen logistics"] },
  { key: 100012, name: "CNE Express", country: "CN", aliases: ["cne", "cne express"] },
  { key: 100014, name: "4PX", country: "CN", aliases: ["4px", "4px express", "fourpx"] },
  { key: 190136, name: "Cainiao", country: "CN", aliases: ["cainiao", "菜鸟"] },
  { key: 100076, name: "J-Net", country: "CN", aliases: ["jnet", "j-net"] },
  { key: 3221, name: "Czech Post", country: "CZ", aliases: ["czech post", "ceska posta", "česká pošta"] },
  { key: 14041, name: "PostNL", country: "NL", aliases: ["postnl", "post nl", "netherlands post"] },
  { key: 2061, name: "Bpost", country: "BE", aliases: ["bpost", "belgium post"] },
  { key: 100017, name: "Yodel", country: "GB", aliases: ["yodel"] },
  { key: 100140, name: "PPL CZ", country: "CZ", aliases: ["ppl", "ppl cz", "ppl czech"] },
  { key: 100127, name: "UPS", country: "INT", aliases: ["ups", "united parcel service"] },
  { key: 1151, name: "Australia Post", country: "AU", aliases: ["australia post", "auspost"] },
  { key: 3041, name: "Canada Post", country: "CA", aliases: ["canada post"] },
  { key: 21011, name: "Royal Mail", country: "GB", aliases: ["royal mail", "uk post"] },
  { key: 8011, name: "HongKong Post", country: "HK", aliases: ["hongkong post", "hk post", "香港邮政"] },
  { key: 11511, name: "Korea Post", country: "KR", aliases: ["korea post", "korean post", "한국우편"] },
  { key: 10021, name: "Japan Post", country: "JP", aliases: ["japan post", "jp post", "日本郵便"] },
  { key: 19021, name: "Singapore Post", country: "SG", aliases: ["singapore post", "singpost"] },
  { key: 20011, name: "Taiwan Post", country: "TW", aliases: ["taiwan post", "chunghwa post", "中华邮政"] },
  { key: 20021, name: "Thailand Post", country: "TH", aliases: ["thailand post", "thai post"] },
  { key: 22011, name: "Vietnam Post", country: "VN", aliases: ["vietnam post", "vn post", "bưu điện việt nam"] },
  { key: 14071, name: "Poland Post", country: "PL", aliases: ["poland post", "poczta polska", "polish post"] },
  { key: 17031, name: "Slovak Post", country: "SK", aliases: ["slovak post", "slovenska posta"] },
  { key: 8051, name: "Magyar Posta", country: "HU", aliases: ["magyar posta", "hungary post", "hungarian post"] },
  { key: 2171, name: "Bulgarian Post", country: "BG", aliases: ["bulgarian post", "bg post"] },
  { key: 15021, name: "Romanian Post", country: "RO", aliases: ["romanian post", "posta romana"] },
  { key: 9071, name: "Poste Italiane", country: "IT", aliases: ["poste italiane", "italy post", "italian post"] },
  { key: 6051, name: "La Poste", country: "FR", aliases: ["la poste", "colissimo", "france post", "french post"] },
  { key: 19031, name: "Correos Spain", country: "ES", aliases: ["correos", "spain post", "spanish post"] },
  { key: 14101, name: "CTT Portugal", country: "PT", aliases: ["ctt", "portugal post", "portuguese post"] },
  { key: 1161, name: "Austrian Post", country: "AT", aliases: ["austrian post", "post at", "österreichische post"] },
  { key: 19091, name: "Swiss Post", country: "CH", aliases: ["swiss post", "post ch", "die schweizerische post"] },
  { key: 2151, name: "Correios Brazil", country: "BR", aliases: ["correios", "brazil post", "brazilian post"] },
  { key: 13011, name: "Correo Argentino", country: "AR", aliases: ["correo argentino", "argentina post"] },
  { key: 13021, name: "Correos Mexico", country: "MX", aliases: ["correos mexico", "mexico post", "sepomex"] },
  { key: 9021, name: "India Post", country: "IN", aliases: ["india post", "indian post"] },
  { key: 9031, name: "Pos Indonesia", country: "ID", aliases: ["pos indonesia", "indonesia post"] },
  { key: 13041, name: "Malaysia Post", country: "MY", aliases: ["pos malaysia", "malaysia post"] },
  { key: 14031, name: "PhilPost", country: "PH", aliases: ["philpost", "phlpost", "philippines post"] },
  { key: 100232, name: "J&T Express", country: "INT", aliases: ["j&t", "jnt", "j&t express"] },
  { key: 100274, name: "Shopee Express", country: "INT", aliases: ["shopee express", "shopee"] },
  { key: 100275, name: "Lazada Express", country: "INT", aliases: ["lazada express", "lazada", "lex"] },
  { key: 100098, name: "Aliexpress Standard", country: "CN", aliases: ["aliexpress", "ali express", "aliexpress standard shipping"] },
  { key: 190004, name: "Amazon Logistics", country: "INT", aliases: ["amazon", "amazon logistics", "amzl"] },
];

export function findCarrierByName(name: string): Track17Carrier | undefined {
  const normalizedName = name.toLowerCase().trim();
  
  return COMMON_CARRIERS.find(carrier => {
    if (carrier.name.toLowerCase() === normalizedName) return true;
    if (carrier.aliases?.some(alias => alias.toLowerCase() === normalizedName)) return true;
    if (carrier.aliases?.some(alias => normalizedName.includes(alias.toLowerCase()))) return true;
    if (normalizedName.includes(carrier.name.toLowerCase())) return true;
    return false;
  });
}

export function findCarrierByCode(code: number): Track17Carrier | undefined {
  return COMMON_CARRIERS.find(carrier => carrier.key === code);
}

export function getCarrierList(): Track17Carrier[] {
  return COMMON_CARRIERS;
}
