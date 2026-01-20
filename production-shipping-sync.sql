-- Shipping Addresses Only Sync Script
-- Generated: 2026-01-20T10:53:28.968Z
-- Fixed: NULL values converted to empty strings for NOT NULL columns

BEGIN;

DELETE FROM customer_shipping_addresses;

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ec4c4326-8e29-46db-9a60-e16cd99021d2', '2b8451c7-b4e7-40fa-87f9-aee593825474', 'nguyên', 'Lilly', '', '', '', 'Mannheimer str 234', '', 'Kaiserslautern', '67657', 'Germany', true, '2026-01-07T02:20:05.113Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9059aaa8-7bad-446e-adfa-52881a45457a', '41c020d0-abb9-43d2-84be-7359d1be9ad6', 'námesti', '3 Husova', '', '', '777346837', 'Husova námesti 3', '', 'ledeč  nad  sázavou', '58401', 'Germany', true, '2026-01-07T02:20:08.081Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2a3e2ac7-981e-4152-be00-2547afee3767', 'fec7329f-13a1-4a99-aef9-614f887bb8b3', '84', 'Adalbertstraße', '', '', '', 'Adalbertstraße 84', '', 'Aachen', '52062', 'Germany', true, '2026-01-07T02:20:08.086Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2f0a6a3d-033b-4acb-bf27-fbdc9d328c1b', '40433072-7053-46a2-bc98-b18bafc5e886', 'Thi', 'Thanh Ngan Trinh', '', '', '', 'Roßmarktgasse 3', '', 'Pfullendorf', '88630', 'Germany', true, '2026-01-07T02:20:08.107Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2946a00f-770b-40c0-85c0-d8a59be91d9b', '4b3c5a01-8c1b-43d7-b998-b5769e6c9fca', 'Nguyen', 'Anh', '', '', '777665678', 'Anna 86', '', 'Plzeň', '32600', 'Czech Republic', true, '2026-01-07T02:20:08.118Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6a232b96-7277-48d8-8324-e86f8512be5e', 'fcf96495-2b15-4923-b1ab-1b09b26ab03f', 'giangkeoo.1812', 'giangkeoo.1812', '', '', '', 'Bohmter Straße 28', '', 'Osnabrück', '49074', 'Germany', true, '2026-01-07T02:20:08.138Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2cc3c248-8db3-45a5-9e6e-aed06eb911f2', '8d9b1691-adbf-4637-8298-a084516775fa', '105', 'Poolsterstraat', '', '', '', 'Poolsterstraat 105', '', 'Lx Rotterdam', '3067', 'Germany', true, '2026-01-07T02:20:08.165Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('00876f28-0889-4341-9534-4995dc3f6edd', '0e1b1e2b-0dd1-458f-a0ac-2be8fa677cf3', '66', 'Oberstr.', '', '', '', 'Oberstr. 66', '', 'Neuss', '41460', 'Germany', true, '2026-01-07T02:20:08.179Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9d907726-9893-47e7-9dd6-bb5e77c073e6', '9d83c322-93dd-4557-a50c-dc5f16a24171', 'chỉ', 'tiệm e Địa', '', '', '', 'rue de Vaugirard 75006', '', 'Paris France', '75006', 'Germany', true, '2026-01-07T02:20:08.901Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('62da530f-f3eb-40b1-98a5-5f7ef08b5453', 'd271583d-a6bd-4091-992e-294cfffaaaab', 'Thi', 'Van Nguyen', '', '', '', 'Alte Poststraße 10', '', 'Geilenkirchen', '52511', 'Germany', true, '2026-01-07T02:20:09.101Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c585cf1e-c884-446d-a4eb-9fc389d8a453', '71ff0d15-2223-474b-b72d-460ac9d3ebfb', 'Anh', 'Doan The', '', '', '', 'Karl-Rudolf Straße 176a', '', 'Düsseldorf', '40215', 'Germany', true, '2026-01-07T02:20:09.107Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8bc21187-ceeb-4f1f-822c-ee9dafca8aa8', '8295cd4f-b4e9-480a-bfc0-ad84ff01b54c', 'nhuanbuithithuy7', 'nhuanbuithithuy7', '', '', '', 'Bahnhofstraße 46a', '', 'Alsdorf', '52477', 'Germany', true, '2026-01-07T02:20:09.129Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6b9e9049-4ae3-4ebe-a266-b4cb8b9038b8', '87e861ed-86f8-4649-a8b0-b0b8b6c76dd5', 'THI', 'ANH THO DOAN', '', '', '773294888', 'Štítného 139/8', '', 'Praha', '13000', 'Czech Republic', true, '2026-01-07T02:20:09.148Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fcf7729c-b0e4-494a-8a77-335fff5e323f', '6946f414-ef8f-466f-ac00-c7c4efb28b4e', '61555021515301', '61555021515301', '', '', '', 'Farmstrasse 101', '', 'Mörfelden-Walldorf', '64546', 'Germany', true, '2026-01-07T02:20:09.149Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('298b12e0-227e-4143-94e6-66d3ecc8a6f6', 'afaad76a-9603-470c-9e92-f3f13fb392d5', 'OG', 'Billstedt Center Im', '', '', '', 'Möllner Landstr. 3', '', 'Hamburg', '22111', 'Germany', true, '2026-01-07T02:20:09.152Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7ef9f7c4-8be3-4967-b931-f9944684f724', '55f4f4c4-4a35-408b-bbcd-4cfea6d31f5f', 'Tien', 'Toan Khuc', '', '', '63739', 'Goldbacher Str 2', '', 'Aschaffenburg', '63739', 'Germany', true, '2026-01-07T02:20:09.161Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fe7b90b0-fc52-46e5-a11e-4f60c17a7ca4', '8db97931-e53d-445b-908f-01b18c5428d7', 'rue', 'd’orgemont 10', '', '', '0659720144', 'IVY Nails Art Studio; 10 rue d’orgemont ; 77400 lagny sur marne; ; MARCHAL Thi Van Anh; 0659720144', '', 'lagny sur marne', '77400', 'Germany', true, '2026-01-07T02:20:09.170Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('24e2a704-4d5b-4909-b34d-0567a7927b11', '748dda4d-71ff-4911-ac9b-c3a021965963', 'Khanh', 'Linh Nguyen', '', '', '', 'Vorstadt 21', '', 'Kirchheimbolanden', '67292', 'Germany', true, '2026-01-07T02:20:09.171Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('97214a8e-b109-409e-8706-6c611e154a59', 'e684638d-2a4c-429f-927a-f1cfe0ee1e22', 'Oberhausen', '46049', '', '', '', 'VinaNails Bero Center; Concordiastr.32; 46049 Oberhausen ; W Germany', '', 'Oberhausen', '46049', 'Germany', true, '2026-01-07T02:20:08.268Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('312caec1-a1e6-484c-8d55-55092c28de86', '076620cb-c54b-4f76-9053-eebc37a0317a', 'Nguyen', 'Na', '', '', '', 'Na Nguyen ; The Nails Shop; bahnhofstr.2 ; 50169 Kerpen', '', 'Kerpen', '50169', 'Germany', true, '2026-01-07T02:20:08.274Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c6426af7-4bf6-4cc8-98e2-cc7c5e7a1cec', 'aaf9d34a-40b4-441c-83df-1dd6af6549af', 'Straße', '4 Bahnhof', '', '', '', 'Bahnhof Straße 4', '', 'Leinefelde-Worbis', '37327', 'Germany', true, '2026-01-07T02:20:08.289Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b843ec75-cbe4-46e8-9f4a-712aa2a5d5e1', 'd903480b-ed04-49ed-8088-63c8372f0558', '146', 'Žatecká', '', '', '774543972', 'Žatecká 146', '', 'Louny', '44001', 'Austria', true, '2026-01-07T02:20:08.340Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e13510ec-73e7-4775-8b9c-60b3a0aff217', '37d6fa6e-df40-46f1-b95a-387cdb45e451', 'Dinh', 'Ha', '', '', '', 'Hauptstraße 25', '', 'Königstein', '61462', 'Germany', true, '2026-01-07T02:20:08.360Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8554fee4-578d-4917-b970-253b0f8138f4', 'a5601e0a-7767-4de9-9613-0b05906b3c4e', 'Thi', 'Huong Pham', '', '', '', 'Elisabethstraße 7', '', 'mönchengladbach', '41065', 'Germany', true, '2026-01-07T02:20:08.381Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('93f9dd28-0dd9-43ba-a024-fc9e0772f0cc', '3c4ea9e2-6207-4030-b4e0-361574c6ca7a', 'thi', 'Nguyêt Pham', '', '', '8550', 'Bahnhofplatz 4', '', 'Haar', '8550', 'Austria', true, '2026-01-07T02:20:08.398Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('27861689-3f9c-4096-b2ff-cf511c00f767', 'd9c32fba-0150-46d0-be14-84fb3a0d07e6', 'nguyen', 'Trung', '', '', '', 'Munchener Straße 33', '', 'Rosenheim', '83022', 'Germany', true, '2026-01-07T02:20:08.410Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a211e17f-54d7-4871-9df9-8134ba7f5c6d', 'bf8c3ae2-9d72-4d39-8c7a-8ab5102b7d97', '21', 'Hauptstr.', '', 'beautyline1986@gmail.com', '', 'Hauptstr. 21', '', 'Echterdingen', '70771', 'Germany', true, '2026-01-07T02:20:08.420Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e640507a-de5c-4eb6-8071-f2cb65e6ec3e', 'c46a0f86-bdc7-42bf-98c9-f648d573c1bb', 's118ng', 's118ng', '', '', '1126721', 'Zwischen Beiden Sielen 11', '', 'Emden', '26721', 'Germany', true, '2026-01-07T02:20:08.433Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bbba18ad-a6b4-41a7-8fe3-327987cfce71', 'd1c118a9-c74d-4775-964f-e1e298a24135', 'thi', 'luyến pham', '', '', '', 'new york nails . kölner straße 48', '', 'grevenbroich deutschland', '41515', 'Germany', true, '2026-01-07T02:20:08.478Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9234c787-f5ef-40cf-a717-72ad1853ac85', '04d7aaff-da8a-4eb2-81d4-33ffb101d9d7', 'Pivovarska', '24', '', '', '724682598', 'Lenka nail studio ; 24 Pivovarska ; 34601 Horsovsky tyn ; 724682598', '', 'Horsovsky tyn', '34601', 'Germany', true, '2026-01-07T02:20:08.488Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0a8287b2-dba7-473c-8e18-23def5e44870', '0020980c-368f-421c-acf5-235b44b4cb09', 'thi', 'thu dung Kieu', '', '', '', 'lange str. 74', '', 'Detmold', '32756', 'Germany', true, '2026-01-07T02:20:08.491Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('216f6856-6f55-4141-9a89-ced82c4e2473', '9537b33b-0c08-4b8d-a4c8-9e6907c28c24', 'Bochum-Wattenscheid', '44866', '', '', '', 'Tommy Nails Nagelstudio Oststr. 20', '', 'Bochum-Wattenscheid', '44866', 'Austria', true, '2026-01-07T02:20:08.512Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9218849b-0801-4ce6-bf51-1d25540cdc07', 'ceca566b-1456-4e0e-b770-ca2efaf6be57', 'Thai', 'Hưng Pham', '', '', '', 'Pham Thai Hưng ; Martins Nails; Tiberstr.21; 48249 Dülmen; Deutschland', '', 'Dülmen', '48249', 'Germany', true, '2026-01-07T02:20:08.520Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('db2cf76a-1165-429b-a4d1-e1d09fdded0f', '6a79fdad-7464-43ba-aedc-e13c4f3302b7', 'Thi', 'Thu Hien Dau', '', '', '', 'Bahnhofstr 92', '', 'Herne', '44629', 'Germany', true, '2026-01-07T02:20:08.763Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('84e8cb78-69bc-41bb-844f-5af0b8143eaf', '7cafaca4-4601-4262-87c9-d0787ef05258', 'Trung', 'Hoang Duc', '', '', '', 'Rathausstrasse 9', '', 'Winsen', '21423', 'Austria', true, '2026-01-07T02:20:08.752Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b4752fa0-262f-4516-a502-7aedb81911f9', 'e4f235ad-70ab-4497-bc42-faa57bd4e6cf', 'chuvuhongduc', 'chuvuhongduc', '', '', '12342277', 'Bon Nails  Wichlinghauser 123', '', 'Wuppertal', '42277', 'Germany', true, '2026-01-07T02:20:08.765Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eae78d2c-5e75-4bc2-a734-27a720b72e35', '054269ae-62af-443b-b15b-97ace496c7b0', '-', 'Dein Nageldesigner Louis', '', '', '437441', 'Kölner Landstraße 437-441', '', 'Düsseldorf', '40589', 'Germany', true, '2026-01-07T02:20:08.986Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d1e81df1-bef6-49f0-b0e0-a6522baaf80a', '1f65a012-6801-4352-924c-bece00b00496', 'huy', 'hoang Nguyen', '', '', '', 'Eisenbahn str 13', '', 'Homburg', '66424', 'Germany', true, '2026-01-07T02:20:08.998Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('50ed5b67-4dfb-45bd-bbce-e4289228f478', 'f1571e77-3483-4e64-8ecd-d272bc66a8b4', 'huy', 'nguyen Van', '', '', '', 'Bertha-von-Suttner-Platz 2-4', '', 'Bonn', '53111', 'Germany', true, '2026-01-07T02:20:09.009Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('17de2f25-aee0-4306-b66b-de5907615fa6', '6f9e5a3f-7048-4b3a-8fab-faaf109d5841', 'Lê', 'Giang', '', '', '18728401', 'Masarykova 187', '', 'Kutna Hora', '28401', 'Germany', true, '2026-01-07T02:20:09.016Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('522704f1-ada2-482c-9397-52b63fd536f4', '81512efc-a6f9-4d87-abee-7b731a7d2c16', 'Tran van Ngo', '778097668', '', 'davienails999@gmail.com', '+420778097668', 'Francouzská 75/4', '', 'Praha - Vinohrady', '12000', 'Czech Republic', true, '2026-01-20T09:49:05.367Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b7881837-72b4-4da4-a672-33739311cf1b', '2e49b044-2fa1-4f64-9d3c-e38c65edf6d4', 'Thi Minh Chi', 'Do', '', 'davienails999@gmail.com', '+420722609456', 'Sofijské náměstí 3400/6', '', 'Praha 4 - Modřany', '14300', 'Czech Republic', true, '2026-01-20T09:49:05.813Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('109529ff-df0c-4e2d-b330-6e778c449697', '2548c16e-5fad-4b8c-94f0-0e4cc2ad789c', 'hong ngoc', 'Do', '', '', '', 'Do hong ngoc; Q4', '', '', '', '', true, '2026-01-20T09:49:58.551Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('254f6944-5cba-4b21-8109-b58812fd1290', '1d64a393-ed4b-4ff5-9ab9-67cc6317a1dc', '20', 'Dudweilerstr.', 'CITY NAILS', 'davie.lam01@gmail.com', '', 'Dudweilerstraße 20', '', 'Saarbrucken', '66111', 'Germany', true, '2026-01-20T09:49:59.998Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ff6fbbe3-d7fb-43d4-92b0-6450ca7588a8', 'e9d438bf-48cd-4f2c-9f2c-a665dfd77f29', 'Hai', 'Pham Dinh', '', 'davienails999@gmail.com', '', 'Bahnhofstraße 32', '', 'Frankenthal (Pfalz)', '67227', 'Germany', true, '2026-01-20T09:50:00.444Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('294ee6ea-b6e7-4d81-b979-8ed3cf5fd17a', '45daa943-a737-45d6-bbd7-30d94809fa58', 'Thanh Binh', 'Nguyen', '', 'davienails999@gmail.com', '', 'Münzgasse 31', '', 'Bad Mergentheim', '97980', 'Germany', true, '2026-01-20T09:50:01.888Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('02347418-d39c-4f67-994a-5aba7c4e56f5', '8d723bf5-42d1-4b46-9c6c-6fdd04429b9e', 'thi lien', 'Phan', '', 'davienails999@gmail.com', '', 'Fronecke 11', '', 'Waiblingen', '71332', 'Germany', true, '2026-01-20T09:50:02.665Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4961dfd7-8d09-4add-97e6-83b079047624', 'bfeeb950-f0c7-4144-a1e1-b1cdcdcecd0c', 'Hao', 'Tam Nguyen', '', '', '', 'donau', '', '', '', '', true, '2026-01-20T09:50:03.445Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7d462d98-5354-4e7f-9ef2-01b7c3ca51c0', 'dfb98a31-62ea-4478-a07b-225b4df28250', 'Svaty', 'KD', '', '', '', 'KD Svaty', '', '', '', 'Österreich', true, '2026-01-20T09:50:05.556Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a1328fe3-8749-4c15-aa63-e7168bf7d4e1', 'db0135d5-d5e0-4e69-88ce-16f38ac5d355', 'trinh', 'Thao', '', '', '29301841', 'Luna nails nechtove studio Namestie matice slovenskej 1708/293', '', '', '1708', 'Österreich', true, '2026-01-20T09:50:06.334Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3e9815f0-2c65-4afc-80b0-322c72677cec', 'fc1ca6d9-3e13-4744-b2a7-a14b7325376d', 'leminhhoang1994', '', '', 'davienails999@gmail.com', '', 'Krausnickstraße 12', '', 'Berlin', '10115', 'Germany', true, '2026-01-20T09:50:08.480Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b8790cb1-5ed0-43d1-8d64-fa090cbd60cf', '9b5a35b2-e192-4aec-b6ca-4f0869e244e9', 'van Hien', 'Nguyen', '', 'davienails999@gmail.com', '', 'Güterstraße 01', '', 'Bad Säckingen', '79713', 'Germany', true, '2026-01-20T09:50:09.919Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dc654162-970f-4720-9792-4a9a9826603f', '19ff732e-8253-4a79-a889-d492c04cb5cc', 'khanhbang.le.1238', '', 'Sportovní 21 , Eunails kaufland královo pole , Brno 61200 ,le Thi Duong 773 199 956', '', '773199956', 'Sportovní 21', '', '', '61200', 'Deutschland', true, '2026-01-20T09:50:12.369Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3845f7aa-8d8c-47c1-a76a-749b3741e4dd', '9e4b56a7-5ec0-40a9-9150-96da0ce88e9b', 'Levice)', '(Tesco', 'Rubin Nails, Turecký rad 7, 934 01 Levice, Slovakia', '', '93401', 'rad 7', '', '', '', 'España', true, '2026-01-20T09:50:12.813Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('061e2008-d623-43c6-ad1b-bbec8d2424aa', '0749f947-8dfb-411e-a7d7-d6b5024ec5ee', 'Thanh Xuan', 'Tran', '', '', '', 'ampujankatu 20', '', '', '00150', 'Österreich', true, '2026-01-20T09:50:17.257Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b19d8df-60e6-4d7a-bd1d-a79af3f9c536', '5d06dbe3-6189-4343-b339-1391064099bc', 'trần thị bích', 'tên:', '', '', '', 'Husova tř. 544/65', '', '', '', 'Deutschland', true, '2026-01-20T09:50:19.030Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('608b4c75-b7f8-4436-ae9d-e379d8d1d729', '4d684dcc-1603-4c47-b88f-93d9a3b62c6d', '1945/182', 'Hartigova', 'Tocviet Salon', 'davienails999@gmail.com', '+420775008686', 'Hartigova 1945/182', '', 'Praha - Žižkov', '13000', 'Czech Republic', true, '2026-01-20T09:49:06.257Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d47f6dee-10a5-4d4a-b610-9484493f433e', '542aeacb-03cf-4098-8eb5-02c5cf415f88', 'Pham', 'Thao', '', 'davienails999@gmail.com', '+420778552688', 'Matějovského 683/5', '', 'Praha - Radotín', '15300', 'Czech Republic', true, '2026-01-20T09:49:07.597Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c49a8312-7dda-4af7-9ca1-1497c6ff9ead', '624f3524-3787-4246-b398-b9b34dd9901f', 'Linh', 'Anh', '', 'davienails999@gmail.com', '+420792395007', 'Nuselská 296/3', '', 'Praha 4 - Nusle', '14000', 'Czech Republic', true, '2026-01-20T09:49:09.715Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ea071190-f490-459f-8532-1964edcef846', '0eed41a2-ce4a-48c6-af5b-1c35c32afd9f', 'Pankráci 86', 'Na', 'VIP salon', '', '776866567', 'Na Pankráci 86', '', '', '', 'Česko', true, '2026-01-20T09:49:18.005Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('53be3552-31d4-40fc-9739-f7509fbc1f13', 'ad517fa5-b8c0-4f9a-a22a-4931f5e69b72', 'Hai Yen', 'Tranova', '', 'davienails999@gmail.com', '+420775947277', 'Štěpánská 640/45', '', 'Praha 1 - Nové Město', '11000', 'Czech Republic', true, '2026-01-20T09:49:18.449Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('89cf4bfd-ed91-4761-a6f7-a0b5ba2c2538', '24c7065f-06de-4a9b-a838-a73f87a3d519', 'Thu Ha', 'Nguyen', '', 'davienails999@gmail.com', '+420258212211', 'Nad Libušským potokem 526/4', '', 'Praha 4 - Písnice', '14200', 'Czech Republic', true, '2026-01-20T09:49:18.893Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ffb729d9-37d4-412f-b410-2a24cde9a7c7', '8e01179f-d588-4046-b53c-b9324501b5be', 'Văn Nhất', 'Mạc', '', 'davienails999@gmail.com', '+420602893089', 'Jana Přibíka 951/11', '', 'Praha 9 - Vysočany', '19000', 'Czech Republic', true, '2026-01-20T09:49:19.337Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dd3527e1-b722-453a-be87-0dfcd47530da', '9f6431a3-eb85-4e0c-b0e4-a7b979c6c7c6', 'Ha Duong', 'Thanh', '', 'davienails999@gmail.com', '+420775161899', 'Československého exilu 2154/26', '', 'Praha - Modřany', '14300', 'Czech Republic', true, '2026-01-20T09:49:19.783Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ce6c4aee-b18f-44f3-84b2-31bb26f0c1e2', 'c2d79feb-be7b-452d-a031-2c30835e6217', 'Thuy', 'Pham', '', '', '', 'wolfgang', '', '', '', '', true, '2026-01-20T09:49:20.894Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5af334c0-3662-4ff2-bfce-29284afeb97c', '1cdbde44-9ee6-4eed-9ee9-7eaf826573ed', 'Huyền', 'Trần', '', '', '', 'Sunflow; ; flower; ; NEHTOVÉ STUDIO', '', '', '', '', true, '2026-01-20T09:49:21.339Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c919588e-f043-488e-ade4-001f7a8c9681', '7113c124-c02d-40a0-85d4-68b681adfd3d', '420792399011', '', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:49:22.451Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eeda102c-2de8-4609-940d-0f97be67c511', '723a0b6b-d24a-4309-bf85-d94b920dd12b', 'thi huong', 'Nguyen', '', 'davienails999@gmail.com', '+420775414678', 'Komunardů 1048/15', '', 'Praha 7 - Holešovice', '17000', 'Czech Republic', true, '2026-01-20T09:49:23.239Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('01790c30-06b4-4e84-bf85-546df59e89d8', '376a3876-248e-419f-9df8-fee768591bb6', 'Chau Nhi', 'Nguyen', '', 'davienails999@gmail.com', '+420777562334', 'Vojtěšská 245/1', '', 'Praha - Nové Město', '11000', 'Czech Republic', true, '2026-01-20T09:49:24.352Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ddf001a8-203b-46c1-aae6-8664827769be', '142f0ace-e2b3-4648-93a4-9bd0ca9fa556', '6', 'Herrnstrasse', 'Khuu Ngoc Phuong (City Nails)', 'davienails999@gmail.com', '', 'Herrnstrasse 6', '', 'Offenbach am Main', '63065', 'Germany', true, '2026-01-20T09:49:27.465Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('263ba346-4bcf-4a21-81b8-44853ca1b833', '8cf66afa-fb40-40a3-861e-d62260202fe7', 'Út', 'Nữ', 'Le Van Kien Horní Folmava 42 Česká Kubice 34532 (Dana Studio) Sdt: 792397016', 'davienails999@gmail.com', '+420792397016', 'Horní Folmava 42', '', 'Česká Kubice - Horní Folmava', '34532', 'Czech Republic', true, '2026-01-20T09:49:07.147Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f32778b3-a8f3-4302-aeb1-dc8bb22e24df', '9ef537b3-7fb8-4bb0-a3a8-9eb95f337cae', '725 637 580', '+420', 'M&H BEAUTY', 'davienails999@gmail.com', '+420725637580', 'Horní Folmava 99', '', 'Česká Kubice - Horní Folmava', '34532', 'Czech Republic', true, '2026-01-20T09:49:10.500Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ea3470ea-437f-4622-a021-371e9daf503e', 'be6bf428-f2d5-4c6f-ba4c-ed39eadc3d48', '1398/34', 'Belohorska', '', 'davienails999@gmail.com', '+420775410022', 'Bělohorská 1398/34', '', 'Praha - Břevnov', '16900', 'Czech Republic', true, '2026-01-20T09:49:11.727Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f747c2dd-c53e-451d-bafb-7fd828ea8166', '70ff1387-dbef-4a60-9d07-991f9252f02c', 'dt 776189107', 'Số', 'Le thi thao, lesalon : Archeologicka 2256/1 praha 5  15500.', 'davienails999@gmail.com', '+420776189107', 'Archeologická 2256/1', '', 'Praha - Stodůlky', '15500', 'Czech Republic', true, '2026-01-20T09:49:12.894Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b9ee0ea2-742c-4653-bf64-155d1f2b1da4', '5807741d-f8f9-497c-9705-b9ffa68f00d2', 'Thu Huong', 'Vu', '', 'davienails999@gmail.com', '+420702939502', 'Palackého 5405', '', 'Chomutov', '43001', 'Czech Republic', true, '2026-01-20T09:49:13.337Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4bf9b211-8e12-4427-b238-d5961b65ebf9', '5a3826da-9bc4-4a06-911d-ae528e45d3f4', 'Tung Duong', 'Tran', '', 'davienails999@gmail.com', '+420728228239', 'Jílovská 452/12', '', 'Praha 4 - Lhotka', '14200', 'Czech Republic', true, '2026-01-20T09:49:13.782Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('180a4a1f-8954-44cf-a53c-112adb8d3c9c', 'dc55982c-de9b-42b8-8b96-8fb6bcb2f3c2', 'Hồng', 'Minh', 'Christina Nails', '', '', 'Christina Nails', '', '', '', '', true, '2026-01-20T09:49:14.561Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('61df7478-15ed-4b4d-8dfc-5eef35561bb1', '2ad07f8e-1f1b-4c58-8290-aa004f83ada6', 'thi Tam', 'Nguyen', '', '', '', 'Nguyen thi Tam ; Team Leo Nails Studio im Globusmarkt ; Main-kinzig Str.21  , 63607-Wächtersbach', '', '', '63607', '', true, '2026-01-20T09:49:45.092Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('75c86194-3e49-4065-9949-e6bd86366a35', '8ecb5135-6a4d-43d9-869f-772b4c519f64', 'Phạm', 'Chi Mai', '', '', '10579811', 'Pham Chi Mai-Vrahovická 471/105', '', '', '', 'Deutschland', true, '2026-01-20T09:51:53.990Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('745a643d-e653-4b19-9090-43d12d821ea7', '94b4ff42-f055-4412-bbb1-dc2a82697b32', 'Nguyen', 'Thi Hoa', '', '', '', 'Glam', '', '', '', '', true, '2026-01-20T09:51:54.770Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3809b4cc-8898-4833-bafe-282b5e16718b', '32c819ee-6b92-47ba-9413-7241a27eee40', '38', 'Königsplatz', '', '', '', 'Königsplatz 38', '', 'Kassel', '34117', 'Austria', true, '2026-01-07T02:20:05.114Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('574baa5d-f32b-4b6d-851e-3c459f649e66', 'e7392f78-49a8-461a-9b7e-a83be7839d7f', 'Ba Tung', 'Dinh', '', 'davienails999@gmail.com', '+420775377640', 'Rudolická 1706/4', '', 'Most 1', '43401', 'Czech Republic', true, '2026-01-20T09:51:55.216Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ee8734ed-dea1-4c3f-8ec7-0a1b3025d69a', '81b02bcc-f5a4-4328-b7cc-722e307f76fb', 'Hong Dat', 'Doan', '', 'davienails999@gmail.com', '421917726907', 'Mlynská 22', '', 'Košice', '04001', 'SK', true, '2026-01-20T09:51:55.661Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8ac6fe73-0876-45d8-969f-8e3750ffca96', '32e6b27b-fcea-4db1-8afa-b198227d142a', 'czthanglong', '', '', 'davienails999@gmail.com', '+420792707243', 'Nádražní 107', '', 'Jablunkov', '73991', 'Czech Republic', true, '2026-01-20T09:51:56.105Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d6d59b30-5c96-4f7a-9144-e7f0ab05768e', '5b57e8c6-d4a4-4df3-b574-b0d9c89f5ebf', 'Thị Thanh Huyền', 'Nguyễn', '', 'davienails999@gmail.com', '', 'Opelstraße 3', '', 'Konstanz', '78467', 'Germany', true, '2026-01-20T09:51:56.880Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5fe0e6db-98c0-40b5-bb01-9f262354764e', '50e2384d-eb6c-44ec-bc1b-50f9bbd4fe5d', 'Straße 42', 'Aschaffenburger', 'My Nails', 'davienails999@gmail.com', '', 'Aschaffenburger Straße 42', '', 'Kahl am Main', '63796', 'Germany', true, '2026-01-20T09:51:57.324Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7ba88d7a-1de5-4842-8d11-cf3bcf4dff95', 'b093db16-832f-4cb1-a792-65a4be60901d', 'robinhiep', '', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:51:58.433Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('51ce07dd-fb26-457a-a6d4-1eb9add658c4', '8270c8df-351b-4092-88d5-cd568df8e8b6', 'Ut', 'Trien', 'Nagelstudio by Ut Rennweg 12 930 49 Regensburg', '', '1293049', 'Nagelstudio by Ut Rennweg 12', '', '', '', 'Deutschland', true, '2026-01-20T09:52:00.876Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('43887b25-97cd-4d75-b678-ea3afbaef4d8', 'cc78d42e-9190-4b04-96cf-3dcba1769593', 'Hậu', 'c', '', '', '', 'c Hậu', '', '', '', '', true, '2026-01-20T09:52:01.652Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f6bb76bf-12c9-421d-a4d4-d31df248a055', '55f61917-5530-4bf4-8dd4-557d40fd4d00', 'huonggiang.nguyen.370', '', '', '', '', 'pickup', '', '', '', '', true, '2026-01-20T09:52:02.095Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6866e16a-35a9-4de3-94cf-7a243eff32f6', 'cd287273-6485-4506-af94-e33687ef3fa3', 'Lan Huong Le', 'Thi', '', '', '', 'Thi Lan Huong Le; Lena Nails; Philipp-Reis-Passage; 61381; Friedrichsdorf', '', '', '61381', '', true, '2026-01-20T09:52:02.539Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('87425ce9-0868-4ff0-b5ea-7646549d8d41', '9c6d377f-d096-4d2b-893c-c43d0a59dde8', 'Hai Giang', 'Thi', '', 'davienails999@gmail.com', '34225', 'Postplatz 9', '', 'Schwerte', '58239', 'Germany', true, '2026-01-20T09:52:04.706Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7a2416d3-027c-4fbf-bd03-8c7cc8fa7ee2', '27f3d3f5-f4f7-4ba5-8116-e548cafc6ade', 'Thuy', 'Nguyen', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6b8d27b1-a677-46ba-9be2-28e58953999c', '79c0fc62-ca55-4940-81c5-a0656adab045', 'mymyvu.vu1', 'mymyvu.vu1', '', '', '176684', 'Im Kaufland Thomas-Howie-Straße 1', '', 'Östringen', '76684', 'Germany', true, '2026-01-07T02:20:04.815Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('81853c74-3cad-49ac-8ad4-8922f83cc055', '4b897fb0-f3fe-4ea0-bdc6-9b935213ef6e', '117', 'Radlická', '', '', '774428999', 'Radlická 117', '', 'Praha', '15800', 'Czech Republic', true, '2026-01-07T02:20:04.843Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a4e203e8-bab6-406b-bcad-39bf56f77a10', '10405102-830f-40d6-ab77-d7388feaf329', 'Thi', 'Ngoc Anh Mai', '', '', '9244629', 'Bahnhofstr 92', '', 'Herne', '44629', 'Germany', true, '2026-01-07T02:20:04.847Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b87d55f0-84c8-4b9e-81a6-30a8fe66f28e', '35740754-38f9-4fc2-8d8d-b41ae00aca77', '25', 'Sonnenwall', '', '', '', 'Sonnenwall 25', '', 'Duisburg', '47051', 'Germany', true, '2026-01-07T02:20:04.867Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f280c9ec-ab46-46f7-8337-651090bc98a2', 'f0f8103a-4e85-41f8-9fb9-72439f908a9d', 'brühl', '50321', '', '', '', 'Hanna nails ; Uhls56 ; 50321 brühl', '', 'brühl', '50321', 'Germany', true, '2026-01-07T02:20:04.870Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8641563c-66d4-4840-a9fd-7108fb07efdd', '58286e1f-b9e5-4692-9fac-382fa50cf42e', 'nguyen', 'Thanh', '', '', '', 'New york nails/ im rewe; Thanh nguyen; Hertinger str15; 59423 UNNA', '', 'UNNA', '59423', 'Germany', true, '2026-01-07T02:20:04.878Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1a344282-dcd0-49a0-a175-fb507963de1d', '05b43be7-0ace-41c6-bcec-c604aa5246e5', 'Náils', 'CaliX', '', '', '', 'Altengraben 20', '', 'koblenz', '56068', 'Germany', true, '2026-01-07T02:20:04.880Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c9e28051-fb22-4afb-b27f-e2b6f9b6e38f', '09d74f6c-96a5-41d8-91f4-32d717fdc364', '100008758509251', '100008758509251', '', '', '', 'Bahnhofstraße 24', '', 'Wörth am Rhein', '76744', 'Germany', true, '2026-01-07T02:20:04.883Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('667dab8f-3ff3-41c8-9cfd-c057fc350c14', 'e8b3bec2-36c8-4095-acb4-c22eb466a19f', 'Duc', 'Minh Ngo', '', '', '', 'Hans-Bredow-Str. 19', '', 'Bremen', '28307', 'Germany', true, '2026-01-07T02:20:04.887Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6f1723e4-af6a-4c8a-a298-20da5d6ff05e', '39c03f2e-3a33-43b0-91f8-4c22305864d6', 'hoangthieu1st', 'hoangthieu1st', '', '', '052196781588', 'Herforder str 8A', '', 'Bielefeld', '33602', 'Germany', true, '2026-01-07T02:20:04.900Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6a708a6d-dc7f-4903-b117-2d439c9a4316', 'a5da8695-7c77-495e-be1a-d2a9357a7347', 'Thi', 'Thanh Thoan Ha', '', '', '', 'Neustadt 19', '', 'Ansbach', '91522', 'Germany', true, '2026-01-07T02:20:04.905Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('12bcc1d8-5d28-46bb-aef0-58c9394cf41f', 'b863d1e2-fb97-4e49-9a50-08ae0c06a28e', 'Nhi', 'Nguyen Thao', '', '', '', 'Kleinmarschierstr. 35', '', 'Aachen', '52062', 'Germany', true, '2026-01-07T02:20:04.907Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('282a2172-ad37-497b-8aed-484db83e830f', '4dab6ab2-e499-4d69-9370-e51f200accb4', 'gửi', 'hàng tới Bạn', '', '', '', 'Reschop Carre Platz 1', '', 'Hattingen', '45525', 'Austria', true, '2026-01-07T02:20:04.910Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6789ae61-8989-404d-8e53-64cbf61d658a', '2077f70e-4a11-4e98-b89b-bf72c2e24fc8', 'Dehl', 'Frank', '', '', '', 'Dachsweg 6', '', 'Dossenheim', '69221', 'Germany', true, '2026-01-07T02:20:04.915Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e2b08648-c6d4-4c9d-b99e-5f5119e16ee8', 'fa12dc66-3e83-4768-96cf-f147baf104fa', 'Osterholzschambeck', '27711', '', '', '', 'Ruby nails.; Kirchenstr12 ; 27711 Osterholzschambeck', '', 'Osterholzschambeck', '27711', 'Germany', true, '2026-01-07T02:20:04.927Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7aa9bb2a-0e83-4b47-9eeb-6222df13b163', 'ba51bb6d-7f63-4db5-a43e-9447d535505b', 'str.', '121 Hindenburg', '', '', '', 'Hindenburg str. 121', '', 'Möchengladbach', '41061', 'Germany', true, '2026-01-07T02:20:04.930Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8420972e-8054-4889-ba5a-5b70ccd0a7e6', '18b82f96-1cc5-4e94-8f25-71b61a72ca2f', '93', 'Saarstrasse', '', '', '', 'Saarstrasse 93', '', 'Trier', '54290', 'Germany', true, '2026-01-07T02:20:04.942Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bf4b70c8-1db6-4ac1-8493-93dd501234a4', '9ced5c8b-e57d-4bb9-a8d4-f6c89ea98d72', '34', 'Ludwig-Jahn-Straße', '', '', '', 'Ludwig-Jahn-Straße 34', '', 'Freudenstadt', '72250', 'Germany', true, '2026-01-07T02:20:04.943Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('42d902a7-184d-4fa4-94d8-544504947ec0', 'd2382b99-7dee-4cf6-ab3b-16bc15efc70f', 'Str.', '226 Friedrich', '', '', '', 'Friedrich Str. 226', '', 'Berlin', '10969', 'Germany', true, '2026-01-07T02:20:04.946Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('489ec715-690a-40bb-a02a-6d2acf1c7583', '2efe1f5f-9430-4ff0-b235-97aa7504eee8', '35', 'Kleinmarschierstr.', '', '', '', 'Kleinmarschierstr. 35', '', 'Aachen', '52062', 'Germany', true, '2026-01-07T02:20:04.961Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c31d9730-75bf-427f-86d2-b00920440eb6', 'f3cf0de2-9770-4637-828c-315969d90cac', 'Str.', '2-4 Breslauer', '', '', '', 'Im Rheinpark Center Neuss - 2', '', 'Neuss', '41460', 'Spain', true, '2026-01-07T02:20:04.965Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b2213960-ee43-4cf2-bf6d-c1aac8cf69b7', '11107c2e-142a-43ba-b8eb-e563acb02997', 'Ngan', 'Simon Kim', '', '', '', 'Marienstraße 16', '', 'Übach-Palenberg', '52531', 'Spain', true, '2026-01-07T02:20:04.978Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('86368849-5fcd-4e38-a119-98d85edb8fbb', '1aaf169c-b4b8-44c6-bb91-f243daa34d06', 'Nguyen', 'Diana', '', '', '', 'Münzgasse 4a', '', 'Konstanz', '78462', 'Germany', true, '2026-01-07T02:20:04.977Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('28bf7838-9c36-4147-9e79-3b0850dfc589', '644fcb9c-00df-4186-b929-e1610dbd5530', 'der', 'Mark 78 In', '', '', '', 'In der Mark 78', '', 'Kirchlengern', '32278', 'Germany', true, '2026-01-07T02:20:04.977Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('37d92bb6-a90e-48ad-a7a9-ba432f932118', '580133b5-7680-47ff-b7bb-36bb49c618bc', '14', 'Hauptstraße', '', '', '', 'Hauptstraße 14', '', 'Bergheim', '50126', 'Germany', true, '2026-01-07T02:20:04.984Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9fe3ca4d-89bd-4020-b3c2-7d85b92c38fc', 'bde578ab-0a99-473e-947d-98e3dfbdb33e', 'minh', 'Le', '', '', '', 'Berlinerstraße 22', '', 'kehl', '77694', 'Germany', true, '2026-01-07T02:20:04.998Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5f6eb506-65ee-4210-b7c5-cb9734ac9390', 'ac4e6bef-94a8-498d-b36c-c4b16cf33d47', 'Bleiche', '16 Hintere', '', '', '', 'Hintere Bleiche 16', '', 'Mainz', '55116', 'Germany', true, '2026-01-07T02:20:04.998Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bb87e5f6-38f5-4d06-ba80-3d1d0d02be72', 'fc978aa4-f115-4451-8013-47a7c096a539', 'Galerie', 'Altmarkt', '', '', '01069', 'Webergasse 1', '', '- Dresden', '01069', 'Germany', true, '2026-01-07T02:20:05.000Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8f272d27-655a-4ffc-a92e-ddba71f601c3', 'fe85ee50-3d9a-44d6-82c3-46225350f406', 'Singen', '78224', '', '', '', 'Kim Nails ; Schwarzwald.4a; 78224 Singen', '', 'Singen', '78224', 'Germany', true, '2026-01-07T02:20:05.001Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('832a3cf7-bbf9-4694-9c7b-dfcc175ead16', '17f4a54e-9e10-431a-a81c-4c8aee045744', 'Thi', 'Lin Da Ho', '', '', '728488740', 'Kupeckého 764/11', '', 'praha', '14900', 'Czech Republic', true, '2026-01-07T02:20:05.019Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('af2a8457-ec5a-4551-9197-6d4e57943d4b', '3cab63c3-4a2a-4c9b-b395-bd4d267be4a5', 'THI', 'VAN NHUNG NGUYEN', '', '', '44001', '- LOUNY - 44001', '', '- LOUNY -', '1974', 'Czech Republic', true, '2026-01-07T02:20:05.020Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dbaa09d1-fb68-4f9c-a118-650f952f6285', 'b4371372-57d1-4a31-ba9d-630fbf3d7ba4', '45', 'Fallersleberstrasse', '', '', '', 'Fallersleberstrasse 45', '', 'Braunschweig', '38100', 'Germany', true, '2026-01-07T02:20:05.021Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9b9fa68a-c0aa-4130-9ceb-f3439d33df33', '4d8ccada-ff6d-4a39-898a-89fa56657e56', '5', 'Dorotheenstraße', '', '', '', 'Dorotheenstraße 5', '', 'Düsseldorf', '40235', 'Germany', true, '2026-01-07T02:20:05.022Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3f6cd5c5-c9bd-4ff0-9458-4c6c33c12b22', '2c019401-f30b-4180-9174-e323a5881f54', 'Thi', 'Thu Loan Tran', '', '', '', 'Färbergäßchen 3', '', 'Augsburg', '86150', 'Germany', true, '2026-01-07T02:20:05.026Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('993e13b5-b591-46ef-b0df-5ff64efeccce', 'c550d7ab-44a0-41cb-a436-e0ea72c1f6dc', 'chỉ', 'Địa', '', '', '', 'Wilhelmstraße 28', '', 'Bad Kreuznach', '55543', 'Germany', true, '2026-01-07T02:20:05.042Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b08cb98a-87e1-4895-bca0-36d9c6d856aa', '8ac7b5a9-8775-45ea-8671-9e4f1a1dec2e', 'thi', 'thanh phuong Luu', '', '', '', 'Marien str 32', '', 'Meerane', '08393', 'Germany', true, '2026-01-07T02:20:05.047Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b52e25f-a4f1-4e3e-94ec-7be5537551c5', 'a554fe40-4c8a-406a-a45c-210ebfc600d4', 'Platz', '14 Berliner', '', '', '', 'Berliner Platz 14', '', 'Oer-Erkenschwick', '45739', 'Austria', true, '2026-01-07T02:20:05.048Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3cfe50f6-85f5-4c2f-ab55-f5f857a900e3', '9496644b-ce12-46b9-843c-7b83c12edb73', '38', 'Schwarzwaldstraße', '', '', '', 'Schwarzwaldstraße 38', '', 'Frankfurt', '60528', 'Germany', true, '2026-01-07T02:20:05.051Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bf83dd72-58ff-4fea-a4a2-d2d8a5bbcc8e', '17310bb4-41fb-4703-ba97-dfdab84d4b6a', 'Thao', 'Nguyen Thi', '', '', '26384', 'Gökerstr . 86', '', '- Wilhelmshaven', '26384', 'Germany', true, '2026-01-07T02:20:05.052Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('34fc21bc-7e5a-48de-8643-50e6a90f5c24', 'bc702e74-cf7f-47e8-9ed7-cfe2dd5c737c', 'hoangtrang20', 'hoangtrang20', '', '', '', 'Rheinstr 8a', '', 'Nastätten', '56355', 'Germany', true, '2026-01-07T02:20:05.066Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6a5b9806-bc89-4193-902e-97695f357440', '36302d06-ca5b-4d09-8679-ac3cfe43a2c8', 'chi', 'cua Chi Dia', '', '', '', 'Deichhof 11-13', '', 'Minden', '32423', 'Germany', true, '2026-01-07T02:20:05.069Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('62d4a9f5-ec19-4032-9ac7-4a78af9f338b', '372fd3f1-7e99-40e9-9aed-799b2f2d1d3f', 'Polished', 'Get', '', '', '', 'Nidacorso 11', '', 'Frankfurt am Main', '60439', 'Germany', true, '2026-01-07T02:20:05.082Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9b997156-c9c9-49dc-8ce9-74b5abd61fa2', '67178631-4de8-4c66-b520-0bceabbe7595', 'Thị', 'Bích Hoa Nguyễn', '', '', '052512840286', 'Am Westerntor 9', '', 'Paderborn', '33098', 'Germany', true, '2026-01-07T02:20:05.148Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0478cc8b-042f-48e4-bf3f-21fd3a82d384', '04542e88-6e4a-4f21-a35c-6d56336a5c77', '12', 'Von-Brug-Straße', '', '', '', 'Von-Brug-Straße 12', '', 'Garmisch-Partenkirchen', '82467', 'Germany', true, '2026-01-07T02:20:05.149Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7537f196-77f2-4cb5-aacd-a70bbd16e3b2', '525148bf-32d3-4e50-9ef5-977c7105d235', 'weg', '1 Müscheder', '', '', '', 'Müscheder weg 1', '', 'Warstein', '58591', 'Germany', true, '2026-01-07T02:20:05.154Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9f190232-d284-46c3-aec6-4604fd97bcaa', 'a1ca9a42-c7d9-4a1e-9640-dc0e7908cda9', 'Hürthpark', '(Laden-Nr. 85) im', '', '', '', 'Laden-Nr. 85', '', 'Hürth', '50354', 'Germany', true, '2026-01-07T02:20:05.157Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d504bd33-2d3c-4c12-bf18-0f97ce452ff0', '1d447fdf-4218-47b5-b645-fda2dff8fb8c', '65', 'Königstraße', '', '', '', 'Königstraße 65', '', 'Landau in der Pfalz', '76829', 'Germany', true, '2026-01-07T02:20:05.169Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7d937feb-27c1-4d0d-a2bd-bf51a5b67275', 'a2d2e0cd-1839-49fc-a0a9-740adfa94ef8', 'chi', 'nha chi Dia', '', '', '', 'Hafnergasse 6', '', 'Neckartenzlingen', '72654', 'Austria', true, '2026-01-07T02:20:05.187Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('97c692e1-4a72-4952-bff1-062ef7c5273c', '980b85ef-8346-4e73-8f74-a13577d1412c', 'WERKStadt', 'Einkaufzentrum', '', '', '', 'Joseph-Schneiderstr. 1', '', 'Limburg', '65549', 'Germany', true, '2026-01-07T02:20:05.202Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ca58fbea-6e4e-44ce-9906-20d12a0d449f', 'db005b8e-7c5e-445f-9026-618707a34a94', 'Thanh', 'huyen nguyen Thi', '', '', '', 'Thomas-Howie str 1', '', 'Östringen', '76684', 'Germany', true, '2026-01-07T02:20:05.206Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dc0dfa59-3216-4bc7-b037-76c9a194e94d', 'fee937b4-8815-45c9-981a-a17d2ca173ce', 'Center)', '(Rhein', '', '', '', 'Hauptstr. 435', '', 'Weil am Rhein', '79576', 'Germany', true, '2026-01-07T02:20:05.215Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('77df533c-fc54-4e13-b939-e7883939bad9', 'c0c70fd4-54e3-4d15-9b2d-85819dddc471', 'Nguyen', 'Nini', '', '', '', 'Mittelstr. 28', '', 'Laupheim', '88471', 'Germany', true, '2026-01-07T02:20:05.228Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('aa23838c-fb02-41b3-9298-7538c43e5903', '1f7dee51-4a5b-4089-8b0e-cd616ac0bb51', '4', 'LuwigStraße', '', '', '', 'LuwigStraße 4', '', 'AUGSBURG', '86152', 'Germany', true, '2026-01-07T02:20:05.234Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('efbd68de-d1b2-4432-b5c5-22352c392790', '2af86cb3-f38e-414b-a889-3b133bf756f9', 'Thuy', 'Hong Bui Thi', '', '', '629221', 'Schuhstraße 6', '', 'Celle', '29221', 'Germany', true, '2026-01-07T02:20:05.238Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ec81a2c9-8645-4dcf-9219-0ce2151ce30c', 'bc58b166-c115-444a-94c6-0619cde21141', 'Linh', 'Dao Huy', '', '', '', 'Steinweg 4', '', 'Braunschweig', '38100', 'Germany', true, '2026-01-07T02:20:05.261Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dc501e29-87d4-4d0e-8b03-2ad0d9b415b5', '59ffa7b3-6882-4cb9-ad99-20b885469d04', 'hong', 'lien adolph Thi', '', '', '634117', 'Thi hong lien adolph ; New york nails; Kurfürstengalerie; Kölnische str6 34117 kassel', '', 'kassel', '34117', 'Germany', true, '2026-01-07T02:20:05.270Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dae6f552-dc64-4280-ae7d-4da6798b6417', 'cc85a0b1-00c1-4140-b9ee-4d073f1b28f5', 'Strasse', '304 Zülpicher', '', '', '', 'Zülpicher Strasse 304', '', 'Köln', '50937', 'Germany', true, '2026-01-07T02:20:05.274Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('663faf1f-024c-421a-bc4c-9efe11a428d9', '56d31e91-272c-40fc-b2ee-83e9840a502f', 'chausse', '327/22177 Hamburg Bramfelder', '', '', '', 'Bramfelder chausse 327/22177', '', 'Hamburg', '22177', 'Germany', true, '2026-01-07T02:20:05.278Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bd51dd3e-036c-43ce-9874-e3fc40dc9cea', '0f115a28-b754-4a9b-9847-3413272207af', 'quach.tuannam', 'quach.tuannam', '', '', '', 'Bramfelder Ch 336', '', 'Hamburg', '22175', 'Germany', true, '2026-01-07T02:20:05.290Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7c14f73e-b45f-4143-9c59-f8bd64f04c8e', 'e8cdb18d-9f6b-4db3-b513-b64b691b7b9e', 'nguyen', 'danh Tuyen', '', '', '', '. Industrie Str 5-9', '', 'Bischberg', '96120', 'Germany', true, '2026-01-07T02:20:05.295Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1e407bb2-34f5-4e66-9882-f13ed8d19972', '18fcb274-f193-483f-b18d-f95dc6ed2ba2', 'Minh', 'Tuan', '', '', '', 'Große Markt 17', '', 'Montabaur', '56410', 'Germany', true, '2026-01-07T02:20:05.297Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7ef76ff4-5d43-4616-8e19-0e050d631e5f', '81340a7d-7002-405e-a7e9-cc084040fc47', 'Ellernbusch', '22 Am', '', '', '', 'Am Ellernbusch 22', '', 'Düren', '52355', 'Germany', true, '2026-01-07T02:20:05.310Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('76fb18e1-ea70-40ad-bd3d-e7a2fa1aa90e', '9edc8d6a-22af-49ec-b916-56a919ba685c', '18', 'Kämmererstraße', '', '', '', 'Kämmererstraße 18', '', 'Worms', '67547', 'Germany', true, '2026-01-07T02:20:05.311Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('57b091f4-47f0-4cf7-a8e9-09d9e2cbc715', 'ed63f121-2bb1-40b1-a9aa-e83b68f78703', '28.', 'Schloßstraße', '', '', '', 'Schloßstraße 28', '', 'CALAU', '03205', 'Germany', true, '2026-01-07T02:20:05.327Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d0f1fa25-a0c7-44f6-949d-bd8ef53f3f43', 'a96483a3-fc4f-43c6-843b-3761f4eb566e', '1UG', 'Einkaufszentrum', '', '', '', 'Schwabacher str 5', '', 'Fürth', '90762', 'Germany', true, '2026-01-07T02:20:05.331Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b9fce7cf-0466-413d-8220-f1b33cb50000', 'b4f19378-5de2-4c4d-9e01-ea6d22c2e524', 'Thuy', 'Linh Nguyen Thi', '', '', '', 'Meißner Str. 67', '', 'Radebeul', '01445', 'Germany', true, '2026-01-07T02:20:05.333Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c44f2b48-384d-4e70-a2a1-3fdc8caa25e4', '7e71a61b-3114-4b3b-b3ec-9b68b0969295', '17-21', 'Feldschmiede', '', '', '', 'Feldschmiede 17-21', '', 'Itzehoe', '25524', 'Germany', true, '2026-01-07T02:20:05.340Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e8337e19-ffad-401a-a065-d92f93e30b59', '0f0f9718-3094-4808-aac7-9a959d8ea84d', 'e', 'Ok', '', '', '', 'Kölner Straße 282', '', 'Krefeld', '47807', 'Germany', true, '2026-01-07T02:20:05.349Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e4e276df-04f1-422c-991f-2ec943ecadb8', '2329707c-912d-41a9-9d46-4ce1473a33a4', 'tran.minhduc.1000', 'tran.minhduc.1000', '', '', '015784899999', 'Theresienstr. 25', '', 'Ingolstadt', '85049', 'Spain', true, '2026-01-07T02:20:05.351Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9ac543a5-7d5e-4902-b5e3-aac29ec3c26b', '9e555036-6d41-4df3-b219-381e58489386', 'Dresden', '01257', '', '', '', 'Straße des 17', '', 'Dresden', '01257', 'Germany', true, '2026-01-07T02:20:05.352Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('79aaf3e4-0712-4fc3-b2d8-b1a3d4f6968f', '4c71e546-f859-4f18-af82-2b3677c38021', 'gởi', 'hàng cho Anh', '', '', '01626449999', 'Beim grafeneckart 15', '', 'würzburg', '97070', 'Germany', true, '2026-01-07T02:20:05.380Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3b00a5e9-1fe3-4495-994b-3fbac5ace4d1', '0d30c6d9-0bd4-4505-add8-296ef373748e', '-Ring', '15 Thomas-Wimmer', '', '', '', 'Thomas-Wimmer -Ring 15', '', 'München', '80539', 'Germany', true, '2026-01-07T02:20:05.392Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('537877ea-b687-4f37-b745-c5d9ee9ab2d4', '86e9747c-a629-4ab1-ab9f-cbb4237f20b5', 'bich', 'thuy vu Thi', '', '', '015112323709', 'Auf der Heide 17', '', 'Bremerhaven', '27574', 'Germany', true, '2026-01-07T02:20:05.492Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4b595d0d-81d0-4213-ac33-1a0faf926715', 'c7949bcb-8d5b-4987-85a9-b26e99019b7a', 'Augsburg', '86163', '', '', '', 'hochzoller str 7a', '', 'Augsburg', '86163', 'Germany', true, '2026-01-07T02:20:05.494Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eb89b109-7492-4aa7-a8b8-63b6a326e107', 'dce9381f-f81d-4452-920c-ac89177e17f0', 'str.68', 'Zweifaller', '', '', '', 'Zweifaller str.68; 52222 Stolberg ; Im Kaufland', '', 'Stolberg', '52222', 'Germany', true, '2026-01-07T02:20:05.513Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('67cd1819-7f7a-471e-b538-3490bfe936af', 'c9c73c82-7745-433f-8253-9bc10b50f2ec', 'c', 'địa chỉ Ship', '', '', '108122', 'Kalker hauptstr 108-122', '', 'köln', '51103', 'Germany', true, '2026-01-07T02:20:05.517Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bf3fc6ad-01df-499e-b743-c259acccbc64', '619649a3-613c-4bea-b9e8-381f70aa1368', 'Straße', '9 Leininger', '', '', '', 'Leininger Straße 9', '', 'Bad Dürkheim', '67098', 'Germany', true, '2026-01-07T02:20:05.542Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5473d518-1fa4-4357-9174-50551ffa00e8', 'a2e47e97-b3f8-485e-9e02-4f910ac7ac5d', '41', 'Hussenstr.', '', '', '', 'Beauty 4', '', 'Konstanz', '78462', 'Germany', true, '2026-01-07T02:20:05.549Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('46592fb5-2547-4399-9ed4-c8dc61fd2acf', 'd9d0f87c-9406-4b87-b9e3-df84a2ba4bcf', 'Tho', 'Le Duc', '', '', '', 'Gumbertstrasse 89', '', 'Düsseldorf', '40229', 'Germany', true, '2026-01-07T02:20:05.563Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d2a09de9-7fdb-415a-90cc-270b1b7e8130', '6375873d-f0b3-4d07-b657-a53e49061ce5', '65', 'Königstraße', '', '', '', 'Königstraße 65', '', 'Landau in der Pfalz', '76829', 'Germany', true, '2026-01-07T02:20:05.579Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2b685175-cb81-4dfa-9db8-32159b29c6ec', 'dad597d7-06b6-4bf2-925e-006b6064afcb', 'Reese', '(Stefan) Herren', '', '', '', 'Koogstraße 55', '', 'Brunsbüttel', '25541', 'Spain', true, '2026-01-07T02:20:05.086Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('380ef7b6-50c0-4978-9d1d-fca18604c2c0', 'bf06f916-4357-4e6c-b19f-240b0ac1dd3d', 'str.16', 'Weißenseer', '', '', '', 'Weißenseer str.16 ; 99610 sömmerda ; Sömmerda Nails; Le thi thuy linh', '', 'sömmerda', '99610', 'Germany', true, '2026-01-07T02:20:05.105Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6a251e93-b399-4db3-8b24-a76c8cbbec53', '29a09c21-f804-45be-a0bc-c23b1ee15ba7', 'chỉ', 'là. Đia', '', '', '', 'Korte hengelosestraat 15a', '', 'JA Enschede', '7511', 'Germany', true, '2026-01-07T02:20:05.107Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a511eed1-82f0-4ae2-a050-b48624c4b8d0', '7263ca20-f594-4d5a-a491-82d7b6faf925', 'thanh', 'nha Tu', '', '', '', 'Alte Marktstr 5', '', 'Blieskastel', '66440', 'Spain', true, '2026-01-07T02:20:05.126Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('44bb4376-8aa4-4076-8c85-edc2dc8a0380', '83a12ad7-fcea-4a6d-9fe3-07078ea420f7', 'của', 'chị D/c', '', '', '', 'D/c của chị ; Pham thi hong Anh; ( kim Nails) ; Kölnerstr.68; 42897 Remscheid', '', 'Remscheid', '42897', 'Germany', true, '2026-01-07T02:20:05.128Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('82a1fa70-41c1-43d5-923d-ec9d04967580', 'a5d96165-c708-44ea-a61b-69cbc3c1ced8', 'Tuan', 'Lam Anh', '', '', '', 'Babenhäuser 8', '', 'Dietzenbach', '63128', 'Germany', true, '2026-01-07T02:20:05.134Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fe02ff9d-1eea-4441-a40b-7ce5a77a3089', '5f49eec8-168f-4a24-87a9-37de2f3ebb15', 'Quang', 'huy Lê', '', '', '', 'Basler Str 12', '', 'Gzenzach-Wyhlen -Germeny', '79639', 'Germany', true, '2026-01-07T02:20:05.135Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('35690a93-531d-4810-a437-3ba20bffea21', 'cf9a451e-1b0c-4965-9f34-66689fe52758', 'chỉ', 'là: Địa', '', '', '', 'Plattlingerstr. 5a', '', 'Regensburg', '93055', 'Austria', true, '2026-01-07T02:20:05.147Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('20b6d7bc-37c5-43a7-a7ce-bfbc2ba1fea3', 'ee124078-ac39-4dc1-8a6f-c2f2ed85ae42', 'thanh', 'Huyền Nguyễn', '', '', '', 'Reichsstraße 23', '', 'Donauwörth', '86609', 'Germany', true, '2026-01-07T02:20:05.170Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c4aa0021-790e-4052-8100-7d720c275dba', '08436f25-0866-42d5-8414-0cb08c26b56f', 'str', '2a Hailerer', '', '', '', 'Hailerer str 2a', '', 'gelnhausen', '63571', 'Germany', true, '2026-01-07T02:20:05.174Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('223946a1-7a24-4752-aa9c-59d754f9e358', '269e996b-c278-4ec9-8eb2-f563fe5c4ef1', 'Thi', 'Minh Thu Truong', '', '', '34117', 'Mauer str 11', '', 'Kassel', '34117', 'Germany', true, '2026-01-07T02:20:05.191Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('183fc3ea-7f4c-4c35-9054-716096befa70', 'a56bf35a-3c2d-4cc1-bce5-36656c438f43', 'le', 'Nguyen Thi', '', '', '', 'USA nails Hauptstraße 256', '', 'weil am Rhein', '79576', 'Germany', true, '2026-01-07T02:20:05.213Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4ca73c68-b08e-4646-b44b-6360b56526e1', '1598f70e-04eb-499b-83fa-cf280cfeb485', 'truong.trinhhuy', 'truong.trinhhuy', '', '', '', 'Kurwickstraße 16-18', '', 'Oldenburg', '26122', 'Germany', true, '2026-01-07T02:20:05.250Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c25f420b-656d-463f-a47e-131fd4661f24', '77236358-d11a-407f-8220-265f0dac0da6', 'Straße', '8 Harksheider', '', '', '', 'Harksheider Straße 8', '', 'Hamburg', '22399', 'Germany', true, '2026-01-07T02:20:05.252Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a5cf33b0-ff25-4553-a668-cad730ff062b', '7530e30e-003c-490b-a0db-ecf507709b92', 'DinoHienTien', 'DinoHienTien', '', '', '', 'Schlossergasse 1', '', 'Frankenthal', '67227', 'Germany', true, '2026-01-07T02:20:05.254Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b49e91a9-1ea3-4905-9e92-c185103d4f87', '7dd1c013-6463-4022-a3f5-7ac5e94090c9', 'My', 'Vu', '', '', '', 'Elsässer str 43', '', 'Oberhausen', '46045', 'Germany', true, '2026-01-07T02:20:05.257Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0e2a67cc-b694-4d5c-88ff-c4bdb601dba5', '37a6e4c1-ad91-4956-856a-72910c6a1460', 'ha', 'tu Hoang', '', '', '', 'Sperlingweg 9', '', 'Gaildorf', '74405', 'Germany', true, '2026-01-07T02:20:05.273Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('80dc1ac1-1bb9-400b-8224-bdad9fe880bb', 'ae6f9076-563a-4d74-aca6-b43930074338', 'Minh', 'Hoa Nguyen', '', '', '', 'Innere Plauensche Str. 14', '', 'Zwickau', '08056', 'Germany', true, '2026-01-07T02:20:05.311Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('67b57c1b-55ba-4f0c-9aac-3847e8cd3164', 'd1c03b28-e8a1-4468-90fb-c3f28a1e0879', '100024161656454', '100024161656454', '', '', '2279098', 'Naturnails Salz str 22-79098', '', 'Freiburg', '79098', 'Austria', true, '2026-01-07T02:20:05.318Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7c30d604-fe26-4410-846c-cb251b382137', '20b4f859-afc7-48de-a6a9-609a1402bfdb', '46', 'Holzgasse', '', '', '', 'Holzgasse 46', '', 'Siegburg', '53721', 'Germany', true, '2026-01-07T02:20:05.331Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b35a4d94-4b41-48a4-a7fe-476fbf08d648', '8d6ce1fb-81bb-4958-aa16-58e6e58827cb', 'nguyenthily.nguyen.1276', 'nguyenthily.nguyen.1276', '', '', '', 'nguyen thi Ly /MD beauty, Bilk Arcaden(untergeschoss), Friedrichstr129-131/40217 Düsseldorf', '', 'Düsseldorf', '40217', 'Germany', true, '2026-01-07T02:20:05.360Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b110bfe2-189b-4edc-a9a0-9c7f616b008d', '45eb6f25-a079-49f9-bfec-61aec0cbc620', '10*1+3*6+2*6', '= 40€ (+ship)', '', '', '728035559', 'hà thi hien jana palacha 116/16', '', 'breclav', '69002', 'Germany', true, '2026-01-07T02:20:05.361Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('57627c78-5d44-4aa3-a999-027c2843dcf4', 'b79158a7-872c-43a2-a964-508fe4619c6d', 'thanh', 'Huyền Nguyễn', '', '', '', 'Reichsstraße 23', '', 'Donauwörth', '86609', 'Germany', true, '2026-01-07T02:20:05.369Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9437a46f-8de3-417b-aa65-2ae14eef59b7', 'aa13ef4e-261e-41d5-8117-e43656defec9', '9', 'Industriestraße', '', '', '', 'Industriestraße 9', '', 'Mülheim-Kärlich', '56218', 'Spain', true, '2026-01-07T02:20:05.382Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ad77153e-9c92-4a9e-a3b7-b93e9f48cb53', '4f86d1e5-7a9e-4cf3-b7bf-c4b585056cfa', 'Thang', 'John Dao', '', '', '2364739', 'Aschaffenburger Straße 23', '', 'höchst im Odenwald', '64739', 'Germany', true, '2026-01-07T02:20:05.390Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e53f6200-1237-4bb3-9c8b-0a893645ea45', '69c0c77b-1e50-4693-bdc8-cd8e58db6a06', 'Thi', 'Bich Tuyen Nguyen', '', '', '', 'Nguyen Thi Bich Tuyen; Neuestr.7; 26316 Varel ; Fashion Nail', '', 'Varel', '26316', 'Spain', true, '2026-01-07T02:20:05.401Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d28b5011-0ce4-4930-8ac4-39ceb9c4ae0f', '58f58370-ac4c-4551-9599-0e493bd6e440', '435', 'Hauptstr.', '', '', '', 'Hauptstr. 435', '', 'Weil am Rhein', '79576', 'Germany', true, '2026-01-07T02:20:05.423Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1d047277-d090-446f-937b-d83684154ef2', '8ff1f3cb-139b-41ec-8d2a-07402cba2ccf', '4', 'Bregenzerstrasse', '', '', '', 'Bregenzerstrasse 4', '', 'Duisburg', '47249', 'Germany', true, '2026-01-07T02:20:05.433Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('57711298-ee6f-4d72-b740-a70ed0e14adc', '30a738ff-4b3f-4f3a-8fe5-ef8f8e45e192', 'Straße', '49 Lebacher', '', '', '', 'Lebacher Straße 49', '', 'Saarbrücken', '66113', 'Germany', true, '2026-01-07T02:20:05.437Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('67dee37e-7c94-4f07-91ce-6ba201a8b8a5', 'e72f6c89-4f67-4549-b284-7cab63db8226', '26', 'Berlinerstr', '', '', '', 'Berlinerstr 26', '', 'Sindelfingen', '71069', 'Germany', true, '2026-01-07T02:20:05.444Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c161d482-4334-4749-8db9-534cba3f18b2', '66b1690a-09e3-4ebe-a543-d80154163f8f', '2', 'Marktpassage', '', '', '', 'Marktpassage 2', '', 'Haan', '42781', 'Germany', true, '2026-01-07T02:20:05.445Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('07a525f3-1072-4bee-914d-a36714956551', 'fb3f1a5a-5bae-4897-b061-6d2a0a77667d', 'Thi', 'Thu Ngoc Nguyen', '', '', '', 'Nordwall 56/58', '', 'Krefeld nhé', '47799', 'Germany', true, '2026-01-07T02:20:05.452Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ee922c24-6d01-4c5a-a309-341314d9d054', 'ac10af91-f8c9-48a7-9f27-e0a8e0703a39', '100018625943044', '100018625943044', '', '', '', 'A chuyện cho Nguyen Viet anh, Torstr.10, 24768 Rendsburg', '', 'Rendsburg', '24768', 'Germany', true, '2026-01-07T02:20:05.473Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0b91a42c-547a-47d5-9f20-515ccc969279', '31fd5ed3-5f31-4ebf-bd98-e800ee96f868', 'Thi', 'Anh Tuyet Pham', '', '', '', 'Look Beauty Nails No. 5', '', 'Langenfeld', '40764', 'Netherlands', true, '2026-01-07T02:20:05.493Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e28ba319-8a87-4aac-8c80-4196d46b5024', 'd437d6c1-a8f0-4072-89a5-2771a6323848', 'bestelt', 'Kim', '', '', '', 'Wildauer platz 7', '', 'hückelhoven', '41836', 'Austria', true, '2026-01-07T02:20:05.503Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('51882585-648e-4153-b007-110438dcd077', 'cbe2bdc0-9971-4fdc-b6ef-323ec71586ac', 'THI', 'YẾN ĐINH', '', '', '', 'DORNBERGERSTRASSE. 12', '', 'LEIPZIG', '04315', 'Germany', true, '2026-01-07T02:20:05.516Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('54cf6d53-fb9f-4a2b-8faa-0fc3fc1d7d29', '87d54ee2-1040-4ed2-a826-3fe7ac466dd9', '14', 'Friedrichsplatz', '', '', '', 'Friedrichsplatz 14', '', 'Rottweil', '78628', 'Austria', true, '2026-01-07T02:20:05.527Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('86b342d9-42fb-41c3-a71b-0fe571087ed0', '2d2f4a8b-5fb0-4948-b6cf-679a45e5f0e4', 'Straße', '8 Havelser', '', '', '', 'Havelser Straße 8', '', 'Garbsen', '30823', 'Germany', true, '2026-01-07T02:20:05.087Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bc5bae69-328a-4ea6-9a1e-f736761bff4e', '83e6276d-3ad6-4ce1-976e-938a06759ae6', 'Bao', 'Lâm Nguyễn', '', '', '', 'Secklergasse 2', '', 'Ellwangen', '73479', 'Germany', true, '2026-01-07T02:20:05.093Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8d70b2c7-e80b-45c5-a4ae-d91375f8d29c', '89e27520-4f85-4994-ba62-ff22675ddeab', 'tuan.nguyen.1048', 'tuan.nguyen.1048', '', '', '', 'Berliner Str. 9', '', 'Senden', '89250', 'Germany', true, '2026-01-07T02:20:05.094Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7db3e2e8-03b8-4e34-857f-0c5ee0863a9c', '190993e5-c1b3-40e9-9498-0ba8bda3b5a9', '8-9', 'Rosentorstraße', '', '', '', 'Rosentorstraße 8-9', '', 'Goslar', '38640', 'Germany', true, '2026-01-07T02:20:05.107Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2b552ff6-196b-4ba4-92e8-ae49079b1594', 'd9b79aad-3e64-4953-8ba9-60f9e6c5e3e6', 'Mai', 'Vanessa', '', '', '', 'Stad 12', '', 'Eschwege', '37269', 'Spain', true, '2026-01-07T02:20:05.169Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('112a214e-f7dc-40ea-ae7b-0a21c197a4c8', '7878c1c8-cebc-4040-858e-1cbaec0ecefb', '100048106315346', '100048106315346', '', '', '1166687', 'AN Nails Markt platz 11', '', 'wadern', '66687', 'Germany', true, '2026-01-07T02:20:05.194Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('79f8b8c0-2e01-4165-9e29-0f99ade2f20e', '8855d6fe-dda8-4090-af95-bf9a069f85f6', '5', 'Kahlenstraße', '', '', '', 'Kahlenstraße 5', '', 'Bremen', '28195', 'Germany', true, '2026-01-07T02:20:05.201Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6b10e8ae-662e-4922-9292-3aed8eae4e01', 'e46dfd5a-5c7a-43aa-a285-748735f7707c', 'Anh', 'Le Thì', '', '', '', 'Thì Anh Le; New York Nails; Goldbacher str.11a ; 63739 Aschaffenburg', '', 'Aschaffenburg', '63739', 'Germany', true, '2026-01-07T02:20:05.228Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5b18fa8f-8d4a-44c9-bf1a-22b7fcbe9d3f', 'fda6addb-7e1f-4bd6-bf3e-a32b22fdcd29', '16', 'Viehtor', '', '', '', 'Viehtor 16', '', 'wesel', '46483', 'Spain', true, '2026-01-07T02:20:05.238Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6b76310e-bd13-48ca-9529-7fb67ed8f121', '17b38ef5-c728-4a5f-a4a8-e105dfa5180c', 'Manh', 'Thang Nguyen', '', '', '', 'Epplestr. 18', '', 'Stuttgart', '70597', 'Spain', true, '2026-01-07T02:20:05.371Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d99711fc-13bf-4dcc-a918-62d504a71636', '10037af9-2c58-4124-ac24-df4d48738bd9', '7C', 'Georg-Rückert-Strasse', '', '', '', 'Georg-Rückert-Strasse 7C', '', 'Ingelheim', '55218', 'Germany', true, '2026-01-07T02:20:05.382Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('67bce0a5-271d-495e-b650-55139cd4ca51', 'cddb0f11-3779-4efc-a327-19e74371bd00', '12-20', 'Lübberstraße', '', '', '1220', 'Lübberstraße 12-20', '', 'Herford', '32052', 'Germany', true, '2026-01-07T02:20:05.410Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f2197152-c86d-45ff-a36b-927be7e203cd', 'd80b4b28-a86a-44c9-83da-3a7e2a5e2779', 'Str.', '01 Kirch', '', '', '', 'Kirch Str. 01', '', 'Lörrach', '79539', 'Germany', true, '2026-01-07T02:20:05.413Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ed3447ed-c684-4852-9646-3766d94d0f5f', 'a2fa0af7-8821-4932-b06a-94d45ac735bb', 'Pham', 'Ly', '', '', '153155', 'Dürener Str. 153-155', '', 'Köln', '50931', 'Germany', true, '2026-01-07T02:20:05.414Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('11f03d68-4f92-457b-9631-690323e60e59', '92389816-6f54-46aa-a66c-8d2c9d3e0c3f', '100035280679940', '100035280679940', '', '', '606103298', 'i lan euronails bondy centrum 1459', '', 'tř vaclava klementa', '1459', 'Spain', true, '2026-01-07T02:20:05.432Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ff2409cd-c861-4e26-8ea1-07cc98317b35', 'e0062587-f980-4261-b96b-b8c4cfce59bb', 'Thi', 'Hau Nguyen', '', '', '', 'Türlensteg 20', '', 'Schwäbisch Gmünd', '73525', 'Germany', true, '2026-01-07T02:20:05.452Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('95e2163e-43bb-4893-996d-63b4e8d7fe1f', '028dc5b8-792d-439f-9337-e173756aa7f0', 'chỉ:', 'Địa', '', 'nnuhong76@gmail.com', '', 'Ludwigstr. 4', '', 'Aschaffenburg', '63739', 'Germany', true, '2026-01-07T02:20:05.464Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ce1903e1-8268-4fab-ba99-26c256a879ef', '911a573e-d5d5-4989-beb9-568c35961468', 'le.t.nu', 'le.t.nu', '', '', '1274523', 'Poppynails Heimbacher gasse 12', '', 'schwäbisch hall', '74523', 'Germany', true, '2026-01-07T02:20:05.472Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('630abe87-0d1d-4ab8-83be-b3b6d6113111', 'e48efed2-633b-4224-8fce-d9839a45c6eb', 'co.hoa.31', 'co.hoa.31', '', '', '173037', 'Center Esslinger Straße 1', '', 'Göppingen Tran Thi Kim Hien', '73037', 'Spain', true, '2026-01-07T02:20:05.480Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6d7ecaba-0665-4678-aca4-7c8555b0fadb', '7030a91c-a880-46d3-93dd-a545bc11ab23', 'Nguyen', 'Suong', '', '', '', 'Wormser Straße 23', '', 'Frankenthal', '67227', 'Germany', true, '2026-01-07T02:20:05.739Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('213a36da-27f5-4e7c-ba45-9daa67e61407', '1b0175cd-2037-4439-a6f1-26875a356785', 'hang.vu.5811', 'hang.vu.5811', '', '', '', 'arnoldiplatz 2', '', 'Gotha Thüringen', '99867', 'Austria', true, '2026-01-07T02:20:05.808Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a5400fb2-118e-45da-b20f-73bc1a1b3292', '7354f2db-d402-4fec-af46-dcfd8d3af873', '100077749760020', '100077749760020', '', '', '2681369', 'Albert Rosshaupter Straße 26-81369', '', 'München', '81369', 'Germany', true, '2026-01-07T02:20:05.811Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('50ecd9e8-dceb-4b5d-be0a-54506cffe2a0', '5ef52b5b-156b-4608-acf9-37ec7506000c', 'Huyền', 'thương Nguyên', '', '', '6372336', 'Friedrichstraße 63', '', 'Balingen', '72336', 'Germany', true, '2026-01-07T02:20:05.827Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('62aa717f-8810-4def-bcf0-70a2474c24d9', '0e0502e3-3ab2-4500-b515-a8312d65d354', '18', 'Epplestr', '', '', '', 'Epplestr 18', '', 'Stuttgart', '70597', 'Spain', true, '2026-01-07T02:20:05.830Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2221bf5c-e961-4a12-9bf3-061c40421426', 'c1647db4-0a08-4917-8e0a-600135a2d306', 'pham', 'phuong', '', '', '', 'Neue Amberger straße 25', '', 'Grafenwöhr', '92655', 'Germany', true, '2026-01-07T02:20:05.852Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('50403174-f19d-4fbb-932f-ff6facdb5f6a', '0ee6193f-8b40-4a2c-8838-e8413350ca45', 'thai.thangthong.18', 'thai.thangthong.18', '', '', '', 'Bahnhofstraße 3', '', 'ramstein-misenbach', '66877', 'Germany', true, '2026-01-07T02:20:05.871Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3acbeb41-1d9e-45ca-a0f4-7b1e442b7971', '66b03d65-93d3-4cd2-9786-8e9241a04ac3', 'Thi', 'Thu Huyen Tên:Vu', '', '', '', 'Sandweg 6C', '', 'Frankfurt', '60316', 'Germany', true, '2026-01-07T02:20:05.885Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f920e882-80f6-4d42-b2e9-573e0cfae59e', 'b072c086-7fa1-46e3-b14a-587abfae1ae3', 'Dan', 'Truong Nha', '', '', '', 'Nail Art Company 2', '', 'Bremen', '28203', 'Germany', true, '2026-01-07T02:20:06.649Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('067e8e7d-9a03-4f4d-9dfb-e58247607513', '8fcbeb3d-0a60-405f-b98b-1e257175648d', 'Thuong', 'Men Pham', '', '', '', 'Sinzheim Str. 8', '', 'Baden Baden', '76532', 'Germany', true, '2026-01-07T02:20:06.656Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('997cd374-1d42-45c3-b68b-90220c0e2e72', 'ef94800d-68d1-4a00-9493-10af8514c127', 'Hao', 'Nguyen Huu', '', '', '', 'Bahnhofstraße 51', '', 'Büdingen', '63654', 'Germany', true, '2026-01-07T02:20:06.658Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('91bd2a73-9875-4d4b-9f83-e508977e958b', '0ab93c34-bb87-4ece-b213-bf827d309a8d', 'Trang', 'Nguyen Huyen', '', '', '', 'Bahnhof str 191', '', 'Karben', '61184', 'Germany', true, '2026-01-07T02:20:07.328Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7d45d8d4-b6f5-41a9-b98a-d078a6e0e59a', '860fb79f-cee4-45d0-82de-1e29805cf4c2', 'Thuy', 'Hang Vo Thi', '', '', '', 'Oldentruper Straße 236', '', 'Bielefeld', '33719', 'Germany', true, '2026-01-07T02:20:07.367Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0524b0bc-d8ec-4be4-a2d7-cd85ae406c87', '693edf60-69e5-437a-b232-5479a2ccb180', '13,', '70794 Filderstadt Uhlbergstr.', '', '', '', 'Uhlbergstr. 13', '', 'Filderstadt', '70794', 'Germany', true, '2026-01-07T02:20:07.492Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7cfdc88b-8566-45e8-82f9-a7bd796d4c05', 'e1cd8f1c-3b2f-4bbc-89ac-f5aac0aacce1', 'trang.victoria.14', 'trang.victoria.14', '', '', '776653559', 'Jungmannova 56501', '', 'Choceň', '56501', 'Germany', true, '2026-01-07T02:20:07.541Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a139f34f-d879-4f6d-b63b-896583ac5fe2', '045b2df6-6fe0-4fc9-8036-4eddb98824f7', 'Thi', 'Ha', '', '', '714800', 'Namesti Prezidenta Masaryka 110/7', '', 'Kunratice Praha', '14800', 'Czech Republic', true, '2026-01-07T02:20:07.542Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('01d22a11-b3cd-4680-a046-93ed46371524', 'fed49b60-596c-45b5-b806-a2e61b2df95f', '100078935786350', '100078935786350', '', '', '775404868', 'Studánky 89', '', 'sdt', '38273', 'Germany', true, '2026-01-07T02:20:07.574Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('05853468-50d1-45e5-bbda-879a3901a787', 'd0ac43c9-abf3-4535-b3dd-d64296c38528', 'Kaplaneistrasse', '1 Untere', '', '', '', 'Untere Kaplaneistrasse 1', '', 'Meiningen', '98617', 'Germany', true, '2026-01-07T02:20:07.595Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('365e3d63-4755-435d-961d-392f04120efb', '34f27c69-2c7a-4083-b224-75bae98886f3', '105', 'Vrchlického', '', '', '+420721839900', 'Vrchlického 105', '', 'Vodňany', '38901', 'Germany', true, '2026-01-07T02:20:07.601Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3ad4770b-b4b2-453d-becd-348a343d19fb', '8a8a9776-a07c-4177-a460-2e3fff58f4bd', 'Thi', 'van Nguyen', '', '', '775006886', 'Nám . Dr . E . Beneše 3/4', '', 'Liberec', '46001', 'Czech Republic', true, '2026-01-07T02:20:07.605Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a93404d0-ae5e-47f8-8d5e-6a0e427ea7aa', '30d47578-1195-4662-8b4f-fb909d278e13', 'Tor', '1 Bremer', '', '', '', 'Bremer Tor 1', '', 'Vechta', '49377', 'Germany', true, '2026-01-07T02:20:05.494Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('845ee7dd-2a30-4a56-a4ac-6cdef2c66a6e', 'af0fa316-c1d4-4ed2-bb73-656121cc5e80', 'Kim', 'Anh Nguyen Thi', '', '', '', 'Käfertalerstr. 197A', '', 'Mannheim', '68167', 'Germany', true, '2026-01-07T02:20:05.516Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('91e7b2c0-8ab3-417c-ae33-04e21767ee68', 'a51e4787-0620-4c18-91ed-69f2024b19d9', 'Parkplatz', 'Kaufland Am', '', '', '', 'Karl-Heinz-Kippstraße 23', '', 'Alzey', '55232', 'Austria', true, '2026-01-07T02:20:05.538Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('20f8c696-5a61-41f2-a5e6-b2a68c6acd8a', 'ad590f54-a2a8-4401-8d5a-e093cae1373b', '42', 'Brückstrasse', '', '', '', 'Brückstrasse 42', '', 'Dortmund', '44135', 'Germany', true, '2026-01-07T02:20:05.552Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('aef29b0c-5618-4fdb-9e2a-8a52be7719c2', '0afe4c07-bb45-42e8-9621-ad64729f7343', 'Rathaus', 'Center Im', '', '', '', 'Offenbacher Straße 9', '', 'Dietzenbach', '63128', 'Austria', true, '2026-01-07T02:20:05.562Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7fc4a4ec-4071-4cc3-b4fe-a4ade0e8192f', '07ad2fd5-6e25-4783-9ee6-3ba902137711', '11', 'Scheffelstraße', '', '', '', 'Scheffelstraße 11', '', 'Singen', '78224', 'Germany', true, '2026-01-07T02:20:05.573Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('19fcf0d1-339f-4ff4-9e32-ae5f5ab455eb', '14bb83bb-15ad-4fab-81ce-1416ca6b30c5', 'Thi', 'vu Nguyen', '', '', '', 'Nguyen Thi vu ; Le Nails Nagelstudio ; Ekkehardstraße.5; 78224 Singen', '', 'Singen', '78224', 'Germany', true, '2026-01-07T02:20:05.583Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fed6dfe2-acdf-40b9-b168-de8b5d4ec2c0', '65b17aa6-35f1-47de-9cae-a6c066c9b187', '56', '15741 Bestensee Hauptstrasse', '', '', '5615741', 'Hauptstrasse 56', '', 'Bestensee', '15741', 'Spain', true, '2026-01-07T02:20:05.593Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e5e5935d-7543-4ce3-9b2d-d1617e88bffd', 'fbb9c72b-b987-4e22-84a0-445cd7e2729f', 'Str.', '6 Gladbecker', '', '', '', 'Gladbecker Str. 6', '', 'Bottrop', '46236', 'Germany', true, '2026-01-07T02:20:05.599Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b80b6934-6f1e-4dfa-9a0d-430401ee480e', '95886011-1f27-4a81-8e6c-837564ad02da', 'Tien', 'Cao Ngoc', '', '', '', 'Streekmoorweg 20', '', 'Varel', '26316', 'Germany', true, '2026-01-07T02:20:05.604Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('282ecfbd-86de-4caa-8726-19fba9fa8f38', 'bf091e56-cdc2-4cef-aa1e-d817313d98e8', 'Dung', 'Nguyen Thi', '', '', '', 'Tibarg 31', '', 'Hamburg', '22459', 'Germany', true, '2026-01-07T02:20:05.612Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b5d282a0-86cc-4c89-b8c4-be62d4a8253f', 'c42875c5-ae45-4dda-871c-41853d807ad9', 'thi', 'minh Phan', '', '', '', 'Stern Straße 81', '', 'Bonn', '53111', 'Germany', true, '2026-01-07T02:20:05.618Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('baf10753-aae3-420e-a096-8edddf0ebb82', 'ed5d5b83-96b0-4b18-a28e-0c626ce9b717', 'Hoa', 'Vu Thi', '', '', '', 'Berliner Str. 9', '', 'Senden', '89250', 'Germany', true, '2026-01-07T02:20:05.624Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f51b0226-4ec7-49e4-a427-5777ae5b08a3', 'ed4224fc-d066-4fb6-a979-2c7e4c2d97ad', 'Xuan', 'Trung Dong', '', '', '', 'Am Bahnhof 40', '', 'Siegen', '57072', 'Germany', true, '2026-01-07T02:20:05.633Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c3710367-9f8a-4611-90d8-1c41eb647e79', '514bf886-119a-403f-a469-2c6e2325cd1f', 'Xuân', 'Lâm Nguyen', '', '', '', 'Emsstr. 6', '', 'Rheine', '48431', 'Germany', true, '2026-01-07T02:20:05.639Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a8e4a602-3518-481e-b661-24ed67c301e1', '77447c04-be9d-46ca-ae15-ff18746347be', '16', 'Kaiserpassage', '', '', '', 'Kaiserpassage 16', '', 'Karlsruhe', '76133', 'Germany', true, '2026-01-07T02:20:05.654Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c7f46846-3d5c-4f9f-bcba-d81dfcaef314', 'd2319d85-f7f4-4be7-a8dd-5cd5137fb92c', 'Anh', 'Thoai Nguyen Thi', '', '', '', 'Morgenstraße 14', '', 'Unna', '59423', 'Germany', true, '2026-01-07T02:20:05.656Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('22a1f60c-0b58-45ee-a0f3-c4387bc300e0', 'a4b59255-d9d4-46c0-a81b-34ee01fd157b', 'Ngoc', 'Nguyen Thi', '', '', '', 'An der Passage 1', '', 'Leipzig', '04356', 'Germany', true, '2026-01-07T02:20:05.659Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b435dfab-efa8-42a9-a1f5-e913abd9bbf9', '5f2d8a2e-ebb7-4d7a-afdc-780bf2f27914', '4', 'Oberstraße', '', '', '', 'Oberstraße 4', '', 'Arnsberg-Neheim', '59755', 'Germany', true, '2026-01-07T02:20:05.675Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5b6bbd39-50be-4855-b581-890a34bb0fbe', 'aaf49b2d-4843-4674-b1d6-4668992a350a', 'Ba', 'Hung Nguyen', '', '', '', 'Hohe Straße 04', '', 'Datteln', '45711', 'Austria', true, '2026-01-07T02:20:05.677Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e7521581-9a03-45b4-8cea-34612b582de4', '4295e29a-acf7-4897-bbd2-7e64ba629ef5', 'Str.', '44 Lange', '', '', '', 'Lange Str. 44', '', 'Delmenhorst', '27749', 'Germany', true, '2026-01-07T02:20:05.679Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1bfb3ee9-980f-4057-b9de-db082aff9b96', '2b6b5d68-067f-4b31-b76e-ce0978647941', 'chỉ', 'gửi hàng Địa', '', '', '', 'Reichenberger Str. 59', '', 'Augsburg', '86161', 'Germany', true, '2026-01-07T02:20:05.704Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5b71d01e-f0b8-494c-ab8e-39c7735aa0fd', '3f0787de-5da4-4e4c-919d-cc1127665136', 'Lan', 'Nguyen Thi', '', '', '', 'Wilhelm-Becker-Str. 15', '', 'Pforzheim', '75179', 'Germany', true, '2026-01-07T02:20:05.728Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ce9c51f8-76aa-43d1-82f1-e2c1088791f4', '7d39a5ef-bd92-4bb4-861c-5dd7a8394279', '12.', 'M5.', '', '', '', '. 12', '', 'Mannheim', '68161', 'Germany', true, '2026-01-07T02:20:05.740Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('675576d1-1847-493a-91c6-9d7b5ada626d', 'dbb9ad25-38dc-4d87-9820-45c0cbd682fa', 'Cao', 'Ha', '', '', '7663069', 'der Grimm Strasse 76', '', 'Offenbach am Main', '63069', 'Germany', true, '2026-01-07T02:20:05.746Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5ac71683-6cca-49c7-8151-ff0f7ff7d446', '4535326d-489c-4c3c-9ae7-3c038d99bbe9', 'brenner', 'Oliver', '', '', '01733661705', 'Lothringer Straße 23', '', 'saarlouis', '66740', 'Germany', true, '2026-01-07T02:20:05.764Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9f18fe58-a58c-43eb-9dc7-404ae28a016c', '1230a7a5-bc07-45c0-86c0-c1b37d0c526e', 'thi', 'ngoan Trinh', '', '', '', 'Hagsche str 12', '', 'Kleve', '47533', 'Germany', true, '2026-01-07T02:20:05.786Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('90c090c3-a55f-41b9-a2f2-82c8135fd3e4', 'd300c044-2bbe-48c7-b74a-ed14f85bc480', 'Hieu', 'Chu Duc', '', '', '', 'Kramerstr. 36', '', 'Memmingen', '87700', 'Germany', true, '2026-01-07T02:20:05.789Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('51ee5e4b-68a4-4c2d-8089-f3e5f88a954f', '67039130-dfc2-4730-a103-84d528730667', 'Hoa', 'Vu Thi', '', '', '', 'Berliner Str. 9', '', 'Senden', '89250', 'Germany', true, '2026-01-07T02:20:05.806Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('551c1160-8a43-4137-a1a4-c32284a3f9b5', '5e67d271-e792-4860-a8cf-d0bb6342744a', 'Duc', 'Nguyen Van', '', '', '', 'Bahnhofstraße 05', '', 'Deggendorf', '94469', 'Germany', true, '2026-01-07T02:20:05.930Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('65536a9a-0002-4194-a17d-d95ba66ffc77', '00a3c282-eb9b-4fbf-9569-56ac261f64fb', '100012698526648', '100012698526648', '', '', '', 'Friedrich-Ebert- Straße 91', '', 'Leipzig', '04109', 'Spain', true, '2026-01-07T02:20:05.936Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b030ee15-3449-488e-ae6e-43020132a766', '310753d4-ed67-48cf-9619-a9e6011f038a', 'str.', '245 Kaiser', '', '', '', 'Kaiser str. 245', '', 'Karlsruhe', '76133', 'Germany', true, '2026-01-07T02:20:05.940Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('83518178-1558-4661-8173-5013aa5337db', 'abc25f5a-345b-4696-886a-f2620a825c6e', '6', 'Lönsstraße', '', '', '', 'Lönsstraße 6', '', 'Castrop Rauxel', '44575', 'Germany', true, '2026-01-07T02:20:05.957Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3a9aa76f-c5ba-4489-996b-8f5836b4b01d', '12702c1d-82db-47fd-a82a-1c1a322f575b', '2', 'Marktpassage', '', '', '', 'Marktpassage 2', '', 'Haan', '42781', 'Germany', true, '2026-01-07T02:20:05.967Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('35484cde-95fb-4d79-af08-ce97e297e56e', '4c3375ec-9c2f-42d9-8d03-2ae41c880ecc', 'str132', 'Oldenburger', '', '', '', 'NagelstudioHa; Oldenburger str132; 27753 Delmenhorst', '', 'Delmenhorst', '27753', 'Germany', true, '2026-01-07T02:20:05.969Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('43cc1278-3733-45e6-9528-527c26a0ca51', 'cfc9b819-e156-44f7-ade5-e4202d774284', 'văn', 'tâm Phạm', '', '', '30100', 'Pražská 39', '', 'plzen', '30100', 'Czech Republic', true, '2026-01-07T02:20:06.051Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('34a1ceb3-4628-422f-a775-7034532f2878', '0a1d06bb-5d0f-4f54-bfde-01b5af84eb83', 'str.', '22-24 Herforder', '', '', '', 'Herforder str. 22-24', '', 'Köln', '50737', 'Germany', true, '2026-01-07T02:20:06.418Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a3d088f4-bd7e-456b-a540-1496b22b6fcc', 'ed06aa18-b401-4664-b86a-b56c2a778594', 'Tran', 'Anh Thao', '', '', '722002399', 'nám. Jana Žižky z Trocnova 107/30', '', 'Čáslav', '28601', 'Germany', true, '2026-01-07T02:20:06.428Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('75f0d7da-e5f0-4528-a8f4-8ef6695f4262', '5c9dc238-0454-4b41-99ec-27e43ae25492', 'Str.', '292 Berrenrather', '', '', '', 'Berrenrather Str. 292', '', 'Köln Sülz', '50937', 'Austria', true, '2026-01-07T02:20:06.437Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a6ebcf58-7610-4a2f-a49c-6560c6d96208', 'daf4cd72-6752-4cf8-b34a-92c2c2536f5b', '100007911159889', '100007911159889', '', '', '', 'Nguyên Thao vip nails. Steinweg str 30', '', 'Mühlhausen', '99974', 'Germany', true, '2026-01-07T02:20:06.502Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6884cb01-1e6a-47da-9a10-9de2944a720e', '7fca0ce7-e0a4-458f-8b28-5335c569e731', 'str.', '40 Duisburger', '', '', '', 'Duisburger str. 40', '', 'Düsseldorf', '40477', 'Germany', true, '2026-01-07T02:20:05.541Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('01e9bdb4-d170-4eb2-9b28-442044d87ea7', '30b0cd4a-2087-4fa5-a465-a0872dae8507', 'Hoa', 'Vu Thi', '', '', '', 'Berliner Str. 9', '', 'Senden', '89250', 'Germany', true, '2026-01-07T02:20:05.561Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('036c1b6f-5a40-45f5-9eb6-06818830530d', '2b7efc0f-5435-4604-987c-8d553b5efe0d', 'nguyen', 'Trang', '', '', '015902632272', 'Kesselsdorfer Straße 24b', '', 'Dresden', '01159', 'Germany', true, '2026-01-07T02:20:05.604Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ef8fc110-bd88-4c39-8b26-9b873b51d18f', '9647b6cf-bc1d-4ac1-8393-6e44544f0bcc', 'Nguyen', 'KimDung', '', '', '', 'John F Kennedy Strasse 30', '', 'Hanau', '63457', 'Germany', true, '2026-01-07T02:20:05.613Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eefae6f3-7e58-4e50-b694-9034a81d9f47', '8580c583-5292-48b0-ba21-08cf1628a157', '2', 'Süderelbeweg', '', '', '', 'Süderelbeweg 2', '', 'Hamburg', '21149', 'Germany', true, '2026-01-07T02:20:05.633Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ed626f92-3021-4d79-bb83-0ec7f6b64e27', 'b2e31096-5593-4d4f-82c9-c6426e774377', '39', 'Hauptstraße', '', '', '', 'Hauptstraße 39', '', 'Bergheim', '50126', 'Germany', true, '2026-01-07T02:20:05.635Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1233125a-a216-4c55-97cc-8d8dbe70454d', 'a5683fe6-100d-45d4-b42b-4b56e7315901', 'Truong', 'Thuy', '', '', '', 'Thuy Truong ; Schopperstr.94 ; 07937 Zeulenroda- Triebes', '', 'Zeulenroda- Triebes', '07937', 'Spain', true, '2026-01-07T02:20:05.647Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8593d87e-f13a-4539-93be-36b2982a9b78', '39df08df-5bfb-4564-861b-d978bd208083', 'Anh', 'Dinh Xuan', '', '', '', 'Love your nails; Xuan Anh Dinh; Straßburger.str1; 72250 Freudenstadt', '', 'Freudenstadt', '72250', 'Germany', true, '2026-01-07T02:20:05.653Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b5648092-da2c-4f5f-865a-11de8272614f', '964de48b-a231-4914-b304-8f5aadbbfcc3', '8', 'Kaiserstr.', '', '', '', 'American Nails 2', '', 'Waldshut-Tiengen', '79761', 'Germany', true, '2026-01-07T02:20:05.673Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f222aac8-20cd-4c4f-9c96-7fd77670cdfb', 'fc22c4b8-971c-42b4-921a-846654d65695', '.', '17 Wredestr', '', '', '', 'Wredestr . 17', '', 'Ludwigshafen am Rhein', '67059', 'Germany', true, '2026-01-07T02:20:05.684Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cf18e042-b3de-4ae0-83ff-fc517753e730', '71b8d8a6-0b3c-4494-81a3-ccf230922ff1', 'Huong', 'Giang Nguyen', '', '', '', 'Bohmter Str. 28', '', 'Osnabrück', '49074', 'Germany', true, '2026-01-07T02:20:05.716Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a9b48a04-f60c-451e-83a2-984fec178e46', '2c3d373f-776b-4e37-b509-57c9b3a3ff99', '9', '-73760 Ostfildern Hindenburg', '', '', '973760', 'Hindenburg 9', '', 'Ostfildern', '73760', 'Germany', true, '2026-01-07T02:20:05.717Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('11cd3141-62ca-4322-ac2f-c2458e54d49a', 'cb3efa77-1e8c-46b3-bf71-d77c82ec5e16', 'Neustadt', '67433', '', '', '', 'Schütt 5', '', 'Neustadt', '67433', 'Germany', true, '2026-01-07T02:20:05.718Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1eb0fd2a-4510-405e-97aa-03c1c8a3494c', '95b32ae5-a11f-4829-8923-064058e2d820', 'Hoang', 'Giap Mai', '', '', '', 'Mai Hoang Giap; Gt Nail-Beauty; Stadtgalerie Schweinfurt; Gunnar-Wester-Straße.10; 97421 Schweinfurt', '', 'Schweinfurt', '97421', 'Spain', true, '2026-01-07T02:20:05.724Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('575b2d5e-2fa5-4b86-8c4a-f31975828f6a', '6fead49f-3ee8-4941-802d-6b394dfb8273', 'Weg', '9 Boizenburger', '', '', '', 'Boizenburger Weg 9', '', 'hamburg', '22143', 'Germany', true, '2026-01-07T02:20:05.741Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b76f9ecb-4869-4026-89b5-b26d465aa3dd', '2432eda1-aa65-406e-9c55-24d5b65b9cae', 'Hai', 'Yen Nguyen Thi', '', '', '017657965190', 'Wolfsschlucht 27', '', 'Kassel', '34117', 'Germany', true, '2026-01-07T02:20:05.753Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('370eba87-d1a1-49af-8b7c-61bbcc237a6d', '78df8035-adc8-4eeb-ad97-6fc8cac5d940', 'c', 'địa chỉ Ship', '', '', '108122', 'Kalker hauptstr 108-122', '', 'köln', '51103', 'Germany', true, '2026-01-07T02:20:05.758Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('59047169-c96f-4c6b-b3db-02a06632e982', '27a7242a-eade-44e9-a6bf-6350674a0060', 'Phuong', 'Hoa Nguyen', '', '', '80874432', 'Werft Straße 50', '', 'Rostock', '18057', 'Germany', true, '2026-01-07T02:20:05.761Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('279abb12-cd53-4637-8879-8370699f16c4', '02a89d3c-14aa-483f-a7e7-da31328c0481', '34', 'Steinweg', '', '', '', 'Steinweg 34', '', 'Braunschweig', '38100', 'Germany', true, '2026-01-07T02:20:05.766Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ca908c7c-f72f-4ff2-84e9-f80d48df0dd0', '75e1f9d5-68ce-4a82-b871-8e69b7fdca4f', 'Str.', '19 Knapper', '', '', '', 'Knapper Str. 19', '', 'Lüdenscheid', '58507', 'Germany', true, '2026-01-07T02:20:05.787Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9553ab94-d384-4c21-a27b-0f81b3e327cd', 'e774c24b-2c30-49a9-87fd-0a41dcf6bb3c', 'văn', 'Công Nguyễn', '', '', '', 'Nguyễn văn Công ; Nagelstudio Wondernails ( im EKZ - EDEKA Markt ); Asterlager str.90; 47228 Duisburg', '', 'Duisburg', '47228', 'Germany', true, '2026-01-07T02:20:05.842Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3c4a33ff-6560-4fa3-9e11-176eee4aec58', '99115beb-0eb3-46f1-920b-5056b1fcc02a', 'Landstr.', '118 Friedberger', '', '', '', 'Friedberger Landstr. 118', '', 'Frankfurt', '60316', 'Germany', true, '2026-01-07T02:20:05.850Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('46b302f7-5098-4fc9-ac84-6a60a0de2bd6', '39a586b5-4598-4ae2-9eb7-5f9449ff5cc4', '53', 'Heggerstr.', '', '', '', 'Heggerstr. 53', '', 'Hattingen', '45525', 'Austria', true, '2026-01-07T02:20:05.861Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1123540f-b2ac-4124-9907-99682429da0e', 'e6cd099e-e59a-45f6-92aa-c32a21c42254', '100023835293764', '100023835293764', '', '', '61348', 'Kim Nails  Thomasstrass 9', '', 'Badhomburg', '61348', 'Germany', true, '2026-01-07T02:20:05.862Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6db6963e-40d6-4b44-b786-ac0ba3322c33', 'e6931917-9701-4728-aa5b-e2d48b423288', '2', 'Ersnt-August-Platz', '', '', '', 'Ersnt-August-Platz 2', '', 'Hannover', '30159', 'Austria', true, '2026-01-07T02:20:05.870Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('aca94679-4fda-4838-b7a7-8b9655b5cff7', '31242e5e-4267-41d5-8017-60ac5b56ee5d', 'Straße', '28 Cottbus', '', '', '', 'Cottbus Straße 28', '', 'Forst', '03149', 'Germany', true, '2026-01-07T02:20:05.896Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a5bfdbda-1958-41d2-94bf-ad018ca39072', 'df80fd22-5e4f-4abb-a5b9-e3129e48fa59', 'chu', 'sy Quy', '', '', '194501', 'Thalyaho 1', '', 'komarno slovakia', '94501', 'Germany', true, '2026-01-07T02:20:05.898Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dfc21d83-48fd-475c-b733-482cb446c4e0', 'be9ecb11-7120-4bd1-80fa-9058edf2f157', 'anhduong.truong.39', 'anhduong.truong.39', '', '', '', 'Haupt strasse 125', '', 'Oldenburg', '26131', 'Germany', true, '2026-01-07T02:20:05.949Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d649c2ab-371b-4d14-aae4-1c99f8edfe1b', '428cde79-5ff4-471e-87c2-6c8e82ac4c87', 'Straße', '75 Saarbrücker', '', '', '', 'Saarbrücker Straße 75', '', 'Heusweiler', '66265', 'Germany', true, '2026-01-07T02:20:05.960Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('37dda34b-cfc2-4645-be67-30e5774f64e0', '5eb14bd1-eaf7-44bb-80df-ddf0b4f2cd03', 'Hồng', 'Nhung Lê', '', '', '01631638888', 'Rekener Str. 53', '', 'Coesfeld', '48653', 'Spain', true, '2026-01-07T02:20:05.978Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d54350bb-9a4a-4750-8545-caa4e9adf33f', '53ea561d-12ea-437e-82d6-a867f8307cbf', '51', 'Salinenstraße', '', '', '', 'Salinenstraße 51', '', 'Bad Rothenfelde', '49214', 'Germany', true, '2026-01-07T02:20:05.988Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('76b32256-0c72-40b0-9082-b59b299799b6', 'e3147b38-a276-4f57-856d-6ee9846afde2', 'Thu', 'Huong Nguyen Thi', '', '', '', 'Thi Thu Huong Nguyen; Daisies Nails ; P4.9; 68161 Mannheim', '', 'Mannheim', '68161', 'Spain', true, '2026-01-07T02:20:06.008Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fcf67536-e7a8-4428-bfda-b6e38afbadf7', '17393531-02e2-46cf-b236-8b220c954666', '18-20', 'Hämergasse', '', '', '', 'Nails 68', '', 'Köln', '50667', 'Germany', true, '2026-01-07T02:20:06.010Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b2ffc7ba-330f-497b-a863-aa84a64b80ec', 'c49af2b6-2aa1-431b-bc37-6d536e2e3eb7', 'thị', 'thuy Trần', '', '', '', 'Pohranicni straze 314/33', '', 'Kraslice', '35801', 'Czech Republic', true, '2026-01-07T02:20:06.019Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('84317290-a047-444d-bcd1-286d589c9c58', '9d4fa3e2-6859-4fd8-8275-c5b201ce2574', '19', 'Hauptstraße', '', '', '', 'Hauptstraße 19', '', 'Berlin', '10827', 'Germany', true, '2026-01-07T02:20:06.031Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fc4838a9-c943-4b33-afbb-ab68094d4fba', 'e546011f-4ebb-4842-af89-52148116286c', 'Kim', 'Tran Vo', '', '', '', 'Hauptstr. 384', '', 'Weil am Rhein', '79576', 'Germany', true, '2026-01-07T02:20:06.060Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fb008963-eb7a-4611-8b4a-f4674eba8580', 'edc7024c-10e8-4785-b9e6-344185a581dc', 'Thi', 'Lin Da Ho', '', '', '728488740', 'Kupeckého 764/11', '', 'praha', '14900', 'Czech Republic', true, '2026-01-07T02:20:06.066Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('79cd3721-3415-4849-b8ac-f8574c087af5', '067f0af1-a9c2-4e74-b73a-8a27ae2a9553', 'Thi', 'Ngoc Uyen Dang', '', '', '', 'Bahnhofstraße 92', '', 'Herne', '44629', 'Germany', true, '2026-01-07T02:20:06.072Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e7b3dd74-f580-4fda-baa1-99f2f5b6d4c5', '9769be60-47f0-465c-a0c9-084c50a27044', 'Thi', 'Huyen Trang Tran', '', '', '', 'Fürstenriederstr. 59', '', 'München', '80686', 'Germany', true, '2026-01-07T02:20:06.093Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b3132ae3-2073-408d-96a3-e0e5dccffc97', '954432d9-fa6c-4e72-8a8b-9481f427878a', '9', 'Waldstr.', '', '', '', 'Waldstr. 9', '', 'Offenbach', '63065', 'Germany', true, '2026-01-07T02:20:05.582Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b0739c91-2785-42c0-9195-55d9e1d3fbd4', '0e5a09b7-8086-431c-88c0-7ea9dc18d14f', 'hung', 'nguyen Van', '', '', '', 'Am Graben 10', '', 'Kaufbeuren', '87600', 'Germany', true, '2026-01-07T02:20:05.584Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1af4bab1-d231-41d5-8871-cc8e1ce16d45', '37537f5c-47b4-4b4f-b1f5-ef0bf2707d46', '52.', 'Lebacherstrasse', '', '', '', 'Lebacherstrasse 52', '', 'Saarbrücken', '66113', 'Germany', true, '2026-01-07T02:20:05.694Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dca43cba-1114-4567-83eb-a91f9c207d21', '345c5911-8caf-41d4-984f-cb635f246651', 'chỉ', 'là Địa', '', '', '52146', 'Kaiser straße 13', '', 'würselen', '52146', 'Germany', true, '2026-01-07T02:20:05.697Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a9c55731-1bc2-4ed6-8fca-2b6a49d506ba', 'b1e3003c-dd4b-4b8c-86d8-99fd794b618e', 'Nguyên', 'Thảo', '', '', '', 'Hennengasse 1', '', 'Erding', '85435', 'Germany', true, '2026-01-07T02:20:05.704Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7782f2ac-c4f6-4a66-986e-47d1f220d106', '8c7bc837-5437-4b0f-af4a-8ff41e651d30', 'tri.phanhuy.9', 'tri.phanhuy.9', '', '', '', 'Adresse: ; ; Pham Thị Thuy ; Cali Nails & Beauty ; Kloster Str.1; 32545 Bad Oeynhausen', '', 'Bad Oeynhausen', '32545', 'Spain', true, '2026-01-07T02:20:05.780Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ed29ba71-511d-4cb2-91be-a9f94ee979eb', 'dc4ad15f-4824-4e13-8344-7280aad56ba7', 'Minh', 'Hoa- Bilan . Nguyen', '', '', '', 'Pulverturmstrasse 30', '', 'München', '80935', 'Germany', true, '2026-01-07T02:20:05.785Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('808274bd-e68e-4fc9-b561-7f92589f7fab', '6a293d35-477e-4b4b-802c-fc638d2ff79b', 'Wedding', 'Dung', '', '', '', 'Heinrich Straße 30', '', 'Gera', '07545', 'Germany', true, '2026-01-07T02:20:05.801Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d9994b80-3f5a-4af5-a5e0-455108127eb5', 'a8b6aeea-dc7a-499f-ae53-b73150b4aa7e', 'Hang', 'Do Thi', '', '', '', 'Schütt 5', '', 'Neustadt', '67433', 'Germany', true, '2026-01-07T02:20:05.808Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('60e110ec-7b60-4fe4-b999-0bbca25463cc', '03752696-cb4b-46a4-b25c-139d861368df', '100009346788020', '100009346788020', '', '', '723795', 'n hà nagelstudio in kaufland bahnhof straße 7', '', 'bad segeberg', '23795', 'Germany', true, '2026-01-07T02:20:05.821Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('868c0fe4-c4cd-42e0-a2b6-fcfdaea87651', '2dd3b03e-9ab4-4fa0-b31e-f2f9489f29e7', 'Nguyen', 'Nikola', '', '', '38533017', 'Chotíkov 385', '', 'Plzeň', '33017', 'Czech Republic', true, '2026-01-07T02:20:05.841Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ced498ff-bf0b-4369-b2fc-a4b3da32bc44', '4ff0ec59-2456-4c9a-bccf-e6228c7d3149', 'thuyanh.la.96', 'thuyanh.la.96', '', '', '', 'Bechel Straße 21', '', 'Koblenz', '56073', 'Germany', true, '2026-01-07T02:20:05.877Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b257c553-acf0-4dba-a39b-8817973b54c7', 'af37a4f2-8310-43dd-aaea-293642fce897', 'chỉ', 'của chị Địa', '', '', '8075172', 'Westliche Karl-Friedrichstraße 80', '', 'Pforzheim', '75172', 'Spain', true, '2026-01-07T02:20:05.899Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c0610f1d-754b-4f40-9dff-ec14ec8b533f', '17f9721f-9b36-4750-9b29-11012ad6a7b1', 'Bang', 'Giang Nguyễn', '', '', '', 'Berger Straße 286', '', 'Frankfurt am Main', '60385', 'Germany', true, '2026-01-07T02:20:05.909Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('289e1a66-a6ae-4a92-9d04-3a81e52847cc', 'a8596796-4877-4dbc-8dfc-5291afd4978e', 'Thi', 'Thuy Trang Dinh', '', '', '', 'Georg Schumannstr 189', '', 'Leipzig', '04159', 'Germany', true, '2026-01-07T02:20:05.914Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('92732e6e-9dc1-479b-9dfc-924d07e65851', 'dac6c63a-ce1f-466a-acdb-567d1f31685e', 'str', '8 Untertor', '', '', '', 'Untertor str 8', '', 'Münstermaifeld', '56294', 'Germany', true, '2026-01-07T02:20:05.916Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c8042501-b00b-4b4f-a38a-a5c022e9f775', 'd0d7ae48-1aae-439a-9dd7-235d8c94b77a', 'trang.hoang.9231712', 'trang.hoang.9231712', '', '', '', 'Dạ địa chỉ chỗ em Your Dream Nails,Wettbachstr.20,71063 Sindelfingen', '', 'Sindelfingen', '71063', 'Germany', true, '2026-01-07T02:20:05.919Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('672f1d9e-02c1-4e6f-be97-1998adde64f4', '3688e7d6-fe63-4e35-a44b-0fc7f9f8c420', '27', 'Rheinstraße', '', '', '', 'Rheinstraße 27', '', 'Ettlingen', '76275', 'Germany', true, '2026-01-07T02:20:05.920Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0d079917-0034-4bee-91f9-1cd0c9ded1f2', 'd978241b-6ca8-4fab-9286-ad36ef8f7767', 'Yen', 'Linh Truong', '', '', '', 'Friedrichstr. 133', '', 'Düsseldorf', '40217', 'Germany', true, '2026-01-07T02:20:05.936Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('78b4af52-47f1-44ee-91b9-015d53a7248c', 'e19548d3-de94-48b8-b3a0-5819da1172a4', 'Platz', '8 Berliner', '', '', '', 'Berliner Platz 8', '', 'Bottrop', '46236', 'Austria', true, '2026-01-07T02:20:05.937Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1d42292b-34b0-4326-9fec-245b0c132c70', '0eea9ec2-6a57-48bb-b225-6e9e0e341ce4', 'thanhnga.pham.71', 'thanhnga.pham.71', '', '', '', 'Neustr 9', '', 'Trier', '54290', 'Germany', true, '2026-01-07T02:20:05.956Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f418975f-00d5-4144-a5d7-45a3390c1feb', '4dd334aa-a5f8-497b-9c07-ba30b177237d', 'Allee', '44 Berliner', '', '', '', 'Berliner Allee 44', '', 'Norderstedt', '22850', 'Germany', true, '2026-01-07T02:20:05.977Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('29bf5300-febf-4cd2-b104-1db76f516cbd', 'c38e1f1f-f356-4cc2-8022-ae86275c5dc0', '14', 'Kerststr', '', '', '', 'Kerststr 14', '', 'Kaiserslautern', '67655', 'Germany', true, '2026-01-07T02:20:05.983Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('87934be9-8322-43d6-bba2-de8f67126943', 'd948ff5b-cf68-4e20-b53d-802d44e406a0', 'Nguyen', 'thi Duyen', '', '', '', 'Kuhgasse 8', '', 'Düren', '52359', 'Germany', true, '2026-01-07T02:20:05.997Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('927a5fce-40eb-4a67-8d27-2cd3616b5baf', '1316d045-c352-4da0-9120-28b0700d8dc2', 'van', 'doan Le', '', '', '', 'Gartenstraße 12', '', 'Tuttlingen', '78532', 'Germany', true, '2026-01-07T02:20:06.000Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5d8a808c-cfdb-485d-b2b8-ffd92f5b218a', '524a908f-8375-48ce-89bd-4e2ab4b242b9', 'phương', 'Thuý Bui', '', '', '', 'Kothersgasse 11', '', 'Schmalkalden', '98574', 'Germany', true, '2026-01-07T02:20:06.004Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bf696d2c-add8-4fb0-ae56-6fb3389176ba', '875b8b57-83b9-47c6-b69d-eb4bc125e17c', 'Huong', 'Thu', '', '', '', 'Löwenstraße 24', '', 'Rüsselheim', '65428', 'Germany', true, '2026-01-07T02:20:06.021Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('444b2657-e2a9-4c8e-8a2b-395b961006ed', '550d3545-e13b-4778-ab2f-962959928fe8', 'dang', 'thi lien Tên', '', '', '', 'Eugen-Jaekle-Platz 37', '', 'Heidenheim', '89518', 'Germany', true, '2026-01-07T02:20:06.024Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d9219b65-f513-40ce-991b-5fd791b11129', '0d13d577-739a-4eca-ac2a-d9c4bbca57d0', 'Thi', 'Tuyet Vu', '', '', '', 'Bahnhofstr. 18', '', 'Neu Wulmstorf', '21629', 'Germany', true, '2026-01-07T02:20:06.028Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('670fd535-c846-45b9-abba-263c8c9cb377', '3613ce66-3964-4053-9dbb-7de74e5e9a30', 'thị', 'hà Ta', '', '', '773242758', 'halkova 190', '', 'Rozmintal pod tremsinem', '26242', 'Germany', true, '2026-01-07T02:20:06.048Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6c8fd22b-744c-429f-b94d-30a51a4e39f1', '8bee2c3d-1b79-4751-acd0-a47fc8fc6f1c', '2', 'Industriestraße', '', '', '', 'Industriestraße 2', '', 'Dutenhofen', '35582', 'Spain', true, '2026-01-07T02:20:06.080Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('42fd1e34-a4a0-4b54-935c-0390b6b2ab93', '9ec705a1-53ad-4e9f-98f6-ba244a4f22e7', 'Nguyen', 'Thanh', '', '', '', 'Hermann Lange Str. 46', '', 'Bremen', '28279', 'Germany', true, '2026-01-07T02:20:06.086Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f6e8f195-2b36-4bc3-9121-7c11d4534404', '99d584ea-bf03-46f9-a04b-38732a4c5f76', 'mailantranova', 'mailantranova', '', '', '', 'Bundesgasse 20', '', 'Bern', '3011', 'Germany', true, '2026-01-07T02:20:06.088Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3ab00044-62e2-42c7-a3c9-4dc6abc866d9', '268deb48-675a-42b0-9ee0-4bfe3870547a', 'Weilstrasse', '29 Grosse', '', '', '', 'Grosse Weilstrasse 29', '', 'Hattingen', '45525', 'Austria', true, '2026-01-07T02:20:06.100Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9af26f2a-3286-446c-8c4d-ef63a0477800', '20f8304c-9263-44d1-9ede-87e069b77ae1', 'trannnchibi', 'trannnchibi', '', '', '', 'Ostring 7', '', 'Wiesbaden', '65205', 'Germany', true, '2026-01-07T02:20:06.119Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3b5c395a-3b4b-40e5-9b13-664f098f083f', '2abcdf20-a3c4-4926-841e-dec66d013d41', 'Huong', 'Le', '', '', '608068515', 'Skupova 490/24', '', 'Plzen', '30100', 'Czech Republic', true, '2026-01-07T02:20:06.126Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('44bf2c52-f2af-49f3-9744-4112a64bdafb', '7fc25375-a9e2-41e3-bdf4-29b2096c2a58', 'Van', 'Lai Thanh', '', '', '', 'Kasseler Str. 13', '', 'Fritzlar', '34560', 'Germany', true, '2026-01-07T02:20:06.132Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b11695c-2d46-4f93-b06f-a513bee62442', '0de6ebf6-5cc8-4e53-a995-2c5bd70bdcd7', '2(', 'Nordwestzentrum) Tituscorso', '', '', '', 'Tituscorso 2', '', 'Frankfurt am main', '60439', 'Germany', true, '2026-01-07T02:20:06.139Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1724d43f-e6dc-4ec3-b1bb-d70e99509143', '5ddbfc57-9650-4347-a8db-cd74322d48cb', 'Nhung', 'Vu Hong', '', '', '', 'Meisenweg 3', '', 'Boppard', '56155', 'Germany', true, '2026-01-07T02:20:06.146Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('58a78879-dd9f-43f4-97b9-8458e1d44684', 'd3680411-c5a0-42ed-acc1-69c5795802d9', 'Anh', 'Nguyen Quynh', '', '', '', 'Frankfurter Str. 93', '', 'Bad Vibel', '61118', 'Germany', true, '2026-01-07T02:20:06.511Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('11bd811e-b76a-49a6-848a-ae0ef931cee1', '04ecd376-4286-43f2-a857-4549097dd7bc', 'Anh', 'Nguyet', '', '', '', 'obere Vorstadt 11', '', 'Haßfurt', '97437', 'Germany', true, '2026-01-07T02:20:06.104Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cc53af8e-fdf7-407d-9cd8-e31e12eda8ec', 'f686cf72-41d1-40f5-8e08-2c317237b98d', 'Forum', '1 Im', '', '', '', 'Im Forum 1', '', 'Hanau', '63450', 'Germany', true, '2026-01-07T02:20:06.106Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d9124b38-d197-403d-b627-6dfd8715b38b', 'fd3f237d-9dbe-4149-80c6-96cb7b9f9cbd', '–ho', 'Nguyen', '', '', '', 'Wippendorfstraße 7', '', 'Neumünster', '24534', 'Germany', true, '2026-01-07T02:20:06.107Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5e610bed-884b-47ac-b42e-b6960f69cdd6', '1b2ff2ae-1051-451c-ac45-1e64805e8a64', 'Str.', '51-53 Knapper', '', '', '', 'Knapper Str. 51-53', '', 'Lüdenscheid', '58507', 'Germany', true, '2026-01-07T02:20:06.113Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('207ac077-9a0b-4a8f-a5b0-b907bba13fa6', '6e341839-8e17-4b19-9007-93c91d3e8587', 'Xuan', 'Thanh Tran', '', '', '776346869', 'Poděbraská 297', '', 'Pardubice', '53009', 'Czech Republic', true, '2026-01-07T02:20:06.123Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e3c3109e-15a7-4b6c-b701-f4d32aa92f32', 'ddbe14f0-778c-435e-9a49-b87cf543bfc7', 'thi', 'huyen trang . cao', '', '', '607743', 'Engelnails Grietgasse 6', '', 'Jena', '07743', 'Germany', true, '2026-01-07T02:20:06.125Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5d2f8139-814e-418f-8454-ff2518dbd918', '749f00d1-55c9-47ea-9b9f-7451553b369e', 'Thi', 'Van Anh Do', '', '', '', 'Bahnhofstraße 15', '', 'Merseburg', '06217', 'Germany', true, '2026-01-07T02:20:06.143Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('beca3f01-0591-4e40-a4a4-1e34aa3521fb', '5dcfa9c9-b80c-4df2-a6ba-ead87eda3d19', 'Thi', 'Thao Phan', '', '', '', 'Bergheimer Str. 489', '', 'Neuss', '41466', 'Germany', true, '2026-01-07T02:20:06.146Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c68f27ab-8dd6-491a-aa6b-6b6aac9790c3', '4478dbf5-50f7-40f7-84d6-a2a37c228459', '980/28', 'Moskevská', '', '', '777805998', 'Moskevská 980/28', '', 'Karlovy Vary', '36001', 'Czech Republic', true, '2026-01-07T02:20:06.159Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f1e0813d-a43f-459e-8aea-6a37bdbae154', 'f119e441-fb53-44b2-8d97-f152219fbbcf', 'man', 'nguyen Thi', '', '', '', 'Am Moorteich 4', '', 'Salzwedel', '29410', 'Germany', true, '2026-01-07T02:20:06.173Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('38da8fe2-fa61-4296-b3af-1a019a01e221', 'b5f3dbf0-36f3-4d51-8824-62cd972a31c2', '39', 'Königstraße', '', '', '', 'Königstraße 39', '', 'Lübeck', '23552', 'Germany', true, '2026-01-07T02:20:06.184Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('98105620-f400-4cf5-a7ec-7ccd4126d93b', '13f82669-299c-45d8-a540-e25d5267c020', '36/37', 'Krahnstr', '', '', '', 'Krahnstr 36/37', '', 'Osnabrück', '49074', 'Austria', true, '2026-01-07T02:20:06.186Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('26cf1348-9e79-44f0-9489-e19087b31644', '2eff8e8e-fb46-43c4-9bd6-f604572730c7', 'anh', 'pham Thi', '', '', '', 'Dürener str 176', '', 'köln', '50931', 'Germany', true, '2026-01-07T02:20:06.189Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c5d87dbb-ea37-442e-ba8f-fb36dbee8ed2', '67ac5edb-91ce-43cb-9a25-5df25cf0915e', '2b', 'Bahnhofstraße', '', '', '', 'Bahnhofstraße 2b', '', 'Bayreuth', '95444', 'Germany', true, '2026-01-07T02:20:06.193Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fcb3064c-3d9b-4295-96c7-9d13bb84b029', '57f8911f-9d93-4207-ad8a-4dc32ca1d1fb', 'thanh', 'huynh Kim', '', '', '', 'Weststr. 38-40', '', 'Hamm', '59065', 'Spain', true, '2026-01-07T02:20:06.205Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('055c212a-3242-4ee5-bb8f-acc4f19dc970', '3e20b56f-0f6c-4ce4-a65c-922ea9381709', 'thi', 'Dan Phuong Nguyen', '', '', '', 'Babenhäuser Straße 23', '', 'Dietzenbach', '63128', 'Germany', true, '2026-01-07T02:20:06.206Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d55c9803-8019-4a79-bcfc-777407e04f7c', 'a5baac70-7861-418c-8472-48d664c185b3', 'Str', '20 Kreferlder', '', '', '', 'Kreferlder Str 20', '', 'Duisburg-Rheinhausen', '47226', 'Germany', true, '2026-01-07T02:20:06.226Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d37578df-ad25-4191-9fa2-1f9712687ab1', '2bc20db1-b4ca-4c64-a5a4-b6926528fc20', 'Kim', 'Anh Nguyen', '', '', '', 'Münster Strasse 15', '', 'Rheine', '48431', 'Germany', true, '2026-01-07T02:20:06.239Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2faa9e5b-e833-48ab-821a-179143a23930', '60661e69-e1da-4234-9e0a-5fa20ef92258', '100010710799004', '100010710799004', '', '', '', 'Heinigstraße 31', '', 'Ludwigshafen', '67059', 'Germany', true, '2026-01-07T02:20:06.259Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b1aabda2-0ac2-4ca6-a0b8-aa24178d9e60', '8d95d71b-7582-486f-a1ec-b17697178822', 'Thi', 'Trang Trieu', '', '', '', 'Marstallstraße 1', '', 'Ludwigsburg', '71634', 'Germany', true, '2026-01-07T02:20:06.288Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2f1b2cd6-f8d9-42fe-ad9e-9a22f44b0c15', '75000708-9843-4b78-af1b-ecd785292658', 'Nguyen', 'Van Tai', '', '', '', 'Poststraße 24', '', 'Radolfzell', '78315', 'Germany', true, '2026-01-07T02:20:06.300Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('15427815-e83a-4488-927e-86216eac1e28', '80a4c88a-c2b0-4f68-9c51-9d02cbbe4713', 'thị', 'lương Nguyễn', '', '', '', 'Prerower Pl. 1', '', 'Berlin', '13051', 'Germany', true, '2026-01-07T02:20:06.315Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cd555163-14c3-43c7-8118-4b59ed661ed0', 'f492984f-1c16-490b-8def-33b51c6f09cd', 'Nguyen', 'Nam', '', '', '', 'Hauptstrasse 37', '', 'Waldshut Tiengen', '79761', 'Germany', true, '2026-01-07T02:20:06.347Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e94c535e-48c9-418e-8287-e10e0f5de229', '84bc70d4-689e-4213-9954-d78e3e57b950', 'Thu', 'Huong Tran Thi', '', '', '', 'Kim Nails And More; Thi Thu Huong Tran; Brückstr.35 ; 44135 Dortmund', '', 'Dortmund', '44135', 'Germany', true, '2026-01-07T02:20:06.354Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b475575f-fc4f-4f37-a4a6-5e115f2bdea9', '29448195-5479-4ce8-b1dc-3ce1a4c2c4f9', '1', 'Thomas-Howie-Straße', '', '', '', 'Thomas-Howie-Straße 1', '', 'Östringen', '76684', 'Germany', true, '2026-01-07T02:20:06.362Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('76fc7c11-4915-451d-b664-5de68a9e3bef', '2ac000cf-d876-411c-994c-d6eaeabd18c3', 'Thu', 'Hien Nguyen', '', '', '', 'Hospitalstr 7', '', 'Pirna', '01796', 'Germany', true, '2026-01-07T02:20:06.367Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('601ac4f5-f41e-4b1a-95ac-057d6699ee58', '7225fa06-22af-49c8-89b7-04a18946aee9', 'thành', 'thủy Lê', '', '', '', 'Alte Freiheit 9', '', 'wuppertal', '42103', 'Germany', true, '2026-01-07T02:20:06.374Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eba7a32c-1d27-4ee8-9b0b-482b8c65180d', '508c709e-668d-4ec3-9278-e73c6febf4db', 'Fischbrunnen', '2 Am', '', '', '', 'Am Fischbrunnen 2', '', 'Plochingen', '73207', 'Germany', true, '2026-01-07T02:20:06.376Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('26ba3875-f9cf-45cb-9cd4-2828dcb0e00e', '9c0aa39c-e079-4475-a075-d8bcb6cbf274', 'bei', 'Kaufland UG', '', '', '295327', 'Johannisthaler Chaussee 295-327', '', 'Berlin', '12351', 'Germany', true, '2026-01-07T02:20:06.387Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('24c2ef96-84d6-4a85-888e-073005e1e2ca', 'e83c2863-d26e-45f7-9888-a28084cd8941', 'Dinh', 'Hai Tran', '', '', '', 'Mehringdamm 75', '', 'bl', '10965', 'Germany', true, '2026-01-07T02:20:06.393Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2492e7ad-e961-4440-82e3-2ee103d0df24', '7504b527-0c40-4544-9963-0e038bcf0e11', 'Ngoc', 'Pham Minh', '', '', '', 'Minh Ngoc Pham; Gasthaus str.20; Valentina Nagelstudio; 47533 Kleve', '', 'Kleve', '47533', 'Germany', true, '2026-01-07T02:20:06.414Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('821397b7-f7e5-42a7-8e0a-883267843e5f', '6d3a4091-219c-4719-a585-c5e48964c1a7', '2', 'Kirchstraße', '', '', '', 'Kirchstraße 2', '', 'Darmstadt', '64283', 'Germany', true, '2026-01-07T02:20:06.416Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b7d34756-2494-4674-bd88-abdd578b10dd', '1d52ef84-6c0e-4b70-9c28-4db00ed295ea', 'str16', 'Staufener', '', '', '', 'Staufener str16 ; 79189 Bad krozingen ; Emily nails', '', 'Bad krozingen', '79189', 'Germany', true, '2026-01-07T02:20:06.449Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('15e64965-bf41-4d80-98d0-ea2ba1cc2c0d', '5d12588c-d483-4932-b85d-56e4e95c8ae0', '53', 'Rathausstraße', '', '', '', 'Rathausstraße 53', '', 'Völklingen', '66333', 'Austria', true, '2026-01-07T02:20:06.464Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1632d59e-4985-4112-a14f-6c1a455536b0', '3bb7df06-1b21-4160-956f-53f352a058b9', 'khue', 'dao Minh', '', '', '', 'Steinweg 19', '', 'Kirn', '55606', 'Germany', true, '2026-01-07T02:20:06.471Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('54a0505b-03bc-447d-bfe1-7ac5c9d58ebb', '36f8d6d0-06fd-492a-bd15-7da6438ed839', 'Huyen', 'Mon', '', '', '', 'Poststraße 3', '', 'Blieskastel', '66440', 'Spain', true, '2026-01-07T02:20:06.482Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('08d100b9-9a4f-4d54-b82f-6057fbcc0753', 'aaa86a6b-9512-4b03-9b2c-f1aae15f1707', 'Allee', '102 Frankfurter', '', '', '', 'Frankfurter Allee 102', '', 'Berlin', '10247', 'Germany', true, '2026-01-07T02:20:06.522Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('313087ec-f5b4-4365-aecb-05621853f03f', 'a4b03948-f7dc-47bf-ae8f-c5303eabc935', '139', 'Kaiserstrasse', '', '', '', 'Kaiserstrasse 139', '', 'Würselen', '52146', 'Germany', true, '2026-01-07T02:20:06.526Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('186e6c41-cfde-4a04-b77d-05df8328f9c8', '9104996b-3287-40ab-9eef-e02f5f894bad', 'Thị', 'Huyền Hoàng', '', '', '', 'Königsbrücker Straße 48', '', 'Dresden', '01099', 'Germany', true, '2026-01-07T02:20:06.628Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1a7e2352-9ccb-4634-9afa-ca9796f5cf37', 'ca78e64d-34d9-4b0a-81c8-4d8152b31f93', 'Van', 'Khang Tran', '', '', '', 'Oberntorwall 23', '', 'Bielefeld', '33602', 'Germany', true, '2026-01-07T02:20:06.629Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cbfcb2f6-58e6-43c3-9e75-a8ffb3c91100', 'aa116ff1-350a-4b93-8923-9aeac53cba47', 'thanpro999', 'thanpro999', '', '', '30938', 'Von Alten Straße 12', '', 'teen quán Lynnynails', '30938', 'Germany', true, '2026-01-07T02:20:06.165Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4f33fabc-68bf-4242-8130-b6e36a314ab8', 'e7462b73-4b9c-48ee-b3c1-9184bf8ca952', 'Nguyen', 'Thi Thuc', '', '', '', 'Ritterstraße 26', '', 'Döbeln', '04720', 'Germany', true, '2026-01-07T02:20:06.166Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5cbc237c-a0ab-4489-9ff6-bdf678c66dac', '21b482e3-6ff4-4663-a3cc-c15946614a94', 'Thi', 'Thuy Ly Dang', '', '', '', 'Dang Thi Thuy Ly; Lily Nails ; Mundipharma Str.1; 65549 Limburg', '', 'Limburg', '65549', 'Germany', true, '2026-01-07T02:20:06.173Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('96a70681-ab18-4eaa-b3f3-a0efee05f433', '55b937e4-7c0c-4caa-9f42-5ba244db93ce', 'Markt', '2 Neheimer', '', '', '', 'Neheimer Markt 2', '', 'Arnsberg', '59755', 'Germany', true, '2026-01-07T02:20:06.193Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d85f81ca-f904-4e35-9a36-19387ad1250a', '582947d7-7bf0-40cb-8e08-ab75283a2c0d', '100004872193088', '100004872193088', '', '', '6066121', 'Triệu phương LY.  Tilsiter str60 66121 Saarbrücken.', '', 'Saarbrücken', '66121', 'Germany', true, '2026-01-07T02:20:06.214Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('47edef9c-e080-47f2-b3aa-372ef27a3b16', 'bfe62898-159b-45f5-b801-d1c7a65803e9', 'Polished', '(im NordWestZentrum) Gel', '', '', '', 'Nidacorso 11', '', 'Frankfurt am Main', '60439', 'Spain', true, '2026-01-07T02:20:06.224Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('61575f27-dc28-4f0d-a6e2-a5c6973633f2', 'ef808375-b4de-42e2-abe7-d9512572eb74', 'Nguyen', 'Linh', '', '', '', 'Salzstrasse 22', '', 'freiburg', '79098', 'Austria', true, '2026-01-07T02:20:06.236Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('408a2944-2828-4ee7-aec3-4d47ce226d95', 'fd800fb2-a786-4450-89d5-ced65f8ef919', '274', 'Hauptstr', '', '', '068345796585', 'Hauptstr 274', '', 'Schwalbach', '66773', 'Germany', true, '2026-01-07T02:20:06.247Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('308b0ddb-f2ca-41e1-8e98-b3cd30f8a3f6', '6bd83566-f112-47da-96bb-1d95ed9218b7', '9', 'Schiller-Straße', '', '', '', 'Schiller-Straße 9', '', 'Ludwigshafen', '67071', 'Germany', true, '2026-01-07T02:20:06.251Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c08fd62c-46ba-447b-968b-f164119ac1b1', '3c87e947-dbec-492a-924f-c757852c93c5', 'van', 'Tuoc Nguyen', '', '', '', 'Posthalterweg 10', '', 'Oldenburg', '26129', 'Germany', true, '2026-01-07T02:20:06.255Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a0003f2a-be03-44be-908e-1b987885b621', 'd8b4cc1c-671e-4d0a-af16-9813e68b1ee8', '3', 'Luisenstraße', '', '', '', 'Luisenstraße 3', '', 'Baden-Baden', '76530', 'Germany', true, '2026-01-07T02:20:06.257Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('73926770-74fa-462d-93fa-7d0d7b4e0f34', '193247bd-38c5-476a-9f3c-383d120e703f', 'Thuỳ', 'Weber Minh', '', '', '', 'Bauhof str 1', '', 'Dinkelsbühl', '91550', 'Germany', true, '2026-01-07T02:20:06.269Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('95f847e5-c432-4334-926b-89ab8f337049', '227a4ac1-ea90-4524-b640-600f0f40b9d7', '3', 'KirchStraße', '', '', '', 'KirchStraße 3', '', 'Kleve', '47533', 'Germany', true, '2026-01-07T02:20:06.271Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4f2d13ac-4e1f-4834-946b-c50527922389', '0350340e-5d93-4d9c-9bc0-891249711292', 'nu.ny.144', 'nu.ny.144', '', '', '', 'Virchowstraße 30', '', 'Wilhemshaven', '26382', 'Germany', true, '2026-01-07T02:20:06.276Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('11bdcff6-4737-4fbe-9061-7d2ede5c1fc9', 'f284ec3f-aa52-4df1-8d21-f6405fc6d26e', 'Str.', '109 Wormser', '', '', '017697733456', 'Wormser Str. 109', '', 'Frankenthal', '67227', 'Germany', true, '2026-01-07T02:20:06.278Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('32d55c9e-af41-4043-b83d-6948c5168c96', 'c507f13f-b100-4594-89ba-2fc9ceab9bc6', 'Str.', '277 Moerser', '', '', '', 'Moerser Str. 277', '', 'Kamp-Lintfort', '47475', 'Germany', true, '2026-01-07T02:20:06.279Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d7d63db2-e4ef-41dc-ac06-eadbe33346f6', '7e04ab93-18f4-4a15-8240-e7e33acf5f48', '84', 'Hauptstraße', '', '', '', 'Hauptstraße 84', '', 'Zweibrücken', '66482', 'Germany', true, '2026-01-07T02:20:06.295Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4b63d724-875f-4f0a-a6ea-a5499bfc8d70', 'e230d8cd-fb95-4446-8d6d-756526ee6d65', 'Löhr', 'Tam', '', '', '', 'Tam Löhr ; Waffenschmidtstrasse.2; 50767 Köln', '', 'Köln', '50767', 'Germany', true, '2026-01-07T02:20:06.308Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4ebd30b1-73e7-4b5b-985f-ee60ba441520', 'bc878aa4-51eb-4fcf-a2e3-555718606029', 'Thi', 'Lan Ly Be', '', '', '', 'Kleine Kirchgasse 2', '', 'Wiesbaden', '65183', 'Germany', true, '2026-01-07T02:20:06.314Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('52ed9d9f-923e-4e1c-bd1e-6284950b192e', 'eb1578ad-2ebd-495a-a021-e42dd2f37b5c', 'Hong', 'Nhung Nguyen', '', '', '', 'J. Svermy 122712', '', 'Vejprty', '43191', 'Czech Republic', true, '2026-01-07T02:20:06.315Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('13100766-2681-4fbc-b06b-971971de7588', '977ede17-f680-4af5-a5b3-dc234071703b', 'Thi', 'Tham Hoang,', '', '', '', 'Annaberger Straße 317', '', 'Chemnitz', '09125', 'Germany', true, '2026-01-07T02:20:06.330Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b2aa46d6-8a11-4f5c-b0f6-6e81f33390fe', '053dc016-a433-45e4-8ae9-aa59dcb53187', '100036987399445', '100036987399445', '', '', '', 'Singerstraße 29', '', 'Berlin', '10243', 'Germany', true, '2026-01-07T02:20:06.333Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ee26a620-1c98-49b0-88f8-5dfebead0bd1', '5b4df6c4-e45a-4594-a94d-96531dac3a55', 'Hai', 'Yen Luu', '', '', '', 'Ludwigstrasse 53', '', 'Mörfelden Walldorf', '64546', 'Germany', true, '2026-01-07T02:20:06.335Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('66327c31-96db-4e08-afc4-f9f127584fd0', '86bfd174-6c14-4442-ba2c-92b940079e78', 'Phuong', 'Anh Pfister-Nguyen', '', '', '', 'Untere Breite 33', '', 'Ravensburg', '88212', 'Germany', true, '2026-01-07T02:20:06.353Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2469c81a-780d-440b-ace3-582c8df5e553', 'a60d2265-2e08-4093-a76d-eb9f088f51a4', 'Nhan', 'Le Xuan', '', '', '', 'Wormser Str. 23', '', 'Frankenthal', '67227', 'Germany', true, '2026-01-07T02:20:06.357Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c97a1cff-20c1-4df5-bdf1-55b5f53098d1', '77a0032b-d498-411a-930e-d0cf7f27cada', 'Thi', 'Thoai Tran', '', '', '', 'Friedrichstraße 02', '', 'schopfheim', '79650', 'Germany', true, '2026-01-07T02:20:06.373Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('95e15806-24e9-4ed2-a570-f3c151bd50a1', '5327c7c2-cb47-4e12-9aaa-9a7d365fe168', 'Center', 'Carree', '', '', '', 'Weender Str 75', '', 'Göttingen', '37073', 'Germany', true, '2026-01-07T02:20:06.394Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('de2386a6-f4b6-44ba-8989-44cd5f920a62', '12b823ac-03c4-4550-b876-9930bda48cc4', 'thị', 'hương ly Trần', '', '', '', 'Kennedy str 18', '', 'Maintal', '63477', 'Germany', true, '2026-01-07T02:20:06.395Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1071da27-a6a0-45a4-b25e-9ffd98d5c10f', '3694a36d-b00d-458c-99fb-eb9ec3f41304', 'Duc', 'Tuan Nguyen', '', '', '017657611383', 'Kantstraße 15', '', 'Trainreut', '83301', 'Germany', true, '2026-01-07T02:20:06.405Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f96a079a-2d99-4dac-87f9-40a227a3a9a4', 'f8382660-d84a-4149-98e9-50d098736f7b', 'thanh', 'hoa Vu', '', '', '', 'Neustrasse. 23', '', 'Mayen', '56727', 'Germany', true, '2026-01-07T02:20:06.427Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a834272a-08eb-47d8-8996-b52a233e0878', '5056b119-0c88-42bb-a286-20e5a1790f6d', 'Thai', 'Hien Tran', '', '', '', 'Tran Thai Hien                     ; Nailsdeluxe(im pep); Ollenhauerstr .6; 81737 München; Germany', '', 'München', '81737', 'Germany', true, '2026-01-07T02:20:06.449Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5656cd00-0038-41a6-8f49-c015c7d58b59', '46bf2c30-0aa7-48f8-bb12-58c2e013481d', 'Nhat', 'Xuan', '', '', '', 'Ehrenstraße 18', '', 'Köln', '50672', 'Austria', true, '2026-01-07T02:20:06.463Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('db2aca19-c5ef-4f64-b655-f9cbb15b0f02', '70b30c85-6c9f-417d-8afb-b8e765b6521e', 'Van', 'Nguyen Thu', '', '', '', 'Lange Str 8A', '', 'Detmold', '32756', 'Germany', true, '2026-01-07T02:20:06.471Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1a169d23-647f-4dcd-9f6b-ae559c204249', '807950bd-58e9-4976-98a7-0b6d93936e73', 'Phuong', 'Le Yen', '', '', '', 'Alt-Schwanheim 41', '', 'Frankfurt am Main', '60529', 'Germany', true, '2026-01-07T02:20:06.483Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e9c0d6c7-8381-4c05-bb0c-dd1050caf4e8', '8b0bda81-6900-419b-aeca-9b1162fd6d8c', 'Straße', '7 Düsseldorfer', '', '', '', 'Düsseldorfer Straße 7', '', 'Leverkusen', '51379', 'Germany', true, '2026-01-07T02:20:06.489Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('db2f5ec3-189b-4257-8beb-3a23a9234519', '948b67a5-8be8-4e65-8bee-37de8321112c', '2', 'Conventstraße', '', '', '', 'Conventstraße 2', '', 'Hamburg', '22089', 'Germany', true, '2026-01-07T02:20:06.523Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('438b536c-2ede-4936-a93f-4f6342ea6bb0', 'e6c2fbd2-97b1-4d5a-830e-950cf92a92f4', '18', 'Heidestraße', '', '', '', 'Heidestraße 18', '', 'Dessau Roßlau', '06842', 'Germany', true, '2026-01-07T02:20:06.549Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c729e38d-4d63-4cc7-aa68-4659429938f7', 'a0947a75-a864-4845-bc4f-367c711c16d0', 'PASSAGE', 'NORDSEE', '', '', '', 'BAHNHOFSTRASSE 10', '', 'WILHELMSHAVEN', '26382', 'Germany', true, '2026-01-07T02:20:06.564Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0810c294-3b2f-46dc-8103-05c6fb14d732', 'ba83dd2e-50a1-4c82-b8ad-15c7e0339740', 'Lê', 'thi my hiên Huynh', '', '', '', 'Gemarkenstraße 52', '', 'Essen', '45147', 'Spain', true, '2026-01-07T02:20:06.565Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b200c2e-e250-4da2-93fe-d863a92cce2f', 'bb6368cf-d4df-49e6-8807-1325991f06fc', 'Victor', 'Lâm', '', '', '', 'Oder', '', '', '', '', true, '2026-01-20T09:48:28.662Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1c0b734e-5c63-46ea-af11-5f7ef8d98834', '8130461d-b46e-4c58-8ef8-b84c2471df48', 'huy', 'nguyen Kim', '', '', '', 'Hauptstr 116', '', 'Sundern', '59846', 'Germany', true, '2026-01-07T02:20:06.532Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fb8112f2-bd71-4400-8d66-4b3b67109e46', '64f99561-87cc-471f-b9f4-b1af71457e70', 'Hong', 'Nhung Nguyen', '', '', '608251566', 'Ouvalova 333', '', 'Slany', '27401', 'Germany', true, '2026-01-07T02:20:06.544Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3e462641-ac42-44cb-ab77-21ba50c1e847', '8a0203da-3ed8-4ca8-abb0-b73914999a76', 'Yen', 'Nguyen Thi', '', '', '', 'Steinweg 66', '', 'Gifhorn', '38518', 'Germany', true, '2026-01-07T02:20:06.546Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4b2aff78-a408-474b-95d5-ca276a843778', 'dfebf707-023d-4816-be24-b7f96b460606', 'Thi', 'Thuy Tran', '', '', '', 'Klammstr 14a', '', 'Garmisch-Partenkirchen', '82467', 'Germany', true, '2026-01-07T02:20:06.548Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b563c2c8-cd4a-4786-8cb4-05791ae2466d', '9d0f20d9-613d-4e46-a336-ba851bd85b9a', 'Truong', 'Mai', '', '', '', 'Alexander str 2', '', 'Bayreuth', '95444', 'Germany', true, '2026-01-07T02:20:06.569Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d2593c18-6877-492f-a6e2-810c9c8132d0', '10edf16f-c029-4f2b-8650-38493edb7336', 'van', 'trung Tran', '', '', '1982538', 'Sudetenstr. 19', '', 'geretsried', '82538', 'Germany', true, '2026-01-07T02:20:06.585Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('66e4c5a6-889f-4fe2-8c7b-c47566977fb3', '585a9e25-5b39-45a0-8805-4a5776ab3c14', '51', 'Spitalhofstraße', '', '', '01727868686', 'Spitalhofstraße 51', '', 'Passau', '94032', 'Germany', true, '2026-01-07T02:20:06.588Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('30cdaa37-20e2-4ea6-96c0-376b19127fc2', 'cec0cfbf-8f14-4087-b6be-6f7fc794a348', 'Quỳnh', 'Trang Mai', '', '', '+491782672785', 'Oebisfelder Straße 44', '', 'Klötze', '38486', 'Germany', true, '2026-01-07T02:20:06.595Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('235877f7-cedc-43ab-a7d1-f2e12bd60d32', '619b9cbf-11fb-4a8b-b43d-454be672a33c', 'Straße', '49.10119 Berlin Tor', '', '', '', 'Tor Straße 49', '', 'Berlin', '10119', 'Germany', true, '2026-01-07T02:20:06.607Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1adf402d-b683-4ee9-b295-28a42909a1d6', 'ebffcfde-428b-4e27-8615-64d3021c3423', 'Ngoc', 'Tung Pham', '', '', '', 'Burgstr. 4', '', 'Köln', '51103', 'Germany', true, '2026-01-07T02:20:06.616Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('91a353cd-18d9-48aa-a904-88bb777d17a3', '77159a63-2261-4416-b403-8866bd722659', 'Thuan', 'Ha Thanh', '', '', '608222389', 'Na Valech 398/58', '', 'Litomerice', '41201', 'Czech Republic', true, '2026-01-07T02:20:06.648Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('283fefc5-67dc-48ad-942a-971d7f301cf5', '026c32bd-c672-4f3c-b74d-039daa4e6b7a', 'pham', 'hung lam Nguyen', '', '', '', 'Gunnar Wester 10', '', 'Schweinfurt', '97421', 'Spain', true, '2026-01-07T02:20:06.660Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0594b5fb-7e41-4901-bb4c-854fb54852e1', 'f657fa9d-5da0-4595-a565-9aeca84ef12b', '100069997807112', '100069997807112', '', '', '', 'Chi o  Stumm Str 38', '', 'Dillingen', '66763', 'Germany', true, '2026-01-07T02:20:06.673Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7b47d3b1-33fd-4b4f-86d1-ee1d3b9f7f28', '54179691-df7e-4119-b216-2a78a8b8877a', 'ngocthu.lenka', 'ngocthu.lenka', '', '', '778860806', 'Bui thi thu husova 256', '', 'S', '37810', 'Spain', true, '2026-01-07T02:20:06.683Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3c61d89a-766b-4fbe-b4bb-c57548b796ad', '5e80e6db-0308-4c95-b8a1-fafa8a3a2a9f', '31', 'Schulstraße', '', '', '', 'Schulstraße 31', '', 'Mannheim', '68199', 'Germany', true, '2026-01-07T02:20:06.703Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('aa7a1dc5-cf08-4fe4-a284-0ff97c79fa9e', 'be336ae5-cd0f-406f-9d2f-86d6ad6e001d', 'Marktpassage', 'Heide', '', '', '', 'Markt 43', '', 'Heide', '25746', 'Germany', true, '2026-01-07T02:20:06.774Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7822253e-2eba-41bd-9b81-12983a3d64bd', '19fbfdf9-d3a7-4f45-9a1d-77845b429a8c', 'Anh', 'Hoang Van', '', '', '', 'Van Anh Hoang; Aiko Nails; Eberhardstr.30; 70736 Fellbach', '', 'Fellbach', '70736', 'Germany', true, '2026-01-07T02:20:06.784Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('31a3150a-94ff-4743-9bbe-cf6a03578044', '7eb7e09a-42eb-4bc0-ad81-f2bb4e5e167d', '100044088938058', '100044088938058', '', '', '', 'EU nail. 1O', '', 'Wiesbaden', '65189', 'Germany', true, '2026-01-07T02:20:06.805Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6eb2dd2f-f5bf-48f0-9e78-1689cbdf5568', 'a80136fc-7f59-42dc-85ab-5b60cd03a91b', 'về', 'Gửi', '', '', '266424', 'Robert-Bosch- Straße 2', '', 'Homburg', '66424', 'Germany', true, '2026-01-07T02:20:06.809Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('03801c1d-00cd-4651-97f2-fd7b28026b09', '622d4829-f35b-4ee1-b2d8-440c5c5b6791', 'thi', 'hoa Nguyen', '', '', '', 'Uhlstrabe 56', '', 'brühl', '50321', 'Germany', true, '2026-01-07T02:20:06.828Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('58fa13df-4103-4f33-9b81-30e30db9a526', 'c92d528f-49bd-44d2-9f48-c8cdac12c404', 'Team', 'Leo', '', '', '', 'Aschaffstr. 47', '', 'Aschaffenburg', '63741', 'Germany', true, '2026-01-07T02:20:06.845Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('92d1a1e8-e9ff-45c4-b2de-470639865e13', '5046335d-f446-4449-8422-1d1d88a13590', 'Thị', 'Thanh Thảo Nguyễn', '', '', '', 'Brunnenallee 123', '', 'Bünde', '32257', 'Germany', true, '2026-01-07T02:20:06.848Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1b8435e8-7f98-43af-a972-03b0a4d4f598', '1547f656-106d-46bc-ad31-e63c425c93dd', 'esther.beatrix.75', 'esther.beatrix.75', '', '', '', 'Mailin Nagelstudio. Burggasse 2', '', 'lauf ad pegnitz', '91207', 'Germany', true, '2026-01-07T02:20:06.852Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e428af81-3c2f-4d07-8e76-7381378470c7', 'f6755b34-f84a-49b8-ad5a-3be2b0a74877', '91', 'Hornhäuserstr', '', '', '', 'Hornhäuserstr 91', '', 'Oschersleben', '39387', 'Germany', true, '2026-01-07T02:20:06.854Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('389cb366-e600-4ccf-a740-fc1f4677defe', '7cf65762-fced-411a-aeff-83652df0cf94', '3', 'Luisenstraße', '', '', '', 'Luisenstraße 3', '', 'Baden Baden', '76530', 'Germany', true, '2026-01-07T02:20:06.864Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3d26f66a-01a4-48f3-9d10-3decc9270817', '5b5b385d-1f3a-46d8-b090-0c11f6205183', '34', 'Veveří', '', '', '774268696', 'Veveří 34', '', 'Brno', '60200', 'Czech Republic', true, '2026-01-07T02:20:06.874Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f8a100e6-0866-42f7-a2c8-b6e2c67aa5ce', 'f7939c45-c55d-49bc-9b6f-c778687a8f8c', 'Thi', 'Thanh Thuy Phạm', '', '', '', 'Phạm Thi Thanh Thuy; Euro Nails nagel studios ; Rheinstr.7,; 79761 Waldshut-Tiengen ; Baden -Württemberg', '', 'Waldshut-Tiengen', '79761', 'Germany', true, '2026-01-07T02:20:06.894Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f02ab22c-44d6-48ac-a21d-88bc4bfe1753', '06553ce8-266f-4162-8aab-4b1303629b90', 'nguyen', 'Nam', '', '', '017656704291', 'Gernotstr 50', '', 'Nürnberg', '90439', 'Germany', true, '2026-01-07T02:20:06.895Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8359e979-e0bb-41fb-b09f-56ced5f8f8f5', '5f5c3d9a-5b6f-4fd6-9629-859b09dbd3a4', 'Nam', 'Canh Nguyen Thi', '', '', '', 'Eisenbahnstr. 18', '', 'Saarbrücken', '66117', 'Germany', true, '2026-01-07T02:20:06.915Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0e531c07-a536-4d40-a1e5-d3ef9e581bde', '9fbd489f-6fdf-4877-aab9-644edaf9e9b1', 'thi', 'hien nguyen', '', '', '', 'sonnenwall 54', '', 'Duisburg', '47051', 'Germany', true, '2026-01-07T02:20:06.936Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4bb2eca0-1283-4804-aecc-bf3b3145010d', '28ab4cbc-d2fb-44b3-adb4-811545edc5a9', '6', 'Turmstrasse', '', '', '', 'Turmstrasse 6', '', 'Neustadt an der Weinstr', '67433', 'Germany', true, '2026-01-07T02:20:06.942Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a78b0dfb-45fc-41ed-8d9d-d5f2b03b7e6b', 'f12d9fc2-3485-43f9-8576-71ef8e9d3574', 'Vu', 'Hang', '', '', '', 'Im Forum 1', '', 'Hanau', '63450', 'Germany', true, '2026-01-07T02:20:06.955Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('07ecf6fd-a38a-46d8-bfdf-1b8b278afa62', '9b947fb9-fe9a-42c5-bc04-eb18ef8cc409', '1', 'Waldspitzweg', '', '', '', 'Waldspitzweg 1', '', 'Schifferstadt', '67105', 'Germany', true, '2026-01-07T02:20:06.960Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0fa0a75f-3166-4195-82b4-843e5ff47f31', '3fa85dad-7835-49ee-9593-612bd08a64d8', 'thị', 'Cúc Nguyễn', '', '', '', 'Bäcker Straße 5-7', '', 'Minden', '32423', 'Germany', true, '2026-01-07T02:20:06.987Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fb7441bc-bd37-4a5f-a6fd-8be3ea9122f6', '7e5d9000-b576-406b-8091-6b26e27c52e6', 'Hong', 'Quynh Trinh', '', '', '+4915901478999', 'Queen Nails ; Trinh Hong Quynh; Waldstr.2 ; 30629 Hannover; +4915901478999', '', 'Hannover', '30629', 'Germany', true, '2026-01-07T02:20:06.988Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6276677a-f5ce-49a1-98af-fed9302091e6', '5dd36445-ed6f-432c-82a6-de4ac7afc815', 'Nguyen', 'Thanh', '', '', '', 'Beauty Salon im Hochrhein Center 2', '', 'Rheinfelden', '79618', 'Germany', true, '2026-01-07T02:20:06.989Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4f418733-b662-46cd-bf9a-021011c08e8b', '9e20fe81-55d2-4bf3-b60d-6023014a246e', 'Be', 'Tam', '', '', '', 'Treptower Str. 32A', '', 'Demmin', '17109', 'Germany', true, '2026-01-07T02:20:07.006Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9504ab48-8b52-4668-9755-84b0726239a3', '3358a719-42c7-481e-a1a3-fe6061ca537e', '2-6', 'Residenzstr', '', '', '', 'Residenzstr 2-6', '', 'Ansbach', '91522', 'Germany', true, '2026-01-07T02:20:07.079Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5f6cc606-79a4-4949-a488-44950f940273', '39820337-2918-41cf-a6f2-3beed31c7370', 'minhminh.nguyen.5095', 'minhminh.nguyen.5095', '', '', '', 'Nguyen Thi Minh Thao 331', '', 'Rohr bei Hartberg Österreich', '8294', 'Austria', true, '2026-01-07T02:20:07.087Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('850780ab-f14f-49a3-b144-d65786e1e6b3', '03bf50f1-ca17-44c0-bb6e-5799c99bc47c', 'Quang', 'Nghia Nguyen', '', '', '', 'Waller Heerstr. 103', '', 'Bremen', '28219', 'Germany', true, '2026-01-07T02:20:06.568Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('052d7fb8-4cbe-45b8-b137-f2316602d2e3', 'a050dd51-a06a-4164-a936-53882393c0d8', 'Hang', 'Pham Thuy', '', '', '', 'Darwinstraße 22', '', 'Papenburg', '26871', 'Germany', true, '2026-01-07T02:20:06.581Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2abf66b2-4aa8-4f88-9404-ed49fe70d7ed', '148800dc-4969-4b1e-b7a0-6a103cb78051', 'Ha', 'Ly Duong', '', '', '', 'Hörgensweg 5', '', 'Hamburg', '22523', 'Germany', true, '2026-01-07T02:20:06.588Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('833eba24-dd66-4529-86d8-9fc1c7bc645a', 'e117f56f-730a-4829-baff-122987893aa4', 'thị', 'lệ my Nguyễn', '', '', '242246', 'Vaalser Str. 242-246', '', 'Aachen', '52074', 'Germany', true, '2026-01-07T02:20:06.608Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('62532fa4-c68d-4ebd-b7c7-725df2314d3c', '54cba492-0ca3-4fdc-9a1b-7534178dfa30', 'Thi', 'Trang Nguyen', '', '', '3112437', 'Hänselstraße 31', '', 'Berlin Germany', '12437', 'Germany', true, '2026-01-07T02:20:06.610Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b5a34bfd-21f1-484c-a6c7-a3b06bae0f12', 'a3347e27-1c56-460e-973d-0a658e8f62da', 'thanhdiep.phan.16', 'thanhdiep.phan.16', '', '', '', 'Bahnhofstraße 13', '', 'Mainz', '55116', 'Germany', true, '2026-01-07T02:20:06.625Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a031a01b-e45e-4b74-985d-0a74ef52a426', '3a314b53-c875-436e-987f-44aa1486b75a', 'Anh', 'Dung Tran', '', '', '10000', 'Eden 1988', '', 'Salon', '1988', 'Germany', true, '2026-01-07T02:20:06.627Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6033c615-da1f-4b87-a398-87584c9e336e', 'c15d2a72-413d-4574-9b30-525dfebcf31a', 'Anh', 'Dao Tuan', '', '', '', 'Goldbacher str 2', '', 'Aschaffenburg', '63739', 'Germany', true, '2026-01-07T02:20:06.676Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6bebb9e0-5f2b-4db3-9b29-98bee9757966', 'df3a2e47-f4b2-4c53-a144-93233a8e126f', 'hang', 'ho Thi', '', '', '', 'Saarstr 59', '', 'oberhausen', '46045', 'Germany', true, '2026-01-07T02:20:06.681Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f0df9165-2e8f-43d2-b75b-65ef31917872', '3166f4de-b1fa-443b-afdf-b0bd9609f9db', 'Nguyen', 'Thanh', '', '', '', 'Baubergerstrasse 9', '', 'München', '80992', 'Germany', true, '2026-01-07T02:20:06.701Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5b5d202a-f446-42da-bcec-208641938522', 'd6c14438-12c1-4c22-a5d9-661a312957ae', 'Nguyen', 'Ha', '', '', '', 'Ringstraße 7', '', 'Dresden', '01067', 'Germany', true, '2026-01-07T02:20:06.715Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b009232a-065b-4bf8-a461-734117b8eb88', '1560b650-79fd-46c2-8bdf-79be7ba984a0', '.', '17 Wredestr', '', '', '', 'Wredestr . 17', '', 'Ludwigshafen am Rhein', '67059', 'Germany', true, '2026-01-07T02:20:06.732Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6f8fbd85-d760-4f13-948e-f2fc6004c177', 'f3e16237-036f-42df-8e8c-ef447a794f55', 'str.15', '01968 Senftenberg Schmiede', '', '', '1501968', 'Daisy Nail Studio; Schmiede str.15 01968 Senftenberg', '', 'Senftenberg', '01968', 'Germany', true, '2026-01-07T02:20:06.757Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cd4f6f1f-d5d5-4618-80ac-4185e5850a0f', '22ccd794-c400-43c0-882b-815450d84fa2', 'Lam', 'Hai', '', '', '', 'Bergstraße 65', '', 'waldshut', '79761', 'Germany', true, '2026-01-07T02:20:06.762Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9b22bf40-6e25-475e-b845-6d22174762a7', 'f8317dd0-ec61-4a75-90eb-096c3d4015df', 'Cuong', 'Nguyen Duy', '', '', '606888764', 'Masarykova 403/14', '', 'Brno', '60200', 'Czech Republic', true, '2026-01-07T02:20:06.787Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c0fdee6a-db60-4c2c-8053-5c8430b5c2cf', '2ed30e54-1da2-4ea5-b0c6-5458701c55e2', 'Son', 'Ngo Hong', '', '', '', 'Kramgasse 13', '', 'Andernach', '56626', 'Germany', true, '2026-01-07T02:20:06.797Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7c60949d-41ce-4ef7-a73f-b099fcaeb13b', 'f7eddfee-3946-497b-b4fe-917f47cc9cec', 'anduy.khanh.14', 'anduy.khanh.14', '', '', '', 'Bayreuther str 25', '', 'Nürnberg', '90409', 'Germany', true, '2026-01-07T02:20:07.347Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('14d97109-bd13-4f38-b830-c13859faffde', '6c56dba7-5179-41e9-aa7a-f096dd04c6fe', '100010199822375', '100010199822375', '', '', '18205020', 'Anh Tu Nguyen Poshnpolished nagelstudio Furbergstrasse 18-20', '', 'Salzburg', '5020', 'Germany', true, '2026-01-07T02:20:06.816Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('93857e71-5790-4299-9742-23d86b5b0b19', '5b4d6587-041d-4821-ba87-dcaa2b5a1110', 'Thi', 'Oanh Tran', '', '', '', 'Friedrich ebertstr 37A', '', 'Mülheim an der Ruhr', '45468', 'Germany', true, '2026-01-07T02:20:06.833Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5f2f76e0-f607-4d41-955e-e33e76a10b55', '546c200a-ab7b-499c-80e5-59597701bafc', 'Thao', 'Le Thanh', '', '', '', 'Untere Kaplaneistrasse 1', '', 'Meiningen', '98617', 'Germany', true, '2026-01-07T02:20:06.837Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('69a959c8-fe3c-4352-a98f-cad10cdb7a9b', '0f2a99a9-3734-475e-a67f-f13e308a687c', 'Thi', 'Nhu Huong Nguyen', '', '', '', 'Hauptstraße 104', '', 'Wiesloch', '69168', 'Spain', true, '2026-01-07T02:20:06.866Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0cd83cdf-c812-453e-9196-343d2f4a3529', 'a41913a2-65f4-4033-9937-b6c4a956b552', 'Pham', 'Candy', '', '', '606337878', 'Candy Nail 2', '', 'Pelhřimov', '39301', 'Czech Republic', true, '2026-01-07T02:20:06.868Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a0880486-7aee-4474-93aa-b5ea1b0d0d02', '2978075d-6581-4f80-bfe0-1169c1cd92b2', 'văn', 'Tuân Lê', '', '', '776341662', 'Nam TG masaryka 325', '', 'chotebor', '58301', 'Germany', true, '2026-01-07T02:20:06.871Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('41422679-2ea5-454f-b3b1-7e4f7e63e7dc', '517b83d5-8563-4a1e-90f3-62d170bdf35d', '22', 'Ludwigstraße', '', '', '', 'Ludwigstraße 22', '', 'Passau', '94032', 'Germany', true, '2026-01-07T02:20:06.888Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7e1e3ba7-ac4f-4f79-8848-9b226ebfb51a', 'a655767c-d13e-48be-a920-325f9009d880', 'mạnh', 'trung Nguyễn', '', '', '', 'carl schurz str 49', '', 'berrlin', '13597', 'Germany', true, '2026-01-07T02:20:06.890Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b5c4020-235d-4c2d-9d38-44bdbe7ce395', 'd6827f2e-6664-437c-8b86-edb11539a3ce', 'phuong.thaocao.5', 'phuong.thaocao.5', '', '', '774934585', 'Anna nails velká hradební 238/10', '', 'usti nad labem', '40001', 'Czech Republic', true, '2026-01-07T02:20:06.893Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('429d5ac9-986e-4a64-abcc-e72f237d36b1', '52bd8995-4a25-4f43-a642-322443544a33', 'Thalyaho', '1 K.', '', '', '', 'K. Thalyaho 1', '', 'Komárno', '94501', 'Germany', true, '2026-01-07T02:20:06.907Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b15f937-151c-4366-8271-e78939a1b2a2', 'aa6d83d9-e5ea-43fa-92e7-1de6f54c871e', 'Dinh', 'An Hoang', '', '', '775456789', 'Havířská 352/17', '', 'Ústí nad Labem', '40010', 'Czech Republic', true, '2026-01-07T02:20:06.910Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e704e612-8159-4726-9ae6-a4c23ecc3bc5', '9bcc822c-030a-492c-817b-2a8aa37b4773', '84,50935', 'Köln Lindenthalgürtel', '', '', '', 'Lindenthalgürtel 84', '', 'Köln', '50935', 'Germany', true, '2026-01-07T02:20:06.912Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('70c8ca46-3b89-477d-a5d7-3b53038dc22a', 'cb697a76-e07f-471b-a453-90c83bc7a466', 'tai', 'tran Ngoc', '', '', '', 'Ludwigstrasse 9', '', 'Darmstadt', '64283', 'Germany', true, '2026-01-07T02:20:06.929Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8f710ad6-b100-4fb9-bc09-eeced5e327f2', '8b69bea7-93ab-49aa-9d33-79049bed080a', '91', 'Hornhäuserstr', '', '', '', 'Hornhäuserstr 91', '', 'Oschersleben', '39387', 'Germany', true, '2026-01-07T02:20:06.935Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('369b39f1-c12d-4951-8839-4df372e1c0fc', '373965b2-445b-4b9d-a26a-c55362a5dcb2', 'Thanh', 'Hung Ngo', '', '', '', 'Hauptstraße 46', '', 'Lindenburg', '88161', 'Germany', true, '2026-01-07T02:20:06.947Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0cbd36b7-9087-4835-9a95-b6d9de4133a8', '8d95bc7d-1427-4dd2-90d3-8dff097dfbae', 'poschodi', 'pri Dm -1', '', '', '2091701', 'Kollárova 20-91701', '', 'Trnava', '91701', 'Germany', true, '2026-01-07T02:20:06.955Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d3039177-c19e-4261-9dd1-93e8fe23e45f', '08dc278b-56f1-4e2d-a4d4-fffa71364a71', 'Tri', 'Kien Nguyễn', '', '', '', 'Bahnhofstraße 92', '', 'Giessen', '35390', 'Spain', true, '2026-01-07T02:20:06.968Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('40405613-cfae-4c3e-9e52-d7a484ce7f44', '0479206b-c540-4d16-b32e-376e09beb7cd', '46A.', '52477 Alsdorf. Bahnhofstraße', '', '', '', 'Bahnhofstraße 46A', '', 'Alsdorf', '52477', 'Germany', true, '2026-01-07T02:20:06.989Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0604477e-3a67-48d5-9929-c1c46ff0ddf9', 'c666e993-a09b-4df1-a400-c2b4eaba7611', 'huong.nguyen.5099', 'huong.nguyen.5099', '', '', '', 'Schwenninger Straße 40', '', 'Bad Dürrheim', '78073', 'Germany', true, '2026-01-07T02:20:07.007Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3bb8b70f-2eab-48dc-a421-804c4552f83b', 'b38bc899-e96f-4f76-ac91-ee71ac4343d3', 'tran', 'Ngoc', '', '', '+330669004109', 'Ngoc tran; +33 0669004109; 53 avenue jean jaures, Neudorf , 67100 Strasbourg', '', 'Strasbourg', '67100', 'Spain', true, '2026-01-07T02:20:07.009Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('53bd5d10-13dc-4466-8d9b-3c056681945a', 'b5a3162e-c4f9-44b7-89f2-4909e5decd3f', 'Vuong', 'Huong', '', '', '', 'Waldstraße 35', '', 'Karlsruhe', '76133', 'Germany', true, '2026-01-07T02:20:07.030Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b1e505af-4c84-4f2a-9617-c4bccf824e7b', 'f50f0efa-1b52-4327-b02b-143588e6fd42', '2171', 'litvinov 43601 Podkrusnohorska', '', '', '774934749', 'Podkrusnohorska 2171', '', 'litvinov', '2171', 'Germany', true, '2026-01-07T02:20:07.038Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5ddb837c-0eda-4629-a0dd-c58e0cf35034', 'b23a7b68-c539-45a7-b28d-ffeb3e17815a', 'Duc', 'Hoang Nguyen', '', '', '', 'Wilhelm-Leuschner-Str. 28', '', 'Worms', '67547', 'Germany', true, '2026-01-07T02:20:07.041Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a1bcfd77-7e39-410d-be9c-80a5313a8d70', 'edd80a1f-1e6a-4460-88db-fd3f5c7648ee', 'Hai', 'Ninh Tang', '', '', '', 'Im Forum 1', '', 'Hanau', '63450', 'Germany', true, '2026-01-07T02:20:06.684Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0badc3d9-7b29-41e5-bb42-c95378006f73', '6a6cd636-eb25-412f-9d43-c0a5c939ed68', '44001', 'Lounny', '', '', '777867888', 'Usa Nails 1324', '', 'prazska', '1324', 'Germany', true, '2026-01-07T02:20:06.713Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('42934587-e365-4037-b135-7c0864b7b671', '0f855459-6c91-410c-9f55-3e2f70952848', 'huyenemy.nguyen', 'huyenemy.nguyen', '', '', '', 'Tal 37', '', 'München', '80331', 'Spain', true, '2026-01-07T02:20:06.724Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e1eff862-ba63-4d79-950f-6fabfcf8401c', 'f88385f6-6147-4670-99e1-af8c3cf07852', '3', 'Kirchplatz', '', '', '', 'Kirchplatz 3', '', 'Heiligenhaus', '42579', 'Austria', true, '2026-01-07T02:20:06.754Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2eb44616-e094-4de3-bda9-2f1082cc9dd1', '0af863ff-54a5-45c7-b15a-80e389c50f13', 'duy.hunter.1', 'duy.hunter.1', '', '', '', 'Dammstraße 1', '', 'Neumarkt in der Oberpfalz', '92318', 'Germany', true, '2026-01-07T02:20:06.757Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d02cdc2e-006d-4af0-acce-0955a2ed1978', 'a80d25ae-b75d-427e-9808-ccba66f236a8', '93', 'Pichelsdorferstraße', '', '', '', 'Pichelsdorferstraße 93', '', 'Berlin', '13595', 'Spain', true, '2026-01-07T02:20:06.763Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e344836c-7fc2-47fa-885a-8499a46fa876', '0bc3bd92-c61e-46b9-a788-e15d215d9500', 'Thi', 'Giau Vo', '', '', '773519388', 'Školní 408/6', '', 'Teplice', '41501', 'Czech Republic', true, '2026-01-07T02:20:06.777Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('12c8e078-2791-4858-9e71-20e67d49dfdf', 'feb6866b-264a-4dd8-a521-2328c98ba6c7', 'Thi', 'Minh Phuong Nguyen', '', '', '', 'Sankt-Stephan Platz 14', '', 'Konstanz', '78462', 'Austria', true, '2026-01-07T02:20:06.794Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b7130e86-abd1-4e8e-bc3f-05751ff9b7c1', '680173f3-092b-4ac5-893c-0d70b4c55a82', 'Thị', 'Thanh Tâm Nguyễn', '', '', '', 'Friedrich Ebert Platz 3', '', 'hagen', '58095', 'Austria', true, '2026-01-07T02:20:06.803Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e578b24d-e7ba-4036-b2ca-aaf57fc0cda9', '0a053cb0-b52e-4bd8-a8a8-92f3ec3c2e5f', 'thu', 'hoai nguyễn', '', '', '', 'Studio 6t', '', 'Münster Deutschland', '48155', 'Germany', true, '2026-01-07T02:20:07.007Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d4ea8d3a-0405-40e6-ae88-f78ed6501e8a', 'ad12be6f-c7ae-4635-bc0b-f5a1f6ad0065', 'An', 'an Tên.', '', '', '', 'Im  Khauflancenter Südstadtring 90', '', 'Halle', '06128', 'Germany', true, '2026-01-07T02:20:07.020Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2b36af3f-4f64-40b9-8126-28897ef4e923', '6d05ced4-665c-416c-b45f-4cd899a46d8c', 'Panagi', 'Charalampos Tên', '', '', '', 'Get Polished im 1', '', 'Bayreuth', '95444', 'Germany', true, '2026-01-07T02:20:07.028Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a42b9cf1-1962-4418-9584-d3517c60ff26', '2b0ccc2a-621a-47ca-b3ec-ab3598e0bebd', 'quocthang.nguyen.334', 'quocthang.nguyen.334', '', '', '299510', 'Le. Nails Marktpassage Str. des Friedens 2', '', '- Apolda', '99510', 'Germany', true, '2026-01-07T02:20:07.072Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('94aef527-44a9-4c04-848e-efdd073f97db', 'a2f09403-c79b-4597-b69e-4a9cba0bbfb6', 'Damm', '104 Mariendorfer', '', '', '', 'Mariendorfer Damm 104', '', 'berlin', '12109', 'Germany', true, '2026-01-07T02:20:07.099Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('535bac98-8743-4a02-bff0-0fe3cd183480', '6b9e851e-aa04-42ef-9e91-4a27f65ffe0b', 'legendocean2000', 'legendocean2000', '', '', '', 'Lea Nails Hauptstr.110,72525 Muensingen', '', 'Muensingen', '72525', 'Germany', true, '2026-01-07T02:20:07.109Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b4540c4f-6d44-456e-a025-c8bce3c06a3b', '61657e55-942f-45e8-9ecd-d52c02478f21', '23', 'Steingasse', '', '', '', 'Steingasse 23', '', 'Mainz', '55116', 'Germany', true, '2026-01-07T02:20:07.305Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('79ae7295-7496-4403-a0da-8d3a2af2240f', '77782bf6-1faa-42f1-bb7e-ff513d66f999', '9', 'Hoferstraße', '', '', '', 'Hoferstraße 9', '', 'Leipzig', '04317', 'Germany', true, '2026-01-07T02:20:07.315Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d3d1951c-6ef6-4056-88f0-c9e8bd5c5afb', 'b2816130-78f9-4143-bd44-964b7abb7953', 'le', 'quyen Bui', '', '', '', 'Beauty Club Volme Galerie Friedrich Ebert Platz 3', '', 'hagen', '58095', 'Austria', true, '2026-01-07T02:20:07.348Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c5356ea9-e810-4055-9e16-6b7031233bd5', '8f903140-e0ee-433c-ad12-6615532590ed', 'Thị', 'Hien Nguyễn', '', '', '', 'Krefelder Straße 18', '', 'Neuss', '41460', 'Germany', true, '2026-01-07T02:20:07.351Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('29d2237f-4d33-49f9-a6b4-b76efb367b72', '7667161a-365d-4996-8b23-76612475986a', 'tranganh48', 'tranganh48', '', '', '', 'Waldeckerstr 62A', '', 'kassel', '34128', 'Germany', true, '2026-01-07T02:20:07.392Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5786bf36-0421-4441-ac25-f0e02353ae3e', 'e6d1182b-56d7-4257-bea8-039d3dc72c5a', 'Thuy', 'Truc Nguyen', '', '', '', 'Nguyen Thuy Truc; Pirckheimerstr.57A; 90408 Nürnberg; Bayern Deutschland', '', 'Nürnberg', '90408', 'Germany', true, '2026-01-07T02:20:07.397Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7492b05a-048b-41b8-8b6e-6bf9a500acc2', '8cbf8d98-6cde-4c59-b667-8a61044cc810', 'thuy', 'linh Vu', '', '', '776676868', 'Táboritská 117', '', 'Chomutov', '43001', 'Czech Republic', true, '2026-01-07T02:20:07.429Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c1baaa8d-1264-4030-a840-ca9c6f8c8ca4', 'f28f84b8-5cce-4992-a466-f6a28305d66d', 'Langenfeld', '40764', '', '', '', 'Solinger Str. 20', '', 'Langenfeld', '40764', 'Germany', true, '2026-01-07T02:20:07.430Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6084d512-28d3-4cd5-a4f3-42041c0a810b', 'aa2cbad9-8154-4caa-86c9-763a56d7df67', 'lenka.nguyen.1', 'lenka.nguyen.1', '', '', '+420723619999', 'Boženy němcové 1808', '', 'sokolov', '1808', 'Czech Republic', true, '2026-01-07T02:20:07.440Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6fb324b3-f8ed-4609-a293-b86bc4de3d9b', '6323ec5e-2ab5-4fb1-b3f0-3790a4e0a5b3', '774181963', 'Tel', '', '', '774181963', 'Studánecká 438', '', 'vyssi brod', '38273', 'Germany', true, '2026-01-07T02:20:07.458Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('78579db6-afba-4637-9bca-651197da395b', 'b25b0607-96f0-4f48-a755-0ee22ebd8d50', 'Lien', 'Phan', '', '', '', 'Fronecke Straße 11', '', 'Waiblingen', '71332', 'Germany', true, '2026-01-07T02:20:07.460Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('74ea5d13-54a8-41f8-8309-b1170dcb5bd8', 'c818da09-6485-4ce6-8b47-3a69e72242cc', '49.', 'Hauptstraße', '', '', '', 'Hauptstraße 49', '', 'Ehingen', '89584', 'Germany', true, '2026-01-07T02:20:07.478Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('28bd34d2-abce-451a-a5cb-20020d48f042', '6b9c45fc-55e2-416d-8153-f80f24b90739', 'Anh', 'Tran Hoang', '', '', '', 'Pliensaustrasse 41', '', 'Esslingen am Neckar', '73728', 'Spain', true, '2026-01-07T02:20:07.479Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b144367-49d9-4ea7-8bb4-c816778c1c79', 'c21f1019-7ebc-49bd-b527-49f79028e608', 'thi', 'hien ha', '', '', '', 'jana palacha 116/16', '', 'breclav', '69002', 'Germany', true, '2026-01-07T02:20:07.481Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0ccb9c60-a287-49dc-b6f4-0c3eb75fd201', '19245c58-3b9c-4758-a1fa-2743ed56c835', '100006778233873', '100006778233873', '', '', '', 'Wimpernstudio Gabelsbergerstr. 60/80333', '', 'München', '80333', 'Germany', true, '2026-01-07T02:20:07.500Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b1c8acae-ab9f-4619-93bd-863533142da0', 'eb27dd95-d41b-4d87-8281-2ebd491dbf6f', 'cong', 'thanh Dinh', '', '', '777748989', 'Tilleho namesti 792/2', '', 'praha', '15200', 'Czech Republic', true, '2026-01-07T02:20:07.515Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a7ed75c5-e46f-40e1-a01f-06d3c336a162', '164919fc-86e5-4686-9146-be6a4a042e1e', 'Thi', 'Hương Trinh', '', '', '', 'Burgeffstraße 6', '', 'Hochheim', '65239', 'Germany', true, '2026-01-07T02:20:08.238Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9757f632-7a93-4941-9698-da87dcade2e0', '3879bf52-ad20-4111-970b-3eaaebbd73aa', '100011147080196', '100011147080196', '', '', '777834999', 'nh Krajinská 281/44', '', 'Tel', '37001', 'Spain', true, '2026-01-07T02:20:07.518Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8a1e0295-6005-4409-872f-b5842cb909e7', '77e42e92-5dd2-4d39-a91b-272cc4759546', 'Tra', 'Mi Phi', '', '', '13629404', 'nám. T. G. Masaryka 136', '', 'Dolní Bousov', '29404', 'Germany', true, '2026-01-07T02:20:07.526Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a43c755f-671a-4902-97e3-d7f407322e4a', '61729afa-8bd0-4953-b7d5-4de3275686b8', 'Ha', 'Duy Hung', '', '', '+420607943266', 'Potůčky 182', '', 'Potucky', '36235', 'Germany', true, '2026-01-07T02:20:07.552Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('18dda83d-12e6-4ec5-8eac-79dcec28110d', '9bcd52cc-021f-4d35-9c18-16d5c2d0d7b6', 'Hoang', 'Oanh', '', '', '792395007', 'Nuselska 296/3', '', 'Praha', '14000', 'Czech Republic', true, '2026-01-07T02:20:07.635Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1f4f60e1-c809-4d04-9038-bbe3fcd7d401', '72d4378d-3c69-4ff9-9625-a58990573a66', 'NGUYEN', 'Toan', '', '', '', 'Hagenstraße 17', '', 'Varel', '26316', 'Germany', true, '2026-01-07T02:20:07.653Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2839a788-1d41-4896-b671-95622fd0737b', 'f14a3f95-5751-4009-9de6-0ae65630dbf1', 'Tor', 'Straße 18 Untere', '', '', '', 'Untere Tor Straße 18', '', 'Öhringen', '74613', 'Germany', true, '2026-01-07T02:20:07.678Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3e7c96dc-50fb-4694-90a0-8aa945c87dc8', '2a3228d9-7fdb-4679-9fb0-7efaef59d93c', 'david.pham.5817', 'david.pham.5817', '', '', '', 'im Kaufland 6', '', 'Mülheim an der Ruhr', '45475', 'Germany', true, '2026-01-07T02:20:07.683Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('60467ba3-3d2a-43a5-aa71-57fee4d9f91d', '98397420-88bb-4c72-a539-70008c37fae6', 'thi', 'anh dao Ngo', '', '', '', 'Dillsteiner straße 30-32', '', 'Pforzheim', '75173', 'Germany', true, '2026-01-07T02:20:07.047Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1c8ee25a-7059-4ba7-8f44-a8ca5d342613', '9abf7287-ae02-4323-8afd-67c8c3273dab', '23,', '28195 Bremen Hutfilterstraße', '', '', '', 'Hutfilterstraße 23', '', 'Bremen', '28195', 'Germany', true, '2026-01-07T02:20:07.048Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c5632c36-a059-4195-b304-f7b31d2806ca', 'b1904056-9908-4ff7-b23a-efae68d7bde1', 'Lan', 'Anh Tran Thi', '', '', '', 'Friedrichstraße 262', '', 'Velbert', '42551', 'Germany', true, '2026-01-07T02:20:07.049Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2074735e-9975-416a-a275-bcd5f2ed7a61', '0e395cb0-1d8f-4a9c-89c8-b5678a273ce5', 'Thanh', 'Tam Nguyen', '', '', '', 'Adlerstr 4', '', 'Bad Soden am Taunus', '65812', 'Germany', true, '2026-01-07T02:20:07.058Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('055fac7b-8df4-4007-be5d-0405c4c1d516', '2fd7d253-d4fa-4a10-9c7e-d827a9024748', 'Minh', 'Hien Vuong Dang', '', '', '', 'Bahnhofstraße 24', '', 'Mühlheim am Main', '63165', 'Germany', true, '2026-01-07T02:20:07.067Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1daebe17-6055-4cb7-bcae-b63d3499ac74', 'dbad5a3e-950e-4575-af36-a7b10e3afb44', 'Tuan', 'Anh Tran', '', '', '2771034', 'Wolfgang Brumme Allee 27', '', '- Böblingen', '71034', 'Germany', true, '2026-01-07T02:20:07.068Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('99615b0f-de5e-4fc9-aef9-659c27309cf8', '93f007d4-d00a-4cc8-8563-c825da6d0666', 'Van', 'Vu Cam', '', '', '', 'Bahnhofstr. 13a', '', 'Herne', '44623', 'Germany', true, '2026-01-07T02:20:07.077Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ee586856-085c-4f6e-9239-ec2dfb0330d8', '6317a15d-5ac0-42f3-8d8e-8934ca49a4a4', 'Thanh', 'Vu Hoai', '', '', '', 'Königsplatz 38', '', 'Kassel', '34117', 'Austria', true, '2026-01-07T02:20:07.093Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('453e90d0-4743-420d-9f70-1decb7cb2fc0', '4135afab-bdc0-4058-b3b4-b9334c253952', '3', 'Hauptstr', '', '', '', 'Hauptstr 3', '', 'Walldorf', '69190', 'Germany', true, '2026-01-07T02:20:07.113Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('43db4830-0f07-464f-b188-351407791397', '269fab20-59ed-4663-9ed2-7ec5e9e3ea19', 'Thao', 'Nguyen Mai', '', '', '', 'Krämerstr. 21', '', 'Hanau', '63450', 'Germany', true, '2026-01-07T02:20:07.116Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5fc8550d-f76e-44c4-a16f-8a5f226d949c', 'fe393483-4dce-4697-a92c-a4879ed57399', 'Thi', 'Hien Bui', '', '', '', 'Limbecker platz 1a', '', 'essen', '45127', 'Austria', true, '2026-01-07T02:20:07.123Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bdd93217-98d2-4974-8111-3bad774466ac', '37d720d7-5616-436a-b38f-c1da53207cd4', 'Thao', 'Nguyen Thu', '', '', '017621819052', 'Berliner Promenade 19', '', 'Saarbrücken', '66111', 'Germany', true, '2026-01-07T02:20:07.142Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ac640ccc-1589-414e-92a7-951649c64144', '63c11668-25e6-43ee-b374-9738dd4ca0c3', 'Van', 'Loi Le', '', '', '', 'Baslerstr 4a', '', 'Lörrach', '79540', 'Germany', true, '2026-01-07T02:20:07.164Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eba3e2ce-a094-46c8-ae86-41a3c64265c2', '14ba2495-3288-4278-afda-110001452fc7', '100016328476112', '100016328476112', '', '', '566606', '.OG Am Wirthembösch 5', '', 'St', '66606', 'Germany', true, '2026-01-07T02:20:07.186Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('af6e482a-4a29-47c5-a80e-a28ec11c20aa', '0317ce19-f7e4-4319-a82d-55a948f3abf8', 'phucanh.dang.39', 'phucanh.dang.39', '', '', '', 'Präsidentenstraße 59', '', 'bergkamen', '59192', 'Germany', true, '2026-01-07T02:20:07.191Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('af4f890c-fdab-4410-94d7-d5a7f5e3f0ef', '3fbe3177-b201-413a-9b99-c1a82c4bcac7', '9', 'Hofkamp', '', '', '01783780495', 'Hofkamp 9', '', 'wuppertal', '42103', 'Germany', true, '2026-01-07T02:20:07.196Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('60da57d6-a1f4-4315-83dc-e8c99b3a9409', '680f32f0-d6b4-4b7b-bf32-b1e09d2ec0c2', '52', '55116 Mainz Augustinerstraße', '', '', '5255116', 'Augustinerstraße 52', '', 'Mainz', '55116', 'Germany', true, '2026-01-07T02:20:07.216Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('305cae5f-0b4e-4973-a6ca-0e2604503ce5', '75aeaf84-7f34-4d76-aba1-2195fc550738', '85a', 'Bahnhofstraße', '', '', '', 'Bahnhofstraße 85a', '', 'Gelsenkirchen', '45879', 'Germany', true, '2026-01-07T02:20:07.221Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d0dc9561-6b0e-4880-b40c-4cc1c2ca9fa7', '3a4eb24a-11e8-4049-9db4-23b08cfd6413', '8', '04420 Markranstädt Markt', '', '', '804420', 'Markt 8', '', 'Markranstädt', '04420', 'Germany', true, '2026-01-07T02:20:07.236Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b2bc0206-1e70-422a-8650-5d4acd9db609', 'ce05bace-88ff-468f-9e57-2ef441a1a4e6', 'Ha', 'Nguyễn Thu', '', '', '', 'Kronenstr 18', '', 'Ettlingen', '76275', 'Germany', true, '2026-01-07T02:20:07.243Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3cb242a7-317c-4efd-96f3-6019c238bebc', 'd6efd922-d5ea-4f78-bdf5-ad769f66ad44', 'gửi', 'về B', '', '', '', 'Töngesgasse 34-36', '', 'Frankfurt', '60311', 'Spain', true, '2026-01-07T02:20:07.251Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('457f34ec-119f-45fe-8c45-bc10c28bb5fd', '9dd7ab9c-5029-4d0e-98f3-b1b3e5626b6f', 'Bich', 'Phuong Tran', '', '', '775668888', 'Husovo náměstí 36', '', 'Lomnice nad Popelkou', '51251', 'Germany', true, '2026-01-07T02:20:07.256Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e0ade425-b395-4494-9f56-850b904bcdca', 'a3ee0be4-20f0-4f77-baba-a06ad3d186c7', '100092291526153', '100092291526153', '', '', '512466', 'Duong Duy Dinh Axbergsgränd 5', '', 'Bandhagen Lgh', '12466', 'Germany', true, '2026-01-07T02:20:07.270Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e5da2538-4c08-4817-a23a-70fc3a5f8505', 'd86c81e5-cbdc-4839-bd64-17c41b8d9cd5', 'Tri', 'Lam Nguyen', '', '', '', 'Alter Basler Str . 15', '', 'Bad Säckingen', '79713', 'Germany', true, '2026-01-07T02:20:07.273Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7161b0b1-1e10-42bf-9803-67a0835754c4', 'b5f92d1f-194a-451a-bbad-eb7044650aef', 'thi', 'thu ha Phan', '', '', '279576', 'Bühlstraße 2', '', 'Weil am Rhein', '79576', 'Germany', true, '2026-01-07T02:20:07.275Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('aeda21e8-1462-4272-888f-c3424e6d9913', '11fc66d9-df54-42ec-b656-c1a5ee374de7', 'Yen', 'Nguyen Thi', '', '', '', 'Grosser Sand 60', '', 'Uetersen', '25436', 'Germany', true, '2026-01-07T02:20:07.276Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d4defad7-8ac6-47fe-b3e1-181fc87f0613', '835230d0-5a7e-4001-8b4d-09e4b5afd1ad', 'Thuy', 'Vien Dang', '', '', '', 'Dang Thuy Vien; Nailliebe ; Godekinstr.140; 44265 Dortmund', '', 'Dortmund', '44265', 'Germany', true, '2026-01-07T02:20:07.280Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f002ef3b-4a2f-4159-8f63-472aaaf3d455', '248c93bb-893d-4790-bee2-f79d16af3f16', 'THI', 'VU NGUYEN', '', '', '', 'Lê nails Nagel Studio Ekkehardstr. 5', '', 'Singen', '78224', 'Germany', true, '2026-01-07T02:20:07.288Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a6b2dfd5-1a9f-4159-bf97-1ca7b192c43e', 'af11cb1f-bad4-4a09-a5ec-3c3d9df2fd26', '100009987768939', '100009987768939', '', '', '', 'Statdplatz 15', '', 'Aichach', '86551', 'Austria', true, '2026-01-07T02:20:07.314Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e203e254-3a73-471b-9f9e-6cc44effcb69', '2136fe49-8982-4e36-b72a-a6cdeb6df876', '984/21', 'Štefánikova', '', '', '776298626', 'Štefánikova 984/21', '', 'Kopřivnice', '74221', 'Germany', true, '2026-01-07T02:20:07.564Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f69079db-bb48-48df-8a99-b586abee1716', 'a24aee22-cd8f-498e-8bb9-a3501ce31d58', 'tam.trinh.904108', 'tam.trinh.904108', '', '', '73961770779199', 'Lidická 1269', '', 'Třinec - Terasa', '1269', 'Czech Republic', true, '2026-01-07T02:20:07.583Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9b09afa6-e59c-494c-affd-1d8969346112', '6a6d56c8-063f-41c4-9ecf-097f64a7b341', 'Nguyen', 'Tuyen', '', '', '', 'Cindy Nails Design ; Tuyen Nguyen; Am kauf Park.4; 37079 Göttingen', '', 'Göttingen', '37079', 'Germany', true, '2026-01-07T02:20:07.745Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1a865369-5a5f-4668-a8ee-930848674760', 'f4499942-e1fd-4ac2-af26-038f35a37eb0', 'chỉ', 'chỗ mình Địa', '', '', '', 'Friedrich-Ebert-Straße 56', '', 'Bremerhaven', '27570', 'Germany', true, '2026-01-07T02:20:07.749Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e522152b-5cc8-4be5-89a3-676eb2cfd59e', '5ce7b08d-6633-42b2-b0a3-a5691b93aebb', 'Sang', 'Tran Quoc', '', '', '', 'Eduard-Kuhlo-Weg 4', '', 'Löhne', '32584', 'Germany', true, '2026-01-07T02:20:07.941Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('10345740-b541-4f03-99ff-7acbc547af09', '88a9d548-9b72-4aba-a192-cd86b495b5a2', 'là', 'Đ:c', '', '', '+491725923805', 'Hauptstraße 82', '', 'Maxdorf', '67133', 'Germany', true, '2026-01-07T02:20:08.239Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ed3f106c-801a-4a77-a4fb-269e7aaefeb6', '31279f1e-1f83-41ef-9666-1f4bb1cb5838', 'Anh', 'Tuyet Nguyen Thi', '', '', '', 'Gabelsbergerstraße 1', '', 'Fürth', '90762', 'Germany', true, '2026-01-07T02:20:08.248Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b0e1b4ae-b711-4578-b625-dde32029573a', '9d3fcdd2-f389-472c-96ad-6ef6e3d29391', '36', '(Talpassage) Talstr.', '', '', '', 'Talstr. 36', '', 'Homburg', '66424', 'Germany', true, '2026-01-07T02:20:08.255Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('26a77ab1-6e81-4c93-aab9-a5d615a1ba05', '1621d01a-dc9f-4072-a2dd-90975ded7ac4', 'văn', 'Phú Nguyễn', '', '', '', 'Im Ort 11', '', 'Castrop-Rauxel', '44575', 'Germany', true, '2026-01-07T02:20:08.259Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0d086b90-1807-4664-89ee-e931b00d772a', '8975728c-9c27-4320-8af5-cd80b7086ff8', 'Thi', 'Ngoc Nga Phung', '', '', '', 'Delitzscher Straße 66', '', 'Leipzig', '04129', 'Germany', true, '2026-01-07T02:20:08.263Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('05dcebb3-8c99-4f72-8305-95673db608d8', '7d0db7fb-8eec-4e32-aeda-c1606cca8bc9', 'Greifengasse', '2 Große', '', '', '', 'Große Greifengasse 2', '', 'Speyer', '67346', 'Germany', true, '2026-01-07T02:20:07.110Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('429c73c0-08ab-45d2-b2e0-e77dcb78a90c', '11b67319-57b4-4ae4-bfc8-ba84287be37e', 'Trần', 'Hue', '', '', '', 'Oberstraße 19', '', 'Ratingen', '40878', 'Austria', true, '2026-01-07T02:20:07.141Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9c9e24e9-24d2-455d-adb2-ac6f4b76ea55', 'dbb5faa7-42dc-4ddb-b513-a61e558fa794', 'Le', 'Quyen Nguyen', '', '', '', 'Filderbahnstr. 1', '', 'Stuttgart-Möhringen', '70567', 'Germany', true, '2026-01-07T02:20:07.144Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9a963341-abc9-4538-a003-1c585d5f77fa', 'b268d575-7442-425a-845f-8bbd0a6bbb80', 'Tuấn', 'Hùng Lê', '', '', '', 'Flach-Fengler-Straße 48-54', '', 'Wesseling', '50389', 'Spain', true, '2026-01-07T02:20:07.146Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7dcde58d-ea12-45b0-b3ab-1d7a746d8161', '98fb24e8-b9fc-4143-9e47-ec0875473c5f', '18', 'GRABENSTRASSE', '', '', '', 'GRABENSTRASSE 18', '', 'RÜDESHEIM AM RHEIN', '65385', 'Germany', true, '2026-01-07T02:20:07.166Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dd49e679-694d-4365-a183-5a2749458894', 'cf32f032-df45-4bfb-aadb-29b74a78e1d7', 'tam', 'C', '', '', '+0032488670366', 'Chaussee de warve 1050', '', 'ixelles - Belgium', '1050', 'Germany', true, '2026-01-07T02:20:07.171Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8e22f696-b726-4d12-9dcd-1f833859f833', '32cbee4a-8174-4a21-a3bc-da4dcac0d467', 'tuan', 'anh Nguyen', '', '', '01745759725', 'Wilmersdorfer Str. 76', '', 'Be', '10629', 'Germany', true, '2026-01-07T02:20:07.175Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ae26ccec-d7a8-4519-a04f-cb3b14deaa5d', 'c5a1df34-c145-4b84-b9fa-1349f7be7381', 'thienha.hlp', 'thienha.hlp', '', '', '', 'Kölner str 36a', '', 'Troisdorf', '53840', 'Germany', true, '2026-01-07T02:20:07.182Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('57845e5a-1373-4034-a52b-40a914258b73', 'debb516b-060c-470a-a65c-fcc7c3e745b0', 'Ha', 'Ly Duong', '', '', '', 'Hörgensweg 5', '', 'Hamburg', '22523', 'Germany', true, '2026-01-07T02:20:07.184Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fd52c355-982f-4bac-89a0-07c1b1476190', 'c4facd98-f0f2-43ba-a98e-39ad6cb8e177', 'chỉ', 'của chi Địa', '', '', '', 'Schloßstr 5', '', 'Simmern', '55469', 'Germany', true, '2026-01-07T02:20:07.202Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ccce1957-1b04-462a-b830-65866fa9a304', 'f17e2ed9-16bb-4d69-92f8-85d624ad5e7a', 'Pošty', '402/14 U', '', '', '776266189', 'U Pošty 402/14', '', 'Brno-Star', '62500', 'Czech Republic', true, '2026-01-07T02:20:07.204Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5bc26f74-3059-440b-b0a1-613932d1f77f', 'c169c5c9-79b4-4ba8-a67b-3e5e79bc3aaa', 'quốc', 'lịch Trần', '', '', '21579539', 'Tumringerstr 215-79539', '', 'Lörrach', '79539', 'Germany', true, '2026-01-07T02:20:07.216Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c06f05d7-4661-4e63-b6f8-a1f7cefa1598', '57badede-e4e4-40a5-a30d-c4c78af345be', '100062629156479', '100062629156479', '', '', '', 'Lovely Beauty Nails Neustr. 31A', '', 'Moers', '47441', 'Germany', true, '2026-01-07T02:20:07.224Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('91755637-69dd-4635-887d-17827c15c13b', 'b55b3baf-c4be-48f5-b130-c8dbc121f90c', 'nguyenthao.nguyen.94849', 'nguyenthao.nguyen.94849', '', '', '5141061', 'Dia CHI Bismarck Str 51', '', 'Mönchengladbach', '41061', 'Germany', true, '2026-01-07T02:20:07.237Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('77f2d60c-05e4-49df-aedc-bb9ab23f98ea', '1597085f-c0f0-475b-bcd7-a14c304785ad', 'claudiaphuongg', 'claudiaphuongg', '', '', '773031306', 'Vodnická 399/57', '', 'Praha - Ujedz', '14900', 'Czech Republic', true, '2026-01-07T02:20:07.250Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d8e99bab-de07-45e6-b126-1fcac4b122a3', 'fc01c3b6-fb98-456c-b00d-d1778164a947', 'Thi', 'Oanh Phan', '', '', '', 'Auf dem Sändchen 4', '', 'Langenfeld', '40764', 'Germany', true, '2026-01-07T02:20:07.256Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('08acc3d5-73eb-4bb2-8317-2b706244624f', 'c4fd57c6-3ccb-448b-a20c-e725ccceebaf', '24', 'Vorstadtstraße', '', '', '', 'Vorstadtstraße 24', '', 'Schorndorf', '73614', 'Germany', true, '2026-01-07T02:20:07.296Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('90c70060-0a90-400a-8bf8-ae72431d43ab', 'f10fb0c1-1123-4d52-8b3f-5d3e582d0a9a', 'Van', 'Phong Duong', '', '', '776388650', 'ulice Berkova 98/1', '', 'Ceska lipa', '47001', 'Czech Republic', true, '2026-01-07T02:20:07.378Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2bb8dff8-41e3-45cc-bf4d-71b547658013', 'c8bf371e-c610-425f-9b68-0a21ba2a8d8d', 'Nguyễn', 'Phương', '', '', '728547472', 'Smila osovského 38/14', '', 'Třebíč', '67401', 'Czech Republic', true, '2026-01-07T02:20:07.381Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('16a3cf29-a219-40b2-b19f-8128f1437d45', '5a073688-53eb-451d-9825-159172cb420f', 'Nguyen', 'Phuong', '', '', '+491639421791', 'Alte Bahnhofstr 22', '', 'Bonn', '53173', 'Germany', true, '2026-01-07T02:20:07.408Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c746df49-ddcc-4c11-8823-c23266050bff', '93a2acf0-7414-4e0a-afa4-ee00ca7dae5e', 'nail.mimi.94', 'nail.mimi.94', '', '', '773456749', 'Huong Nguyen . Slovanska 26/32600', '', 'plzen', '32600', 'Czech Republic', true, '2026-01-07T02:20:07.413Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('609e9d44-1ab1-4dd2-9a87-48c0e962e285', '5cd2d136-1abd-4ef0-96c1-509a0b45ed2d', '171', 'Hauptstraße', '', '', '', 'Hauptstraße 171', '', 'weil am Rhein', '79576', 'Germany', true, '2026-01-07T02:20:07.432Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('28984dba-ae8c-42e0-8a6e-a5c342089ca7', '7a1136dc-94a9-4008-9b06-4beb32b11cbc', 'Phuc', 'Thi', '', '', '015257320553', 'Im Forum 1', '', 'Hanau', '63450', 'Germany', true, '2026-01-07T02:20:07.443Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fb89abb4-b869-4795-a5ec-fe5c9d820780', 'f372a4d7-82e8-4480-912c-db0254a93ca7', 'Pham', 'Thang', '', '', '792390422', 'Potůčky 362/11', '', 'Potůčky', '36238', 'Germany', true, '2026-01-07T02:20:07.452Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2e911cc0-bf61-4f42-a702-7e0c54076c88', '43de552d-e422-4621-acd2-8f97bd3bff95', 'chỉ', 'Địa', '', '', '', 'Hugo Weiß Str 6', '', 'München', '81827', 'Germany', true, '2026-01-07T02:20:07.463Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('32107ce1-e1bc-4f7d-8d54-1ee7b6ded672', '9ed8b59d-c9a5-47f1-94d2-c61bbd5535a7', '20', 'Hegaustr', '', '', '', 'Hegaustr 20', '', 'Singen', '78224', 'Germany', true, '2026-01-07T02:20:07.471Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dbe1eda7-be25-492f-ae90-c6ad93f93f26', '5dcb1d7c-347f-4034-91d8-e0d0e5d8d532', 'Thi', 'Nhi Le', '', '', '773555128', 'Havlíčkova 134', '', 'Česk', '28201', 'Spain', true, '2026-01-07T02:20:07.540Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f78401a3-15f8-4bd3-ab91-eb4152ee7493', '1461ac11-e473-4b7f-a471-dd9bcebf2175', '21', 'Haedenkampstr.', '', '', '', 'Haedenkampstr. 21', '', 'Essen', '45143', 'Germany', true, '2026-01-07T02:20:07.940Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('74767523-2cba-4fe4-aefa-1955c8caa97c', '19c573c2-a2ff-4704-87a4-834bef6d4bc3', 'Thi', 'Dinh Nguyen', '', '', '', 'Ravensburger straße 13', '', 'Bad Waldsee', '88339', 'Germany', true, '2026-01-07T02:20:07.962Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fd15f47d-e6e1-4eb6-b611-02cbbed96740', 'f0f590ae-82ea-413e-98bc-0a34e7be32a4', 'hannycz', 'hannycz', '', 'hana.le911@gmail.com', '+41787309223', 'Holzmattenweg 2/1', '', 'Weil am Rhein', '79576', 'Germany', true, '2026-01-07T02:20:07.974Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a35aab20-d183-4d19-be3e-0794c7e464b3', '92f029ed-56d3-4463-88d3-58b82aeef769', 'thuhien.nguyen.737', 'thuhien.nguyen.737', '', '', '13040337', 'Dc nguyen thi hien Petrovice 130', '', 'usti nad labem', '40337', 'Czech Republic', true, '2026-01-07T02:20:07.982Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('91832139-d583-4b32-b97c-5a05f0393d61', '2ae5df68-ba5c-4e9b-8848-2dbeda350ca7', '6', 'Ollenhauerstr.', '', '', '', 'Ollenhauerstr. 6', '', 'München', '81737', 'Germany', true, '2026-01-07T02:20:07.986Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c45608d3-a4c3-4c0b-b467-4516c002800e', '20808b3e-be13-4045-9a44-97302c8d54ac', 'Yen', 'Hoang', '', '', '775509578', 'Sokolovská 299/42', '', 'karlovy vary', '36005', 'Czech Republic', true, '2026-01-07T02:20:08.004Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('edd6e51f-710e-426f-b232-39d101d2f461', '311f61aa-d30c-4a71-b366-2a2685164205', 'Nguyen', 'TN', '', '', '231442', 'Sportlaan 23', '', 'EA Purmerend Nederland', '1442', 'Germany', true, '2026-01-07T02:20:08.006Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('935de6dc-0d93-4a8b-a88e-c160a77fd944', 'fba7bf17-a855-4f77-b2c7-51063d4aab6c', '9', 'Thomasstraße', '', '', '', 'Thomasstraße 9', '', 'Bad Homburg', '61348', 'Germany', true, '2026-01-07T02:20:08.012Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0960c5dc-7189-41d2-abd6-fcbf77b60752', 'd03353cd-92ca-4973-b172-d59fc4c6fa81', '10', 'Karlsberg', '', '', '', 'Karlsberg 10', '', 'Weinheim', '69469', 'Spain', true, '2026-01-07T02:20:08.025Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cc16b81c-efd6-4738-82b0-8f15f4588fac', '4cf694ea-6631-4ab5-b43f-adfc44427a38', 'THI', 'NHUNG DUONG', '', '', '015560079420', 't . 015560079420', '', 'Salzkotten', '33154', 'Germany', true, '2026-01-07T02:20:08.026Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f89738af-fba1-4fac-ba9a-fbb642120ce2', '71ce93df-b5e0-4236-9f6a-649487d7a4f6', 'Hieu', 'Do Thi', '', '', '', 'Max-Josefs-Platz 20', '', 'Rosenheim', '83022', 'Austria', true, '2026-01-07T02:20:08.032Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b61ae8a0-a66b-4f41-8cf7-9325ec24c123', '2e1b5135-a860-4be4-ad99-a48770db840a', 'nguyên', 'nha Tam', '', '', '776498888', 'Petrovice 578', '', 'sdt', '40337', 'Germany', true, '2026-01-07T02:20:08.052Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dfe73392-1d9f-463c-a1f6-33af2fc4a58d', 'f35559cc-458a-4466-a37f-1831cf791465', 'thang.czTommy', 'thang.czTommy', '', '', '', 'TOMMY NAILS KESSLERGASSE 7', '', 'Mosbach nhé', '74821', 'Spain', true, '2026-01-07T02:20:07.618Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8ae346f5-20ee-4feb-92e8-849def8c9e15', '2d5903e4-c803-4336-90b8-fe98fe5f8ec1', 'Galerie', 'Essen Rathaus', '', '', '', 'Porscheplatz 2', '', 'Essen', '45127', 'Austria', true, '2026-01-07T02:20:07.623Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a68a1010-4475-47c4-befc-80bc5ac81e06', 'e6c67cc3-bc7b-464b-963b-d84164f5a3f0', '104', 'Kaiserstraße', '', '', '', 'Kaiserstraße 104', '', 'St', '66386', 'Germany', true, '2026-01-07T02:20:07.624Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bf6978d9-1a9d-406c-88dc-c611571adc41', '41e9847a-a1af-4d1d-8e55-3978d5e0a766', 'tony.nguyen.5095', 'tony.nguyen.5095', '', '', '4572108', 'König Straße 45-72108', '', 'Rottenburg am Neckar', '72108', 'Germany', true, '2026-01-07T02:20:07.631Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('188198e9-55fd-44ce-98e7-6533973b7f33', '4329b9db-d8d5-4b7e-b417-8ef47618f527', 'Lien', 'Le Thuy', '', '', '', 'Planetenring 25-27', '', 'Garbsen', '30823', 'Germany', true, '2026-01-07T02:20:07.644Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d8ddcb07-1ba3-49d1-8891-1013f992ad0b', '4e3e0cf9-1ba8-4b3d-84ea-da0d34c69007', 'huy', 'nguyen Kim', '', '', '', 'Hauptstr 116', '', 'Sundern', '59846', 'Germany', true, '2026-01-07T02:20:07.648Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d16b201c-741e-4757-87ca-2f9350b07f82', '45a16a87-c7ba-4a29-b509-ecbd302bec59', 'Decathlon-Kaufland', 'Einkaufszentrum', '', '', '', 'Karlsruher Str. 8', '', 'Laatzen', '30880', 'Germany', true, '2026-01-07T02:20:07.652Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('24b89484-bada-48cd-bef1-546ff4f25756', '1de28da4-45ee-436c-9d90-8c8b09da9720', 'Thị', 'Phương Mai Nguyễn', '', '', '', 'Am Römischen Kaiser 10', '', 'Worms', '67547', 'Germany', true, '2026-01-07T02:20:07.655Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('16f096d5-2090-473b-a285-e0a6fb2ac1cf', 'bfba8d98-5a37-458a-adf8-57573c34633d', '31a,', '47441 Moers Neustraße', '', '', '', 'Neustraße 31a', '', 'Moers', '47441', 'Germany', true, '2026-01-07T02:20:07.664Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('98182f52-ad42-49fc-a119-740fee54bb1e', 'a8ac90ac-bc84-4489-aa87-e13c0ae87355', '266', 'Legii', '', '', '773876868', 'Legii 266', '', 'ceske velenice', '37810', 'Spain', true, '2026-01-07T02:20:07.673Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d5e58063-0d55-4084-b25b-4b9dfb043423', 'f8ea4e9b-b18c-43d7-b701-7994c08a0572', 'Schönheit', 'ApS Brunke', '', '', '43146351', 'Strandlyst Alle 35', '', 'Greve', '2670', 'Germany', true, '2026-01-07T02:20:07.696Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('29253c02-3c47-44f9-9465-91ac101b4200', 'da6a96cd-d466-4fff-b42c-06ef23dbcd42', 'giacmobuon.btboy', 'giacmobuon.btboy', '', '', '237603', 'markt 2', '', 'holzminden', '37603', 'Germany', true, '2026-01-07T02:20:07.703Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b07e1215-bb45-4d4c-9a1d-102480bea1c0', '58a82c2e-7ee6-422b-b5a8-c458bc7c031f', 'Stern', '11E Marler', '', '', '', 'Marler Stern 11E', '', 'Marl', '45768', 'Spain', true, '2026-01-07T02:20:07.705Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4dfbca4f-3a5a-4f5c-84f0-5177db136b20', 'd6bb492d-c9e5-47dd-a95d-b19fa99d8a66', 'thi', 'Khuyen Nguyen', '', '', '', 'Weststraße 19', '', 'Herzogenrath', '52134', 'Austria', true, '2026-01-07T02:20:07.717Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b60503fb-5dd0-4f19-87c7-d3a688ffa343', '8b6190ac-7b78-4730-abc8-87c322d305a1', '100094959488836', '100094959488836', '', '', '', 'm e Hauptstraße 69', '', 'Wiesloch nhe', '69168', 'Spain', true, '2026-01-07T02:20:07.725Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('acd93748-69c4-489b-a53c-66f4c8363d31', 'a6d55c7b-4954-4c5d-968e-ec16250546fe', 'oanh.to.75685', 'oanh.to.75685', '', '', '', 'Pfarrstraße 8', '', 'Göppingen', '73033', 'Germany', true, '2026-01-07T02:20:07.749Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('de9eccc6-7e0a-4526-a649-2251181dfd72', 'cb1d7ab0-e383-4741-918a-986fa670477d', 'PAUL', 'NGUYEN', '', '', '0626845845', 'avenue de paris 94800', '', 'Villejuif', '94800', 'Germany', true, '2026-01-07T02:20:07.756Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d202af51-38c7-4bba-9d66-945d290d6552', '57dafb0e-6f4c-45d1-b2e3-d19b6bf8bc81', 'quang', 'duong Nguyen', '', '', '', 'Altstadt 70', '', 'landshut', '84028', 'Germany', true, '2026-01-07T02:20:07.769Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6332d298-cab4-4cde-aa47-50d5e5b37296', '20ba5f98-e387-47fd-817e-ec2de9d8ae2f', 'Anh', 'Bui Tue', '', '', '', 'Am Sandbach 30', '', 'Ratingen', '40880', 'Austria', true, '2026-01-07T02:20:07.776Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a3a9d69f-26c3-41a1-8dca-37ee94ed6494', '50525997-9fa6-4183-9d34-94faa22bd32f', 'Trang', 'Pham Ha', '', '', '', 'Kurfürsten-Anlage 62', '', 'Heidelberg', '69115', 'Germany', true, '2026-01-07T02:20:07.781Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1f2eef35-c27f-42bc-97b1-85c4406e7c28', '501804e1-91d2-43b4-b678-f77e94d5df7e', 'chỉ', 'Địa', '', '', '', 'Stefanikova 320/42', '', 'praha', '15000', 'Czech Republic', true, '2026-01-07T02:20:07.791Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7d786105-6642-4de7-a5d7-5d1d7962d183', 'e473a45b-dca9-49be-b281-272508d33342', 'CuongNguyen123344', 'CuongNguyen123344', '', '', '', 'Steinwendener Str. 1', '', 'Ramstein-Miesenbach', '66877', 'Germany', true, '2026-01-07T02:20:07.797Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4fee865b-d904-4ab7-a6c6-0ee5634f03aa', 'ce867049-6526-4024-abb4-f4af77785f60', 'THU', 'HANG NGUYEN', '', '', '51601', 'NGUYEN THU HANG; SH - FASHION ; Patro.1; Obchod Kněžna ; 1361 Havlíčkova ; 516 01 Rychnov nad Kněžnou; +420 792 541 674', '', 'Havlíčkova', '1361', 'Austria', true, '2026-01-07T02:20:07.822Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3fa38762-05a1-42a9-b78a-700c5e1b5e9d', 'c3e3752b-389e-4176-9556-fcdb05364fd9', 'Bui', 'Anh', '', '', '', 'Anh Bui; Götzenturmstr.37, 74072 Heilbronn, Deutschland', '', 'Heilbronn', '74072', 'Germany', true, '2026-01-07T02:20:07.839Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('578a17b3-c9eb-44da-85a0-d652ee58f069', 'd36a7716-85a2-41a5-a7be-38a370243dac', 'Phan', 'Yen', '', '', '792527485', 'studánky 38273', '', 'vyšší Brod', '38273', 'Germany', true, '2026-01-07T02:20:07.859Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8c161b0d-29d9-43d0-bf1f-111a5c76abac', '79f7d4b0-0b27-4be1-abe2-3f0bd2672b24', 'dung', 'Nguyễn Việt', '', '', '', 'Sandgasse 1', '', 'Frankfurt am Main', '60311', 'Germany', true, '2026-01-07T02:20:07.861Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('609e879e-e558-40e1-b31b-9d7b6da3697e', 'aa19d475-da52-4a4a-903b-de375988b727', 'Linh', 'Cong Tu Nguyen', '', '', '', 'Breite Str. 11a', '', 'Buchholz', '21244', 'Germany', true, '2026-01-07T02:20:07.879Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d4abe2aa-fa95-4184-9f95-74e574eadb82', 'e28746fc-aea4-4286-b253-aa4f8e0f350e', 'corporation', 'NJ', '', '', '0627801915', 'avenue de franche compté 78450', '', 'Villepreux', '78450', 'Germany', true, '2026-01-07T02:20:07.891Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('097e9d93-e34f-456f-9ae3-373b0460943f', '02402cb9-8d47-496b-9c6a-2f7af85b86f2', 'thuy', 'duong Nguyen', '', '', '775136987', 'Dr. E. Beneše 642', '', 'Česká Třebová', '56002', 'Czech Republic', true, '2026-01-07T02:20:07.898Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f6cf9c26-6fe7-462f-b0c5-6825a638df63', '05face3f-c89f-405a-a338-e71e09feb75b', 'van', 'chau Nguyen', '', '', '81000', 'Boulevard emile jacqmain 137', '', 'brussels belgium', '1000', 'Germany', true, '2026-01-07T02:20:08.193Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4594472c-745d-44f9-8bbe-1af6775d913c', '6083896e-0391-4126-8012-52adf8a5e210', 'beckhamviet.ngo', 'beckhamviet.ngo', '', '', '', 'Obermarkt 14', '', 'Wolfratshausen', '82515', 'Austria', true, '2026-01-07T02:20:08.205Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b78ac4d8-55ea-44e0-b8fe-e8f192167ec8', '3998ab75-dc95-4fa1-b5fc-5651a99c39ff', '100046207563776', '100046207563776', '', '', '', 'Oststraße 39', '', 'Düsseldorf', '40211', 'Germany', true, '2026-01-07T02:20:08.215Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e38fbdcb-858b-4f11-91be-7b19497c5bee', '22c2a7c7-6560-4877-8f9d-47418b574e98', 'Quoc', 'Vinh Tran', '', '', '', 'Zollweg 1', '', 'Lörrach', '79540', 'Germany', true, '2026-01-07T02:20:08.258Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cbd55fa4-55ef-49e1-a007-7fc7c76e6ea6', '4cdd8c42-9023-404f-9272-3fbb79f43344', 'Dang', 'Manh', '', '', '871332', 'Ferdinand kuederli Straße 8', '', 'Waiblingen', '71332', 'Germany', true, '2026-01-07T02:20:08.278Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c110517c-3407-4c1b-a931-a9f309ac40e6', '795f8348-6549-43ce-8da8-5a695883abfe', '2', 'Praha', '', '', '776333068', 'Praha 2', '', 'katerinská', '12000', 'Czech Republic', true, '2026-01-07T02:20:08.299Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0f185889-4d97-4826-b5a9-9cbfabeda14d', 'bd95346a-ed58-4c19-9f3e-d9f9bf018f04', '19', 'Hauptstraße', '', '', '', 'Hauptstraße 19', '', 'Berlin', '10827', 'Germany', true, '2026-01-07T02:20:08.318Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7bd29166-276a-4093-b39d-021c6a9d30a8', '4578192a-f5f4-472a-b2c4-d37c27ec19f7', 'Hieu', 'Ngo Phuoc', '', '', '', 'Brühlstraße 2', '', 'Singen', '78224', 'Germany', true, '2026-01-07T02:20:08.319Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ad4e9d81-18ec-41dd-8cce-bbbc83be73a2', '4a6025da-2ed6-4929-84fd-23a094cc1d2f', 'Leipzig', '04109', '', '', '', 'Bruhl 1', '', 'Leipzig', '04109', 'Germany', true, '2026-01-07T02:20:08.320Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5bf9d7b9-443c-4a04-95d0-1210401cf5ff', '4dc80447-8acf-4df6-ba9d-2c61b8b26fec', 'Straße', '6/1 Lauffener', '', '', '', 'Lauffener Straße 6/1', '', 'Brackenheim- Meimsheim', '74336', 'Germany', true, '2026-01-07T02:20:07.684Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6fe68f87-b5dd-48b6-9ca6-4e9df3be2ed1', 'f45fafc5-7919-44b7-a955-3472fb541221', '17,50968', 'köln Rheinsteinst', '', '', '01793624099', 'Rheinsteinst 17', '', 'köln', '50968', 'Germany', true, '2026-01-07T02:20:07.704Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7d9e2935-965d-4a7d-96fb-c27dbfad5e75', 'b6869108-de25-42d5-a5a4-97d88dc9d664', 'thi', 'ngoan Nguyen', '', '', '773456368', 'Sousedská 600', '', 'Liberec', '46001', 'Czech Republic', true, '2026-01-07T02:20:07.709Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b76f3f5c-c659-426c-bba5-1d9f6111511c', 'f5f8a76c-a0a1-4877-b183-3e1f232f1c3b', 'chỉ', 'của em: Địa', '', '', '', 'In der Dodesheide 140', '', 'Osnabrück', '49088', 'Germany', true, '2026-01-07T02:20:07.724Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a4858cb9-8833-4697-9805-fdb16a5adaad', '701967c1-6097-4579-abb7-df19174a6b58', '17.listopadu', '291 Náměstí', '', '', '774948736', 'Náměstí 17', '', 'Přibram', '26101', 'Germany', true, '2026-01-07T02:20:07.728Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4f9c598c-f1a0-4f2d-a5ee-2d1a1091b05f', 'ddb6b774-3cc9-42ac-a200-9c5dd93cddd6', 'Thi', 'Ngoc Mai Nguyen', '', '', '', 'Schustergasse 8', '', 'Speyer', '67346', 'Austria', true, '2026-01-07T02:20:07.729Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9628304e-aa89-4396-8c6b-9d2033ddea0c', '17d98fdc-1e85-45c7-a849-62c02f1598a2', 'Koblenz', '56068', '', '', '', 'Minh Nguyen ( Nagelstudio); Löhrstr.82; 56068 Koblenz', '', 'Koblenz', '56068', 'Germany', true, '2026-01-07T02:20:07.750Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f5425779-e463-460c-ba93-6eb4e0eb1edd', 'd2a0211f-9dee-4494-b3a4-e958ec6698db', '100089329024504', '100089329024504', '', '', '40625105', 'Heyestr 40625', '', '-', '40625', 'Spain', true, '2026-01-07T02:20:07.772Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('87338a51-7327-4f70-bdf1-84a6ff4a756e', 'd93fb040-56d3-4db6-95da-8d91843d6a7e', 'Schwanthalerhöhe', 'im UG) (Forum', '', '', '', 'Theresienhöhe 5', '', 'München', '80339', 'Spain', true, '2026-01-07T02:20:07.788Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1bbda950-75d9-4c31-a3e9-c25131e9ff78', '83e8f3b0-7018-4428-813d-ef57f2af925f', 'Dgp.25130409pccs', 'Dgp.25130409pccs', '', '', '01725810092', 'Ricklinger Stadtweg 22', '', 'Hannover', '30459', 'Germany', true, '2026-01-07T02:20:07.797Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f4678c9c-98b8-4426-903b-56c444365bbf', 'c0f8bf1e-8131-43dc-952a-cb3bf19bdee6', 'Trọng', 'Tien Nguyễn', '', '', '', 'pfauengasse 22', '', 'ulm', '89073', 'Germany', true, '2026-01-07T02:20:07.816Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('537e2a3f-cc18-4073-951b-f537e390862d', 'e38e8135-fd5a-4a51-b5fd-cebb89194e74', 'Thu', 'Nguyen Ha', '', '', '', 'Dudweilerstraße 3', '', 'Saarbrücken', '66111', 'Germany', true, '2026-01-07T02:20:07.818Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4f978a1c-b830-421f-a2de-2739fadef519', '85ec222e-cf48-48b6-8a11-fc78a14439f4', 'Thu', 'Tran Minh', '', '', '', 'Königstraße. 39', '', 'Duisburg', '47051', 'Germany', true, '2026-01-07T02:20:07.819Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('82457ca1-748d-447b-a2f1-8ac97d65537d', '8e7aa147-7e8b-4d9d-a5be-35808ecb8bae', 'van', 'Hung Phạm', '', '', '968161', '. 9', '', 'mannheim', '68161', 'Spain', true, '2026-01-07T02:20:07.847Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1cf4c4bf-4901-41ae-bc46-18338b381bf6', '498fc3da-4468-4a05-9b6a-b8857470d3b7', 'Le', 'Ha Anh Truong', '', '', '+4975318071426', 'Opelstrasse 3', '', 'Konstanz', '78467', 'Germany', true, '2026-01-07T02:20:07.852Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('15bd62d4-2030-4ce3-9477-1ea493af56f3', '3ddb1a12-7e8f-49d6-b97c-7dc1762e8376', 'Thanh', 'Cam Cao Thi', '', '', '', 'Adolf str. 14', '', 'Buchholz', '21244', 'Germany', true, '2026-01-07T02:20:07.866Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7614121c-81c6-4358-97a7-baab435e3f19', 'cd5c74cd-2a48-4985-928c-5a6a31e42a9a', 'Thi', 'Dieu Le', '', '', '117119', 'Moselweißer Str. 117-119', '', 'Koblenz', '56073', 'Germany', true, '2026-01-07T02:20:07.868Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('50f631d9-272c-47b6-9f0c-29cce23887d4', '31d38152-6a7d-45cf-8d84-b60d03030c19', 'Dang', 'Trang', '', '', '', 'Hauptstr 107', '', 'Viersen', '41747', 'Germany', true, '2026-01-07T02:20:07.872Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('70317c6c-a66b-462b-bfa8-902fcf7681c0', '0b175716-09d8-4f3c-98c1-871593f951e6', '1', 'Alexander-Puschkin-Platz', '', '', '', 'Alexander-Puschkin-Platz 1', '', 'Riesa', '01587', 'Germany', true, '2026-01-07T02:20:07.885Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('50a652b9-5488-482e-8a9e-afb8d93d20c8', 'aa0f6b47-c428-4683-8930-3b18befffd99', 'Le', 'Mai', '', '', '', 'Sirnacherstrasse 1', '', 'Münchwilen TG', '9542', 'Germany', true, '2026-01-07T02:20:07.887Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6dc32cda-99d9-47dc-b3ee-6a020330af79', 'ea543274-749d-4659-8758-f71fc2a34277', 'thi', 'hoa Nguyen', '', '', '774068999', 'Moldava 135', '', 'Teplice', '41781', 'Czech Republic', true, '2026-01-07T02:20:07.891Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5ec6c602-af1d-4101-a13c-f5688ec6f195', 'efac8547-acc5-41e5-982d-14a5b7b808ea', 'thì', 'lan Trình', '', '', '', 'strasse 8a', '', 'viernhem', '68519', 'Germany', true, '2026-01-07T02:20:07.904Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8fbc1a1e-4fe0-47d3-bf62-0b1741d8e1b1', 'f691bac1-dc14-4fc0-9783-67cff9628e4e', 'Van', 'Anh Nguyen Thi', '', '', '', 'Johannisstraße 17', '', 'Osnabrück', '49074', 'Germany', true, '2026-01-07T02:20:07.908Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dcafdbc1-e1f0-4e67-86b4-75757fc59046', '610fa7d1-f1c9-43d7-bdf2-a90910819d2d', '32', 'Pfeilstraße', '', '', '', 'Pfeilstraße 32', '', 'Köln', '50672', 'Germany', true, '2026-01-07T02:20:07.928Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('41ae9687-05fd-4dd0-a63f-ad71460dd469', '9b80f2eb-8901-4021-bbb1-61af1e830d73', 'thi', 'Lan Nguyen', '', '', '', 'Kaiserring 48-50', '', 'Mannheim', '68161', 'Germany', true, '2026-01-07T02:20:08.456Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7bdcdf32-7bd1-446e-a6c0-31a05b96b8a0', '013656e5-ac7b-4372-9b26-dba480f19f44', 'tran.linh.5076', 'tran.linh.5076', '', '', '', 'Beauty Hohenzollern str 45', '', 'München', '80801', 'Germany', true, '2026-01-07T02:20:07.942Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cfbb7072-e348-43cf-a66b-3ba1884c1ff1', '2c45a17b-5f2b-4e63-b65b-1fdca808e86f', '100010896781483', '100010896781483', '', '', '1052511', 'Alte Poststr. 10', '', 'Geilenkirchen', '52511', 'Germany', true, '2026-01-07T02:20:07.986Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('72ff9e89-f988-42ef-9006-118f71aee461', 'fdae7f54-da18-4d80-b577-a319c075cecb', 'Thi', 'Ngan Thieu', '', '', '', 'Friedrichstädter str 51-53', '', 'Rendsburg', '24768', 'Spain', true, '2026-01-07T02:20:07.992Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('123db5d8-d3ff-46af-8d3b-02c9d6d8cb64', '89eb55df-7996-4581-b1b4-5c5ef7e39584', '65', 'Alt-Haarenerstraße', '', '', '', 'Alt-Haarenerstraße 65', '', 'aachen', '52080', 'Germany', true, '2026-01-07T02:20:08.004Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('de7afae8-c3e5-4eaf-a7b3-0e2f8258df98', '4bb625a5-1e9f-4636-815f-3b836471b9ca', '24', 'Katharinenplatz', '', '', '', 'Katharinenplatz 24', '', 'Mühldorf am Inn', '84453', 'Austria', true, '2026-01-07T02:20:08.005Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('384414a6-02a8-4c94-9212-229c27307b1b', 'fc4332f0-22f5-4c51-93ad-db16dc9fd409', 'Str.', '277 Moerser', '', '', '', 'Moerser Str. 277', '', 'Kamp-Lintfort', '47475', 'Germany', true, '2026-01-07T02:20:08.025Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('79b2e0eb-d53a-4a82-b2dd-fc9a2dfcb43f', '87c16422-1f20-4263-841a-a84aaa8f0dc1', 'Mazur', 'Huong', '', '', '374321', 'Kronenplatz 3', '', 'Bietigheim-Bissingen', '74321', 'Austria', true, '2026-01-07T02:20:08.544Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ac2e80a2-6cf9-4373-ab71-cf7ce4549bfe', '655b7a00-62a3-4cee-ad9e-e9b9451185c8', 'potucky', '362/11', '', '', '728035364', 'DIAMOND NAILS; 362/11 potucky; 36238 karlovyvary .cz; 728035364', '', 'karlovyvary', '36238', 'Czech Republic', true, '2026-01-07T02:20:08.556Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5dd71dc1-e541-4f97-9dd8-263a1be7b6a1', '95baebbb-1199-4437-bfa7-37bd1f3a71c9', 'Bad-Freienwalde(Oder)', 'Königstr46,16259', '', '', '', 'Lenails, ; Königstr46,16259 Bad-Freienwalde(Oder)', '', 'Bad-Freienwalde', '16259', 'Germany', true, '2026-01-07T02:20:08.568Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('494a6135-0ba4-4f76-8a2c-bbb26eeef583', 'ceedae27-2cd6-47f0-af56-bffc0fcb02fb', 'huyen', 'trang Nguyen', '', '', '1843401', 'Josefa sevcika 858/18', '', 'most', '43401', 'Czech Republic', true, '2026-01-07T02:20:08.575Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6c4d2b97-e164-4d6c-947b-48433e9433cb', 'c98252d7-d9c5-4b7a-82da-5ed4d25c1f34', 'Ngoc', 'Anh Ha', '', '', '', 'Zur Flachsrose 7', '', 'Neuental', '34599', 'Germany', true, '2026-01-07T02:20:08.577Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c963cafe-6469-4860-8775-e9859ebb579e', '0d6c1383-975f-4ffd-bb8c-cd40e494f163', '100029353350491', '100029353350491', '', '', '', 'm. Briesker Str 83', '', 'Senftenberg', '01968', 'Spain', true, '2026-01-07T02:20:08.672Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('df18296d-0e9f-4bed-a54a-4ca5c3a217dd', '1b14a43e-1e2a-4840-89cd-70916f9bfae7', 'Tran', 'Huong', '', '', '', 'Breyellerstr 11a', '', 'Nettetal', '41334', 'Germany', true, '2026-01-07T02:20:08.709Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('882c75b4-d7b0-40fa-ba81-1eb99cc38e28', 'b80112e0-7b99-4ccc-89b8-cae096234c5b', 'oanh', 'le thi', '', '', '', 'Gärtnerweg 3', '', 'Herford', '32051', 'Germany', true, '2026-01-07T02:20:08.723Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9684c243-5591-4328-beec-2e97d58b8281', '2d53caf1-505c-4e68-89bd-c2a5ede845ab', 'Vân', 'Anh Nguyễn', '', '', '', 'Kamp 50c', '', 'Osnabrück', '49074', 'Germany', true, '2026-01-07T02:20:08.726Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9ebc6b97-3e02-44dc-9ce6-f2731058628b', 'f8cff3e6-346c-4b43-9512-73713f4c178d', 'trang', 'nguyen Thu', '', '', '', 'Rheinstraße 38', '', 'Langen', '63225', 'Germany', true, '2026-01-07T02:20:07.943Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('33578dbb-7b52-4f6b-99a5-b63d6b9c7ce3', '3e48c7bf-f2e5-4fde-9c81-2a165e6d51d2', 'thanh', 'hai do', '', '', '+420608957766', 'Sportovní 2810', '', 'Mělník', '2810', 'Czech Republic', true, '2026-01-07T02:20:08.025Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('50da06f3-cedc-414a-a30d-00c785a9a713', 'e1790e1d-9280-4091-b671-91fda06d26a3', 'Tuyet', 'Minh Phạm Thi', '', '', '', 'Hubertusweg 17', '', 'Betzdorf', '57518', 'Germany', true, '2026-01-07T02:20:08.045Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cdcc1477-9df5-46ae-aac3-771349aae708', 'c8ddbf98-3fec-4112-b3dc-66d52613cffe', 'Duc', 'Anh Doan', '', '', '', 'Im Care Bad Cannstatt 1', '', 'Stuttgart', '70372', 'Austria', true, '2026-01-07T02:20:08.057Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('73dbde2a-6248-4c73-ace7-852118913329', '495df1af-5b34-40dc-958e-97bed0095714', 'Hà', 'kist Bích', '', '', '', 'Dr Alex Röder Str 2', '', 'Neunkirchen am Brand', '91077', 'Germany', true, '2026-01-07T02:20:08.078Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0fb0c122-5777-486d-9de2-1161fd0db675', '3e9e91ec-f179-482e-a5fa-4903a8ec792f', '28', 'kirchstr', '', '', '', 'kirchstr 28', '', 'Baesweiler', '52499', 'Spain', true, '2026-01-07T02:20:08.129Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c94ea314-602c-480d-94a7-a96e01126eea', '81eb998f-0c40-4e04-8317-ec4894a98bb4', 'Thị', 'Dung Hoàng', '', '', '479790', 'Hauptstrasse 4-79790', '', 'Küssaberg', '79790', 'Germany', true, '2026-01-07T02:20:08.131Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bd963134-93a1-4143-a4d5-9f98a641e224', 'a1d3cd8b-a1f6-47c5-8038-e932aa5dff0e', '792', '398 978 Sđt:', '', '', '792398978', 'Potucky 25', '', 'Potucky', '36235', 'Germany', true, '2026-01-07T02:20:08.135Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b6f4f7d-5f3f-4a7c-8558-c66ebfd88dce', '13b5871b-c9eb-497d-ac2b-3d9c7382558d', 'str.12', 'Wiesen', '', '', '', 'My nails & Beauty ; Wiesen str.12; 66386 st.Ingbert', '', 'st', '66386', 'Spain', true, '2026-01-07T02:20:08.149Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('98ec9035-3233-488d-a249-2e40b4f0999f', 'c150a864-cd7c-456a-8d03-eb538a38d1b9', '1,', '07743 Jena Leutragraben', '', '', '', 'Leutragraben 1', '', 'Jena', '07743', 'Germany', true, '2026-01-07T02:20:08.192Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4f310d2f-23cd-4832-a8fd-5558cd3d7718', '01540e84-ce02-40ff-93e8-5b95c048d6ce', '43', 'Markt', '', '', '', 'Markt 43', '', 'Heide', '25746', 'Germany', true, '2026-01-07T02:20:08.215Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2e1df47a-2b2d-47ba-a961-f12529326019', 'e9f34a40-75f2-4ec3-b9be-76543ccee08a', 'Tran', 'Huong', '', '', '', 'Markt 16', '', 'Glinde', '21509', 'Germany', true, '2026-01-07T02:20:08.217Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6a5abdab-ee7e-4dd7-90be-eb75872adb86', 'be4ccee1-cc80-4148-8cc5-49dad59f8dec', 'thi', 'Lua Nguyen', '', '', '015236791328', 'Berlin Straße 9', '', 'Senden', '89250', 'Germany', true, '2026-01-07T02:20:08.234Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4abc7a65-d30a-4599-ac65-a5312cf63054', '2abd0cac-e282-4270-9c2d-d341a37bc8d2', '&', 'Nguyen GbR Tran', '', '', '', 'Ranstädter Steinweg 22', '', 'Leipzig', '04109', 'Germany', true, '2026-01-07T02:20:08.236Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fd876dde-bf6d-4652-8988-78bbda19a334', '8518b3a8-0a58-4643-b344-56cd0fab834a', 'exilu', '26 Ceskoslovenskeho', '', '', '775161899', 'Ceskoslovenskeho exilu 26', '', 'praha', '14300', 'Czech Republic', true, '2026-01-07T02:20:08.282Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ccf728e8-e069-4433-9f87-eae9f35ebc06', 'ca06a506-8f77-4d94-968d-b526e96ea054', 'Duongthuy979', 'Duongthuy979', '', '', '', 'Ländgasse 122', '', 'Landshut', '84028', 'Germany', true, '2026-01-07T02:20:08.361Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('85f9798c-196d-43ba-a8d2-ac9cb8a9cafa', '01be896c-7c17-42f4-869f-26afc255f3dc', 'thong.lanh.3', 'thong.lanh.3', '', '', '01729526789', 'Lành .Madamenweg 55', '', 'Braunschweig', '38118', 'Germany', true, '2026-01-07T02:20:08.368Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('305927f3-0de7-4179-8d4d-0369ef7c19a2', 'ad88045c-1b90-4159-a53e-6332ff540486', '599', '46001 Liberec Sousedská', '', '', '59946001', 'Sousedská 599', '', 'Liberec', '46001', 'Czech Republic', true, '2026-01-07T02:20:08.370Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('735d7993-99be-4ec7-94a7-16fbab2a025a', '86420796-387c-42f9-8837-568ea741a8a9', 'bui', 'Thao', '', '', '0950407599', 'Andreja sladkovica 90/5', '', 'zvolen', '96001', 'Germany', true, '2026-01-07T02:20:08.373Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('97c53cba-46db-45dd-9dbd-dd6060f6c3e6', '3adebaa9-d842-4fe3-a807-0dbe4f37d589', 'Phan', 'Duc', '', '', '4786551', 'Stadtplatz 47', '', 'Aichach', '86551', 'Austria', true, '2026-01-07T02:20:08.381Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f5320a83-c8d4-43a0-b059-d734df0e7aa9', '2bec11b3-18f3-43fc-a5b1-ac4b8d440857', '18', 'Hauptstraße', '', '', '017647828362', 'Hauptstraße 18', '', 'Bad Nauheim', '61231', 'Germany', true, '2026-01-07T02:20:08.390Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4b12fa28-400e-4735-b5b4-00857baa3203', 'a7da9a9e-202c-4c57-b6e2-d5d207438741', 'Dinh', 'Thanh Long Kieu', '', '', '', 'Hindenburgstr. 44', '', 'Remscheid', '42853', 'Germany', true, '2026-01-07T02:20:08.411Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1ffa9ae4-8aa5-4444-a725-0b019525b4af', '4f3b5555-c4f3-468d-b6a2-16905067f73d', '45,41199', 'Mönchengladbach Reststrauch', '', '', '', 'Reststrauch 45', '', 'Mönchengladbach', '41199', 'Spain', true, '2026-01-07T02:20:08.413Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c10ddc4e-7e09-4c23-bbff-da58db667737', 'd8a6e1f6-e655-4500-91a3-7d2f4e24f4f6', 'Do', 'Cham', '', '', '', 'Klara-Terglane-Straße 10', '', 'spelle', '48480', 'Germany', true, '2026-01-07T02:20:08.432Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8f59fe78-cb7c-40e9-a19a-0dbf074fb1cc', '547eed13-d466-4b6a-99cf-81616a081a53', 'Dieu', 'Linh Pham', '', '', '', 'Amalie-dietrich-platz 3', '', 'Dresden', '01169', 'Germany', true, '2026-01-07T02:20:08.434Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5fd989bf-6eda-416b-bcea-30eadb486d3f', 'e2cc97a7-a8dc-4578-aa29-1cbd645a7ad5', 'Thao', 'Nguyen Thi', '', '', '26382', 'Markt. 62', '', '- Wilhelmshaven', '26382', 'Germany', true, '2026-01-07T02:20:08.440Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('08344a21-d4bf-43e5-9454-3639ff1c6602', 'f7fb1826-629b-4859-b611-807ec715361f', 'Mai', 'Lyna', '', '', '', 'HAMMERWEG 26', '', 'MICHELSTADT', '64720', 'Germany', true, '2026-01-07T02:20:08.471Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1d121468-73ec-4af8-96ac-620fbd4fd7c6', 'aa73a10a-69fe-45c5-b3a1-178311bc7166', 'Thi', 'Thuy Nga Phạm', '', '', '', 'Tiergartenstr 28a', '', 'Dresden', '01219', 'Germany', true, '2026-01-07T02:20:08.474Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1e7c257a-32fc-4698-83c4-3f420cfe4f41', '00f250ee-f90f-4631-b643-27cf950a65a6', 'Minh', 'Tien Do', '', '', '', 'Europaallee 6', '', 'Norderstedt Deutschland', '22850', 'Germany', true, '2026-01-07T02:20:08.580Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('29d50faf-60b1-49b4-a42c-009e3313e62c', 'acbc2c78-b01e-43e9-8510-7daa9a6ca5e1', 'thi', 'thuy nga Vo', '', '', '778550888', 'Nádražní 228/2', '', 'kopřivnice', '74221', 'Germany', true, '2026-01-07T02:20:08.610Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2ce59043-50c1-4df4-b77e-fab16255bd04', 'a8b3bda5-c7c6-4ed9-9e12-b14fc6daad28', 'chỉ:', 'Địa', '', '', '+34665863008', 'Encartaciones 11', '', 'Barakaldo', '48901', 'Spain', true, '2026-01-07T02:20:08.612Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('27218938-5941-4c62-91cd-e2a0c933991c', 'c570465d-b14b-482f-b580-1158ec9b1bb5', 'lananh.bui.501', 'lananh.bui.501', '', '', '', 'WPS Chutu Lukas Huynh 17040', '', 'Lonzaring', '17040', 'Germany', true, '2026-01-07T02:20:08.628Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('663f0648-f198-4ff8-ab30-f0496e79e22c', 'ea7f9b55-0b81-4173-aa28-aab9a58100be', 'Vo', 'Hong', '', '', '', 'Adalbertstraße 84', '', 'Aachen', '52062', 'Germany', true, '2026-01-07T02:20:08.642Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d62023de-9b24-4e9a-82b4-7e41a7053e91', 'ea774134-b4bc-40c8-8db9-de274b66bf0f', 'My', 'Nguyen FDI Tra', '', '', '01775447210', 'Windmühlenstr. 24', '', 'Bremen', '28759', 'Germany', true, '2026-01-07T02:20:08.650Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c30f7de5-947f-4583-a626-5eee659a60aa', '57667cd9-02dd-4a44-95df-5e6d394e5f82', 'asian', 'xpress Kyo', '', '', '', 'Weißenburgstraße 7', '', 'würzburg', '97082', 'Spain', true, '2026-01-07T02:20:08.695Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0e0a4d4a-3c36-453c-bbad-1d1e28b56f4b', 'a6785970-8f58-44c9-9e06-392b63cbff5d', 'Tran', 'Thi', '', '', '', 'Lorscher Straße 17', '', 'Frankfurt am Main', '60489', 'Germany', true, '2026-01-07T02:20:08.700Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a1c18421-ef65-4933-bcc8-f57cda86881a', '9f971701-ddc7-4799-8ccc-794663918acc', 'thi', 'Thuan Ha', '', '', '', 'Heiligengeiststraße 16', '', 'Bad Oldesloe', '23843', 'Germany', true, '2026-01-07T02:20:08.705Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f9323314-c6ea-4fec-9e56-9f8c6b826a3e', '46b4d7b9-9682-4a9e-9a80-2f6d2a3c5d06', 'thị', 'hà nguyễn', '', '', '776249888', 'ostravská 130/16', '', 'Hlučín', '74801', 'Germany', true, '2026-01-07T02:20:08.707Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('698b3e7e-a005-48a2-8cd8-97925352be14', '5f68dcb1-7fa5-47df-82c5-0b0950401ebd', 'Coens', 'Galerie) (im', '', '', '', 'Kölner Str. 40', '', 'Grevenbroich', '41515', 'Germany', true, '2026-01-07T02:20:08.731Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('948d9b8d-1479-43d2-8958-43bfb4cdfe70', '699c39d3-217c-4b08-908d-6f7508301cdd', 'chỉ', 'là Địa', '', '', '00421944682108', 'Hlavná 39', '', 'stupava Slovakia', '90031', 'Germany', true, '2026-01-07T02:20:09.190Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8cf65e9b-8d2d-4e2d-b62d-a983176876bd', '176efa4b-5813-4316-bc26-c856029f5422', 'thi', 'phuong nga Pham', '', '', '777451987', 'Jana palacha 17/14', '', 'breclav', '69002', 'Germany', true, '2026-01-07T02:20:09.463Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6c8d0882-f8ae-4bee-8579-8a9cdac459a8', '71c35c19-b9fd-4400-b869-2898a2329f81', 'Str.', '13 Homberger', '', '', '', 'Homberger Str. 13', '', 'Moers', '47441', 'Germany', true, '2026-01-07T02:20:09.484Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('260fea92-425f-4ac1-8b25-58f47ebd3e89', '9d2dc97c-1a0e-4a73-b8f5-4880b2349255', '42516907', '+45', '', '', '+4542516907', 'se Torv 1', '', 'K', '2720', 'Germany', true, '2026-01-07T02:20:09.488Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5e707973-7436-4475-8ffd-733ed642093e', 'a94cf171-57b7-4565-9b0b-ea15fdc1c400', 'Ngoc', 'Thang Nguyen', '', '', '01745751293', 'Oppelner Str. 223', '', 'Nürnberg', '90473', 'Germany', true, '2026-01-07T02:20:08.543Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('07e905e5-d57d-4237-9e39-6a5687b30611', '9e6c8997-1a2d-4300-9fea-cb1a09ac352b', 'Thi', 'Thu Huong Nguyen', '', '', '606384126', 'Sokolovská 138/74', '', 'Karlovy Vary - Rybáře', '36005', 'Czech Republic', true, '2026-01-07T02:20:09.203Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('48e945da-9f22-4fd4-a1d5-93d9723a4dae', '42c3be17-696c-4669-a6af-7dc5dbd876bd', 'Thi', 'Kim Anh Nguyen', '', '', '015258059854', 'Bürgerstraße 9F', '', 'Karlsruhe', '76133', 'Germany', true, '2026-01-07T02:20:09.228Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('35d619db-c912-42d0-92c0-1fe44a600993', '7ed4d1cc-b67f-4887-a9e2-d035da7ba2b9', 'thị', 'hà nguyễn', '', '', '776249888', 'ostravská 130/16', '', 'Hlučín', '74801', 'Germany', true, '2026-01-07T02:20:09.253Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f0e74f2a-a708-40ff-b58c-8fe8a9caad10', '22ef2e02-bcb1-49f8-a14c-58cdc10cd4ad', 'thaotien.phan.5220665', 'thaotien.phan.5220665', '', '', '', 'Louisenstraße 140', '', 'Bad Homburg', '61348', 'Germany', true, '2026-01-07T02:20:09.273Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ae065619-ffd6-4d93-a242-b3659bf2ec74', '1f7293a6-6937-458d-b8f1-d899fd25266a', 'Straße.16,', '99610 Sömmerda Weißensee', '', '', '', 'Sömmerda Nails; Weißensee Straße.16, 99610 Sömmerda', '', 'Sömmerda', '99610', 'Germany', true, '2026-01-07T02:20:09.284Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5120fa92-2462-479c-87ad-484465f3f451', 'bc5af5e2-4a1f-47bd-8260-108d97c1e53a', 'nhung', 'Le', '', '', '', 'Trierer Straße 720', '', 'Aachen', '52078', 'Germany', true, '2026-01-07T02:20:09.483Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dc38c298-ed9e-4c31-8d37-4051ea89ac0a', 'c19b7420-428c-47f0-96ce-b18ba994a7ca', 'Iserlohn.', '58636', '', '', '', 'Vu Thi Phuong - Miss Nails Studio . ; Laarstr.13; 58636 Iserlohn.', '', 'Iserlohn', '58636', 'Germany', true, '2026-01-07T02:20:08.338Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('266ebadc-568c-4c97-9750-f7381a265021', '24364340-df59-4515-a23b-69916ed18091', 'Nguyen', 'Trang', '', '', '', 'Deininger Str. 22', '', 'Nördlingen', '86720', 'Germany', true, '2026-01-07T02:20:08.340Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a5834ae5-89fb-424e-b677-7be9a9734aad', 'bd697673-203f-4e06-9425-8295c91172cc', 'Phan', 'Ha', '', '', '12918000', 'Sokolovska 584/129', '', 'praha', '18000', 'Czech Republic', true, '2026-01-07T02:20:08.353Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fdc09efc-c95b-4019-8067-66528c426e42', '3d80c665-0e35-4667-8118-ee2341fbfbc5', 'dao.anh.16', 'dao.anh.16', '', '', '', 'Breslauer str 1a', '', 'Saarbrücken', '66121', 'Spain', true, '2026-01-07T02:20:08.433Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('937a2e38-3745-41ff-a2d5-7fdafd7a0c92', '69c00e13-cdb8-4e69-86a2-4e9a4c6c2c00', 'thi', 'Ngoc anh Nguyen', '', '', '', 'Kämmererstraße 49', '', 'worms', '67547', 'Germany', true, '2026-01-07T02:20:08.455Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('30e52023-79e2-4097-8b18-23ab00a2d1cd', '4bb2ecfc-048e-4caa-b13d-e2ffa465e885', '100075055761180', '100075055761180', '', '', '', 'Lise Thérèse Phi Ky Phong; 7 rue du Professeur Bergonié; 94260 Fresnes; France', '', 'Fresnes', '94260', 'Spain', true, '2026-01-07T02:20:08.479Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e30c6d5a-6eae-4f10-8ead-e0629b37613a', '9dda4c4c-3d2f-4004-8e07-0737b23973ed', 'Johanneskreuz', '8 Am', '', '', '', 'Am Johanneskreuz 8', '', 'Bonn', '53111', 'Spain', true, '2026-01-07T02:20:08.500Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('43e52f7e-fc11-4d61-8493-72d418f7dad0', '4685d27a-7d48-4547-a68a-11d7d11aa356', 'thị', 'như Hậu Nguyễn', '', '', '', 'Leipziger Straße 69', '', 'Frankfurt am Main', '60487', 'Germany', true, '2026-01-07T02:20:08.508Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2f918f99-0f85-4b91-b026-44882a4bd6a0', '49ac4915-f35e-4afe-8050-18bcafac6cb9', 'Mulhouse', '68100', '', '', '+33629635759', 'Mi Nails; 19 rue de la Sinne ; 68100 Mulhouse ; FRANCE; Tel : +33 629635759', '', 'Mulhouse', '68100', 'Germany', true, '2026-01-07T02:20:08.531Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a67948f2-7d35-41aa-bde5-d394602319d2', '510f5ddd-319f-421d-8d02-7a8eb9cba7d5', 'thuy.tien.94402', 'thuy.tien.94402', '', '', '597080', 'Wagnerplaz 5', '', 'Grombul', '97080', 'Germany', true, '2026-01-07T02:20:08.543Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f49d9bb3-c424-43bb-9922-5d3c8ccda995', '819ff3c8-ca1c-4dee-ad38-aaea8a28333d', 'HÙNG', 'DŨNG PHẠM', '', 'lovenailsebersbach@gmail.com', '9089438', 'Marktplatz 20', '', 'Ebersbach an der Fils', '73061', 'Germany', true, '2026-01-07T02:20:08.590Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5a3ed37a-1c09-4033-9b3c-592b88f61eaa', 'bebf30f0-0da3-48b2-8bc7-74e61fa9f2be', 'Cobui', 'Cobui', '', '', '246045', 'Willy-Brandt-Platz 2-46045', '', '- Oberhausen', '46045', 'Austria', true, '2026-01-07T02:20:08.591Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e43802bd-33a3-47b4-92b6-732f8cfe7e03', '7f174a81-818b-4563-bef6-0c4de22086c9', '12', 'Mercedesstraße', '', '', '070317891607', 'Mercedesstraße 12', '', 'Sindelfingen', '71063', 'Germany', true, '2026-01-07T02:20:08.595Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f46b3844-2e00-406e-a4dd-d5f22f5cf5f8', '4bd6ac56-d5cd-4f1a-85a0-6dab343cb44b', 'Kiều', 'Anh Hà', '', '', '', 'Weichser Weg 5', '', 'Regensburg', '93059', 'Germany', true, '2026-01-07T02:20:08.597Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5d92616b-51a5-42f4-a95b-f4ab70de6a54', 'd64c7ce6-b730-4ffb-8d15-ca074349dc13', 'trangtocxoan.sk', 'trangtocxoan.sk', '', '', '', 'Apfelmarkt 18', '', 'Emden', '26725', 'Germany', true, '2026-01-07T02:20:08.611Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4aaecdcb-c4eb-4bdc-8c7f-b754a878146f', '1795ea52-27c7-449c-a901-fa1f97ba650a', 'Quoc', 'Hung Ta', '', '', '', 'Schloßstr. 2', '', 'Storkow', '15859', 'Germany', true, '2026-01-07T02:20:09.231Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0908d258-f08c-4556-b568-276251e90e2d', 'a5d53c3f-1401-4917-a466-d7272f8098a5', 'Allee', '348 Grafenberger', '', '', '', 'Grafenberger Allee 348', '', 'Düsseldorf', '40235', 'Germany', true, '2026-01-07T02:20:08.629Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1711024d-2b73-4bb6-aba6-531cdea9cef1', '1d8e539a-73de-4ce5-99fe-1798175fd5ff', 'Hien', 'Ngo Thu', '', '', '', 'Thu Hien Ngo; Modehaus DH; Brandenburger Str.30; 39307 Genthin', '', 'Genthin', '39307', 'Germany', true, '2026-01-07T02:20:08.642Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9718cfb8-4103-414e-b5aa-b68530b08155', '8cda8821-cf7d-403d-9f5e-47f94d79d2b6', '61555020517084', '61555020517084', '', '', '', 'untere Stadtmühlgasse 9', '', 'Weissenburg in Bayern', '91781', 'Germany', true, '2026-01-07T02:20:08.657Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3ebc1007-cdf1-4a50-bbd6-bd236351f0a2', 'bd5a9999-5330-4763-97c0-eb35bddf67b7', 'Thi', 'Thu Hien Dinh', '', '', '79401', 'Opavaská 20', '', '- Krnov', '79401', 'Czech Republic', true, '2026-01-07T02:20:08.663Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4862208c-f561-4e37-a3fe-e916c30fb944', '3cb29cdf-ede8-4444-b62b-8cfda1276297', 'Bich', 'Ngoc', '', '', '067761598250', 'Pfarrgasse 10', '', 'Steyr', '4400', 'Austria', true, '2026-01-07T02:20:08.669Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('77005fd8-8398-49eb-84d9-f811ec68b85b', '2d4e7eff-9a4f-4eba-be1b-69bcbf5a8ca5', 'Globus', 'Freilassing Im', '', '', '', 'Traunsteiner Straße 6', '', 'Freilassing', '83395', 'Germany', true, '2026-01-07T02:20:08.680Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0110c260-62af-450a-9edb-2f1565410c8d', '402487f3-6a5b-4a8e-bbdd-ea200399ada8', 'ngoc', 'Hanh Do', '', '', '', 'Do ngoc Hanh; Nails By Jessi ; Katharinenstr.7; 72764 Reutlingen', '', 'Reutlingen', '72764', 'Austria', true, '2026-01-07T02:20:08.685Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f21ede8e-16cc-4f18-b36b-5098e6c1cab7', '45b4dc5c-c469-4139-a703-ccd5f56784a6', 'lan.tran.581', 'lan.tran.581', '', '', '3276829', 'Martin Luther 32', '', 'Landau', '76829', 'Germany', true, '2026-01-07T02:20:08.758Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7a8191bc-cfe6-41f6-957c-eece1919eb36', 'cf61c0ad-b726-4dba-8e74-61f9521f82e8', '57', 'Sterneckstraße', '', '', '', 'Sterneckstraße 57', '', 'salzburg', '5020', 'Austria', true, '2026-01-07T02:20:08.806Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b663c112-a559-4196-926e-e91a2c0efdc4', '743864e3-1e4b-45a9-8cb1-61fb655ed702', 'Quynh', 'Trang Phan', '', '', '015229046551', 'Heinestraße 7', '', 'Neustadt an der Weinstraße', '67433', 'Germany', true, '2026-01-07T02:20:08.812Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3e8840e5-a403-490c-a5ea-26c116eff3ff', '5d7b3218-4ec3-4449-bb4d-483e0e3b242a', 'Strasse', '304 Zülpicher', '', '', '', 'Zülpicher Strasse 304', '', 'Köln', '50937', 'Germany', true, '2026-01-07T02:20:08.816Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('def8d9a0-1290-4b24-910d-17506c01c6e7', '25f712f4-0727-40b3-a91b-be0a0babe38a', 'Landstrasse', '59 Eppendorfer', '', '', '', 'Eppendorfer Landstrasse 59', '', 'Hamburg', '20249', 'Germany', true, '2026-01-07T02:20:08.828Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e5d80ad6-3c55-484b-a280-d5330a35c7b6', 'b16571e2-2ff8-454b-afb1-d30b7b0b8c28', 'Quang', 'Duong Nguyen', '', '', '004915203663889', 'Altstadt 70', '', 'Landshut', '84028', 'Germany', true, '2026-01-07T02:20:08.832Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('23678470-2c4a-40f7-96f3-424a1727755d', 'cab342b5-e2ea-456e-8b94-abf0012a8662', 'Ho', 'Hang', '', '', '2400530', 'Toinen linja 9', '', 'Helsinki', '00530', 'Netherlands', true, '2026-01-07T02:20:08.836Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7f99042f-5e20-4737-90cc-507b1ace2821', 'c0a21d05-4530-424d-8850-2e123b4abb23', 'vu.anna.7524', 'vu.anna.7524', '', '', '', 'Dc: Vu thị Bich  Quyen ; Wilhelm-leuschner  str.22A; 67547 worms', '', 'worms', '67547', 'Germany', true, '2026-01-07T02:20:08.848Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3d0f3958-c5b9-45d8-9934-98090874ffba', 'aa302dea-773d-4739-9655-11361e714e87', 'Nghi', 'Thiet Nguyen', '', '', '017641746868', 'Grafenberger Allee 149', '', 'Düsseldorf', '40237', 'Spain', true, '2026-01-07T02:20:08.865Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2d273bae-77f0-4eea-ad63-854655b66e14', 'e3d8658d-0f21-47ab-81bc-68d07b1e8479', 'Anh', 'Phuong Pham Thi', '', '', '456856', 'Fliehburgstraße 4', '', 'Zell', '56856', 'Germany', true, '2026-01-07T02:20:08.867Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4ff391e0-d24a-49b1-9c25-859919117c81', '67a8bc98-a4c7-46b2-8955-42cccfcdd240', 'Hoang', 'Thuy', '', '', '', 'Tiensestraat 87', '', 'Leuven', '3000', 'Austria', true, '2026-01-07T02:20:08.871Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('014c2e7e-6884-4829-b3df-db8b106eb284', 'e7859767-2f00-4882-a3df-9df60bffd772', 'Ngoc', 'Kim', '', '', '8166115', 'Hubert-Müller-Straße 81', '', 'Saarbrücken', '66115', 'Germany', true, '2026-01-07T02:20:08.885Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2201f132-13d1-419f-818e-1ac0501af7cb', '6fdee9e9-6175-4042-b051-8959ec061e9c', '0034', '612469178 Tl', '', '', '19708016', 'Paseo Fabra i Puig 197', '', 'barcelona Espa', '08016', 'Spain', true, '2026-01-07T02:20:08.900Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c5c20e56-ecd4-483b-b450-61060dd52f3c', '711d9104-9d65-4356-9e3d-ae2526b61241', 'quân', 'duc', '', '', '5940472', 'Westfalenstrasse 59', '', 'düsseldorf', '40472', 'Spain', true, '2026-01-07T02:20:08.947Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f7408b57-d57b-476d-88e6-02c7f92fe487', '26b56899-e18d-4130-b538-dd5f61c059bc', '7', 'Mechelsesteenweg', '', '', '', 'Mechelsesteenweg 7', '', 'Mortsel', '2640', 'Germany', true, '2026-01-07T02:20:08.977Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('87e151a8-faee-4976-a18f-665cb7093278', '617e381d-a877-4c96-a81e-f2c61691a3fe', '296/3', 'Nuselská', 'Lio Nails', '', '14000', 'Nuselská 296/3', '', '', '', 'Česko', true, '2026-01-20T09:49:11.281Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4540020b-f4ab-49f3-929e-aec0f7ce293a', '53ea2e32-6ea7-4b53-b867-4104c10d2561', '22', 'reichsstädter', '', '', '', 'Nails Beauty 22', '', 'aalen nhé', '73430', 'Germany', true, '2026-01-07T02:20:08.729Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('79bac4b6-c086-486f-a70c-b720363e3e3b', '4497a875-e748-45d0-9771-7b619ab6ec7e', 'huy', 'hoang Nguyen', '', '', '', 'Eisenbahn str 13', '', 'Homburg', '66424', 'Germany', true, '2026-01-07T02:20:08.731Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bd62958d-11f8-4d70-9965-67bf9cfa3d4a', '666cb95a-3e61-4718-8754-af3d229a06d2', 'Anh', 'Nguyen Tuan', '', '', '', 'Waldshuter Straße 1', '', 'Waldshut-Tiengen', '79761', 'Germany', true, '2026-01-07T02:20:08.743Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8d4fb5ae-3705-49b8-9252-823e7fb6dda4', '23850a46-f6c3-497f-966b-8536d5231812', '100033619493858', '100033619493858', '', '', '', 'Kaßstraße 29', '', 'Emmerich', '46446', 'Germany', true, '2026-01-07T02:20:08.746Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2bbbacf4-2801-405e-8cb3-d3991eda6512', '44672305-3a95-4bd6-90e8-76d63e7a972d', 'Nguyet', 'Nguyen Thi', '', '', '', 'Gundelfinger Str. 4', '', 'Freiburg', '79108', 'Germany', true, '2026-01-07T02:20:08.802Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('375744e8-21cf-430c-a8f6-eabf66e7ac6a', 'ddfcfe41-bd8d-44cc-83d3-87ba8a20b1fc', 'Tuan', 'Kiet Dang', '', '', '', 'Stadtgalerie Heilbronn UG Deutschhofstrasse 19', '', 'Heilbronn', '74072', 'Germany', true, '2026-01-07T02:20:08.913Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2f438318-61cd-46eb-a4ae-8704e9cbf467', 'bf375434-456b-4fb9-beb3-c90f6f04aa40', 'Hai', 'Nguyen Duc', '', '', '', 'Hanauer Landstr. 70', '', 'Frankfurt', '60314', 'Germany', true, '2026-01-07T02:20:08.925Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1ae2dac4-80fe-4f5b-be13-58df3bae03f7', 'd142fce5-10ad-4c88-b9c2-daf9a2895fa0', 'du', 'centre Galerie', '', '', '0483999166', 'Rue des Fripier 17/58', '', 'Brussels', '1000', 'Germany', true, '2026-01-07T02:20:08.988Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7a865232-109f-4f0a-adef-fef612d30e9e', '25a0822d-0faf-4457-82f6-b8434a378540', 'Thuy', 'Nguyen Ngoc', '', '', '', 'Maubisstrasse 44a', '', 'Kaarst', '41564', 'Germany', true, '2026-01-07T02:20:08.997Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('228acdcf-c856-4ed0-8910-4da578e80503', 'a9ec3471-bf73-44c3-8f11-effc0227d17c', 'Schwanthalerhöhe', 'Forum', '', '', '', 'Theresienhöhe 5', '', 'munchen', '80339', 'Spain', true, '2026-01-07T02:20:09.001Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c8ef6a6e-39dc-4420-918f-654d18fccea4', '90d5e8ed-a8a9-4b11-ba61-028dbe983eb0', '61577235651165', '61577235651165', '', '', '773199956', 'sportovní 594/21', '', 'le thi Duong sdt', '61200', 'Germany', true, '2026-01-07T02:20:09.020Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('547e46c4-6017-45e7-b10b-6a7a13a81bd4', '70368810-e07a-4ef1-99a9-5101930f1011', 'Hai', 'Giang Thi', '', '', '', 'Marktplatz 9', '', 'Baunatal', '34225', 'Austria', true, '2026-01-07T02:20:09.037Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('39f89c56-2761-4c9d-bb23-993547762618', '28a23fbb-6203-43f2-85c4-6cffcdb60a1d', 'Thi', 'Hoa Vu', '', '', '', 'Gutenbergstraße 15', '', 'Krefeld', '47803', 'Germany', true, '2026-01-07T02:20:09.040Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0a958fa5-c6e9-43c6-aaaa-419981e9ad9c', '70de6916-169f-47cf-bbe1-7c18d71adb78', 'huy', 'hoang Nguyen', '', '', '', 'Eisenbahn str 13', '', 'Homburg', '66424', 'Germany', true, '2026-01-07T02:20:09.059Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('32d5d688-cd62-498e-a0bf-69aed5133835', '2a22de6e-2b3d-4b7a-a646-db0bdf23edd0', '31.', 'Theresienplatz', '', '', '', 'Theresienplatz 31', '', 'straubing', '94315', 'Austria', true, '2026-01-07T02:20:09.061Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8041a9a4-c46a-4c4d-aeef-aba73fd5a26e', '2c92c4a9-3629-43fc-b653-96dcb1899017', '100005534057144', '100005534057144', '', '', '', 'Star Nails -Stern Straße 81', '', 'Bonn', '53111', 'Germany', true, '2026-01-07T02:20:09.071Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e91be3ad-2140-4080-8dff-feed63ee4d26', '1373dfda-7657-4b3d-b8f3-6a7f1f815b08', 'LINH', 'NGUYEN. THUY', '', '', '015167789719', 'Marktplatz 10', '', 'Hechingen', '72379', 'Austria', true, '2026-01-07T02:20:09.081Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ac7d54b8-8043-4074-9eb4-3a4e9cdd22e5', '01d3518f-b416-44d4-9e19-72a76a6d7eff', 'Hoang', 'Thi Ngan', '', '', '', 'Carrer de Comte Borrell 59', '', 'Barcelona', '08015', 'Germany', true, '2026-01-07T02:20:09.235Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('26803e28-468b-4d3d-b61a-6939ac5e728c', '6a410442-4942-404c-8e2c-62b86137a673', 'thi', 'hao Nguyen', '', 'Haonguyenthi01@gmail.com', '015901011960', 'Nguyen thi hao; B gửi về đc: ; Forstweg3, 07745 Jena; 015901011960; Haonguyenthi01@gmail.com', '', 'Jena', '07745', 'Germany', true, '2026-01-07T02:20:09.295Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d10f4746-4459-4c17-ada6-8c42e4eaaf29', '638d3057-72c5-4d9c-bf71-95f7d163cca5', 'thi', 'lien Nghiem', '', '', '', 'Nghiem thi lien; Beauty nails; Dürener str.200; 50931 köln', '', 'köln', '50931', 'Germany', true, '2026-01-07T02:20:09.304Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('02a116ab-6106-4183-b9b8-7930d567c0a4', '82c3e0b1-1569-4b31-b5db-3ddc0a195ad7', 'mỹ', 'linh Tô', '', '', '89073', 'Dreiköniggasse 17', '', '- Ulm', '89073', 'Germany', true, '2026-01-07T02:20:09.417Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0ac6a819-323d-4219-8d8d-b67240ddd3b2', '31b944d4-bc88-42aa-9477-ffbddd6d1da4', 'Trang', 'Nguyen Thi', '', '', '', 'Friedrich-Ebert-Straße 74', '', 'Dinslaken', '46535', 'Germany', true, '2026-01-07T02:20:09.310Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2adc5357-8e3d-4f7d-9762-e18cf2192071', 'f2947d02-8201-4096-8f15-a0bcb13f88f0', '18', 'Rudi-Dutschke-Straße', '', '', '', 'Rudi-Dutschke-Straße 18', '', 'berlin', '10969', 'Germany', true, '2026-01-07T02:20:09.323Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('689675c4-68c4-412a-80cd-3c8f26ba3b76', '29098765-dbcf-4af1-9f1b-0c6d323951de', 'Quynh', 'Trang Phan', '', '', '', 'Heinestr 7', '', 'Neustadt an der Weinstraße', '67433', 'Germany', true, '2026-01-07T02:20:09.325Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fd9eb79b-0305-4291-b488-21f0cacb1e5b', '3dc55878-1fc7-411f-9ae6-2a81a492cad5', 'Vượng', 'Thường', '', '', '', 'Heggerstraße 53', '', 'Hattingen', '45525', 'Austria', true, '2026-01-07T02:20:09.340Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('92f2acaf-802a-4090-afb1-fd3788963345', '72913675-02ee-45c5-8800-b2928ab93695', 'về', 'Gửi', '', '', '', 'Gửi về ; Quốc Anh Vu; N1-Nails; N1 1; 68161 Mannheim', '', 'Mannheim', '68161', 'Germany', true, '2026-01-07T02:20:09.371Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ca33ec32-49fa-438c-83c0-7072f3bfe00a', '5d80ca3f-eb2e-49c3-a02d-0d08371605e2', 'Doãn', 'thủy Vo', '', '', '', 'Hans-Sachs-Gasse 9', '', 'Nürnberg', '90403', 'Germany', true, '2026-01-07T02:20:09.389Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1b387eee-7d18-4527-a277-109862811986', 'fc4b8d0e-b690-42a4-9e5a-5b21d66e3365', 'le', 'Hanna', '', '', '774338040', 'decká 77', '', 'Třinec', '73961', 'Czech Republic', true, '2026-01-07T02:20:09.392Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b18be1e4-ecf4-435d-a53e-ea652e4dd279', 'a60f8ebc-03e2-46f7-a0a0-6714457f6442', 'Schumacher-Str.22', 'Kurt', '', '', '', 'Kurt Schumacher-Str.22; 30159 Hannover; Cong Hung Nguyen nha a', '', 'Hannover', '30159', 'Germany', true, '2026-01-07T02:20:09.410Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('37532770-9630-4127-977d-1b4cae0cc866', '915ce806-d086-422f-a00d-a5cfe222fb24', 'nguyen.viet.71653318', 'nguyen.viet.71653318', '', '', '', 'Friedberger str 106', '', 'Augsburg Hochzoll', '86163', 'Spain', true, '2026-01-07T02:20:09.412Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('207b2951-d5ab-419d-8b78-ef72d3f208b9', 'f8159270-3c1b-4e12-9228-afca9555e2c0', 'ngọc', 'long Tran', '', '', '', 'Grader weg 14', '', 'Papenburg', '26871', 'Germany', true, '2026-01-07T02:20:09.432Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2bb261f4-93c9-4884-8f6a-9d0215b96925', 'b9feb4fb-1ea4-46dd-aef8-891a58d107dc', 'Thi', 'Phuong Mai Nguyen', '', '', '', 'Am Römischen Kaiser 10', '', 'Worms', '67547', 'Germany', true, '2026-01-07T02:20:09.433Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b70e4781-7fe2-4475-8cbd-a43ce9dec141', '2d46f844-5d62-4b46-a8e1-b0f983eaf48e', 'Straße', '16 Breite', '', '', '', 'Breite Straße 16', '', 'Peine', '31224', 'Spain', true, '2026-01-07T02:20:09.438Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2c4429a1-883e-4ae2-9939-d67028e0af65', 'a323009d-97b0-4ac5-bc9a-d9014d04a22f', 'Nga', 'Tran Thi', '', 'potatisletran@gmail.com', '+46704081251', 'Kornsparvsgatan 9', '', 'Billesholm', '26772', 'Germany', true, '2026-01-07T02:20:09.441Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3c5cec0e-c730-4ca4-b14f-3fb44a116f9b', '60da22ae-2a27-46a9-a433-af83caecbef8', 'david.tran.7355079', 'david.tran.7355079', '', '', '775037212', 'Truong thi kim oanh 16a', '', 'opava', '74601', 'Czech Republic', true, '2026-01-07T02:20:09.458Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fce6f65e-ea24-4a6a-95bb-945db058e580', '8c798f0b-1d7d-415a-a214-9fb5e2d5ab8e', 'thi', 'lien Nghiem', '', '', '', 'Nghiem thi lien; Beauty nails; Dürener str.200; 50931 köln', '', 'köln', '50931', 'Germany', true, '2026-01-07T02:20:09.483Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b0c3ec9f-ebcf-454c-b101-fc7b13d0135d', 'b668681d-b8ac-4268-9527-66affe10ae0b', 'Minh', 'Dat Le', '', '', '', 'Hämeentie 23', '', 'Helsinki', '00500', 'Netherlands', true, '2026-01-07T02:20:09.512Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('72557dcc-fab2-4eeb-9a6e-abd219e10e47', '325b8716-6a1b-4dd1-805b-cc93c1995cd5', 'huy', 'hoang Nguyen', '', '', '', 'Eisenbahn str 13', '', 'Homburg', '66424', 'Germany', true, '2026-01-07T02:20:08.783Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2a010c4a-148d-41ac-98d3-48cb6a9bd24d', '8db62b1a-c71b-4f00-b4bb-bad145b6a7ae', 'Thu', 'Huong Lam', '', '', '01735805812', 'Hanauer Strasse 68', '', 'München', '80993', 'Germany', true, '2026-01-07T02:20:08.784Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0f344663-5d21-46f9-ab75-cc332c317651', 'e9ea4507-781c-484e-9b97-eb712883b61e', 'thi', 'ngân Nguyen', '', '', '101000', 'Boulevard maurice lemonnier 26', '', 'Bruxelles', '1000', 'Spain', true, '2026-01-07T02:20:08.785Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4af05f98-9029-4d24-bf97-e18c92d4ba45', '7f0f342d-6dea-4bbf-baac-f752cb92a07f', 'str', '9 insel', '', '', '', 'insel str 9', '', 'Bregenz', '6900', 'Germany', true, '2026-01-07T02:20:08.787Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3bd36896-809a-450d-8d6a-e0a08a5e1a56', 'a26b3ee4-8fac-4bb7-9cf9-25d907725cfe', 'junminhhoang', 'junminhhoang', '', '', '', 'Hagener Allee 20-24', '', 'Ahrensburg', '22926', 'Germany', true, '2026-01-07T02:20:08.796Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('99d810a3-e512-4391-a2cc-025dd6f9e529', '9ce49cb3-4906-4b91-9481-2d94f826fb8b', 'Cuong', 'Nguyen Van', '', '', '', 'Hansastr. 236', '', 'Berlin Deutschland', '13051', 'Germany', true, '2026-01-07T02:20:08.807Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('43036ec7-1830-4500-ab56-1ca92def5a5d', '26ef8177-f829-4c4b-8f41-854152c34588', 'Dinh', 'Thang Vu', '', '', '', 'Vu Dinh Thang; SennV nail Sèvres; 37 Grande Rue; 92310 Sèvres; France', '', 'Sèvres', '92310', 'Germany', true, '2026-01-07T02:20:08.821Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('55f9f527-ba5e-4c33-8efa-4411f6d06de5', '9081abfd-6864-423f-b99d-4e6ed7dd1997', 'thuyle0110', 'thuyle0110', '', '', '366111', 'Le Thi Thanh Thuy Dudweilerstraße 3', '', 'Saarbrücken', '66111', 'Germany', true, '2026-01-07T02:20:08.841Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9982f832-81d4-4daf-aa67-541f294209d6', '67b6e8c3-66fd-40f6-8434-70ede8ddbc4c', 'Thi', 'Hang Tran', '', '', '0651645675', 'Tran Thi Hang; Authentique Nails Art; 0651645675; 19 Place Darcy, 21000 Dijon; France', '', 'Dijon', '21000', 'Germany', true, '2026-01-07T02:20:08.848Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2d5c437b-bd1a-47b6-a916-d78f81b1a7e7', '915311ba-70b4-473b-abd0-57d950f951b1', 'vananh.to.1', 'vananh.to.1', '', '', '', 'Fürstenrieder Str. 59', '', 'München', '80686', 'Germany', true, '2026-01-07T02:20:08.870Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fc1f0601-b9fc-4cf1-a469-5844049eedfe', 'ad4e60bd-0e23-4be5-9bfc-29fc6c755c80', 'huy', 'hoang Nguyen', '', '', '', 'Eisenbahn str 13', '', 'Homburg', '66424', 'Germany', true, '2026-01-07T02:20:08.878Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('12ec01a1-cb61-4af2-8325-587cfc5baa93', 'cea20826-6dbf-4d99-b5b2-47b8956764e9', 'hai', 'nguyen Thế', '', '', '', 'Unterewall Straße 5', '', 'obernburg a', '63785', 'Germany', true, '2026-01-07T02:20:08.889Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('43b9ccb3-7844-4a22-8b96-043dcf1f5c0b', 'b1a91ce5-80a0-49f1-b3a0-7be30aa58a2e', 'Thi', 'Bich Ngoc Dao', '', 'nluna2k5@icloud.com', '3466424', 'Talstraße 34', '', 'Homburg', '66424', 'Netherlands', true, '2026-01-07T02:20:08.900Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a9a2637a-099e-475a-867e-7b55aa307dc2', 'd16dfae0-f221-4746-9b13-3b7f344ba5b8', 'thi', 'hong nhung Vu', '', '', '+491629571573', 'Stüdlestraße 53', '', 'weil am Rhein', '79576', 'Spain', true, '2026-01-07T02:20:08.915Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('798bf9d3-fa35-4c94-b57d-afc41f286ff5', 'cdb66d6b-064a-4b81-973e-dee219d7c947', '100090992709938', '100090992709938', '', '', '2541460', 'Kapital str. 25', '', 'Neuss', '41460', 'Germany', true, '2026-01-07T02:20:08.921Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('06a6b96e-31e5-4173-bd61-046c76d1b2af', '1fab42e2-0ba9-47ee-ab10-33468d10572c', 'datmanhlight', 'datmanhlight', '', '', '', 'Moon Nails im Kaufland Kurze-Geismar-Straße 28', '', 'Göttingen', '37073', 'Germany', true, '2026-01-07T02:20:08.942Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3f7843dd-2f00-4341-8915-1af1d236d73b', '036b697b-7690-441a-8e90-32d141578c7b', 'Phuong', 'Nhi Do Thi', '', '', '', 'Torfstraße 10', '', 'Landstuhl DE', '66849', 'Germany', true, '2026-01-07T02:20:08.945Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d924fa6c-403d-447b-92e5-30663615cffc', '79b63571-28cf-4de7-922f-80aaa2b6433e', 'Phuong', 'Thao Nguyen Thi', '', '', '015252331339', 'Kendenicher Straße 12', '', 'Hürth', '50354', 'Germany', true, '2026-01-07T02:20:08.947Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('87c9bd47-260e-45e6-bef4-046f467fb74b', 'b253d0c0-cb89-4520-b263-0b73f938e351', 'Holstenstraße', '23 Alte', '', '', '', 'Alte Holstenstraße 23', '', 'Hamburg', '21031', 'Germany', true, '2026-01-07T02:20:08.948Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0f09ee68-36d8-4902-90c1-1adf4da5f829', '4013cd3d-c1a8-400e-b861-fd6180c706ec', 'tham.my.thanh.thanh497441', 'tham.my.thanh.thanh497441', '', '', '79539', 'Am Alten Markt 4', '', 'Lörrach', '79539', 'Germany', true, '2026-01-07T02:20:08.962Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('15ee3bc4-a32f-4ef8-81e9-cbfbc1f0cc42', '51418e79-82b7-42b8-96eb-533be281e9c3', '0768411339', 'Tel:', '', '', '0768411339', 'bis rue pasteur 26000', '', 'Valence', '26000', 'Spain', true, '2026-01-07T02:20:08.965Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ded70af5-fcba-4d9a-ab8a-f0423a312b15', 'b1f1a169-9117-4200-a3ff-9beddc936321', 'QUYNH', 'ANH THI', '', '', '062148445135', 'FRIEDRICHSRING 4', '', 'MANNHEIM', '68161', 'Germany', true, '2026-01-07T02:20:08.968Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1f0f7578-d9d5-4248-bd03-4f26e2710fcf', '5f138db1-a7b1-4124-bcc9-b35baec0e1ea', 'Nguyen', 'Dung', '', '', '+358407735599', 'Mechelininkatu 12-14', '', 'Helsinki', '00100', 'Netherlands', true, '2026-01-07T02:20:08.977Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e208654c-9c81-4698-9a77-16146a1b1126', '12024aff-572f-4c9c-9530-2d0f4669d0b1', 'Trung', 'Hieu Nguyen', '', '', '', 'Nguyen Trung Hieu; Milano Nails; Danziger Str.65 , 10435 Berlin', '', 'Berlin', '10435', 'Germany', true, '2026-01-07T02:20:09.038Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('09beff52-9549-4242-961c-82e2850f8ef6', 'd57942ec-15e3-4910-b364-cead87f57bfb', 'Sơn', 'Pham Quang', '', '', '', 'Hubertusweg 17', '', 'Betzdorf', '57518', 'Germany', true, '2026-01-07T02:20:09.102Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f5cdb43c-a77e-475e-9b6f-5c5b77f8f275', 'c2ae2f4d-03f3-4e23-a429-146209134aaf', 'minh', 'hieu Nguyen', '', '', '9244629', 'Bahnhofstraße 92', '', 'Herne', '44629', 'Germany', true, '2026-01-07T02:20:09.106Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('807ad88b-edfb-403b-89a8-8386d05aec78', 'c056632b-b24c-473b-b4ab-0c7ed28e7f7a', 'thị', 'Loan Lê', '', '', '', 'Schlutuper Straße 1', '', 'Lübeck', '23566', 'Germany', true, '2026-01-07T02:20:09.128Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('550600ff-51cf-4672-931c-927d01e092b5', '2ea3e24e-4202-4764-b0f9-a3c3d6adbd71', '61578246631743', '61578246631743', '', '', '', 'Nguyen Thi Minh Thao 331', '', 'Roh bei Hartberg', '8294', 'Germany', true, '2026-01-07T02:20:09.132Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ad48c61a-197b-4967-ad2d-9be2bc461896', '44704d8d-9811-4ee7-b064-82c8f5f869ad', 'Thi', 'Giang Phung Frau', '', '', '', 'Brückenstr. 17', '', 'Frankfurt am Main', '60594', 'Germany', true, '2026-01-07T02:20:09.141Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('64827f6a-abc1-4de0-96c3-17faeb9f2aa7', 'd38ec3c6-3814-40f6-ad2c-be0ff5448310', 'braná', '25/7 Dukelská', '', '', '', 'Dukelská braná 25/7', '', 'Prostějov', '79601', 'Czech Republic', true, '2026-01-07T02:20:09.150Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7c001157-6a9f-4697-81c2-3123bf230b6f', '22e6f9dd-b6dd-4877-b04c-bd06917a6004', 'Hao', 'Nguyen Hoang', '', '', '', 'Schäfflerstraße 1', '', 'Kelheim', '93309', 'Germany', true, '2026-01-07T02:20:09.167Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('748eec3d-a598-410a-9a23-cf1f41d94e18', 'adf4219b-67c4-4df0-9393-fd8edd3107b1', 'pham.vanvan.7503', 'pham.vanvan.7503', '', '', '817001', 'carrer Santa Clara 8-17001', '', 'Girona', '17001', 'Germany', true, '2026-01-07T02:20:09.169Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('29a4f3dd-5af7-44e6-a559-78d957929001', '380a0fe8-6cfa-43be-aff7-18b64fd6494e', '/', '017620246206 UyenLam', '', '', '017620246206', 'Hans-Bredow-Straße 19', '', 'bremen', '29307', 'Netherlands', true, '2026-01-07T02:20:09.181Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bcb11c93-7505-48d4-a5a4-0b0d6674088d', '2e1fbdbf-cc5e-446c-970d-b599b82fdbb1', '100005639853742', '100005639853742', '', '', '', 'Münsterstr 15', '', 'Rheine', '48431', 'Germany', true, '2026-01-07T02:20:09.190Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('04ff6b57-eb48-4a76-b3b3-5a5a01abe475', 'dbdb9665-ac3b-4062-aee4-1f4736fa5b58', 'bao.tran.7545', 'bao.tran.7545', '', '', '', 'namesti republiky 203/29', '', 'plzen', '30100', 'Spain', true, '2026-01-07T02:20:09.018Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fcf1b1b3-ec55-49e7-a469-a0fab2a7511e', '1f754b4e-0b3f-4dd9-8df6-8368e1050c0c', 'Quynh', 'Trang Phan', '', '', '', 'Heinestr 7', '', 'Neustadt an der Weinstraße', '67433', 'Germany', true, '2026-01-07T02:20:09.027Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bcdd7a34-4e46-425a-a117-09e6c26bde2f', '8aaf77cc-21e4-4399-9849-d578ed10d75a', 'Viet', 'Thang Nguyen Ba', '', '', '', 'Oberer-Thor-Platz 3', '', 'Straubing', '94315', 'Austria', true, '2026-01-07T02:20:09.039Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('77d31e7d-48d0-4e0a-9f59-6cd59d327e56', '2150069c-9284-4b57-95b2-cc898528f608', 'Nguyen', 'Hang', '', '', '', 'Lange Str. 19', '', 'BAD SALZUFLEN', '32105', 'Germany', true, '2026-01-07T02:20:09.058Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1f244fdd-860e-4129-8c2c-6c874a98f9df', '24fb7a10-9ad2-465a-8a09-aa67114fbe17', 'Thi', 'Hong Nguyen', '', '', '01603208050', 'Höfatsstraße 46', '', 'Augsburg', '86163', 'Germany', true, '2026-01-07T02:20:09.108Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ac8196b2-96cb-4434-b93f-2c7f25e29994', '24809027-4eed-416d-9020-1e54d82eddc2', 'Thi', 'Thu Hien Le', '', '', '', 'Rue du Commerce 34', '', 'Andenne', '5300', 'Germany', true, '2026-01-07T02:20:09.193Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('77ffa9e5-5c21-4559-a7f2-ba0335991a24', '7fc714e6-18dc-42d4-ae8e-7bb2a20bd2ea', 'Thu', 'Huong Tran', '', '', '', 'Spiegel str 11', '', 'würzburg', '97070', 'Germany', true, '2026-01-07T02:20:09.229Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d9a597eb-25a9-48e1-a9d0-ad962f519bbd', '41081494-dddb-493a-8f05-fd0f80f5f206', 'Thi', 'Thao Nguyen', '', '', '', 'Beethovenstrasse 2', '', 'Wendel', '66606', 'Germany', true, '2026-01-07T02:20:09.253Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5576dbac-dbc4-40c3-87dc-798b021ce6f8', 'ea0ef87e-f323-449c-b794-452355d0a96d', 'tran', 'Antonio', '', '', '322523', 'Holsteiner Chaussee 3', '', 'Hamburg', '22523', 'Germany', true, '2026-01-07T02:20:09.261Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c77f6b05-6f39-4144-a424-10c22cfdf86b', '8fea2116-a382-4f63-aa31-d0d53de7c6fc', '100095060169950', '100095060169950', '', '', '', 'Salomonsgasse Nr 8', '', 'köln Germany', '50667', 'Germany', true, '2026-01-07T02:20:09.264Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0a1725f0-60bd-41cc-afbd-bfd68fbcef57', 'bfeae20b-3258-498c-9713-28946bdac9b7', 'Thi', 'Mai Huong Dao', '', '', '1412454', 'Stenkvistavägen 14', '', 'Bandhagen Stockholm Sweden', '12454', 'Germany', true, '2026-01-07T02:20:09.270Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d4faea25-521f-4fd4-8a60-5a3486db67a1', 'e127af98-5b8d-473c-a589-b91fac644e70', 'romrom.kute', 'romrom.kute', '', '', '590762', 'Thenailsloft Tien Anh Nguyen Schwabacher Straße 5', '', 'Fürth', '90762', 'Germany', true, '2026-01-07T02:20:09.273Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f0f450cd-534e-44a5-8b02-924c3ab76768', 'c7afbc11-3bd1-4b12-b1e8-631e36cb7b10', 'miu.kin.37', 'miu.kin.37', '', '', '2933561', 'sova 29', '', 'Sapa', '33561', 'Germany', true, '2026-01-07T02:20:09.280Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('efc8f7cf-f5b0-4a24-b3cb-00a07f38839a', 'ce6a79e5-f3a6-40e3-b9b6-f30b515ccfc6', 'My', 'Le Ha', '', '', '', 'Max-Pommer-Str. 4', '', 'Leipzig', '04317', 'Spain', true, '2026-01-07T02:20:09.290Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5183209c-f2bc-4f38-8306-0c19776ec7b6', '58516666-f5bd-4f24-ae59-faab356d1a9f', 'Vinh', 'Tran Van', '', '', '', 'Wasserkrüger Weg 4', '', 'Mölln', '23879', 'Germany', true, '2026-01-07T02:20:09.316Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ada6c1fc-ef76-4629-9b0c-0fad292fab35', '10f875ec-8af2-4960-b110-5723d14da87d', 'Chau', 'Le Thuy', '', '', '', 'Peterstraße 38', '', 'Kempen', '47906', 'Germany', true, '2026-01-07T02:20:09.319Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5a187aa2-30eb-44e0-ac9c-639b271f9984', '46be9ac0-0d30-4316-8d9f-7d8121b24e73', 'ngo', 'Trang', '', '', '', 'avenue du général de gaulle 94700', '', 'maisons Alfort', '94700', 'Germany', true, '2026-01-07T02:20:09.336Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a734b6b6-e628-41cd-a151-9776ea3605e6', '55310bfc-69e4-4a87-92c2-08b64d7ee1eb', 'thị', 'thu hiền Trần', '', '', '00420774177592', 'Vilemovská 230', '', 'Dolní Poustevna', '40782', 'Germany', true, '2026-01-07T02:20:09.346Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3b33a2aa-1f18-43e1-9bd7-22ab4afd6e30', '5ea5c2cd-0472-479a-8aab-3d4ae0673d52', 'Junygermany', 'Junygermany', '', '', '6880993', 'Dc Beauty&more im Olympia Eikaufcenter Hanauer str68 80993 München', '', 'München', '80993', 'Germany', true, '2026-01-07T02:20:09.351Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('80633a9a-9f43-4183-aff7-777ccaf19de8', '27571d5a-525a-4e84-b9cb-1ae7b3465d09', 'thi', 'Nhung Nguyen', '', '', '773969821', 'Vilemovska 242', '', 'Dolni poustevna', '40782', 'Germany', true, '2026-01-07T02:20:09.359Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c95bc2ab-bd75-4b24-9da8-6de7d726a291', '8f1d6e66-d4f0-4614-8324-2dce619473cb', '100054812859191', '100054812859191', '', '', '1355746', 'Nagelstudio venis Nauils Globus Idar- Oberstein Zwischen wasser 13', '', 'Idar- oberstein', '55746', 'Germany', true, '2026-01-07T02:20:09.360Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4fc3c172-4d51-4e70-b1d2-92165dfc987f', '1f870adb-74c1-4ec0-9845-d7c059afa546', '2', 'Südring', '', '', '67240', 'Südring 2', '', 'Bobenheim-Roxheim', '67240', 'Germany', true, '2026-01-07T02:20:09.373Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('240ca940-1c2d-4106-99d7-3e9c95954659', '9e9abed9-361f-42db-8252-22525f1f6906', '10,', '74072 Heilbronn Kilianstraße', '', '', '', 'Kilianstraße 10', '', 'Heilbronn', '74072', 'Germany', true, '2026-01-07T02:20:09.389Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ee1c1855-94bf-46e2-8ebd-e0808e75a576', 'fc771cf8-7aa7-4efc-b3e7-1a0d2b74657d', 'Dang', 'Anh', '', '', '01743602424', 'Schulstrasse 2', '', 'Kaiserslautern', '67655', 'Germany', true, '2026-01-07T02:20:09.392Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cda3178d-22c9-46ad-b325-818ffae617b7', 'b327e7a7-4f0d-42fd-8ba9-6e1ef34b11d3', 'Skyline', 'New', '', '', '', 'Markt 10', '', 'Altenburg', '04600', 'Germany', true, '2026-01-07T02:20:09.397Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f01e9af2-0ea7-46ce-ae0d-fda2c65db74b', '42a0c011-cfe3-4026-b958-62bd24ae12be', 'weamjhf', 'weamjhf', '', '', '', 'Nami nail Top 64', '', 'Wien', '1220', 'Austria', true, '2026-01-07T02:20:09.410Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('afd514f4-0f3a-45c1-b549-5ff8697835a0', 'b763cde5-1ffd-4785-9013-8e31af01b38d', '1', 'Đơn', '', '', '', 'n 1', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1c208c41-9d20-43a7-8577-139f1441c8ab', 'fb3892ae-9c56-4ddd-aff7-55423b180fb5', '-Freital', '01705', '', '', '01705', 'An der Spinnerei 8', '', '-Freital', '01705', 'Germany', true, '2026-01-07T02:20:09.432Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a32c79b5-bf27-4f68-a304-dc6b9572497e', '6d2363e7-6f86-4873-a519-0fe00478014d', 'mai', 'lan anh Hoang', '', '', '', 'Rathausgasse 48', '', 'Freiburg', '79098', 'Austria', true, '2026-01-07T02:20:09.452Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('30c2107b-0fbc-4de8-b069-ed9fa7253d8d', '1e2a6df5-cfee-49cf-ae58-9e848db08703', 'dinh', 'tao Nguyen', '', '', '', 'Mühltor 8', '', 'ilmenau', '98693', 'Germany', true, '2026-01-07T02:20:09.461Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('18de8ec9-276d-4e4a-9e2b-51f245dbedc6', 'c90fc571-0994-463b-9454-4b297d7769a7', 'Thanh', 'Mai Van Thi', '', '', '', 'St.-Georgen-Straße 18', '', 'Alzey', '55232', 'Germany', true, '2026-01-07T02:20:09.510Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('67a5d09e-f08e-426e-b0c4-85e2e55fc6b6', 'b4f4618f-8b73-4474-a61c-d66612251b2c', '1-3', '65428 Rüsselsheim Mainstraße', '', '', '1365428', 'Mainstraße 1-3', '', 'Rüsselsheim', '65428', 'Spain', true, '2026-01-07T02:20:09.520Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('68b193bd-3538-4284-8475-8e1bdc36bcb4', '3ea9d8e8-c2a2-4ece-ac04-a477c8f270bb', 'Thi', 'Ngoc Oanh Nguyen', '', '', '', 'Alt-Eschersheim 17', '', 'Frankfurt am Main', '60433', 'Germany', true, '2026-01-07T02:20:09.522Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('81eb1ca6-9af6-45c5-aabc-26a774d19ae2', '6123417d-d188-4417-9cff-fb0b0cf5d62f', 'Duy Lam', 'Van', 'Pro Nails', '', '', 'Dragounská', '2545/9A', 'Cheb', '35002', 'Czech Republic', true, '2026-01-11T14:14:00.739Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c36cd038-7b78-480e-a568-8ab9252d1e96', '8c09a775-62ba-4b79-acf5-4db3ac1e678e', 'Anh Trung', 'Le', '', 'davienails999@gmail.com', '+420792399116', 'V Kasárnách 1019', '', 'Kolín 2', '28002', 'Czech Republic', true, '2026-01-20T09:47:50.207Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('756e67c3-e775-4733-9f17-837c0773f3a3', '7eee95ba-c32d-4e85-9c48-7aef75a99ec2', 'pham', 'Ngoc', '', 'davienails999@gmail.com', '+420775075586', 'Lidická 854/35', '', 'Plzeň 23', '32300', 'Czech Republic', true, '2026-01-20T09:47:50.661Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f5e50a9c-259b-4155-b0ae-f9ad8b0f098a', '90cfb881-bcd6-4d90-8906-6baf29aa6261', 'Thi Nguyet', 'Cao', '', 'davienails999@gmail.com', '+420773289767', 'náměstí T. G. Masaryka 2392/17', '', 'Břeclav 2', '69002', 'Czech Republic', true, '2026-01-20T09:47:51.451Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('15f48481-7381-461e-96e1-70a5107bbeb5', '1d24a094-758e-4b81-8f18-15e0bc3ab1f8', 'địa chỉ', 'Ship', '', 'davie.lam01@gmail.com', '+420775424812', 'náměstí Svobody 3316', '', 'Teplice 1', '41501', 'Czech Republic', true, '2026-01-20T09:47:51.899Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dd33927c-3f04-4535-975c-47c5a55c8dc3', '1c2b621b-8e98-4b80-9796-d54068ff6873', 'Tuan', 'Luu', '', 'davienails999@gmail.com', '+420728999444', 'Kpt. Jaroše 375/31', '', 'Karlovy Vary 6', '36006', 'Czech Republic', true, '2026-01-20T09:47:52.352Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7a42327e-91f2-4922-8fa4-0d9bb323dbfe', 'cdb092aa-e15b-41c5-9f99-a3e46fbb200c', 'Le Tran', 'Ngoc', '', 'davienails999@gmail.com', '+420775052169', 'Bubeníčkova 4405/1', '', 'Brno - Židenice', '61500', 'Czech Republic', true, '2026-01-20T09:47:52.801Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('22c70040-6491-44a3-80c1-188a3daccef1', '973e4bbb-afb7-4911-bf09-0e2fb6f1d61e', '1141 50601 Jicin', 'Hradecka', '', 'davienails999@gmail.com', '+420770679862', 'Hradecká 1141', '', 'Jičín 1', '50601', 'Czech Republic', true, '2026-01-20T09:47:53.587Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d4b5f253-5b71-4753-a598-969091278aa8', 'f53c358b-3323-4ff5-a227-1076ca2e3e44', 'Anh Nguyen', 'Nhat', '', 'davienails999@gmail.com', '+420775905199', 'Selbská 1204/9', '', 'Aš 1', '35201', 'Czech Republic', true, '2026-01-20T09:47:54.037Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bbe31251-ec77-4501-a729-998902132e1a', '002c9d90-00fe-4c08-b9ea-7fcff85daaa3', 'dao.loan.9', '', 'Dao Thi Loan ( vicky nails)', 'davienails999@gmail.com', '+420776438999', 'Italská 2416', '', 'Kladno 1', '27201', 'Czech Republic', true, '2026-01-20T09:47:54.490Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9e12101a-198d-4c60-a8ba-02f1bd349c26', '4698280e-4083-48cd-b830-be815d58f3f5', 'Dang Hoang', 'Pham', '', 'davienails999@gmail.com', '+420775626683', 'Ječná 548/7', '', 'Praha 2 - Nové Město', '12000', 'Czech Republic', true, '2026-01-20T09:47:55.278Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dc28af2f-2125-444c-9994-ec977edb4f45', 'eea67f41-80b5-4e32-8614-588fa3b27c3f', 'Minh Thu', 'Bui', '', 'davienails999@gmail.com', '+420776446669', 'Michelská 1594/9', '', 'Praha - Michle', '14000', 'Czech Republic', true, '2026-01-20T09:47:55.732Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e3825694-a8eb-45ad-87ec-c2c3c7883e2e', '957c5706-715d-44ca-b944-a24958a2d1c9', '283/87 ostrava', 'Horní', 'Nail salon', 'davienails999@gmail.com', '+420775998999', 'Horní 1471/57', '', 'Ostrava - Hrabůvka', '70030', 'Czech Republic', true, '2026-01-20T09:47:56.527Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cf2404b7-fd36-491b-a87d-36237c882252', '8f141608-15e2-4bdb-b10d-079a4d825b9a', 'van anh academy', 'Nguyễn', '', 'davienails999@gmail.com', '+420773001999', 'Libušská 400/115', '', 'Praha 4 - Písnice', '14200', 'Czech Republic', true, '2026-01-20T09:47:56.974Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d13fd175-9e3b-451f-bdac-ac99f5d9163a', 'bd53bd0d-8606-410d-a533-0391a35bee9e', 'thị trúc', 'Nguyễn', '', 'davienails999@gmail.com', '+420775466888', 'Pařížská 996/8', '', 'Ústí nad Labem-centrum', '40001', 'Czech Republic', true, '2026-01-20T09:47:57.766Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b41abc22-1fee-423b-9861-01177c0cf731', '62e17e3a-f9de-4794-bce8-7426f3db2847', '1753/12', 'Opatovska', '', 'davienails999@gmail.com', '+420792769686', 'Opatovská 1753/12', '', 'Praha 4 - Chodov', '14900', 'Czech Republic', true, '2026-01-20T09:47:58.548Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eb39780f-110a-4951-af94-e4f6e6718a2a', 'c2d34984-f6eb-46a9-8871-4abbadb54f69', 'xuan duong', 'Pham', '', 'davienails999@gmail.com', '+420792397156', 'Svatá Kateřina 108', '', 'Rozvadov - Svatá Kateřina', '34806', 'Czech Republic', true, '2026-01-20T09:47:59.329Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3d7df6a1-d97b-4377-b300-0550bb69f927', 'a885304c-62ad-43c8-afaa-7046c741b5a8', '1168/13, Karlovy Vary', 'Varšavská', 'Beaulounge', 'davienails999@gmail.com', '+420606145840', 'Varšavská 1168/13', '', 'Karlovy Vary', '36001', 'Czech Republic', true, '2026-01-20T09:47:59.776Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0e645292-8f10-4918-8041-d152b3628985', 'f9bbee5c-6725-4ffa-9878-ff2ad3180df1', 'OC Olympia Teplice)', '(v', 'Blue Hearts NAIL SPA', 'davienails999@gmail.com', '+420775323838', 'Srbická 464', '', 'Teplice 10', '41510', 'Czech Republic', true, '2026-01-20T09:48:00.226Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f371f552-58d5-4c92-9c89-e202dd29ed62', '0a4c2f64-a762-4a17-a899-6ddac5390857', 'Michalská 188/9', 'Velká', 'CINDY NAILS', 'davienails999@gmail.com', '+420778099295', 'Velká Michalská 188/9', '', 'Znojmo', '66902', 'Czech Republic', true, '2026-01-20T09:48:01.341Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a4a8ca62-4005-4ee3-b210-bc639e269ba6', '144078a4-dc26-40b6-93c1-6ce9007b4c1e', '100038223094343', '', '', 'davie.lam01@gmail.com', '+420778029266', '9. května 2046', '', 'Litvínov', '43601', 'Czech Republic', true, '2026-01-20T09:48:02.457Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2200810b-0a1e-4bc2-bfeb-fdb6ef7bc68f', '4b1ef24a-ba63-45f4-aad9-61ae8c0538df', '286', 'Vilemovska', '', 'davienails999@gmail.com', '+420774129999', 'Vilémovská 286', '', 'Dolní Poustevna', '40782', 'Czech Republic', true, '2026-01-20T09:48:03.245Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('96812f62-0ff2-48c4-820b-5f13d2b0b970', 'f3d5bdf5-a893-4d10-85ed-4fd7493486fb', 'BONDY CENTRUM', 'OC', 'DELUXE SPA', 'davienails999@gmail.com', '+420777050891', 'tř. Václava Klementa 1459', '', 'Mladá Boleslav 1', '29301', 'Czech Republic', true, '2026-01-20T09:48:03.695Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d3a8d852-fc77-4802-832e-52f930ea455a', 'deba2f69-a528-485a-93f2-9b245799bc6b', 'Quyet', 'Thien', 'Phạm hồng thiên,EuroNAILS  ,oc Bondy,tr.vaclava klementa 1459,MLada Boleslav', 'davienails999@gmail.com', '+420777431187', 'tř. Václava Klementa 1459', '', 'Mladá Boleslav II', '29301', 'Czech Republic', true, '2026-01-20T09:48:04.144Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('132e1410-bf91-4dff-b0c3-a7a300024aeb', 'f55351f0-e3b9-4a52-8509-ece1bbc3c2e9', 'minh nhat', 'Tran', '', 'davienails999@gmail.com', '+420776330441', 'Alžbětín 49', '', 'Železná Ruda - Alžbětín', '34004', 'Czech Republic', true, '2026-01-20T09:48:04.594Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e70c9c98-6064-4a6f-85fc-d35cee28964b', 'b07fc498-f50d-428f-9681-02db74ae3c20', 'Quoc Lich', 'Tran', '', 'davienails999@gmail.com', '', 'Tumringer Straße 215', '', 'Lörrach', '79539', 'Germany', true, '2026-01-20T09:48:05.071Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('381ad009-5697-4991-af20-d265789b74eb', '56eecb06-99a6-43e5-8f3e-d13cbbd8e445', 'dinh An', 'Hoang', '', 'davienails999@gmail.com', '+420775456789', 'Havířská 352/17', '', 'Ústí nad Labem 10', '40010', 'Czech Republic', true, '2026-01-20T09:48:05.522Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('113ca030-89d1-4aaa-90c3-f1a309648392', 'e57e966f-4eb2-4ab9-9fd8-acad468b76c2', 'Thi Hoa', 'nguyen', '', '', '773558748', 'wilsonova 312', '', '', '53901', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0704e8ec-b0a1-46e2-8a78-d322c5142c87', 'c909bf3b-7d4d-45a8-8589-1ac123d6f824', 'Đăng', 'Tuyết Nhi', '', 'davienails999@gmail.com', '+420792555893', 'třída Čsl. legií 269', '', 'České Velenice', '37810', 'Czech Republic', true, '2026-01-20T09:48:05.977Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b45866de-f6c9-4146-b6f3-d6680c9a885a', '66c6cdd5-9215-4757-9a9f-59cfbec3bd63', 'Thi Tho', 'Nguyen', 'Euro nail', 'davienails999@gmail.com', '+420606888764', 'Masarykova 403/14', '', 'Brno-město', '60200', 'Czech Republic', true, '2026-01-20T09:48:06.789Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4c3e3884-f848-47b9-bd45-0ed19816d70b', 'f76861d5-e259-41d7-a810-3322665fac4a', '2415', 'Italská', 'Elly Nails', 'davienails999@gmail.com', '+420774399399', 'Italská 2415', '', 'Kladno - Kročehlavy', '27201', 'Czech Republic', true, '2026-01-20T09:48:07.246Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ad6da1da-0b33-4031-876b-ebc4db448151', 'a0368bc6-cdff-4645-b368-fec45dd4faff', '931/40b', 'Kolbenova', 'Lucie Nguyen Beauty', '', '919000', 'Kolbenova 931/40', '', '', '', 'Česko', true, '2026-01-20T09:49:06.702Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('95f581de-a89d-4918-821a-1828177b181d', '23a29d67-2615-4137-82d9-c18c70f0ca2f', 'xuyen.ha.5437', '', 'Nguyễn thị xuyên Hrncirska 53/18,40001,Ustí nad labem 774666879 (ely nails)', 'davienails999@gmail.com', '+420774666879', 'Hrnčířská 53/18', '', 'Ústí nad Labem 1', '40001', 'Czech Republic', true, '2026-01-20T09:48:07.697Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e43dec7c-1848-400e-90c8-77bb0e9da0ce', 'bd6c7a74-e8e5-4cdc-8fbd-be8764e20f96', 'Thi QuynhTrang', 'Nguyen', '', 'davienails999@gmail.com', '+420792573169', 'tř. Václava Klementa 1459', '', 'Mladá Boleslav 1', '29301', 'Czech Republic', true, '2026-01-20T09:48:08.501Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('166faefd-c994-4c05-91af-df8f2b942ad5', '54315212-0d01-4003-be6a-c4b3bada3039', '246 868', '608', '', 'davienails999@gmail.com', '+420608246868', 'Verdunská 720/33', '', 'Praha - Bubeneč', '16000', 'Czech Republic', true, '2026-01-20T09:48:08.950Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a0233e09-2cf9-443b-9267-1cbada631cb4', 'b107c677-b123-4fee-8168-dab37014ec72', 'Thanh Hoang', 'Phuc', '', 'davie.lam01@gmail.com', '+420777050891', 'Tř. Václava Klementa 1459', '', 'Mladá Boleslav', '29301', 'Czech Republic', true, '2026-01-20T09:48:09.398Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('543ea459-5339-4ea7-9400-ed49cd56f84e', '7f356135-386b-45e0-90ac-2b5f3c4b4d4a', '732 897 622', '+42', 'EVA Beauty Nails', 'davienails999@gmail.com', '+420732897622', 'Smetanovo náměstí 25', '', 'Litomyšl', '57001', 'Czech Republic', true, '2026-01-20T09:48:09.852Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c889c105-7db7-4b4c-849b-15e061b7ca24', '66138c53-b0c3-4356-80a5-e3a25257e56d', '319/126', 'Libušská', '', 'davienails999@gmail.com', '+420778071085', 'Libušská 319/126', '', 'Praha 4 - Písnice', '14200', 'Czech Republic', true, '2026-01-20T09:48:10.979Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b10e0933-7b00-4eee-a197-95b5503873bb', 'f8399ea3-0e49-4beb-80cf-e5d442b91781', 'Huyen', 'Minhmy', 'Nguyen thi Huyen- halong studio — Lísková 8-Nemanice-344 01- domažlice- 737122468', 'davienails999@gmail.com', '+420737122468', 'Lísková 8', '', 'Nemanice - Lísková', '34401', 'Czech Republic', true, '2026-01-20T09:48:11.428Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('54b88df2-103c-4b08-be08-63ae1fe4aecd', '38510f99-d5f1-429a-971f-43a4812b7343', 'Art', 'Passion', '', 'davienails999@gmail.com', '+420774906586', 'U dálnice 777', '', 'Modřice', '66442', 'Czech Republic', true, '2026-01-20T09:48:11.881Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ab50a8dd-54a8-40d8-85e8-d8cf72e812df', 'cefac772-a90e-476a-8b4a-03d3bfb8a8c6', '757/6', 'Arkalycká', 'Melody Beauty Nail (Naproti Galaxie Cinema)', 'davienails999@gmail.com', '+420608778303', 'Arkalycká 757/6', '', 'Praha 4 - Háje', '14900', 'Czech Republic', true, '2026-01-20T09:48:12.332Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('106f52d9-f603-4ba7-a5bd-fe2ad204498f', '4b74f885-61fe-48c7-a699-f676e557ffd3', 'dac sy', 'Ngo', '', 'davienails999@gmail.com', '+420774530990', 'Masarykovo náměstí 35/34', '', 'Boskovice', '68001', 'Czech Republic', true, '2026-01-20T09:48:12.782Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c5f8a710-9464-4603-9172-99c71a20a062', '060b5235-0bb9-4256-8b2c-795c7513dc7f', 'podlaží', '-1', '', 'davienails999@gmail.com', '+420774263015', 'U Fortny 49/10', '', 'Opava 1', '74601', 'Czech Republic', true, '2026-01-20T09:48:13.572Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7f9d4d19-7640-423b-9e23-f0300bfb2a5d', '8e936d9e-f6d4-4e8d-aaf8-b299d1b68cfc', 'Ha', 'Van', '', 'davienails999@gmail.com', '+420773281763', 'třída Čsl. legií 329', '', 'České Velenice', '37810', 'Czech Republic', true, '2026-01-20T09:48:14.021Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4442313c-19b9-4890-a487-81bb8bd25f95', 'd57f41c6-c600-4630-a6b0-a503c16bc6bd', 'BCN SL', 'Verose', '', 'davienails999@gmail.com', '', 'Carrer Progrés 40', '', 'l''Hospitalet de Llobregat', '08904', 'ES', true, '2026-01-20T09:48:14.820Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('88e35f6d-c353-4dd4-a1e3-7d4083b4c1cd', 'dc8d1a85-ba96-4271-9eff-b30ec66f14b0', 'Thi Thuy Ngan', 'Bui', '', 'davienails999@gmail.com', '+420776817477', 'plukovníka Mráze 1182/24', '', 'Praha - Hostivař', '10200', 'Czech Republic', true, '2026-01-20T09:48:15.947Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9d25ab45-e311-4690-99fb-4685e0532bd3', '8954e19a-03d0-4e1c-8e3b-e14c666982e0', '979/9', 'Nádražní', '', 'davienails999@gmail.com', '+420774050664', 'Nádražní 979/9', '', 'Mikulov', '69201', 'Czech Republic', true, '2026-01-20T09:48:16.732Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0db175cb-59d2-4699-b5b8-6601131cc229', 'ab43c57d-d55e-4f9c-ab0e-c8997643f8ee', 'Hiền', 'Cao', '', 'davienails999@gmail.com', '+420777647194', 'Brněnská 2937/21', '', 'Znojmo', '66902', 'Czech Republic', true, '2026-01-20T09:48:17.187Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9c1915d8-ec8e-4e14-ac5c-0ac2d5a89a12', 'ae0bf23d-e75d-4fe0-a3fa-716adb24ea43', 'Thị Hồng Nhung', 'Nguyễn', '', 'davienails999@gmail.com', '+421944497273', 'Za Váhom 1', '', 'Hlohovec', '920 01', 'SK', true, '2026-01-20T09:48:17.634Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8956c7ea-76f3-47d8-908b-f18d2dfe50fb', '2f323485-8489-4f8b-9763-6a6a9d2d4e90', 'Phong Do', 'Lap', '', 'davienails999@gmail.com', '+420775685678', 'Pražská 99', '', 'Kolín', '28002', 'Czech Republic', true, '2026-01-20T09:48:18.418Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ff324fce-c04f-41b3-9ad8-a0aa40578d27', '08cac662-6dfd-4843-8bdd-4bdb6c69cb52', 'Xuan Loc', 'Hoang', '', 'davienails999@gmail.com', '+420774567547', 'Hradecká 1265', '', 'Holice', '53401', 'Czech Republic', true, '2026-01-20T09:48:18.878Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('976de7da-2f8b-4bee-a086-878b0159dc2d', 'ec4d1fb7-d722-4e66-bc49-8e800f0157c5', 'Vũ', 'Mùi', 'Vũ Thị Mùi.  Lenails,  Kaufland Bubeničkova 4405/1, 61500 Brno - Židenice.', 'davienails999@gmail.com', '+420775274470', 'Bubeníčkova 4405/1', '', 'Brno - Židenice', '61500', 'Czech Republic', true, '2026-01-20T09:48:20.000Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('49edbd3e-f7ac-44fc-a047-786494ae4879', 'ae224e50-652b-4668-ad72-3ec668e13d60', 'Bao Anh', 'Nguyen', '', 'davienails999@gmail.com', '+420776731120', 'Horní Folmava 86', '', 'Česká Kubice', '34532', 'Czech Republic', true, '2026-01-20T09:48:21.800Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fee6326c-fbe1-4674-a82c-c9a985324636', 'a13dcb02-5c9a-49e6-a523-14f8df0e6dcc', '5 plzen 30100', 'husova', '', 'davienails999@gmail.com', '+420774829113', 'Husova 5', '', 'Plzeň - Bolevec', '30100', 'Czech Republic', true, '2026-01-20T09:48:22.924Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6a1ea1a3-1303-4fc0-930f-9fb048c0e8df', 'c3d82412-29e4-419c-a21b-f47cfe8a3881', 'Manh Hung', 'Nguyen', '', 'davienails999@gmail.com', '+420773038998', 'Lidická 311/37', '', 'Praha 5 - Smíchov', '15000', 'Czech Republic', true, '2026-01-20T09:48:23.374Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a38c0726-3ced-4fcc-9d9e-38a046923523', 'f3e56f8f-3cf0-4d9a-af63-32eccda712f2', 'Thị Trang', 'Nguyễn', '', 'davienails999@gmail.com', '+420776330441', 'Alžbětín 49', '', 'Železná Ruda', '34004', 'Czech Republic', true, '2026-01-20T09:48:23.824Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('64cea689-c791-450c-a1a4-4dd42fb1e58e', '4ab351aa-eb3f-4d5c-9271-aa060e9b316d', 'Rozkvět', 'NC', 'NAILFEVER Nehtové studio', 'davienails999@gmail.com', '+420602587525', 'tř. Budovatelů 1877/17', '', 'Most 1', '43401', 'Czech Republic', true, '2026-01-20T09:48:24.276Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f0ad0c01-8001-4833-be88-6a27c881d695', '2e1965bd-60c9-4f7b-b268-a97010d69a90', 'tř. 2176/65', 'Pražská', 'Nail Bidova', 'davienails999@gmail.com', '+420777674768', 'Pražská tř. 2176/65', '', 'České Budějovice 3', '37004', 'Czech Republic', true, '2026-01-20T09:48:24.741Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('31b484be-42ad-424c-a199-612a651617b2', 'e4b74a8d-750a-409f-b982-b499c7a48163', 'Denis', 'Son', '', '', '0624745855', 'Metz 57000', '', '', '57000', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ac646a6e-dcc8-4c83-98c6-55749aabef3d', 'ab236f88-b55d-4547-b0ac-b54c866199d2', 'Anh', 'Ngoc Anh', 'Hoa thi tu (nails studio) U Pošty 248/2', 'davienails999@gmail.com', '+420773256868', 'U Pošty 248/2', '', 'Opava - Město', '74601', 'Czech Republic', true, '2026-01-20T09:48:25.529Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dff57edd-959c-4b03-8fe9-b0076dbc5753', '937d5786-a8df-437f-9e8a-3c5fd69d9e22', 'Ml', 'Nguyen Tuan', 'Kim Nails Studio', '', '', 'Kim Nails Studio; potucky', '', '', '', '', true, '2026-01-20T09:48:25.977Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bbcda899-4979-422a-b3ff-7668c64ad994', '01f0a457-567d-4e4a-8c7d-8bcc3417d840', 'donghangcz', '', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:48:26.424Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('808cb98a-c7fd-4e53-bc25-b51ac74fa3ae', '48ee34b6-82d4-4a54-bb7c-cc13b536e45a', 'trung tín', 'Nguyen', '', 'davienails999@gmail.com', '+420608838628', 'Petrovice 209', '', 'Petrovice', '40337', 'Czech Republic', true, '2026-01-20T09:48:26.873Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a9c9b995-57d5-4509-9fff-c4d969e87ee9', '5b6ea6cd-9563-44e0-a2f7-f2026902d757', 'về địa chỉ', 'Gửi', '', 'davienails999@gmail.com', '+420721579999', 'Jiráskova 420', '', 'Litvínov - Horní Litvínov', '43601', 'Czech Republic', true, '2026-01-20T09:48:27.320Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c604a78c-a6c2-4640-b1bb-dfae1aa5af55', '17b0ab6a-4ea6-4a2b-a918-a5745d0ffc02', 'Vu Thi', 'Thao', '', 'davienails999@gmail.com', '+420608841841', 'Radniční 3400', '', 'Most 1', '43401', 'Czech Republic', true, '2026-01-20T09:48:27.767Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('51920829-0ca0-4be5-8414-ee3d9aa7602c', '8a9228df-89ab-4153-a90e-0d85ae46177e', 'Thị Khuyen', 'Pham', '', 'davienails999@gmail.com', '+420774175666', 'Horní 2233/6', '', 'Žďár nad Sázavou 1', '59101', 'Czech Republic', true, '2026-01-20T09:48:28.215Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('96322b2a-529d-4bd2-994d-2ea9859cd110', 'ec53fe60-3432-43e8-a4fb-3fa322af9ff6', 'Tuan', 'Flip', 'Nguyen quoc Tuan (nehtove studio)', 'davienails999@gmail.com', '+420777680789', 'Krušnohorská 3371/2', '', 'Ústí nad Labem 11', '40011', 'Czech Republic', true, '2026-01-20T09:48:29.112Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('373e03bc-57af-4755-a072-ed528bf87d20', 'fde9f6b1-1b3d-4df7-93ba-bb5d392bc453', 'tiến dũng', 'Vũ', '', 'davienails999@gmail.com', '+420773929868', 'Milínská 134', '', 'Příbram 1', '26101', 'Czech Republic', true, '2026-01-20T09:48:29.558Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('566219fd-668a-466c-a85e-864945467187', 'ccecb0f2-c5ac-4205-b409-3c3846dda6b0', 'Thi Tuyet', 'Truong', '', 'davienails999@gmail.com', '', 'Hauptstraße 40', '', 'Idar-Oberstein', '55743', 'Germany', true, '2026-01-20T09:48:32.368Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('96992f44-0a38-4f9d-8caf-6a8ed6fb844c', 'e43faae1-96bf-4cd7-8dca-7b2c3f94da4a', 'Míru 13', 'náměstí', 'Shine Beauty', 'davienails999@gmail.com', '+420773869889', 'nám. Míru 13', '', 'Moravské Budějovice 2', '67602', 'Czech Republic', true, '2026-01-20T09:48:34.838Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a519fa8f-d530-43cb-a8bd-9bfce477b91f', 'ea0aa0b4-30cc-4005-9f1a-29897f76ebf9', 'Nail', 'Lenka', '', '', '', 'inspire nails', '', '', '', '', true, '2026-01-20T09:48:35.625Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('39880a33-f62f-4474-b1e1-da7306b20037', 'c7fc9ea1-d57a-4b79-a4a2-5eca4d7ab456', 'Thanh Huong', 'Do', '', 'davienails999@gmail.com', '+420775166306', 'Kutnohorská 102', '', 'Kolín 2', '28002', 'Czech Republic', true, '2026-01-20T09:48:36.076Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('026f1837-f038-4fe5-975b-471f78006832', '7fafb649-19ac-44c8-be27-7849e76cee14', 'Thi Thu Trang', 'Phung', '', 'davienails999@gmail.com', '+420776106584', 'Budějovická 371', '', 'Jesenice u Prahy', '25242', 'Czech Republic', true, '2026-01-20T09:48:36.523Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0f88f1cd-97f3-4a5b-8f21-2b485cfcfaed', 'bf4ea47e-11d5-40c8-b54e-85d17c146d5b', 'Quoc Vuong', 'Ngo', '', 'davienails999@gmail.com', '+420778056789', 'Bílinská 1147/1', '', 'Ústí nad Labem-centrum', '40001', 'Czech Republic', true, '2026-01-20T09:48:36.980Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d3608cad-d0a0-46c3-a422-9162843930fd', 'e2104c1d-d889-4f94-ae16-ec6959837b24', 'viet Diep', 'Dang', '', 'davienails999@gmail.com', '+420792399256', 'Karlovarská 401', '', 'Pernink', '36236', 'Czech Republic', true, '2026-01-20T09:48:37.429Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b523e5e8-86e5-4a82-9423-5501a0da6302', 'd519c371-db41-454d-9192-08acefc2109f', '168', 'vyskomytska', '', 'davienails999@gmail.com', '+420777424900', 'Vysokomýtská 168', '', 'Holice', '53401', 'Czech Republic', true, '2026-01-20T09:48:37.878Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f5db2ddc-24d9-44c1-9753-a1f752f5ddb2', 'e4c1dc45-3086-4506-9db1-8a9135de9217', 'Hồng', 'Black', 'beauty CASCA Alstertal-Einkaufszentrum (1.OG) Heegbarg 31', 'davienails999@gmail.com', '+4915217918773', 'Heegbarg 31', '', 'Hamburg', '22391', 'Germany', true, '2026-01-20T09:48:39.684Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0f5f7d3e-2a88-40c6-acc4-f2a444eecb7e', 'ecc78905-d6b1-498f-91d9-b90c656fd20c', 'thị thu hương', 'Nguyễn', 'Beauty- House', 'davienails999@gmail.com', '+420778059886', 'Ječná 1255/25', '', 'Praha 2 - Nové Město', '12000', 'Czech Republic', true, '2026-01-20T09:48:41.154Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('366132b6-3c2c-4e66-b9d6-0608a5522e3e', '1370dc36-5194-4d90-ac34-d8db155391ba', 'Sang', 'Sang', '', 'davienails999@gmail.com', '+420608234916', 'Hrnčířská 2341', '', 'Česká Lípa 1', '47001', 'Czech Republic', true, '2026-01-20T09:48:41.611Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('deae4b0b-9e9f-483a-bd6d-5c9f77e1ed82', '825db0a7-fd14-49c8-885a-c92322700d34', 'Ta', 'Nguyen', 'CASCA nails beauty', 'davienails999@gmail.com', '', 'Bodanstraße 1', '', 'Konstanz', '78462', 'Germany', true, '2026-01-20T09:48:42.062Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('57c40720-5849-4fc7-bcbe-26402d211622', '2d3b03a8-ba3f-443a-bad5-5baa9e60a7cd', 'Văn Tình', 'Trần', '', 'davienails999@gmail.com', '015752707554', 'Stadtplatz 28', '', 'Eggenfelden', '84307', 'Germany', true, '2026-01-20T09:48:42.854Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f46e3ef2-f415-4140-aadb-2c08fd3e27ff', 'c8c715e6-e406-4ee0-808a-9b57fd1e5274', 'Hằng', 'Liên', 'Nguyen Hang Lien / Golden Nails - Kaiserstraße 21- 66111- Saarbrücken', 'davienails999@gmail.com', '2166111', 'Kaiserstraße 21', '', 'Saarbrücken', '66111', 'Germany', true, '2026-01-20T09:48:44.990Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8dcfc61e-e3f1-4d70-a40c-b8b08bae2758', '5ab4258c-2b53-463b-90a1-519b815bb672', 'Annahau', 'Nguyen', 'HALONG LUXURY NAILS  Friedrich - Ebert - Platz 2 (Rathaus Galerie - EG neben C&A)', 'davienails999@gmail.com', '', 'Friedrich-Ebert-Platz 2', '', 'Leverkusen', '51373', 'Germany', true, '2026-01-20T09:48:45.778Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2356ac67-5b47-4896-9cd4-bc53c321e6e6', 'c88db02d-d286-4a4d-ad64-3361a18cdd57', '2a', 'ÅÄngkvarnsgatan', 'Layla Nguyen (Swedennail)', 'davienails999@gmail.com', '75308', 'Ångkvarnsgatan 2a', '', 'Uppsala', '75308', 'SE', true, '2026-01-20T09:48:50.619Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('880906b8-ec67-491c-9748-28fe38557fd3', '92c52f79-efe3-4089-91da-22b277b4df58', 'hoài tăng', 'Nguyễn', '', 'davienails999@gmail.com', '', 'Gutenbergstraße 9', '', 'Wörrstadt', '55286', 'Germany', true, '2026-01-20T09:48:54.762Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6581ed0a-e50b-4488-895f-6ee3668be546', 'bd45693d-0321-4852-8cfa-5cfa912701c9', 'Thuy Nguyen', 'Thi', '', '', '777865939', 'Náměstí Osvoboditelů 1409/6', '', '', '1409', 'Česko', true, '2026-01-20T09:48:55.884Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e1c7b972-9537-4e01-a590-60c994d65da2', 'ea1d44e6-509b-4c58-920f-855fcb3b0992', 'thi chanh', 'Le', '', '', '14900', 'Sofia Nails Lashes Studio Opatovská 874/25', '', '', '', 'Česko', true, '2026-01-20T09:48:56.329Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bf91908a-f84b-433c-b584-6ad86591ced7', 'd6f7e1b7-dbb2-48f6-a154-5a4c326eb5f8', 'Ớt', 'Còi Túi', 'Allure nails', '', '776721741', 'Moskevska 448/42', '', '', '10100', 'Česko', true, '2026-01-20T09:48:57.109Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5fd52a27-18f4-422f-b084-3c4037d29b81', '42fbea5a-b752-4945-a2ab-ac51daa232ae', 'Dau', 'Tuan', '', 'davienails999@gmail.com', '', 'Marktplatz 26', '', 'Vohenstrauß', '92648', 'Germany', true, '2026-01-20T09:48:57.555Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5fd03281-e001-4581-a29f-13e5fa0e213e', '4b41d904-3f05-4642-8d06-6b90da9b5c5d', 'rose.black.7739', '', '', '', '+420722309999', '- 722309999', '', '', '36235', 'Česko', true, '2026-01-20T09:48:58.005Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6abcf03a-9962-4ac3-9c88-5677f69de1fa', '65aad930-bad5-4903-bffd-0a94093f84a9', 'Hà', 'Vũ', '', '3cdangyeu@gmail.com', '09027921', 'Praha IČO 09027921', '', '', '1946', 'Česko', true, '2026-01-20T09:48:58.449Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2fecdab2-4886-43db-b4dd-29607190044b', '30e25d0d-9682-48f0-b9bf-38a01ea6c98a', 'Thi Nhu Y', 'Tran', '', 'davienails999@gmail.com', '+420731198693', 'Komunardů 1456/57', '', 'Praha 7 - Holešovice', '17000', 'Czech Republic', true, '2026-01-20T09:48:59.230Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1e835172-8c3f-407a-ae21-e8f11a9347ee', 'bd5ff52e-a176-4de6-8c5c-97b9907907dc', 'studanky', '104', '', '', '', '104 studanky', '', '', '', '', true, '2026-01-20T09:48:59.674Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2fada7a8-5c38-4865-84f1-ad74aa85e775', 'b585246a-a3b6-4f1a-a5b2-1fc682762b31', 'nguyen hoang', 'Mai', '', 'davienails999@gmail.com', '+420723808031', 'Horní Folmava 42', '', 'Česká Kubice - Horní Folmava', '34532', 'Czech Republic', true, '2026-01-20T09:49:00.472Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('95ec0f97-432b-44a4-98a8-18ed84bfddde', '8d1b2463-5615-48c8-80cf-63ed192ca39b', 'kimphuong.le.378', '', '', 'davienails999@gmail.com', '+420607768410', 'Zenklova 305/11', '', 'Praha - Libeň', '18000', 'Czech Republic', true, '2026-01-20T09:49:00.919Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('64d9bd91-b9b0-47ff-b6c8-b7c855f606ea', '1cab4a4c-1aaf-4440-a24b-c501d95f9ebd', 'quy ngoc', 'Pham', '', 'davienails999@gmail.com', '+420773090559', 'Alšovo nám. 84/16', '', 'Písek 1', '39701', 'Czech Republic', true, '2026-01-20T09:49:01.365Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('40cd15e3-b5f2-4c20-9764-012628eb9c64', 'cd329c4f-272b-46f1-a798-fa64764213ba', 'Tranová', 'Ivy', '', 'davienails999@gmail.com', '+420722588888', 'Horní Folmava 98', '', 'Česká Kubice', '34532', 'Czech Republic', true, '2026-01-20T09:49:02.811Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0ae4af23-ad9b-4fc0-9b55-cb3e96142f3a', '982bc79d-48c6-473a-847c-205304bda4dc', 'pham.Danna shop 86', 'Dung', '', 'davienails999@gmail.com', '+420775322565', 'Horní Folmava 86', '', 'Česká Kubice - Horní Folmava', '34532', 'Czech Republic', true, '2026-01-20T09:49:03.257Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('371edf86-3697-4eaa-8c56-71c643d40b6a', 'f259ed38-dbcb-4e7e-bf25-17b75a612a63', 'Thuy Duong', 'Nguyen', '', 'davienails999@gmail.com', '+420774871988', 'Hrnčířská 2341', '', 'Česká Lípa', '47001', 'Czech Republic', true, '2026-01-20T09:49:03.702Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('68cdf214-bd33-4e96-8a99-c3d8a2f8b707', '69b99300-88d1-45ba-9ebd-12faccd404b1', '28 října 153/16', 'nám.', 'Queen Nails', '', '608087456', 'nám. 28', '', '', '', 'Česko', true, '2026-01-20T09:49:04.146Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b4adadc6-d040-4ab5-89fc-d4f45544bf08', '3bea19d1-9b0e-4b82-b1cd-7ec26974ad82', 'Lan', 'Lan', '', '', '', 'Lan Lan', '', '', '', '', true, '2026-01-20T09:49:04.589Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eaca3dc2-2f5d-4f3e-81fe-f20b4c695d3b', 'fb504351-dcd9-4bd8-abe6-86e70f1e574d', 'Nick', 'Nguyen', 'ship cung don Spain', '', '', 'ship cung don Spain', '', '', '', 'España', true, '2026-01-20T09:50:25.473Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b3e46cd5-9a34-4069-822a-1048c632a244', '517a3fcb-33cc-4757-887a-bbc57fbbd52e', 'Tra', 'Nguyen', '', '', '', 'Nguyen Tra; The Nail Boutique ; Eberstädter str.59', '', '', '', '', true, '2026-01-20T09:50:26.248Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ef461f36-f5dd-47af-b82e-ec104196e4fe', '0f277afd-e01c-4222-8409-6cb0e1df230b', 'Thom Dinh', 'Thị', '', 'davienails999@gmail.com', '', 'Havelser Straße 8', '', 'Garbsen', '30823', 'Germany', true, '2026-01-20T09:50:29.691Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2b672b0a-293f-4941-9542-e30af9375cb2', '71228a0e-634c-4ee7-8cf4-04644ac23a65', 'Nehty', 'Časlav Lenka', 'Sam Tattoo - Lenka Nails', '', '28601', 'nám. Jana Žižky z Trocnova 100/23', '', '', '', 'Österreich', true, '2026-01-20T09:50:31.135Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d256c9a8-3b0d-489a-8296-ac9f2e5947bb', '3621f8cb-3955-49b4-bca1-abf15ade0919', 'Str 36', 'Neumärker', 'Sunny Nails', 'davienails999@gmail.com', '38350', 'Neumärker Straße 36', '', 'Helmstedt', '38350', 'Germany', true, '2026-01-20T09:50:31.915Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('38005088-d540-4e41-b178-8374ffb9f4a4', '779ffa7b-a1c4-42a2-b018-0c58ca3909e8', 'Thanh Canh', 'Tran', 'ZanZan Nails', 'davienails999@gmail.com', '', 'Lange Straße 16', '', 'Lübbecke', '32312', 'Germany', true, '2026-01-20T09:50:32.359Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7fad32eb-e8df-477f-9594-60647b2c44de', '6b4f3628-9633-4ad9-a43c-dd090a890df2', '420608066776', '', '', '', '', 'Glam', '', '', '', '', true, '2026-01-20T09:49:28.241Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2e135020-cb89-4948-a14e-86225dbca65d', '401325c5-5760-4460-b560-5b7d25ed97e5', 'Nhat Quang 775424812', 'Tran', '', '', '775424812', 'Tran Nhat Quang 775424812', '', '', '3316', 'Österreich', true, '2026-01-20T09:49:32.689Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('60f7c467-c899-4f79-9df4-5aa95e9eb66f', '78d6d118-662b-4d98-bec0-42b183dc5add', 'Ly', 'Nguyen', '', '', '2933561', 'Chinh. Tyřsova 2933561', '', '', '', 'Deutschland', true, '2026-01-20T09:49:37.141Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c2606ba0-930f-482a-a705-4eb325d2fcac', 'ed82995b-e32d-4ba8-83b0-451d70875a0f', '13', 'Uhlbergstr.', 'Thu Nails Studio', '', '', 'Uhlbergstr. 13', '', '', '', 'Deutschland', true, '2026-01-20T09:49:37.921Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('797bbd0d-9fc4-4747-8fbc-a16cd77ff837', '51d6e600-ad86-4b37-a4ea-2759b524fe0f', 'Süße', 'Huyền', '', 'davie.lam01@gmail.com', '', 'Limburger Straße 17', '', 'Bad Camberg', '65520', 'Germany', true, '2026-01-20T09:49:39.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6e0f9ecb-5ffc-49c1-9c22-52321f0d6e5d', 'beeb8484-dc2a-4725-899c-eaa3a92b11ea', 'thi thu ha', 'Le', '', 'davienails999@gmail.com', '', 'Reclamstraße 38', '', 'Leipzig', '04315', 'Germany', true, '2026-01-20T09:49:41.818Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0aba64b5-6ff2-44ae-a87d-9bf9b2225a38', '14ef708b-c817-45ff-84e2-8309f55bf7b1', '38/43', 'Pražská', '', '', '', 'Pražská 38/43', '', '', '', 'Deutschland', true, '2026-01-20T09:49:42.982Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a1fba79b-d0c6-4bb1-8770-13f7d13f9804', '0a4f0e76-0373-4892-a177-923f3d56302b', 'Le', 'thao', '', 'davienails999@gmail.com', '', 'Waldstraße 35', '', 'Karlsruhe', '76133', 'Germany', true, '2026-01-20T09:49:48.423Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fc0a3e71-7398-4af0-a9bd-c56650e5ca89', '3088b554-691d-4004-af89-91cbe4980efd', '2987/5b', 'Mendelova', '', '', '03391124', 'Mendelova 2987/5', '', '', '2987', 'Deutschland', true, '2026-01-20T09:49:58.103Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('045ba899-e8e7-4de9-bc91-2b0d6c8a9c2d', '91dd6111-f4fe-4e59-8fcf-0c167fe93983', 'Thi Thuy', 'Chu', '', '', '', 'Chu Thi Thuy; Ume Studio Heinrich-Vetter-Passage', '', '', '', '', true, '2026-01-20T09:49:45.872Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4d2b8293-6dd6-4dd8-8253-761a1c9a6f9c', '822e9d2b-561b-43c7-91bb-461e062a220d', 'Vu', 'ThiThu Phuong', 'Vu phương ahri nails', '', '608605207', 'Jaroslava průchy 1915', '', '', '1915', 'Deutschland', true, '2026-01-20T09:49:46.316Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('421e42f6-9805-4d53-9fd5-61fbc7273707', '9cd5f4cd-af2f-48e8-b854-d6a092b15db4', 'MAI KHANH', 'TRAN', '', '', '+421951434983', 'hálkova 725/1', '', '', '83103', 'Österreich', true, '2026-01-20T09:49:51.199Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5eac4b3a-72d5-46b0-88fc-ae4947c68114', '84295e24-9aee-4c1c-8f3d-ded92997b7a1', 'thi phuong', 'Nguyên', '', 'davienails999@gmail.com', '', 'Kronenplatz 3', '', 'Bietigheim-Bissingen', '74321', 'Germany', true, '2026-01-20T09:49:53.644Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c135e6aa-8f49-4681-8466-630621b1a487', '7c9ee4b0-7f40-4692-881a-ebda20e73e11', 'Van Khanh', 'Nguyen', '', 'davienails999@gmail.com', '+420722114939', 'Markova 40/2', '', 'Karviná 1', '73301', 'Czech Republic', true, '2026-01-20T09:50:34.137Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('edfc7614-9fc4-47ac-ae98-79607956c577', '75fe9537-79da-4354-80f6-2838e18c6828', 'Hong Nhung', 'Nguyen', '', '', '774821800', 'J. Švermy 1227/2', '', '', '1227', 'Deutschland', true, '2026-01-20T09:50:37.263Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b34f05d7-83af-4fe8-b3c0-6795a5ed445a', '63fd6dbf-862c-4162-be02-27268f4cac8c', 'Pham', 'Hong', '', 'davienails999@gmail.com', '+420774923456', 'Ostrožná 213/14', '', 'Opava 1', '74601', 'Czech Republic', true, '2026-01-20T09:50:38.705Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('efc87ae2-7967-48ea-b62e-3b8b132783dc', '3189974d-9517-44e0-b200-43d5cbfd3b6f', 'Ngoc Y Nhi', 'Nguyen', '', 'davienails999@gmail.com', '+420776609666', 'Velkomoravská 2202/2', '', 'Hodonín', '69501', 'Czech Republic', true, '2026-01-20T09:50:39.151Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5d73e4c1-3e6f-456f-aafd-847993d75113', '3c0ae6b3-b2a4-4434-809c-89c8287f9ecb', 'Thu Vu', 'Thi', '', '', '', 'City Palais Königstraße 39', '', '', '47051', 'Deutschland', true, '2026-01-20T09:50:43.260Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fe07a9b2-b699-4fd0-bb4c-542b73d41740', '467a3e8a-a588-4464-b16b-97d111832e5a', 'lee.home.796', '', 'Daisynail Aschaffenburg', '', '', 'Daisynail Aschaffenburg', '', '', '', '', true, '2026-01-20T09:50:45.711Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('43647316-d344-46d6-a137-0e8c4a22cbe6', '019e2e4a-6d5b-4cd5-abcb-1c0982dc51c4', '33 97411', 'Rudohorska', 'Yen Nails', 'davienails999@gmail.com', '4210940056899', 'Rudohorská 6735/33', '', 'Banská Bystrica 11', '97411', 'SK', true, '2026-01-20T09:50:46.154Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1650366a-64de-46e0-9b00-e4887374869e', 'bc6fb759-8131-4150-bb21-4a47177c2761', '8', 'Hauptstraße', 'PN Beauty Nails', 'davienails999@gmail.com', '', 'Hauptstraße 8', '', 'Haiger', '35708', 'Germany', true, '2026-01-20T09:50:47.597Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('66bc1ce7-cd3c-4ff7-b885-ae7a4be7c4a0', '1f4a5c1c-f954-464d-ad07-0a0d4d5090a5', '25', 'Theresienstraße', 'Appealing Beauty Nails - Ingolstadt', 'davienails999@gmail.com', '', 'Turmstraße 25', '', 'Berlin', '10559', 'Germany', true, '2026-01-20T09:50:48.039Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ed9e1187-3517-46c9-8bcc-fb14dd925fe7', 'a9d265ab-914d-4628-ae69-1a9c5b1610c6', '24', 'Veletržní', 'salon Art Nails v Oc Stromovka', '', '', 'Veletržní 24', '', '', '', 'Deutschland', true, '2026-01-20T09:50:50.143Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d1e10abc-166a-455c-a620-77a538abb210', 'c0617e71-4c0b-41e6-b6ca-999a9b5c989c', 'the Minh', 'Nguyen', '', 'davienails999@gmail.com', '', 'Bregenzer Straße 49', '', 'Lindau (Bodensee)', '88131', 'Germany', true, '2026-01-20T09:50:52.247Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fd1671c6-952a-4da5-9008-a12a8e272663', '02cf51ea-0ddc-4780-bd77-7a785a5bb4ae', 'Minh Ngoc Nguyen', 'Thi', '', '', '608972394', 'Diamond nails 5', '', '', '40747', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('77d7b02e-bf5f-439c-9d05-5f414a2a8d06', 'a0e5a1ff-234c-4972-ab3c-01bfbfe77fe6', 'Thi Lan', 'Pham', '', 'davienails999@gmail.com', '+420728339405', 'třída T. G. Masaryka 1087', '', 'Mladá Boleslav III', '29301', 'Czech Republic', true, '2026-01-20T09:50:53.026Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fee38ded-3f4c-45f7-b547-95dea5f3b6e0', '10e65d3e-3378-47f3-8e70-c888823f21bd', '653', 'Polní', 'Rose Nails & Beauty', 'davienails999@gmail.com', '+420702939459', 'Polní 653', '', 'Klášterec nad Ohří 1', '43151', 'Czech Republic', true, '2026-01-20T09:50:53.469Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6d2e7c71-e3a0-4830-b653-7badbd5bab0c', 'd544d6dc-66e9-4250-adaf-d23126865862', 'Koningshof 75', 'Address:', 'Name: Livi Nails', 'livinails2015@gmail.com', '002221794', 'Koningshof 75', '', '', '', 'Deutschland', true, '2026-01-20T09:50:56.239Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6bf3274b-073d-4360-b55f-c04e43ccde36', '3277c8d6-d293-4b01-8294-6c156656bf1f', 'Dai', 'Phat', 'Lam ơi mai em cầm đồ ra USA Nails cho  anh nhé! Em gọi vào sdt này 735037586 Ánh', '', '735037586', 'i vào sdt này 735037586', '', '', '', 'Deutschland', true, '2026-01-20T09:50:57.015Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7c2e49b3-b418-4bcd-9881-17d9bf9dbda3', 'e96c40a8-bbb8-4998-a2ee-012d40cf83ee', 'Phuoc Nghiem', 'Trong', '', 'davienails999@gmail.com', '', 'Feldstraße 46', '', 'Rodgau', '63110', 'Germany', true, '2026-01-20T09:50:57.795Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3d85207f-58bf-41da-b4a5-5aec75264bd6', 'f4fe03ff-571a-48d9-ac05-b551a8b3c52e', 'thanh tu', 'Tran', '', 'davienails999@gmail.com', '+420728334068', 'Husovo nám. 529/6', '', 'Tábor', '39002', 'Czech Republic', true, '2026-01-20T09:50:58.239Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('00c806bd-eaf5-4795-b9b1-2ee31a2aeb08', 'f0655dfd-2e25-4695-a2df-7cbb211e6d0a', 'Duong Thi', 'Hai', '', 'davienails999@gmail.com', '+420792550323', 'Studánky 20', '', 'Vyšší Brod', '38273', 'Czech Republic', true, '2026-01-20T09:50:58.683Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e735acc4-534b-47df-9ee1-c4e2e1227de9', '89e58de9-bc01-4d34-9f05-d5325033d49d', '16', 'Marienstraße', 'Địa chỉ: Kimmies Nails', 'davienails999@gmail.com', '', 'Marienstraße 16', '', 'Übach-Palenberg', '52531', 'Germany', true, '2026-01-20T09:51:00.787Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('549a37ca-d767-4d50-82e5-7b96fc4fb0c3', 'd9e704a8-322c-40f6-8453-6b17343d7ccb', 'huy.clubcz', '', 'Vita Nails & Lashes Marburger Straße 13 572 23 Kreuztal', 'davienails999@gmail.com', '1357223', 'Ravensburger Straße 13', '', 'Bad Waldsee', '88339', 'Germany', true, '2026-01-20T09:51:02.563Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4f1675c0-7f87-4889-850b-ee45a9e99af5', '523ef556-8e29-48e9-bb03-7b98e9deb571', 'Thi Thu Trang.', 'Nguyen', '', 'davienails999@gmail.com', '', 'Am Wollhaus 1', '', 'Heilbronn', '74072', 'Germany', true, '2026-01-20T09:51:03.007Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('647fe7ad-bc9b-4a68-b9eb-456a610c6b43', '2e7d79c8-291a-4762-ae44-5ae7e84915ba', 'tung.vien.9699', '', '', '', '11000', 'Na Příkopě 31', '', '', '', 'Deutschland', true, '2026-01-20T09:51:03.785Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d9835a10-8f2e-435f-8eae-8a4bd7962b56', '6649e677-34ab-44cc-8f37-132ab66a25d4', 'Nguyen', 'Kim Thu', '', 'davienails999@gmail.com', '+420777128845', 'Nádražní 2590', '', 'Písek 1', '39701', 'Czech Republic', true, '2026-01-20T09:51:05.226Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3a9df53c-7827-40ba-bde3-76aff10b549a', '4e1e2f2b-6d54-4f4b-afbe-c2a7cf3e5ca7', 'Quynh Vo', 'Thi', '', 'davienails999@gmail.com', '+420775627421', 'Sulická 989/4', '', 'Praha - Lhotka', '14200', 'Czech Republic', true, '2026-01-20T09:51:05.668Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fbfa8bf6-9968-402f-885c-2016541304c8', '5bf2a095-4337-4ee8-ba7a-4ab44bea2fc3', 'postou 295/11', 'Za', '', 'davienails999@gmail.com', '+420777160740', 'Za Poštou 295/11', '', 'Krupka 1', '41742', 'Czech Republic', true, '2026-01-20T09:51:06.445Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1cffb162-5a2a-4f0e-b24a-652d1169f94f', '91eaa009-8fb6-4882-9926-d75771794ce9', 'Anicka', 'Tran', '', '', '773215668', 'n phong 1m', '', '', '77900', 'Deutschland', true, '2026-01-20T09:51:09.218Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('efb3a51a-554a-4e21-a0e0-9995e164e424', '657d1879-067a-47c6-84b8-a12a949e327d', 'Repy Makovskeho 1349', 'OC', 'Deluxe Beauty Spa 3.patro', '', '776228888', 'Deluxe Beauty Spa 3', '', '', '1349', 'Deutschland', true, '2026-01-20T09:51:09.662Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d5c8dcec-e225-4f51-81df-d851360f5556', '7b88a97b-e78c-4c16-839d-69cbb2b5d1ee', 'Kim Thuy', 'Vu', '', '', '', 'Vu Kim Thuy', '', '', '', '', true, '2026-01-20T09:51:10.106Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('04399602-5848-4027-84a2-69f739ca8124', '19fee30c-b526-4112-ac48-f6e0693fb4b0', 'Thi Hien', 'Le', '', 'davienails999@gmail.com', '', 'Kirchstraße 27', '', 'Bad Segeberg', '23795', 'Germany', true, '2026-01-20T09:51:10.882Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('27fcf66c-7149-4a32-95f3-7543bec8acc1', '08141332-36d9-43dd-993f-332723c7fa6d', 'Dieu An', 'Ha', '', '', '50003', 'Československé armády 250', '', '', '', 'Deutschland', true, '2026-01-20T09:51:11.327Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cd89c802-ff09-487f-921e-37f1768cb397', '406118ea-b6d8-4c98-8be8-500dfee0d655', 'giang hoang', 'Huong', '', 'davienails999@gmail.com', '', 'Marktstraße 58', '', 'Giengen an der Brenz', '89537', 'Germany', true, '2026-01-20T09:51:14.096Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('932d968f-7d2f-43fe-a803-18f874d5c680', 'b99de172-1aa2-4268-8cfa-64490437de87', 'Vrbné 2403', 'České', 'Thi bich tran adam 1 nails lekarsky', '', '', 'Thi bich tran adam 1', '', '', '2403', 'España', true, '2026-01-20T09:51:16.206Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ace1f8bc-81a0-4366-ae05-65ff004cf7ad', '839bd2b9-b972-4471-85b7-9e4faf9d9b32', 'Dung Pham', 'Thuy', '', '', '46015', 'Olbrachtova 37', '', '', '', 'Deutschland', true, '2026-01-20T09:51:16.651Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('814519fb-b1c5-4c34-badf-2b6166b4d69e', 'c26b5f1c-b8da-43f0-86e6-3829f8b6334d', 'Bùi', 'Dũng', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:51:17.095Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('aebf2b34-8683-423f-960c-95f133feafa1', '9e8efe03-8aba-4eee-8e4a-232d133c8ac9', 'Rheinstraße.', '53', '', '', '', '53 Rheinstraße.; 64283. Darmstadt ; Cindy Nails', '', '', '64283', '', true, '2026-01-20T09:51:17.540Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1c0b6bab-4ac7-4e67-b0d0-34c58e497f17', '660a8535-f839-4e9d-b11c-21731e43be2b', '8a', 'Martinsgasse', 'Mylâm Nagelstudio', 'davienails999@gmail.com', '', 'Martinsgasse 8A', '', 'Ettlingen', '76275', 'Germany', true, '2026-01-20T09:51:19.318Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('88d92e80-0e58-4a5c-b43c-ee5cacedd186', '8f34158b-dd9e-48a3-b4d4-a5b8370d9743', 'Thi Lan Huong', 'Tran', '', 'davienails999@gmail.com', '', 'Am Berge 3', '', 'Lüneburg', '21335', 'Germany', true, '2026-01-20T09:51:19.762Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d6b91dff-c7ee-42a4-8cb8-78a00050f3e3', '9b5a96ad-745a-43b6-aa06-6f9b01ab735f', 'Nguyen Danh', 'Hieu', '', 'davienails999@gmail.com', '', 'Ledergasse 44', '', 'Schwäbisch Gmünd', '73525', 'Germany', true, '2026-01-20T09:51:20.872Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1cf29c5c-cf37-4b67-b797-ea33bc6d4cce', '294591e8-fb35-4de9-82eb-c17ef9fbe918', 'Katana', 'Nil', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:51:22.984Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9b60409e-394b-4da0-922c-291866ae2a1a', '3909913c-5112-49f4-ba5f-38c3415252ae', '6, Cheb', 'Křižovnická', '', '', '', 'Křižovnická 6', '', '', '', 'Deutschland', true, '2026-01-20T09:51:23.428Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f24206b6-8203-4e3e-99c3-05b7601d619d', 'bb83818d-e845-406a-801a-dd94a67e1250', 'Hương Giang', 'Ngô', '', '', '774292479', 'Smetanovy Sady 2152T', '', '', '', 'España', true, '2026-01-20T09:51:24.212Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bae91feb-09b3-4b49-9b77-a178aa53758a', 'e5db0063-380a-4ad5-8c9e-667146af6591', '100046155513703', '', 'Nguyen Thu Hien ( Royal Nails) Vorstadt 21', '', '', 'Vorstadt 21', '', '', '', 'Deutschland', true, '2026-01-20T09:51:24.656Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5e3ef8a3-faa9-4b84-a077-9f9bc09baec6', '158fd79d-4089-4bc7-a4ff-6c7e4a99baf4', 'PiAy', 'Nguyễn', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:51:26.435Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('957fd585-f737-438c-8af6-06805ef440a8', 'af8ef5bf-f2bc-43aa-9f5f-e8636bceb02a', 'vanlemon.nguyen.7', '', '', '', '', 'Lemon', '', '', '', '', true, '2026-01-20T09:51:26.878Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d4a2ac27-dd5b-4d34-b06b-58e1eb72c710', '96eaf043-c997-43d1-899d-fe54d0692bf7', 'Thị Huệ', 'Trịnh', '', 'davienails999@gmail.com', '+420775365570', 'Karla Steinera 910/7', '', 'Plzeň 18', '31800', 'Czech Republic', true, '2026-01-20T09:51:27.655Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ab228527-6030-41fa-a1ee-7591f10a6363', '6acea0b9-a49a-4c69-ba5e-65891a551406', 'Ngọc', 'Đặng', '', '', '', 'delivery', '', '', '', 'Deutschland', true, '2026-01-20T09:51:31.449Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ce1132f3-8fa2-48a8-b48b-0c9a309fa1a6', '2a7c8a9a-91f2-4fe5-ab5a-07ea17699a1c', 'thuphuongnails', '', 'Majka studio', '', '', 'Jindřicha 118', '', '', '', 'Deutschland', true, '2026-01-20T09:51:31.892Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('574d3dab-e8fd-451a-8b20-70d05c936aa2', 'cfddf42d-8993-4177-9773-e216c26c46f9', 'quoc bao', 'Tran', '', '', '', 'Untersbergstr 22', '', '', '81539', 'Deutschland', true, '2026-01-20T09:51:32.668Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8690c877-f30f-4619-9b45-4998aaf4b985', '0e8f3cb3-b6f1-473b-a304-26f4731771ab', 'Thi', 'Vo', '', '', '', 'Dinh Que.  Gablonzer str 21', '', '', '87656', 'Deutschland', true, '2026-01-20T09:51:33.778Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('807b49c1-8f8f-4c40-9310-ff49db97caaa', '61fd9704-800e-48e1-882c-c3951c35fa8d', '115/29', 'Husova', '', 'davienails999@gmail.com', '+420777978562', 'Husova 115/29', '', 'Kutná Hora 1', '28401', 'Czech Republic', true, '2026-01-20T09:51:34.223Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('58adfb2b-9614-409b-9009-82cb90f918ca', '3b5ed2f3-0e92-4c03-8b62-f1b10142a8dd', 'Thị Hoa', 'Nguyễn', '', 'davienails999@gmail.com', '+420778567789', 'Vodárenská 2375', '', 'Kladno', '27201', 'Czech Republic', true, '2026-01-20T09:51:34.668Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eb3c2c7b-1557-45ed-a491-fa811f7d4002', '702dc3aa-ae8d-496f-8236-6717c265bdf5', 'Thu Trang', 'Dang', '', 'davienails999@gmail.com', '+420723139900', 'Dolní 104', '', 'Havlíčkův Brod 1', '58001', 'Czech Republic', true, '2026-01-20T09:51:35.111Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('34f8c1fd-54b7-4647-9221-08f6f5dbccfa', '49cea583-51e4-4e8a-95ea-d2364bc65bd1', 'Ngo Van', 'Man', '', 'davienails999@gmail.com', '+420775449822', '5. května 15', '', 'Varnsdorf 1', '40747', 'Czech Republic', true, '2026-01-20T09:51:35.556Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b388a270-ec9b-4657-b22f-d348c54c7654', '37431061-da46-4d1b-9280-1eb441dc9f87', 'thi huong', 'Kiểu', '', '', '776637418', 'VYSSI brod 38273', '', '', '38273', 'Deutschland', true, '2026-01-20T09:51:37.996Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7959b18b-82c6-4167-b34f-0ec9d7794965', 'a9d40b38-ed0b-474c-96a6-b0a23dc33b6b', 'honggam.vuthi', '', '', '', '204225088', 'Toušeňská 2042-25088', '', '', '2042', 'Deutschland', true, '2026-01-20T09:51:38.773Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('877d8d10-bc0f-4947-bb2e-322fd2c383b7', '40888509-fa33-4986-b3bd-959ac1dab25a', 'Nga', 'Truong', '', '', '', 'Victor; Royal Beauty', '', '', '', '', true, '2026-01-20T09:51:39.218Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('52265611-c287-49e0-bbe3-431a6f3b665d', 'b848b476-6fb6-4d32-8cbb-f3d982c73b4f', 'Tú', 'MoOn', 'Royal Nails & Spa. Pražská 385/17 Liberec +420 608 66 88 96', 'davienails999@gmail.com', '+420608668896', 'Pražská 385/17', '', 'Liberec 7', '46007', 'Czech Republic', true, '2026-01-20T09:51:40.661Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b772913e-a139-4c87-a79f-0fa06b249adc', '065ac540-0a25-4449-bd9e-d07ef2040a75', 'Linh', 'Hoài', '', 'davienails999@gmail.com', '', 'Neuer Markt 1', '', 'Villingen-Schwenningen', '78052', 'Germany', true, '2026-01-20T09:51:42.769Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4fc3f707-5d6d-461a-9049-94743f7fa643', 'd856d043-2466-4c79-9749-1508c8a10506', 'Nguyen', 'Minh Phương', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:51:44.214Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('db8b8fbd-bf42-4649-8dcb-eaf433f54120', '4155a87c-f12e-48bf-a49a-884cf0abac7e', 'Thanh', 'Trịnh', 'Nail studio', '', '', 'Nail studio', '', '', '', '', true, '2026-01-20T09:51:44.656Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ade50e3c-8385-4a36-91b1-4b27870110f8', '3ddbd090-59b6-432f-b344-332be9ecd927', 'Thị Như Hoa', 'Phạm', '', '', '606326077', 'Tel 606326077', '', '', '43191', 'Deutschland', true, '2026-01-20T09:51:45.434Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7e3b9d98-9521-4e32-8c16-ce60c8f5086d', '1efa2210-d110-46e9-b54f-8d5ec7d74b85', '776 506 868', '+420', 'beauty salon kim loi', '', '+420776506868', 'Naměstí 617', '', '', '33301', 'Deutschland', true, '2026-01-20T09:51:46.209Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('88a738a8-e35a-46e7-bf74-c2d52171fa27', 'd944e16c-d7b7-421c-900a-eab66d82a4b3', 'Yen Tranová', 'Hoang', '', 'davienails999@gmail.com', '+420723037289', 'Vítězství 85', '', 'Děčín - Děčín XXXII-Boletice n', '40711', 'Czech Republic', true, '2026-01-20T09:51:47.319Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b3f09b8a-26e0-4c2e-8bb3-bf8f370c165c', '5cb6fcf1-0ad8-4a7e-a4e4-1911791af317', 'Huong Lam', 'Frau', '', 'davienails999@gmail.com', '', 'Nordstraße 21', '', 'Düsseldorf', '40477', 'Germany', true, '2026-01-20T09:51:48.432Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4be49ed0-25a5-4a01-97f5-0f0e6ed66838', '3d8fea3b-35f9-4ffd-8397-e98f29a7609d', 'b', 'Oke', '', 'davienails999@gmail.com', '96215', 'Marktplatz 14', '', 'Lichtenfels', '96215', 'Germany', true, '2026-01-20T09:51:49.213Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5a06a436-135d-475d-b53c-2ebaf15e64f7', '02e59644-880b-44d9-9d5d-4b597dab73db', '17. 80331. München', 'Kreuzstr.', 'Linh‘sNails', 'davienails999@gmail.com', '', 'Kreuzstraße 17', '', 'München', '80331', 'Germany', true, '2026-01-20T09:51:49.657Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7cba4abd-1717-485d-81c2-1e964bdf6e5d', 'a9ac1f12-36c9-4d41-80f3-108ac36c5d49', 'Tran', 'Dung', '', '', '', 'Dung Tran', '', '', '', '', true, '2026-01-20T09:51:50.435Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c910365d-6153-4ddf-a5f8-b4fae0276196', 'cbb2eea5-a341-4669-a08b-a067dd726253', 'thi my linh', 'Vu', '', '', '721999996', 'Brněnská 1825/23', '', '', '1825', 'Deutschland', true, '2026-01-20T09:51:50.878Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f848f529-7a75-48e2-9702-a4d36bd2bf9d', '07850b45-0c7e-4a64-a41e-f14c86e53280', 'tien nhat', 'Nguyen', 'BB Nails Beauty & Best Cannstatter Str. 117 707 34 Fellbach, Deutschland / Germany', 'davienails999@gmail.com', '11770734', 'Cannstatter Straße 117', '', 'Fellbach', '70734', 'Germany', true, '2026-01-20T09:51:51.655Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('66a5ad76-c6bc-4a72-bf49-035858088f4f', 'e9e9b5d6-12a8-444c-82b6-ce1b97136a53', 'phuong mai do', 'Thi', '', '', '015152001291', 'Thi phuong mai do; Am Südhang4,; Hünstetten,65510,hessen; Dt:015152001291', '', '', '65510', 'España', true, '2026-01-20T09:51:52.429Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('385602a3-ac31-4008-a6b3-6f1b7eaf14fb', '5b4ad6e9-39a0-47ca-90da-cbbbbee79c0d', 'studanky, vysybrod', '104', '', '', '773221885', 'sdt 773221885', '', '', '', 'Deutschland', true, '2026-01-20T09:51:53.544Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('773d6a9b-d1c9-4f82-a089-8bdc7175e420', 'be2ddbb9-e2d7-421f-a9a6-3c53807d16c8', 'Viet Toan', 'Do', '', 'davienails999@gmail.com', '+420775137937', 'Průmyslová 275', '', 'Brandýs nad Labem-Stará Bolesl', '25001', 'Czech Republic', true, '2026-01-20T09:52:03.373Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8cf5fadc-314d-446d-99a6-155d5542f7f7', 'd8cfe2a1-7bc6-4cfa-a215-4075dad25efe', 'Thi Quế', 'Cao', '', 'davienails999@gmail.com', '+420776617789', 'Pařížská 1424/6', '', 'Ústí nad Labem 1', '40001', 'Czech Republic', true, '2026-01-20T09:52:03.816Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('63821456-b9f7-4046-84a3-00d8b5325a17', '55df1f52-88a1-4c3a-a27f-0496693e4fc9', 'str. 16', 'Staufener', 'Emily Nails', 'davienails999@gmail.com', '', 'Staufener Straße 16', '', 'Bad Krozingen', '79189', 'Germany', true, '2026-01-20T09:52:04.261Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2d39c0a7-34ac-4a2e-b2a8-97fb0dbfba33', '5066f402-fd39-4acd-bc25-ac3ef62a4862', 'Kaufland EGM Center)', '(im', '', '', '', '(im Kaufland EGM Center); Les Nails', '', '', '', 'España', true, '2026-01-20T09:52:05.486Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('61b36688-b051-4e64-a2ab-3d2334022663', '02f48c74-7e9c-48a9-b5c8-c46841e97744', '838', 'Netroufalky', 'Nhi Le Thi Thao (Nancy Studio)', '', '', 'Netroufalky 838', '', '', '', 'Deutschland', true, '2026-01-20T09:52:06.265Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9d736995-3c9f-4b51-993a-881bf9540ca8', '2e2851e9-fc59-4e83-89f4-f6552608b381', 'thach.thuylan', '', 'Glam studio, svatý kříž', '', '', 'Glam studio, svatý kříž', '', '', '', 'Österreich', true, '2026-01-20T09:52:06.709Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('050b623a-01a2-48c3-9ce4-589009a1d8e8', '25c7f115-cdc1-4ee0-a8a7-cb04ce1ccfe8', 'tuyết linh', 'Nguyễn', '', '', '59231', 'ch 15/15', '', '', '', 'Deutschland', true, '2026-01-20T09:52:07.153Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fa0ca6a3-05ce-48cd-8057-2493d807fa84', '9731a36c-107f-40eb-b9b1-6beb785c62ad', 'ThuTrang03101991', '', '', '', '', 'Inter', '', '', '', '', true, '2026-01-20T09:52:07.928Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9e561f30-2757-4066-8f05-87d935be2a9a', 'a0bdc36e-1c91-4e43-99dd-633cef674dfe', 'thị hiền', 'Vũ', '', 'davienails999@gmail.com', '+420704345678', 'Francouzská třída 2246/53', '', 'Plzeň - Východní Předměstí', '32600', 'Czech Republic', true, '2026-01-20T09:52:10.044Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5b4a112f-1ba9-475b-b801-ffa6aa9f5f0c', '19fcdb29-df36-4671-91e4-e48791fc53eb', 'Vu', 'Loan', '', 'davienails999@gmail.com', '', 'Prager Straße 15', '', 'Dresden', '01069', 'Germany', true, '2026-01-20T09:52:11.150Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4c4181ba-b384-4180-842a-1a162d41fb15', 'bf8be4a5-24b0-4d18-9a7e-8da230c2c73f', 'Tuan Anh', 'Pham', '', 'davienails999@gmail.com', '', 'Hauptstraße 24', '', 'Hösbach', '63768', 'Germany', true, '2026-01-20T09:52:11.928Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6731172f-a567-4e4e-8533-480e13d62baa', '88821cf2-fe8f-44d6-9663-52dcf2d0f66b', '25/27', 'Salzstraße', 'LongNails', 'davienails999@gmail.com', '', 'Salzstraße 25-27', '', 'Freiburg im Breisgau', '79098', 'Germany', true, '2026-01-20T09:52:12.703Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b811bff4-23e1-4063-800d-6ee7286ad753', 'b6e469c2-27ad-4226-a7ff-ea8493a4173d', 'thi ngoc', 'Dao', 'Linda Nail', '', '12276701', 'Kovářská 122', '', '', '', 'Deutschland', true, '2026-01-20T09:52:13.147Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('31f946e1-b439-4e69-be62-8f09df0dcbcc', 'a8badcc4-3357-4004-a304-817c782b0bb6', 'Nhung Nguyen', 'Thi', '', '', '', 'Plzeňská 27', '', '', '', 'Deutschland', true, '2026-01-20T09:52:14.258Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f8a713b2-885d-4004-9ac4-686c810ddd4b', 'd7846abf-4919-46ad-a5d1-4db5647224f3', 'Cam', 'Van', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:52:15.367Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c82eedfa-b037-4619-81e6-0dd6238c67f0', '6639198b-07a7-44f8-87db-5ba955e63c3c', 'Vũ', 'Quý Tài', '', '', '', 'svaty', '', '', '', 'Österreich', true, '2026-01-20T09:52:15.809Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('beba9aed-1703-4a9e-b896-941970b5ca08', 'fa99515f-bc32-4d89-9ea2-b2ea509646b8', 'thị ngân.đt 777235165', 'Hoàng', 'Lenka Nails 28. října 97/3 702 00 Ostrava', '', '370200', 'Lenka Nails 28', '', '', '', 'Deutschland', true, '2026-01-20T09:52:16.253Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('50b95460-7bd0-4596-b60d-92922b7290aa', '3b6b50e0-c49c-4dd3-9ce1-cc8d80686e70', 'Thị Hồng Vân', 'Nguyễn', '', '', '723258829', 'Pražská 148/32', '', '', '', 'España', true, '2026-01-20T09:52:16.695Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('90048528-6b94-467a-827b-eec803719c03', 'f323293a-9c38-4f31-bcc9-b7adabfbe0ee', 'hải triều', 'Đoàn', '', '', '777691688', 'Kovářská 10/16', '', '', '75701', 'Deutschland', true, '2026-01-20T09:52:17.139Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('97df9154-d057-401f-89df-dfbeaca1ac86', 'cdb40265-9d3c-4b6e-b2be-10d0cc974653', 'Phạm', 'Phương', '', 'davienails999@gmail.com', '+420771216878', 'náměstí Míru 208', '', 'Blatná', '38801', 'Czech Republic', true, '2026-01-20T09:52:17.914Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('682649c1-7ac8-4e19-a60c-f546cee6eb56', '4061faa8-cb08-4556-9cdc-64cec928b7d7', 'Quang Thang', 'Nguyen', '', 'davienails999@gmail.com', '+420773266288', 'Vlasatice 456', '', 'Vlasatice', '69130', 'Czech Republic', true, '2026-01-20T09:52:18.357Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f75e15e6-535c-4d90-abe9-eb22f6825240', '488871f9-09ea-4e92-84aa-28a87c6027be', 'Ngoc', 'Phuong Tran', '', 'davienails999@gmail.com', '', 'Im Lettenacker 8', '', 'Efringen-Kirchen', '79588', 'Germany', true, '2026-01-20T09:52:19.134Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b4c848bf-c70b-4471-a45f-7212011f0328', 'b9b69b0a-aa1d-40dc-ae32-a48513e36d75', 'thi văn', 'Nguyễn', '', '', '725637856', 'Msgre.B.staska 16', '', '', '34401', 'Deutschland', true, '2026-01-20T09:52:19.911Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('db574add-d648-4b48-98e9-1b7f4bdc6922', '97ce47f3-c37c-4b1e-816d-2706dc03acbd', 'Phúc', 'Nguyễn', '', '', '774068489', 'T.G.Masaryka 268', '', '', '27201', 'Deutschland', true, '2026-01-20T09:52:20.361Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8dc6de98-e34f-457e-920d-70f850531a1e', '7b500a9c-0d75-4a32-8014-51aca680e463', 'Đặng', 'Duy Quang', '', '', '', 'Inspire', '', '', '', '', true, '2026-01-20T09:52:20.806Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3040d92a-c197-4e5a-be40-aaab99eb2cbe', 'b30bd434-61ee-4b89-af61-b50c811a8979', 'Thuy', 'Tranthithu', 'Tran thi thu thuy , nailouge . Olympia , Olomoucká 90, 783 72 Velký týnec . Tel 608914688', '', '78372', 'Olomoucká 90', '', '', '', 'Deutschland', true, '2026-01-20T09:52:22.914Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c69005d6-6df5-4180-a574-e5e2e1255183', '74c309bb-ea92-47f9-a525-d79e74f925b2', 'Văn Sơn', 'Trần', '', '', '608390878', 'ka nail Albert hypermarket Olomoucka 115', '', '', '', 'Deutschland', true, '2026-01-20T09:52:23.358Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0f1074dd-5c8f-4c97-8d9e-e5345120e7a2', 'e6a6dbc8-d4a2-40bd-915f-72ad17d2e4eb', '2895/23', 'Sukova', 'Do Studio ( V Kaufland)', 'davie.lam01@gmail.com', '+420773451966', 'Sukova 2895/23', '', 'Plzeň 1', '30100', 'Czech Republic', true, '2026-01-20T09:52:23.803Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a01e0707-0c77-48e2-af5b-9c47bff4801c', 'aa1029ea-9776-43d1-9a09-b10a0417f0e7', 'huong.phan.56', '', '', 'davienails999@gmail.com', '+420775748666', 'Italská 2420', '', 'Kladno 1', '27201', 'Czech Republic', true, '2026-01-20T09:52:24.250Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6662649c-ecf0-41a9-926d-ade54bb2acff', '2ec37036-17bb-4a6f-b034-60487bd62c24', 'thi hien', 'Le', '', 'davienails999@gmail.com', '+420728718277', 'Sadová 876/1', '', 'Jeseník', '79001', 'Czech Republic', true, '2026-01-20T09:52:24.704Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('1a11f00f-43de-4196-9fbf-a69526d82858', 'cd101a9f-f7ee-489b-a0da-e2aa816b6a73', 'Anna', 'Nguyen', '', '', '', 'pickup', '', '', '', '', true, '2026-01-20T09:52:27.140Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('aca15997-63a5-4647-907e-732fd4d36a51', '7478a237-8779-48c7-acec-822d147958fe', 'Thị Nguyet', 'Nguyen', '', 'davienails999@gmail.com', '', 'Im Götzmann 4/2', '', 'Lahr/Schwarzwald', '77933', 'Germany', true, '2026-01-20T09:52:27.584Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('96232fcf-5d29-464d-aca2-8afcb352df67', '1efffbf4-07ff-4307-a49d-b9198c5fff03', '40', 'Friedrichstraße', 'The Nail Bar', 'davienails999@gmail.com', '', 'Friedrichstraße 40', '', 'Mönchengladbach', '41061', 'Germany', true, '2026-01-20T09:52:28.358Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e73ddae0-bbb4-4d77-b8da-6cd685552f83', '46f288a2-3e79-4f60-9b6b-7bbdf6f77baf', 'Dung', 'Nấm', '', 'davienails999@gmail.com', '+420608914999', 'Selbská 1204/9', '', 'Aš', '35201', 'Czech Republic', true, '2026-01-20T09:52:30.133Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3e5c6b91-4e94-4884-a601-f4db0efe43fb', '9e5317b6-be35-4789-95b9-88ca525aaf47', 'nhung', 'luu', '', 'davienails999@gmail.com', '+421949298769', 'Nevädzová 6', '', 'Ružinov', '82101', 'SK', true, '2026-01-20T09:52:30.576Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('61bca8c7-f0d6-420f-b9ec-44ab531f0fcc', 'a7f1a2bc-1ee6-4628-92f4-50a62ec01b4b', 'Linh Vu', 'Thuy', '', 'davienails999@gmail.com', '+420776676868', 'Puchmayerova 117/7', '', 'Chomutov 1', '43001', 'Czech Republic', true, '2026-01-20T09:52:31.355Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f1ce26d5-cd25-47d3-bdd1-7cfc2230cf3b', '94e52672-c4a4-4e78-90e1-6ded9adfb501', 'An', 'Nguyen', '', '', '778090689', 'c Nguyen Minh 23', '', '', '38273', 'Deutschland', true, '2026-01-20T09:52:33.794Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('365c5a5f-4a83-44b1-b9c8-cdc1baf26142', '9da06b4d-20f7-4a62-8cc1-fd759738cc8e', 'trang.le.7712', '', '', '', '', 'a em là Hartigova 85', '', '', '', 'Deutschland', true, '2026-01-20T09:52:34.904Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('815aeb29-62f2-4432-8f5d-c5564731fb98', '0e9ce62c-f99a-40bf-ac14-2dccb7c06f13', 'Nguyễn', 'Thuý Nga', 'USA Nails', '', '', 'USA Nails', '', '', '', '', true, '2026-01-20T09:52:35.347Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('57c30140-169f-444c-acef-ea5aa9773ccb', '252c3d0c-3195-42d0-80ba-f9ecc1b84a83', 'Aurelia', 'Sara', '', '', '', 'pickup', '', '', '', '', true, '2026-01-20T09:52:35.791Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2f280b26-f424-451e-b5df-9d23961d2ff6', 'fa91d8b6-a64e-4272-9cdc-9360ebd7ec41', '100029772220520', '', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:52:36.234Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e7035153-b54b-40a2-97bd-0e049f481420', '08d854f3-b292-4070-9f54-e2b1b524b63c', '39', 'Pražská', 'ANY NAILS Beauty Studio', 'davienails999@gmail.com', '+420777843456', 'Pražská 39', '', 'Plzeň', '30100', 'Czech Republic', true, '2026-01-20T09:52:36.679Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f0cb465b-c9df-41f6-b66f-d1c74997a89a', '5c764fba-f3a3-4c60-87aa-ca6ffbceb7e9', 'Duong', 'Anh', '', 'davienails999@gmail.com', '+420773692255', 'Masarykovo nám. 8/15', '', 'Říčany', '25101', 'Czech Republic', true, '2026-01-20T09:52:37.123Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('14645a14-0b8f-42e4-8ae5-50704229c09e', '6333bba5-c9d1-405a-848f-7c20197f7e6b', 'to Toe', 'Tip', '', 'davienails999@gmail.com', '', 'Visstraat 13', '', '''s-Hertogenbosch', '5211', 'Netherlands', true, '2026-01-20T09:52:38.897Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8dd66077-4b35-4652-a986-789f4a3ad561', 'd83b563b-53db-4b8f-ba60-3e4edf702df7', 'Mỹ', 'Dung', '', 'davienails999@gmail.com', '16556', 'Bahnhofstraße 2', '', 'Kerpen', '50169', 'Germany', true, '2026-01-20T09:52:39.673Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eb97bfe3-13a1-4fd2-b164-241da2478f0c', '3b1ca246-0fb0-4238-b430-df3f96e1dbcf', 'Dieu linh', 'Nguyễn', '', 'davienails999@gmail.com', '+420773168401', 'Dlouhá třída 860/1a', '', 'Havířov 1', '73601', 'Czech Republic', true, '2026-01-20T09:52:40.132Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4a5016c4-b153-4ba8-9763-3babdb1ec147', '2e962ece-623f-42da-a038-34c673ed5eff', 'Hai Anh', 'Vu', '', '', '607471140', 'nám. Soukenné 2a', '', '', '', 'Deutschland', true, '2026-01-20T09:52:41.586Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('42897a79-26b0-4510-93e8-341c4af1bdfb', '1ee93e5e-7ea1-4958-9b59-d5bf0fe1fa22', 'văn tuân', 'Nguyen', '', 'davienails999@gmail.com', '+420792610116', 'Potůčky 73', '', 'Potůčky', '36235', 'Czech Republic', true, '2026-01-20T09:52:42.698Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('441015cd-3904-4f5c-b0a1-0cdf03f6a8b4', 'e7052a9f-05e5-4a82-b3a0-762a6e167a3c', 'Uyên', 'Lê', '', 'davienails999@gmail.com', '+420771195999', 'Americké armády 77', '', 'Sušice I', '34201', 'Czech Republic', true, '2026-01-20T09:52:43.142Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ac34b676-c7d6-4ebd-b5ae-e4d137685641', 'd8aa9e56-8d73-47d8-abd7-6d211decb3e6', 'van chung', 'giap', '', 'davienails999@gmail.com', '+420773897789', 'Libušská 319/126', '', 'Praha - Písnice', '14200', 'Czech Republic', true, '2026-01-20T09:52:43.586Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0e16c571-5e3d-42ef-83d8-fccafac8cc27', '5097bd1b-3963-4215-b6e7-6ca1680d116c', 'Hoa', 'Tran', '', 'davienails999@gmail.com', '+420776882315', 'náměstí Svornosti 2573/6', '', 'Brno 16', '61600', 'Czech Republic', true, '2026-01-20T09:52:44.032Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('98b5cf66-30d8-4cde-a7fb-ee886b728051', 'aae8b9c8-af10-448a-b714-8c61bf8f4d1a', 'My Anh', 'Tran', '', 'davienails999@gmail.com', '+420770609888', 'Přátelství 1300/44', '', 'Praha - Uhříněves', '10400', 'Czech Republic', true, '2026-01-20T09:52:44.480Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('989ba0fd-c934-479f-aa4a-3772b72606b9', '1c704bfb-3e5f-40d1-8279-1494f6072fde', 'Nhất phương', 'Duong', 'König Nails', 'davienails999@gmail.com', '', 'Königstraße 108', '', 'Krefeld', '47798', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('74efbe8a-a5e7-4fab-a158-83dd752f26d8', 'd3da75be-de5a-49c9-a804-49051f47d3e9', 'Trang Tran', 'Huyen', '', 'daris.ostrava@gmail.com', '705922808', 'Hlavní Třída 15', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('00fad551-e749-4d95-a30f-34ef219d57f0', '7bebf07a-f56a-498d-931c-be366fa7da1e', 'Mia', 'Trần', '(Mai beauty concept)', '', '40801', 'Tř. 9', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('23ed791d-8d48-4671-a912-142959363bc9', '16f9ff9a-3ff1-43f6-a7ca-be2c9a6749be', 'Huong', 'Tran', '', '', '', 'null', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b2ccf96-2dcf-40ec-aad1-f88f8fc15776', '659d2292-27e4-4145-8c8a-f8490d925746', 'Zoulikova', 'Kristyna', '', 'davienails999@gmail.com', '+420720582282', 'Stožice 47', '', 'Stožice', '38901', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9aedb4e0-3463-4879-93c4-f5041dda1f79', '5bcc9e20-28a1-4781-a95a-73753b32a677', 'Anh Hung', 'Pham', '', 'davienails999@gmail.com', '015202040104', 'Hauptstraße 402', '', 'Weil am Rhein', '79576', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c6760a78-fc07-4e53-9bd0-1e1f85725cc1', 'babf47c3-e459-4e87-8585-1e14e9825f76', '4', 'Biegenstrabe', 'Anna Nails im Lahn Certer', 'davienails999@gmail.com', '', 'Raiffeisenstraße 4', '', 'Nördlingen', '86720', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('60277e87-1897-4fa9-843c-18952c102a2d', 'bd062b2d-217a-4cb6-8f21-97f623f6c366', 'Duongthao', 'Dang', 'Nails & Friseur Salon Selbská 1408/16', '', '', 'Friseur Salon Selbská 1408/16', '', '', '1408', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('55553b20-59f5-45a8-afaf-c140d21607b1', '39720907-64c7-4b75-a530-0020b4a628bc', 'hoang yen', 'Nguyen', '', 'davienails999@gmail.com', '', 'Aachener Straße 1253', '', 'Köln', '50858', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e484ae40-d944-4521-8038-a34fde1abbee', 'd0fcae57-7eaa-4027-89de-41c16ef1a4aa', 'thanh truong', 'Tong', '', '', '608382275', '. Máje 878/22', '', '', '46007', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9c6a0762-d616-4507-a7eb-23414407152c', 'b793b72b-7739-4a05-b4a0-257861aae65c', 'NUONG LE', 'THI', '', 'davienails999@gmail.com', '', 'Dossenheimer Weg 37', '', 'Schriesheim', '69198', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0a945540-c044-4284-8f5d-84936597827b', 'fb878c0e-bada-4592-a069-f7e4ec097867', 'Thuy Tieu', 'Tien', '', 'thuytien26691@yahoo.com', '+31640901868', 'Lutulistraat 16', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ff11e05c-6733-43ec-8be6-5d0c2528a694', '02cd71a2-7e36-4d10-a75b-dfbae92276a0', '443 268', '608', 'Le NAILS Nehtové studio', '', '608443268', 'nám. Jana Žižky z Trocnova 79', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d67abf53-f17d-42b3-8b38-fda95af03496', '43ea8d9f-db8d-4a68-a742-4df67554deab', 'Vu', 'Duong', '', 'davienails999@gmail.com', '+420773082599', 'Komenského 82', '', 'Přeštice', '33401', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e05dc890-6d96-451b-923d-4c5dae5030ef', '98bd8e7e-6db3-4ecc-8baa-efc8613f8cd3', 'Thi Thu Nga', 'Lê', '', 'davienails999@gmail.com', '+420778062999', 'Msgre. B. Staška 79', '', 'Domažlice - Hořejší Předměstí', '34401', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('db641d99-8eb5-4e6f-ae38-0a00cd8783dc', 'f126bfc1-4b74-4f58-837b-bf0007d81c7a', 'Tai Tran', 'Ngoc', '', 'davienails999@gmail.com', '', 'Eberstädter Straße 59', '', 'Pfungstadt', '64319', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('35bb5492-2153-4443-a88f-34f58e599548', '32d3d14a-6ab2-44b6-89a1-47486e6a7b28', 'Imbiss', 'Vietnam', '', 'davienails999@gmail.com', '', 'Str. d. Einheit 26A', '', 'Sömmerda', '99610', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d628c4c9-da2e-43db-b89b-31515726c110', 'c51b9c9e-f479-436c-9d37-ea5c4487ecfc', 'Nguyễn', 'Anna', '', 'davienails999@gmail.com', '77635962', 'Lipová 1841/12', '', 'Most 1', '43401', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('34feb3f3-ef96-4066-9a2c-6629e68046fc', 'f77da3e5-706f-441c-987e-d4a516dbe036', '83620', 'Münchenerstr.5', 'Emi nails( pham)', '', '583620', 'Emi nails( pham); Münchenerstr.5  83620; Feldkirchen-Westerham', '', '', '83620', 'España', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('34bdf1a3-8317-4dce-9061-eccbb48c7519', '6923464c-dbb9-4e40-b850-a2451e8c2265', '3', 'Johannisstraße', 'DIAMOND NAILS', 'davienails999@gmail.com', '', 'Johannisstraße 3', '', 'Eisenach', '99817', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b7b3f094-e7cd-43cb-85e0-84a0207f6df6', 'f29eb09d-210d-40ce-bcfd-61d7c13e62ae', 'linh.elis', '', '', '', '', 'Pickup', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('776eab62-d1f0-49be-a433-a59be55cb734', 'aeca918d-b823-4a1d-a9b6-6a75e0b77f29', '10', 'Marktplatz', 'Look beauty nails langenfeld GbR betzler', 'davienails999@gmail.com', '', 'Marktplatz 10', '', 'Langenfeld (Rheinland)', '40764', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9ba1eb24-c2d6-4bb3-9bf5-09d6958531a0', 'b54e99ba-e66a-4113-8e70-eb4f5d346a13', 'diem le nguyen', 'Thi', '', 'davienails999@gmail.com', '', 'Hauptstraße 110', '', 'Viersen', '41747', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d11c4b73-d1e2-4d71-a8c9-339eb3a83023', '304af1c1-6af0-4ab3-ae3f-5250d5b77c54', 'Nguyen', 'Nhung', '', 'davienails999@gmail.com', '+420773227888', '5. května 151/1', '', 'Litoměřice 1', '41201', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('edd51a85-6e38-4ef6-97c2-2fc666ba55e8', 'dacf4d44-0df0-4d66-9fc0-9cf2ea9db80b', '2D', 'Steinstrasse', 'ALINA BEAUTY NAILS & SPA', 'davienails999@gmail.com', '01629103986', 'Steinstraße 2D', '', 'Moers', '47441', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('64a80038-d02b-4f24-8dc9-d39ca0a6d10f', '91aa9402-2bae-4f02-8490-299511348ada', 'ngoc Tuan', 'Nguyen', '', 'davienails999@gmail.com', '', 'Marktstraße 64', '', 'Burgdorf', '31303', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5d03c292-8c4d-47a8-b721-28c689402494', '9cbbbaac-187d-4cbc-9649-03a0c270910c', 'tiến Dũng', 'Đào', '', 'davienails999@gmail.com', '', 'Kaiserstraße 26', '', 'Saarbrücken', '66111', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('69074136-0086-4368-b252-2844d7659ab6', '40ff0743-8f1f-4ed0-80ea-85b17f0fe884', 'Phùng', 'Tuyết', '', '', '', 'Door', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5546d8e0-4890-44ee-bf6b-048f8ac5b99b', 'e1ccdab9-32cf-4569-995a-773b1b5cba32', 'Sadny', 'Bn', 'Đc: nguyen giang hương. Peony nail care. Pred trati891/2. Havirov 73601. Tel', '', '777331368', '. Havirov 73601', '', '', '73601', 'Österreich', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cf77c6ba-7bc2-4815-be42-2a8a57735593', 'fd198281-e6da-4b2a-85cb-717637f6387e', 'diep chi 774989918', 'Tran', '', '', '774989918', 'Tran diep chi 774989918', '', '', '', 'España', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('311263d6-3ee8-4921-86da-dae279d24a48', 'dea165ee-05b6-4220-bb8f-2d9fc03c9ed7', 'Huyen Trang', 'Nguyen', '', 'davienails999@gmail.com', '+420775466888', 'Pařížská 996/8', '', 'Ústí nad Labem-centrum', '40001', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('63bb40e5-bd5d-452e-ab70-0b9f87db4fa4', 'e8779a46-4168-44d2-8b05-3cc0d0f7997c', 'Trần', 'Cẩm Linh', '', 'davienails999@gmail.com', '+420778045188', 'U pošty 401/12', '', 'Brno - Starý Lískovec', '62500', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('49de5639-8a65-4a6a-a900-094a9db65659', 'd9c6c548-2b78-4daa-8a3c-7e4bfc93b17a', 'bui', 'hana', '', 'davienails999@gmail.com', '+420773867989', 'U dálnice 777', '', 'Modřice', '66442', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f115d6b5-4a55-4eab-8344-1142ef9574f5', '81652e1b-d044-4f4e-9fb1-86a5eed8f817', 'Straße 37', 'Sophien', 'David Nails', 'davienails999@gmail.com', '', 'Sophienstraße 37', '', 'Baden-Baden', '76530', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f1861c4d-b442-4dd9-a675-512adfc7b360', '7cdf4463-9cc8-420c-ac82-3ba9e243a0c7', '5a', 'Markt', '', 'davienails999@gmail.com', '', 'Markt 5a', '', 'Soest', '59494', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('368de0f9-142d-4305-89b7-b3704608718b', 'ea99d395-3a4f-4722-83d1-55add229cf5e', 'Thi Vu', 'Nguyen', '', 'davienails999@gmail.com', '', 'Ekkehardstraße 5', '', 'Singen (Hohentwiel)', '78224', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('20f767c3-f36e-460a-96cb-60814b91c220', '08f6571e-8c2d-4dc9-ab19-780d624d039b', 'Aventin Jihlava', 'OC', 'Hana Nails Lab', '', '', 'Hana Nails Lab ; OC Aventin Jihlava', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d1b956fd-c29f-49fb-9a76-d4b7fa013197', 'b3848b4b-62ad-41e5-9cb1-a7c694b991c5', 'Nguyễn', 'Huy Hoàng', '', '', '', 'inter', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('215a2762-681b-4176-82b8-29272aada403', '3517f048-6004-4258-b8bc-d3b52a25f666', 'Minh Khang', 'Pham', '', 'davienails999@gmail.com', '67655', 'Rheinstraße 7', '', 'Waldshut-Tiengen', '79761', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3981e209-a2b5-400c-9009-79864db3c761', 'd1d5d008-c0dd-4035-b3bd-351b6ce42262', 'Thu Nguyen', 'Thi', '', 'davienails999@gmail.com', '', 'Groner Straße 9', '', 'Göttingen', '37073', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a84699ee-74dd-4551-9b38-dcca996928ba', '4e76c818-c4fe-4dd5-ac5a-133964a256db', 'Thu Trang', 'Pham', '', '', '2642888', 'Pham Thu Trang; Nail Bar Wicklow; 9A Main Street,Corporation Lands, Wicklow, A67 E954, Ireland; +353 (89) 264 2888', '', '', '2888', 'Österreich', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b3c6b121-095a-4633-b9ee-6064099390eb', '90bd0297-7069-42f9-b6be-435e98068e7a', 'Ngoc', 'Ha Nguyen', 'E ship cho chị ra tiệm cô Yến ở trung tâm ( American Naills ) , e hỏi chị Hương Bé', '', '', 'E ship cho chị ra tiệm cô Yến ở trung tâm ( American Naills ) , e hỏi chị Hương Bé', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b1389b01-5898-4abe-92f7-f777094ddf1e', '1eeb05f1-0862-4fbf-9cfb-63c29dbba7ca', 'quanghung.ha.9', '', 'Styling beauty salon prazská 2179/23b jablonec nad nisou . Viki studio .sdt :775918418', '', '775918418', 'Styling beauty salon prazská 2179/23', '', '', '2179', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f5696a3a-bb76-4b81-a1af-1613fb608f95', 'ed447d56-5946-4f37-b082-12a815e4b471', 'thị hằng nga', 'Phùng', '', '', '', 'Phùng thị hằng nga', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('61c913d9-5ba3-45d6-9408-144b6bda68f7', 'fa39a9a7-99cf-4fe9-8710-1f9779234c1a', 'Vu', 'Hang', '', 'davienails999@gmail.com', '+420770646875', 'Komenského 5320/18', '', 'Jablonec nad Nisou', '46601', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b52a106d-bf0c-4c78-87f5-c3e0726d1cd7', 'e9a97b4c-c608-4020-b88b-f95854768888', 'Tran Thi', 'Tu', '', 'davienails999@gmail.com', '+420601314467', 'Čečínská 28', '', 'Bělá nad Radbuzou', '34526', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('78ad7119-488f-45b2-b5c2-a7f848e41d8f', 'b4a0d984-0969-4e6c-80c2-e367d6d29ca6', 'Tuyet', 'Mai Hoang', '', '', '', 'svaty', '', '', '', 'Österreich', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ab8d083a-bae0-4f30-afe6-93153ff8958a', '4be8c372-b785-4c8f-9faf-f6bebd64c387', ': Nhung nguyễn', 'Đchi', '', '', '608914999', 'Lipovy dvur - selbska 1204/9', '', '', '1204', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c33e90d4-8d82-49ac-9f57-31f7f42e8380', 'f9288c3d-33a2-4949-8124-a67586217480', 'Dung', 'Kim', '', '', '', 'Kim Dung', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('446d7be7-cca3-48e5-8ff3-8832ea108dbd', 'd6c6cf3c-09e5-47d8-9161-079f1d30cc10', 'Trần', 'Anna', '', '', '', 'KD', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('65004dcd-c4d9-460e-a9b0-a3dcd0c055db', '96182eed-711c-41c8-8cda-e4286e63c800', 'anh', 'Lan', '', '', '', 'Lan anh', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9b7615ce-a9be-47b6-b5f7-837cdbe31803', '771a53cd-6e68-4f51-9122-a8e6a13e3f03', 'Thi Hai Yen', 'Ho', '', 'davienails999@gmail.com', '+420775698999', 'Žižkova 463/11', '', 'Kralupy nad Vltavou', '27801', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('aaae0089-8f81-4da1-a39c-71b22cfc7365', 'ebefa23f-005f-409c-822f-d1ee47ecf6a1', 'nguyen.kn21', '', '', '', '+34632864839', 'Họ tên: Như Ý Trần; Địa chỉ của mình: Calle Manifestación, số 11, (Glamo Nails) 50003, thành phố Zaragoza, Spain; sdt: +34 632864839', '', '', '50003', 'España', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3d105ab0-64b5-4788-a7e4-1d2da23cd25e', '82cc85ce-00a6-4c9d-a6dd-43464138e14e', 'Hengelosestraat 15A', 'Korte', 'Bon Bon Nails', '', '', 'Korte Hengelosestraat 15A', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c58afc88-1ffb-4919-8844-ae1d16cb2932', 'cf5195f6-0a46-4e7b-aa70-565a4fdfea60', 'Dung Mlasko', 'Thuy', '', '', '', 'Thuy Dung Mlasko; Jumi Nails ; Kaiserstr.26,66111 ; Saarbrücken, Deutschland', '', '', '66111', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('023f3689-6165-4f36-9da7-f7f90e9140eb', 'c17305ae-d0ba-4c32-9912-44e6559c40c2', 'Cao', 'Thị Dung', 'Retro Nail Spa 2', '', '03401', 'Retro Nail Spa 2', '', '', '1319', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('10921bef-2d7d-4f90-8482-25294c1162ba', '6726be83-db69-42ae-b131-e197d9e345ce', 'Hùng', 'Vũ', '', '', '', 'ok b ship cho mình đến; ; Chic Nails; Ulmer str.19; 86154; Augsburg', '', '', '86154', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0f8fa64d-96ff-401e-ba4b-208bd3dfc7c3', '7b571e1c-09a9-4bf0-9281-7abe775dc55c', 'thi ngoc', 'Doan', '', 'davienails999@gmail.com', '+420778081994', 'Havlíčkovo náměstí 164', '', 'Havlíčkův Brod', '58001', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d8699eea-ac79-4204-ae59-414585bde403', '76c19750-993c-43f8-aa85-767db1518869', 'Nguyen', 'Linh', '', 'davienails999@gmail.com', '0686243889', 'Koekoekstraat 62', '', 'Gouda', '2802', 'Netherlands', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d421a4cb-0ba8-46c7-8289-1b0fef514e70', '182f336f-6493-457d-940e-b4687e5223b3', 'thị hằng nga', 'Phùng', '', '', '', 'Phùng thị hằng nga', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c3e9f99d-b721-4d33-a344-90e6dcca6cea', '91970962-158a-4140-bb21-7bb39b52362f', 'Hương Hoang', 'Thi', '', 'davienails999@gmail.com', '', 'Bahnhofstraße 35', '', 'Buchloe', '86807', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b4245d9a-35e1-4398-a16a-a25155563fcc', '6c760bc6-3a99-4c5c-bf39-3ea05917103b', 'Lê', 'Thanh Loan', '', '', '', 'PiAy', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ead3d27a-57d5-42cf-be37-dff7057016fd', 'b728a854-62e2-4040-8eb8-c687009c1517', '100006032410941', '', '', '', '', 'K Šalamounu 3347', '', '', '3347', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d6586fd0-6e5d-45a6-b819-e9229e5ec9d1', '3b91ca0f-7ffa-4ccc-a380-cd81906f5e0f', 'Place des Aubépines', '1', 'prettynails studio nails', '', '95170', 'prettynails studio nails; 1 Place des Aubépines; 951 70 Deuil-la-Barre', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('020fb253-c534-4e9f-9766-13f3a8349e42', '8b890340-acec-4964-87d2-bf2d18af58ab', 'Hung', 'Pham', '', 'davienails999@gmail.com', '+420774343922', 'Vilémovská 244', '', 'Dolní Poustevna', '40782', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4a050c3c-ff41-4e91-a4d3-be947ea030f5', '392c7860-70b2-4585-af80-b4d6171d3474', 'thị kim nhàn', 'Đc:phạm', '', 'davienails999@gmail.com', '+420774618278', 'Masarykova třída 484/25', '', 'Teplice', '41501', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4c0ccc84-cb1c-42d8-86a1-6a2eb5cc6673', 'a95a7355-4152-4474-be37-29062cbbea81', 'thi xuyen Hrncirska 53/18', 'Nguyen', '', '', '', 'Nguyen thi xuyen Hrncirska 53/18', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6f069bb2-5af1-4890-b154-bad21d721169', 'b93f8634-1f0a-4776-aae0-4cbcb4237bf6', 'dan vinh', 'huynh', '', '', '', 'Lindenallee 20', '', '', '74613', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c72e4d5f-f1c3-4b14-9826-b64ba8613897', '0dc6754a-3c65-4004-aefd-0197a0f1e17f', 'nguyen', 'Vui', '', 'thihatran145@gmail.com', '07737548395', 'Vui nguyen ; Musselburgh Nails & Spa; 88A north high street , Musselburgh . EH21 6AS. Uk; 07737548395; thihatran145@gmail.com', '', '', '', 'Österreich', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a7da17ce-2aa9-4836-b03b-b9446762e70a', 'd19d38ee-9427-48e8-a1e4-b795b01e51b8', 'Viet Diep', 'Dang', '', 'davienails999@gmail.com', '+420723735115', 'Karlovarská 401', '', 'Pernink', '36236', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c1f66a62-47b7-4ada-9095-17a9825950f3', 'b3510d70-27dc-46bd-a364-3a726a51f14e', '1109/36', 'Krmelínská', '', 'davienails999@gmail.com', '+420721343666', 'Krmelínská 1109/36', '', 'Ostrava - Hrabová', '72000', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4a089a24-9929-42ef-a692-adcbbe1ad555', 'bcf284c5-a73d-49a6-a136-d95c0f0bcfc2', '170/172', 'Hauptstraße', 'Fashion Nails Nagelstudio', 'davienails999@gmail.com', '', 'Hauptstraße 170', '', 'Bergisch Gladbach', '51465', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fe7eb6aa-a23f-413c-9061-edcdc0e6eda8', '4cde2f37-2127-4929-8ed2-88e342bd682c', 'Hoàn', 'Hoàn', '', 'davienails999@gmail.com', '', 'Eiserfelder Straße 170', '', 'Siegen', '57072', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fa6196cf-8730-41d2-a833-70efa699e1c0', 'a5c50474-9468-46d4-b386-d39a36546b29', 'trannhatduc', '', '', '', '', 'WPS Nhat Duc Tran 18827', '', '', '18827', 'Österreich', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9a8e2dc4-55d4-43e8-a1f1-6637afc6a6ba', 'b8033e73-5f6f-4c3e-a78d-f3a3f74579be', 'Nguyễn', 'Hoài', '', 'davienails999@gmail.com', '+420792553362', 'Jana Švermy 23', '', 'Kadaň', '43201', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bfb27f74-5224-4f18-9fc3-5a21306329ee', 'acd76c10-55c6-4523-8e87-7507633f81eb', '104', 'Studánky', 'Queen - Beauty Palace', 'davienails999@gmail.com', '+420776090020', 'Studánky 104', '', 'Vyšší Brod - Studánky', '38273', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e9da66d0-42e3-4ed6-ac02-e2b092dfb0c3', 'd087f591-5a42-4777-8aaf-0d3dd6ac1fe9', '778 599 889', '+420', 'Hoa Nguyen Qnails Tesco tř. 17. listopadu 883/2a Karviná/Ráj 73401', '', '+420778599889', 'Hoa Nguyen Qnails Tesco tř. 17', '', '', '73401', 'España', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f4a40845-1fa5-479d-bdbf-b5568260673b', 'b9c18bc5-f1bf-491f-972a-fde8e289ca98', '838', 'Netroufalky', 'Nhi Le Thi Thao (Nancy Studio)', '', '', 'Netroufalky 838', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b52480fd-a63b-464b-a844-b211de5017cf', 'e2e1732b-3d74-4a49-bd37-08fc4b3d8841', 'Doan', 'Loan', '', 'davienails999@gmail.com', '+420778071983', 'Luženská 2725', '', 'Rakovník II', '26901', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5dfd3c71-0fd3-4a27-9d5e-de6d075d90e3', '20332b6a-9c20-4e0b-af4d-461879b84caa', 'tomas.td.1', '', 'T&T Nails', 'davie.lam01@gmail.com', '2640880', 'Jenaer Straße 26', '', 'Ratingen', '40880', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('14ffd43c-da90-46a6-88cb-b5f67f896f7a', '91966bc4-99ed-4d9f-93ff-bd02e0fee061', 'Thi Ly', 'Nguyen', '', '', '+420777070703', 'škovická 2637', '', '', '2637', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b530e58c-7230-4bea-9b35-ea05e6b74a62', 'e941a3b0-f456-4178-8688-0c8e452b2723', 'cạnh Bác Lập', 'tiệm', '', '', '', 'tiệm cạnh Bác Lập', '', '', '', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b550aad3-165d-42cc-815f-64c921e679d4', 'd9890270-7266-4d84-a6c6-c61056630ba6', 'Václava Klementa 824/38', 'Tř', '', '', '29301', 'Tř Václava Klementa 824/38', '', '', '', 'España', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a456b79d-783b-4646-94f8-b01561cd5a69', '24aa5e48-f274-4d14-85e1-7150f4f13aed', 'Čsl. legií 329', 'třída', 'Hana Nail', 'davienails999@gmail.com', '+420773281763', 'třída Čsl. legií 329', '', 'České Velenice', '37810', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e3eb29fb-1a35-4e29-9fc0-774800a02c3a', 'f43b72ac-11cb-4a7e-9b68-412bb028b18a', 'Thúy', 'Hằng Hồ', '', 'davienails999@gmail.com', '+420776290166', 'Štefánikova 2987/91', '', 'Zlín', '76001', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ff59ab9d-44ad-4260-8e34-56cb457e146c', '8297634c-dfed-4c11-a104-296d4741367e', 'Thị Thuỳ Dung', 'Nguyễn', '', 'davienails999@gmail.com', '', 'Bahnhofstraße 28', '', 'Wedel (Holstein)', '22880', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('cb7f2658-56bf-477e-9ac2-312439380620', '4d21c5e5-50eb-4a54-9288-894696ded9f8', 'linh phan', 'Thu', '', '', '01625988951', 'gegen über Aufsetzplatz 11', '', '', '90459', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('87b924b6-215d-4904-8981-8e6c2e0ae59d', '602be91f-ec0b-472a-bc31-1d088e331363', 'Tuyet', 'Anh', 'LyLynails', '', '', 'LyLynails; Manggasse17; 97421; Schweinfurt', '', '', '97421', '', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3b445247-efad-47b6-9a7d-3e78413f2672', '6ca987f9-88ad-4b14-a719-3fc527518fe2', 'Phạm', 'Thu Huyền', '', 'davienails999@gmail.com', '+420773603751', 'Hybešova 985/30', '', 'Brno - Staré Brno', '60200', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2e25ec5b-2e98-44e8-8535-de2cdedf97cb', 'ff09aaed-73bb-48bf-ad12-855bae2eccc5', 'Hà', 'Ngân', '', 'davienails999@gmail.com', '+420773991314', 'Mezi Trhy 110/5', '', 'Opava - Město', '74601', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('880cad35-32c3-4782-a4a4-71eb6da94825', 'e3fab928-f55b-4711-8a6a-53092efa91cc', 'HẰNG NGA', 'VŨ', '', '', '26101', 'Kelly Nails- tessco     .  Žežická 598', '', '', '', 'España', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5f9b204c-4b87-4eb6-9e32-32154c9ef73c', '1a50d84c-533a-4c27-ada1-9c3c17c302e6', 'Tesco Levice)', '(', 'Địa chỉ: Rubin Nails', '', '93401', 'rad 7', '', '', '', 'España', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('969b45f9-a37b-42ba-95a0-2f578848d8b3', '07243b3c-8818-4dd8-91a6-3b3609d69876', 'hoang long', 'nguyen', '', '', '777021984', 'masarykova 60', '', '', '40001', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4e0e39b9-c97c-46fc-8370-df0bea74d399', '5e5b4d95-4eb1-4c5f-b8c9-881a369e67ef', 'Dang- Purkynova 21-Libochovice-41117', 'Ha', '', 'davienails999@gmail.com', '+420777940789', 'Purkyňova 21', '', 'Libochovice', '41117', 'Czech Republic', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7f7e8289-470d-4cb3-bf21-f677369b3988', 'd4471abb-5863-468b-a92b-6ca430c27d2c', '38 41061', 'Bismarckstraße', '', 'davienails999@gmail.com', '3841061', 'Bismarckstraße 38', '', 'Mönchengladbach', '41061', 'Germany', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('365231fe-b180-42d5-9864-e06d103c7871', 'ceb9621e-d8e8-4196-a8b9-cdf74a7f947d', ': l_a_b@windowslive.com', 'Email', '', 'l_a_b@windowslive.com', '', 'Karl Zellerstraat 17', '', '', '', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2f657621-fbae-450d-ac45-44b6b8c8772a', '51dbd3f8-290a-41a0-9492-80ea9a584ccb', 'Hiền', 'Cao', '', '', '2166902', 'Brněnská 2937/21', '', '', '2937', 'Deutschland', true, '2026-01-20T09:53:09.790Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('694b3b1c-aec0-441b-8292-1d1b8c831a3e', '28e65745-fc7e-40ed-bc02-93e916b8bbfe', 'Tungnam', 'Pham', 'Phạm thị thủy. Salon nehty v Albert na radouci 1236.Mladá Boleslav 29301. 776673672', '', '776673672', 'y. Salon nehty v Albert na radouci 1236', '', '', '1236', 'España', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('32f17bf3-a63a-4e5b-99e4-4bcaebc30be0', '8259c6ff-aaa5-459d-bb8f-9a6af19604c2', 'Hoa', 'Thuy', '', '', '36235', 'Potůčky 171', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('08bf3b1b-8dcc-443c-9001-f35faf47ab9e', 'b58ce554-f618-4cd7-b92c-3a556c802b09', 'Křivky 1a', 'Petra', '', '', '', 'Petra Křivky 1a', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4cb5ec29-63df-487d-b09d-b36217814ac0', '1953cc60-0546-49ea-ae57-d9aeb4a48280', '1094', 'Bisonspoor', 'David Nails ( Nagelstudio)', 'Lucyngo1810@gmail.com', '640181087', 'Bisonspoor 1094', '', '', '1094', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('44d604b3-e947-4452-80fc-c7c68bd0ac8c', '63921430-8b1e-4a1a-aefa-afd9b215e218', 'svaty', 'Inspire', '', '', '', 'Inspire svaty', '', '', '', 'Österreich', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5f66d3c1-4c9f-4413-afa1-c97709130926', '5a101bc2-7c1a-4da0-a974-7c5a27f56bbb', 'Toan', 'Truong', '', '', '28038258', 'Firma : Tien Toan Truong; ičo :       28038258; Adresa: Československé armády 257/4, 500 03 HRADEC KRÁLOVÉ; tel: 776012456', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8c6d5e00-a5ff-4317-9fb0-079bc92a3bbb', 'c2f5f812-0b36-44cd-aed9-e2d1735660f0', '96/13', 'Hornohradebni', 'Tereza nail', 'davienails999@gmail.com', '+420776755999', 'Hornohradební 96/13', '', 'Beroun-Centrum', '26601', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('93bb485e-ac98-4102-bd40-c17e7c196db9', 'b80dee7a-9ef3-4789-b3e3-2527ee7718f0', 'luonge im myzeil', 'Cocoon', '', 'davienails999@gmail.com', '', 'Zeil 106', '', 'Frankfurt am Main', '60313', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('41bb361f-8a9d-4a9d-8658-3bf28932fb94', 'fd527281-bfad-4c9b-95f5-13145c6b1df3', 'DES FRIPPIERS 16', 'RUE', 'Qucen Nail', '', '', 'RUE DES FRIPPIERS 16', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b51fc289-bca2-46b1-b80d-af366ddfcf67', '96e6413a-2fdc-4a85-9aa4-b3fe980af47d', 'OAZA kladno', 'NC', '', 'davienails999@gmail.com', '+420776489886', 'Arménská 3277', '', 'Kladno - Kročehlavy', '27201', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('ed189681-fa98-4e34-9a87-9b27857e00d9', '009c92c7-7955-4882-92b4-7c8aedce1357', 'chỉ mình', 'địa', '', 'davienails999@gmail.com', '', 'Poststraße 12', '', 'Böbligen', '71032', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4f0c9cd7-dbff-4716-a0b1-9ac6c790bf88', '4c6f0587-7e10-4646-ba14-48a162c48273', '5LH47', 'Satamakatu', 'Vietnails', '', '0407773073', 'Satamakatu 5L', '', '', '', 'Nederland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f6219561-13a6-4731-87c8-154b01ad2414', '6daa1835-cc5a-4f72-94c1-4554213a6088', 'thi nguyen', 'thu', '', 'Haonguyenthi01@gmail.com', '', 'Forstweg 3', '', 'Jena', '07745', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bb9ff9d6-aa29-4584-bdf7-70825bce6a99', '84f77c67-7723-4dff-a81a-0c4be70a0b00', '722 478 839', 'Tel:', 'Nehtové studio Star Nails', 'davienails999@gmail.com', '+420722478839', 'Vrchlického 883', '', 'Louny', '44001', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9d5fcb38-da1b-412d-a09e-a6fe2e94f826', '406d2e3e-1372-497f-a313-60f9d52b700e', 'Nguyễn', 'Anna', '', 'davienails999@gmail.com', '+420770635962', 'Lipová 1841/12', '', 'Most 1', '43401', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c6547058-2733-48c4-a17b-739cb50b7391', '0c24248d-c354-40f3-be46-ec972cc31c6b', 'Huyền Nguyễn', 'Thu', '', 'davienails999@gmail.com', '', 'Straße der Einheit 46', '', 'Bad Belzig', '14806', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('73e2c170-ba3b-423c-9b48-0e841602a8d6', '71cafd83-fac9-4974-a23a-1dd1145af532', 'van cuong', 'tran', '', 'davienails999@gmail.com', '+420775536556', 'Hlučínská 1605/49', '', 'Opava - Kateřinky', '74705', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4a5bec43-d85e-4533-a037-fd446130312a', 'c7dbc997-d180-409c-b79a-fdfaf851f897', '773 869 889', '420', '', '', '420773869889', 'náměstí Míru 13', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e6b5c376-88d4-4755-aa3e-4478dad0b071', 'c701aa41-83eb-487a-a17e-fe74c89f9a16', 'Emilie', 'Nguyễn', 'Opatovska 1753/12, Praha 11, 149 00 ( Angel Nails nehtove studio- zluta terasa)', '', '14900', 'Opatovska 1753/12', '', '', '1753', 'Česko', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('3ebd12e2-01fd-4d42-8ff7-29bb19c7c608', 'd9373705-83e2-4421-887e-4085ed3bf0ac', 'THI HONG', 'DUONG', '', '', '775914956', 'Galerie  slovany  .nam gennerala piky 2703', '', '', '2703', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e27b4403-79c0-4973-b065-5663cf73a0b5', 'ee20c0c5-6353-4445-b13c-d89800212aec', 'Luu', 'Gia Bao', '', 'davienails999@gmail.com', '+420728999444', 'Kpt. Jaroše 70/29', '', 'Karlovy Vary - Dvory', '36006', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('60ee3539-8313-4874-93a4-ee749ede25d3', 'b56c5a09-d8d0-4635-8156-7a57ef1d8038', 'thi phuong', 'Nguyen', '', 'davienails999@gmail.com', '+420705679999', 'náměstí Míru 121', '', 'Domažlice 1', '34401', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b6334e46-c04e-4a68-919d-29b36d6fd5e7', '48cd8463-c044-4ed7-8831-29bdb8832029', 'chỉ: Anna tran', 'Địa', '', '', '721287793', 'Jana Palacha 3197', '', '', '3197', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('47fc98ca-7773-4b3d-91ce-c6cfc97a33b1', '04b680f5-d9c1-40ad-b6ec-6c8c02cc6fd7', '1153', 'Pospíšilova', 'DOLL NAILS NEHTOVE STUDIO', '', '50003', 'Pospíšilova 1153', '', '', '1153', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4b338f53-3f92-40ad-917d-2ebce65c5556', 'a5c21a94-357b-4949-9574-f8717b0f95d0', 'Tinh', 'Hong', '', 'davienails999@gmail.com', '+420720646820', 'Kobližná 57/20', '', 'Brno 2', '60200', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8e1257c5-856c-4968-87cb-fe2a35979774', 'bcd9b230-5fd2-4e07-be12-022875051560', 'Nguyễn', 'Hữu Hoàng', 'Nail salon .Horní 283/87 ostrava-Dubina-70030- tel.774270289', 'davienails999@gmail.com', '+420774270289', 'Horní 283/87', '', 'Ostrava - Dubina', '70030', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e69abaf0-666a-421d-b631-88af283e34a5', '29677b95-4c2a-4ac6-b2ee-71dfeffd4d4d', '1402', 'Katovická', '', 'davienails999@gmail.com', '+420774069453', 'Katovická 1402', '', 'Strakonice 1', '38601', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('5ee464f8-5a6b-4792-965c-9af2bb0891be', '60ec2ade-09c5-45ab-bd4c-75061a1eafb4', 'van duong', 'Vu', '', 'davienails999@gmail.com', '+420776833238', 'Krátká 4088/2', '', 'Hodonín 1', '69501', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('09b4f4ff-5ce7-4e45-a35d-1a11beced137', '803f9810-af91-447f-94ac-cc05e177ada7', 'văn chức', 'Nguyễn', '', 'davienails999@gmail.com', '+420776450069', 'Masarykova 351', '', 'Žatec 1', '43801', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('0d35ec58-0f44-4525-843a-0d63cfa313a2', '2a723080-ed5d-4a9c-949e-34e2029016c0', 'vinh', 'Phạm', '', 'davienails999@gmail.com', '+420792398368', 'Okružní 81/15', '', 'Litoměřice-Město', '41201', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('a5a097fa-7fad-489f-b97c-4aeb9c072065', 'a47f4c5d-5d11-4486-9beb-5fdadac7c55a', 'Thi Phuong Thao', 'Tran', '', '', '38273', 'Studánky 1', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f6f1606e-f89e-4cef-a6f1-fd0a116c0f97', '959610c8-283b-4734-bd43-fc6f16f6f846', 'Thi', 'Thu Hoaitran', 'Tran thi thu hoai New York nails Stuttgarter str 1 716 65 Vaihingen/enz', '', '171665', 'Tran thi thu hoai New York nails Stuttgarter str 1', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bf7b4e41-ece5-4e89-8138-3401211d3081', 'a14736dd-d91b-4d91-91a1-78acdcb9d707', 'str23 berlin 10437', 'Eberswalder', 'Lucie nails & lashes', '', '', 'berlin 10437', '', '', '10437', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('f82f3cf6-dfd8-49a6-aa1b-78664c50996c', '88cfc5d0-88c6-4407-b7b1-96712f904024', 'hong nhung', 'nguyen', '', 'davienails999@gmail.com', '+420774314029', 'Husova 623', '', 'Příbram 1', '26101', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('91ad953a-a3ef-4f6d-ab66-fdf2925b93a1', 'd42300a2-3ff1-43be-9910-27b9ffeda4a4', '1753/12', 'Opatovska', '', '', '', 'Opatovska 1753/12', '', '', '1753', 'Österreich', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('35ad58cc-8b66-4799-954f-6a43c65c7202', 'ff1e6054-ff14-40eb-b663-378428466425', 'Thi Ngoc Dung', 'Chu', '', 'davienails999@gmail.com', '', 'Hofmarkweg 5', '', 'Unterhaching', '82008', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6f742a08-4d52-415d-9164-d7051e01f192', '1b9d5c92-9f50-4749-b4b9-9bc56211c141', 'Giang Doan', 'Quynh', '', 'davienails999@gmail.com', '', 'Aachener Straße 1253', '', 'Köln', '50858', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b4ff3aa9-0f8b-4004-8ef2-8933a8bdbb4c', 'd1fcf959-21ea-40c9-8be5-4ee671dd425d', 'Vũ', 'Hiền', '', 'vuhien881994@gmail.com', '792572915', 'Třída Čsl. legií 624', '', '', '', 'España', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('995583d6-9a50-4bf7-a521-7e6bdc2ac7f6', '2f52cd9d-c21f-4e40-b6d5-415e1039aba7', 'Passage Laden 2.2', 'U-Bahn', '', '', '015227960799', 'U-Bahn Passage Laden 2', '', '', '0152', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('81fea2f5-58e0-43af-8aeb-5f5c099bfa5c', '9e045b5d-40fa-41c8-9fe0-4828ee90865e', 'Thi Thuong', 'Nguyen', '', 'davienails999@gmail.com', '+420774103553', 'Josefa Ševčíka 858/18', '', 'Most', '43401', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4baf2f5f-4e38-4c9b-82ef-e308c1ed1af7', 'd56789c4-8c79-4576-8f89-a4ca0e2fa85d', 'thi bich ngọc', 'nguyen', '', 'davienails999@gmail.com', '+420792399045', 'Kollárova 160/13', '', 'Kutná Hora 1', '28401', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('9a48b08e-4a9a-4409-9e21-373842447426', 'ebbc50e2-d734-407c-999a-a650f733ce11', '34-36', 'Töngesgasse', 'Long Vu-New York Nails', '', '', 'Töngesgasse 34-36', '', '', '', 'España', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('2ef72f8e-fea3-4cbc-a527-c68c2c5e7151', '56f4587c-92f5-4e58-ab5d-7a32a806b233', 'Quỳnh Hoa', 'Nguyên', '', 'davienails999@gmail.com', '21073', 'Wallgraben 43', '', 'Hamburg', '21073', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('270138ec-28c9-4dae-a927-e169e9c7cc0d', '83d43621-2d7d-4f5d-8105-19437ffae1ef', 'Nguyen', 'Roman', '', 'davienails999@gmail.com', '+420777288586', 'Lidická 1780', '', 'Vlašim', '25801', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eba337a9-ffcf-4ec7-8121-b432e324f45b', '13d772b3-ff16-42b2-aff0-94ecb12d0077', 'dang the nam', '792550323', '', '', '792550323', 'Ship a Vyšší brod studanky 20', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bc851860-e8dd-4adb-8313-bd8ce0b601a9', '28da9fb9-393e-4672-9085-68cf9862287f', 'Nguyen', 'Anh', '', '', '775258392', 'U letistě 2/1074', '', '', '1074', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('808c570f-44a6-4046-b67b-2dbdd6be1334', 'd9f3c74f-c292-4af0-bcf9-3899ac05f7e6', '1471', 'Horní', 'A&T Nails Beauty Salon', '', '+420775998999', 'Horní 1471', '', '', '1471', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('54588355-3a6c-410b-a40a-271dc7aa9629', 'f98b370e-662b-4571-84df-5fb3bb357402', '1', 'Makedonska', '', '', '', 'Makedonska 1', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('84a771e0-cc90-4dbd-9ca7-37c82353df0b', 'f6dd490a-9ba5-41fb-983e-4d9f1b14779a', 'del Passeig', 'Rambla', 'Candy nails', '', '', 'Candy nails; Rambla del Passeig', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('69212127-3519-4b01-a941-43d9b0fbabe8', '530ae434-52f1-4438-8e04-482b900fd9a0', 'chỉ:', 'Địa', '', 'davienails999@gmail.com', '+421902073444', 'Hledikova 2', '', 'Šurany', '94201', 'SK', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c5977267-fcc2-4659-aaa8-df473e28b47b', 'f024a58c-c910-41ed-b20c-5ec75e82007c', 'thì ngoc ha', 'Truong', '', '', '774168299', 'Hranicna 2572/9', '', '', '2572', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('6475a486-39b6-4a3a-9ce6-6dce0041dc37', 'aab853b3-31b4-4bc0-87f2-ff4976eb29e4', 'châu anh', 'Nguyễn', '', 'davienails999@gmail.com', '+420792397049', 'Strážný 13', '', 'Strážný', '38443', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('70cf2eb5-5dee-4b26-99c0-7f805ebab262', 'e4defeb5-85ef-4917-a91a-a39f046f42c2', 'Thuỷ', 'BaBie', 'Diamond Nails, Svatý', '', '', 'Diamond Nails, Svatý', '', '', '', 'Österreich', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('449254d9-d039-4c29-80e4-a60f009d85a9', '4e0a4cf5-f6c7-481c-a497-5c51262dbf61', '100083656260111', '', 'Viet Hung Luu. Nehtove studio.Gerska 2187/30H. 323 00. Plzen. Tel: 730 659 625', '', '730659625', 'Viet Hung Luu. Nehtove studio.Gerska 2187/30', '', '', '2187', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('eed78a5d-c701-4e80-aafe-061de3cadb6d', 'd0e1223c-e89f-42c9-a5f2-9a514cbdd5a7', '728 610', '+420', 'Beautiful Nail', '', '+420728610', 'TESCO - Rašínová t.r 1669', '', '', '1669', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4d37d86b-6aa0-47dd-9352-8414c419b374', '05ea596b-3676-411b-9d6b-b6de3e88b08a', 'Thị Thu Hương', 'Nguyễn', '', 'davienails999@gmail.com', '+420773488496', 'Vnoučkova 1699', '', 'Benešov', '25601', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('105a59c4-d818-4e87-9538-a17f71d9c314', '25bc9bbc-ab91-46cf-b74a-2d59b391aedc', 'Thi Nhung', 'Nguyen', '', 'davienails999@gmail.com', '+420773969821', 'Dolní Poustevna 294', '', 'Dolní Poustevna', '40782', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('11db3597-e3c4-4aaa-9ad8-fb0c61b5e287', '86caf0fd-3f20-4d97-8933-932dd15f5b3a', 'Thị Thoa', 'Vũ', '', 'davienails999@gmail.com', '', 'Blockgasse 8', '', 'Schwäbisch Hall', '74523', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('77529856-594f-4c3b-8980-1ce9019f0919', '2793147b-028d-4fca-a135-e709e01adcbe', 'Truong', 'Phuc', '', 'davienails999@gmail.com', '', 'Lindenstraße 1A', '', 'Bernburg (Saale)', '06406', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dc950b4a-de86-46d9-8679-0a177b3d3b9a', '748213bd-42cf-4e8e-b28a-529ba9b97160', 'Thuy Anh La', 'Thi', '', 'davienails999@gmail.com', '56073', 'Krämerstraße 21', '', 'Hanau', '63450', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('c8f3e11b-28c3-4e9c-934c-6270013c6ec7', '2f9db9ac-4754-4191-b060-0e4c69d140e9', 'chỉ e là', 'Địa', '', 'davienails999@gmail.com', '+420776637418', 'Studánky 106', '', 'Vyšší Brod - Studánky', '38273', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('fab840dc-0ac7-4396-8451-727f8300fcbd', '9e4333b1-37ea-4dd2-bc00-96423c57431e', 'Mai Duong', 'Ngoc', '', 'davienails999@gmail.com', '+420728408698', 'Michelská 1005/29', '', 'Praha - Michle', '14100', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d183ce0a-adad-4adb-831b-f294139636d7', '1e024ac3-e2ce-489d-8f00-1eaa92f16cec', 'Thị Nghĩa', 'Nguyễn', '', 'davienails999@gmail.com', '+420728596696', 'Husova 481', '', 'České Velenice', '37810', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7ecc4652-f1e5-4b1a-a5b1-6764b331c8e8', '02a49f75-0575-42a8-99b2-71e77f211094', 'Thi Thu', 'Bui', '', '', '33701', 'Palackého 194', '', '', '', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e96d200c-1283-4da7-b55e-b3f176966f85', '7ff7f35d-3da8-4633-842a-d11fe1d8ef33', '33 97411', 'Rudohorska', 'Yen Nails', '', '3397411', 'Rudohorska 33', '', '', '97411', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bb748ae1-a39e-480c-b7e5-d580e037be50', 'f052c667-f6a8-45b5-8f63-fe40ea4a112f', 'vannguyendk1998@gmail.com', 'Email:', '', 'vannguyendk1998@gmail.com', '+420721590288', 'Brandejsovo náměstí 496/8', '', 'Praha - Suchdol', '16500', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e7404502-3c8b-494d-b88c-867b10faa941', 'fff37a10-3308-4b73-8ade-a70cf32e16cc', 'trida 1225/44', 'Dlouha', 'Kieu Van ( Van Beauty Salon)', 'davienails999@gmail.com', '+420774901123', 'Dlouhá třída 1225/44', '', 'Havířov - Podlesí', '73601', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('92e5c51c-abbd-4324-91d8-fd371f0507f0', '380ec644-2f1c-4f77-818d-183616616710', '777 305 688', '+420', 'Salon Anna', '', '+420777305688', 'CENTRUM PIVOVAR Sofijská 2/3', '', '', '', 'Österreich', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e2497f86-9331-4603-bb0b-55066c6082c9', 'b11d6056-baac-414f-afbd-42448d0e05f0', 'Hue Nguyen', 'Thi', 'Sky Nails Drehscheibe 1.OG', '', '', 'Sky Nails Drehscheibe 1', '', '', '44787', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('bd542dff-0631-4e18-8cb8-9eb3ec329a29', 'bc91a037-00d4-4e7a-8ac3-d0c0df9f5935', 'Garyka Masaryka 1570', 'Tomase', 'Nail studio', '', '778011268', 'Tomase Garyka Masaryka 1570', '', '', '1570', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('42d52762-c19e-48fb-a044-01e56e825112', 'dffc3e45-d087-4eef-af03-2ca5f014a5ce', 'Thu Trang', 'Đo', '', 'davienails999@gmail.com', '', 'Rötelstraße 35', '', 'Neckarsulm', '74172', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('d67c12fc-28c8-4786-b447-80f424221b19', 'a37aeeb0-65d9-4896-8ead-4735f9137384', 'thiên trâm', 'nguyễn', '', 'davienails999@gmail.com', '+420774035889', 'Pražská 1544', '', 'Unhošť', '27351', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('7b4922c5-fb20-4f69-9d1c-9961bbefcca3', '4c67864a-595f-459b-a3b8-9825f97f436f', 'Thi Hanh', 'Nguyen', '', 'davienails999@gmail.com', '+420774508748', 'Husitská 2586', '', 'Varnsdorf', '40747', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('b9f648ca-b3fa-482b-9b0f-e10f42a6a8ec', '42e740bc-3be6-4986-afb7-32f752c7fb58', 'Trần minh Hưng', 'Hà', '', 'davienails999@gmail.com', '', 'Schleißheimer Straße 492', '', 'München', '80933', 'Germany', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('edb0b8d1-c35a-479e-8338-03188c6c2a53', 'f5c4800a-d077-43ac-8afe-f77236a5f31f', 'huyền my', 'Nguyễn', '', '', '1661231', 'Stresemannstraße 16-61231', '', '', '61231', 'España', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('4116b9ab-8be5-47c5-be2d-88e7ac7f6799', 'd0630bbb-f5d2-455e-ae96-6846c2764f98', '100008311184229', '', '420 Nails (Billa)', 'davienails999@gmail.com', '+420775681888', 'Škvorecká 2000', '', 'Úvaly', '25082', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('da05b2e4-b2c8-449a-a91c-e5a35da920b8', 'f270644d-63d5-42ac-8c78-3492c57bba17', 'huy hoang', 'Dao', '', 'davienails999@gmail.com', '+420705201489', 'Kurta Hubera 1088/16', '', 'Praha 9 - Čakovice', '19600', 'Czech Republic', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('452e32d7-1c18-48a6-bf72-643edab0c6c3', '34b1f232-9ee9-4810-8a32-ca3aed277e78', '142', 'Vinohradská', 'Le The Vo ( Eu Nails )', '', '13000', 'Vinohradská 142', '', '', '', 'Česko', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('dcdae42a-e9d9-4772-a566-b029baee6888', '82a8efd5-a07d-466b-a70b-8badeb1ed5ac', 'Thi Hai Yen', 'Le', '', '', '19800', 'Breicetlova 771/6', '', '', '', 'Česko', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('571df3e5-8c94-4fa3-bf7c-2057fb4f9e6c', '8009c8d1-e89f-4cb0-9115-04d2ede0c4d7', 'vietphannn3001cz@gmail.com', 'Email:', '', 'vietphannn3001cz@gmail.com', '12800', 'Spytihněvova 2', '', '', '', 'Česko', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('69374b53-9888-465a-8110-62de37cae785', '2b5d549e-e014-4d73-ad85-7086a8132e27', '370/81A', 'Chebská', 'Ana Kim Nails', '', '36001', 'Chebská 370/81', '', '', '', 'España', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('e1e5b502-82ee-4cf2-967f-c2d8cb83ba1d', 'ef9bedc3-430a-40d0-8378-47fcedbfb3d3', 'dinh', 'nhan', '', '', '631113039', 'nail 26', '', '', '43820', 'España', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');

INSERT INTO customer_shipping_addresses (id, customer_id, first_name, last_name, company, email, tel, street, street_number, city, zip_code, country, is_primary, created_at, updated_at)
VALUES ('8b08512b-e028-4413-b0f4-ffcffeba589a', 'c9a7ca43-cee8-4a8f-b476-ece8317fb7d4', 'trung tín', 'Nguyen', '', '', '+420608838628', 'Petrovice 209', '', '', '40337', 'Deutschland', true, '2026-01-20T09:53:10.034Z', '2026-01-20T09:59:22.147Z');


-- Verify: SELECT COUNT(*) FROM customer_shipping_addresses;
-- Expected: 1339

COMMIT;
