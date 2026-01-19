-- Facebook Data Migration Script
-- Generated on 2026-01-19T10:52:43.880Z
-- Total records: 902

-- Step 1: Add facebook_numeric_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'facebook_numeric_id') THEN
        ALTER TABLE customers ADD COLUMN facebook_numeric_id VARCHAR(50);
    END IF;
END $$;

-- Step 2: Update customers with Facebook data
-- Matching logic: URL contains the path OR path matches numeric ID in profile.php?id= format

-- Thanh Lam (ID: 100009615451106)
UPDATE customers SET 
    name = 'Thanh Lam',
    facebook_name = 'Thanh Lam',
    facebook_numeric_id = '100009615451106',
    profile_picture_url = 'https://graph.facebook.com/100009615451106/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%xon.xi.9279%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009615451106%'
    OR facebook_url LIKE '%profile.php?id=100009615451106%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ml Nguyen Tuan (ID: 100025859956448)
UPDATE customers SET 
    name = 'Ml Nguyen Tuan',
    facebook_name = 'Ml Nguyen Tuan',
    facebook_numeric_id = '100025859956448',
    profile_picture_url = 'https://graph.facebook.com/100025859956448/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyentuaneu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025859956448%'
    OR facebook_url LIKE '%profile.php?id=100025859956448%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đức Hoàng (ID: 100008667635004)
UPDATE customers SET 
    name = 'Đức Hoàng',
    facebook_name = 'Đức Hoàng',
    facebook_numeric_id = '100008667635004',
    profile_picture_url = 'https://graph.facebook.com/100008667635004/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008667635004%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008667635004%'
    OR facebook_url LIKE '%profile.php?id=100008667635004%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lê Thanh Loan (ID: 100004031329359)
UPDATE customers SET 
    name = 'Lê Thanh Loan',
    facebook_name = 'Lê Thanh Loan',
    facebook_numeric_id = '100004031329359',
    profile_picture_url = 'https://graph.facebook.com/100004031329359/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%le.thanhloan.10%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004031329359%'
    OR facebook_url LIKE '%profile.php?id=100004031329359%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thithanhmai Van (ID: 100004226651845)
UPDATE customers SET 
    name = 'Thithanhmai Van',
    facebook_name = 'Thithanhmai Van',
    facebook_numeric_id = '100004226651845',
    profile_picture_url = 'https://graph.facebook.com/100004226651845/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thithanhmai.van%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004226651845%'
    OR facebook_url LIKE '%profile.php?id=100004226651845%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuỳy Mýt (ID: 100008245623353)
UPDATE customers SET 
    name = 'Thuỳy Mýt',
    facebook_name = 'Thuỳy Mýt',
    facebook_numeric_id = '100008245623353',
    profile_picture_url = 'https://graph.facebook.com/100008245623353/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008245623353%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008245623353%'
    OR facebook_url LIKE '%profile.php?id=100008245623353%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nha Chinh Nguyen Thi (ID: 100000462542992)
UPDATE customers SET 
    name = 'Nha Chinh Nguyen Thi',
    facebook_name = 'Nha Chinh Nguyen Thi',
    facebook_numeric_id = '100000462542992',
    profile_picture_url = 'https://graph.facebook.com/100000462542992/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nhachinh.nguyenthi%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000462542992%'
    OR facebook_url LIKE '%profile.php?id=100000462542992%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hien Buiova (ID: 100000108121023)
UPDATE customers SET 
    name = 'Hien Buiova',
    facebook_name = 'Hien Buiova',
    facebook_numeric_id = '100000108121023',
    profile_picture_url = 'https://graph.facebook.com/100000108121023/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hien.buiova%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000108121023%'
    OR facebook_url LIKE '%profile.php?id=100000108121023%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kem Đá (ID: 100007972503238)
UPDATE customers SET 
    name = 'Kem Đá',
    facebook_name = 'Kem Đá',
    facebook_numeric_id = '100007972503238',
    profile_picture_url = 'https://graph.facebook.com/100007972503238/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007972503238%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007972503238%'
    OR facebook_url LIKE '%profile.php?id=100007972503238%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Anna (ID: 100029833685218)
UPDATE customers SET 
    name = 'Trần Anna',
    facebook_name = 'Trần Anna',
    facebook_numeric_id = '100029833685218',
    profile_picture_url = 'https://graph.facebook.com/100029833685218/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029833685218%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029833685218%'
    OR facebook_url LIKE '%profile.php?id=100029833685218%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cao Hiền (ID: 100007910708832)
UPDATE customers SET 
    name = 'Cao Hiền',
    facebook_name = 'Cao Hiền',
    facebook_numeric_id = '100007910708832',
    profile_picture_url = 'https://graph.facebook.com/100007910708832/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hien.cao.5855594%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007910708832%'
    OR facebook_url LIKE '%profile.php?id=100007910708832%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lucka Nguyen (ID: 61584508072689)
UPDATE customers SET 
    name = 'Lucka Nguyen',
    facebook_name = 'Lucka Nguyen',
    facebook_numeric_id = '61584508072689',
    profile_picture_url = 'https://graph.facebook.com/61584508072689/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61584508072689%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61584508072689%'
    OR facebook_url LIKE '%profile.php?id=61584508072689%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phương Nga Phạm (ID: 100005201348318)
UPDATE customers SET 
    name = 'Phương Nga Phạm',
    facebook_name = 'Phương Nga Phạm',
    facebook_numeric_id = '100005201348318',
    profile_picture_url = 'https://graph.facebook.com/100005201348318/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005201348318%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005201348318%'
    OR facebook_url LIKE '%profile.php?id=100005201348318%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Angela Bao Ngoc (ID: 100002919361590)
UPDATE customers SET 
    name = 'Angela Bao Ngoc',
    facebook_name = 'Angela Bao Ngoc',
    facebook_numeric_id = '100002919361590',
    profile_picture_url = 'https://graph.facebook.com/100002919361590/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%baongoc1411%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002919361590%'
    OR facebook_url LIKE '%profile.php?id=100002919361590%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- David Tran (ID: 100013229712192)
UPDATE customers SET 
    name = 'David Tran',
    facebook_name = 'David Tran',
    facebook_numeric_id = '100013229712192',
    profile_picture_url = 'https://graph.facebook.com/100013229712192/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%david.tran.7355079%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013229712192%'
    OR facebook_url LIKE '%profile.php?id=100013229712192%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Uyên Lê (ID: 61560222472633)
UPDATE customers SET 
    name = 'Uyên Lê',
    facebook_name = 'Uyên Lê',
    facebook_numeric_id = '61560222472633',
    profile_picture_url = 'https://graph.facebook.com/61560222472633/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61560222472633%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61560222472633%'
    OR facebook_url LIKE '%profile.php?id=61560222472633%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lan Anh Hoang (ID: 100001291464550)
UPDATE customers SET 
    name = 'Lan Anh Hoang',
    facebook_name = 'Lan Anh Hoang',
    facebook_numeric_id = '100001291464550',
    profile_picture_url = 'https://graph.facebook.com/100001291464550/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lananh.hoang.7106%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001291464550%'
    OR facebook_url LIKE '%profile.php?id=100001291464550%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Maika Nguyen (ID: 61565699990249)
UPDATE customers SET 
    name = 'Maika Nguyen',
    facebook_name = 'Maika Nguyen',
    facebook_numeric_id = '61565699990249',
    profile_picture_url = 'https://graph.facebook.com/61565699990249/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61565699990249%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61565699990249%'
    OR facebook_url LIKE '%profile.php?id=61565699990249%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huong Ellie (ID: 100043736181793)
UPDATE customers SET 
    name = 'Huong Ellie',
    facebook_name = 'Huong Ellie',
    facebook_numeric_id = '100043736181793',
    profile_picture_url = 'https://graph.facebook.com/100043736181793/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100043736181793%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100043736181793%'
    OR facebook_url LIKE '%profile.php?id=100043736181793%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hùng Vũ (ID: 100000231998341)
UPDATE customers SET 
    name = 'Hùng Vũ',
    facebook_name = 'Hùng Vũ',
    facebook_numeric_id = '100000231998341',
    profile_picture_url = 'https://graph.facebook.com/100000231998341/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hungcoi.kenky%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000231998341%'
    OR facebook_url LIKE '%profile.php?id=100000231998341%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Michal Boldy (ID: 100003000667321)
UPDATE customers SET 
    name = 'Michal Boldy',
    facebook_name = 'Michal Boldy',
    facebook_numeric_id = '100003000667321',
    profile_picture_url = 'https://graph.facebook.com/100003000667321/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%michal.boldy.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003000667321%'
    OR facebook_url LIKE '%profile.php?id=100003000667321%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Anna (ID: 100055093824633)
UPDATE customers SET 
    name = 'Trần Anna',
    facebook_name = 'Trần Anna',
    facebook_numeric_id = '100055093824633',
    profile_picture_url = 'https://graph.facebook.com/100055093824633/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100055093824633%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100055093824633%'
    OR facebook_url LIKE '%profile.php?id=100055093824633%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Long Koblenz (ID: 100003088784621)
UPDATE customers SET 
    name = 'Long Koblenz',
    facebook_name = 'Long Koblenz',
    facebook_numeric_id = '100003088784621',
    profile_picture_url = 'https://graph.facebook.com/100003088784621/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%long.koblenz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003088784621%'
    OR facebook_url LIKE '%profile.php?id=100003088784621%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngoc Ha Nguyen (ID: 100006823149527)
UPDATE customers SET 
    name = 'Ngoc Ha Nguyen',
    facebook_name = 'Ngoc Ha Nguyen',
    facebook_numeric_id = '100006823149527',
    profile_picture_url = 'https://graph.facebook.com/100006823149527/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006823149527%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006823149527%'
    OR facebook_url LIKE '%profile.php?id=100006823149527%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hưng Nguyễn (ID: 100004076542715)
UPDATE customers SET 
    name = 'Hưng Nguyễn',
    facebook_name = 'Hưng Nguyễn',
    facebook_numeric_id = '100004076542715',
    profile_picture_url = 'https://graph.facebook.com/100004076542715/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ten.motcai.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004076542715%'
    OR facebook_url LIKE '%profile.php?id=100004076542715%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vy Vy (ID: 100006050802862)
UPDATE customers SET 
    name = 'Vy Vy',
    facebook_name = 'Vy Vy',
    facebook_numeric_id = '100006050802862',
    profile_picture_url = 'https://graph.facebook.com/100006050802862/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huynh.vy.58760%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006050802862%'
    OR facebook_url LIKE '%profile.php?id=100006050802862%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngọc Lâm (ID: 100006006972002)
UPDATE customers SET 
    name = 'Ngọc Lâm',
    facebook_name = 'Ngọc Lâm',
    facebook_numeric_id = '100006006972002',
    profile_picture_url = 'https://graph.facebook.com/100006006972002/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngoc.lam.1852%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006006972002%'
    OR facebook_url LIKE '%profile.php?id=100006006972002%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Yen Nhi (ID: 100022674078452)
UPDATE customers SET 
    name = 'Yen Nhi',
    facebook_name = 'Yen Nhi',
    facebook_numeric_id = '100022674078452',
    profile_picture_url = 'https://graph.facebook.com/100022674078452/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%weamjhf%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022674078452%'
    OR facebook_url LIKE '%profile.php?id=100022674078452%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kim Anh (ID: 100061211305302)
UPDATE customers SET 
    name = 'Kim Anh',
    facebook_name = 'Kim Anh',
    facebook_numeric_id = '100061211305302',
    profile_picture_url = 'https://graph.facebook.com/100061211305302/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100061211305302%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100061211305302%'
    OR facebook_url LIKE '%profile.php?id=100061211305302%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ku Kon (ID: 100004345692999)
UPDATE customers SET 
    name = 'Ku Kon',
    facebook_name = 'Ku Kon',
    facebook_numeric_id = '100004345692999',
    profile_picture_url = 'https://graph.facebook.com/100004345692999/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoangtu.ruacon.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004345692999%'
    OR facebook_url LIKE '%profile.php?id=100004345692999%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Nguyen (ID: 100009180457840)
UPDATE customers SET 
    name = 'Van Nguyen',
    facebook_name = 'Van Nguyen',
    facebook_numeric_id = '100009180457840',
    profile_picture_url = 'https://graph.facebook.com/100009180457840/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009180457840%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009180457840%'
    OR facebook_url LIKE '%profile.php?id=100009180457840%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ha Dang (ID: 1810227520)
UPDATE customers SET 
    name = 'Ha Dang',
    facebook_name = 'Ha Dang',
    facebook_numeric_id = '1810227520',
    profile_picture_url = 'https://graph.facebook.com/1810227520/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bobmbt%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1810227520%'
    OR facebook_url LIKE '%profile.php?id=1810227520%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tomas Hoanganh Nguyen (ID: 100002782417364)
UPDATE customers SET 
    name = 'Tomas Hoanganh Nguyen',
    facebook_name = 'Tomas Hoanganh Nguyen',
    facebook_numeric_id = '100002782417364',
    profile_picture_url = 'https://graph.facebook.com/100002782417364/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tomashoanganh.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002782417364%'
    OR facebook_url LIKE '%profile.php?id=100002782417364%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anh Linh (ID: 100024286894967)
UPDATE customers SET 
    name = 'Anh Linh',
    facebook_name = 'Anh Linh',
    facebook_numeric_id = '100024286894967',
    profile_picture_url = 'https://graph.facebook.com/100024286894967/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%cz.dinhanh%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024286894967%'
    OR facebook_url LIKE '%profile.php?id=100024286894967%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Thu Huyền (ID: 100001850323000)
UPDATE customers SET 
    name = 'Phạm Thu Huyền',
    facebook_name = 'Phạm Thu Huyền',
    facebook_numeric_id = '100001850323000',
    profile_picture_url = 'https://graph.facebook.com/100001850323000/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyen.phamthu.180%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001850323000%'
    OR facebook_url LIKE '%profile.php?id=100001850323000%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kevin Bùi (ID: 100004811597272)
UPDATE customers SET 
    name = 'Kevin Bùi',
    facebook_name = 'Kevin Bùi',
    facebook_numeric_id = '100004811597272',
    profile_picture_url = 'https://graph.facebook.com/100004811597272/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004811597272%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004811597272%'
    OR facebook_url LIKE '%profile.php?id=100004811597272%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anh Vu (ID: 100001496663929)
UPDATE customers SET 
    name = 'Anh Vu',
    facebook_name = 'Anh Vu',
    facebook_numeric_id = '100001496663929',
    profile_picture_url = 'https://graph.facebook.com/100001496663929/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quocanhv1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001496663929%'
    OR facebook_url LIKE '%profile.php?id=100001496663929%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Li Sa (ID: 100054812859191)
UPDATE customers SET 
    name = 'Li Sa',
    facebook_name = 'Li Sa',
    facebook_numeric_id = '100054812859191',
    profile_picture_url = 'https://graph.facebook.com/100054812859191/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100054812859191%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100054812859191%'
    OR facebook_url LIKE '%profile.php?id=100054812859191%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hanka Pham (ID: 61571678152128)
UPDATE customers SET 
    name = 'Hanka Pham',
    facebook_name = 'Hanka Pham',
    facebook_numeric_id = '61571678152128',
    profile_picture_url = 'https://graph.facebook.com/61571678152128/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61571678152128%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61571678152128%'
    OR facebook_url LIKE '%profile.php?id=61571678152128%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hien Tran (ID: 100056532270493)
UPDATE customers SET 
    name = 'Hien Tran',
    facebook_name = 'Hien Tran',
    facebook_numeric_id = '100056532270493',
    profile_picture_url = 'https://graph.facebook.com/100056532270493/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hien.tran.639100%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100056532270493%'
    OR facebook_url LIKE '%profile.php?id=100056532270493%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khanh Huyen (ID: 100005652761990)
UPDATE customers SET 
    name = 'Khanh Huyen',
    facebook_name = 'Khanh Huyen',
    facebook_numeric_id = '100005652761990',
    profile_picture_url = 'https://graph.facebook.com/100005652761990/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%khanhhuyen.thvn%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005652761990%'
    OR facebook_url LIKE '%profile.php?id=100005652761990%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Uyễn Oàng Ong (ID: 100005219832898)
UPDATE customers SET 
    name = 'Uyễn Oàng Ong',
    facebook_name = 'Uyễn Oàng Ong',
    facebook_numeric_id = '100005219832898',
    profile_picture_url = 'https://graph.facebook.com/100005219832898/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%long.nguyenhoang.1485%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005219832898%'
    OR facebook_url LIKE '%profile.php?id=100005219832898%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Ngô (ID: 100007194696486)
UPDATE customers SET 
    name = 'Trang Ngô',
    facebook_name = 'Trang Ngô',
    facebook_numeric_id = '100007194696486',
    profile_picture_url = 'https://graph.facebook.com/100007194696486/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007194696486%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007194696486%'
    OR facebook_url LIKE '%profile.php?id=100007194696486%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thường Vượng (ID: 100007930571820)
UPDATE customers SET 
    name = 'Thường Vượng',
    facebook_name = 'Thường Vượng',
    facebook_numeric_id = '100007930571820',
    profile_picture_url = 'https://graph.facebook.com/100007930571820/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%koxamlsodit%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007930571820%'
    OR facebook_url LIKE '%profile.php?id=100007930571820%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mạnh Leo (ID: 100003475703583)
UPDATE customers SET 
    name = 'Mạnh Leo',
    facebook_name = 'Mạnh Leo',
    facebook_numeric_id = '100003475703583',
    profile_picture_url = 'https://graph.facebook.com/100003475703583/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%manh.leo.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003475703583%'
    OR facebook_url LIKE '%profile.php?id=100003475703583%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lena Chau (ID: 100065495700742)
UPDATE customers SET 
    name = 'Lena Chau',
    facebook_name = 'Lena Chau',
    facebook_numeric_id = '100065495700742',
    profile_picture_url = 'https://graph.facebook.com/100065495700742/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%chan.lena.37%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100065495700742%'
    OR facebook_url LIKE '%profile.php?id=100065495700742%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anita Tran (ID: 100003589615258)
UPDATE customers SET 
    name = 'Anita Tran',
    facebook_name = 'Anita Tran',
    facebook_numeric_id = '100003589615258',
    profile_picture_url = 'https://graph.facebook.com/100003589615258/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nho.angel.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003589615258%'
    OR facebook_url LIKE '%profile.php?id=100003589615258%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Vinh (ID: 100068022684065)
UPDATE customers SET 
    name = 'Trần Vinh',
    facebook_name = 'Trần Vinh',
    facebook_numeric_id = '100068022684065',
    profile_picture_url = 'https://graph.facebook.com/100068022684065/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100068022684065%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100068022684065%'
    OR facebook_url LIKE '%profile.php?id=100068022684065%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Trang (ID: 100007828304403)
UPDATE customers SET 
    name = 'Nguyễn Trang',
    facebook_name = 'Nguyễn Trang',
    facebook_numeric_id = '100007828304403',
    profile_picture_url = 'https://graph.facebook.com/100007828304403/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007828304403%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007828304403%'
    OR facebook_url LIKE '%profile.php?id=100007828304403%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bùi Yến (ID: 100029107746788)
UPDATE customers SET 
    name = 'Bùi Yến',
    facebook_name = 'Bùi Yến',
    facebook_numeric_id = '100029107746788',
    profile_picture_url = 'https://graph.facebook.com/100029107746788/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029107746788%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029107746788%'
    OR facebook_url LIKE '%profile.php?id=100029107746788%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Danh Tú (ID: 100005857177544)
UPDATE customers SET 
    name = 'Vũ Danh Tú',
    facebook_name = 'Vũ Danh Tú',
    facebook_numeric_id = '100005857177544',
    profile_picture_url = 'https://graph.facebook.com/100005857177544/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%danhtuvu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005857177544%'
    OR facebook_url LIKE '%profile.php?id=100005857177544%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- HaMy Le (ID: 100004753423975)
UPDATE customers SET 
    name = 'HaMy Le',
    facebook_name = 'HaMy Le',
    facebook_numeric_id = '100004753423975',
    profile_picture_url = 'https://graph.facebook.com/100004753423975/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hamy.le.5036%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004753423975%'
    OR facebook_url LIKE '%profile.php?id=100004753423975%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hong Ngoc Le (ID: 100000544117885)
UPDATE customers SET 
    name = 'Hong Ngoc Le',
    facebook_name = 'Hong Ngoc Le',
    facebook_numeric_id = '100000544117885',
    profile_picture_url = 'https://graph.facebook.com/100000544117885/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hongngocle83%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000544117885%'
    OR facebook_url LIKE '%profile.php?id=100000544117885%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hảo Hướng (ID: 100011120220359)
UPDATE customers SET 
    name = 'Hảo Hướng',
    facebook_name = 'Hảo Hướng',
    facebook_numeric_id = '100011120220359',
    profile_picture_url = 'https://graph.facebook.com/100011120220359/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011120220359%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011120220359%'
    OR facebook_url LIKE '%profile.php?id=100011120220359%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- NiNa Le (ID: 100007987382250)
UPDATE customers SET 
    name = 'NiNa Le',
    facebook_name = 'NiNa Le',
    facebook_numeric_id = '100007987382250',
    profile_picture_url = 'https://graph.facebook.com/100007987382250/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%miu.kin.37%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007987382250%'
    OR facebook_url LIKE '%profile.php?id=100007987382250%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Linh (ID: 100003863409542)
UPDATE customers SET 
    name = 'Thu Linh',
    facebook_name = 'Thu Linh',
    facebook_numeric_id = '100003863409542',
    profile_picture_url = 'https://graph.facebook.com/100003863409542/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%romrom.kute%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003863409542%'
    OR facebook_url LIKE '%profile.php?id=100003863409542%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quyet Phan (ID: 100044785818589)
UPDATE customers SET 
    name = 'Quyet Phan',
    facebook_name = 'Quyet Phan',
    facebook_numeric_id = '100044785818589',
    profile_picture_url = 'https://graph.facebook.com/100044785818589/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thaotien.phan.5220665%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044785818589%'
    OR facebook_url LIKE '%profile.php?id=100044785818589%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mai Hươngg (ID: 100000246850767)
UPDATE customers SET 
    name = 'Mai Hươngg',
    facebook_name = 'Mai Hươngg',
    facebook_numeric_id = '100000246850767',
    profile_picture_url = 'https://graph.facebook.com/100000246850767/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Louismyh%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000246850767%'
    OR facebook_url LIKE '%profile.php?id=100000246850767%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Truong Linh (ID: 100095060169950)
UPDATE customers SET 
    name = 'Truong Linh',
    facebook_name = 'Truong Linh',
    facebook_numeric_id = '100095060169950',
    profile_picture_url = 'https://graph.facebook.com/100095060169950/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100095060169950%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100095060169950%'
    OR facebook_url LIKE '%profile.php?id=100095060169950%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tôn Quang Tuấn (ID: 100005683154243)
UPDATE customers SET 
    name = 'Tôn Quang Tuấn',
    facebook_name = 'Tôn Quang Tuấn',
    facebook_numeric_id = '100005683154243',
    profile_picture_url = 'https://graph.facebook.com/100005683154243/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuanvipboykute.kute%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005683154243%'
    OR facebook_url LIKE '%profile.php?id=100005683154243%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Chu Trang (ID: 100001826892454)
UPDATE customers SET 
    name = 'Chu Trang',
    facebook_name = 'Chu Trang',
    facebook_numeric_id = '100001826892454',
    profile_picture_url = 'https://graph.facebook.com/100001826892454/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trang.chu.52%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001826892454%'
    OR facebook_url LIKE '%profile.php?id=100001826892454%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Hà (ID: 100001995880644)
UPDATE customers SET 
    name = 'Minh Hà',
    facebook_name = 'Minh Hà',
    facebook_numeric_id = '100001995880644',
    profile_picture_url = 'https://graph.facebook.com/100001995880644/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hanguyenyenlac%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001995880644%'
    OR facebook_url LIKE '%profile.php?id=100001995880644%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tereza Nail (ID: 100040863015182)
UPDATE customers SET 
    name = 'Tereza Nail',
    facebook_name = 'Tereza Nail',
    facebook_numeric_id = '100040863015182',
    profile_picture_url = 'https://graph.facebook.com/100040863015182/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%beautynail.tereza%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100040863015182%'
    OR facebook_url LIKE '%profile.php?id=100040863015182%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nick Nguyen (ID: 100000090526106)
UPDATE customers SET 
    name = 'Nick Nguyen',
    facebook_name = 'Nick Nguyen',
    facebook_numeric_id = '100000090526106',
    profile_picture_url = 'https://graph.facebook.com/100000090526106/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyen.quangvinh.927%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000090526106%'
    OR facebook_url LIKE '%profile.php?id=100000090526106%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kim Ngân Hoàng (ID: 100004994199722)
UPDATE customers SET 
    name = 'Kim Ngân Hoàng',
    facebook_name = 'Kim Ngân Hoàng',
    facebook_numeric_id = '100004994199722',
    profile_picture_url = 'https://graph.facebook.com/100004994199722/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoang.kimngan.353%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004994199722%'
    OR facebook_url LIKE '%profile.php?id=100004994199722%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lucie Nguyen (ID: 100008138767673)
UPDATE customers SET 
    name = 'Lucie Nguyen',
    facebook_name = 'Lucie Nguyen',
    facebook_numeric_id = '100008138767673',
    profile_picture_url = 'https://graph.facebook.com/100008138767673/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%xaurikhongbiet.tenchima%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008138767673%'
    OR facebook_url LIKE '%profile.php?id=100008138767673%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kim Anh Nguyen Thi (ID: 100015626291165)
UPDATE customers SET 
    name = 'Kim Anh Nguyen Thi',
    facebook_name = 'Kim Anh Nguyen Thi',
    facebook_numeric_id = '100015626291165',
    profile_picture_url = 'https://graph.facebook.com/100015626291165/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015626291165%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015626291165%'
    OR facebook_url LIKE '%profile.php?id=100015626291165%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duong Vu (ID: 100003318980571)
UPDATE customers SET 
    name = 'Duong Vu',
    facebook_name = 'Duong Vu',
    facebook_numeric_id = '100003318980571',
    profile_picture_url = 'https://graph.facebook.com/100003318980571/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%h5h45%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003318980571%'
    OR facebook_url LIKE '%profile.php?id=100003318980571%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Hien Le (ID: 100000465878420)
UPDATE customers SET 
    name = 'Thu Hien Le',
    facebook_name = 'Thu Hien Le',
    facebook_numeric_id = '100000465878420',
    profile_picture_url = 'https://graph.facebook.com/100000465878420/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuhien.le.14%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000465878420%'
    OR facebook_url LIKE '%profile.php?id=100000465878420%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nechtové Stúdio Kristína (ID: 100000312733537)
UPDATE customers SET 
    name = 'Nechtové Stúdio Kristína',
    facebook_name = 'Nechtové Stúdio Kristína',
    facebook_numeric_id = '100000312733537',
    profile_picture_url = 'https://graph.facebook.com/100000312733537/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%khanhchi.nguyen.102%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000312733537%'
    OR facebook_url LIKE '%profile.php?id=100000312733537%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Ha Nguyen (ID: 100005639853742)
UPDATE customers SET 
    name = 'Thu Ha Nguyen',
    facebook_name = 'Thu Ha Nguyen',
    facebook_numeric_id = '100005639853742',
    profile_picture_url = 'https://graph.facebook.com/100005639853742/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005639853742%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005639853742%'
    OR facebook_url LIKE '%profile.php?id=100005639853742%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anny Vy (ID: 100003739409021)
UPDATE customers SET 
    name = 'Anny Vy',
    facebook_name = 'Anny Vy',
    facebook_numeric_id = '100003739409021',
    profile_picture_url = 'https://graph.facebook.com/100003739409021/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vy.anh.739%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003739409021%'
    OR facebook_url LIKE '%profile.php?id=100003739409021%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pham Vanvan (ID: 100014924830944)
UPDATE customers SET 
    name = 'Pham Vanvan',
    facebook_name = 'Pham Vanvan',
    facebook_numeric_id = '100014924830944',
    profile_picture_url = 'https://graph.facebook.com/100014924830944/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%pham.vanvan.7503%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014924830944%'
    OR facebook_url LIKE '%profile.php?id=100014924830944%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khúc Tiến Toản (ID: 100006372258683)
UPDATE customers SET 
    name = 'Khúc Tiến Toản',
    facebook_name = 'Khúc Tiến Toản',
    facebook_numeric_id = '100006372258683',
    profile_picture_url = 'https://graph.facebook.com/100006372258683/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%khuctientoancz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006372258683%'
    OR facebook_url LIKE '%profile.php?id=100006372258683%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hao Nguyen (ID: 100022564773622)
UPDATE customers SET 
    name = 'Hao Nguyen',
    facebook_name = 'Hao Nguyen',
    facebook_numeric_id = '100022564773622',
    profile_picture_url = 'https://graph.facebook.com/100022564773622/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022564773622%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022564773622%'
    OR facebook_url LIKE '%profile.php?id=100022564773622%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- ThiThuan Tran (ID: 61555021515301)
UPDATE customers SET 
    name = 'ThiThuan Tran',
    facebook_name = 'ThiThuan Tran',
    facebook_numeric_id = '61555021515301',
    profile_picture_url = 'https://graph.facebook.com/61555021515301/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61555021515301%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61555021515301%'
    OR facebook_url LIKE '%profile.php?id=61555021515301%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- AnhTho Doãn (ID: 100054587160664)
UPDATE customers SET 
    name = 'AnhTho Doãn',
    facebook_name = 'AnhTho Doãn',
    facebook_numeric_id = '100054587160664',
    profile_picture_url = 'https://graph.facebook.com/100054587160664/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%anhtho.doan.330%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100054587160664%'
    OR facebook_url LIKE '%profile.php?id=100054587160664%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ha Giang (ID: 100016966366156)
UPDATE customers SET 
    name = 'Ha Giang',
    facebook_name = 'Ha Giang',
    facebook_numeric_id = '100016966366156',
    profile_picture_url = 'https://graph.facebook.com/100016966366156/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016966366156%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016966366156%'
    OR facebook_url LIKE '%profile.php?id=100016966366156%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thảo (ID: 61578246631743)
UPDATE customers SET 
    name = 'Nguyễn Thảo',
    facebook_name = 'Nguyễn Thảo',
    facebook_numeric_id = '61578246631743',
    profile_picture_url = 'https://graph.facebook.com/61578246631743/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61578246631743%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61578246631743%'
    OR facebook_url LIKE '%profile.php?id=61578246631743%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vân Vân (ID: 100032883021069)
UPDATE customers SET 
    name = 'Vân Vân',
    facebook_name = 'Vân Vân',
    facebook_numeric_id = '100032883021069',
    profile_picture_url = 'https://graph.facebook.com/100032883021069/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100032883021069%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100032883021069%'
    OR facebook_url LIKE '%profile.php?id=100032883021069%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bùi Xuân Chính (ID: 100007583581907)
UPDATE customers SET 
    name = 'Bùi Xuân Chính',
    facebook_name = 'Bùi Xuân Chính',
    facebook_numeric_id = '100007583581907',
    profile_picture_url = 'https://graph.facebook.com/100007583581907/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thay.doi.forever%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007583581907%'
    OR facebook_url LIKE '%profile.php?id=100007583581907%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Thanh Tùng (ID: 100041888148116)
UPDATE customers SET 
    name = 'Phạm Thanh Tùng',
    facebook_name = 'Phạm Thanh Tùng',
    facebook_numeric_id = '100041888148116',
    profile_picture_url = 'https://graph.facebook.com/100041888148116/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041888148116%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041888148116%'
    OR facebook_url LIKE '%profile.php?id=100041888148116%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nhuan Bui Thi Thuy (ID: 100068161182017)
UPDATE customers SET 
    name = 'Nhuan Bui Thi Thuy',
    facebook_name = 'Nhuan Bui Thi Thuy',
    facebook_numeric_id = '100068161182017',
    profile_picture_url = 'https://graph.facebook.com/100068161182017/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nhuanbuithithuy7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100068161182017%'
    OR facebook_url LIKE '%profile.php?id=100068161182017%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngọc Vân (ID: 100004998963311)
UPDATE customers SET 
    name = 'Ngọc Vân',
    facebook_name = 'Ngọc Vân',
    facebook_numeric_id = '100004998963311',
    profile_picture_url = 'https://graph.facebook.com/100004998963311/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngoc.van.1213%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004998963311%'
    OR facebook_url LIKE '%profile.php?id=100004998963311%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- nguyễn minh hiếu (ID: 100009978451985)
UPDATE customers SET 
    name = 'nguyễn minh hiếu',
    facebook_name = 'nguyễn minh hiếu',
    facebook_numeric_id = '100009978451985',
    profile_picture_url = 'https://graph.facebook.com/100009978451985/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%anhhieu.1403%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009978451985%'
    OR facebook_url LIKE '%profile.php?id=100009978451985%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ti Beo (ID: 100000062756306)
UPDATE customers SET 
    name = 'Ti Beo',
    facebook_name = 'Ti Beo',
    facebook_numeric_id = '100000062756306',
    profile_picture_url = 'https://graph.facebook.com/100000062756306/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tibeo89%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000062756306%'
    OR facebook_url LIKE '%profile.php?id=100000062756306%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Huyền My (ID: 100028335931073)
UPDATE customers SET 
    name = 'Trần Huyền My',
    facebook_name = 'Trần Huyền My',
    facebook_numeric_id = '100028335931073',
    profile_picture_url = 'https://graph.facebook.com/100028335931073/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trnv.n2510%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028335931073%'
    OR facebook_url LIKE '%profile.php?id=100028335931073%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Theanh Doan (ID: 61557720452454)
UPDATE customers SET 
    name = 'Theanh Doan',
    facebook_name = 'Theanh Doan',
    facebook_numeric_id = '61557720452454',
    profile_picture_url = 'https://graph.facebook.com/61557720452454/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61557720452454%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61557720452454%'
    OR facebook_url LIKE '%profile.php?id=61557720452454%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngân Hà (ID: 100034229803770)
UPDATE customers SET 
    name = 'Ngân Hà',
    facebook_name = 'Ngân Hà',
    facebook_numeric_id = '100034229803770',
    profile_picture_url = 'https://graph.facebook.com/100034229803770/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100034229803770%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100034229803770%'
    OR facebook_url LIKE '%profile.php?id=100034229803770%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Toan Truong (ID: 100000537957145)
UPDATE customers SET 
    name = 'Toan Truong',
    facebook_name = 'Toan Truong',
    facebook_numeric_id = '100000537957145',
    profile_picture_url = 'https://graph.facebook.com/100000537957145/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%toan.truong.73%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000537957145%'
    OR facebook_url LIKE '%profile.php?id=100000537957145%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen NgọcÝ Nhi (ID: 100010678383806)
UPDATE customers SET 
    name = 'Nguyen NgọcÝ Nhi',
    facebook_name = 'Nguyen NgọcÝ Nhi',
    facebook_numeric_id = '100010678383806',
    profile_picture_url = 'https://graph.facebook.com/100010678383806/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010678383806%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010678383806%'
    OR facebook_url LIKE '%profile.php?id=100010678383806%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lynn Nguyen (ID: 100025480841672)
UPDATE customers SET 
    name = 'Lynn Nguyen',
    facebook_name = 'Lynn Nguyen',
    facebook_numeric_id = '100025480841672',
    profile_picture_url = 'https://graph.facebook.com/100025480841672/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025480841672%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025480841672%'
    OR facebook_url LIKE '%profile.php?id=100025480841672%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vinhtrang Phan (ID: 100005534057144)
UPDATE customers SET 
    name = 'Vinhtrang Phan',
    facebook_name = 'Vinhtrang Phan',
    facebook_numeric_id = '100005534057144',
    profile_picture_url = 'https://graph.facebook.com/100005534057144/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005534057144%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005534057144%'
    OR facebook_url LIKE '%profile.php?id=100005534057144%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hangnguyen Nguyen (ID: 100001470019310)
UPDATE customers SET 
    name = 'Hangnguyen Nguyen',
    facebook_name = 'Hangnguyen Nguyen',
    facebook_numeric_id = '100001470019310',
    profile_picture_url = 'https://graph.facebook.com/100001470019310/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hangnguyen.nguyen.56%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001470019310%'
    OR facebook_url LIKE '%profile.php?id=100001470019310%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bá Thắng (ID: 100044837014044)
UPDATE customers SET 
    name = 'Bá Thắng',
    facebook_name = 'Bá Thắng',
    facebook_numeric_id = '100044837014044',
    profile_picture_url = 'https://graph.facebook.com/100044837014044/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044837014044%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044837014044%'
    OR facebook_url LIKE '%profile.php?id=100044837014044%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Huy Hoàng (ID: 100082965314381)
UPDATE customers SET 
    name = 'Nguyễn Huy Hoàng',
    facebook_name = 'Nguyễn Huy Hoàng',
    facebook_numeric_id = '100082965314381',
    profile_picture_url = 'https://graph.facebook.com/100082965314381/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100082965314381%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100082965314381%'
    OR facebook_url LIKE '%profile.php?id=100082965314381%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Hai Giang (ID: 61560997994169)
UPDATE customers SET 
    name = 'Thi Hai Giang',
    facebook_name = 'Thi Hai Giang',
    facebook_numeric_id = '61560997994169',
    profile_picture_url = 'https://graph.facebook.com/61560997994169/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61560997994169%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61560997994169%'
    OR facebook_url LIKE '%profile.php?id=61560997994169%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thái Hoà (ID: 100004313748058)
UPDATE customers SET 
    name = 'Thái Hoà',
    facebook_name = 'Thái Hoà',
    facebook_numeric_id = '100004313748058',
    profile_picture_url = 'https://graph.facebook.com/100004313748058/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004313748058%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004313748058%'
    OR facebook_url LIKE '%profile.php?id=100004313748058%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Bảo An (ID: 100003070196545)
UPDATE customers SET 
    name = 'Nguyễn Bảo An',
    facebook_name = 'Nguyễn Bảo An',
    facebook_numeric_id = '100003070196545',
    profile_picture_url = 'https://graph.facebook.com/100003070196545/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bao.tran.7545%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003070196545%'
    OR facebook_url LIKE '%profile.php?id=100003070196545%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Thuỳ An (ID: 100052959130265)
UPDATE customers SET 
    name = 'Phạm Thuỳ An',
    facebook_name = 'Phạm Thuỳ An',
    facebook_numeric_id = '100052959130265',
    profile_picture_url = 'https://graph.facebook.com/100052959130265/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100052959130265%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100052959130265%'
    OR facebook_url LIKE '%profile.php?id=100052959130265%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Trung Hiếu (ID: 100041588791248)
UPDATE customers SET 
    name = 'Nguyễn Trung Hiếu',
    facebook_name = 'Nguyễn Trung Hiếu',
    facebook_numeric_id = '100041588791248',
    profile_picture_url = 'https://graph.facebook.com/100041588791248/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trunghieu5596%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041588791248%'
    OR facebook_url LIKE '%profile.php?id=100041588791248%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ivana ThuyDuong (ID: 61577235651165)
UPDATE customers SET 
    name = 'Ivana ThuyDuong',
    facebook_name = 'Ivana ThuyDuong',
    facebook_numeric_id = '61577235651165',
    profile_picture_url = 'https://graph.facebook.com/61577235651165/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61577235651165%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61577235651165%'
    OR facebook_url LIKE '%profile.php?id=61577235651165%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Giang Lê (ID: 100028686360339)
UPDATE customers SET 
    name = 'Giang Lê',
    facebook_name = 'Giang Lê',
    facebook_numeric_id = '100028686360339',
    profile_picture_url = 'https://graph.facebook.com/100028686360339/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028686360339%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028686360339%'
    OR facebook_url LIKE '%profile.php?id=100028686360339%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sống Còn (ID: 100007471508769)
UPDATE customers SET 
    name = 'Sống Còn',
    facebook_name = 'Sống Còn',
    facebook_numeric_id = '100007471508769',
    profile_picture_url = 'https://graph.facebook.com/100007471508769/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007471508769%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007471508769%'
    OR facebook_url LIKE '%profile.php?id=100007471508769%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cô Tấm Útcô (ID: 100054485347658)
UPDATE customers SET 
    name = 'Cô Tấm Útcô',
    facebook_name = 'Cô Tấm Útcô',
    facebook_numeric_id = '100054485347658',
    profile_picture_url = 'https://graph.facebook.com/100054485347658/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100054485347658%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100054485347658%'
    OR facebook_url LIKE '%profile.php?id=100054485347658%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Nguyen (ID: 61553184400774)
UPDATE customers SET 
    name = 'Van Nguyen',
    facebook_name = 'Van Nguyen',
    facebook_numeric_id = '61553184400774',
    profile_picture_url = 'https://graph.facebook.com/61553184400774/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61553184400774%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61553184400774%'
    OR facebook_url LIKE '%profile.php?id=61553184400774%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thúy Hằng Hồ (ID: 1768707432)
UPDATE customers SET 
    name = 'Thúy Hằng Hồ',
    facebook_name = 'Thúy Hằng Hồ',
    facebook_numeric_id = '1768707432',
    profile_picture_url = 'https://graph.facebook.com/1768707432/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%pupy.mac%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1768707432%'
    OR facebook_url LIKE '%profile.php?id=1768707432%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tình Teng (ID: 100003541018766)
UPDATE customers SET 
    name = 'Tình Teng',
    facebook_name = 'Tình Teng',
    facebook_numeric_id = '100003541018766',
    profile_picture_url = 'https://graph.facebook.com/100003541018766/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%minhda5n%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003541018766%'
    OR facebook_url LIKE '%profile.php?id=100003541018766%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nghia Nguyen Thi (ID: 100019215270874)
UPDATE customers SET 
    name = 'Nghia Nguyen Thi',
    facebook_name = 'Nghia Nguyen Thi',
    facebook_numeric_id = '100019215270874',
    profile_picture_url = 'https://graph.facebook.com/100019215270874/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nghia.nguyenthi.5059%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100019215270874%'
    OR facebook_url LIKE '%profile.php?id=100019215270874%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hòa Bùi (ID: 100084561290738)
UPDATE customers SET 
    name = 'Hòa Bùi',
    facebook_name = 'Hòa Bùi',
    facebook_numeric_id = '100084561290738',
    profile_picture_url = 'https://graph.facebook.com/100084561290738/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100084561290738%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100084561290738%'
    OR facebook_url LIKE '%profile.php?id=100084561290738%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dung Nguyen (ID: 100009366876652)
UPDATE customers SET 
    name = 'Dung Nguyen',
    facebook_name = 'Dung Nguyen',
    facebook_numeric_id = '100009366876652',
    profile_picture_url = 'https://graph.facebook.com/100009366876652/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009366876652%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009366876652%'
    OR facebook_url LIKE '%profile.php?id=100009366876652%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tôn Nguyễn (ID: 100000968564764)
UPDATE customers SET 
    name = 'Tôn Nguyễn',
    facebook_name = 'Tôn Nguyễn',
    facebook_numeric_id = '100000968564764',
    profile_picture_url = 'https://graph.facebook.com/100000968564764/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%PIPnct%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000968564764%'
    OR facebook_url LIKE '%profile.php?id=100000968564764%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huynh Floriane (ID: 100011548152338)
UPDATE customers SET 
    name = 'Huynh Floriane',
    facebook_name = 'Huynh Floriane',
    facebook_numeric_id = '100011548152338',
    profile_picture_url = 'https://graph.facebook.com/100011548152338/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011548152338%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011548152338%'
    OR facebook_url LIKE '%profile.php?id=100011548152338%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thành Lâm Cao (ID: 100005096919587)
UPDATE customers SET 
    name = 'Thành Lâm Cao',
    facebook_name = 'Thành Lâm Cao',
    facebook_numeric_id = '100005096919587',
    profile_picture_url = 'https://graph.facebook.com/100005096919587/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanhlam.cao.1213%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005096919587%'
    OR facebook_url LIKE '%profile.php?id=100005096919587%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đức Quân (ID: 100003909838399)
UPDATE customers SET 
    name = 'Đức Quân',
    facebook_name = 'Đức Quân',
    facebook_numeric_id = '100003909838399',
    profile_picture_url = 'https://graph.facebook.com/100003909838399/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dangcap.danchoi.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003909838399%'
    OR facebook_url LIKE '%profile.php?id=100003909838399%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phùng Tuyết (ID: 100009598907168)
UPDATE customers SET 
    name = 'Phùng Tuyết',
    facebook_name = 'Phùng Tuyết',
    facebook_numeric_id = '100009598907168',
    profile_picture_url = 'https://graph.facebook.com/100009598907168/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009598907168%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009598907168%'
    OR facebook_url LIKE '%profile.php?id=100009598907168%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Trúc Cao (ID: 100011397429848)
UPDATE customers SET 
    name = 'Thanh Trúc Cao',
    facebook_name = 'Thanh Trúc Cao',
    facebook_numeric_id = '100011397429848',
    profile_picture_url = 'https://graph.facebook.com/100011397429848/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanhtruc.cao.3348%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011397429848%'
    OR facebook_url LIKE '%profile.php?id=100011397429848%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phương Nhi (ID: 100078350103733)
UPDATE customers SET 
    name = 'Phương Nhi',
    facebook_name = 'Phương Nhi',
    facebook_numeric_id = '100078350103733',
    profile_picture_url = 'https://graph.facebook.com/100078350103733/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100078350103733%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100078350103733%'
    OR facebook_url LIKE '%profile.php?id=100078350103733%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Út Nữ (ID: 100011413624495)
UPDATE customers SET 
    name = 'Út Nữ',
    facebook_name = 'Út Nữ',
    facebook_numeric_id = '100011413624495',
    profile_picture_url = 'https://graph.facebook.com/100011413624495/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ut.nu.925%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011413624495%'
    OR facebook_url LIKE '%profile.php?id=100011413624495%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duc Hai Ng (ID: 61557104057089)
UPDATE customers SET 
    name = 'Duc Hai Ng',
    facebook_name = 'Duc Hai Ng',
    facebook_numeric_id = '61557104057089',
    profile_picture_url = 'https://graph.facebook.com/61557104057089/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%haithy2021%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61557104057089%'
    OR facebook_url LIKE '%profile.php?id=61557104057089%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nina Vu (ID: 100022334162958)
UPDATE customers SET 
    name = 'Nina Vu',
    facebook_name = 'Nina Vu',
    facebook_numeric_id = '100022334162958',
    profile_picture_url = 'https://graph.facebook.com/100022334162958/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nina.vu.3914%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022334162958%'
    OR facebook_url LIKE '%profile.php?id=100022334162958%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phúc Đức (ID: 61555671743383)
UPDATE customers SET 
    name = 'Phúc Đức',
    facebook_name = 'Phúc Đức',
    facebook_numeric_id = '61555671743383',
    profile_picture_url = 'https://graph.facebook.com/61555671743383/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61555671743383%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61555671743383%'
    OR facebook_url LIKE '%profile.php?id=61555671743383%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyen Dang (ID: 100029398273070)
UPDATE customers SET 
    name = 'Huyen Dang',
    facebook_name = 'Huyen Dang',
    facebook_numeric_id = '100029398273070',
    profile_picture_url = 'https://graph.facebook.com/100029398273070/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029398273070%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029398273070%'
    OR facebook_url LIKE '%profile.php?id=100029398273070%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bích Ngọc (ID: 100013594117237)
UPDATE customers SET 
    name = 'Bích Ngọc',
    facebook_name = 'Bích Ngọc',
    facebook_numeric_id = '100013594117237',
    profile_picture_url = 'https://graph.facebook.com/100013594117237/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nluna.bae%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013594117237%'
    OR facebook_url LIKE '%profile.php?id=100013594117237%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thehai Nguyen (ID: 100002428022559)
UPDATE customers SET 
    name = 'Thehai Nguyen',
    facebook_name = 'Thehai Nguyen',
    facebook_numeric_id = '100002428022559',
    profile_picture_url = 'https://graph.facebook.com/100002428022559/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thehai.nguyen.37%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002428022559%'
    OR facebook_url LIKE '%profile.php?id=100002428022559%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Loan Doan (ID: 100014929907394)
UPDATE customers SET 
    name = 'Loan Doan',
    facebook_name = 'Loan Doan',
    facebook_numeric_id = '100014929907394',
    profile_picture_url = 'https://graph.facebook.com/100014929907394/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%loan.doan.7393264%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014929907394%'
    OR facebook_url LIKE '%profile.php?id=100014929907394%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Hoang (ID: 100048425794821)
UPDATE customers SET 
    name = 'Thuy Hoang',
    facebook_name = 'Thuy Hoang',
    facebook_numeric_id = '100048425794821',
    profile_picture_url = 'https://graph.facebook.com/100048425794821/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100048425794821%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100048425794821%'
    OR facebook_url LIKE '%profile.php?id=100048425794821%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ha Linh Nguyen (ID: 100000548159019)
UPDATE customers SET 
    name = 'Ha Linh Nguyen',
    facebook_name = 'Ha Linh Nguyen',
    facebook_numeric_id = '100000548159019',
    profile_picture_url = 'https://graph.facebook.com/100000548159019/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%halinh.nguyen.5201%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000548159019%'
    OR facebook_url LIKE '%profile.php?id=100000548159019%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Anh To (ID: 100003366764248)
UPDATE customers SET 
    name = 'Van Anh To',
    facebook_name = 'Van Anh To',
    facebook_numeric_id = '100003366764248',
    profile_picture_url = 'https://graph.facebook.com/100003366764248/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vananh.to.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003366764248%'
    OR facebook_url LIKE '%profile.php?id=100003366764248%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoang Xloc (ID: 100003736929478)
UPDATE customers SET 
    name = 'Hoang Xloc',
    facebook_name = 'Hoang Xloc',
    facebook_numeric_id = '100003736929478',
    profile_picture_url = 'https://graph.facebook.com/100003736929478/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoangxloc96%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003736929478%'
    OR facebook_url LIKE '%profile.php?id=100003736929478%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pi Seven (ID: 100030875031133)
UPDATE customers SET 
    name = 'Pi Seven',
    facebook_name = 'Pi Seven',
    facebook_numeric_id = '100030875031133',
    profile_picture_url = 'https://graph.facebook.com/100030875031133/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%piseven03%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100030875031133%'
    OR facebook_url LIKE '%profile.php?id=100030875031133%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Nguyễn (ID: 100004654366666)
UPDATE customers SET 
    name = 'Hoa Nguyễn',
    facebook_name = 'Hoa Nguyễn',
    facebook_numeric_id = '100004654366666',
    profile_picture_url = 'https://graph.facebook.com/100004654366666/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004654366666%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004654366666%'
    OR facebook_url LIKE '%profile.php?id=100004654366666%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lan Chinh (ID: 100004357860326)
UPDATE customers SET 
    name = 'Lan Chinh',
    facebook_name = 'Lan Chinh',
    facebook_numeric_id = '100004357860326',
    profile_picture_url = 'https://graph.facebook.com/100004357860326/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lanchinh.pham%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004357860326%'
    OR facebook_url LIKE '%profile.php?id=100004357860326%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Thị Hằng (ID: 100008090678175)
UPDATE customers SET 
    name = 'Trần Thị Hằng',
    facebook_name = 'Trần Thị Hằng',
    facebook_numeric_id = '100008090678175',
    profile_picture_url = 'https://graph.facebook.com/100008090678175/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bepgander812276%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008090678175%'
    OR facebook_url LIKE '%profile.php?id=100008090678175%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- My My Nguyen (ID: 61551204694583)
UPDATE customers SET 
    name = 'My My Nguyen',
    facebook_name = 'My My Nguyen',
    facebook_numeric_id = '61551204694583',
    profile_picture_url = 'https://graph.facebook.com/61551204694583/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61551204694583%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61551204694583%'
    OR facebook_url LIKE '%profile.php?id=61551204694583%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vu Anna (ID: 100036747320312)
UPDATE customers SET 
    name = 'Vu Anna',
    facebook_name = 'Vu Anna',
    facebook_numeric_id = '100036747320312',
    profile_picture_url = 'https://graph.facebook.com/100036747320312/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vu.anna.7524%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036747320312%'
    OR facebook_url LIKE '%profile.php?id=100036747320312%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Dương (ID: 100036676493855)
UPDATE customers SET 
    name = 'Nguyễn Dương',
    facebook_name = 'Nguyễn Dương',
    facebook_numeric_id = '100036676493855',
    profile_picture_url = 'https://graph.facebook.com/100036676493855/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036676493855%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036676493855%'
    OR facebook_url LIKE '%profile.php?id=100036676493855%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sơn Ca (ID: 100000167466758)
UPDATE customers SET 
    name = 'Sơn Ca',
    facebook_name = 'Sơn Ca',
    facebook_numeric_id = '100000167466758',
    profile_picture_url = 'https://graph.facebook.com/100000167466758/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Sonca85%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000167466758%'
    OR facebook_url LIKE '%profile.php?id=100000167466758%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cường Nguyễn (ID: 100003751166339)
UPDATE customers SET 
    name = 'Cường Nguyễn',
    facebook_name = 'Cường Nguyễn',
    facebook_numeric_id = '100003751166339',
    profile_picture_url = 'https://graph.facebook.com/100003751166339/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003751166339%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003751166339%'
    OR facebook_url LIKE '%profile.php?id=100003751166339%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngoc Hannah (ID: 100086028602865)
UPDATE customers SET 
    name = 'Ngoc Hannah',
    facebook_name = 'Ngoc Hannah',
    facebook_numeric_id = '100086028602865',
    profile_picture_url = 'https://graph.facebook.com/100086028602865/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100086028602865%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100086028602865%'
    OR facebook_url LIKE '%profile.php?id=100086028602865%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoang Vu (ID: 100001560433239)
UPDATE customers SET 
    name = 'Hoang Vu',
    facebook_name = 'Hoang Vu',
    facebook_numeric_id = '100001560433239',
    profile_picture_url = 'https://graph.facebook.com/100001560433239/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%junminhhoang%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001560433239%'
    OR facebook_url LIKE '%profile.php?id=100001560433239%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyệt Dũng (ID: 61552986631584)
UPDATE customers SET 
    name = 'Nguyệt Dũng',
    facebook_name = 'Nguyệt Dũng',
    facebook_numeric_id = '61552986631584',
    profile_picture_url = 'https://graph.facebook.com/61552986631584/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61552986631584%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61552986631584%'
    OR facebook_url LIKE '%profile.php?id=61552986631584%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nga Vuong Thuy (ID: 100081612815353)
UPDATE customers SET 
    name = 'Nga Vuong Thuy',
    facebook_name = 'Nga Vuong Thuy',
    facebook_numeric_id = '100081612815353',
    profile_picture_url = 'https://graph.facebook.com/100081612815353/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100081612815353%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100081612815353%'
    OR facebook_url LIKE '%profile.php?id=100081612815353%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dũng Lạc (ID: 100006346843714)
UPDATE customers SET 
    name = 'Dũng Lạc',
    facebook_name = 'Dũng Lạc',
    facebook_numeric_id = '100006346843714',
    profile_picture_url = 'https://graph.facebook.com/100006346843714/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoang.dunglac%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006346843714%'
    OR facebook_url LIKE '%profile.php?id=100006346843714%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngân Babie (ID: 100004983099577)
UPDATE customers SET 
    name = 'Ngân Babie',
    facebook_name = 'Ngân Babie',
    facebook_numeric_id = '100004983099577',
    profile_picture_url = 'https://graph.facebook.com/100004983099577/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngan.babie.98%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004983099577%'
    OR facebook_url LIKE '%profile.php?id=100004983099577%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Luc Pham Van (ID: 100051613541970)
UPDATE customers SET 
    name = 'Luc Pham Van',
    facebook_name = 'Luc Pham Van',
    facebook_numeric_id = '100051613541970',
    profile_picture_url = 'https://graph.facebook.com/100051613541970/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%luc.phamvan.94402%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100051613541970%'
    OR facebook_url LIKE '%profile.php?id=100051613541970%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mac Borin (ID: 100002651298766)
UPDATE customers SET 
    name = 'Mac Borin',
    facebook_name = 'Mac Borin',
    facebook_numeric_id = '100002651298766',
    profile_picture_url = 'https://graph.facebook.com/100002651298766/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bac.macvan%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002651298766%'
    OR facebook_url LIKE '%profile.php?id=100002651298766%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huong Tran (ID: 100003770987728)
UPDATE customers SET 
    name = 'Huong Tran',
    facebook_name = 'Huong Tran',
    facebook_numeric_id = '100003770987728',
    profile_picture_url = 'https://graph.facebook.com/100003770987728/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huongtran.vt%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003770987728%'
    OR facebook_url LIKE '%profile.php?id=100003770987728%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đậu Thu Hiền (ID: 100006382593116)
UPDATE customers SET 
    name = 'Đậu Thu Hiền',
    facebook_name = 'Đậu Thu Hiền',
    facebook_numeric_id = '100006382593116',
    profile_picture_url = 'https://graph.facebook.com/100006382593116/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dauthithu.hien.2851998%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006382593116%'
    OR facebook_url LIKE '%profile.php?id=100006382593116%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anna Ngoc Nguyen (ID: 100009699600371)
UPDATE customers SET 
    name = 'Anna Ngoc Nguyen',
    facebook_name = 'Anna Ngoc Nguyen',
    facebook_numeric_id = '100009699600371',
    profile_picture_url = 'https://graph.facebook.com/100009699600371/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009699600371%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009699600371%'
    OR facebook_url LIKE '%profile.php?id=100009699600371%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lan Trần (ID: 1791177817)
UPDATE customers SET 
    name = 'Lan Trần',
    facebook_name = 'Lan Trần',
    facebook_numeric_id = '1791177817',
    profile_picture_url = 'https://graph.facebook.com/1791177817/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lan.tran.581%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1791177817%'
    OR facebook_url LIKE '%profile.php?id=1791177817%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bùi Luyến (ID: 100000151044721)
UPDATE customers SET 
    name = 'Bùi Luyến',
    facebook_name = 'Bùi Luyến',
    facebook_numeric_id = '100000151044721',
    profile_picture_url = 'https://graph.facebook.com/100000151044721/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%mong.manh.92%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000151044721%'
    OR facebook_url LIKE '%profile.php?id=100000151044721%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- My Mỹ (ID: 100033619493858)
UPDATE customers SET 
    name = 'My Mỹ',
    facebook_name = 'My Mỹ',
    facebook_numeric_id = '100033619493858',
    profile_picture_url = 'https://graph.facebook.com/100033619493858/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100033619493858%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100033619493858%'
    OR facebook_url LIKE '%profile.php?id=100033619493858%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- NU PA KA Chi (ID: 100000131390928)
UPDATE customers SET 
    name = 'NU PA KA Chi',
    facebook_name = 'NU PA KA Chi',
    facebook_numeric_id = '100000131390928',
    profile_picture_url = 'https://graph.facebook.com/100000131390928/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nupa.chi%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000131390928%'
    OR facebook_url LIKE '%profile.php?id=100000131390928%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Pham (ID: 100003346401931)
UPDATE customers SET 
    name = 'Hoa Pham',
    facebook_name = 'Hoa Pham',
    facebook_numeric_id = '100003346401931',
    profile_picture_url = 'https://graph.facebook.com/100003346401931/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huong.pham.56%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003346401931%'
    OR facebook_url LIKE '%profile.php?id=100003346401931%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trinh Quoc Hung (ID: 100002237806913)
UPDATE customers SET 
    name = 'Trinh Quoc Hung',
    facebook_name = 'Trinh Quoc Hung',
    facebook_numeric_id = '100002237806913',
    profile_picture_url = 'https://graph.facebook.com/100002237806913/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trinh.quochung.54%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002237806913%'
    OR facebook_url LIKE '%profile.php?id=100002237806913%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vân Anh (ID: 100005469603415)
UPDATE customers SET 
    name = 'Vân Anh',
    facebook_name = 'Vân Anh',
    facebook_numeric_id = '100005469603415',
    profile_picture_url = 'https://graph.facebook.com/100005469603415/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005469603415%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005469603415%'
    OR facebook_url LIKE '%profile.php?id=100005469603415%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hà Thuận Thuận (ID: 100011495629719)
UPDATE customers SET 
    name = 'Hà Thuận Thuận',
    facebook_name = 'Hà Thuận Thuận',
    facebook_numeric_id = '100011495629719',
    profile_picture_url = 'https://graph.facebook.com/100011495629719/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011495629719%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011495629719%'
    OR facebook_url LIKE '%profile.php?id=100011495629719%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hương Trần- Kimmy (ID: 100009093569729)
UPDATE customers SET 
    name = 'Hương Trần- Kimmy',
    facebook_name = 'Hương Trần- Kimmy',
    facebook_numeric_id = '100009093569729',
    profile_picture_url = 'https://graph.facebook.com/100009093569729/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009093569729%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009093569729%'
    OR facebook_url LIKE '%profile.php?id=100009093569729%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thị Quỳnh Trang (ID: 100086925756651)
UPDATE customers SET 
    name = 'Nguyễn Thị Quỳnh Trang',
    facebook_name = 'Nguyễn Thị Quỳnh Trang',
    facebook_numeric_id = '100086925756651',
    profile_picture_url = 'https://graph.facebook.com/100086925756651/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100086925756651%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100086925756651%'
    OR facebook_url LIKE '%profile.php?id=100086925756651%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hanh Nguyenthi (ID: 100004174934606)
UPDATE customers SET 
    name = 'Hanh Nguyenthi',
    facebook_name = 'Hanh Nguyenthi',
    facebook_numeric_id = '100004174934606',
    profile_picture_url = 'https://graph.facebook.com/100004174934606/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hanh.nguyenthi.982292%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004174934606%'
    OR facebook_url LIKE '%profile.php?id=100004174934606%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hồng Nguyễn (ID: 100003534256575)
UPDATE customers SET 
    name = 'Hồng Nguyễn',
    facebook_name = 'Hồng Nguyễn',
    facebook_numeric_id = '100003534256575',
    profile_picture_url = 'https://graph.facebook.com/100003534256575/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%cohoctrongheoloyeu.hong%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003534256575%'
    OR facebook_url LIKE '%profile.php?id=100003534256575%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Soái Nguyễn (ID: 100029353350491)
UPDATE customers SET 
    name = 'Thanh Soái Nguyễn',
    facebook_name = 'Thanh Soái Nguyễn',
    facebook_numeric_id = '100029353350491',
    profile_picture_url = 'https://graph.facebook.com/100029353350491/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029353350491%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029353350491%'
    OR facebook_url LIKE '%profile.php?id=100029353350491%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Nail (ID: 100007134731287)
UPDATE customers SET 
    name = 'Le Nail',
    facebook_name = 'Le Nail',
    facebook_numeric_id = '100007134731287',
    profile_picture_url = 'https://graph.facebook.com/100007134731287/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huy.lobuoc.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007134731287%'
    OR facebook_url LIKE '%profile.php?id=100007134731287%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Hien Lenka (ID: 100025756816750)
UPDATE customers SET 
    name = 'Thu Hien Lenka',
    facebook_name = 'Thu Hien Lenka',
    facebook_numeric_id = '100025756816750',
    profile_picture_url = 'https://graph.facebook.com/100025756816750/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuhien.dinhthi.7777%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025756816750%'
    OR facebook_url LIKE '%profile.php?id=100025756816750%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hugo Lee (ID: 61555020517084)
UPDATE customers SET 
    name = 'Hugo Lee',
    facebook_name = 'Hugo Lee',
    facebook_numeric_id = '61555020517084',
    profile_picture_url = 'https://graph.facebook.com/61555020517084/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61555020517084%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61555020517084%'
    OR facebook_url LIKE '%profile.php?id=61555020517084%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Nguyen (ID: 61568741036677)
UPDATE customers SET 
    name = 'Thanh Nguyen',
    facebook_name = 'Thanh Nguyen',
    facebook_numeric_id = '61568741036677',
    profile_picture_url = 'https://graph.facebook.com/61568741036677/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61568741036677%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61568741036677%'
    OR facebook_url LIKE '%profile.php?id=61568741036677%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Jully Trinh (ID: 100006987395619)
UPDATE customers SET 
    name = 'Jully Trinh',
    facebook_name = 'Jully Trinh',
    facebook_numeric_id = '100006987395619',
    profile_picture_url = 'https://graph.facebook.com/100006987395619/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%jullytrinhdn%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006987395619%'
    OR facebook_url LIKE '%profile.php?id=100006987395619%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sabrina Nguyen (ID: 61559605469125)
UPDATE customers SET 
    name = 'Sabrina Nguyen',
    facebook_name = 'Sabrina Nguyen',
    facebook_numeric_id = '61559605469125',
    profile_picture_url = 'https://graph.facebook.com/61559605469125/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61559605469125%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61559605469125%'
    OR facebook_url LIKE '%profile.php?id=61559605469125%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuan Trang (ID: 100006706751393)
UPDATE customers SET 
    name = 'Tuan Trang',
    facebook_name = 'Tuan Trang',
    facebook_numeric_id = '100006706751393',
    profile_picture_url = 'https://graph.facebook.com/100006706751393/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuantrang.tuan.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006706751393%'
    OR facebook_url LIKE '%profile.php?id=100006706751393%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hiền NT (ID: 100006346960426)
UPDATE customers SET 
    name = 'Hiền NT',
    facebook_name = 'Hiền NT',
    facebook_numeric_id = '100006346960426',
    profile_picture_url = 'https://graph.facebook.com/100006346960426/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuhien.ngo.733%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006346960426%'
    OR facebook_url LIKE '%profile.php?id=100006346960426%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Emily Nguyen (ID: 100089031790230)
UPDATE customers SET 
    name = 'Emily Nguyen',
    facebook_name = 'Emily Nguyen',
    facebook_numeric_id = '100089031790230',
    profile_picture_url = 'https://graph.facebook.com/100089031790230/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100089031790230%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100089031790230%'
    OR facebook_url LIKE '%profile.php?id=100089031790230%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Mùi (ID: 100062881564795)
UPDATE customers SET 
    name = 'Vũ Mùi',
    facebook_name = 'Vũ Mùi',
    facebook_numeric_id = '100062881564795',
    profile_picture_url = 'https://graph.facebook.com/100062881564795/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vu.mui.1610%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100062881564795%'
    OR facebook_url LIKE '%profile.php?id=100062881564795%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Hang Pham (ID: 100007053732279)
UPDATE customers SET 
    name = 'Thuy Hang Pham',
    facebook_name = 'Thuy Hang Pham',
    facebook_numeric_id = '100007053732279',
    profile_picture_url = 'https://graph.facebook.com/100007053732279/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuyhang.pham.96558%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007053732279%'
    OR facebook_url LIKE '%profile.php?id=100007053732279%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thiên Trâm (ID: 100008345704118)
UPDATE customers SET 
    name = 'Nguyễn Thiên Trâm',
    facebook_name = 'Nguyễn Thiên Trâm',
    facebook_numeric_id = '100008345704118',
    profile_picture_url = 'https://graph.facebook.com/100008345704118/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lenka.nguyen.77736%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008345704118%'
    OR facebook_url LIKE '%profile.php?id=100008345704118%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lananh Bui (ID: 100004312300844)
UPDATE customers SET 
    name = 'Lananh Bui',
    facebook_name = 'Lananh Bui',
    facebook_numeric_id = '100004312300844',
    profile_picture_url = 'https://graph.facebook.com/100004312300844/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lananh.bui.501%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004312300844%'
    OR facebook_url LIKE '%profile.php?id=100004312300844%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cao Thị Dung (ID: 100003767504854)
UPDATE customers SET 
    name = 'Cao Thị Dung',
    facebook_name = 'Cao Thị Dung',
    facebook_numeric_id = '100003767504854',
    profile_picture_url = 'https://graph.facebook.com/100003767504854/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%caodungqn.91%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003767504854%'
    OR facebook_url LIKE '%profile.php?id=100003767504854%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Võ Thị Thuỷ Nga (ID: 100028712080983)
UPDATE customers SET 
    name = 'Võ Thị Thuỷ Nga',
    facebook_name = 'Võ Thị Thuỷ Nga',
    facebook_numeric_id = '100028712080983',
    profile_picture_url = 'https://graph.facebook.com/100028712080983/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nga.vothithuy.568%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028712080983%'
    OR facebook_url LIKE '%profile.php?id=100028712080983%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mai Thanh Hà (ID: 100009372567229)
UPDATE customers SET 
    name = 'Mai Thanh Hà',
    facebook_name = 'Mai Thanh Hà',
    facebook_numeric_id = '100009372567229',
    profile_picture_url = 'https://graph.facebook.com/100009372567229/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thiha.mai.56%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009372567229%'
    OR facebook_url LIKE '%profile.php?id=100009372567229%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hà Kiều Anh (ID: 100005635871607)
UPDATE customers SET 
    name = 'Hà Kiều Anh',
    facebook_name = 'Hà Kiều Anh',
    facebook_numeric_id = '100005635871607',
    profile_picture_url = 'https://graph.facebook.com/100005635871607/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005635871607%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005635871607%'
    OR facebook_url LIKE '%profile.php?id=100005635871607%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bùi Cơ (ID: 100002485560002)
UPDATE customers SET 
    name = 'Bùi Cơ',
    facebook_name = 'Bùi Cơ',
    facebook_numeric_id = '100002485560002',
    profile_picture_url = 'https://graph.facebook.com/100002485560002/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Cobui%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002485560002%'
    OR facebook_url LIKE '%profile.php?id=100002485560002%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuyet Trinh (ID: 100062808127154)
UPDATE customers SET 
    name = 'Tuyet Trinh',
    facebook_name = 'Tuyet Trinh',
    facebook_numeric_id = '100062808127154',
    profile_picture_url = 'https://graph.facebook.com/100062808127154/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thituyet.trinh.796%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100062808127154%'
    OR facebook_url LIKE '%profile.php?id=100062808127154%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Na Na (ID: 565947232)
UPDATE customers SET 
    name = 'Na Na',
    facebook_name = 'Na Na',
    facebook_numeric_id = '565947232',
    profile_picture_url = 'https://graph.facebook.com/565947232/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngocanh.ha.12%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%565947232%'
    OR facebook_url LIKE '%profile.php?id=565947232%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thuý Nga (ID: 100023662380541)
UPDATE customers SET 
    name = 'Nguyễn Thuý Nga',
    facebook_name = 'Nguyễn Thuý Nga',
    facebook_numeric_id = '100023662380541',
    profile_picture_url = 'https://graph.facebook.com/100023662380541/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%anhngadz922.a%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023662380541%'
    OR facebook_url LIKE '%profile.php?id=100023662380541%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Văn Hưng (ID: 100002442982567)
UPDATE customers SET 
    name = 'Phạm Văn Hưng',
    facebook_name = 'Phạm Văn Hưng',
    facebook_numeric_id = '100002442982567',
    profile_picture_url = 'https://graph.facebook.com/100002442982567/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuilachuiday%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002442982567%'
    OR facebook_url LIKE '%profile.php?id=100002442982567%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Thuỷ (ID: 100016724383614)
UPDATE customers SET 
    name = 'Vũ Thuỷ',
    facebook_name = 'Vũ Thuỷ',
    facebook_numeric_id = '100016724383614',
    profile_picture_url = 'https://graph.facebook.com/100016724383614/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016724383614%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016724383614%'
    OR facebook_url LIKE '%profile.php?id=100016724383614%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Marie Tran (ID: 100002111200354)
UPDATE customers SET 
    name = 'Marie Tran',
    facebook_name = 'Marie Tran',
    facebook_numeric_id = '100002111200354',
    profile_picture_url = 'https://graph.facebook.com/100002111200354/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huong.mazur%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002111200354%'
    OR facebook_url LIKE '%profile.php?id=100002111200354%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Toàn Hồnqq (ID: 100021963873285)
UPDATE customers SET 
    name = 'Toàn Hồnqq',
    facebook_name = 'Toàn Hồnqq',
    facebook_numeric_id = '100021963873285',
    profile_picture_url = 'https://graph.facebook.com/100021963873285/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100021963873285%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100021963873285%'
    OR facebook_url LIKE '%profile.php?id=100021963873285%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Tien (ID: 100000079463603)
UPDATE customers SET 
    name = 'Thuy Tien',
    facebook_name = 'Thuy Tien',
    facebook_numeric_id = '100000079463603',
    profile_picture_url = 'https://graph.facebook.com/100000079463603/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuy.tien.94402%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000079463603%'
    OR facebook_url LIKE '%profile.php?id=100000079463603%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trường An (ID: 100089039827615)
UPDATE customers SET 
    name = 'Trường An',
    facebook_name = 'Trường An',
    facebook_numeric_id = '100089039827615',
    profile_picture_url = 'https://graph.facebook.com/100089039827615/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100089039827615%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100089039827615%'
    OR facebook_url LIKE '%profile.php?id=100089039827615%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lê Thảo (ID: 100002531458984)
UPDATE customers SET 
    name = 'Lê Thảo',
    facebook_name = 'Lê Thảo',
    facebook_numeric_id = '100002531458984',
    profile_picture_url = 'https://graph.facebook.com/100002531458984/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lethao.2102%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002531458984%'
    OR facebook_url LIKE '%profile.php?id=100002531458984%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàn Hoàn (ID: 100037446765803)
UPDATE customers SET 
    name = 'Hoàn Hoàn',
    facebook_name = 'Hoàn Hoàn',
    facebook_numeric_id = '100037446765803',
    profile_picture_url = 'https://graph.facebook.com/100037446765803/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100037446765803%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100037446765803%'
    OR facebook_url LIKE '%profile.php?id=100037446765803%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hung Pham (ID: 100038955733415)
UPDATE customers SET 
    name = 'Hung Pham',
    facebook_name = 'Hung Pham',
    facebook_numeric_id = '100038955733415',
    profile_picture_url = 'https://graph.facebook.com/100038955733415/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100038955733415%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100038955733415%'
    OR facebook_url LIKE '%profile.php?id=100038955733415%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kiều Oanh (ID: 100013269666260)
UPDATE customers SET 
    name = 'Kiều Oanh',
    facebook_name = 'Kiều Oanh',
    facebook_numeric_id = '100013269666260',
    profile_picture_url = 'https://graph.facebook.com/100013269666260/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013269666260%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013269666260%'
    OR facebook_url LIKE '%profile.php?id=100013269666260%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Thuy Anh La (ID: 61558441281071)
UPDATE customers SET 
    name = 'Thi Thuy Anh La',
    facebook_name = 'Thi Thuy Anh La',
    facebook_numeric_id = '61558441281071',
    profile_picture_url = 'https://graph.facebook.com/61558441281071/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61558441281071%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61558441281071%'
    OR facebook_url LIKE '%profile.php?id=61558441281071%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Tuyến (ID: 100001078795170)
UPDATE customers SET 
    name = 'Hoàng Tuyến',
    facebook_name = 'Hoàng Tuyến',
    facebook_numeric_id = '100001078795170',
    profile_picture_url = 'https://graph.facebook.com/100001078795170/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%motchotatca%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001078795170%'
    OR facebook_url LIKE '%profile.php?id=100001078795170%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pinky Nguyen (ID: 100003861069519)
UPDATE customers SET 
    name = 'Pinky Nguyen',
    facebook_name = 'Pinky Nguyen',
    facebook_numeric_id = '100003861069519',
    profile_picture_url = 'https://graph.facebook.com/100003861069519/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%pinky.nguyen.359%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003861069519%'
    OR facebook_url LIKE '%profile.php?id=100003861069519%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Xanh Mây (ID: 100081162940475)
UPDATE customers SET 
    name = 'Xanh Mây',
    facebook_name = 'Xanh Mây',
    facebook_numeric_id = '100081162940475',
    profile_picture_url = 'https://graph.facebook.com/100081162940475/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100081162940475%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100081162940475%'
    OR facebook_url LIKE '%profile.php?id=100081162940475%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mộc Trà (ID: 61571390402805)
UPDATE customers SET 
    name = 'Mộc Trà',
    facebook_name = 'Mộc Trà',
    facebook_numeric_id = '61571390402805',
    profile_picture_url = 'https://graph.facebook.com/61571390402805/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61571390402805%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61571390402805%'
    OR facebook_url LIKE '%profile.php?id=61571390402805%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phan Mai Hien (ID: 100008299576383)
UPDATE customers SET 
    name = 'Phan Mai Hien',
    facebook_name = 'Phan Mai Hien',
    facebook_numeric_id = '100008299576383',
    profile_picture_url = 'https://graph.facebook.com/100008299576383/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008299576383%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008299576383%'
    OR facebook_url LIKE '%profile.php?id=100008299576383%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Do Nails (ID: 100075055761180)
UPDATE customers SET 
    name = 'Do Nails',
    facebook_name = 'Do Nails',
    facebook_numeric_id = '100075055761180',
    profile_picture_url = 'https://graph.facebook.com/100075055761180/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100075055761180%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100075055761180%'
    OR facebook_url LIKE '%profile.php?id=100075055761180%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anna Pham (ID: 100003124604034)
UPDATE customers SET 
    name = 'Anna Pham',
    facebook_name = 'Anna Pham',
    facebook_numeric_id = '100003124604034',
    profile_picture_url = 'https://graph.facebook.com/100003124604034/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%luyen.b.pham%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003124604034%'
    OR facebook_url LIKE '%profile.php?id=100003124604034%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Thị Thoa (ID: 100006054826127)
UPDATE customers SET 
    name = 'Vũ Thị Thoa',
    facebook_name = 'Vũ Thị Thoa',
    facebook_numeric_id = '100006054826127',
    profile_picture_url = 'https://graph.facebook.com/100006054826127/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Thoavip.vn%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006054826127%'
    OR facebook_url LIKE '%profile.php?id=100006054826127%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lyna Mai (ID: 100011317117239)
UPDATE customers SET 
    name = 'Lyna Mai',
    facebook_name = 'Lyna Mai',
    facebook_numeric_id = '100011317117239',
    profile_picture_url = 'https://graph.facebook.com/100011317117239/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bichla.mai%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011317117239%'
    OR facebook_url LIKE '%profile.php?id=100011317117239%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pj Pham (ID: 100003668028147)
UPDATE customers SET 
    name = 'Pj Pham',
    facebook_name = 'Pj Pham',
    facebook_numeric_id = '100003668028147',
    profile_picture_url = 'https://graph.facebook.com/100003668028147/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nga.phamtithuy%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003668028147%'
    OR facebook_url LIKE '%profile.php?id=100003668028147%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Huyen (ID: 100004368190324)
UPDATE customers SET 
    name = 'Thu Huyen',
    facebook_name = 'Thu Huyen',
    facebook_numeric_id = '100004368190324',
    profile_picture_url = 'https://graph.facebook.com/100004368190324/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004368190324%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004368190324%'
    OR facebook_url LIKE '%profile.php?id=100004368190324%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Lan (ID: 100017156956390)
UPDATE customers SET 
    name = 'Nguyen Lan',
    facebook_name = 'Nguyen Lan',
    facebook_numeric_id = '100017156956390',
    profile_picture_url = 'https://graph.facebook.com/100017156956390/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyenlan468456%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100017156956390%'
    OR facebook_url LIKE '%profile.php?id=100017156956390%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Thi Ngoc Anh (ID: 100005863171764)
UPDATE customers SET 
    name = 'Nguyen Thi Ngoc Anh',
    facebook_name = 'Nguyen Thi Ngoc Anh',
    facebook_numeric_id = '100005863171764',
    profile_picture_url = 'https://graph.facebook.com/100005863171764/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngocanhcxfgg%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005863171764%'
    OR facebook_url LIKE '%profile.php?id=100005863171764%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lin Vy (ID: 100008365058635)
UPDATE customers SET 
    name = 'Lin Vy',
    facebook_name = 'Lin Vy',
    facebook_numeric_id = '100008365058635',
    profile_picture_url = 'https://graph.facebook.com/100008365058635/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008365058635%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008365058635%'
    OR facebook_url LIKE '%profile.php?id=100008365058635%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lumi Glow Lash (ID: 61553563685517)
UPDATE customers SET 
    name = 'Lumi Glow Lash',
    facebook_name = 'Lumi Glow Lash',
    facebook_numeric_id = '61553563685517',
    profile_picture_url = 'https://graph.facebook.com/61553563685517/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61553563685517%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61553563685517%'
    OR facebook_url LIKE '%profile.php?id=61553563685517%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Annahau Nguyen (ID: 100014339552090)
UPDATE customers SET 
    name = 'Annahau Nguyen',
    facebook_name = 'Annahau Nguyen',
    facebook_numeric_id = '100014339552090',
    profile_picture_url = 'https://graph.facebook.com/100014339552090/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%annahau.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014339552090%'
    OR facebook_url LIKE '%profile.php?id=100014339552090%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pham Nhàn (ID: 100008672466588)
UPDATE customers SET 
    name = 'Pham Nhàn',
    facebook_name = 'Pham Nhàn',
    facebook_numeric_id = '100008672466588',
    profile_picture_url = 'https://graph.facebook.com/100008672466588/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008672466588%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008672466588%'
    OR facebook_url LIKE '%profile.php?id=100008672466588%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nhung Hoa (ID: 100010337348227)
UPDATE customers SET 
    name = 'Nhung Hoa',
    facebook_name = 'Nhung Hoa',
    facebook_numeric_id = '100010337348227',
    profile_picture_url = 'https://graph.facebook.com/100010337348227/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nhung.hoa.79%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010337348227%'
    OR facebook_url LIKE '%profile.php?id=100010337348227%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuyet Mai Hoang (ID: 100001878253824)
UPDATE customers SET 
    name = 'Tuyet Mai Hoang',
    facebook_name = 'Tuyet Mai Hoang',
    facebook_numeric_id = '100001878253824',
    profile_picture_url = 'https://graph.facebook.com/100001878253824/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuyetmai.hoang.96%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001878253824%'
    OR facebook_url LIKE '%profile.php?id=100001878253824%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lananh Vu (ID: 100010284191874)
UPDATE customers SET 
    name = 'Lananh Vu',
    facebook_name = 'Lananh Vu',
    facebook_numeric_id = '100010284191874',
    profile_picture_url = 'https://graph.facebook.com/100010284191874/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lananh.vu.33234%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010284191874%'
    OR facebook_url LIKE '%profile.php?id=100010284191874%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Văn Chung (ID: 100051108791383)
UPDATE customers SET 
    name = 'Nguyễn Văn Chung',
    facebook_name = 'Nguyễn Văn Chung',
    facebook_numeric_id = '100051108791383',
    profile_picture_url = 'https://graph.facebook.com/100051108791383/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100051108791383%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100051108791383%'
    OR facebook_url LIKE '%profile.php?id=100051108791383%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hai Yen (ID: 100000894671120)
UPDATE customers SET 
    name = 'Hai Yen',
    facebook_name = 'Hai Yen',
    facebook_numeric_id = '100000894671120',
    profile_picture_url = 'https://graph.facebook.com/100000894671120/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%haiyen.hothi%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000894671120%'
    OR facebook_url LIKE '%profile.php?id=100000894671120%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tân Thanh (ID: 100041484172773)
UPDATE customers SET 
    name = 'Tân Thanh',
    facebook_name = 'Tân Thanh',
    facebook_numeric_id = '100041484172773',
    profile_picture_url = 'https://graph.facebook.com/100041484172773/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041484172773%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041484172773%'
    OR facebook_url LIKE '%profile.php?id=100041484172773%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Linh Le (ID: 100049730833914)
UPDATE customers SET 
    name = 'Linh Le',
    facebook_name = 'Linh Le',
    facebook_numeric_id = '100049730833914',
    profile_picture_url = 'https://graph.facebook.com/100049730833914/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100049730833914%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100049730833914%'
    OR facebook_url LIKE '%profile.php?id=100049730833914%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hani Pham (ID: 100003545273243)
UPDATE customers SET 
    name = 'Hani Pham',
    facebook_name = 'Hani Pham',
    facebook_numeric_id = '100003545273243',
    profile_picture_url = 'https://graph.facebook.com/100003545273243/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hani.pham.16%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003545273243%'
    OR facebook_url LIKE '%profile.php?id=100003545273243%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quý Nguyễn (ID: 100075844477880)
UPDATE customers SET 
    name = 'Quý Nguyễn',
    facebook_name = 'Quý Nguyễn',
    facebook_numeric_id = '100075844477880',
    profile_picture_url = 'https://graph.facebook.com/100075844477880/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100075844477880%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100075844477880%'
    OR facebook_url LIKE '%profile.php?id=100075844477880%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bảo Châu (ID: 100013170454408)
UPDATE customers SET 
    name = 'Bảo Châu',
    facebook_name = 'Bảo Châu',
    facebook_numeric_id = '100013170454408',
    profile_picture_url = 'https://graph.facebook.com/100013170454408/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thong.lanh.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013170454408%'
    OR facebook_url LIKE '%profile.php?id=100013170454408%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ha Thu Dinh (ID: 100002684408136)
UPDATE customers SET 
    name = 'Ha Thu Dinh',
    facebook_name = 'Ha Thu Dinh',
    facebook_numeric_id = '100002684408136',
    profile_picture_url = 'https://graph.facebook.com/100002684408136/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002684408136%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002684408136%'
    OR facebook_url LIKE '%profile.php?id=100002684408136%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuongnhung Tran Nguyen (ID: 100000973575790)
UPDATE customers SET 
    name = 'Phuongnhung Tran Nguyen',
    facebook_name = 'Phuongnhung Tran Nguyen',
    facebook_numeric_id = '100000973575790',
    profile_picture_url = 'https://graph.facebook.com/100000973575790/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuongnhung.trannguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000973575790%'
    OR facebook_url LIKE '%profile.php?id=100000973575790%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Hieu (ID: 100004018699489)
UPDATE customers SET 
    name = 'Nguyen Hieu',
    facebook_name = 'Nguyen Hieu',
    facebook_numeric_id = '100004018699489',
    profile_picture_url = 'https://graph.facebook.com/100004018699489/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyenhieu1974%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004018699489%'
    OR facebook_url LIKE '%profile.php?id=100004018699489%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mai Huong Nguyen (ID: 100084249892588)
UPDATE customers SET 
    name = 'Mai Huong Nguyen',
    facebook_name = 'Mai Huong Nguyen',
    facebook_numeric_id = '100084249892588',
    profile_picture_url = 'https://graph.facebook.com/100084249892588/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100084249892588%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100084249892588%'
    OR facebook_url LIKE '%profile.php?id=100084249892588%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Phương (ID: 100001699554662)
UPDATE customers SET 
    name = 'Vũ Phương',
    facebook_name = 'Vũ Phương',
    facebook_numeric_id = '100001699554662',
    profile_picture_url = 'https://graph.facebook.com/100001699554662/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuong.vu.1910%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001699554662%'
    OR facebook_url LIKE '%profile.php?id=100001699554662%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Diệp Chi (ID: 100021979486681)
UPDATE customers SET 
    name = 'Trần Diệp Chi',
    facebook_name = 'Trần Diệp Chi',
    facebook_numeric_id = '100021979486681',
    profile_picture_url = 'https://graph.facebook.com/100021979486681/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%chi.trandiep.50%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100021979486681%'
    OR facebook_url LIKE '%profile.php?id=100021979486681%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đặng Duy Quang (ID: 100035951834905)
UPDATE customers SET 
    name = 'Đặng Duy Quang',
    facebook_name = 'Đặng Duy Quang',
    facebook_numeric_id = '100035951834905',
    profile_picture_url = 'https://graph.facebook.com/100035951834905/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100035951834905%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100035951834905%'
    OR facebook_url LIKE '%profile.php?id=100035951834905%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Vân (ID: 100004628947832)
UPDATE customers SET 
    name = 'Thanh Vân',
    facebook_name = 'Thanh Vân',
    facebook_numeric_id = '100004628947832',
    profile_picture_url = 'https://graph.facebook.com/100004628947832/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004628947832%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004628947832%'
    OR facebook_url LIKE '%profile.php?id=100004628947832%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Giang Bùi (ID: 61561736581697)
UPDATE customers SET 
    name = 'Giang Bùi',
    facebook_name = 'Giang Bùi',
    facebook_numeric_id = '61561736581697',
    profile_picture_url = 'https://graph.facebook.com/61561736581697/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61561736581697%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61561736581697%'
    OR facebook_url LIKE '%profile.php?id=61561736581697%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dung Phạm Thị (ID: 100007251255106)
UPDATE customers SET 
    name = 'Dung Phạm Thị',
    facebook_name = 'Dung Phạm Thị',
    facebook_numeric_id = '100007251255106',
    profile_picture_url = 'https://graph.facebook.com/100007251255106/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007251255106%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007251255106%'
    OR facebook_url LIKE '%profile.php?id=100007251255106%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Trang (ID: 100013829949048)
UPDATE customers SET 
    name = 'Vũ Trang',
    facebook_name = 'Vũ Trang',
    facebook_numeric_id = '100013829949048',
    profile_picture_url = 'https://graph.facebook.com/100013829949048/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vu.trang.311493%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013829949048%'
    OR facebook_url LIKE '%profile.php?id=100013829949048%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anh Ngoc Anh (ID: 100094421859220)
UPDATE customers SET 
    name = 'Anh Ngoc Anh',
    facebook_name = 'Anh Ngoc Anh',
    facebook_numeric_id = '100094421859220',
    profile_picture_url = 'https://graph.facebook.com/100094421859220/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100094421859220%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100094421859220%'
    OR facebook_url LIKE '%profile.php?id=100094421859220%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Nguyen (ID: 100000525484842)
UPDATE customers SET 
    name = 'Trang Nguyen',
    facebook_name = 'Trang Nguyen',
    facebook_numeric_id = '100000525484842',
    profile_picture_url = 'https://graph.facebook.com/100000525484842/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Mausebar9949%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000525484842%'
    OR facebook_url LIKE '%profile.php?id=100000525484842%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cindy Nguyen (ID: 100013226372558)
UPDATE customers SET 
    name = 'Cindy Nguyen',
    facebook_name = 'Cindy Nguyen',
    facebook_numeric_id = '100013226372558',
    profile_picture_url = 'https://graph.facebook.com/100013226372558/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%my.nguyenhuyen.940%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013226372558%'
    OR facebook_url LIKE '%profile.php?id=100013226372558%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyen Tran (ID: 100085671341302)
UPDATE customers SET 
    name = 'Huyen Tran',
    facebook_name = 'Huyen Tran',
    facebook_numeric_id = '100085671341302',
    profile_picture_url = 'https://graph.facebook.com/100085671341302/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100085671341302%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100085671341302%'
    OR facebook_url LIKE '%profile.php?id=100085671341302%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngo Xuan Truong (ID: 100000873891421)
UPDATE customers SET 
    name = 'Ngo Xuan Truong',
    facebook_name = 'Ngo Xuan Truong',
    facebook_numeric_id = '100000873891421',
    profile_picture_url = 'https://graph.facebook.com/100000873891421/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%truong.ngoxuan.94%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000873891421%'
    OR facebook_url LIKE '%profile.php?id=100000873891421%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Eva Nail (ID: 100009896324475)
UPDATE customers SET 
    name = 'Eva Nail',
    facebook_name = 'Eva Nail',
    facebook_numeric_id = '100009896324475',
    profile_picture_url = 'https://graph.facebook.com/100009896324475/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%eva.nail.140%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009896324475%'
    OR facebook_url LIKE '%profile.php?id=100009896324475%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thibinh Le (ID: 100005997394765)
UPDATE customers SET 
    name = 'Thibinh Le',
    facebook_name = 'Thibinh Le',
    facebook_numeric_id = '100005997394765',
    profile_picture_url = 'https://graph.facebook.com/100005997394765/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thibinh.le.50%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005997394765%'
    OR facebook_url LIKE '%profile.php?id=100005997394765%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuc Truong (ID: 100004449422774)
UPDATE customers SET 
    name = 'Phuc Truong',
    facebook_name = 'Phuc Truong',
    facebook_numeric_id = '100004449422774',
    profile_picture_url = 'https://graph.facebook.com/100004449422774/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuc.truong.9085%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004449422774%'
    OR facebook_url LIKE '%profile.php?id=100004449422774%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anna Nguyen (ID: 100006030035642)
UPDATE customers SET 
    name = 'Anna Nguyen',
    facebook_name = 'Anna Nguyen',
    facebook_numeric_id = '100006030035642',
    profile_picture_url = 'https://graph.facebook.com/100006030035642/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%linhh.nguyen.5876%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006030035642%'
    OR facebook_url LIKE '%profile.php?id=100006030035642%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Nguyen (ID: 100002779969419)
UPDATE customers SET 
    name = 'Hoa Nguyen',
    facebook_name = 'Hoa Nguyen',
    facebook_numeric_id = '100002779969419',
    profile_picture_url = 'https://graph.facebook.com/100002779969419/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002779969419%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002779969419%'
    OR facebook_url LIKE '%profile.php?id=100002779969419%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Na Na (ID: 100002515315133)
UPDATE customers SET 
    name = 'Na Na',
    facebook_name = 'Na Na',
    facebook_numeric_id = '100002515315133',
    profile_picture_url = 'https://graph.facebook.com/100002515315133/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ThuNa225%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002515315133%'
    OR facebook_url LIKE '%profile.php?id=100002515315133%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Martin YS (ID: 100002618563176)
UPDATE customers SET 
    name = 'Martin YS',
    facebook_name = 'Martin YS',
    facebook_numeric_id = '100002618563176',
    profile_picture_url = 'https://graph.facebook.com/100002618563176/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngothienlong%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002618563176%'
    OR facebook_url LIKE '%profile.php?id=100002618563176%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Đình Hậu (ID: 100000576187620)
UPDATE customers SET 
    name = 'Phạm Đình Hậu',
    facebook_name = 'Phạm Đình Hậu',
    facebook_numeric_id = '100000576187620',
    profile_picture_url = 'https://graph.facebook.com/100000576187620/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hau.pham.5203%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000576187620%'
    OR facebook_url LIKE '%profile.php?id=100000576187620%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Manh Dang (ID: 100010531653706)
UPDATE customers SET 
    name = 'Manh Dang',
    facebook_name = 'Manh Dang',
    facebook_numeric_id = '100010531653706',
    profile_picture_url = 'https://graph.facebook.com/100010531653706/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010531653706%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010531653706%'
    OR facebook_url LIKE '%profile.php?id=100010531653706%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cẩm Nhung Nguyễn (ID: 100002670035147)
UPDATE customers SET 
    name = 'Cẩm Nhung Nguyễn',
    facebook_name = 'Cẩm Nhung Nguyễn',
    facebook_numeric_id = '100002670035147',
    profile_picture_url = 'https://graph.facebook.com/100002670035147/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thicamnhung.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002670035147%'
    OR facebook_url LIKE '%profile.php?id=100002670035147%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hồng Thơm (ID: 1699825554)
UPDATE customers SET 
    name = 'Hồng Thơm',
    facebook_name = 'Hồng Thơm',
    facebook_numeric_id = '1699825554',
    profile_picture_url = 'https://graph.facebook.com/1699825554/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Ntht.m%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1699825554%'
    OR facebook_url LIKE '%profile.php?id=1699825554%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Quốc Vinh (ID: 100054152101207)
UPDATE customers SET 
    name = 'Trần Quốc Vinh',
    facebook_name = 'Trần Quốc Vinh',
    facebook_numeric_id = '100054152101207',
    profile_picture_url = 'https://graph.facebook.com/100054152101207/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vinh.tranquoc.121772%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100054152101207%'
    OR facebook_url LIKE '%profile.php?id=100054152101207%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Oanh Duong (ID: 100009725048038)
UPDATE customers SET 
    name = 'Oanh Duong',
    facebook_name = 'Oanh Duong',
    facebook_numeric_id = '100009725048038',
    profile_picture_url = 'https://graph.facebook.com/100009725048038/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009725048038%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009725048038%'
    OR facebook_url LIKE '%profile.php?id=100009725048038%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hải Âu (ID: 100001616431158)
UPDATE customers SET 
    name = 'Hải Âu',
    facebook_name = 'Hải Âu',
    facebook_numeric_id = '100001616431158',
    profile_picture_url = 'https://graph.facebook.com/100001616431158/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nhathao.nguyen.94%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001616431158%'
    OR facebook_url LIKE '%profile.php?id=100001616431158%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Công Phan (ID: 100023423737719)
UPDATE customers SET 
    name = 'Công Phan',
    facebook_name = 'Công Phan',
    facebook_numeric_id = '100023423737719',
    profile_picture_url = 'https://graph.facebook.com/100023423737719/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023423737719%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023423737719%'
    OR facebook_url LIKE '%profile.php?id=100023423737719%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quang Nguyen (ID: 100027659940735)
UPDATE customers SET 
    name = 'Quang Nguyen',
    facebook_name = 'Quang Nguyen',
    facebook_numeric_id = '100027659940735',
    profile_picture_url = 'https://graph.facebook.com/100027659940735/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027659940735%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027659940735%'
    OR facebook_url LIKE '%profile.php?id=100027659940735%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huong Tran (ID: 100003795680993)
UPDATE customers SET 
    name = 'Huong Tran',
    facebook_name = 'Huong Tran',
    facebook_numeric_id = '100003795680993',
    profile_picture_url = 'https://graph.facebook.com/100003795680993/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003795680993%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003795680993%'
    OR facebook_url LIKE '%profile.php?id=100003795680993%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hùng Nguyễn (ID: 100006703081324)
UPDATE customers SET 
    name = 'Hùng Nguyễn',
    facebook_name = 'Hùng Nguyễn',
    facebook_numeric_id = '100006703081324',
    profile_picture_url = 'https://graph.facebook.com/100006703081324/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%h%C3%B9ng-nguy%E1%BB%85n-100006703081324%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006703081324%'
    OR facebook_url LIKE '%profile.php?id=100006703081324%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyền Nguyễn (ID: 100004056559782)
UPDATE customers SET 
    name = 'Huyền Nguyễn',
    facebook_name = 'Huyền Nguyễn',
    facebook_numeric_id = '100004056559782',
    profile_picture_url = 'https://graph.facebook.com/100004056559782/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%map.pe.758%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004056559782%'
    OR facebook_url LIKE '%profile.php?id=100004056559782%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuong Hong (ID: 100046207563776)
UPDATE customers SET 
    name = 'Phuong Hong',
    facebook_name = 'Phuong Hong',
    facebook_numeric_id = '100046207563776',
    profile_picture_url = 'https://graph.facebook.com/100046207563776/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100046207563776%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100046207563776%'
    OR facebook_url LIKE '%profile.php?id=100046207563776%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Thi Nguyen (ID: 100004006795245)
UPDATE customers SET 
    name = 'Thu Thi Nguyen',
    facebook_name = 'Thu Thi Nguyen',
    facebook_numeric_id = '100004006795245',
    profile_picture_url = 'https://graph.facebook.com/100004006795245/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuthinguyen999%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004006795245%'
    OR facebook_url LIKE '%profile.php?id=100004006795245%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pauls Nguyen (ID: 100063004809575)
UPDATE customers SET 
    name = 'Pauls Nguyen',
    facebook_name = 'Pauls Nguyen',
    facebook_numeric_id = '100063004809575',
    profile_picture_url = 'https://graph.facebook.com/100063004809575/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100063004809575%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100063004809575%'
    OR facebook_url LIKE '%profile.php?id=100063004809575%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pham Yen (ID: 100000003939618)
UPDATE customers SET 
    name = 'Pham Yen',
    facebook_name = 'Pham Yen',
    facebook_numeric_id = '100000003939618',
    profile_picture_url = 'https://graph.facebook.com/100000003939618/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%pham.yen.357%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000003939618%'
    OR facebook_url LIKE '%profile.php?id=100000003939618%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bao Nam Ngo (ID: 100002429297830)
UPDATE customers SET 
    name = 'Bao Nam Ngo',
    facebook_name = 'Bao Nam Ngo',
    facebook_numeric_id = '100002429297830',
    profile_picture_url = 'https://graph.facebook.com/100002429297830/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%beckhamviet.ngo%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002429297830%'
    OR facebook_url LIKE '%profile.php?id=100002429297830%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Sơn (ID: 100017125445981)
UPDATE customers SET 
    name = 'Hoàng Sơn',
    facebook_name = 'Hoàng Sơn',
    facebook_numeric_id = '100017125445981',
    profile_picture_url = 'https://graph.facebook.com/100017125445981/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tonda.le.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100017125445981%'
    OR facebook_url LIKE '%profile.php?id=100017125445981%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Long (ID: 61558039005652)
UPDATE customers SET 
    name = 'Minh Long',
    facebook_name = 'Minh Long',
    facebook_numeric_id = '61558039005652',
    profile_picture_url = 'https://graph.facebook.com/61558039005652/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61558039005652%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61558039005652%'
    OR facebook_url LIKE '%profile.php?id=61558039005652%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quang Bình (ID: 100004794098270)
UPDATE customers SET 
    name = 'Quang Bình',
    facebook_name = 'Quang Bình',
    facebook_numeric_id = '100004794098270',
    profile_picture_url = 'https://graph.facebook.com/100004794098270/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%CkHoayeu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004794098270%'
    OR facebook_url LIKE '%profile.php?id=100004794098270%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kiều Vân (ID: 100001394159123)
UPDATE customers SET 
    name = 'Kiều Vân',
    facebook_name = 'Kiều Vân',
    facebook_numeric_id = '100001394159123',
    profile_picture_url = 'https://graph.facebook.com/100001394159123/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%kieuvan.le1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001394159123%'
    OR facebook_url LIKE '%profile.php?id=100001394159123%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngocle Tran (ID: 100012613035290)
UPDATE customers SET 
    name = 'Ngocle Tran',
    facebook_name = 'Ngocle Tran',
    facebook_numeric_id = '100012613035290',
    profile_picture_url = 'https://graph.facebook.com/100012613035290/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngocle.tran.106%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012613035290%'
    OR facebook_url LIKE '%profile.php?id=100012613035290%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Văn Giáp (ID: 100011480826243)
UPDATE customers SET 
    name = 'Nguyễn Văn Giáp',
    facebook_name = 'Nguyễn Văn Giáp',
    facebook_numeric_id = '100011480826243',
    profile_picture_url = 'https://graph.facebook.com/100011480826243/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tien.totung.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011480826243%'
    OR facebook_url LIKE '%profile.php?id=100011480826243%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Hương Giang (ID: 100027529020738)
UPDATE customers SET 
    name = 'Nguyễn Hương Giang',
    facebook_name = 'Nguyễn Hương Giang',
    facebook_numeric_id = '100027529020738',
    profile_picture_url = 'https://graph.facebook.com/100027529020738/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%giangkeoo.1812%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027529020738%'
    OR facebook_url LIKE '%profile.php?id=100027529020738%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Angela Julie (ID: 100011100697470)
UPDATE customers SET 
    name = 'Angela Julie',
    facebook_name = 'Angela Julie',
    facebook_numeric_id = '100011100697470',
    profile_picture_url = 'https://graph.facebook.com/100011100697470/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%chau.angela.90%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011100697470%'
    OR facebook_url LIKE '%profile.php?id=100011100697470%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dung Tran (ID: 100003164338570)
UPDATE customers SET 
    name = 'Dung Tran',
    facebook_name = 'Dung Tran',
    facebook_numeric_id = '100003164338570',
    profile_picture_url = 'https://graph.facebook.com/100003164338570/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dung.phs%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003164338570%'
    OR facebook_url LIKE '%profile.php?id=100003164338570%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Kim Phượng (ID: 61552426880898)
UPDATE customers SET 
    name = 'Nguyễn Kim Phượng',
    facebook_name = 'Nguyễn Kim Phượng',
    facebook_numeric_id = '61552426880898',
    profile_picture_url = 'https://graph.facebook.com/61552426880898/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61552426880898%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61552426880898%'
    OR facebook_url LIKE '%profile.php?id=61552426880898%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Đinh (ID: 100001346271154)
UPDATE customers SET 
    name = 'Hoàng Đinh',
    facebook_name = 'Hoàng Đinh',
    facebook_numeric_id = '100001346271154',
    profile_picture_url = 'https://graph.facebook.com/100001346271154/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Managerofsinglefootballteam%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001346271154%'
    OR facebook_url LIKE '%profile.php?id=100001346271154%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anna Nguyen (ID: 100006280052880)
UPDATE customers SET 
    name = 'Anna Nguyen',
    facebook_name = 'Anna Nguyen',
    facebook_numeric_id = '100006280052880',
    profile_picture_url = 'https://graph.facebook.com/100006280052880/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006280052880%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006280052880%'
    OR facebook_url LIKE '%profile.php?id=100006280052880%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hong Nhung Nguyen (ID: 100084425663563)
UPDATE customers SET 
    name = 'Hong Nhung Nguyen',
    facebook_name = 'Hong Nhung Nguyen',
    facebook_numeric_id = '100084425663563',
    profile_picture_url = 'https://graph.facebook.com/100084425663563/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100084425663563%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100084425663563%'
    OR facebook_url LIKE '%profile.php?id=100084425663563%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anh Nguyen (ID: 100001790235531)
UPDATE customers SET 
    name = 'Anh Nguyen',
    facebook_name = 'Anh Nguyen',
    facebook_numeric_id = '100001790235531',
    profile_picture_url = 'https://graph.facebook.com/100001790235531/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001790235531%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001790235531%'
    OR facebook_url LIKE '%profile.php?id=100001790235531%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tran Minh An (ID: 100004187347361)
UPDATE customers SET 
    name = 'Tran Minh An',
    facebook_name = 'Tran Minh An',
    facebook_numeric_id = '100004187347361',
    profile_picture_url = 'https://graph.facebook.com/100004187347361/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004187347361%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004187347361%'
    OR facebook_url LIKE '%profile.php?id=100004187347361%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vietanh Nguyen (ID: 100010377255327)
UPDATE customers SET 
    name = 'Vietanh Nguyen',
    facebook_name = 'Vietanh Nguyen',
    facebook_numeric_id = '100010377255327',
    profile_picture_url = 'https://graph.facebook.com/100010377255327/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010377255327%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010377255327%'
    OR facebook_url LIKE '%profile.php?id=100010377255327%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duongthao Dang (ID: 100008924802275)
UPDATE customers SET 
    name = 'Duongthao Dang',
    facebook_name = 'Duongthao Dang',
    facebook_numeric_id = '100008924802275',
    profile_picture_url = 'https://graph.facebook.com/100008924802275/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008924802275%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008924802275%'
    OR facebook_url LIKE '%profile.php?id=100008924802275%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cherry Le (ID: 100034577192136)
UPDATE customers SET 
    name = 'Cherry Le',
    facebook_name = 'Cherry Le',
    facebook_numeric_id = '100034577192136',
    profile_picture_url = 'https://graph.facebook.com/100034577192136/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%cherry.le.58152559%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100034577192136%'
    OR facebook_url LIKE '%profile.php?id=100034577192136%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Cẩm Linh (ID: 100005588805670)
UPDATE customers SET 
    name = 'Trần Cẩm Linh',
    facebook_name = 'Trần Cẩm Linh',
    facebook_numeric_id = '100005588805670',
    profile_picture_url = 'https://graph.facebook.com/100005588805670/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005588805670%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005588805670%'
    OR facebook_url LIKE '%profile.php?id=100005588805670%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Luu Gia Bao (ID: 100000693303028)
UPDATE customers SET 
    name = 'Luu Gia Bao',
    facebook_name = 'Luu Gia Bao',
    facebook_numeric_id = '100000693303028',
    profile_picture_url = 'https://graph.facebook.com/100000693303028/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%luu.giang1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000693303028%'
    OR facebook_url LIKE '%profile.php?id=100000693303028%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sadny Bn (ID: 100008542519195)
UPDATE customers SET 
    name = 'Sadny Bn',
    facebook_name = 'Sadny Bn',
    facebook_numeric_id = '100008542519195',
    profile_picture_url = 'https://graph.facebook.com/100008542519195/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008542519195%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008542519195%'
    OR facebook_url LIKE '%profile.php?id=100008542519195%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đăng Tuyết Nhi (ID: 100021349922959)
UPDATE customers SET 
    name = 'Đăng Tuyết Nhi',
    facebook_name = 'Đăng Tuyết Nhi',
    facebook_numeric_id = '100021349922959',
    profile_picture_url = 'https://graph.facebook.com/100021349922959/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100021349922959%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100021349922959%'
    OR facebook_url LIKE '%profile.php?id=100021349922959%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Phương (ID: 100004520311971)
UPDATE customers SET 
    name = 'Thu Phương',
    facebook_name = 'Thu Phương',
    facebook_numeric_id = '100004520311971',
    profile_picture_url = 'https://graph.facebook.com/100004520311971/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004520311971%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004520311971%'
    OR facebook_url LIKE '%profile.php?id=100004520311971%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Thu Quyen Tran (ID: 100039210227348)
UPDATE customers SET 
    name = 'Thi Thu Quyen Tran',
    facebook_name = 'Thi Thu Quyen Tran',
    facebook_numeric_id = '100039210227348',
    profile_picture_url = 'https://graph.facebook.com/100039210227348/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thithuquyen.tran.52%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100039210227348%'
    OR facebook_url LIKE '%profile.php?id=100039210227348%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Jin Boo (ID: 100000291353241)
UPDATE customers SET 
    name = 'Jin Boo',
    facebook_name = 'Jin Boo',
    facebook_numeric_id = '100000291353241',
    profile_picture_url = 'https://graph.facebook.com/100000291353241/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%jin.boo.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000291353241%'
    OR facebook_url LIKE '%profile.php?id=100000291353241%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nhung Nguyen (ID: 61556703465963)
UPDATE customers SET 
    name = 'Nhung Nguyen',
    facebook_name = 'Nhung Nguyen',
    facebook_numeric_id = '61556703465963',
    profile_picture_url = 'https://graph.facebook.com/61556703465963/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61556703465963%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61556703465963%'
    OR facebook_url LIKE '%profile.php?id=61556703465963%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đậu Huyền (ID: 100077744868258)
UPDATE customers SET 
    name = 'Đậu Huyền',
    facebook_name = 'Đậu Huyền',
    facebook_numeric_id = '100077744868258',
    profile_picture_url = 'https://graph.facebook.com/100077744868258/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100077744868258%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100077744868258%'
    OR facebook_url LIKE '%profile.php?id=100077744868258%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngoc Tuan Nguyen (ID: 100015466331816)
UPDATE customers SET 
    name = 'Ngoc Tuan Nguyen',
    facebook_name = 'Ngoc Tuan Nguyen',
    facebook_numeric_id = '100015466331816',
    profile_picture_url = 'https://graph.facebook.com/100015466331816/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015466331816%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015466331816%'
    OR facebook_url LIKE '%profile.php?id=100015466331816%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cam Van (ID: 100024013969300)
UPDATE customers SET 
    name = 'Cam Van',
    facebook_name = 'Cam Van',
    facebook_numeric_id = '100024013969300',
    profile_picture_url = 'https://graph.facebook.com/100024013969300/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024013969300%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024013969300%'
    OR facebook_url LIKE '%profile.php?id=100024013969300%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bich Ha Kist (ID: 100006524551714)
UPDATE customers SET 
    name = 'Bich Ha Kist',
    facebook_name = 'Bich Ha Kist',
    facebook_numeric_id = '100006524551714',
    profile_picture_url = 'https://graph.facebook.com/100006524551714/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bichha.kist.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006524551714%'
    OR facebook_url LIKE '%profile.php?id=100006524551714%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Thảo (ID: 100009032854647)
UPDATE customers SET 
    name = 'Thu Thảo',
    facebook_name = 'Thu Thảo',
    facebook_numeric_id = '100009032854647',
    profile_picture_url = 'https://graph.facebook.com/100009032854647/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thao.uoqbuoq%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009032854647%'
    OR facebook_url LIKE '%profile.php?id=100009032854647%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nien Phamnien (ID: 100004265313255)
UPDATE customers SET 
    name = 'Nien Phamnien',
    facebook_name = 'Nien Phamnien',
    facebook_numeric_id = '100004265313255',
    profile_picture_url = 'https://graph.facebook.com/100004265313255/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nien.phamnien%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004265313255%'
    OR facebook_url LIKE '%profile.php?id=100004265313255%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tùng Dương (ID: 100018538784398)
UPDATE customers SET 
    name = 'Tùng Dương',
    facebook_name = 'Tùng Dương',
    facebook_numeric_id = '100018538784398',
    profile_picture_url = 'https://graph.facebook.com/100018538784398/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%duong.trantung.1810%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100018538784398%'
    OR facebook_url LIKE '%profile.php?id=100018538784398%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lannails Langenfeld (ID: 100070979125544)
UPDATE customers SET 
    name = 'Lannails Langenfeld',
    facebook_name = 'Lannails Langenfeld',
    facebook_numeric_id = '100070979125544',
    profile_picture_url = 'https://graph.facebook.com/100070979125544/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100070979125544%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100070979125544%'
    OR facebook_url LIKE '%profile.php?id=100070979125544%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Paris (ID: 100022587643383)
UPDATE customers SET 
    name = 'Trần Paris',
    facebook_name = 'Trần Paris',
    facebook_numeric_id = '100022587643383',
    profile_picture_url = 'https://graph.facebook.com/100022587643383/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022587643383%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022587643383%'
    OR facebook_url LIKE '%profile.php?id=100022587643383%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duc Anh Duc Anh (ID: 100015475748587)
UPDATE customers SET 
    name = 'Duc Anh Duc Anh',
    facebook_name = 'Duc Anh Duc Anh',
    facebook_numeric_id = '100015475748587',
    profile_picture_url = 'https://graph.facebook.com/100015475748587/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ducanh.ducanh.7583%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015475748587%'
    OR facebook_url LIKE '%profile.php?id=100015475748587%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Hieu Do (ID: 100009638239753)
UPDATE customers SET 
    name = 'Thi Hieu Do',
    facebook_name = 'Thi Hieu Do',
    facebook_numeric_id = '100009638239753',
    profile_picture_url = 'https://graph.facebook.com/100009638239753/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ThiHieuDoPhucHai%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009638239753%'
    OR facebook_url LIKE '%profile.php?id=100009638239753%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hana Bùi (ID: 100005978046102)
UPDATE customers SET 
    name = 'Hana Bùi',
    facebook_name = 'Hana Bùi',
    facebook_numeric_id = '100005978046102',
    profile_picture_url = 'https://graph.facebook.com/100005978046102/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%buihong.hoa.39%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005978046102%'
    OR facebook_url LIKE '%profile.php?id=100005978046102%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nhẫn Nguyễn (ID: 100006672661108)
UPDATE customers SET 
    name = 'Nhẫn Nguyễn',
    facebook_name = 'Nhẫn Nguyễn',
    facebook_numeric_id = '100006672661108',
    profile_picture_url = 'https://graph.facebook.com/100006672661108/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%queenbeautysalonliberec%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006672661108%'
    OR facebook_url LIKE '%profile.php?id=100006672661108%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- TiNa Alyssa (ID: 100002946578379)
UPDATE customers SET 
    name = 'TiNa Alyssa',
    facebook_name = 'TiNa Alyssa',
    facebook_numeric_id = '100002946578379',
    profile_picture_url = 'https://graph.facebook.com/100002946578379/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nga.nguyen.5602%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002946578379%'
    OR facebook_url LIKE '%profile.php?id=100002946578379%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thôi Kệ (ID: 100014109160480)
UPDATE customers SET 
    name = 'Thôi Kệ',
    facebook_name = 'Thôi Kệ',
    facebook_numeric_id = '100014109160480',
    profile_picture_url = 'https://graph.facebook.com/100014109160480/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014109160480%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014109160480%'
    OR facebook_url LIKE '%profile.php?id=100014109160480%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Nguyen (ID: 100010370327640)
UPDATE customers SET 
    name = 'Thuy Nguyen',
    facebook_name = 'Thuy Nguyen',
    facebook_numeric_id = '100010370327640',
    profile_picture_url = 'https://graph.facebook.com/100010370327640/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010370327640%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010370327640%'
    OR facebook_url LIKE '%profile.php?id=100010370327640%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vân Thuý Hoàng (ID: 100008467332649)
UPDATE customers SET 
    name = 'Vân Thuý Hoàng',
    facebook_name = 'Vân Thuý Hoàng',
    facebook_numeric_id = '100008467332649',
    profile_picture_url = 'https://graph.facebook.com/100008467332649/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuyvan3107%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008467332649%'
    OR facebook_url LIKE '%profile.php?id=100008467332649%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lina Thiệu (ID: 100008225434223)
UPDATE customers SET 
    name = 'Lina Thiệu',
    facebook_name = 'Lina Thiệu',
    facebook_numeric_id = '100008225434223',
    profile_picture_url = 'https://graph.facebook.com/100008225434223/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngan.thieu.948%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008225434223%'
    OR facebook_url LIKE '%profile.php?id=100008225434223%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Đoàn (ID: 100031234981523)
UPDATE customers SET 
    name = 'Hoa Đoàn',
    facebook_name = 'Hoa Đoàn',
    facebook_numeric_id = '100031234981523',
    profile_picture_url = 'https://graph.facebook.com/100031234981523/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100031234981523%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100031234981523%'
    OR facebook_url LIKE '%profile.php?id=100031234981523%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Yến (ID: 100003748529209)
UPDATE customers SET 
    name = 'Hoàng Yến',
    facebook_name = 'Hoàng Yến',
    facebook_numeric_id = '100003748529209',
    profile_picture_url = 'https://graph.facebook.com/100003748529209/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%jennyhoang.yen.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003748529209%'
    OR facebook_url LIKE '%profile.php?id=100003748529209%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Morela Tran (ID: 100000205814031)
UPDATE customers SET 
    name = 'Morela Tran',
    facebook_name = 'Morela Tran',
    facebook_numeric_id = '100000205814031',
    profile_picture_url = 'https://graph.facebook.com/100000205814031/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thiquynhmai.tran%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000205814031%'
    OR facebook_url LIKE '%profile.php?id=100000205814031%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tom Nguyen (ID: 100010896781483)
UPDATE customers SET 
    name = 'Tom Nguyen',
    facebook_name = 'Tom Nguyen',
    facebook_numeric_id = '100010896781483',
    profile_picture_url = 'https://graph.facebook.com/100010896781483/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010896781483%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010896781483%'
    OR facebook_url LIKE '%profile.php?id=100010896781483%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khả Duyên (ID: 100011448844202)
UPDATE customers SET 
    name = 'Khả Duyên',
    facebook_name = 'Khả Duyên',
    facebook_numeric_id = '100011448844202',
    profile_picture_url = 'https://graph.facebook.com/100011448844202/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011448844202%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011448844202%'
    OR facebook_url LIKE '%profile.php?id=100011448844202%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuhien Nguyen (ID: 100001471551483)
UPDATE customers SET 
    name = 'Thuhien Nguyen',
    facebook_name = 'Thuhien Nguyen',
    facebook_numeric_id = '100001471551483',
    profile_picture_url = 'https://graph.facebook.com/100001471551483/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuhien.nguyen.737%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001471551483%'
    OR facebook_url LIKE '%profile.php?id=100001471551483%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Thi Hoa (ID: 100076199503812)
UPDATE customers SET 
    name = 'Nguyen Thi Hoa',
    facebook_name = 'Nguyen Thi Hoa',
    facebook_numeric_id = '100076199503812',
    profile_picture_url = 'https://graph.facebook.com/100076199503812/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100076199503812%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100076199503812%'
    OR facebook_url LIKE '%profile.php?id=100076199503812%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kristyna Zoulikova (ID: 100001694085208)
UPDATE customers SET 
    name = 'Kristyna Zoulikova',
    facebook_name = 'Kristyna Zoulikova',
    facebook_numeric_id = '100001694085208',
    profile_picture_url = 'https://graph.facebook.com/100001694085208/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%kristyna.zoulikova%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001694085208%'
    OR facebook_url LIKE '%profile.php?id=100001694085208%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dola la Giay (ID: 100002060521196)
UPDATE customers SET 
    name = 'Dola la Giay',
    facebook_name = 'Dola la Giay',
    facebook_numeric_id = '100002060521196',
    profile_picture_url = 'https://graph.facebook.com/100002060521196/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dola.lagiay%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002060521196%'
    OR facebook_url LIKE '%profile.php?id=100002060521196%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lyna Trang (ID: 100042196293314)
UPDATE customers SET 
    name = 'Lyna Trang',
    facebook_name = 'Lyna Trang',
    facebook_numeric_id = '100042196293314',
    profile_picture_url = 'https://graph.facebook.com/100042196293314/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%maruska.tranova.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100042196293314%'
    OR facebook_url LIKE '%profile.php?id=100042196293314%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Trung Đức Anh (ID: 100000666304749)
UPDATE customers SET 
    name = 'Trần Trung Đức Anh',
    facebook_name = 'Trần Trung Đức Anh',
    facebook_numeric_id = '100000666304749',
    profile_picture_url = 'https://graph.facebook.com/100000666304749/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ducanh.trantrung%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000666304749%'
    OR facebook_url LIKE '%profile.php?id=100000666304749%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Hoài (ID: 1627103283)
UPDATE customers SET 
    name = 'Thu Hoài',
    facebook_name = 'Thu Hoài',
    facebook_numeric_id = '1627103283',
    profile_picture_url = 'https://graph.facebook.com/1627103283/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hannycz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1627103283%'
    OR facebook_url LIKE '%profile.php?id=1627103283%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Đăng Hoàng (ID: 100081786997571)
UPDATE customers SET 
    name = 'Phạm Đăng Hoàng',
    facebook_name = 'Phạm Đăng Hoàng',
    facebook_numeric_id = '100081786997571',
    profile_picture_url = 'https://graph.facebook.com/100081786997571/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100081786997571%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100081786997571%'
    OR facebook_url LIKE '%profile.php?id=100081786997571%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mai Anh (ID: 100001855892156)
UPDATE customers SET 
    name = 'Mai Anh',
    facebook_name = 'Mai Anh',
    facebook_numeric_id = '100001855892156',
    profile_picture_url = 'https://graph.facebook.com/100001855892156/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%MAfevrier%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001855892156%'
    OR facebook_url LIKE '%profile.php?id=100001855892156%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Linh (ID: 100000824855783)
UPDATE customers SET 
    name = 'Trần Linh',
    facebook_name = 'Trần Linh',
    facebook_numeric_id = '100000824855783',
    profile_picture_url = 'https://graph.facebook.com/100000824855783/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tran.linh.5076%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000824855783%'
    OR facebook_url LIKE '%profile.php?id=100000824855783%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tường Lùn (ID: 100009774094265)
UPDATE customers SET 
    name = 'Tường Lùn',
    facebook_name = 'Tường Lùn',
    facebook_numeric_id = '100009774094265',
    profile_picture_url = 'https://graph.facebook.com/100009774094265/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009774094265%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009774094265%'
    OR facebook_url LIKE '%profile.php?id=100009774094265%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Quốc Sang (ID: 100012580175853)
UPDATE customers SET 
    name = 'Trần Quốc Sang',
    facebook_name = 'Trần Quốc Sang',
    facebook_numeric_id = '100012580175853',
    profile_picture_url = 'https://graph.facebook.com/100012580175853/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tranquoc.sang.94%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012580175853%'
    OR facebook_url LIKE '%profile.php?id=100012580175853%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hero Phạm (ID: 100001620789770)
UPDATE customers SET 
    name = 'Hero Phạm',
    facebook_name = 'Hero Phạm',
    facebook_numeric_id = '100001620789770',
    profile_picture_url = 'https://graph.facebook.com/100001620789770/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hero.pham.73%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001620789770%'
    OR facebook_url LIKE '%profile.php?id=100001620789770%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Gigi Đoàn (ID: 100000940330435)
UPDATE customers SET 
    name = 'Gigi Đoàn',
    facebook_name = 'Gigi Đoàn',
    facebook_numeric_id = '100000940330435',
    profile_picture_url = 'https://graph.facebook.com/100000940330435/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000940330435%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000940330435%'
    OR facebook_url LIKE '%profile.php?id=100000940330435%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Hải Yến (ID: 100004065560689)
UPDATE customers SET 
    name = 'Nguyễn Hải Yến',
    facebook_name = 'Nguyễn Hải Yến',
    facebook_numeric_id = '100004065560689',
    profile_picture_url = 'https://graph.facebook.com/100004065560689/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tieuyentuvn94%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004065560689%'
    OR facebook_url LIKE '%profile.php?id=100004065560689%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hà Vũ (ID: 100035196948604)
UPDATE customers SET 
    name = 'Hà Vũ',
    facebook_name = 'Hà Vũ',
    facebook_numeric_id = '100035196948604',
    profile_picture_url = 'https://graph.facebook.com/100035196948604/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100035196948604%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100035196948604%'
    OR facebook_url LIKE '%profile.php?id=100035196948604%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Vân Anh (ID: 100004526017953)
UPDATE customers SET 
    name = 'Nguyễn Vân Anh',
    facebook_name = 'Nguyễn Vân Anh',
    facebook_numeric_id = '100004526017953',
    profile_picture_url = 'https://graph.facebook.com/100004526017953/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004526017953%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004526017953%'
    OR facebook_url LIKE '%profile.php?id=100004526017953%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Eliska Nails (ID: 100009132994701)
UPDATE customers SET 
    name = 'Eliska Nails',
    facebook_name = 'Eliska Nails',
    facebook_numeric_id = '100009132994701',
    profile_picture_url = 'https://graph.facebook.com/100009132994701/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%eliska.nails%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009132994701%'
    OR facebook_url LIKE '%profile.php?id=100009132994701%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Tran (ID: 100043143991186)
UPDATE customers SET 
    name = 'Hoa Tran',
    facebook_name = 'Hoa Tran',
    facebook_numeric_id = '100043143991186',
    profile_picture_url = 'https://graph.facebook.com/100043143991186/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoatran.zk%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100043143991186%'
    OR facebook_url LIKE '%profile.php?id=100043143991186%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duong Nhat Phuong (ID: 100015537182171)
UPDATE customers SET 
    name = 'Duong Nhat Phuong',
    facebook_name = 'Duong Nhat Phuong',
    facebook_numeric_id = '100015537182171',
    profile_picture_url = 'https://graph.facebook.com/100015537182171/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%duong.nhatphuong.96%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015537182171%'
    OR facebook_url LIKE '%profile.php?id=100015537182171%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Duong Nguyen (ID: 100000261451642)
UPDATE customers SET 
    name = 'Thuy Duong Nguyen',
    facebook_name = 'Thuy Duong Nguyen',
    facebook_numeric_id = '100000261451642',
    profile_picture_url = 'https://graph.facebook.com/100000261451642/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuyduong.nguyen.9883%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000261451642%'
    OR facebook_url LIKE '%profile.php?id=100000261451642%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nga Trinh (ID: 100003603564956)
UPDATE customers SET 
    name = 'Nga Trinh',
    facebook_name = 'Nga Trinh',
    facebook_numeric_id = '100003603564956',
    profile_picture_url = 'https://graph.facebook.com/100003603564956/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nga.trinh.963%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003603564956%'
    OR facebook_url LIKE '%profile.php?id=100003603564956%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Annie Thái (ID: 100015962766992)
UPDATE customers SET 
    name = 'Annie Thái',
    facebook_name = 'Annie Thái',
    facebook_numeric_id = '100015962766992',
    profile_picture_url = 'https://graph.facebook.com/100015962766992/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dainhan.hoa.5623%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015962766992%'
    OR facebook_url LIKE '%profile.php?id=100015962766992%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Ljnh Cöng Tü (ID: 100003355090661)
UPDATE customers SET 
    name = 'Nguyen Ljnh Cöng Tü',
    facebook_name = 'Nguyen Ljnh Cöng Tü',
    facebook_numeric_id = '100003355090661',
    profile_picture_url = 'https://graph.facebook.com/100003355090661/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ljnhcongtu.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003355090661%'
    OR facebook_url LIKE '%profile.php?id=100003355090661%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngoc Nguyen (ID: 100000618235305)
UPDATE customers SET 
    name = 'Ngoc Nguyen',
    facebook_name = 'Ngoc Nguyen',
    facebook_numeric_id = '100000618235305',
    profile_picture_url = 'https://graph.facebook.com/100000618235305/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000618235305%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000618235305%'
    OR facebook_url LIKE '%profile.php?id=100000618235305%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Minh (ID: 100053830789775)
UPDATE customers SET 
    name = 'Nguyễn Minh',
    facebook_name = 'Nguyễn Minh',
    facebook_numeric_id = '100053830789775',
    profile_picture_url = 'https://graph.facebook.com/100053830789775/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100053830789775%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100053830789775%'
    OR facebook_url LIKE '%profile.php?id=100053830789775%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- JM Phi Ky Phong (ID: 1035984992)
UPDATE customers SET 
    name = 'JM Phi Ky Phong',
    facebook_name = 'JM Phi Ky Phong',
    facebook_numeric_id = '1035984992',
    profile_picture_url = 'https://graph.facebook.com/1035984992/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%jphikyphong%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1035984992%'
    OR facebook_url LIKE '%profile.php?id=1035984992%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Thi Dieu (ID: 100001311584746)
UPDATE customers SET 
    name = 'Le Thi Dieu',
    facebook_name = 'Le Thi Dieu',
    facebook_numeric_id = '100001311584746',
    profile_picture_url = 'https://graph.facebook.com/100001311584746/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%e.thidieu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001311584746%'
    OR facebook_url LIKE '%profile.php?id=100001311584746%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cam Cao (ID: 100045800016796)
UPDATE customers SET 
    name = 'Cam Cao',
    facebook_name = 'Cam Cao',
    facebook_numeric_id = '100045800016796',
    profile_picture_url = 'https://graph.facebook.com/100045800016796/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%cam.cao.564%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100045800016796%'
    OR facebook_url LIKE '%profile.php?id=100045800016796%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trương Lê Hà Anh (ID: 100000938185686)
UPDATE customers SET 
    name = 'Trương Lê Hà Anh',
    facebook_name = 'Trương Lê Hà Anh',
    facebook_numeric_id = '100000938185686',
    profile_picture_url = 'https://graph.facebook.com/100000938185686/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%haanh.truongle%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000938185686%'
    OR facebook_url LIKE '%profile.php?id=100000938185686%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cuong Tran (ID: 100003237086493)
UPDATE customers SET 
    name = 'Cuong Tran',
    facebook_name = 'Cuong Tran',
    facebook_numeric_id = '100003237086493',
    profile_picture_url = 'https://graph.facebook.com/100003237086493/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dragon.cuongcz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003237086493%'
    OR facebook_url LIKE '%profile.php?id=100003237086493%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dara Nyx (ID: 100000571154370)
UPDATE customers SET 
    name = 'Dara Nyx',
    facebook_name = 'Dara Nyx',
    facebook_numeric_id = '100000571154370',
    profile_picture_url = 'https://graph.facebook.com/100000571154370/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%darinkatxii%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000571154370%'
    OR facebook_url LIKE '%profile.php?id=100000571154370%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Jana Thư Nguyễn (ID: 100004278424350)
UPDATE customers SET 
    name = 'Jana Thư Nguyễn',
    facebook_name = 'Jana Thư Nguyễn',
    facebook_numeric_id = '100004278424350',
    profile_picture_url = 'https://graph.facebook.com/100004278424350/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%jananguyen86%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004278424350%'
    OR facebook_url LIKE '%profile.php?id=100004278424350%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dinh Hoang Tran (ID: 100055497314888)
UPDATE customers SET 
    name = 'Dinh Hoang Tran',
    facebook_name = 'Dinh Hoang Tran',
    facebook_numeric_id = '100055497314888',
    profile_picture_url = 'https://graph.facebook.com/100055497314888/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dinhhoang.tran.1690%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100055497314888%'
    OR facebook_url LIKE '%profile.php?id=100055497314888%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đào Thành Nam (ID: 100000150864218)
UPDATE customers SET 
    name = 'Đào Thành Nam',
    facebook_name = 'Đào Thành Nam',
    facebook_numeric_id = '100000150864218',
    profile_picture_url = 'https://graph.facebook.com/100000150864218/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Cebatcheo%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000150864218%'
    OR facebook_url LIKE '%profile.php?id=100000150864218%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Hana (ID: 100013129390002)
UPDATE customers SET 
    name = 'Nguyen Hana',
    facebook_name = 'Nguyen Hana',
    facebook_numeric_id = '100013129390002',
    profile_picture_url = 'https://graph.facebook.com/100013129390002/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyen.hana.33633%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013129390002%'
    OR facebook_url LIKE '%profile.php?id=100013129390002%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mia Trần (ID: 100009868804356)
UPDATE customers SET 
    name = 'Mia Trần',
    facebook_name = 'Mia Trần',
    facebook_numeric_id = '100009868804356',
    profile_picture_url = 'https://graph.facebook.com/100009868804356/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009868804356%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009868804356%'
    OR facebook_url LIKE '%profile.php?id=100009868804356%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Thu Tran (ID: 100000999729635)
UPDATE customers SET 
    name = 'Minh Thu Tran',
    facebook_name = 'Minh Thu Tran',
    facebook_numeric_id = '100000999729635',
    profile_picture_url = 'https://graph.facebook.com/100000999729635/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%minhthu.trandoan%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000999729635%'
    OR facebook_url LIKE '%profile.php?id=100000999729635%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hưng Phạm (ID: 100041742932363)
UPDATE customers SET 
    name = 'Hưng Phạm',
    facebook_name = 'Hưng Phạm',
    facebook_numeric_id = '100041742932363',
    profile_picture_url = 'https://graph.facebook.com/100041742932363/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041742932363%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041742932363%'
    OR facebook_url LIKE '%profile.php?id=100041742932363%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hà Thu Nguyễnn (ID: 100047824854368)
UPDATE customers SET 
    name = 'Hà Thu Nguyễnn',
    facebook_name = 'Hà Thu Nguyễnn',
    facebook_numeric_id = '100047824854368',
    profile_picture_url = 'https://graph.facebook.com/100047824854368/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100047824854368%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100047824854368%'
    OR facebook_url LIKE '%profile.php?id=100047824854368%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nhat Tien Nguyen (ID: 100006800255772)
UPDATE customers SET 
    name = 'Nhat Tien Nguyen',
    facebook_name = 'Nhat Tien Nguyen',
    facebook_numeric_id = '100006800255772',
    profile_picture_url = 'https://graph.facebook.com/100006800255772/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nhattien.nguyen.3958%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006800255772%'
    OR facebook_url LIKE '%profile.php?id=100006800255772%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cường Nguyễn (ID: 100005087377636)
UPDATE customers SET 
    name = 'Cường Nguyễn',
    facebook_name = 'Cường Nguyễn',
    facebook_numeric_id = '100005087377636',
    profile_picture_url = 'https://graph.facebook.com/100005087377636/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%CuongNguyen123344%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005087377636%'
    OR facebook_url LIKE '%profile.php?id=100005087377636%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Linh Nguyen (ID: 100000148606631)
UPDATE customers SET 
    name = 'Linh Nguyen',
    facebook_name = 'Linh Nguyen',
    facebook_numeric_id = '100000148606631',
    profile_picture_url = 'https://graph.facebook.com/100000148606631/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000148606631%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000148606631%'
    OR facebook_url LIKE '%profile.php?id=100000148606631%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Hà (ID: 100001323402658)
UPDATE customers SET 
    name = 'Trang Hà',
    facebook_name = 'Trang Hà',
    facebook_numeric_id = '100001323402658',
    profile_picture_url = 'https://graph.facebook.com/100001323402658/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trang.hin.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001323402658%'
    OR facebook_url LIKE '%profile.php?id=100001323402658%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hồng Black (ID: 100005839538578)
UPDATE customers SET 
    name = 'Hồng Black',
    facebook_name = 'Hồng Black',
    facebook_numeric_id = '100005839538578',
    profile_picture_url = 'https://graph.facebook.com/100005839538578/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%connaihoang.tuong%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005839538578%'
    OR facebook_url LIKE '%profile.php?id=100005839538578%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Minh Phương (ID: 100003041435159)
UPDATE customers SET 
    name = 'Nguyen Minh Phương',
    facebook_name = 'Nguyen Minh Phương',
    facebook_numeric_id = '100003041435159',
    profile_picture_url = 'https://graph.facebook.com/100003041435159/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ha.vy.94695%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003041435159%'
    OR facebook_url LIKE '%profile.php?id=100003041435159%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huy Hoàng (ID: 100089329024504)
UPDATE customers SET 
    name = 'Huy Hoàng',
    facebook_name = 'Huy Hoàng',
    facebook_numeric_id = '100089329024504',
    profile_picture_url = 'https://graph.facebook.com/100089329024504/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100089329024504%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100089329024504%'
    OR facebook_url LIKE '%profile.php?id=100089329024504%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mỹ Dung (ID: 100074955590424)
UPDATE customers SET 
    name = 'Mỹ Dung',
    facebook_name = 'Mỹ Dung',
    facebook_numeric_id = '100074955590424',
    profile_picture_url = 'https://graph.facebook.com/100074955590424/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100074955590424%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100074955590424%'
    OR facebook_url LIKE '%profile.php?id=100074955590424%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bui Van (ID: 100001567941972)
UPDATE customers SET 
    name = 'Bui Van',
    facebook_name = 'Bui Van',
    facebook_numeric_id = '100001567941972',
    profile_picture_url = 'https://graph.facebook.com/100001567941972/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bui.van.10%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001567941972%'
    OR facebook_url LIKE '%profile.php?id=100001567941972%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ly Nguyen (ID: 100083874305495)
UPDATE customers SET 
    name = 'Ly Nguyen',
    facebook_name = 'Ly Nguyen',
    facebook_numeric_id = '100083874305495',
    profile_picture_url = 'https://graph.facebook.com/100083874305495/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100083874305495%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100083874305495%'
    OR facebook_url LIKE '%profile.php?id=100083874305495%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bep Xinh (ID: 100004625652314)
UPDATE customers SET 
    name = 'Bep Xinh',
    facebook_name = 'Bep Xinh',
    facebook_numeric_id = '100004625652314',
    profile_picture_url = 'https://graph.facebook.com/100004625652314/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%khuyen.thinguyen.79%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004625652314%'
    OR facebook_url LIKE '%profile.php?id=100004625652314%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- ThuyDung Han (ID: 100005833388864)
UPDATE customers SET 
    name = 'ThuyDung Han',
    facebook_name = 'ThuyDung Han',
    facebook_numeric_id = '100005833388864',
    profile_picture_url = 'https://graph.facebook.com/100005833388864/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuydunghan%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005833388864%'
    OR facebook_url LIKE '%profile.php?id=100005833388864%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngoan Thanh (ID: 100001676498595)
UPDATE customers SET 
    name = 'Ngoan Thanh',
    facebook_name = 'Ngoan Thanh',
    facebook_numeric_id = '100001676498595',
    profile_picture_url = 'https://graph.facebook.com/100001676498595/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngoan.thanh.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001676498595%'
    OR facebook_url LIKE '%profile.php?id=100001676498595%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- An Nguyen (ID: 100005870591351)
UPDATE customers SET 
    name = 'An Nguyen',
    facebook_name = 'An Nguyen',
    facebook_numeric_id = '100005870591351',
    profile_picture_url = 'https://graph.facebook.com/100005870591351/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005870591351%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005870591351%'
    OR facebook_url LIKE '%profile.php?id=100005870591351%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Heo De Thuong (ID: 100003659305408)
UPDATE customers SET 
    name = 'Heo De Thuong',
    facebook_name = 'Heo De Thuong',
    facebook_numeric_id = '100003659305408',
    profile_picture_url = 'https://graph.facebook.com/100003659305408/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003659305408%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003659305408%'
    OR facebook_url LIKE '%profile.php?id=100003659305408%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Danh Tú (ID: 100005857177544)
UPDATE customers SET 
    name = 'Vũ Danh Tú',
    facebook_name = 'Vũ Danh Tú',
    facebook_numeric_id = '100005857177544',
    profile_picture_url = 'https://graph.facebook.com/100005857177544/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005857177544%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005857177544%'
    OR facebook_url LIKE '%profile.php?id=100005857177544%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- CoconailsBrackenheim Nguyen (ID: 100091184230099)
UPDATE customers SET 
    name = 'CoconailsBrackenheim Nguyen',
    facebook_name = 'CoconailsBrackenheim Nguyen',
    facebook_numeric_id = '100091184230099',
    profile_picture_url = 'https://graph.facebook.com/100091184230099/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100091184230099%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100091184230099%'
    OR facebook_url LIKE '%profile.php?id=100091184230099%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Luận Coldly (ID: 100008879554448)
UPDATE customers SET 
    name = 'Luận Coldly',
    facebook_name = 'Luận Coldly',
    facebook_numeric_id = '100008879554448',
    profile_picture_url = 'https://graph.facebook.com/100008879554448/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008879554448%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008879554448%'
    OR facebook_url LIKE '%profile.php?id=100008879554448%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Quy Pham (ID: 100007979798999)
UPDATE customers SET 
    name = 'Van Quy Pham',
    facebook_name = 'Van Quy Pham',
    facebook_numeric_id = '100007979798999',
    profile_picture_url = 'https://graph.facebook.com/100007979798999/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%david.pham.5817%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007979798999%'
    OR facebook_url LIKE '%profile.php?id=100007979798999%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- PiAy Nguyễn (ID: 100001691583123)
UPDATE customers SET 
    name = 'PiAy Nguyễn',
    facebook_name = 'PiAy Nguyễn',
    facebook_numeric_id = '100001691583123',
    profile_picture_url = 'https://graph.facebook.com/100001691583123/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuonganh1290%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001691583123%'
    OR facebook_url LIKE '%profile.php?id=100001691583123%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vjtcon Hanka (ID: 1782213629)
UPDATE customers SET 
    name = 'Vjtcon Hanka',
    facebook_name = 'Vjtcon Hanka',
    facebook_numeric_id = '1782213629',
    profile_picture_url = 'https://graph.facebook.com/1782213629/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vjtcon.hanka%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1782213629%'
    OR facebook_url LIKE '%profile.php?id=1782213629%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngoc Phuong Tran (ID: 100001059548623)
UPDATE customers SET 
    name = 'Ngoc Phuong Tran',
    facebook_name = 'Ngoc Phuong Tran',
    facebook_numeric_id = '100001059548623',
    profile_picture_url = 'https://graph.facebook.com/100001059548623/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%diamond.nails.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001059548623%'
    OR facebook_url LIKE '%profile.php?id=100001059548623%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Quý Tài (ID: 100005546709539)
UPDATE customers SET 
    name = 'Vũ Quý Tài',
    facebook_name = 'Vũ Quý Tài',
    facebook_numeric_id = '100005546709539',
    profile_picture_url = 'https://graph.facebook.com/100005546709539/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ji.loj.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005546709539%'
    OR facebook_url LIKE '%profile.php?id=100005546709539%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Layla Truong (ID: 100000228403419)
UPDATE customers SET 
    name = 'Layla Truong',
    facebook_name = 'Layla Truong',
    facebook_numeric_id = '100000228403419',
    profile_picture_url = 'https://graph.facebook.com/100000228403419/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%layla.le%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000228403419%'
    OR facebook_url LIKE '%profile.php?id=100000228403419%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hạ Thư Kỳ (ID: 61559503749474)
UPDATE customers SET 
    name = 'Hạ Thư Kỳ',
    facebook_name = 'Hạ Thư Kỳ',
    facebook_numeric_id = '61559503749474',
    profile_picture_url = 'https://graph.facebook.com/61559503749474/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61559503749474%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61559503749474%'
    OR facebook_url LIKE '%profile.php?id=61559503749474%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Victor Lâm (ID: 1309462880)
UPDATE customers SET 
    name = 'Victor Lâm',
    facebook_name = 'Victor Lâm',
    facebook_numeric_id = '1309462880',
    profile_picture_url = 'https://graph.facebook.com/1309462880/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lamxvic%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1309462880%'
    OR facebook_url LIKE '%profile.php?id=1309462880%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bich Thanh (ID: 100005646549172)
UPDATE customers SET 
    name = 'Bich Thanh',
    facebook_name = 'Bich Thanh',
    facebook_numeric_id = '100005646549172',
    profile_picture_url = 'https://graph.facebook.com/100005646549172/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bich.thanh.161%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005646549172%'
    OR facebook_url LIKE '%profile.php?id=100005646549172%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vanesa Nails (ID: 100009305640920)
UPDATE customers SET 
    name = 'Vanesa Nails',
    facebook_name = 'Vanesa Nails',
    facebook_numeric_id = '100009305640920',
    profile_picture_url = 'https://graph.facebook.com/100009305640920/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Vanesa.Nails.Liberec%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009305640920%'
    OR facebook_url LIKE '%profile.php?id=100009305640920%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoài Linh (ID: 100006577568046)
UPDATE customers SET 
    name = 'Hoài Linh',
    facebook_name = 'Hoài Linh',
    facebook_numeric_id = '100006577568046',
    profile_picture_url = 'https://graph.facebook.com/100006577568046/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nooneunderstandmeexceptmyseft%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006577568046%'
    OR facebook_url LIKE '%profile.php?id=100006577568046%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoài Cẩm (ID: 100028869111273)
UPDATE customers SET 
    name = 'Hoài Cẩm',
    facebook_name = 'Hoài Cẩm',
    facebook_numeric_id = '100028869111273',
    profile_picture_url = 'https://graph.facebook.com/100028869111273/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028869111273%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028869111273%'
    OR facebook_url LIKE '%profile.php?id=100028869111273%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vu Dai Duong (ID: 100001534501390)
UPDATE customers SET 
    name = 'Vu Dai Duong',
    facebook_name = 'Vu Dai Duong',
    facebook_numeric_id = '100001534501390',
    profile_picture_url = 'https://graph.facebook.com/100001534501390/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%daiduong3t%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001534501390%'
    OR facebook_url LIKE '%profile.php?id=100001534501390%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- MinhAnh Nguyen (ID: 100064985126807)
UPDATE customers SET 
    name = 'MinhAnh Nguyen',
    facebook_name = 'MinhAnh Nguyen',
    facebook_numeric_id = '100064985126807',
    profile_picture_url = 'https://graph.facebook.com/100064985126807/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100064985126807%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100064985126807%'
    OR facebook_url LIKE '%profile.php?id=100064985126807%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Katana Nil (ID: 100069888378521)
UPDATE customers SET 
    name = 'Katana Nil',
    facebook_name = 'Katana Nil',
    facebook_numeric_id = '100069888378521',
    profile_picture_url = 'https://graph.facebook.com/100069888378521/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100069888378521%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100069888378521%'
    OR facebook_url LIKE '%profile.php?id=100069888378521%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lee Ly (ID: 100001454812856)
UPDATE customers SET 
    name = 'Lee Ly',
    facebook_name = 'Lee Ly',
    facebook_numeric_id = '100001454812856',
    profile_picture_url = 'https://graph.facebook.com/100001454812856/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lee.ly.1293%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001454812856%'
    OR facebook_url LIKE '%profile.php?id=100001454812856%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nga Truong (ID: 100014031617613)
UPDATE customers SET 
    name = 'Nga Truong',
    facebook_name = 'Nga Truong',
    facebook_numeric_id = '100014031617613',
    profile_picture_url = 'https://graph.facebook.com/100014031617613/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014031617613%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014031617613%'
    OR facebook_url LIKE '%profile.php?id=100014031617613%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Hường (ID: 100006661480332)
UPDATE customers SET 
    name = 'Thanh Hường',
    facebook_name = 'Thanh Hường',
    facebook_numeric_id = '100006661480332',
    profile_picture_url = 'https://graph.facebook.com/100006661480332/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huong.muop.54%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006661480332%'
    OR facebook_url LIKE '%profile.php?id=100006661480332%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tâm Trinh (ID: 100008146965676)
UPDATE customers SET 
    name = 'Tâm Trinh',
    facebook_name = 'Tâm Trinh',
    facebook_numeric_id = '100008146965676',
    profile_picture_url = 'https://graph.facebook.com/100008146965676/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tam.trinh.904108%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008146965676%'
    OR facebook_url LIKE '%profile.php?id=100008146965676%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Thuỷ Linh (ID: 100003401293112)
UPDATE customers SET 
    name = 'Vũ Thuỷ Linh',
    facebook_name = 'Vũ Thuỷ Linh',
    facebook_numeric_id = '100003401293112',
    profile_picture_url = 'https://graph.facebook.com/100003401293112/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%linh.pro.94%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003401293112%'
    OR facebook_url LIKE '%profile.php?id=100003401293112%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Sơn (ID: 100078935786350)
UPDATE customers SET 
    name = 'Minh Sơn',
    facebook_name = 'Minh Sơn',
    facebook_numeric_id = '100078935786350',
    profile_picture_url = 'https://graph.facebook.com/100078935786350/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100078935786350%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100078935786350%'
    OR facebook_url LIKE '%profile.php?id=100078935786350%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bình Thảo (ID: 100005946991879)
UPDATE customers SET 
    name = 'Bình Thảo',
    facebook_name = 'Bình Thảo',
    facebook_numeric_id = '100005946991879',
    profile_picture_url = 'https://graph.facebook.com/100005946991879/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005946991879%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005946991879%'
    OR facebook_url LIKE '%profile.php?id=100005946991879%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huong Vo (ID: 100026292843399)
UPDATE customers SET 
    name = 'Huong Vo',
    facebook_name = 'Huong Vo',
    facebook_numeric_id = '100026292843399',
    profile_picture_url = 'https://graph.facebook.com/100026292843399/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100026292843399%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100026292843399%'
    OR facebook_url LIKE '%profile.php?id=100026292843399%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hòa Đinh (ID: 100045124364887)
UPDATE customers SET 
    name = 'Hòa Đinh',
    facebook_name = 'Hòa Đinh',
    facebook_numeric_id = '100045124364887',
    profile_picture_url = 'https://graph.facebook.com/100045124364887/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100045124364887%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100045124364887%'
    OR facebook_url LIKE '%profile.php?id=100045124364887%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mila Mika (ID: 100009025789882)
UPDATE customers SET 
    name = 'Mila Mika',
    facebook_name = 'Mila Mika',
    facebook_numeric_id = '100009025789882',
    profile_picture_url = 'https://graph.facebook.com/100009025789882/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009025789882%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009025789882%'
    OR facebook_url LIKE '%profile.php?id=100009025789882%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- QuynhTrang Nguyen (ID: 100015434764104)
UPDATE customers SET 
    name = 'QuynhTrang Nguyen',
    facebook_name = 'QuynhTrang Nguyen',
    facebook_numeric_id = '100015434764104',
    profile_picture_url = 'https://graph.facebook.com/100015434764104/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015434764104%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015434764104%'
    OR facebook_url LIKE '%profile.php?id=100015434764104%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Phương (ID: 100008041201659)
UPDATE customers SET 
    name = 'Phạm Phương',
    facebook_name = 'Phạm Phương',
    facebook_numeric_id = '100008041201659',
    profile_picture_url = 'https://graph.facebook.com/100008041201659/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuong.candy.712%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008041201659%'
    OR facebook_url LIKE '%profile.php?id=100008041201659%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bao Vi-Filip (ID: 100005115102475)
UPDATE customers SET 
    name = 'Bao Vi-Filip',
    facebook_name = 'Bao Vi-Filip',
    facebook_numeric_id = '100005115102475',
    profile_picture_url = 'https://graph.facebook.com/100005115102475/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bao.vi.399%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005115102475%'
    OR facebook_url LIKE '%profile.php?id=100005115102475%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quỳnh Nhi (ID: 100003950589290)
UPDATE customers SET 
    name = 'Quỳnh Nhi',
    facebook_name = 'Quỳnh Nhi',
    facebook_numeric_id = '100003950589290',
    profile_picture_url = 'https://graph.facebook.com/100003950589290/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%angel.nguyen.773981%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003950589290%'
    OR facebook_url LIKE '%profile.php?id=100003950589290%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen van Anh (ID: 100028023880525)
UPDATE customers SET 
    name = 'Nguyen van Anh',
    facebook_name = 'Nguyen van Anh',
    facebook_numeric_id = '100028023880525',
    profile_picture_url = 'https://graph.facebook.com/100028023880525/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028023880525%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028023880525%'
    OR facebook_url LIKE '%profile.php?id=100028023880525%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ớt Còi Túi (ID: 100008247887646)
UPDATE customers SET 
    name = 'Ớt Còi Túi',
    facebook_name = 'Ớt Còi Túi',
    facebook_numeric_id = '100008247887646',
    profile_picture_url = 'https://graph.facebook.com/100008247887646/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%otcoitui%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008247887646%'
    OR facebook_url LIKE '%profile.php?id=100008247887646%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Victoria Trang (ID: 100024270203700)
UPDATE customers SET 
    name = 'Victoria Trang',
    facebook_name = 'Victoria Trang',
    facebook_numeric_id = '100024270203700',
    profile_picture_url = 'https://graph.facebook.com/100024270203700/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trang.victoria.14%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024270203700%'
    OR facebook_url LIKE '%profile.php?id=100024270203700%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Tranthithu (ID: 100008227057338)
UPDATE customers SET 
    name = 'Thuy Tranthithu',
    facebook_name = 'Thuy Tranthithu',
    facebook_numeric_id = '100008227057338',
    profile_picture_url = 'https://graph.facebook.com/100008227057338/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008227057338%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008227057338%'
    OR facebook_url LIKE '%profile.php?id=100008227057338%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thị Hồng Vân (ID: 100019155828526)
UPDATE customers SET 
    name = 'Nguyễn Thị Hồng Vân',
    facebook_name = 'Nguyễn Thị Hồng Vân',
    facebook_numeric_id = '100019155828526',
    profile_picture_url = 'https://graph.facebook.com/100019155828526/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100019155828526%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100019155828526%'
    OR facebook_url LIKE '%profile.php?id=100019155828526%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hien Bich (ID: 100020196098753)
UPDATE customers SET 
    name = 'Hien Bich',
    facebook_name = 'Hien Bich',
    facebook_numeric_id = '100020196098753',
    profile_picture_url = 'https://graph.facebook.com/100020196098753/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100020196098753%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100020196098753%'
    OR facebook_url LIKE '%profile.php?id=100020196098753%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mai Hạnh (ID: 100011147080196)
UPDATE customers SET 
    name = 'Mai Hạnh',
    facebook_name = 'Mai Hạnh',
    facebook_numeric_id = '100011147080196',
    profile_picture_url = 'https://graph.facebook.com/100011147080196/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011147080196%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011147080196%'
    OR facebook_url LIKE '%profile.php?id=100011147080196%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đinh Công Thanh (ID: 100004843835047)
UPDATE customers SET 
    name = 'Đinh Công Thanh',
    facebook_name = 'Đinh Công Thanh',
    facebook_numeric_id = '100004843835047',
    profile_picture_url = 'https://graph.facebook.com/100004843835047/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004843835047%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004843835047%'
    OR facebook_url LIKE '%profile.php?id=100004843835047%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ong Quang Thang (ID: 1176551106)
UPDATE customers SET 
    name = 'Ong Quang Thang',
    facebook_name = 'Ong Quang Thang',
    facebook_numeric_id = '1176551106',
    profile_picture_url = 'https://graph.facebook.com/1176551106/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ong.thang%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1176551106%'
    OR facebook_url LIKE '%profile.php?id=1176551106%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anna Tran (ID: 100006336722057)
UPDATE customers SET 
    name = 'Anna Tran',
    facebook_name = 'Anna Tran',
    facebook_numeric_id = '100006336722057',
    profile_picture_url = 'https://graph.facebook.com/100006336722057/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006336722057%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006336722057%'
    OR facebook_url LIKE '%profile.php?id=100006336722057%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tiên Tiênn (ID: 100011278037490)
UPDATE customers SET 
    name = 'Tiên Tiênn',
    facebook_name = 'Tiên Tiênn',
    facebook_numeric_id = '100011278037490',
    profile_picture_url = 'https://graph.facebook.com/100011278037490/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tien.tong.986227%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011278037490%'
    OR facebook_url LIKE '%profile.php?id=100011278037490%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dung Le (ID: 100061371291161)
UPDATE customers SET 
    name = 'Dung Le',
    facebook_name = 'Dung Le',
    facebook_numeric_id = '100061371291161',
    profile_picture_url = 'https://graph.facebook.com/100061371291161/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100061371291161%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100061371291161%'
    OR facebook_url LIKE '%profile.php?id=100061371291161%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Pham Thi (ID: 100010893724453)
UPDATE customers SET 
    name = 'Le Pham Thi',
    facebook_name = 'Le Pham Thi',
    facebook_numeric_id = '100010893724453',
    profile_picture_url = 'https://graph.facebook.com/100010893724453/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%le.phamthi.148%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010893724453%'
    OR facebook_url LIKE '%profile.php?id=100010893724453%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ha Minh Hien (ID: 100000566644350)
UPDATE customers SET 
    name = 'Ha Minh Hien',
    facebook_name = 'Ha Minh Hien',
    facebook_numeric_id = '100000566644350',
    profile_picture_url = 'https://graph.facebook.com/100000566644350/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%minhhien.ha%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000566644350%'
    OR facebook_url LIKE '%profile.php?id=100000566644350%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Meo (ID: 100001052494620)
UPDATE customers SET 
    name = 'Hoa Meo',
    facebook_name = 'Hoa Meo',
    facebook_numeric_id = '100001052494620',
    profile_picture_url = 'https://graph.facebook.com/100001052494620/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoa.meo.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001052494620%'
    OR facebook_url LIKE '%profile.php?id=100001052494620%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phan Lien (ID: 61560284451405)
UPDATE customers SET 
    name = 'Phan Lien',
    facebook_name = 'Phan Lien',
    facebook_numeric_id = '61560284451405',
    profile_picture_url = 'https://graph.facebook.com/61560284451405/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61560284451405%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61560284451405%'
    OR facebook_url LIKE '%profile.php?id=61560284451405%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thị Nguyệt (ID: 100023862981510)
UPDATE customers SET 
    name = 'Nguyễn Thị Nguyệt',
    facebook_name = 'Nguyễn Thị Nguyệt',
    facebook_numeric_id = '100023862981510',
    profile_picture_url = 'https://graph.facebook.com/100023862981510/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023862981510%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023862981510%'
    OR facebook_url LIKE '%profile.php?id=100023862981510%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Honza Thắng (ID: 100093671961239)
UPDATE customers SET 
    name = 'Honza Thắng',
    facebook_name = 'Honza Thắng',
    facebook_numeric_id = '100093671961239',
    profile_picture_url = 'https://graph.facebook.com/100093671961239/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100093671961239%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100093671961239%'
    OR facebook_url LIKE '%profile.php?id=100093671961239%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Minh Châu (ID: 1478740403)
UPDATE customers SET 
    name = 'Nguyễn Minh Châu',
    facebook_name = 'Nguyễn Minh Châu',
    facebook_numeric_id = '1478740403',
    profile_picture_url = 'https://graph.facebook.com/1478740403/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nmchau1990%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1478740403%'
    OR facebook_url LIKE '%profile.php?id=1478740403%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hong Tinh (ID: 100022557885625)
UPDATE customers SET 
    name = 'Hong Tinh',
    facebook_name = 'Hong Tinh',
    facebook_numeric_id = '100022557885625',
    profile_picture_url = 'https://graph.facebook.com/100022557885625/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022557885625%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022557885625%'
    OR facebook_url LIKE '%profile.php?id=100022557885625%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Thị Thúy Hoài (ID: 100010476796590)
UPDATE customers SET 
    name = 'Trần Thị Thúy Hoài',
    facebook_name = 'Trần Thị Thúy Hoài',
    facebook_numeric_id = '100010476796590',
    profile_picture_url = 'https://graph.facebook.com/100010476796590/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ha.linhphuong.73%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010476796590%'
    OR facebook_url LIKE '%profile.php?id=100010476796590%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoang Yen (ID: 100002635086633)
UPDATE customers SET 
    name = 'Hoang Yen',
    facebook_name = 'Hoang Yen',
    facebook_numeric_id = '100002635086633',
    profile_picture_url = 'https://graph.facebook.com/100002635086633/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tran.hoang.yen.20.6%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002635086633%'
    OR facebook_url LIKE '%profile.php?id=100002635086633%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Hương (ID: 100041077323708)
UPDATE customers SET 
    name = 'Thu Hương',
    facebook_name = 'Thu Hương',
    facebook_numeric_id = '100041077323708',
    profile_picture_url = 'https://graph.facebook.com/100041077323708/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041077323708%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041077323708%'
    OR facebook_url LIKE '%profile.php?id=100041077323708%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lisa Bui (ID: 100009542207965)
UPDATE customers SET 
    name = 'Lisa Bui',
    facebook_name = 'Lisa Bui',
    facebook_numeric_id = '100009542207965',
    profile_picture_url = 'https://graph.facebook.com/100009542207965/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009542207965%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009542207965%'
    OR facebook_url LIKE '%profile.php?id=100009542207965%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phương Thảo (ID: 100040239971176)
UPDATE customers SET 
    name = 'Phương Thảo',
    facebook_name = 'Phương Thảo',
    facebook_numeric_id = '100040239971176',
    profile_picture_url = 'https://graph.facebook.com/100040239971176/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100040239971176%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100040239971176%'
    OR facebook_url LIKE '%profile.php?id=100040239971176%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mimi Nail (ID: 100043230900696)
UPDATE customers SET 
    name = 'Mimi Nail',
    facebook_name = 'Mimi Nail',
    facebook_numeric_id = '100043230900696',
    profile_picture_url = 'https://graph.facebook.com/100043230900696/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nail.mimi.94%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100043230900696%'
    OR facebook_url LIKE '%profile.php?id=100043230900696%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Hiền (ID: 100028052184206)
UPDATE customers SET 
    name = 'Vũ Hiền',
    facebook_name = 'Vũ Hiền',
    facebook_numeric_id = '100028052184206',
    profile_picture_url = 'https://graph.facebook.com/100028052184206/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028052184206%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028052184206%'
    OR facebook_url LIKE '%profile.php?id=100028052184206%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phan Nhật Thắng (ID: 100069434277092)
UPDATE customers SET 
    name = 'Phan Nhật Thắng',
    facebook_name = 'Phan Nhật Thắng',
    facebook_numeric_id = '100069434277092',
    profile_picture_url = 'https://graph.facebook.com/100069434277092/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phanminhnhatthang%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100069434277092%'
    OR facebook_url LIKE '%profile.php?id=100069434277092%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Nguyen (ID: 100027483904620)
UPDATE customers SET 
    name = 'Thanh Nguyen',
    facebook_name = 'Thanh Nguyen',
    facebook_numeric_id = '100027483904620',
    profile_picture_url = 'https://graph.facebook.com/100027483904620/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027483904620%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027483904620%'
    OR facebook_url LIKE '%profile.php?id=100027483904620%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuong Linh Dinh (ID: 100011083991790)
UPDATE customers SET 
    name = 'Phuong Linh Dinh',
    facebook_name = 'Phuong Linh Dinh',
    facebook_numeric_id = '100011083991790',
    profile_picture_url = 'https://graph.facebook.com/100011083991790/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011083991790%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011083991790%'
    OR facebook_url LIKE '%profile.php?id=100011083991790%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Hà Phương (ID: 100026149999795)
UPDATE customers SET 
    name = 'Nguyễn Hà Phương',
    facebook_name = 'Nguyễn Hà Phương',
    facebook_numeric_id = '100026149999795',
    profile_picture_url = 'https://graph.facebook.com/100026149999795/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%jolie.phuong.967%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100026149999795%'
    OR facebook_url LIKE '%profile.php?id=100026149999795%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Ngoc Linh (ID: 100000254987304)
UPDATE customers SET 
    name = 'Nguyen Ngoc Linh',
    facebook_name = 'Nguyen Ngoc Linh',
    facebook_numeric_id = '100000254987304',
    profile_picture_url = 'https://graph.facebook.com/100000254987304/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lovelvd101079%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000254987304%'
    OR facebook_url LIKE '%profile.php?id=100000254987304%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dương Văn Phong (ID: 1665635709)
UPDATE customers SET 
    name = 'Dương Văn Phong',
    facebook_name = 'Dương Văn Phong',
    facebook_numeric_id = '1665635709',
    profile_picture_url = 'https://graph.facebook.com/1665635709/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%duongvanphongcz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1665635709%'
    OR facebook_url LIKE '%profile.php?id=1665635709%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phương Nguyễn (ID: 100008426617179)
UPDATE customers SET 
    name = 'Phương Nguyễn',
    facebook_name = 'Phương Nguyễn',
    facebook_numeric_id = '100008426617179',
    profile_picture_url = 'https://graph.facebook.com/100008426617179/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hieu.nguyen.9003%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008426617179%'
    OR facebook_url LIKE '%profile.php?id=100008426617179%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bùi Dũng (ID: 100006978872987)
UPDATE customers SET 
    name = 'Bùi Dũng',
    facebook_name = 'Bùi Dũng',
    facebook_numeric_id = '100006978872987',
    profile_picture_url = 'https://graph.facebook.com/100006978872987/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dieu.quynhbui.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006978872987%'
    OR facebook_url LIKE '%profile.php?id=100006978872987%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Quyen (ID: 100006988304178)
UPDATE customers SET 
    name = 'Le Quyen',
    facebook_name = 'Le Quyen',
    facebook_numeric_id = '100006988304178',
    profile_picture_url = 'https://graph.facebook.com/100006988304178/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006988304178%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006988304178%'
    OR facebook_url LIKE '%profile.php?id=100006988304178%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đoàn Triều (ID: 100005476722917)
UPDATE customers SET 
    name = 'Đoàn Triều',
    facebook_name = 'Đoàn Triều',
    facebook_numeric_id = '100005476722917',
    profile_picture_url = 'https://graph.facebook.com/100005476722917/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%filenashop%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005476722917%'
    OR facebook_url LIKE '%profile.php?id=100005476722917%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trúc Nguyễn (ID: 100001712608565)
UPDATE customers SET 
    name = 'Trúc Nguyễn',
    facebook_name = 'Trúc Nguyễn',
    facebook_numeric_id = '100001712608565',
    profile_picture_url = 'https://graph.facebook.com/100001712608565/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuytruc.s2%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001712608565%'
    OR facebook_url LIKE '%profile.php?id=100001712608565%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lê Hiền (ID: 100078541893042)
UPDATE customers SET 
    name = 'Lê Hiền',
    facebook_name = 'Lê Hiền',
    facebook_numeric_id = '100078541893042',
    profile_picture_url = 'https://graph.facebook.com/100078541893042/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100078541893042%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100078541893042%'
    OR facebook_url LIKE '%profile.php?id=100078541893042%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Nguyenthi (ID: 100014373660259)
UPDATE customers SET 
    name = 'Van Nguyenthi',
    facebook_name = 'Van Nguyenthi',
    facebook_numeric_id = '100014373660259',
    profile_picture_url = 'https://graph.facebook.com/100014373660259/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vannguyenthicz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014373660259%'
    OR facebook_url LIKE '%profile.php?id=100014373660259%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngocha Truong (ID: 100056195285589)
UPDATE customers SET 
    name = 'Ngocha Truong',
    facebook_name = 'Ngocha Truong',
    facebook_numeric_id = '100056195285589',
    profile_picture_url = 'https://graph.facebook.com/100056195285589/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngocha.truong.14019338%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100056195285589%'
    OR facebook_url LIKE '%profile.php?id=100056195285589%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuc Nguyen (ID: 100027434386958)
UPDATE customers SET 
    name = 'Phuc Nguyen',
    facebook_name = 'Phuc Nguyen',
    facebook_numeric_id = '100027434386958',
    profile_picture_url = 'https://graph.facebook.com/100027434386958/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027434386958%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027434386958%'
    OR facebook_url LIKE '%profile.php?id=100027434386958%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duongthi Tien (ID: 100004162261946)
UPDATE customers SET 
    name = 'Duongthi Tien',
    facebook_name = 'Duongthi Tien',
    facebook_numeric_id = '100004162261946',
    profile_picture_url = 'https://graph.facebook.com/100004162261946/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%duongthi.tien%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004162261946%'
    OR facebook_url LIKE '%profile.php?id=100004162261946%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hang Vo (ID: 100005681024555)
UPDATE customers SET 
    name = 'Hang Vo',
    facebook_name = 'Hang Vo',
    facebook_numeric_id = '100005681024555',
    profile_picture_url = 'https://graph.facebook.com/100005681024555/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hang.vo.7796420vanutle%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005681024555%'
    OR facebook_url LIKE '%profile.php?id=100005681024555%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- An Duy Khánh (ID: 100047406033416)
UPDATE customers SET 
    name = 'An Duy Khánh',
    facebook_name = 'An Duy Khánh',
    facebook_numeric_id = '100047406033416',
    profile_picture_url = 'https://graph.facebook.com/100047406033416/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%anduy.khanh.14%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100047406033416%'
    OR facebook_url LIKE '%profile.php?id=100047406033416%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hien Nguyenthi (ID: 100003402965765)
UPDATE customers SET 
    name = 'Hien Nguyenthi',
    facebook_name = 'Hien Nguyenthi',
    facebook_numeric_id = '100003402965765',
    profile_picture_url = 'https://graph.facebook.com/100003402965765/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hien.nguyenthi.73%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003402965765%'
    OR facebook_url LIKE '%profile.php?id=100003402965765%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Huyen Trang (ID: 100001222069346)
UPDATE customers SET 
    name = 'Nguyen Huyen Trang',
    facebook_name = 'Nguyen Huyen Trang',
    facebook_numeric_id = '100001222069346',
    profile_picture_url = 'https://graph.facebook.com/100001222069346/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyentrang29985%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001222069346%'
    OR facebook_url LIKE '%profile.php?id=100001222069346%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hằng Liên (ID: 100006443897367)
UPDATE customers SET 
    name = 'Hằng Liên',
    facebook_name = 'Hằng Liên',
    facebook_numeric_id = '100006443897367',
    profile_picture_url = 'https://graph.facebook.com/100006443897367/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006443897367%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006443897367%'
    OR facebook_url LIKE '%profile.php?id=100006443897367%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hùng Nguyễn (ID: 100006703081324)
UPDATE customers SET 
    name = 'Hùng Nguyễn',
    facebook_name = 'Hùng Nguyễn',
    facebook_numeric_id = '100006703081324',
    profile_picture_url = 'https://graph.facebook.com/100006703081324/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006703081324%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006703081324%'
    OR facebook_url LIKE '%profile.php?id=100006703081324%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Dương (ID: 100020672898838)
UPDATE customers SET 
    name = 'Trần Dương',
    facebook_name = 'Trần Dương',
    facebook_numeric_id = '100020672898838',
    profile_picture_url = 'https://graph.facebook.com/100020672898838/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoangbach.tran.562%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100020672898838%'
    OR facebook_url LIKE '%profile.php?id=100020672898838%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Hữu Hoàng (ID: 61559121526739)
UPDATE customers SET 
    name = 'Nguyễn Hữu Hoàng',
    facebook_name = 'Nguyễn Hữu Hoàng',
    facebook_numeric_id = '61559121526739',
    profile_picture_url = 'https://graph.facebook.com/61559121526739/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61559121526739%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61559121526739%'
    OR facebook_url LIKE '%profile.php?id=61559121526739%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đỗ Hương (ID: 100022662768979)
UPDATE customers SET 
    name = 'Đỗ Hương',
    facebook_name = 'Đỗ Hương',
    facebook_numeric_id = '100022662768979',
    profile_picture_url = 'https://graph.facebook.com/100022662768979/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022662768979%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022662768979%'
    OR facebook_url LIKE '%profile.php?id=100022662768979%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sam Banh (ID: 100000214392693)
UPDATE customers SET 
    name = 'Sam Banh',
    facebook_name = 'Sam Banh',
    facebook_numeric_id = '100000214392693',
    profile_picture_url = 'https://graph.facebook.com/100000214392693/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%akay.buon%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000214392693%'
    OR facebook_url LIKE '%profile.php?id=100000214392693%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phương Linh (ID: 100007029333905)
UPDATE customers SET 
    name = 'Phương Linh',
    facebook_name = 'Phương Linh',
    facebook_numeric_id = '100007029333905',
    profile_picture_url = 'https://graph.facebook.com/100007029333905/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007029333905%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007029333905%'
    OR facebook_url LIKE '%profile.php?id=100007029333905%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Linh Anh (ID: 100003994300054)
UPDATE customers SET 
    name = 'Linh Anh',
    facebook_name = 'Linh Anh',
    facebook_numeric_id = '100003994300054',
    profile_picture_url = 'https://graph.facebook.com/100003994300054/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%linhkutephomaique%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003994300054%'
    OR facebook_url LIKE '%profile.php?id=100003994300054%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tien Hai (ID: 100009987768939)
UPDATE customers SET 
    name = 'Tien Hai',
    facebook_name = 'Tien Hai',
    facebook_numeric_id = '100009987768939',
    profile_picture_url = 'https://graph.facebook.com/100009987768939/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009987768939%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009987768939%'
    OR facebook_url LIKE '%profile.php?id=100009987768939%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Ước (ID: 100009369217692)
UPDATE customers SET 
    name = 'Phạm Ước',
    facebook_name = 'Phạm Ước',
    facebook_numeric_id = '100009369217692',
    profile_picture_url = 'https://graph.facebook.com/100009369217692/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%uoc.pham.940%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009369217692%'
    OR facebook_url LIKE '%profile.php?id=100009369217692%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuỷ BaBie (ID: 100036805186298)
UPDATE customers SET 
    name = 'Thuỷ BaBie',
    facebook_name = 'Thuỷ BaBie',
    facebook_numeric_id = '100036805186298',
    profile_picture_url = 'https://graph.facebook.com/100036805186298/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036805186298%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036805186298%'
    OR facebook_url LIKE '%profile.php?id=100036805186298%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoài Thức (ID: 100018635598523)
UPDATE customers SET 
    name = 'Hoài Thức',
    facebook_name = 'Hoài Thức',
    facebook_numeric_id = '100018635598523',
    profile_picture_url = 'https://graph.facebook.com/100018635598523/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuc.hoai.121%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100018635598523%'
    OR facebook_url LIKE '%profile.php?id=100018635598523%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ha Phan (ID: 100013073976903)
UPDATE customers SET 
    name = 'Ha Phan',
    facebook_name = 'Ha Phan',
    facebook_numeric_id = '100013073976903',
    profile_picture_url = 'https://graph.facebook.com/100013073976903/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vu.nguyentat.39%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013073976903%'
    OR facebook_url LIKE '%profile.php?id=100013073976903%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thành Long (ID: 100030949212980)
UPDATE customers SET 
    name = 'Nguyễn Thành Long',
    facebook_name = 'Nguyễn Thành Long',
    facebook_numeric_id = '100030949212980',
    profile_picture_url = 'https://graph.facebook.com/100030949212980/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100030949212980%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100030949212980%'
    OR facebook_url LIKE '%profile.php?id=100030949212980%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Huyen My (ID: 100010494971830)
UPDATE customers SET 
    name = 'Nguyen Huyen My',
    facebook_name = 'Nguyen Huyen My',
    facebook_numeric_id = '100010494971830',
    profile_picture_url = 'https://graph.facebook.com/100010494971830/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyen.huyenmy.58%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010494971830%'
    OR facebook_url LIKE '%profile.php?id=100010494971830%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Trí Lâm (ID: 100019225094963)
UPDATE customers SET 
    name = 'Nguyễn Trí Lâm',
    facebook_name = 'Nguyễn Trí Lâm',
    facebook_numeric_id = '100019225094963',
    profile_picture_url = 'https://graph.facebook.com/100019225094963/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lam.nguyentri.98%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100019225094963%'
    OR facebook_url LIKE '%profile.php?id=100019225094963%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quân Minh Nguyễn (ID: 1714883024)
UPDATE customers SET 
    name = 'Quân Minh Nguyễn',
    facebook_name = 'Quân Minh Nguyễn',
    facebook_numeric_id = '1714883024',
    profile_picture_url = 'https://graph.facebook.com/1714883024/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%grosserkumnq%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1714883024%'
    OR facebook_url LIKE '%profile.php?id=1714883024%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Quách (ID: 100022502979759)
UPDATE customers SET 
    name = 'Trang Quách',
    facebook_name = 'Trang Quách',
    facebook_numeric_id = '100022502979759',
    profile_picture_url = 'https://graph.facebook.com/100022502979759/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trang.quach.7127146%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022502979759%'
    OR facebook_url LIKE '%profile.php?id=100022502979759%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngoc Bao Anh Nguyen (ID: 100002941122981)
UPDATE customers SET 
    name = 'Ngoc Bao Anh Nguyen',
    facebook_name = 'Ngoc Bao Anh Nguyen',
    facebook_numeric_id = '100002941122981',
    profile_picture_url = 'https://graph.facebook.com/100002941122981/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuha1711%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002941122981%'
    OR facebook_url LIKE '%profile.php?id=100002941122981%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Linh Phương (ID: 100003900566414)
UPDATE customers SET 
    name = 'Trần Linh Phương',
    facebook_name = 'Trần Linh Phương',
    facebook_numeric_id = '100003900566414',
    profile_picture_url = 'https://graph.facebook.com/100003900566414/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%claudiaphuongg%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003900566414%'
    OR facebook_url LIKE '%profile.php?id=100003900566414%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ken Lee (ID: 100006515359070)
UPDATE customers SET 
    name = 'Ken Lee',
    facebook_name = 'Ken Lee',
    facebook_numeric_id = '100006515359070',
    profile_picture_url = 'https://graph.facebook.com/100006515359070/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006515359070%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006515359070%'
    OR facebook_url LIKE '%profile.php?id=100006515359070%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bé Yêu (ID: 1799258974)
UPDATE customers SET 
    name = 'Bé Yêu',
    facebook_name = 'Bé Yêu',
    facebook_numeric_id = '1799258974',
    profile_picture_url = 'https://graph.facebook.com/1799258974/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%beyeu.89%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1799258974%'
    OR facebook_url LIKE '%profile.php?id=1799258974%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Chi Mai (ID: 100053407142741)
UPDATE customers SET 
    name = 'Phạm Chi Mai',
    facebook_name = 'Phạm Chi Mai',
    facebook_numeric_id = '100053407142741',
    profile_picture_url = 'https://graph.facebook.com/100053407142741/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%chimai.pham.3114%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100053407142741%'
    OR facebook_url LIKE '%profile.php?id=100053407142741%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Hai Giang (ID: 100034858900965)
UPDATE customers SET 
    name = 'Thi Hai Giang',
    facebook_name = 'Thi Hai Giang',
    facebook_numeric_id = '100034858900965',
    profile_picture_url = 'https://graph.facebook.com/100034858900965/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thihai.giang.940%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100034858900965%'
    OR facebook_url LIKE '%profile.php?id=100034858900965%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Truc Trúc (ID: 100037264860614)
UPDATE customers SET 
    name = 'Truc Trúc',
    facebook_name = 'Truc Trúc',
    facebook_numeric_id = '100037264860614',
    profile_picture_url = 'https://graph.facebook.com/100037264860614/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100037264860614%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100037264860614%'
    OR facebook_url LIKE '%profile.php?id=100037264860614%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tài Ơi (ID: 100084105102729)
UPDATE customers SET 
    name = 'Tài Ơi',
    facebook_name = 'Tài Ơi',
    facebook_numeric_id = '100084105102729',
    profile_picture_url = 'https://graph.facebook.com/100084105102729/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100084105102729%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100084105102729%'
    OR facebook_url LIKE '%profile.php?id=100084105102729%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duc Dang (ID: 100093965407638)
UPDATE customers SET 
    name = 'Duc Dang',
    facebook_name = 'Duc Dang',
    facebook_numeric_id = '100093965407638',
    profile_picture_url = 'https://graph.facebook.com/100093965407638/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100093965407638%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100093965407638%'
    OR facebook_url LIKE '%profile.php?id=100093965407638%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- AnToine Ng (ID: 100003655920337)
UPDATE customers SET 
    name = 'AnToine Ng',
    facebook_name = 'AnToine Ng',
    facebook_numeric_id = '100003655920337',
    profile_picture_url = 'https://graph.facebook.com/100003655920337/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tony.nguyen.5059601%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003655920337%'
    OR facebook_url LIKE '%profile.php?id=100003655920337%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anh Linh (ID: 100024286894967)
UPDATE customers SET 
    name = 'Anh Linh',
    facebook_name = 'Anh Linh',
    facebook_numeric_id = '100024286894967',
    profile_picture_url = 'https://graph.facebook.com/100024286894967/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024286894967%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024286894967%'
    OR facebook_url LIKE '%profile.php?id=100024286894967%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thành Nguyễn (ID: 100057505894856)
UPDATE customers SET 
    name = 'Thành Nguyễn',
    facebook_name = 'Thành Nguyễn',
    facebook_numeric_id = '100057505894856',
    profile_picture_url = 'https://graph.facebook.com/100057505894856/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100057505894856%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100057505894856%'
    OR facebook_url LIKE '%profile.php?id=100057505894856%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Monika Nhung (ID: 100009574830941)
UPDATE customers SET 
    name = 'Monika Nhung',
    facebook_name = 'Monika Nhung',
    facebook_numeric_id = '100009574830941',
    profile_picture_url = 'https://graph.facebook.com/100009574830941/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009574830941%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009574830941%'
    OR facebook_url LIKE '%profile.php?id=100009574830941%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Thị Phương Thảo (ID: 100007973439547)
UPDATE customers SET 
    name = 'Trần Thị Phương Thảo',
    facebook_name = 'Trần Thị Phương Thảo',
    facebook_numeric_id = '100007973439547',
    profile_picture_url = 'https://graph.facebook.com/100007973439547/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thauchui21%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007973439547%'
    OR facebook_url LIKE '%profile.php?id=100007973439547%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Aurelia Sara (ID: 100018726454830)
UPDATE customers SET 
    name = 'Aurelia Sara',
    facebook_name = 'Aurelia Sara',
    facebook_numeric_id = '100018726454830',
    profile_picture_url = 'https://graph.facebook.com/100018726454830/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100018726454830%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100018726454830%'
    OR facebook_url LIKE '%profile.php?id=100018726454830%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khoảnh Khắc (ID: 100062629156479)
UPDATE customers SET 
    name = 'Khoảnh Khắc',
    facebook_name = 'Khoảnh Khắc',
    facebook_numeric_id = '100062629156479',
    profile_picture_url = 'https://graph.facebook.com/100062629156479/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100062629156479%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100062629156479%'
    OR facebook_url LIKE '%profile.php?id=100062629156479%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hong Nguyen (ID: 1608476166)
UPDATE customers SET 
    name = 'Hong Nguyen',
    facebook_name = 'Hong Nguyen',
    facebook_numeric_id = '1608476166',
    profile_picture_url = 'https://graph.facebook.com/1608476166/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyen.p.hong.507027%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1608476166%'
    OR facebook_url LIKE '%profile.php?id=1608476166%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lịch Châu (ID: 100005273471414)
UPDATE customers SET 
    name = 'Lịch Châu',
    facebook_name = 'Lịch Châu',
    facebook_numeric_id = '100005273471414',
    profile_picture_url = 'https://graph.facebook.com/100005273471414/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005273471414%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005273471414%'
    OR facebook_url LIKE '%profile.php?id=100005273471414%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Do Jenny (ID: 100026905669073)
UPDATE customers SET 
    name = 'Do Jenny',
    facebook_name = 'Do Jenny',
    facebook_numeric_id = '100026905669073',
    profile_picture_url = 'https://graph.facebook.com/100026905669073/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%do.jenny.3538%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100026905669073%'
    OR facebook_url LIKE '%profile.php?id=100026905669073%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hải Nguyễn (ID: 100023430312539)
UPDATE customers SET 
    name = 'Hải Nguyễn',
    facebook_name = 'Hải Nguyễn',
    facebook_numeric_id = '100023430312539',
    profile_picture_url = 'https://graph.facebook.com/100023430312539/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hai.sachen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023430312539%'
    OR facebook_url LIKE '%profile.php?id=100023430312539%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuong Lam Linh (ID: 100003458063798)
UPDATE customers SET 
    name = 'Phuong Lam Linh',
    facebook_name = 'Phuong Lam Linh',
    facebook_numeric_id = '100003458063798',
    profile_picture_url = 'https://graph.facebook.com/100003458063798/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuonglam.linh%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003458063798%'
    OR facebook_url LIKE '%profile.php?id=100003458063798%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Nguyen (ID: 100001187840488)
UPDATE customers SET 
    name = 'Thuy Nguyen',
    facebook_name = 'Thuy Nguyen',
    facebook_numeric_id = '100001187840488',
    profile_picture_url = 'https://graph.facebook.com/100001187840488/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001187840488%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001187840488%'
    OR facebook_url LIKE '%profile.php?id=100001187840488%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Oanh Hoàng (ID: 100044050324052)
UPDATE customers SET 
    name = 'Oanh Hoàng',
    facebook_name = 'Oanh Hoàng',
    facebook_numeric_id = '100044050324052',
    profile_picture_url = 'https://graph.facebook.com/100044050324052/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044050324052%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044050324052%'
    OR facebook_url LIKE '%profile.php?id=100044050324052%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- ChÂu Anh (ID: 100004494210123)
UPDATE customers SET 
    name = 'ChÂu Anh',
    facebook_name = 'ChÂu Anh',
    facebook_numeric_id = '100004494210123',
    profile_picture_url = 'https://graph.facebook.com/100004494210123/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyenthi.chau.180%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004494210123%'
    OR facebook_url LIKE '%profile.php?id=100004494210123%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tung Vo (ID: 100003210660937)
UPDATE customers SET 
    name = 'Tung Vo',
    facebook_name = 'Tung Vo',
    facebook_numeric_id = '100003210660937',
    profile_picture_url = 'https://graph.facebook.com/100003210660937/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tung.vo.31105%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003210660937%'
    OR facebook_url LIKE '%profile.php?id=100003210660937%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Thu Hoaitran (ID: 100029222886324)
UPDATE customers SET 
    name = 'Thi Thu Hoaitran',
    facebook_name = 'Thi Thu Hoaitran',
    facebook_numeric_id = '100029222886324',
    profile_picture_url = 'https://graph.facebook.com/100029222886324/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thithu.hoaitran.589%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029222886324%'
    OR facebook_url LIKE '%profile.php?id=100029222886324%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hyori Nguyễn's (ID: 100006047173255)
UPDATE customers SET 
    name = 'Hyori Nguyễn''s',
    facebook_name = 'Hyori Nguyễn''s',
    facebook_numeric_id = '100006047173255',
    profile_picture_url = 'https://graph.facebook.com/100006047173255/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hung.nham.771%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006047173255%'
    OR facebook_url LIKE '%profile.php?id=100006047173255%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hanh Luyen (ID: 100041943937107)
UPDATE customers SET 
    name = 'Hanh Luyen',
    facebook_name = 'Hanh Luyen',
    facebook_numeric_id = '100041943937107',
    profile_picture_url = 'https://graph.facebook.com/100041943937107/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hanh.luyen.9404%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041943937107%'
    OR facebook_url LIKE '%profile.php?id=100041943937107%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Anh (ID: 100016328476112)
UPDATE customers SET 
    name = 'Thuy Anh',
    facebook_name = 'Thuy Anh',
    facebook_numeric_id = '100016328476112',
    profile_picture_url = 'https://graph.facebook.com/100016328476112/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016328476112%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016328476112%'
    OR facebook_url LIKE '%profile.php?id=100016328476112%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lơi Lê (ID: 100075386356304)
UPDATE customers SET 
    name = 'Lơi Lê',
    facebook_name = 'Lơi Lê',
    facebook_numeric_id = '100075386356304',
    profile_picture_url = 'https://graph.facebook.com/100075386356304/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100075386356304%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100075386356304%'
    OR facebook_url LIKE '%profile.php?id=100075386356304%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- David Trịnh (ID: 100003202795215)
UPDATE customers SET 
    name = 'David Trịnh',
    facebook_name = 'David Trịnh',
    facebook_numeric_id = '100003202795215',
    profile_picture_url = 'https://graph.facebook.com/100003202795215/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quangvinh.trinh.73%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003202795215%'
    OR facebook_url LIKE '%profile.php?id=100003202795215%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vân Anh (ID: 100006235295669)
UPDATE customers SET 
    name = 'Vân Anh',
    facebook_name = 'Vân Anh',
    facebook_numeric_id = '100006235295669',
    profile_picture_url = 'https://graph.facebook.com/100006235295669/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%sheliyeu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006235295669%'
    OR facebook_url LIKE '%profile.php?id=100006235295669%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lê Tài Luận (ID: 100005616885967)
UPDATE customers SET 
    name = 'Lê Tài Luận',
    facebook_name = 'Lê Tài Luận',
    facebook_numeric_id = '100005616885967',
    profile_picture_url = 'https://graph.facebook.com/100005616885967/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%luanle251295%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005616885967%'
    OR facebook_url LIKE '%profile.php?id=100005616885967%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tú MoOn (ID: 100004125630450)
UPDATE customers SET 
    name = 'Tú MoOn',
    facebook_name = 'Tú MoOn',
    facebook_numeric_id = '100004125630450',
    profile_picture_url = 'https://graph.facebook.com/100004125630450/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nhimxu.codon%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004125630450%'
    OR facebook_url LIKE '%profile.php?id=100004125630450%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Que Cao (ID: 100001348342921)
UPDATE customers SET 
    name = 'Minh Que Cao',
    facebook_name = 'Minh Que Cao',
    facebook_numeric_id = '100001348342921',
    profile_picture_url = 'https://graph.facebook.com/100001348342921/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%minhquecao%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001348342921%'
    OR facebook_url LIKE '%profile.php?id=100001348342921%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mac Van Nhat (ID: 100000203689517)
UPDATE customers SET 
    name = 'Mac Van Nhat',
    facebook_name = 'Mac Van Nhat',
    facebook_numeric_id = '100000203689517',
    profile_picture_url = 'https://graph.facebook.com/100000203689517/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%motdieu106%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000203689517%'
    OR facebook_url LIKE '%profile.php?id=100000203689517%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quyên Nguyễn (ID: 100028212854285)
UPDATE customers SET 
    name = 'Quyên Nguyễn',
    facebook_name = 'Quyên Nguyễn',
    facebook_numeric_id = '100028212854285',
    profile_picture_url = 'https://graph.facebook.com/100028212854285/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quyen.lenguyen.779%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028212854285%'
    OR facebook_url LIKE '%profile.php?id=100028212854285%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ut Trien (ID: 100005812145233)
UPDATE customers SET 
    name = 'Ut Trien',
    facebook_name = 'Ut Trien',
    facebook_numeric_id = '100005812145233',
    profile_picture_url = 'https://graph.facebook.com/100005812145233/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%UTnagel%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005812145233%'
    OR facebook_url LIKE '%profile.php?id=100005812145233%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hanna Bui (ID: 100090803866323)
UPDATE customers SET 
    name = 'Hanna Bui',
    facebook_name = 'Hanna Bui',
    facebook_numeric_id = '100090803866323',
    profile_picture_url = 'https://graph.facebook.com/100090803866323/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100090803866323%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100090803866323%'
    OR facebook_url LIKE '%profile.php?id=100090803866323%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Thu Thao (ID: 100008351496364)
UPDATE customers SET 
    name = 'Nguyen Thu Thao',
    facebook_name = 'Nguyen Thu Thao',
    facebook_numeric_id = '100008351496364',
    profile_picture_url = 'https://graph.facebook.com/100008351496364/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thao.tay.7169%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008351496364%'
    OR facebook_url LIKE '%profile.php?id=100008351496364%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Henry Nguyen (ID: 100025207357319)
UPDATE customers SET 
    name = 'Henry Nguyen',
    facebook_name = 'Henry Nguyen',
    facebook_numeric_id = '100025207357319',
    profile_picture_url = 'https://graph.facebook.com/100025207357319/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025207357319%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025207357319%'
    OR facebook_url LIKE '%profile.php?id=100025207357319%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Hai (ID: 100000286702876)
UPDATE customers SET 
    name = 'Le Hai',
    facebook_name = 'Le Hai',
    facebook_numeric_id = '100000286702876',
    profile_picture_url = 'https://graph.facebook.com/100000286702876/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%legendocean2000%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000286702876%'
    OR facebook_url LIKE '%profile.php?id=100000286702876%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuyet Anh (ID: 100015401019520)
UPDATE customers SET 
    name = 'Tuyet Anh',
    facebook_name = 'Tuyet Anh',
    facebook_numeric_id = '100015401019520',
    profile_picture_url = 'https://graph.facebook.com/100015401019520/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015401019520%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015401019520%'
    OR facebook_url LIKE '%profile.php?id=100015401019520%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- HoaiThanh Vu (ID: 100010804684583)
UPDATE customers SET 
    name = 'HoaiThanh Vu',
    facebook_name = 'HoaiThanh Vu',
    facebook_numeric_id = '100010804684583',
    profile_picture_url = 'https://graph.facebook.com/100010804684583/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010804684583%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010804684583%'
    OR facebook_url LIKE '%profile.php?id=100010804684583%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vu Hong Nhung (ID: 100042513390553)
UPDATE customers SET 
    name = 'Vu Hong Nhung',
    facebook_name = 'Vu Hong Nhung',
    facebook_numeric_id = '100042513390553',
    profile_picture_url = 'https://graph.facebook.com/100042513390553/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100042513390553%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100042513390553%'
    OR facebook_url LIKE '%profile.php?id=100042513390553%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bá Thanh Dương Đinh (ID: 100000898549063)
UPDATE customers SET 
    name = 'Bá Thanh Dương Đinh',
    facebook_name = 'Bá Thanh Dương Đinh',
    facebook_numeric_id = '100000898549063',
    profile_picture_url = 'https://graph.facebook.com/100000898549063/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanhduong.dinhba%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000898549063%'
    OR facebook_url LIKE '%profile.php?id=100000898549063%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Hien (ID: 100000252927095)
UPDATE customers SET 
    name = 'Minh Hien',
    facebook_name = 'Minh Hien',
    facebook_numeric_id = '100000252927095',
    profile_picture_url = 'https://graph.facebook.com/100000252927095/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%minh.hien.395%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000252927095%'
    OR facebook_url LIKE '%profile.php?id=100000252927095%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cam Van Vu (ID: 100003252079578)
UPDATE customers SET 
    name = 'Cam Van Vu',
    facebook_name = 'Cam Van Vu',
    facebook_numeric_id = '100003252079578',
    profile_picture_url = 'https://graph.facebook.com/100003252079578/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%camvan.vu.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003252079578%'
    OR facebook_url LIKE '%profile.php?id=100003252079578%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quoc Thang (ID: 100004850587277)
UPDATE customers SET 
    name = 'Quoc Thang',
    facebook_name = 'Quoc Thang',
    facebook_numeric_id = '100004850587277',
    profile_picture_url = 'https://graph.facebook.com/100004850587277/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quocthang.nguyen.334%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004850587277%'
    OR facebook_url LIKE '%profile.php?id=100004850587277%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Yen Na (ID: 100005925939577)
UPDATE customers SET 
    name = 'Yen Na',
    facebook_name = 'Yen Na',
    facebook_numeric_id = '100005925939577',
    profile_picture_url = 'https://graph.facebook.com/100005925939577/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nails.na.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005925939577%'
    OR facebook_url LIKE '%profile.php?id=100005925939577%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuananh Tran (ID: 100001742960805)
UPDATE customers SET 
    name = 'Tuananh Tran',
    facebook_name = 'Tuananh Tran',
    facebook_numeric_id = '100001742960805',
    profile_picture_url = 'https://graph.facebook.com/100001742960805/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuananh.tran.904750%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001742960805%'
    OR facebook_url LIKE '%profile.php?id=100001742960805%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Ha (ID: 100006488468575)
UPDATE customers SET 
    name = 'Thu Ha',
    facebook_name = 'Thu Ha',
    facebook_numeric_id = '100006488468575',
    profile_picture_url = 'https://graph.facebook.com/100006488468575/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ha.ng0119%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006488468575%'
    OR facebook_url LIKE '%profile.php?id=100006488468575%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngụ Khanh (ID: 100005758057561)
UPDATE customers SET 
    name = 'Ngụ Khanh',
    facebook_name = 'Ngụ Khanh',
    facebook_numeric_id = '100005758057561',
    profile_picture_url = 'https://graph.facebook.com/100005758057561/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngukhanh.ngukhanh%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005758057561%'
    OR facebook_url LIKE '%profile.php?id=100005758057561%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thiep Lich (ID: 100029522528987)
UPDATE customers SET 
    name = 'Thiep Lich',
    facebook_name = 'Thiep Lich',
    facebook_numeric_id = '100029522528987',
    profile_picture_url = 'https://graph.facebook.com/100029522528987/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thiep.lich.73%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029522528987%'
    OR facebook_url LIKE '%profile.php?id=100029522528987%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Minh Huy (ID: 100030219789303)
UPDATE customers SET 
    name = 'Nguyễn Minh Huy',
    facebook_name = 'Nguyễn Minh Huy',
    facebook_numeric_id = '100030219789303',
    profile_picture_url = 'https://graph.facebook.com/100030219789303/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%HUYDUBAI%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100030219789303%'
    OR facebook_url LIKE '%profile.php?id=100030219789303%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mạnh Hồng Nguyễn (ID: 100001188619936)
UPDATE customers SET 
    name = 'Mạnh Hồng Nguyễn',
    facebook_name = 'Mạnh Hồng Nguyễn',
    facebook_numeric_id = '100001188619936',
    profile_picture_url = 'https://graph.facebook.com/100001188619936/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%manhhongcz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001188619936%'
    OR facebook_url LIKE '%profile.php?id=100001188619936%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dung Nấm (ID: 100060240814205)
UPDATE customers SET 
    name = 'Dung Nấm',
    facebook_name = 'Dung Nấm',
    facebook_numeric_id = '100060240814205',
    profile_picture_url = 'https://graph.facebook.com/100060240814205/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trinh.eva.940%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100060240814205%'
    OR facebook_url LIKE '%profile.php?id=100060240814205%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuấn Lê Đình (ID: 100003719080221)
UPDATE customers SET 
    name = 'Tuấn Lê Đình',
    facebook_name = 'Tuấn Lê Đình',
    facebook_numeric_id = '100003719080221',
    profile_picture_url = 'https://graph.facebook.com/100003719080221/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuanlong.mb%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003719080221%'
    OR facebook_url LIKE '%profile.php?id=100003719080221%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Huyền Trang (ID: 100004100033151)
UPDATE customers SET 
    name = 'Nguyễn Huyền Trang',
    facebook_name = 'Nguyễn Huyền Trang',
    facebook_numeric_id = '100004100033151',
    profile_picture_url = 'https://graph.facebook.com/100004100033151/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyentrang.nguyenthi.7334%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004100033151%'
    OR facebook_url LIKE '%profile.php?id=100004100033151%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Hường (ID: 100033710685808)
UPDATE customers SET 
    name = 'Thu Hường',
    facebook_name = 'Thu Hường',
    facebook_numeric_id = '100033710685808',
    profile_picture_url = 'https://graph.facebook.com/100033710685808/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%yvietanh98%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100033710685808%'
    OR facebook_url LIKE '%profile.php?id=100033710685808%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngọc Tâm (ID: 100052207804909)
UPDATE customers SET 
    name = 'Ngọc Tâm',
    facebook_name = 'Ngọc Tâm',
    facebook_numeric_id = '100052207804909',
    profile_picture_url = 'https://graph.facebook.com/100052207804909/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%chunchunn.1606%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100052207804909%'
    OR facebook_url LIKE '%profile.php?id=100052207804909%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huong Vuong (ID: 100004101143069)
UPDATE customers SET 
    name = 'Huong Vuong',
    facebook_name = 'Huong Vuong',
    facebook_numeric_id = '100004101143069',
    profile_picture_url = 'https://graph.facebook.com/100004101143069/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004101143069%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004101143069%'
    OR facebook_url LIKE '%profile.php?id=100004101143069%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Hồng Phong (ID: 100011581211623)
UPDATE customers SET 
    name = 'Phạm Hồng Phong',
    facebook_name = 'Phạm Hồng Phong',
    facebook_numeric_id = '100011581211623',
    profile_picture_url = 'https://graph.facebook.com/100011581211623/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011581211623%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011581211623%'
    OR facebook_url LIKE '%profile.php?id=100011581211623%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Jessica Nguyen (ID: 100079186817330)
UPDATE customers SET 
    name = 'Jessica Nguyen',
    facebook_name = 'Jessica Nguyen',
    facebook_numeric_id = '100079186817330',
    profile_picture_url = 'https://graph.facebook.com/100079186817330/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100079186817330%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100079186817330%'
    OR facebook_url LIKE '%profile.php?id=100079186817330%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lenka Nguyen (ID: 100001317966835)
UPDATE customers SET 
    name = 'Lenka Nguyen',
    facebook_name = 'Lenka Nguyen',
    facebook_numeric_id = '100001317966835',
    profile_picture_url = 'https://graph.facebook.com/100001317966835/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huong.nguyen.5099%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001317966835%'
    OR facebook_url LIKE '%profile.php?id=100001317966835%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- An An (ID: 100006599914524)
UPDATE customers SET 
    name = 'An An',
    facebook_name = 'An An',
    facebook_numeric_id = '100006599914524',
    profile_picture_url = 'https://graph.facebook.com/100006599914524/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006599914524%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006599914524%'
    OR facebook_url LIKE '%profile.php?id=100006599914524%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Helena Nguyen (ID: 100000255441476)
UPDATE customers SET 
    name = 'Helena Nguyen',
    facebook_name = 'Helena Nguyen',
    facebook_numeric_id = '100000255441476',
    profile_picture_url = 'https://graph.facebook.com/100000255441476/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%helena.nguyen85%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000255441476%'
    OR facebook_url LIKE '%profile.php?id=100000255441476%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cuc Nguyen (ID: 100007318216363)
UPDATE customers SET 
    name = 'Cuc Nguyen',
    facebook_name = 'Cuc Nguyen',
    facebook_numeric_id = '100007318216363',
    profile_picture_url = 'https://graph.facebook.com/100007318216363/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007318216363%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007318216363%'
    OR facebook_url LIKE '%profile.php?id=100007318216363%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hang Vu (ID: 100072251438988)
UPDATE customers SET 
    name = 'Hang Vu',
    facebook_name = 'Hang Vu',
    facebook_numeric_id = '100072251438988',
    profile_picture_url = 'https://graph.facebook.com/100072251438988/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100072251438988%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100072251438988%'
    OR facebook_url LIKE '%profile.php?id=100072251438988%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mai Hương (ID: 100023771777657)
UPDATE customers SET 
    name = 'Mai Hương',
    facebook_name = 'Mai Hương',
    facebook_numeric_id = '100023771777657',
    profile_picture_url = 'https://graph.facebook.com/100023771777657/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023771777657%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023771777657%'
    OR facebook_url LIKE '%profile.php?id=100023771777657%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa La' Tren Doi (ID: 100000096958477)
UPDATE customers SET 
    name = 'Hoa La'' Tren Doi',
    facebook_name = 'Hoa La'' Tren Doi',
    facebook_numeric_id = '100000096958477',
    profile_picture_url = 'https://graph.facebook.com/100000096958477/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%HoaLaTrenDoi%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000096958477%'
    OR facebook_url LIKE '%profile.php?id=100000096958477%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đào Mie (ID: 100004773305052)
UPDATE customers SET 
    name = 'Đào Mie',
    facebook_name = 'Đào Mie',
    facebook_numeric_id = '100004773305052',
    profile_picture_url = 'https://graph.facebook.com/100004773305052/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004773305052%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004773305052%'
    OR facebook_url LIKE '%profile.php?id=100004773305052%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Vo (ID: 100052915501936)
UPDATE customers SET 
    name = 'Thi Vo',
    facebook_name = 'Thi Vo',
    facebook_numeric_id = '100052915501936',
    profile_picture_url = 'https://graph.facebook.com/100052915501936/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100052915501936%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100052915501936%'
    OR facebook_url LIKE '%profile.php?id=100052915501936%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Angelo Nguyen (ID: 100000717573545)
UPDATE customers SET 
    name = 'Angelo Nguyen',
    facebook_name = 'Angelo Nguyen',
    facebook_numeric_id = '100000717573545',
    profile_picture_url = 'https://graph.facebook.com/100000717573545/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%angelo.nguyen.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000717573545%'
    OR facebook_url LIKE '%profile.php?id=100000717573545%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Tinh (ID: 100008286576187)
UPDATE customers SET 
    name = 'Le Tinh',
    facebook_name = 'Le Tinh',
    facebook_numeric_id = '100008286576187',
    profile_picture_url = 'https://graph.facebook.com/100008286576187/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008286576187%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008286576187%'
    OR facebook_url LIKE '%profile.php?id=100008286576187%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Nguyet (ID: 100028056039690)
UPDATE customers SET 
    name = 'Minh Nguyet',
    facebook_name = 'Minh Nguyet',
    facebook_numeric_id = '100028056039690',
    profile_picture_url = 'https://graph.facebook.com/100028056039690/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028056039690%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028056039690%'
    OR facebook_url LIKE '%profile.php?id=100028056039690%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Diệp Lâm (ID: 100003159512834)
UPDATE customers SET 
    name = 'Diệp Lâm',
    facebook_name = 'Diệp Lâm',
    facebook_numeric_id = '100003159512834',
    profile_picture_url = 'https://graph.facebook.com/100003159512834/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%pixie.smile.31%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003159512834%'
    OR facebook_url LIKE '%profile.php?id=100003159512834%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Xương Rồng (ID: 100023771326520)
UPDATE customers SET 
    name = 'Xương Rồng',
    facebook_name = 'Xương Rồng',
    facebook_numeric_id = '100023771326520',
    profile_picture_url = 'https://graph.facebook.com/100023771326520/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%baba.lao.10048%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023771326520%'
    OR facebook_url LIKE '%profile.php?id=100023771326520%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phillip Ngo (ID: 100002970069399)
UPDATE customers SET 
    name = 'Phillip Ngo',
    facebook_name = 'Phillip Ngo',
    facebook_numeric_id = '100002970069399',
    profile_picture_url = 'https://graph.facebook.com/100002970069399/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tran.mua.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002970069399%'
    OR facebook_url LIKE '%profile.php?id=100002970069399%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ta Thanh Hai (ID: 100000288166999)
UPDATE customers SET 
    name = 'Ta Thanh Hai',
    facebook_name = 'Ta Thanh Hai',
    facebook_numeric_id = '100000288166999',
    profile_picture_url = 'https://graph.facebook.com/100000288166999/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%haithanhta91%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000288166999%'
    OR facebook_url LIKE '%profile.php?id=100000288166999%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuyet Huong Lam (ID: 100005828490343)
UPDATE customers SET 
    name = 'Tuyet Huong Lam',
    facebook_name = 'Tuyet Huong Lam',
    facebook_numeric_id = '100005828490343',
    profile_picture_url = 'https://graph.facebook.com/100005828490343/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuyethuong.lam.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005828490343%'
    OR facebook_url LIKE '%profile.php?id=100005828490343%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nhat Anh Nguyen (ID: 100011495977798)
UPDATE customers SET 
    name = 'Nhat Anh Nguyen',
    facebook_name = 'Nhat Anh Nguyen',
    facebook_numeric_id = '100011495977798',
    profile_picture_url = 'https://graph.facebook.com/100011495977798/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nhatanh.nguyen.98478672%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011495977798%'
    OR facebook_url LIKE '%profile.php?id=100011495977798%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyen Minhmy (ID: 100009583283210)
UPDATE customers SET 
    name = 'Huyen Minhmy',
    facebook_name = 'Huyen Minhmy',
    facebook_numeric_id = '100009583283210',
    profile_picture_url = 'https://graph.facebook.com/100009583283210/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyen.minhmy.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009583283210%'
    OR facebook_url LIKE '%profile.php?id=100009583283210%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuc Thanh Hoang (ID: 100002416320853)
UPDATE customers SET 
    name = 'Phuc Thanh Hoang',
    facebook_name = 'Phuc Thanh Hoang',
    facebook_numeric_id = '100002416320853',
    profile_picture_url = 'https://graph.facebook.com/100002416320853/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuc.t.hoang%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002416320853%'
    OR facebook_url LIKE '%profile.php?id=100002416320853%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thile Nguyen (ID: 100003082425195)
UPDATE customers SET 
    name = 'Thile Nguyen',
    facebook_name = 'Thile Nguyen',
    facebook_numeric_id = '100003082425195',
    profile_picture_url = 'https://graph.facebook.com/100003082425195/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thile.nguyen.505%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003082425195%'
    OR facebook_url LIKE '%profile.php?id=100003082425195%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Phạm (ID: 100004300235213)
UPDATE customers SET 
    name = 'Hoa Phạm',
    facebook_name = 'Hoa Phạm',
    facebook_numeric_id = '100004300235213',
    profile_picture_url = 'https://graph.facebook.com/100004300235213/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngoc.hoa.5876%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004300235213%'
    OR facebook_url LIKE '%profile.php?id=100004300235213%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Toni Nguyen (ID: 100003159410019)
UPDATE customers SET 
    name = 'Toni Nguyen',
    facebook_name = 'Toni Nguyen',
    facebook_numeric_id = '100003159410019',
    profile_picture_url = 'https://graph.facebook.com/100003159410019/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nam.hanam.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003159410019%'
    OR facebook_url LIKE '%profile.php?id=100003159410019%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Chuê Chuê Vân Quỳnh (ID: 100027625702260)
UPDATE customers SET 
    name = 'Chuê Chuê Vân Quỳnh',
    facebook_name = 'Chuê Chuê Vân Quỳnh',
    facebook_numeric_id = '100027625702260',
    profile_picture_url = 'https://graph.facebook.com/100027625702260/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vanquynh.chuechue.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027625702260%'
    OR facebook_url LIKE '%profile.php?id=100027625702260%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vinh Pham (ID: 100004090480090)
UPDATE customers SET 
    name = 'Vinh Pham',
    facebook_name = 'Vinh Pham',
    facebook_numeric_id = '100004090480090',
    profile_picture_url = 'https://graph.facebook.com/100004090480090/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004090480090%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004090480090%'
    OR facebook_url LIKE '%profile.php?id=100004090480090%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Hải Yến (ID: 100045670937099)
UPDATE customers SET 
    name = 'Hoàng Hải Yến',
    facebook_name = 'Hoàng Hải Yến',
    facebook_numeric_id = '100045670937099',
    profile_picture_url = 'https://graph.facebook.com/100045670937099/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100045670937099%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100045670937099%'
    OR facebook_url LIKE '%profile.php?id=100045670937099%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Antony Kiessling (ID: 100010174181777)
UPDATE customers SET 
    name = 'Antony Kiessling',
    facebook_name = 'Antony Kiessling',
    facebook_numeric_id = '100010174181777',
    profile_picture_url = 'https://graph.facebook.com/100010174181777/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%loucxie.swaggie%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010174181777%'
    OR facebook_url LIKE '%profile.php?id=100010174181777%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- ThaoNguyen Nguyen (ID: 100037268714689)
UPDATE customers SET 
    name = 'ThaoNguyen Nguyen',
    facebook_name = 'ThaoNguyen Nguyen',
    facebook_numeric_id = '100037268714689',
    profile_picture_url = 'https://graph.facebook.com/100037268714689/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100037268714689%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100037268714689%'
    OR facebook_url LIKE '%profile.php?id=100037268714689%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Julia Nguyen (ID: 100083559189095)
UPDATE customers SET 
    name = 'Julia Nguyen',
    facebook_name = 'Julia Nguyen',
    facebook_numeric_id = '100083559189095',
    profile_picture_url = 'https://graph.facebook.com/100083559189095/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100083559189095%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100083559189095%'
    OR facebook_url LIKE '%profile.php?id=100083559189095%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bich Ngoc Nguyen (ID: 100008192617871)
UPDATE customers SET 
    name = 'Bich Ngoc Nguyen',
    facebook_name = 'Bich Ngoc Nguyen',
    facebook_numeric_id = '100008192617871',
    profile_picture_url = 'https://graph.facebook.com/100008192617871/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008192617871%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008192617871%'
    OR facebook_url LIKE '%profile.php?id=100008192617871%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thủy Phạm (ID: 100005301405510)
UPDATE customers SET 
    name = 'Thủy Phạm',
    facebook_name = 'Thủy Phạm',
    facebook_numeric_id = '100005301405510',
    profile_picture_url = 'https://graph.facebook.com/100005301405510/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005301405510%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005301405510%'
    OR facebook_url LIKE '%profile.php?id=100005301405510%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hiền Lê (ID: 100023234583212)
UPDATE customers SET 
    name = 'Hiền Lê',
    facebook_name = 'Hiền Lê',
    facebook_numeric_id = '100023234583212',
    profile_picture_url = 'https://graph.facebook.com/100023234583212/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023234583212%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023234583212%'
    OR facebook_url LIKE '%profile.php?id=100023234583212%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Thi Nhu Huong (ID: 100001828636195)
UPDATE customers SET 
    name = 'Nguyen Thi Nhu Huong',
    facebook_name = 'Nguyen Thi Nhu Huong',
    facebook_numeric_id = '100001828636195',
    profile_picture_url = 'https://graph.facebook.com/100001828636195/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyenthi.nhuhuong.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001828636195%'
    OR facebook_url LIKE '%profile.php?id=100001828636195%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Candy Pham (ID: 61553749687594)
UPDATE customers SET 
    name = 'Candy Pham',
    facebook_name = 'Candy Pham',
    facebook_numeric_id = '61553749687594',
    profile_picture_url = 'https://graph.facebook.com/61553749687594/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61553749687594%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%61553749687594%'
    OR facebook_url LIKE '%profile.php?id=61553749687594%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kevin Lê (ID: 100002706335256)
UPDATE customers SET 
    name = 'Kevin Lê',
    facebook_name = 'Kevin Lê',
    facebook_numeric_id = '100002706335256',
    profile_picture_url = 'https://graph.facebook.com/100002706335256/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuan.levan.12%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002706335256%'
    OR facebook_url LIKE '%profile.php?id=100002706335256%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thao Tien Tran (ID: 100014401658148)
UPDATE customers SET 
    name = 'Thao Tien Tran',
    facebook_name = 'Thao Tien Tran',
    facebook_numeric_id = '100014401658148',
    profile_picture_url = 'https://graph.facebook.com/100014401658148/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%esther.beatrix.75%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014401658148%'
    OR facebook_url LIKE '%profile.php?id=100014401658148%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trương Huyền (ID: 100038475452757)
UPDATE customers SET 
    name = 'Trương Huyền',
    facebook_name = 'Trương Huyền',
    facebook_numeric_id = '100038475452757',
    profile_picture_url = 'https://graph.facebook.com/100038475452757/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100038475452757%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100038475452757%'
    OR facebook_url LIKE '%profile.php?id=100038475452757%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Xuong Rong (ID: 100000903243688)
UPDATE customers SET 
    name = 'Hoa Xuong Rong',
    facebook_name = 'Hoa Xuong Rong',
    facebook_numeric_id = '100000903243688',
    profile_picture_url = 'https://graph.facebook.com/100000903243688/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoa.xuongrong.52%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000903243688%'
    OR facebook_url LIKE '%profile.php?id=100000903243688%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Anh Tu (ID: 100010199822375)
UPDATE customers SET 
    name = 'Nguyen Anh Tu',
    facebook_name = 'Nguyen Anh Tu',
    facebook_numeric_id = '100010199822375',
    profile_picture_url = 'https://graph.facebook.com/100010199822375/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010199822375%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010199822375%'
    OR facebook_url LIKE '%profile.php?id=100010199822375%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuong Thao Cao (ID: 100002637640258)
UPDATE customers SET 
    name = 'Phuong Thao Cao',
    facebook_name = 'Phuong Thao Cao',
    facebook_numeric_id = '100002637640258',
    profile_picture_url = 'https://graph.facebook.com/100002637640258/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuong.thaocao.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002637640258%'
    OR facebook_url LIKE '%profile.php?id=100002637640258%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thao Vu Thi (ID: 100000117529754)
UPDATE customers SET 
    name = 'Thao Vu Thi',
    facebook_name = 'Thao Vu Thi',
    facebook_numeric_id = '100000117529754',
    profile_picture_url = 'https://graph.facebook.com/100000117529754/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thao.vuthi.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000117529754%'
    OR facebook_url LIKE '%profile.php?id=100000117529754%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Thảo (ID: 100086741614035)
UPDATE customers SET 
    name = 'Thanh Thảo',
    facebook_name = 'Thanh Thảo',
    facebook_numeric_id = '100086741614035',
    profile_picture_url = 'https://graph.facebook.com/100086741614035/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100086741614035%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100086741614035%'
    OR facebook_url LIKE '%profile.php?id=100086741614035%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Hằng (ID: 100044088938058)
UPDATE customers SET 
    name = 'Nguyễn Hằng',
    facebook_name = 'Nguyễn Hằng',
    facebook_numeric_id = '100044088938058',
    profile_picture_url = 'https://graph.facebook.com/100044088938058/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044088938058%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044088938058%'
    OR facebook_url LIKE '%profile.php?id=100044088938058%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hong Tran Thi (ID: 100002403472092)
UPDATE customers SET 
    name = 'Hong Tran Thi',
    facebook_name = 'Hong Tran Thi',
    facebook_numeric_id = '100002403472092',
    profile_picture_url = 'https://graph.facebook.com/100002403472092/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hong.tranthi.507%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002403472092%'
    OR facebook_url LIKE '%profile.php?id=100002403472092%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van An Bui (ID: 100012993153189)
UPDATE customers SET 
    name = 'Van An Bui',
    facebook_name = 'Van An Bui',
    facebook_numeric_id = '100012993153189',
    profile_picture_url = 'https://graph.facebook.com/100012993153189/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vanan.bui.7165%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012993153189%'
    OR facebook_url LIKE '%profile.php?id=100012993153189%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phúc Ngô (ID: 100004224120944)
UPDATE customers SET 
    name = 'Phúc Ngô',
    facebook_name = 'Phúc Ngô',
    facebook_numeric_id = '100004224120944',
    profile_picture_url = 'https://graph.facebook.com/100004224120944/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuc.ngo.98837%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004224120944%'
    OR facebook_url LIKE '%profile.php?id=100004224120944%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Duy Cường (ID: 100008746335984)
UPDATE customers SET 
    name = 'Nguyễn Duy Cường',
    facebook_name = 'Nguyễn Duy Cường',
    facebook_numeric_id = '100008746335984',
    profile_picture_url = 'https://graph.facebook.com/100008746335984/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008746335984%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008746335984%'
    OR facebook_url LIKE '%profile.php?id=100008746335984%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pham Ha (ID: 100010280733661)
UPDATE customers SET 
    name = 'Pham Ha',
    facebook_name = 'Pham Ha',
    facebook_numeric_id = '100010280733661',
    profile_picture_url = 'https://graph.facebook.com/100010280733661/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010280733661%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010280733661%'
    OR facebook_url LIKE '%profile.php?id=100010280733661%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Anh Hoang (ID: 1384111594)
UPDATE customers SET 
    name = 'Van Anh Hoang',
    facebook_name = 'Van Anh Hoang',
    facebook_numeric_id = '1384111594',
    profile_picture_url = 'https://graph.facebook.com/1384111594/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoang.vananh1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1384111594%'
    OR facebook_url LIKE '%profile.php?id=1384111594%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thanh Huyền (ID: 100002602582720)
UPDATE customers SET 
    name = 'Nguyễn Thanh Huyền',
    facebook_name = 'Nguyễn Thanh Huyền',
    facebook_numeric_id = '100002602582720',
    profile_picture_url = 'https://graph.facebook.com/100002602582720/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002602582720%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002602582720%'
    OR facebook_url LIKE '%profile.php?id=100002602582720%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Adam TL Minh (ID: 100074499229958)
UPDATE customers SET 
    name = 'Adam TL Minh',
    facebook_name = 'Adam TL Minh',
    facebook_numeric_id = '100074499229958',
    profile_picture_url = 'https://graph.facebook.com/100074499229958/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100074499229958%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100074499229958%'
    OR facebook_url LIKE '%profile.php?id=100074499229958%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Linh Anh (ID: 100008174231243)
UPDATE customers SET 
    name = 'Linh Anh',
    facebook_name = 'Linh Anh',
    facebook_numeric_id = '100008174231243',
    profile_picture_url = 'https://graph.facebook.com/100008174231243/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%donghailinh.86%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008174231243%'
    OR facebook_url LIKE '%profile.php?id=100008174231243%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vu Ngoc Huyen (ID: 100002591081583)
UPDATE customers SET 
    name = 'Vu Ngoc Huyen',
    facebook_name = 'Vu Ngoc Huyen',
    facebook_numeric_id = '100002591081583',
    profile_picture_url = 'https://graph.facebook.com/100002591081583/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vu.ngochuyen.77%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002591081583%'
    OR facebook_url LIKE '%profile.php?id=100002591081583%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bao Hiep (ID: 100006360758578)
UPDATE customers SET 
    name = 'Bao Hiep',
    facebook_name = 'Bao Hiep',
    facebook_numeric_id = '100006360758578',
    profile_picture_url = 'https://graph.facebook.com/100006360758578/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006360758578%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006360758578%'
    OR facebook_url LIKE '%profile.php?id=100006360758578%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duy Vũ (ID: 100002952586317)
UPDATE customers SET 
    name = 'Duy Vũ',
    facebook_name = 'Duy Vũ',
    facebook_numeric_id = '100002952586317',
    profile_picture_url = 'https://graph.facebook.com/100002952586317/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%duy.hunter.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002952586317%'
    OR facebook_url LIKE '%profile.php?id=100002952586317%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuong Vi Nguyen (ID: 100006462977341)
UPDATE customers SET 
    name = 'Phuong Vi Nguyen',
    facebook_name = 'Phuong Vi Nguyen',
    facebook_numeric_id = '100006462977341',
    profile_picture_url = 'https://graph.facebook.com/100006462977341/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuongvi.nguyen.5245%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006462977341%'
    OR facebook_url LIKE '%profile.php?id=100006462977341%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Nguyen (ID: 100000109415941)
UPDATE customers SET 
    name = 'Trang Nguyen',
    facebook_name = 'Trang Nguyen',
    facebook_numeric_id = '100000109415941',
    profile_picture_url = 'https://graph.facebook.com/100000109415941/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%toi.trang%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000109415941%'
    OR facebook_url LIKE '%profile.php?id=100000109415941%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuỳ Linh (ID: 100004195212665)
UPDATE customers SET 
    name = 'Thuỳ Linh',
    facebook_name = 'Thuỳ Linh',
    facebook_numeric_id = '100004195212665',
    profile_picture_url = 'https://graph.facebook.com/100004195212665/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004195212665%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004195212665%'
    OR facebook_url LIKE '%profile.php?id=100004195212665%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuan Flip (ID: 100003342287132)
UPDATE customers SET 
    name = 'Tuan Flip',
    facebook_name = 'Tuan Flip',
    facebook_numeric_id = '100003342287132',
    profile_picture_url = 'https://graph.facebook.com/100003342287132/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuan.flip%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003342287132%'
    OR facebook_url LIKE '%profile.php?id=100003342287132%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tommy Vu (ID: 100004557701486)
UPDATE customers SET 
    name = 'Tommy Vu',
    facebook_name = 'Tommy Vu',
    facebook_numeric_id = '100004557701486',
    profile_picture_url = 'https://graph.facebook.com/100004557701486/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004557701486%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004557701486%'
    OR facebook_url LIKE '%profile.php?id=100004557701486%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngọc Đặng (ID: 100004057669620)
UPDATE customers SET 
    name = 'Ngọc Đặng',
    facebook_name = 'Ngọc Đặng',
    facebook_numeric_id = '100004057669620',
    profile_picture_url = 'https://graph.facebook.com/100004057669620/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tinhyeu.guilai%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004057669620%'
    OR facebook_url LIKE '%profile.php?id=100004057669620%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Man Ngovan (ID: 100004073917081)
UPDATE customers SET 
    name = 'Man Ngovan',
    facebook_name = 'Man Ngovan',
    facebook_numeric_id = '100004073917081',
    profile_picture_url = 'https://graph.facebook.com/100004073917081/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%man.ngovan.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004073917081%'
    OR facebook_url LIKE '%profile.php?id=100004073917081%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trịnh Thị Huệ (ID: 100022177190621)
UPDATE customers SET 
    name = 'Trịnh Thị Huệ',
    facebook_name = 'Trịnh Thị Huệ',
    facebook_numeric_id = '100022177190621',
    profile_picture_url = 'https://graph.facebook.com/100022177190621/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hue.trinhthi.7524%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100022177190621%'
    OR facebook_url LIKE '%profile.php?id=100022177190621%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lukas Ling (ID: 729785127)
UPDATE customers SET 
    name = 'Lukas Ling',
    facebook_name = 'Lukas Ling',
    facebook_numeric_id = '729785127',
    profile_picture_url = 'https://graph.facebook.com/729785127/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lukas.phan%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%729785127%'
    OR facebook_url LIKE '%profile.php?id=729785127%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyền Emy (ID: 100000491203480)
UPDATE customers SET 
    name = 'Huyền Emy',
    facebook_name = 'Huyền Emy',
    facebook_numeric_id = '100000491203480',
    profile_picture_url = 'https://graph.facebook.com/100000491203480/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyenemy.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000491203480%'
    OR facebook_url LIKE '%profile.php?id=100000491203480%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- NguyenHoang MinhKhang (ID: 100004759744971)
UPDATE customers SET 
    name = 'NguyenHoang MinhKhang',
    facebook_name = 'NguyenHoang MinhKhang',
    facebook_numeric_id = '100004759744971',
    profile_picture_url = 'https://graph.facebook.com/100004759744971/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%michal.nguyen.332%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004759744971%'
    OR facebook_url LIKE '%profile.php?id=100004759744971%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khuyên Phạm (ID: 100005026800475)
UPDATE customers SET 
    name = 'Khuyên Phạm',
    facebook_name = 'Khuyên Phạm',
    facebook_numeric_id = '100005026800475',
    profile_picture_url = 'https://graph.facebook.com/100005026800475/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanhhang.nguyen.507464%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005026800475%'
    OR facebook_url LIKE '%profile.php?id=100005026800475%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sang Sang (ID: 100010355256495)
UPDATE customers SET 
    name = 'Sang Sang',
    facebook_name = 'Sang Sang',
    facebook_numeric_id = '100010355256495',
    profile_picture_url = 'https://graph.facebook.com/100010355256495/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010355256495%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010355256495%'
    OR facebook_url LIKE '%profile.php?id=100010355256495%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuyen Phan (ID: 100012141947085)
UPDATE customers SET 
    name = 'Tuyen Phan',
    facebook_name = 'Tuyen Phan',
    facebook_numeric_id = '100012141947085',
    profile_picture_url = 'https://graph.facebook.com/100012141947085/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012141947085%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012141947085%'
    OR facebook_url LIKE '%profile.php?id=100012141947085%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- phan văn đại (ID: 100004670822977)
UPDATE customers SET 
    name = 'phan văn đại',
    facebook_name = 'phan văn đại',
    facebook_numeric_id = '100004670822977',
    profile_picture_url = 'https://graph.facebook.com/100004670822977/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%daiphan136%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004670822977%'
    OR facebook_url LIKE '%profile.php?id=100004670822977%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Phương Thảo (ID: 100039552820296)
UPDATE customers SET 
    name = 'Trần Phương Thảo',
    facebook_name = 'Trần Phương Thảo',
    facebook_numeric_id = '100039552820296',
    profile_picture_url = 'https://graph.facebook.com/100039552820296/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100039552820296%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100039552820296%'
    OR facebook_url LIKE '%profile.php?id=100039552820296%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Trịnh (ID: 100004843566748)
UPDATE customers SET 
    name = 'Thanh Trịnh',
    facebook_name = 'Thanh Trịnh',
    facebook_numeric_id = '100004843566748',
    profile_picture_url = 'https://graph.facebook.com/100004843566748/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trinh.thanh.10420%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004843566748%'
    OR facebook_url LIKE '%profile.php?id=100004843566748%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ta Nguyen (ID: 100003091299255)
UPDATE customers SET 
    name = 'Ta Nguyen',
    facebook_name = 'Ta Nguyen',
    facebook_numeric_id = '100003091299255',
    profile_picture_url = 'https://graph.facebook.com/100003091299255/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ta.nguyen.758%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003091299255%'
    OR facebook_url LIKE '%profile.php?id=100003091299255%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huong Giang Hoang (ID: 100002909819288)
UPDATE customers SET 
    name = 'Huong Giang Hoang',
    facebook_name = 'Huong Giang Hoang',
    facebook_numeric_id = '100002909819288',
    profile_picture_url = 'https://graph.facebook.com/100002909819288/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huonggiang.hoang.142%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002909819288%'
    OR facebook_url LIKE '%profile.php?id=100002909819288%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anicka Tran (ID: 100075069581378)
UPDATE customers SET 
    name = 'Anicka Tran',
    facebook_name = 'Anicka Tran',
    facebook_numeric_id = '100075069581378',
    profile_picture_url = 'https://graph.facebook.com/100075069581378/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100075069581378%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100075069581378%'
    OR facebook_url LIKE '%profile.php?id=100075069581378%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Yen Doan (ID: 100002964692626)
UPDATE customers SET 
    name = 'Yen Doan',
    facebook_name = 'Yen Doan',
    facebook_numeric_id = '100002964692626',
    profile_picture_url = 'https://graph.facebook.com/100002964692626/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%yeno0oheo%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002964692626%'
    OR facebook_url LIKE '%profile.php?id=100002964692626%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Kim Thu (ID: 100044626233079)
UPDATE customers SET 
    name = 'Nguyen Kim Thu',
    facebook_name = 'Nguyen Kim Thu',
    facebook_numeric_id = '100044626233079',
    profile_picture_url = 'https://graph.facebook.com/100044626233079/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%longthucz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044626233079%'
    OR facebook_url LIKE '%profile.php?id=100044626233079%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuan Anh (ID: 100004364324293)
UPDATE customers SET 
    name = 'Tuan Anh',
    facebook_name = 'Tuan Anh',
    facebook_numeric_id = '100004364324293',
    profile_picture_url = 'https://graph.facebook.com/100004364324293/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%anhtuandao.daotuannh%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004364324293%'
    OR facebook_url LIKE '%profile.php?id=100004364324293%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Šárka Pham (ID: 100008027610054)
UPDATE customers SET 
    name = 'Šárka Pham',
    facebook_name = 'Šárka Pham',
    facebook_numeric_id = '100008027610054',
    profile_picture_url = 'https://graph.facebook.com/100008027610054/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tho.trang.946954%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008027610054%'
    OR facebook_url LIKE '%profile.php?id=100008027610054%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lao Hac (ID: 100001011722994)
UPDATE customers SET 
    name = 'Lao Hac',
    facebook_name = 'Lao Hac',
    facebook_numeric_id = '100001011722994',
    profile_picture_url = 'https://graph.facebook.com/100001011722994/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thienthan.mam%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001011722994%'
    OR facebook_url LIKE '%profile.php?id=100001011722994%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngọc Bích Nguyễn (ID: 1242103482)
UPDATE customers SET 
    name = 'Ngọc Bích Nguyễn',
    facebook_name = 'Ngọc Bích Nguyễn',
    facebook_numeric_id = '1242103482',
    profile_picture_url = 'https://graph.facebook.com/1242103482/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%jolie.babie.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1242103482%'
    OR facebook_url LIKE '%profile.php?id=1242103482%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Nguyễn (ID: 100003104098865)
UPDATE customers SET 
    name = 'Trang Nguyễn',
    facebook_name = 'Trang Nguyễn',
    facebook_numeric_id = '100003104098865',
    profile_picture_url = 'https://graph.facebook.com/100003104098865/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hongvang.hoa.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003104098865%'
    OR facebook_url LIKE '%profile.php?id=100003104098865%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Trang (ID: 100003019520456)
UPDATE customers SET 
    name = 'Thu Trang',
    facebook_name = 'Thu Trang',
    facebook_numeric_id = '100003019520456',
    profile_picture_url = 'https://graph.facebook.com/100003019520456/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Nhim.PtThuTrag%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003019520456%'
    OR facebook_url LIKE '%profile.php?id=100003019520456%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Hà (ID: 100009238361188)
UPDATE customers SET 
    name = 'Nguyễn Hà',
    facebook_name = 'Nguyễn Hà',
    facebook_numeric_id = '100009238361188',
    profile_picture_url = 'https://graph.facebook.com/100009238361188/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009238361188%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009238361188%'
    OR facebook_url LIKE '%profile.php?id=100009238361188%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thiên Thảo (ID: 100016675759088)
UPDATE customers SET 
    name = 'Thiên Thảo',
    facebook_name = 'Thiên Thảo',
    facebook_numeric_id = '100016675759088',
    profile_picture_url = 'https://graph.facebook.com/100016675759088/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016675759088%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016675759088%'
    OR facebook_url LIKE '%profile.php?id=100016675759088%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Diep Phan (ID: 100005948618928)
UPDATE customers SET 
    name = 'Thanh Diep Phan',
    facebook_name = 'Thanh Diep Phan',
    facebook_numeric_id = '100005948618928',
    profile_picture_url = 'https://graph.facebook.com/100005948618928/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanhdiep.phan.16%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005948618928%'
    OR facebook_url LIKE '%profile.php?id=100005948618928%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoang Long Nguyen (ID: 100012127394082)
UPDATE customers SET 
    name = 'Hoang Long Nguyen',
    facebook_name = 'Hoang Long Nguyen',
    facebook_numeric_id = '100012127394082',
    profile_picture_url = 'https://graph.facebook.com/100012127394082/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hynhlongho%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012127394082%'
    OR facebook_url LIKE '%profile.php?id=100012127394082%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phamngoc Tung (ID: 100007932757189)
UPDATE customers SET 
    name = 'Phamngoc Tung',
    facebook_name = 'Phamngoc Tung',
    facebook_numeric_id = '100007932757189',
    profile_picture_url = 'https://graph.facebook.com/100007932757189/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tung.phamngoc.7549%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007932757189%'
    OR facebook_url LIKE '%profile.php?id=100007932757189%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đồng Phạm (ID: 100004683760521)
UPDATE customers SET 
    name = 'Đồng Phạm',
    facebook_name = 'Đồng Phạm',
    facebook_numeric_id = '100004683760521',
    profile_picture_url = 'https://graph.facebook.com/100004683760521/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%meo.hoang.33821%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004683760521%'
    OR facebook_url LIKE '%profile.php?id=100004683760521%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mai Q. Trang (ID: 100004520351882)
UPDATE customers SET 
    name = 'Mai Q. Trang',
    facebook_name = 'Mai Q. Trang',
    facebook_numeric_id = '100004520351882',
    profile_picture_url = 'https://graph.facebook.com/100004520351882/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004520351882%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004520351882%'
    OR facebook_url LIKE '%profile.php?id=100004520351882%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Thị Linh (ID: 100002311432572)
UPDATE customers SET 
    name = 'Trần Thị Linh',
    facebook_name = 'Trần Thị Linh',
    facebook_numeric_id = '100002311432572',
    profile_picture_url = 'https://graph.facebook.com/100002311432572/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%anh.tranngoc.319%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002311432572%'
    OR facebook_url LIKE '%profile.php?id=100002311432572%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Thuỳ Dung (ID: 100007564447795)
UPDATE customers SET 
    name = 'Phạm Thuỳ Dung',
    facebook_name = 'Phạm Thuỳ Dung',
    facebook_numeric_id = '100007564447795',
    profile_picture_url = 'https://graph.facebook.com/100007564447795/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nhat.nhoa.56211%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007564447795%'
    OR facebook_url LIKE '%profile.php?id=100007564447795%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Hien Nguyen (ID: 100069997807112)
UPDATE customers SET 
    name = 'Thi Hien Nguyen',
    facebook_name = 'Thi Hien Nguyen',
    facebook_numeric_id = '100069997807112',
    profile_picture_url = 'https://graph.facebook.com/100069997807112/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100069997807112%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100069997807112%'
    OR facebook_url LIKE '%profile.php?id=100069997807112%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lenka Trần (ID: 100015195485286)
UPDATE customers SET 
    name = 'Lenka Trần',
    facebook_name = 'Lenka Trần',
    facebook_numeric_id = '100015195485286',
    profile_picture_url = 'https://graph.facebook.com/100015195485286/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%oppa.anh.1884%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015195485286%'
    OR facebook_url LIKE '%profile.php?id=100015195485286%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hải Ninh (ID: 100015347971315)
UPDATE customers SET 
    name = 'Hải Ninh',
    facebook_name = 'Hải Ninh',
    facebook_numeric_id = '100015347971315',
    profile_picture_url = 'https://graph.facebook.com/100015347971315/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ninh.hai.14289%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015347971315%'
    OR facebook_url LIKE '%profile.php?id=100015347971315%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyen Ngan (ID: 100008438400792)
UPDATE customers SET 
    name = 'Huyen Ngan',
    facebook_name = 'Huyen Ngan',
    facebook_numeric_id = '100008438400792',
    profile_picture_url = 'https://graph.facebook.com/100008438400792/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008438400792%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008438400792%'
    OR facebook_url LIKE '%profile.php?id=100008438400792%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Yen Yen (ID: 100033277553675)
UPDATE customers SET 
    name = 'Yen Yen',
    facebook_name = 'Yen Yen',
    facebook_numeric_id = '100033277553675',
    profile_picture_url = 'https://graph.facebook.com/100033277553675/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100033277553675%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100033277553675%'
    OR facebook_url LIKE '%profile.php?id=100033277553675%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tungnam Pham (ID: 100040928511286)
UPDATE customers SET 
    name = 'Tungnam Pham',
    facebook_name = 'Tungnam Pham',
    facebook_numeric_id = '100040928511286',
    profile_picture_url = 'https://graph.facebook.com/100040928511286/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tungnam.pham.37%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100040928511286%'
    OR facebook_url LIKE '%profile.php?id=100040928511286%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Hang Pham (ID: 100000245331482)
UPDATE customers SET 
    name = 'Thuy Hang Pham',
    facebook_name = 'Thuy Hang Pham',
    facebook_numeric_id = '100000245331482',
    profile_picture_url = 'https://graph.facebook.com/100000245331482/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuyhang.pham.507%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000245331482%'
    OR facebook_url LIKE '%profile.php?id=100000245331482%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tu An Dao (ID: 100005060556479)
UPDATE customers SET 
    name = 'Tu An Dao',
    facebook_name = 'Tu An Dao',
    facebook_numeric_id = '100005060556479',
    profile_picture_url = 'https://graph.facebook.com/100005060556479/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuan.dao.988%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005060556479%'
    OR facebook_url LIKE '%profile.php?id=100005060556479%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Long (ID: 1804480870)
UPDATE customers SET 
    name = 'Hoàng Long',
    facebook_name = 'Hoàng Long',
    facebook_numeric_id = '1804480870',
    profile_picture_url = 'https://graph.facebook.com/1804480870/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoanglong310193%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1804480870%'
    OR facebook_url LIKE '%profile.php?id=1804480870%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Hoàng ViệtNam (ID: 100000679244861)
UPDATE customers SET 
    name = 'Nguyễn Hoàng ViệtNam',
    facebook_name = 'Nguyễn Hoàng ViệtNam',
    facebook_numeric_id = '100000679244861',
    profile_picture_url = 'https://graph.facebook.com/100000679244861/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoangviet.nguyen.73%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000679244861%'
    OR facebook_url LIKE '%profile.php?id=100000679244861%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Mai Anh (ID: 100001455517175)
UPDATE customers SET 
    name = 'Nguyễn Mai Anh',
    facebook_name = 'Nguyễn Mai Anh',
    facebook_numeric_id = '100001455517175',
    profile_picture_url = 'https://graph.facebook.com/100001455517175/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%khun.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001455517175%'
    OR facebook_url LIKE '%profile.php?id=100001455517175%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Thảo (ID: 100007911159889)
UPDATE customers SET 
    name = 'Thanh Thảo',
    facebook_name = 'Thanh Thảo',
    facebook_numeric_id = '100007911159889',
    profile_picture_url = 'https://graph.facebook.com/100007911159889/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007911159889%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007911159889%'
    OR facebook_url LIKE '%profile.php?id=100007911159889%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thanh Huyền (ID: 100089190760269)
UPDATE customers SET 
    name = 'Nguyễn Thanh Huyền',
    facebook_name = 'Nguyễn Thanh Huyền',
    facebook_numeric_id = '100089190760269',
    profile_picture_url = 'https://graph.facebook.com/100089190760269/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100089190760269%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100089190760269%'
    OR facebook_url LIKE '%profile.php?id=100089190760269%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quynh Hoa (ID: 100000884307579)
UPDATE customers SET 
    name = 'Quynh Hoa',
    facebook_name = 'Quynh Hoa',
    facebook_numeric_id = '100000884307579',
    profile_picture_url = 'https://graph.facebook.com/100000884307579/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quynhhoabeauty%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000884307579%'
    OR facebook_url LIKE '%profile.php?id=100000884307579%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sỹ Nguyễn (ID: 100001542902757)
UPDATE customers SET 
    name = 'Sỹ Nguyễn',
    facebook_name = 'Sỹ Nguyễn',
    facebook_numeric_id = '100001542902757',
    profile_picture_url = 'https://graph.facebook.com/100001542902757/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%sy.nguyen3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001542902757%'
    OR facebook_url LIKE '%profile.php?id=100001542902757%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Anna (ID: 100003754498710)
UPDATE customers SET 
    name = 'Trang Anna',
    facebook_name = 'Trang Anna',
    facebook_numeric_id = '100003754498710',
    profile_picture_url = 'https://graph.facebook.com/100003754498710/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trangsuri1108%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003754498710%'
    OR facebook_url LIKE '%profile.php?id=100003754498710%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Nho Pham (ID: 100003142167832)
UPDATE customers SET 
    name = 'Van Nho Pham',
    facebook_name = 'Van Nho Pham',
    facebook_numeric_id = '100003142167832',
    profile_picture_url = 'https://graph.facebook.com/100003142167832/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vannho.pham%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003142167832%'
    OR facebook_url LIKE '%profile.php?id=100003142167832%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hieu Nguyen Danh (ID: 100090410457592)
UPDATE customers SET 
    name = 'Hieu Nguyen Danh',
    facebook_name = 'Hieu Nguyen Danh',
    facebook_numeric_id = '100090410457592',
    profile_picture_url = 'https://graph.facebook.com/100090410457592/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100090410457592%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100090410457592%'
    OR facebook_url LIKE '%profile.php?id=100090410457592%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Thao Le (ID: 100042413718976)
UPDATE customers SET 
    name = 'Thu Thao Le',
    facebook_name = 'Thu Thao Le',
    facebook_numeric_id = '100042413718976',
    profile_picture_url = 'https://graph.facebook.com/100042413718976/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100042413718976%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100042413718976%'
    OR facebook_url LIKE '%profile.php?id=100042413718976%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hải Yến (ID: 100001716209148)
UPDATE customers SET 
    name = 'Hải Yến',
    facebook_name = 'Hải Yến',
    facebook_numeric_id = '100001716209148',
    profile_picture_url = 'https://graph.facebook.com/100001716209148/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%yenyen.cuttie%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001716209148%'
    OR facebook_url LIKE '%profile.php?id=100001716209148%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bich Thuy Do (ID: 100029802130995)
UPDATE customers SET 
    name = 'Bich Thuy Do',
    facebook_name = 'Bich Thuy Do',
    facebook_numeric_id = '100029802130995',
    profile_picture_url = 'https://graph.facebook.com/100029802130995/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bichthuy.do.96199%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100029802130995%'
    OR facebook_url LIKE '%profile.php?id=100029802130995%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Huong Ly Tran (ID: 100014244552616)
UPDATE customers SET 
    name = 'Thi Huong Ly Tran',
    facebook_name = 'Thi Huong Ly Tran',
    facebook_numeric_id = '100014244552616',
    profile_picture_url = 'https://graph.facebook.com/100014244552616/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thihuongly.tran.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100014244552616%'
    OR facebook_url LIKE '%profile.php?id=100014244552616%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Hoa Vu (ID: 100008222950075)
UPDATE customers SET 
    name = 'Thanh Hoa Vu',
    facebook_name = 'Thanh Hoa Vu',
    facebook_numeric_id = '100008222950075',
    profile_picture_url = 'https://graph.facebook.com/100008222950075/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008222950075%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008222950075%'
    OR facebook_url LIKE '%profile.php?id=100008222950075%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Julian Hồ (ID: 100023088041601)
UPDATE customers SET 
    name = 'Julian Hồ',
    facebook_name = 'Julian Hồ',
    facebook_numeric_id = '100023088041601',
    profile_picture_url = 'https://graph.facebook.com/100023088041601/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%xuannhat.ho.144%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023088041601%'
    OR facebook_url LIKE '%profile.php?id=100023088041601%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vy Nguyễn (ID: 100009643081708)
UPDATE customers SET 
    name = 'Vy Nguyễn',
    facebook_name = 'Vy Nguyễn',
    facebook_numeric_id = '100009643081708',
    profile_picture_url = 'https://graph.facebook.com/100009643081708/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lanh.tuyet.14473%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009643081708%'
    OR facebook_url LIKE '%profile.php?id=100009643081708%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đinh Bá Hùng (ID: 100026180827101)
UPDATE customers SET 
    name = 'Đinh Bá Hùng',
    facebook_name = 'Đinh Bá Hùng',
    facebook_numeric_id = '100026180827101',
    profile_picture_url = 'https://graph.facebook.com/100026180827101/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoang.nguyenhuu.3785%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100026180827101%'
    OR facebook_url LIKE '%profile.php?id=100026180827101%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khánh Nguyễn (ID: 100002430566045)
UPDATE customers SET 
    name = 'Khánh Nguyễn',
    facebook_name = 'Khánh Nguyễn',
    facebook_numeric_id = '100002430566045',
    profile_picture_url = 'https://graph.facebook.com/100002430566045/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%khanhchau.nguyen.58%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002430566045%'
    OR facebook_url LIKE '%profile.php?id=100002430566045%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dung Nguyen (ID: 100004370744229)
UPDATE customers SET 
    name = 'Dung Nguyen',
    facebook_name = 'Dung Nguyen',
    facebook_numeric_id = '100004370744229',
    profile_picture_url = 'https://graph.facebook.com/100004370744229/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004370744229%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004370744229%'
    OR facebook_url LIKE '%profile.php?id=100004370744229%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duong Thanh Ha (ID: 1213405941)
UPDATE customers SET 
    name = 'Duong Thanh Ha',
    facebook_name = 'Duong Thanh Ha',
    facebook_numeric_id = '1213405941',
    profile_picture_url = 'https://graph.facebook.com/1213405941/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%chocopiecz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1213405941%'
    OR facebook_url LIKE '%profile.php?id=1213405941%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Lee (ID: 100003934465306)
UPDATE customers SET 
    name = 'Trang Lee',
    facebook_name = 'Trang Lee',
    facebook_numeric_id = '100003934465306',
    profile_picture_url = 'https://graph.facebook.com/100003934465306/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tanatrang.lethi%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003934465306%'
    OR facebook_url LIKE '%profile.php?id=100003934465306%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quang Nghia (ID: 100000865717549)
UPDATE customers SET 
    name = 'Quang Nghia',
    facebook_name = 'Quang Nghia',
    facebook_numeric_id = '100000865717549',
    profile_picture_url = 'https://graph.facebook.com/100000865717549/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quangnghia.nguyen.33%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000865717549%'
    OR facebook_url LIKE '%profile.php?id=100000865717549%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ha Bui Ngoc (ID: 100004097807293)
UPDATE customers SET 
    name = 'Ha Bui Ngoc',
    facebook_name = 'Ha Bui Ngoc',
    facebook_numeric_id = '100004097807293',
    profile_picture_url = 'https://graph.facebook.com/100004097807293/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%habui.ngoc.568%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004097807293%'
    OR facebook_url LIKE '%profile.php?id=100004097807293%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Yến (ID: 100001336021174)
UPDATE customers SET 
    name = 'Hoàng Yến',
    facebook_name = 'Hoàng Yến',
    facebook_numeric_id = '100001336021174',
    profile_picture_url = 'https://graph.facebook.com/100001336021174/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tieu.yen.737%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001336021174%'
    OR facebook_url LIKE '%profile.php?id=100001336021174%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quyet Thien (ID: 100033435348525)
UPDATE customers SET 
    name = 'Quyet Thien',
    facebook_name = 'Quyet Thien',
    facebook_numeric_id = '100033435348525',
    profile_picture_url = 'https://graph.facebook.com/100033435348525/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quyet.thien.568%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100033435348525%'
    OR facebook_url LIKE '%profile.php?id=100033435348525%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nghiem Trong Phuoc (ID: 100000527681298)
UPDATE customers SET 
    name = 'Nghiem Trong Phuoc',
    facebook_name = 'Nghiem Trong Phuoc',
    facebook_numeric_id = '100000527681298',
    profile_picture_url = 'https://graph.facebook.com/100000527681298/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trongphuoc.nghiem%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000527681298%'
    OR facebook_url LIKE '%profile.php?id=100000527681298%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Linh Nguyễn (ID: 100010885754586)
UPDATE customers SET 
    name = 'Linh Nguyễn',
    facebook_name = 'Linh Nguyễn',
    facebook_numeric_id = '100010885754586',
    profile_picture_url = 'https://graph.facebook.com/100010885754586/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010885754586%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010885754586%'
    OR facebook_url LIKE '%profile.php?id=100010885754586%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tai Nguyen (ID: 100001942464058)
UPDATE customers SET 
    name = 'Tai Nguyen',
    facebook_name = 'Tai Nguyen',
    facebook_numeric_id = '100001942464058',
    profile_picture_url = 'https://graph.facebook.com/100001942464058/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tai.nguyen.334%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001942464058%'
    OR facebook_url LIKE '%profile.php?id=100001942464058%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Thu Huong Tran (ID: 100002142834045)
UPDATE customers SET 
    name = 'Thi Thu Huong Tran',
    facebook_name = 'Thi Thu Huong Tran',
    facebook_numeric_id = '100002142834045',
    profile_picture_url = 'https://graph.facebook.com/100002142834045/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thithuhuong.tran.12%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002142834045%'
    OR facebook_url LIKE '%profile.php?id=100002142834045%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Phương Anh (ID: 100009236577670)
UPDATE customers SET 
    name = 'Nguyễn Phương Anh',
    facebook_name = 'Nguyễn Phương Anh',
    facebook_numeric_id = '100009236577670',
    profile_picture_url = 'https://graph.facebook.com/100009236577670/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009236577670%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009236577670%'
    OR facebook_url LIKE '%profile.php?id=100009236577670%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Diệu An (ID: 100032484141275)
UPDATE customers SET 
    name = 'Diệu An',
    facebook_name = 'Diệu An',
    facebook_numeric_id = '100032484141275',
    profile_picture_url = 'https://graph.facebook.com/100032484141275/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%an.dieu.73700136%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100032484141275%'
    OR facebook_url LIKE '%profile.php?id=100032484141275%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tran To Linh (ID: 100002430866634)
UPDATE customers SET 
    name = 'Tran To Linh',
    facebook_name = 'Tran To Linh',
    facebook_numeric_id = '100002430866634',
    profile_picture_url = 'https://graph.facebook.com/100002430866634/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tran.tolinh.12%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002430866634%'
    OR facebook_url LIKE '%profile.php?id=100002430866634%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lenka Tran (ID: 100036957289987)
UPDATE customers SET 
    name = 'Lenka Tran',
    facebook_name = 'Lenka Tran',
    facebook_numeric_id = '100036957289987',
    profile_picture_url = 'https://graph.facebook.com/100036957289987/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lenka.tran.5437%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036957289987%'
    OR facebook_url LIKE '%profile.php?id=100036957289987%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dai Phat (ID: 100004711715600)
UPDATE customers SET 
    name = 'Dai Phat',
    facebook_name = 'Dai Phat',
    facebook_numeric_id = '100004711715600',
    profile_picture_url = 'https://graph.facebook.com/100004711715600/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dai.phat.50%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004711715600%'
    OR facebook_url LIKE '%profile.php?id=100004711715600%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thảo Nhi (ID: 100000048022195)
UPDATE customers SET 
    name = 'Thảo Nhi',
    facebook_name = 'Thảo Nhi',
    facebook_numeric_id = '100000048022195',
    profile_picture_url = 'https://graph.facebook.com/100000048022195/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%helen.liu.1297%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000048022195%'
    OR facebook_url LIKE '%profile.php?id=100000048022195%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huy Nguyen (ID: 100062909978947)
UPDATE customers SET 
    name = 'Huy Nguyen',
    facebook_name = 'Huy Nguyen',
    facebook_numeric_id = '100062909978947',
    profile_picture_url = 'https://graph.facebook.com/100062909978947/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100062909978947%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100062909978947%'
    OR facebook_url LIKE '%profile.php?id=100062909978947%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thai Son Nguyen (ID: 1706824165)
UPDATE customers SET 
    name = 'Thai Son Nguyen',
    facebook_name = 'Thai Son Nguyen',
    facebook_numeric_id = '1706824165',
    profile_picture_url = 'https://graph.facebook.com/1706824165/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thaisonn%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1706824165%'
    OR facebook_url LIKE '%profile.php?id=1706824165%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tam Nguyen (ID: 100001640628209)
UPDATE customers SET 
    name = 'Tam Nguyen',
    facebook_name = 'Tam Nguyen',
    facebook_numeric_id = '100001640628209',
    profile_picture_url = 'https://graph.facebook.com/100001640628209/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tam.loehr%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001640628209%'
    OR facebook_url LIKE '%profile.php?id=100001640628209%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quỳnh An (ID: 100032128130168)
UPDATE customers SET 
    name = 'Quỳnh An',
    facebook_name = 'Quỳnh An',
    facebook_numeric_id = '100032128130168',
    profile_picture_url = 'https://graph.facebook.com/100032128130168/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100032128130168%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100032128130168%'
    OR facebook_url LIKE '%profile.php?id=100032128130168%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nga Bằng (ID: 100005315259232)
UPDATE customers SET 
    name = 'Nga Bằng',
    facebook_name = 'Nga Bằng',
    facebook_numeric_id = '100005315259232',
    profile_picture_url = 'https://graph.facebook.com/100005315259232/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%keonhacaii011%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005315259232%'
    OR facebook_url LIKE '%profile.php?id=100005315259232%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hùng Nguyễn (ID: 100005112674379)
UPDATE customers SET 
    name = 'Hùng Nguyễn',
    facebook_name = 'Hùng Nguyễn',
    facebook_numeric_id = '100005112674379',
    profile_picture_url = 'https://graph.facebook.com/100005112674379/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hungnguyen.martin%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005112674379%'
    OR facebook_url LIKE '%profile.php?id=100005112674379%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hana Ho (ID: 100003092575785)
UPDATE customers SET 
    name = 'Hana Ho',
    facebook_name = 'Hana Ho',
    facebook_numeric_id = '100003092575785',
    profile_picture_url = 'https://graph.facebook.com/100003092575785/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hana.ho.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003092575785%'
    OR facebook_url LIKE '%profile.php?id=100003092575785%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hung Nguyen Huy (ID: 100002904941681)
UPDATE customers SET 
    name = 'Hung Nguyen Huy',
    facebook_name = 'Hung Nguyen Huy',
    facebook_numeric_id = '100002904941681',
    profile_picture_url = 'https://graph.facebook.com/100002904941681/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hung.nguyenhuy.79%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002904941681%'
    OR facebook_url LIKE '%profile.php?id=100002904941681%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngân Ngân (ID: 100055237072354)
UPDATE customers SET 
    name = 'Ngân Ngân',
    facebook_name = 'Ngân Ngân',
    facebook_numeric_id = '100055237072354',
    profile_picture_url = 'https://graph.facebook.com/100055237072354/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100055237072354%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100055237072354%'
    OR facebook_url LIKE '%profile.php?id=100055237072354%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dung Bùi (ID: 100001070123049)
UPDATE customers SET 
    name = 'Dung Bùi',
    facebook_name = 'Dung Bùi',
    facebook_numeric_id = '100001070123049',
    profile_picture_url = 'https://graph.facebook.com/100001070123049/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%buiphuongdung.106%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001070123049%'
    OR facebook_url LIKE '%profile.php?id=100001070123049%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Hien Nguyen (ID: 100003796845195)
UPDATE customers SET 
    name = 'Thu Hien Nguyen',
    facebook_name = 'Thu Hien Nguyen',
    facebook_numeric_id = '100003796845195',
    profile_picture_url = 'https://graph.facebook.com/100003796845195/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuhien.nguyen.186590%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003796845195%'
    OR facebook_url LIKE '%profile.php?id=100003796845195%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Ngọc Diệp (ID: 100079289828522)
UPDATE customers SET 
    name = 'Nguyễn Ngọc Diệp',
    facebook_name = 'Nguyễn Ngọc Diệp',
    facebook_numeric_id = '100079289828522',
    profile_picture_url = 'https://graph.facebook.com/100079289828522/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100079289828522%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100079289828522%'
    OR facebook_url LIKE '%profile.php?id=100079289828522%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vũ Hoàng (ID: 100077176114161)
UPDATE customers SET 
    name = 'Vũ Hoàng',
    facebook_name = 'Vũ Hoàng',
    facebook_numeric_id = '100077176114161',
    profile_picture_url = 'https://graph.facebook.com/100077176114161/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100077176114161%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100077176114161%'
    OR facebook_url LIKE '%profile.php?id=100077176114161%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hà Trung (ID: 100003087526954)
UPDATE customers SET 
    name = 'Hà Trung',
    facebook_name = 'Hà Trung',
    facebook_numeric_id = '100003087526954',
    profile_picture_url = 'https://graph.facebook.com/100003087526954/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%kietuyen.le%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003087526954%'
    OR facebook_url LIKE '%profile.php?id=100003087526954%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Vũ Huyền (ID: 100010896759621)
UPDATE customers SET 
    name = 'Thu Vũ Huyền',
    facebook_name = 'Thu Vũ Huyền',
    facebook_numeric_id = '100010896759621',
    profile_picture_url = 'https://graph.facebook.com/100010896759621/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyen.thuvu.545%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010896759621%'
    OR facebook_url LIKE '%profile.php?id=100010896759621%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lee Hải Yến (ID: 100000803017439)
UPDATE customers SET 
    name = 'Lee Hải Yến',
    facebook_name = 'Lee Hải Yến',
    facebook_numeric_id = '100000803017439',
    profile_picture_url = 'https://graph.facebook.com/100000803017439/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%haiyen.le.16%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000803017439%'
    OR facebook_url LIKE '%profile.php?id=100000803017439%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tước Nguyễn (ID: 100002495142278)
UPDATE customers SET 
    name = 'Tước Nguyễn',
    facebook_name = 'Tước Nguyễn',
    facebook_numeric_id = '100002495142278',
    profile_picture_url = 'https://graph.facebook.com/100002495142278/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuoc.nguyen.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002495142278%'
    OR facebook_url LIKE '%profile.php?id=100002495142278%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hưng Phan (ID: 100009909614173)
UPDATE customers SET 
    name = 'Hưng Phan',
    facebook_name = 'Hưng Phan',
    facebook_numeric_id = '100009909614173',
    profile_picture_url = 'https://graph.facebook.com/100009909614173/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009909614173%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009909614173%'
    OR facebook_url LIKE '%profile.php?id=100009909614173%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Quyên Trần Nguyễn (ID: 100007732783937)
UPDATE customers SET 
    name = 'Hoàng Quyên Trần Nguyễn',
    facebook_name = 'Hoàng Quyên Trần Nguyễn',
    facebook_numeric_id = '100007732783937',
    profile_picture_url = 'https://graph.facebook.com/100007732783937/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quan.trieu.7739%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007732783937%'
    OR facebook_url LIKE '%profile.php?id=100007732783937%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Mai Lê (ID: 100004713512842)
UPDATE customers SET 
    name = 'Thanh Mai Lê',
    facebook_name = 'Thanh Mai Lê',
    facebook_numeric_id = '100004713512842',
    profile_picture_url = 'https://graph.facebook.com/100004713512842/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanhmai.le.794%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004713512842%'
    OR facebook_url LIKE '%profile.php?id=100004713512842%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hong Duong (ID: 100026563731509)
UPDATE customers SET 
    name = 'Hong Duong',
    facebook_name = 'Hong Duong',
    facebook_numeric_id = '100026563731509',
    profile_picture_url = 'https://graph.facebook.com/100026563731509/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hong.duobg%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100026563731509%'
    OR facebook_url LIKE '%profile.php?id=100026563731509%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mi Lan (ID: 100066844591506)
UPDATE customers SET 
    name = 'Mi Lan',
    facebook_name = 'Mi Lan',
    facebook_numeric_id = '100066844591506',
    profile_picture_url = 'https://graph.facebook.com/100066844591506/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100066844591506%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100066844591506%'
    OR facebook_url LIKE '%profile.php?id=100066844591506%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyen Nguyen (ID: 100036428473582)
UPDATE customers SET 
    name = 'Huyen Nguyen',
    facebook_name = 'Huyen Nguyen',
    facebook_numeric_id = '100036428473582',
    profile_picture_url = 'https://graph.facebook.com/100036428473582/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036428473582%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036428473582%'
    OR facebook_url LIKE '%profile.php?id=100036428473582%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa Khuong (ID: 1524262434)
UPDATE customers SET 
    name = 'Hoa Khuong',
    facebook_name = 'Hoa Khuong',
    facebook_numeric_id = '1524262434',
    profile_picture_url = 'https://graph.facebook.com/1524262434/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%le.k.hoa.18%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1524262434%'
    OR facebook_url LIKE '%profile.php?id=1524262434%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuý Bùi (ID: 100044526017899)
UPDATE customers SET 
    name = 'Thuý Bùi',
    facebook_name = 'Thuý Bùi',
    facebook_numeric_id = '100044526017899',
    profile_picture_url = 'https://graph.facebook.com/100044526017899/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044526017899%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044526017899%'
    OR facebook_url LIKE '%profile.php?id=100044526017899%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Thi Phuong Anh (ID: 100012698526648)
UPDATE customers SET 
    name = 'Nguyen Thi Phuong Anh',
    facebook_name = 'Nguyen Thi Phuong Anh',
    facebook_numeric_id = '100012698526648',
    profile_picture_url = 'https://graph.facebook.com/100012698526648/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012698526648%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012698526648%'
    OR facebook_url LIKE '%profile.php?id=100012698526648%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hang Vu (ID: 100003596275435)
UPDATE customers SET 
    name = 'Hang Vu',
    facebook_name = 'Hang Vu',
    facebook_numeric_id = '100003596275435',
    profile_picture_url = 'https://graph.facebook.com/100003596275435/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hang.vu.5811%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003596275435%'
    OR facebook_url LIKE '%profile.php?id=100003596275435%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Doan Le (ID: 100009416231418)
UPDATE customers SET 
    name = 'Van Doan Le',
    facebook_name = 'Van Doan Le',
    facebook_numeric_id = '100009416231418',
    profile_picture_url = 'https://graph.facebook.com/100009416231418/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vandoan.le.792%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009416231418%'
    OR facebook_url LIKE '%profile.php?id=100009416231418%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lan Pham (ID: 100000752596821)
UPDATE customers SET 
    name = 'Lan Pham',
    facebook_name = 'Lan Pham',
    facebook_numeric_id = '100000752596821',
    profile_picture_url = 'https://graph.facebook.com/100000752596821/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lananh.pham%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000752596821%'
    OR facebook_url LIKE '%profile.php?id=100000752596821%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Hương (ID: 100026696887555)
UPDATE customers SET 
    name = 'Thu Hương',
    facebook_name = 'Thu Hương',
    facebook_numeric_id = '100026696887555',
    profile_picture_url = 'https://graph.facebook.com/100026696887555/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huonggminn2503%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100026696887555%'
    OR facebook_url LIKE '%profile.php?id=100026696887555%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thilua Nguyen (ID: 100070035323681)
UPDATE customers SET 
    name = 'Thilua Nguyen',
    facebook_name = 'Thilua Nguyen',
    facebook_numeric_id = '100070035323681',
    profile_picture_url = 'https://graph.facebook.com/100070035323681/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100070035323681%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100070035323681%'
    OR facebook_url LIKE '%profile.php?id=100070035323681%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tony Pham (ID: 100000904616092)
UPDATE customers SET 
    name = 'Tony Pham',
    facebook_name = 'Tony Pham',
    facebook_numeric_id = '100000904616092',
    profile_picture_url = 'https://graph.facebook.com/100000904616092/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%pham.h.phuong.14%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000904616092%'
    OR facebook_url LIKE '%profile.php?id=100000904616092%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huong Ha (ID: 100012193908036)
UPDATE customers SET 
    name = 'Huong Ha',
    facebook_name = 'Huong Ha',
    facebook_numeric_id = '100012193908036',
    profile_picture_url = 'https://graph.facebook.com/100012193908036/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012193908036%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100012193908036%'
    OR facebook_url LIKE '%profile.php?id=100012193908036%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Điệp (ID: 100005287775355)
UPDATE customers SET 
    name = 'Nguyễn Điệp',
    facebook_name = 'Nguyễn Điệp',
    facebook_numeric_id = '100005287775355',
    profile_picture_url = 'https://graph.facebook.com/100005287775355/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%noidaulahp87%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005287775355%'
    OR facebook_url LIKE '%profile.php?id=100005287775355%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kiddy Nguyễn (ID: 100000296631556)
UPDATE customers SET 
    name = 'Kiddy Nguyễn',
    facebook_name = 'Kiddy Nguyễn',
    facebook_numeric_id = '100000296631556',
    profile_picture_url = 'https://graph.facebook.com/100000296631556/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%kiddy.nguyen.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000296631556%'
    OR facebook_url LIKE '%profile.php?id=100000296631556%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Ngọc Hùng (ID: 100000484298368)
UPDATE customers SET 
    name = 'Nguyễn Ngọc Hùng',
    facebook_name = 'Nguyễn Ngọc Hùng',
    facebook_numeric_id = '100000484298368',
    profile_picture_url = 'https://graph.facebook.com/100000484298368/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hung.map.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000484298368%'
    OR facebook_url LIKE '%profile.php?id=100000484298368%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyen Trang Cao (ID: 100000676982277)
UPDATE customers SET 
    name = 'Huyen Trang Cao',
    facebook_name = 'Huyen Trang Cao',
    facebook_numeric_id = '100000676982277',
    profile_picture_url = 'https://graph.facebook.com/100000676982277/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyentrang.cao.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000676982277%'
    OR facebook_url LIKE '%profile.php?id=100000676982277%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Tâm (ID: 100009680539536)
UPDATE customers SET 
    name = 'Phạm Tâm',
    facebook_name = 'Phạm Tâm',
    facebook_numeric_id = '100009680539536',
    profile_picture_url = 'https://graph.facebook.com/100009680539536/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%van.tam.7583992%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009680539536%'
    OR facebook_url LIKE '%profile.php?id=100009680539536%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- HuyHoang Dao (ID: 100000628590573)
UPDATE customers SET 
    name = 'HuyHoang Dao',
    facebook_name = 'HuyHoang Dao',
    facebook_numeric_id = '100000628590573',
    profile_picture_url = 'https://graph.facebook.com/100000628590573/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyhoang.dao.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000628590573%'
    OR facebook_url LIKE '%profile.php?id=100000628590573%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ánh Dương (ID: 100008204432472)
UPDATE customers SET 
    name = 'Ánh Dương',
    facebook_name = 'Ánh Dương',
    facebook_numeric_id = '100008204432472',
    profile_picture_url = 'https://graph.facebook.com/100008204432472/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%anhduong.truong.39%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008204432472%'
    OR facebook_url LIKE '%profile.php?id=100008204432472%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hồng Ngọc (ID: 100008174531949)
UPDATE customers SET 
    name = 'Hồng Ngọc',
    facebook_name = 'Hồng Ngọc',
    facebook_numeric_id = '100008174531949',
    profile_picture_url = 'https://graph.facebook.com/100008174531949/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008174531949%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008174531949%'
    OR facebook_url LIKE '%profile.php?id=100008174531949%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Nguyen (ID: 100001073667232)
UPDATE customers SET 
    name = 'Thanh Nguyen',
    facebook_name = 'Thanh Nguyen',
    facebook_numeric_id = '100001073667232',
    profile_picture_url = 'https://graph.facebook.com/100001073667232/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tin246p%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001073667232%'
    OR facebook_url LIKE '%profile.php?id=100001073667232%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Tăng (ID: 100054504368953)
UPDATE customers SET 
    name = 'Nguyễn Tăng',
    facebook_name = 'Nguyễn Tăng',
    facebook_numeric_id = '100054504368953',
    profile_picture_url = 'https://graph.facebook.com/100054504368953/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thien.roan.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100054504368953%'
    OR facebook_url LIKE '%profile.php?id=100054504368953%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Vu Ha (ID: 100008635451652)
UPDATE customers SET 
    name = 'Trang Vu Ha',
    facebook_name = 'Trang Vu Ha',
    facebook_numeric_id = '100008635451652',
    profile_picture_url = 'https://graph.facebook.com/100008635451652/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008635451652%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008635451652%'
    OR facebook_url LIKE '%profile.php?id=100008635451652%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thùy Ly Đặng (ID: 100002327299649)
UPDATE customers SET 
    name = 'Thùy Ly Đặng',
    facebook_name = 'Thùy Ly Đặng',
    facebook_numeric_id = '100002327299649',
    profile_picture_url = 'https://graph.facebook.com/100002327299649/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuyly.dang%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002327299649%'
    OR facebook_url LIKE '%profile.php?id=100002327299649%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hang Nguy (ID: 1195836362)
UPDATE customers SET 
    name = 'Hang Nguy',
    facebook_name = 'Hang Nguy',
    facebook_numeric_id = '1195836362',
    profile_picture_url = 'https://graph.facebook.com/1195836362/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lehang.nguyen.16%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1195836362%'
    OR facebook_url LIKE '%profile.php?id=1195836362%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thao Phan (ID: 100047747050853)
UPDATE customers SET 
    name = 'Thao Phan',
    facebook_name = 'Thao Phan',
    facebook_numeric_id = '100047747050853',
    profile_picture_url = 'https://graph.facebook.com/100047747050853/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100047747050853%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100047747050853%'
    OR facebook_url LIKE '%profile.php?id=100047747050853%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Ha Nguyen (ID: 100006076230170)
UPDATE customers SET 
    name = 'Thu Ha Nguyen',
    facebook_name = 'Thu Ha Nguyen',
    facebook_numeric_id = '100006076230170',
    profile_picture_url = 'https://graph.facebook.com/100006076230170/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006076230170%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006076230170%'
    OR facebook_url LIKE '%profile.php?id=100006076230170%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Việt Phan (ID: 100005574191066)
UPDATE customers SET 
    name = 'Việt Phan',
    facebook_name = 'Việt Phan',
    facebook_numeric_id = '100005574191066',
    profile_picture_url = 'https://graph.facebook.com/100005574191066/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005574191066%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005574191066%'
    OR facebook_url LIKE '%profile.php?id=100005574191066%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Hồng Nhung (ID: 100042210364171)
UPDATE customers SET 
    name = 'Nguyễn Hồng Nhung',
    facebook_name = 'Nguyễn Hồng Nhung',
    facebook_numeric_id = '100042210364171',
    profile_picture_url = 'https://graph.facebook.com/100042210364171/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%mangonhungcz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100042210364171%'
    OR facebook_url LIKE '%profile.php?id=100042210364171%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Anh La (ID: 100006506679561)
UPDATE customers SET 
    name = 'Thuy Anh La',
    facebook_name = 'Thuy Anh La',
    facebook_numeric_id = '100006506679561',
    profile_picture_url = 'https://graph.facebook.com/100006506679561/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuyanh.la.96%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006506679561%'
    OR facebook_url LIKE '%profile.php?id=100006506679561%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cơn Mưa Mùa Đông (ID: 100007042722485)
UPDATE customers SET 
    name = 'Cơn Mưa Mùa Đông',
    facebook_name = 'Cơn Mưa Mùa Đông',
    facebook_numeric_id = '100007042722485',
    profile_picture_url = 'https://graph.facebook.com/100007042722485/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%luytinh.canh%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007042722485%'
    OR facebook_url LIKE '%profile.php?id=100007042722485%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Rose Hoa (ID: 100000742510478)
UPDATE customers SET 
    name = 'Rose Hoa',
    facebook_name = 'Rose Hoa',
    facebook_numeric_id = '100000742510478',
    profile_picture_url = 'https://graph.facebook.com/100000742510478/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%rose.hoa%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000742510478%'
    OR facebook_url LIKE '%profile.php?id=100000742510478%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyet Anh (ID: 100004805850696)
UPDATE customers SET 
    name = 'Nguyet Anh',
    facebook_name = 'Nguyet Anh',
    facebook_numeric_id = '100004805850696',
    profile_picture_url = 'https://graph.facebook.com/100004805850696/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004805850696%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004805850696%'
    OR facebook_url LIKE '%profile.php?id=100004805850696%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Karin Do (ID: 100004774269664)
UPDATE customers SET 
    name = 'Karin Do',
    facebook_name = 'Karin Do',
    facebook_numeric_id = '100004774269664',
    profile_picture_url = 'https://graph.facebook.com/100004774269664/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%karin.do.75%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004774269664%'
    OR facebook_url LIKE '%profile.php?id=100004774269664%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ho Thi Thanh Thuy (ID: 100059448920454)
UPDATE customers SET 
    name = 'Ho Thi Thanh Thuy',
    facebook_name = 'Ho Thi Thanh Thuy',
    facebook_numeric_id = '100059448920454',
    profile_picture_url = 'https://graph.facebook.com/100059448920454/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ho.thithanhthuy.545%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100059448920454%'
    OR facebook_url LIKE '%profile.php?id=100059448920454%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hong Nhung Vu (ID: 100001778799878)
UPDATE customers SET 
    name = 'Hong Nhung Vu',
    facebook_name = 'Hong Nhung Vu',
    facebook_numeric_id = '100001778799878',
    profile_picture_url = 'https://graph.facebook.com/100001778799878/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hongnhung.vu2%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001778799878%'
    OR facebook_url LIKE '%profile.php?id=100001778799878%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Quynh Anh (ID: 100002202771825)
UPDATE customers SET 
    name = 'Le Quynh Anh',
    facebook_name = 'Le Quynh Anh',
    facebook_numeric_id = '100002202771825',
    profile_picture_url = 'https://graph.facebook.com/100002202771825/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%breda.opava.orchidnais%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002202771825%'
    OR facebook_url LIKE '%profile.php?id=100002202771825%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Chu Duc Hieu (ID: 1255304102)
UPDATE customers SET 
    name = 'Chu Duc Hieu',
    facebook_name = 'Chu Duc Hieu',
    facebook_numeric_id = '1255304102',
    profile_picture_url = 'https://graph.facebook.com/1255304102/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%kaffeden%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1255304102%'
    OR facebook_url LIKE '%profile.php?id=1255304102%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Emilie Nguyễn (ID: 100007179161392)
UPDATE customers SET 
    name = 'Emilie Nguyễn',
    facebook_name = 'Emilie Nguyễn',
    facebook_numeric_id = '100007179161392',
    profile_picture_url = 'https://graph.facebook.com/100007179161392/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tieuthu.codon.140%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007179161392%'
    OR facebook_url LIKE '%profile.php?id=100007179161392%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyen Tran (ID: 100007008850627)
UPDATE customers SET 
    name = 'Huyen Tran',
    facebook_name = 'Huyen Tran',
    facebook_numeric_id = '100007008850627',
    profile_picture_url = 'https://graph.facebook.com/100007008850627/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007008850627%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007008850627%'
    OR facebook_url LIKE '%profile.php?id=100007008850627%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Lê (ID: 100003193893501)
UPDATE customers SET 
    name = 'Thanh Lê',
    facebook_name = 'Thanh Lê',
    facebook_numeric_id = '100003193893501',
    profile_picture_url = 'https://graph.facebook.com/100003193893501/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nu.ny.144%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003193893501%'
    OR facebook_url LIKE '%profile.php?id=100003193893501%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Zen Hoang (ID: 100000366152610)
UPDATE customers SET 
    name = 'Zen Hoang',
    facebook_name = 'Zen Hoang',
    facebook_numeric_id = '100000366152610',
    profile_picture_url = 'https://graph.facebook.com/100000366152610/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%zen.hoang.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000366152610%'
    OR facebook_url LIKE '%profile.php?id=100000366152610%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Tran Xuan (ID: 100003249787141)
UPDATE customers SET 
    name = 'Thanh Tran Xuan',
    facebook_name = 'Thanh Tran Xuan',
    facebook_numeric_id = '100003249787141',
    profile_picture_url = 'https://graph.facebook.com/100003249787141/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanh.tranxuan.39%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003249787141%'
    OR facebook_url LIKE '%profile.php?id=100003249787141%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duc Nguyen Van (ID: 100005840196255)
UPDATE customers SET 
    name = 'Duc Nguyen Van',
    facebook_name = 'Duc Nguyen Van',
    facebook_numeric_id = '100005840196255',
    profile_picture_url = 'https://graph.facebook.com/100005840196255/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%reli.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005840196255%'
    OR facebook_url LIKE '%profile.php?id=100005840196255%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phan Nguyễn (ID: 100004074334356)
UPDATE customers SET 
    name = 'Phan Nguyễn',
    facebook_name = 'Phan Nguyễn',
    facebook_numeric_id = '100004074334356',
    profile_picture_url = 'https://graph.facebook.com/100004074334356/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phan0105%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004074334356%'
    OR facebook_url LIKE '%profile.php?id=100004074334356%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thoại Caroline (ID: 100004534205672)
UPDATE customers SET 
    name = 'Thoại Caroline',
    facebook_name = 'Thoại Caroline',
    facebook_numeric_id = '100004534205672',
    profile_picture_url = 'https://graph.facebook.com/100004534205672/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thoai.nguyen.547389%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004534205672%'
    OR facebook_url LIKE '%profile.php?id=100004534205672%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hương Trần (ID: 100000278150180)
UPDATE customers SET 
    name = 'Hương Trần',
    facebook_name = 'Hương Trần',
    facebook_numeric_id = '100000278150180',
    profile_picture_url = 'https://graph.facebook.com/100000278150180/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tranhuong.tranhuong.50%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000278150180%'
    OR facebook_url LIKE '%profile.php?id=100000278150180%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Cửa Phật Hoa Rơi (ID: 100003976101040)
UPDATE customers SET 
    name = 'Cửa Phật Hoa Rơi',
    facebook_name = 'Cửa Phật Hoa Rơi',
    facebook_numeric_id = '100003976101040',
    profile_picture_url = 'https://graph.facebook.com/100003976101040/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003976101040%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003976101040%'
    OR facebook_url LIKE '%profile.php?id=100003976101040%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nấm Nguyễn (ID: 100006467414394)
UPDATE customers SET 
    name = 'Nấm Nguyễn',
    facebook_name = 'Nấm Nguyễn',
    facebook_numeric_id = '100006467414394',
    profile_picture_url = 'https://graph.facebook.com/100006467414394/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006467414394%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006467414394%'
    OR facebook_url LIKE '%profile.php?id=100006467414394%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bùi Quang Vinh (ID: 100010289921949)
UPDATE customers SET 
    name = 'Bùi Quang Vinh',
    facebook_name = 'Bùi Quang Vinh',
    facebook_numeric_id = '100010289921949',
    profile_picture_url = 'https://graph.facebook.com/100010289921949/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quangvinh.bui.7587%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010289921949%'
    OR facebook_url LIKE '%profile.php?id=100010289921949%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tran Thi Thuy (ID: 797837069)
UPDATE customers SET 
    name = 'Tran Thi Thuy',
    facebook_name = 'Tran Thi Thuy',
    facebook_numeric_id = '797837069',
    profile_picture_url = 'https://graph.facebook.com/797837069/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuy.tanthi%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%797837069%'
    OR facebook_url LIKE '%profile.php?id=797837069%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dana Nguyen (ID: 100077183724250)
UPDATE customers SET 
    name = 'Dana Nguyen',
    facebook_name = 'Dana Nguyen',
    facebook_numeric_id = '100077183724250',
    profile_picture_url = 'https://graph.facebook.com/100077183724250/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100077183724250%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100077183724250%'
    OR facebook_url LIKE '%profile.php?id=100077183724250%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đỗ Thang (ID: 100038452002886)
UPDATE customers SET 
    name = 'Đỗ Thang',
    facebook_name = 'Đỗ Thang',
    facebook_numeric_id = '100038452002886',
    profile_picture_url = 'https://graph.facebook.com/100038452002886/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100038452002886%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100038452002886%'
    OR facebook_url LIKE '%profile.php?id=100038452002886%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Gia Hân (ID: 100001215417206)
UPDATE customers SET 
    name = 'Gia Hân',
    facebook_name = 'Gia Hân',
    facebook_numeric_id = '100001215417206',
    profile_picture_url = 'https://graph.facebook.com/100001215417206/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vuong.lao%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001215417206%'
    OR facebook_url LIKE '%profile.php?id=100001215417206%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hải Yến (ID: 100010497732399)
UPDATE customers SET 
    name = 'Hải Yến',
    facebook_name = 'Hải Yến',
    facebook_numeric_id = '100010497732399',
    profile_picture_url = 'https://graph.facebook.com/100010497732399/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%haiyen.97.258%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010497732399%'
    OR facebook_url LIKE '%profile.php?id=100010497732399%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Hong Nhung (ID: 593869332)
UPDATE customers SET 
    name = 'Le Hong Nhung',
    facebook_name = 'Le Hong Nhung',
    facebook_numeric_id = '593869332',
    profile_picture_url = 'https://graph.facebook.com/593869332/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%le.hongnhung.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%593869332%'
    OR facebook_url LIKE '%profile.php?id=593869332%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Loan Trần (ID: 100017641515402)
UPDATE customers SET 
    name = 'Loan Trần',
    facebook_name = 'Loan Trần',
    facebook_numeric_id = '100017641515402',
    profile_picture_url = 'https://graph.facebook.com/100017641515402/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100017641515402%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100017641515402%'
    OR facebook_url LIKE '%profile.php?id=100017641515402%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Kim Ngân (ID: 100023835293764)
UPDATE customers SET 
    name = 'Nguyễn Kim Ngân',
    facebook_name = 'Nguyễn Kim Ngân',
    facebook_numeric_id = '100023835293764',
    profile_picture_url = 'https://graph.facebook.com/100023835293764/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023835293764%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023835293764%'
    OR facebook_url LIKE '%profile.php?id=100023835293764%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hung Le (ID: 100006594812524)
UPDATE customers SET 
    name = 'Hung Le',
    facebook_name = 'Hung Le',
    facebook_numeric_id = '100006594812524',
    profile_picture_url = 'https://graph.facebook.com/100006594812524/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006594812524%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006594812524%'
    OR facebook_url LIKE '%profile.php?id=100006594812524%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kinh Doanh (ID: 100009681859897)
UPDATE customers SET 
    name = 'Kinh Doanh',
    facebook_name = 'Kinh Doanh',
    facebook_numeric_id = '100009681859897',
    profile_picture_url = 'https://graph.facebook.com/100009681859897/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%kinh.doanh.18488%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009681859897%'
    OR facebook_url LIKE '%profile.php?id=100009681859897%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoang Giap Mai (ID: 100000226673488)
UPDATE customers SET 
    name = 'Hoang Giap Mai',
    facebook_name = 'Hoang Giap Mai',
    facebook_numeric_id = '100000226673488',
    profile_picture_url = 'https://graph.facebook.com/100000226673488/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoanggiap.mai%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000226673488%'
    OR facebook_url LIKE '%profile.php?id=100000226673488%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bùi Thị Băng (ID: 100024703690866)
UPDATE customers SET 
    name = 'Bùi Thị Băng',
    facebook_name = 'Bùi Thị Băng',
    facebook_numeric_id = '100024703690866',
    profile_picture_url = 'https://graph.facebook.com/100024703690866/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bang.buithi.359%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024703690866%'
    OR facebook_url LIKE '%profile.php?id=100024703690866%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Xoáy (ID: 100004799704919)
UPDATE customers SET 
    name = 'Trần Xoáy',
    facebook_name = 'Trần Xoáy',
    facebook_numeric_id = '100004799704919',
    profile_picture_url = 'https://graph.facebook.com/100004799704919/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tranvantrung88%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004799704919%'
    OR facebook_url LIKE '%profile.php?id=100004799704919%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Cuong Quan Nguyen (ID: 100001983285430)
UPDATE customers SET 
    name = 'Trang Cuong Quan Nguyen',
    facebook_name = 'Trang Cuong Quan Nguyen',
    facebook_numeric_id = '100001983285430',
    profile_picture_url = 'https://graph.facebook.com/100001983285430/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trangcuongquan.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001983285430%'
    OR facebook_url LIKE '%profile.php?id=100001983285430%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Dai Tran Tu (ID: 100002498442390)
UPDATE customers SET 
    name = 'Dai Tran Tu',
    facebook_name = 'Dai Tran Tu',
    facebook_numeric_id = '100002498442390',
    profile_picture_url = 'https://graph.facebook.com/100002498442390/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%dai.trantu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002498442390%'
    OR facebook_url LIKE '%profile.php?id=100002498442390%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hong Nguyen (ID: 100078095505715)
UPDATE customers SET 
    name = 'Hong Nguyen',
    facebook_name = 'Hong Nguyen',
    facebook_numeric_id = '100078095505715',
    profile_picture_url = 'https://graph.facebook.com/100078095505715/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100078095505715%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100078095505715%'
    OR facebook_url LIKE '%profile.php?id=100078095505715%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đỗ Trang Quỳnh Anh (ID: 100049248722440)
UPDATE customers SET 
    name = 'Đỗ Trang Quỳnh Anh',
    facebook_name = 'Đỗ Trang Quỳnh Anh',
    facebook_numeric_id = '100049248722440',
    profile_picture_url = 'https://graph.facebook.com/100049248722440/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%trangquynhanh.do%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100049248722440%'
    OR facebook_url LIKE '%profile.php?id=100049248722440%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tranova Mai Lan (ID: 100007674496621)
UPDATE customers SET 
    name = 'Tranova Mai Lan',
    facebook_name = 'Tranova Mai Lan',
    facebook_numeric_id = '100007674496621',
    profile_picture_url = 'https://graph.facebook.com/100007674496621/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%mailantranova%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007674496621%'
    OR facebook_url LIKE '%profile.php?id=100007674496621%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hao Tam Nguyen (ID: 100000311766283)
UPDATE customers SET 
    name = 'Hao Tam Nguyen',
    facebook_name = 'Hao Tam Nguyen',
    facebook_numeric_id = '100000311766283',
    profile_picture_url = 'https://graph.facebook.com/100000311766283/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%haotam.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000311766283%'
    OR facebook_url LIKE '%profile.php?id=100000311766283%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phương Vũ (ID: 100028584159747)
UPDATE customers SET 
    name = 'Phương Vũ',
    facebook_name = 'Phương Vũ',
    facebook_numeric_id = '100028584159747',
    profile_picture_url = 'https://graph.facebook.com/100028584159747/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028584159747%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028584159747%'
    OR facebook_url LIKE '%profile.php?id=100028584159747%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nhai Tran (ID: 100005147462262)
UPDATE customers SET 
    name = 'Nhai Tran',
    facebook_name = 'Nhai Tran',
    facebook_numeric_id = '100005147462262',
    profile_picture_url = 'https://graph.facebook.com/100005147462262/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%baotram.mai.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005147462262%'
    OR facebook_url LIKE '%profile.php?id=100005147462262%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Người Nghệ An (ID: 100052960216524)
UPDATE customers SET 
    name = 'Người Nghệ An',
    facebook_name = 'Người Nghệ An',
    facebook_numeric_id = '100052960216524',
    profile_picture_url = 'https://graph.facebook.com/100052960216524/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100052960216524%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100052960216524%'
    OR facebook_url LIKE '%profile.php?id=100052960216524%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duy Thanh Pham (ID: 100028527998267)
UPDATE customers SET 
    name = 'Duy Thanh Pham',
    facebook_name = 'Duy Thanh Pham',
    facebook_numeric_id = '100028527998267',
    profile_picture_url = 'https://graph.facebook.com/100028527998267/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%duythanh.pham.3956690%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028527998267%'
    OR facebook_url LIKE '%profile.php?id=100028527998267%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Chu (ID: 100003155214600)
UPDATE customers SET 
    name = 'Thuy Chu',
    facebook_name = 'Thuy Chu',
    facebook_numeric_id = '100003155214600',
    profile_picture_url = 'https://graph.facebook.com/100003155214600/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuy.chu.140%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003155214600%'
    OR facebook_url LIKE '%profile.php?id=100003155214600%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Huong (ID: 100044864689137)
UPDATE customers SET 
    name = 'Thu Huong',
    facebook_name = 'Thu Huong',
    facebook_numeric_id = '100044864689137',
    profile_picture_url = 'https://graph.facebook.com/100044864689137/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044864689137%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100044864689137%'
    OR facebook_url LIKE '%profile.php?id=100044864689137%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyền Trâm (ID: 100009518691119)
UPDATE customers SET 
    name = 'Huyền Trâm',
    facebook_name = 'Huyền Trâm',
    facebook_numeric_id = '100009518691119',
    profile_picture_url = 'https://graph.facebook.com/100009518691119/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyen.tram.752861%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009518691119%'
    OR facebook_url LIKE '%profile.php?id=100009518691119%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Monika Huynh (ID: 100003070553744)
UPDATE customers SET 
    name = 'Monika Huynh',
    facebook_name = 'Monika Huynh',
    facebook_numeric_id = '100003070553744',
    profile_picture_url = 'https://graph.facebook.com/100003070553744/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%maithao.huynh.56%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003070553744%'
    OR facebook_url LIKE '%profile.php?id=100003070553744%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Hana (ID: 100002875761061)
UPDATE customers SET 
    name = 'Nguyen Hana',
    facebook_name = 'Nguyen Hana',
    facebook_numeric_id = '100002875761061',
    profile_picture_url = 'https://graph.facebook.com/100002875761061/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quynhhuong.nguyen.127%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002875761061%'
    OR facebook_url LIKE '%profile.php?id=100002875761061%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Valentina Pham (ID: 100001351852704)
UPDATE customers SET 
    name = 'Valentina Pham',
    facebook_name = 'Valentina Pham',
    facebook_numeric_id = '100001351852704',
    profile_picture_url = 'https://graph.facebook.com/100001351852704/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%valentina.pham.52%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001351852704%'
    OR facebook_url LIKE '%profile.php?id=100001351852704%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Trang (ID: 100006513523338)
UPDATE customers SET 
    name = 'Nguyễn Trang',
    facebook_name = 'Nguyễn Trang',
    facebook_numeric_id = '100006513523338',
    profile_picture_url = 'https://graph.facebook.com/100006513523338/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006513523338%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006513523338%'
    OR facebook_url LIKE '%profile.php?id=100006513523338%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngoc Mai (ID: 100030572047797)
UPDATE customers SET 
    name = 'Ngoc Mai',
    facebook_name = 'Ngoc Mai',
    facebook_numeric_id = '100030572047797',
    profile_picture_url = 'https://graph.facebook.com/100030572047797/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%mai.thiminhngoc.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100030572047797%'
    OR facebook_url LIKE '%profile.php?id=100030572047797%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Canh Tran (ID: 100004397374623)
UPDATE customers SET 
    name = 'Canh Tran',
    facebook_name = 'Canh Tran',
    facebook_numeric_id = '100004397374623',
    profile_picture_url = 'https://graph.facebook.com/100004397374623/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Thasan.135%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004397374623%'
    OR facebook_url LIKE '%profile.php?id=100004397374623%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Fotostudio Maianh (ID: 100004797283560)
UPDATE customers SET 
    name = 'Fotostudio Maianh',
    facebook_name = 'Fotostudio Maianh',
    facebook_numeric_id = '100004797283560',
    profile_picture_url = 'https://graph.facebook.com/100004797283560/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%fotostudio.maianh.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004797283560%'
    OR facebook_url LIKE '%profile.php?id=100004797283560%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Quỳnh Trang (ID: 100011119712525)
UPDATE customers SET 
    name = 'Nguyễn Quỳnh Trang',
    facebook_name = 'Nguyễn Quỳnh Trang',
    facebook_numeric_id = '100011119712525',
    profile_picture_url = 'https://graph.facebook.com/100011119712525/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011119712525%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100011119712525%'
    OR facebook_url LIKE '%profile.php?id=100011119712525%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- David Nguyen (ID: 100010954996551)
UPDATE customers SET 
    name = 'David Nguyen',
    facebook_name = 'David Nguyen',
    facebook_numeric_id = '100010954996551',
    profile_picture_url = 'https://graph.facebook.com/100010954996551/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010954996551%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010954996551%'
    OR facebook_url LIKE '%profile.php?id=100010954996551%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Davie Lam (ID: 1743413442)
UPDATE customers SET 
    name = 'Davie Lam',
    facebook_name = 'Davie Lam',
    facebook_numeric_id = '1743413442',
    profile_picture_url = 'https://graph.facebook.com/1743413442/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%itzdavie%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1743413442%'
    OR facebook_url LIKE '%profile.php?id=1743413442%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vương Thương (ID: 100004879779346)
UPDATE customers SET 
    name = 'Vương Thương',
    facebook_name = 'Vương Thương',
    facebook_numeric_id = '100004879779346',
    profile_picture_url = 'https://graph.facebook.com/100004879779346/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vuongthi.thuong.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004879779346%'
    OR facebook_url LIKE '%profile.php?id=100004879779346%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Myngoc Machieu (ID: 100000607908492)
UPDATE customers SET 
    name = 'Myngoc Machieu',
    facebook_name = 'Myngoc Machieu',
    facebook_numeric_id = '100000607908492',
    profile_picture_url = 'https://graph.facebook.com/100000607908492/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%myngoc.machieu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000607908492%'
    OR facebook_url LIKE '%profile.php?id=100000607908492%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mac Tran (ID: 100038106310195)
UPDATE customers SET 
    name = 'Mac Tran',
    facebook_name = 'Mac Tran',
    facebook_numeric_id = '100038106310195',
    profile_picture_url = 'https://graph.facebook.com/100038106310195/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100038106310195%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100038106310195%'
    OR facebook_url LIKE '%profile.php?id=100038106310195%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Hoa Nguyen-Bilan (ID: 100003834789908)
UPDATE customers SET 
    name = 'Minh Hoa Nguyen-Bilan',
    facebook_name = 'Minh Hoa Nguyen-Bilan',
    facebook_numeric_id = '100003834789908',
    profile_picture_url = 'https://graph.facebook.com/100003834789908/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hoa.nguyenminh.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003834789908%'
    OR facebook_url LIKE '%profile.php?id=100003834789908%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Kim Hien Tran (ID: 100003022444506)
UPDATE customers SET 
    name = 'Thi Kim Hien Tran',
    facebook_name = 'Thi Kim Hien Tran',
    facebook_numeric_id = '100003022444506',
    profile_picture_url = 'https://graph.facebook.com/100003022444506/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%co.hoa.31%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003022444506%'
    OR facebook_url LIKE '%profile.php?id=100003022444506%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Mai Hien (ID: 100002104302984)
UPDATE customers SET 
    name = 'Le Mai Hien',
    facebook_name = 'Le Mai Hien',
    facebook_numeric_id = '100002104302984',
    profile_picture_url = 'https://graph.facebook.com/100002104302984/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%le.maihien.7%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002104302984%'
    OR facebook_url LIKE '%profile.php?id=100002104302984%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tomás Do (ID: 100001416018558)
UPDATE customers SET 
    name = 'Tomás Do',
    facebook_name = 'Tomás Do',
    facebook_numeric_id = '100001416018558',
    profile_picture_url = 'https://graph.facebook.com/100001416018558/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%NhoNguoiTa%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001416018558%'
    OR facebook_url LIKE '%profile.php?id=100001416018558%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nehty Časlav Lenka (ID: 100007883557045)
UPDATE customers SET 
    name = 'Nehty Časlav Lenka',
    facebook_name = 'Nehty Časlav Lenka',
    facebook_numeric_id = '100007883557045',
    profile_picture_url = 'https://graph.facebook.com/100007883557045/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ut.dothi.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007883557045%'
    OR facebook_url LIKE '%profile.php?id=100007883557045%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Binh Nguyen (ID: 100051280337731)
UPDATE customers SET 
    name = 'Binh Nguyen',
    facebook_name = 'Binh Nguyen',
    facebook_numeric_id = '100051280337731',
    profile_picture_url = 'https://graph.facebook.com/100051280337731/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100051280337731%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100051280337731%'
    OR facebook_url LIKE '%profile.php?id=100051280337731%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Kevin RW (ID: 100001338230774)
UPDATE customers SET 
    name = 'Kevin RW',
    facebook_name = 'Kevin RW',
    facebook_numeric_id = '100001338230774',
    profile_picture_url = 'https://graph.facebook.com/100001338230774/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001338230774%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001338230774%'
    OR facebook_url LIKE '%profile.php?id=100001338230774%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Le Thi Anh (ID: 100003251120313)
UPDATE customers SET 
    name = 'Le Thi Anh',
    facebook_name = 'Le Thi Anh',
    facebook_numeric_id = '100003251120313',
    profile_picture_url = 'https://graph.facebook.com/100003251120313/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%le.thianh.52%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003251120313%'
    OR facebook_url LIKE '%profile.php?id=100003251120313%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Uyen Dang (ID: 100002918151370)
UPDATE customers SET 
    name = 'Uyen Dang',
    facebook_name = 'Uyen Dang',
    facebook_numeric_id = '100002918151370',
    profile_picture_url = 'https://graph.facebook.com/100002918151370/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%uyen.dang.374%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002918151370%'
    OR facebook_url LIKE '%profile.php?id=100002918151370%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn ‏ Anh Hùng ✓‏ (ID: 100007767156529)
UPDATE customers SET 
    name = 'Nguyễn ‏ Anh Hùng ✓‏',
    facebook_name = 'Nguyễn ‏ Anh Hùng ✓‏',
    facebook_numeric_id = '100007767156529',
    profile_picture_url = 'https://graph.facebook.com/100007767156529/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyenanhhung1995%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007767156529%'
    OR facebook_url LIKE '%profile.php?id=100007767156529%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Nguyen (ID: 100048106315346)
UPDATE customers SET 
    name = 'Thu Nguyen',
    facebook_name = 'Thu Nguyen',
    facebook_numeric_id = '100048106315346',
    profile_picture_url = 'https://graph.facebook.com/100048106315346/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100048106315346%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100048106315346%'
    OR facebook_url LIKE '%profile.php?id=100048106315346%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Kim Nhung Le (ID: 100063123822804)
UPDATE customers SET 
    name = 'Thi Kim Nhung Le',
    facebook_name = 'Thi Kim Nhung Le',
    facebook_numeric_id = '100063123822804',
    profile_picture_url = 'https://graph.facebook.com/100063123822804/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thikimnhung.le.543%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100063123822804%'
    OR facebook_url LIKE '%profile.php?id=100063123822804%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Thi Binh (ID: 100016741954720)
UPDATE customers SET 
    name = 'Nguyen Thi Binh',
    facebook_name = 'Nguyen Thi Binh',
    facebook_numeric_id = '100016741954720',
    profile_picture_url = 'https://graph.facebook.com/100016741954720/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%binhhuyenlinhnhi0202%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100016741954720%'
    OR facebook_url LIKE '%profile.php?id=100016741954720%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Mai Hương (ID: 100007444029033)
UPDATE customers SET 
    name = 'Nguyễn Mai Hương',
    facebook_name = 'Nguyễn Mai Hương',
    facebook_numeric_id = '100007444029033',
    profile_picture_url = 'https://graph.facebook.com/100007444029033/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huong.nguyenmai.7545%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007444029033%'
    OR facebook_url LIKE '%profile.php?id=100007444029033%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoàng Hà (ID: 100005754847810)
UPDATE customers SET 
    name = 'Hoàng Hà',
    facebook_name = 'Hoàng Hà',
    facebook_numeric_id = '100005754847810',
    profile_picture_url = 'https://graph.facebook.com/100005754847810/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005754847810%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005754847810%'
    OR facebook_url LIKE '%profile.php?id=100005754847810%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuong Elisabeth (ID: 100002513647376)
UPDATE customers SET 
    name = 'Phuong Elisabeth',
    facebook_name = 'Phuong Elisabeth',
    facebook_numeric_id = '100002513647376',
    profile_picture_url = 'https://graph.facebook.com/100002513647376/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuong.elisabeth%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002513647376%'
    OR facebook_url LIKE '%profile.php?id=100002513647376%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khánh Ly (ID: 100005896059887)
UPDATE customers SET 
    name = 'Khánh Ly',
    facebook_name = 'Khánh Ly',
    facebook_numeric_id = '100005896059887',
    profile_picture_url = 'https://graph.facebook.com/100005896059887/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%khanhly.kute2%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005896059887%'
    OR facebook_url LIKE '%profile.php?id=100005896059887%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vân Anh (ID: 100001558497679)
UPDATE customers SET 
    name = 'Vân Anh',
    facebook_name = 'Vân Anh',
    facebook_numeric_id = '100001558497679',
    profile_picture_url = 'https://graph.facebook.com/100001558497679/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%van.anh.77398%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001558497679%'
    OR facebook_url LIKE '%profile.php?id=100001558497679%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Kim Tuyen Bui (ID: 100000604605236)
UPDATE customers SET 
    name = 'Thi Kim Tuyen Bui',
    facebook_name = 'Thi Kim Tuyen Bui',
    facebook_numeric_id = '100000604605236',
    profile_picture_url = 'https://graph.facebook.com/100000604605236/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thikimtuyen.bui%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000604605236%'
    OR facebook_url LIKE '%profile.php?id=100000604605236%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nam Khánh (ID: 100003231619534)
UPDATE customers SET 
    name = 'Nam Khánh',
    facebook_name = 'Nam Khánh',
    facebook_numeric_id = '100003231619534',
    profile_picture_url = 'https://graph.facebook.com/100003231619534/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003231619534%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003231619534%'
    OR facebook_url LIKE '%profile.php?id=100003231619534%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Micky Mini (ID: 100003346956631)
UPDATE customers SET 
    name = 'Micky Mini',
    facebook_name = 'Micky Mini',
    facebook_numeric_id = '100003346956631',
    profile_picture_url = 'https://graph.facebook.com/100003346956631/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thaonhijulia%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003346956631%'
    OR facebook_url LIKE '%profile.php?id=100003346956631%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Duyhung Duy Hung (ID: 100007554853097)
UPDATE customers SET 
    name = 'Duyhung Duy Hung',
    facebook_name = 'Duyhung Duy Hung',
    facebook_numeric_id = '100007554853097',
    profile_picture_url = 'https://graph.facebook.com/100007554853097/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%duyhung.duyhung.5688%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007554853097%'
    OR facebook_url LIKE '%profile.php?id=100007554853097%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoà Minh (ID: 100007463139435)
UPDATE customers SET 
    name = 'Hoà Minh',
    facebook_name = 'Hoà Minh',
    facebook_numeric_id = '100007463139435',
    profile_picture_url = 'https://graph.facebook.com/100007463139435/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007463139435%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007463139435%'
    OR facebook_url LIKE '%profile.php?id=100007463139435%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hai Pham Dinh (ID: 100000926345618)
UPDATE customers SET 
    name = 'Hai Pham Dinh',
    facebook_name = 'Hai Pham Dinh',
    facebook_numeric_id = '100000926345618',
    profile_picture_url = 'https://graph.facebook.com/100000926345618/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hai.phamdinh%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000926345618%'
    OR facebook_url LIKE '%profile.php?id=100000926345618%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Yêu (ID: 100005060615542)
UPDATE customers SET 
    name = 'Trang Yêu',
    facebook_name = 'Trang Yêu',
    facebook_numeric_id = '100005060615542',
    profile_picture_url = 'https://graph.facebook.com/100005060615542/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%yeu.trang.330%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005060615542%'
    OR facebook_url LIKE '%profile.php?id=100005060615542%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thị Bích Tuyền (ID: 665465218)
UPDATE customers SET 
    name = 'Nguyễn Thị Bích Tuyền',
    facebook_name = 'Nguyễn Thị Bích Tuyền',
    facebook_numeric_id = '665465218',
    profile_picture_url = 'https://graph.facebook.com/665465218/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%betty.m.nguyen%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%665465218%'
    OR facebook_url LIKE '%profile.php?id=665465218%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bin Bon (ID: 100063593312771)
UPDATE customers SET 
    name = 'Bin Bon',
    facebook_name = 'Bin Bon',
    facebook_numeric_id = '100063593312771',
    profile_picture_url = 'https://graph.facebook.com/100063593312771/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bincachua.dung%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100063593312771%'
    OR facebook_url LIKE '%profile.php?id=100063593312771%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Dung Nguyen (ID: 100003359809035)
UPDATE customers SET 
    name = 'Thi Dung Nguyen',
    facebook_name = 'Thi Dung Nguyen',
    facebook_numeric_id = '100003359809035',
    profile_picture_url = 'https://graph.facebook.com/100003359809035/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vinhhien.nguyen.77%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003359809035%'
    OR facebook_url LIKE '%profile.php?id=100003359809035%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hưng Nguyễn (ID: 100001611250747)
UPDATE customers SET 
    name = 'Hưng Nguyễn',
    facebook_name = 'Hưng Nguyễn',
    facebook_numeric_id = '100001611250747',
    profile_picture_url = 'https://graph.facebook.com/100001611250747/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lukas.nguyen3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001611250747%'
    OR facebook_url LIKE '%profile.php?id=100001611250747%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khai Le (ID: 100003350072891)
UPDATE customers SET 
    name = 'Khai Le',
    facebook_name = 'Khai Le',
    facebook_numeric_id = '100003350072891',
    profile_picture_url = 'https://graph.facebook.com/100003350072891/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quockhai.le%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003350072891%'
    OR facebook_url LIKE '%profile.php?id=100003350072891%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Hoang Hai (ID: 100002724234046)
UPDATE customers SET 
    name = 'Thanh Hoang Hai',
    facebook_name = 'Thanh Hoang Hai',
    facebook_numeric_id = '100002724234046',
    profile_picture_url = 'https://graph.facebook.com/100002724234046/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanh.hoanghai.944%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002724234046%'
    OR facebook_url LIKE '%profile.php?id=100002724234046%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trần Thị Lan (ID: 100051217127160)
UPDATE customers SET 
    name = 'Trần Thị Lan',
    facebook_name = 'Trần Thị Lan',
    facebook_numeric_id = '100051217127160',
    profile_picture_url = 'https://graph.facebook.com/100051217127160/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thilan.tran.798278%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100051217127160%'
    OR facebook_url LIKE '%profile.php?id=100051217127160%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hồng Minh (ID: 100025472152084)
UPDATE customers SET 
    name = 'Hồng Minh',
    facebook_name = 'Hồng Minh',
    facebook_numeric_id = '100025472152084',
    profile_picture_url = 'https://graph.facebook.com/100025472152084/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025472152084%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025472152084%'
    OR facebook_url LIKE '%profile.php?id=100025472152084%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mèo Hoang (ID: 100003110716152)
UPDATE customers SET 
    name = 'Mèo Hoang',
    facebook_name = 'Mèo Hoang',
    facebook_numeric_id = '100003110716152',
    profile_picture_url = 'https://graph.facebook.com/100003110716152/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%meo.hoang.3511%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003110716152%'
    OR facebook_url LIKE '%profile.php?id=100003110716152%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hanh Ly (ID: 100003570228127)
UPDATE customers SET 
    name = 'Hanh Ly',
    facebook_name = 'Hanh Ly',
    facebook_numeric_id = '100003570228127',
    profile_picture_url = 'https://graph.facebook.com/100003570228127/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hanh.ly.18%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003570228127%'
    OR facebook_url LIKE '%profile.php?id=100003570228127%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- David Dang (ID: 100015654853382)
UPDATE customers SET 
    name = 'David Dang',
    facebook_name = 'David Dang',
    facebook_numeric_id = '100015654853382',
    profile_picture_url = 'https://graph.facebook.com/100015654853382/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%kent.lyn.56%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015654853382%'
    OR facebook_url LIKE '%profile.php?id=100015654853382%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Mai Anh Nguyen (ID: 100042109357438)
UPDATE customers SET 
    name = 'Thi Mai Anh Nguyen',
    facebook_name = 'Thi Mai Anh Nguyen',
    facebook_numeric_id = '100042109357438',
    profile_picture_url = 'https://graph.facebook.com/100042109357438/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thimaianh.nguyen.94695%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100042109357438%'
    OR facebook_url LIKE '%profile.php?id=100042109357438%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vanessa Mai (ID: 100024463121863)
UPDATE customers SET 
    name = 'Vanessa Mai',
    facebook_name = 'Vanessa Mai',
    facebook_numeric_id = '100024463121863',
    profile_picture_url = 'https://graph.facebook.com/100024463121863/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vanessa.mai.5494%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024463121863%'
    OR facebook_url LIKE '%profile.php?id=100024463121863%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Popboy Le (ID: 100004364141329)
UPDATE customers SET 
    name = 'Popboy Le',
    facebook_name = 'Popboy Le',
    facebook_numeric_id = '100004364141329',
    profile_picture_url = 'https://graph.facebook.com/100004364141329/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%popboy.le.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004364141329%'
    OR facebook_url LIKE '%profile.php?id=100004364141329%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tran Cindy (ID: 100023646637269)
UPDATE customers SET 
    name = 'Tran Cindy',
    facebook_name = 'Tran Cindy',
    facebook_numeric_id = '100023646637269',
    profile_picture_url = 'https://graph.facebook.com/100023646637269/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tran.cindy.9026040%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100023646637269%'
    OR facebook_url LIKE '%profile.php?id=100023646637269%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thị Bích Thủy Vũ (ID: 100003631386939)
UPDATE customers SET 
    name = 'Thị Bích Thủy Vũ',
    facebook_name = 'Thị Bích Thủy Vũ',
    facebook_numeric_id = '100003631386939',
    profile_picture_url = 'https://graph.facebook.com/100003631386939/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thibichthuy.vu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003631386939%'
    OR facebook_url LIKE '%profile.php?id=100003631386939%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Oanh Ha Long (ID: 100002542473575)
UPDATE customers SET 
    name = 'Oanh Ha Long',
    facebook_name = 'Oanh Ha Long',
    facebook_numeric_id = '100002542473575',
    profile_picture_url = 'https://graph.facebook.com/100002542473575/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%oanh.halong%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002542473575%'
    OR facebook_url LIKE '%profile.php?id=100002542473575%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Son Dinh (ID: 100000579348153)
UPDATE customers SET 
    name = 'Son Dinh',
    facebook_name = 'Son Dinh',
    facebook_numeric_id = '100000579348153',
    profile_picture_url = 'https://graph.facebook.com/100000579348153/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ducson.vietanh%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000579348153%'
    OR facebook_url LIKE '%profile.php?id=100000579348153%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Phương Thảo (ID: 100010086693435)
UPDATE customers SET 
    name = 'Nguyễn Phương Thảo',
    facebook_name = 'Nguyễn Phương Thảo',
    facebook_numeric_id = '100010086693435',
    profile_picture_url = 'https://graph.facebook.com/100010086693435/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010086693435%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100010086693435%'
    OR facebook_url LIKE '%profile.php?id=100010086693435%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bao Chau Phan (ID: 100049338675293)
UPDATE customers SET 
    name = 'Bao Chau Phan',
    facebook_name = 'Bao Chau Phan',
    facebook_numeric_id = '100049338675293',
    profile_picture_url = 'https://graph.facebook.com/100049338675293/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%baochau.phan.77736%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100049338675293%'
    OR facebook_url LIKE '%profile.php?id=100049338675293%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đoàn Quảng (ID: 100001293203288)
UPDATE customers SET 
    name = 'Đoàn Quảng',
    facebook_name = 'Đoàn Quảng',
    facebook_numeric_id = '100001293203288',
    profile_picture_url = 'https://graph.facebook.com/100001293203288/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quang.doan.96%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001293203288%'
    OR facebook_url LIKE '%profile.php?id=100001293203288%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huệ Trần (ID: 100036987399445)
UPDATE customers SET 
    name = 'Huệ Trần',
    facebook_name = 'Huệ Trần',
    facebook_numeric_id = '100036987399445',
    profile_picture_url = 'https://graph.facebook.com/100036987399445/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036987399445%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036987399445%'
    OR facebook_url LIKE '%profile.php?id=100036987399445%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thuy Pham (ID: 1135248391)
UPDATE customers SET 
    name = 'Thuy Pham',
    facebook_name = 'Thuy Pham',
    facebook_numeric_id = '1135248391',
    profile_picture_url = 'https://graph.facebook.com/1135248391/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuy.pham.1441810%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1135248391%'
    OR facebook_url LIKE '%profile.php?id=1135248391%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thang Pham (ID: 100024161656454)
UPDATE customers SET 
    name = 'Thang Pham',
    facebook_name = 'Thang Pham',
    facebook_numeric_id = '100024161656454',
    profile_picture_url = 'https://graph.facebook.com/100024161656454/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024161656454%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024161656454%'
    OR facebook_url LIKE '%profile.php?id=100024161656454%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Minh Phan (ID: 100066712176944)
UPDATE customers SET 
    name = 'Thi Minh Phan',
    facebook_name = 'Thi Minh Phan',
    facebook_numeric_id = '100066712176944',
    profile_picture_url = 'https://graph.facebook.com/100066712176944/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thiminh.phan.7982%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100066712176944%'
    OR facebook_url LIKE '%profile.php?id=100066712176944%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Pham Ngọc Linh (ID: 100000555014864)
UPDATE customers SET 
    name = 'Pham Ngọc Linh',
    facebook_name = 'Pham Ngọc Linh',
    facebook_numeric_id = '100000555014864',
    profile_picture_url = 'https://graph.facebook.com/100000555014864/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thuylinh.quach%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000555014864%'
    OR facebook_url LIKE '%profile.php?id=100000555014864%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bong Hoang (ID: 100018554764235)
UPDATE customers SET 
    name = 'Bong Hoang',
    facebook_name = 'Bong Hoang',
    facebook_numeric_id = '100018554764235',
    profile_picture_url = 'https://graph.facebook.com/100018554764235/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bong.hoang.735507%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100018554764235%'
    OR facebook_url LIKE '%profile.php?id=100018554764235%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thị Thu Vũ (ID: 100041137803100)
UPDATE customers SET 
    name = 'Thị Thu Vũ',
    facebook_name = 'Thị Thu Vũ',
    facebook_numeric_id = '100041137803100',
    profile_picture_url = 'https://graph.facebook.com/100041137803100/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lina.vu.391%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100041137803100%'
    OR facebook_url LIKE '%profile.php?id=100041137803100%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huong Ho (ID: 100003278434815)
UPDATE customers SET 
    name = 'Huong Ho',
    facebook_name = 'Huong Ho',
    facebook_numeric_id = '100003278434815',
    profile_picture_url = 'https://graph.facebook.com/100003278434815/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huong.hothi.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003278434815%'
    OR facebook_url LIKE '%profile.php?id=100003278434815%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyen Dang (ID: 100004315813064)
UPDATE customers SET 
    name = 'Huyen Dang',
    facebook_name = 'Huyen Dang',
    facebook_numeric_id = '100004315813064',
    profile_picture_url = 'https://graph.facebook.com/100004315813064/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyen.dang.75491%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004315813064%'
    OR facebook_url LIKE '%profile.php?id=100004315813064%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hwang Nguyễn (ID: 100000309562730)
UPDATE customers SET 
    name = 'Hwang Nguyễn',
    facebook_name = 'Hwang Nguyễn',
    facebook_numeric_id = '100000309562730',
    profile_picture_url = 'https://graph.facebook.com/100000309562730/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%hwang.nguyen.1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000309562730%'
    OR facebook_url LIKE '%profile.php?id=100000309562730%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Tân (ID: 100037572019089)
UPDATE customers SET 
    name = 'Nguyễn Tân',
    facebook_name = 'Nguyễn Tân',
    facebook_numeric_id = '100037572019089',
    profile_picture_url = 'https://graph.facebook.com/100037572019089/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100037572019089%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100037572019089%'
    OR facebook_url LIKE '%profile.php?id=100037572019089%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vu ThiThu Phuong (ID: 100004798303925)
UPDATE customers SET 
    name = 'Vu ThiThu Phuong',
    facebook_name = 'Vu ThiThu Phuong',
    facebook_numeric_id = '100004798303925',
    profile_picture_url = 'https://graph.facebook.com/100004798303925/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%clovervu.vu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004798303925%'
    OR facebook_url LIKE '%profile.php?id=100004798303925%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Andrea NW (ID: 100024373253928)
UPDATE customers SET 
    name = 'Andrea NW',
    facebook_name = 'Andrea NW',
    facebook_numeric_id = '100024373253928',
    profile_picture_url = 'https://graph.facebook.com/100024373253928/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%naegel.wimpern.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024373253928%'
    OR facebook_url LIKE '%profile.php?id=100024373253928%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thành Nguyễn (ID: 100004014703733)
UPDATE customers SET 
    name = 'Thành Nguyễn',
    facebook_name = 'Thành Nguyễn',
    facebook_numeric_id = '100004014703733',
    profile_picture_url = 'https://graph.facebook.com/100004014703733/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanhice.vagaboud%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004014703733%'
    OR facebook_url LIKE '%profile.php?id=100004014703733%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Jessi Kha (ID: 100021834186415)
UPDATE customers SET 
    name = 'Jessi Kha',
    facebook_name = 'Jessi Kha',
    facebook_numeric_id = '100021834186415',
    profile_picture_url = 'https://graph.facebook.com/100021834186415/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%jessi.kha.908%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100021834186415%'
    OR facebook_url LIKE '%profile.php?id=100021834186415%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngân Lê (ID: 100006013596032)
UPDATE customers SET 
    name = 'Ngân Lê',
    facebook_name = 'Ngân Lê',
    facebook_numeric_id = '100006013596032',
    profile_picture_url = 'https://graph.facebook.com/100006013596032/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%lethikimngan.lethikimngan%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006013596032%'
    OR facebook_url LIKE '%profile.php?id=100006013596032%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Tuan Vo (ID: 100049831142866)
UPDATE customers SET 
    name = 'Thanh Tuan Vo',
    facebook_name = 'Thanh Tuan Vo',
    facebook_numeric_id = '100049831142866',
    profile_picture_url = 'https://graph.facebook.com/100049831142866/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100049831142866%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100049831142866%'
    OR facebook_url LIKE '%profile.php?id=100049831142866%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Mit Lun (ID: 100002081077421)
UPDATE customers SET 
    name = 'Mit Lun',
    facebook_name = 'Mit Lun',
    facebook_numeric_id = '100002081077421',
    profile_picture_url = 'https://graph.facebook.com/100002081077421/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%le.t.nu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002081077421%'
    OR facebook_url LIKE '%profile.php?id=100002081077421%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bích Thuỷ (ID: 100001488811066)
UPDATE customers SET 
    name = 'Bích Thuỷ',
    facebook_name = 'Bích Thuỷ',
    facebook_numeric_id = '100001488811066',
    profile_picture_url = 'https://graph.facebook.com/100001488811066/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%bichthuy.nguyenthi.79%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001488811066%'
    OR facebook_url LIKE '%profile.php?id=100001488811066%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sỹ Đăng (ID: 100024943414976)
UPDATE customers SET 
    name = 'Sỹ Đăng',
    facebook_name = 'Sỹ Đăng',
    facebook_numeric_id = '100024943414976',
    profile_picture_url = 'https://graph.facebook.com/100024943414976/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024943414976%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100024943414976%'
    OR facebook_url LIKE '%profile.php?id=100024943414976%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuyen Nguyen Danh (ID: 100001867945379)
UPDATE customers SET 
    name = 'Tuyen Nguyen Danh',
    facebook_name = 'Tuyen Nguyen Danh',
    facebook_numeric_id = '100001867945379',
    profile_picture_url = 'https://graph.facebook.com/100001867945379/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuyen.nguyendanh.75%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001867945379%'
    OR facebook_url LIKE '%profile.php?id=100001867945379%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lam Tu (ID: 100001418348145)
UPDATE customers SET 
    name = 'Lam Tu',
    facebook_name = 'Lam Tu',
    facebook_numeric_id = '100001418348145',
    profile_picture_url = 'https://graph.facebook.com/100001418348145/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tu.lamvan%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001418348145%'
    OR facebook_url LIKE '%profile.php?id=100001418348145%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phuong Do Thu (ID: 1484884743)
UPDATE customers SET 
    name = 'Phuong Do Thu',
    facebook_name = 'Phuong Do Thu',
    facebook_numeric_id = '1484884743',
    profile_picture_url = 'https://graph.facebook.com/1484884743/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuong.dothu%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1484884743%'
    OR facebook_url LIKE '%profile.php?id=1484884743%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lâm Nguyễn (ID: 100002845137949)
UPDATE customers SET 
    name = 'Lâm Nguyễn',
    facebook_name = 'Lâm Nguyễn',
    facebook_numeric_id = '100002845137949',
    profile_picture_url = 'https://graph.facebook.com/100002845137949/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nucuoingaymoi%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100002845137949%'
    OR facebook_url LIKE '%profile.php?id=100002845137949%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- KimFashion Le (ID: 100009667548750)
UPDATE customers SET 
    name = 'KimFashion Le',
    facebook_name = 'KimFashion Le',
    facebook_numeric_id = '100009667548750',
    profile_picture_url = 'https://graph.facebook.com/100009667548750/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009667548750%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009667548750%'
    OR facebook_url LIKE '%profile.php?id=100009667548750%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuan Nano (ID: 698573560)
UPDATE customers SET 
    name = 'Tuan Nano',
    facebook_name = 'Tuan Nano',
    facebook_numeric_id = '698573560',
    profile_picture_url = 'https://graph.facebook.com/698573560/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%AnhTuanNano%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%698573560%'
    OR facebook_url LIKE '%profile.php?id=698573560%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Loung Nguyen (ID: 100051052665430)
UPDATE customers SET 
    name = 'Loung Nguyen',
    facebook_name = 'Loung Nguyen',
    facebook_numeric_id = '100051052665430',
    profile_picture_url = 'https://graph.facebook.com/100051052665430/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%loung.nguyen.583%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100051052665430%'
    OR facebook_url LIKE '%profile.php?id=100051052665430%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Doan Phuong Nhi (ID: 100001786573786)
UPDATE customers SET 
    name = 'Doan Phuong Nhi',
    facebook_name = 'Doan Phuong Nhi',
    facebook_numeric_id = '100001786573786',
    profile_picture_url = 'https://graph.facebook.com/100001786573786/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuongnhi.doan.5%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001786573786%'
    OR facebook_url LIKE '%profile.php?id=100001786573786%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nail Lenka (ID: 100003356000029)
UPDATE customers SET 
    name = 'Nail Lenka',
    facebook_name = 'Nail Lenka',
    facebook_numeric_id = '100003356000029',
    profile_picture_url = 'https://graph.facebook.com/100003356000029/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%KhanhVycz%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003356000029%'
    OR facebook_url LIKE '%profile.php?id=100003356000029%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bg VânNavy (ID: 100007329615281)
UPDATE customers SET 
    name = 'Bg VânNavy',
    facebook_name = 'Bg VânNavy',
    facebook_numeric_id = '100007329615281',
    profile_picture_url = 'https://graph.facebook.com/100007329615281/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007329615281%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007329615281%'
    OR facebook_url LIKE '%profile.php?id=100007329615281%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngọc Tran (ID: 100008740669274)
UPDATE customers SET 
    name = 'Ngọc Tran',
    facebook_name = 'Ngọc Tran',
    facebook_numeric_id = '100008740669274',
    profile_picture_url = 'https://graph.facebook.com/100008740669274/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008740669274%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008740669274%'
    OR facebook_url LIKE '%profile.php?id=100008740669274%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Huyền (ID: 100003209846224)
UPDATE customers SET 
    name = 'Thanh Huyền',
    facebook_name = 'Thanh Huyền',
    facebook_numeric_id = '100003209846224',
    profile_picture_url = 'https://graph.facebook.com/100003209846224/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanhhuyen31795%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003209846224%'
    OR facebook_url LIKE '%profile.php?id=100003209846224%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thanh Nguyen (ID: 100001073667232)
UPDATE customers SET 
    name = 'Thanh Nguyen',
    facebook_name = 'Thanh Nguyen',
    facebook_numeric_id = '100001073667232',
    profile_picture_url = 'https://graph.facebook.com/100001073667232/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanh232%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001073667232%'
    OR facebook_url LIKE '%profile.php?id=100001073667232%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ruby Anna (ID: 100074824704934)
UPDATE customers SET 
    name = 'Ruby Anna',
    facebook_name = 'Ruby Anna',
    facebook_numeric_id = '100074824704934',
    profile_picture_url = 'https://graph.facebook.com/100074824704934/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100074824704934%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100074824704934%'
    OR facebook_url LIKE '%profile.php?id=100074824704934%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thu Hà (ID: 100067597356469)
UPDATE customers SET 
    name = 'Thu Hà',
    facebook_name = 'Thu Hà',
    facebook_numeric_id = '100067597356469',
    profile_picture_url = 'https://graph.facebook.com/100067597356469/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100067597356469%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100067597356469%'
    OR facebook_url LIKE '%profile.php?id=100067597356469%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trinh Tran (ID: 100008758509251)
UPDATE customers SET 
    name = 'Trinh Tran',
    facebook_name = 'Trinh Tran',
    facebook_numeric_id = '100008758509251',
    profile_picture_url = 'https://graph.facebook.com/100008758509251/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008758509251%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008758509251%'
    OR facebook_url LIKE '%profile.php?id=100008758509251%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Trang Phan (ID: 100085447912552)
UPDATE customers SET 
    name = 'Trang Phan',
    facebook_name = 'Trang Phan',
    facebook_numeric_id = '100085447912552',
    profile_picture_url = 'https://graph.facebook.com/100085447912552/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100085447912552%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100085447912552%'
    OR facebook_url LIKE '%profile.php?id=100085447912552%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vuong Truong Quoc (ID: 100021527175793)
UPDATE customers SET 
    name = 'Vuong Truong Quoc',
    facebook_name = 'Vuong Truong Quoc',
    facebook_numeric_id = '100021527175793',
    profile_picture_url = 'https://graph.facebook.com/100021527175793/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vuong.truongquoc.3701%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100021527175793%'
    OR facebook_url LIKE '%profile.php?id=100021527175793%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bon Bi Nguyen (ID: 1652723993)
UPDATE customers SET 
    name = 'Bon Bi Nguyen',
    facebook_name = 'Bon Bi Nguyen',
    facebook_numeric_id = '1652723993',
    profile_picture_url = 'https://graph.facebook.com/1652723993/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1652723993%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1652723993%'
    OR facebook_url LIKE '%profile.php?id=1652723993%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Finn Thanh (ID: 100003947921608)
UPDATE customers SET 
    name = 'Finn Thanh',
    facebook_name = 'Finn Thanh',
    facebook_numeric_id = '100003947921608',
    profile_picture_url = 'https://graph.facebook.com/100003947921608/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thanh.tranthi.5872%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003947921608%'
    OR facebook_url LIKE '%profile.php?id=100003947921608%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- An Do (ID: 100059464541413)
UPDATE customers SET 
    name = 'An Do',
    facebook_name = 'An Do',
    facebook_numeric_id = '100059464541413',
    profile_picture_url = 'https://graph.facebook.com/100059464541413/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100059464541413%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100059464541413%'
    OR facebook_url LIKE '%profile.php?id=100059464541413%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- LiNo Phan Nhân (ID: 100009195851055)
UPDATE customers SET 
    name = 'LiNo Phan Nhân',
    facebook_name = 'LiNo Phan Nhân',
    facebook_numeric_id = '100009195851055',
    profile_picture_url = 'https://graph.facebook.com/100009195851055/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009195851055%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009195851055%'
    OR facebook_url LIKE '%profile.php?id=100009195851055%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Hoang (ID: 100036797419353)
UPDATE customers SET 
    name = 'Thi Hoang',
    facebook_name = 'Thi Hoang',
    facebook_numeric_id = '100036797419353',
    profile_picture_url = 'https://graph.facebook.com/100036797419353/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036797419353%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100036797419353%'
    OR facebook_url LIKE '%profile.php?id=100036797419353%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Huyền Trần (ID: 100028440164442)
UPDATE customers SET 
    name = 'Huyền Trần',
    facebook_name = 'Huyền Trần',
    facebook_numeric_id = '100028440164442',
    profile_picture_url = 'https://graph.facebook.com/100028440164442/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%huyen.tranthu.50999%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100028440164442%'
    OR facebook_url LIKE '%profile.php?id=100028440164442%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Khánh Duyên Trương (ID: 100015762397748)
UPDATE customers SET 
    name = 'Khánh Duyên Trương',
    facebook_name = 'Khánh Duyên Trương',
    facebook_numeric_id = '100015762397748',
    profile_picture_url = 'https://graph.facebook.com/100015762397748/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyenthily.nguyen.1276%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100015762397748%'
    OR facebook_url LIKE '%profile.php?id=100015762397748%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuấn Phong (ID: 100004540877905)
UPDATE customers SET 
    name = 'Tuấn Phong',
    facebook_name = 'Tuấn Phong',
    facebook_numeric_id = '100004540877905',
    profile_picture_url = 'https://graph.facebook.com/100004540877905/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004540877905%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004540877905%'
    OR facebook_url LIKE '%profile.php?id=100004540877905%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- AnhTuan Lam (ID: 100040353874679)
UPDATE customers SET 
    name = 'AnhTuan Lam',
    facebook_name = 'AnhTuan Lam',
    facebook_numeric_id = '100040353874679',
    profile_picture_url = 'https://graph.facebook.com/100040353874679/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100040353874679%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100040353874679%'
    OR facebook_url LIKE '%profile.php?id=100040353874679%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phương Ami (ID: 100057704199606)
UPDATE customers SET 
    name = 'Phương Ami',
    facebook_name = 'Phương Ami',
    facebook_numeric_id = '100057704199606',
    profile_picture_url = 'https://graph.facebook.com/100057704199606/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%phuong.ami.54%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100057704199606%'
    OR facebook_url LIKE '%profile.php?id=100057704199606%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Cảnh Thắng (ID: 100027919517119)
UPDATE customers SET 
    name = 'Nguyễn Cảnh Thắng',
    facebook_name = 'Nguyễn Cảnh Thắng',
    facebook_numeric_id = '100027919517119',
    profile_picture_url = 'https://graph.facebook.com/100027919517119/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thai.thangthong.18%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100027919517119%'
    OR facebook_url LIKE '%profile.php?id=100027919517119%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nini Nguyen (ID: 100008614771711)
UPDATE customers SET 
    name = 'Nini Nguyen',
    facebook_name = 'Nini Nguyen',
    facebook_numeric_id = '100008614771711',
    profile_picture_url = 'https://graph.facebook.com/100008614771711/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%nguyen.nghi.7355079%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008614771711%'
    OR facebook_url LIKE '%profile.php?id=100008614771711%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thi Ha Dao (ID: 100008825119210)
UPDATE customers SET 
    name = 'Thi Ha Dao',
    facebook_name = 'Thi Ha Dao',
    facebook_numeric_id = '100008825119210',
    profile_picture_url = 'https://graph.facebook.com/100008825119210/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008825119210%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008825119210%'
    OR facebook_url LIKE '%profile.php?id=100008825119210%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyen Anh Van (ID: 100004354450796)
UPDATE customers SET 
    name = 'Nguyen Anh Van',
    facebook_name = 'Nguyen Anh Van',
    facebook_numeric_id = '100004354450796',
    profile_picture_url = 'https://graph.facebook.com/100004354450796/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%van.nguyenanh.756%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004354450796%'
    OR facebook_url LIKE '%profile.php?id=100004354450796%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vu My (ID: 100000207437541)
UPDATE customers SET 
    name = 'Vu My',
    facebook_name = 'Vu My',
    facebook_numeric_id = '100000207437541',
    profile_picture_url = 'https://graph.facebook.com/100000207437541/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%mymyvu.vu1%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000207437541%'
    OR facebook_url LIKE '%profile.php?id=100000207437541%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Xuân Tiệp (ID: 100025268957641)
UPDATE customers SET 
    name = 'Nguyễn Xuân Tiệp',
    facebook_name = 'Nguyễn Xuân Tiệp',
    facebook_numeric_id = '100025268957641',
    profile_picture_url = 'https://graph.facebook.com/100025268957641/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tiep.nguyenxuan.1690%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100025268957641%'
    OR facebook_url LIKE '%profile.php?id=100025268957641%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vy Hung (ID: 100065385287243)
UPDATE customers SET 
    name = 'Vy Hung',
    facebook_name = 'Vy Hung',
    facebook_numeric_id = '100065385287243',
    profile_picture_url = 'https://graph.facebook.com/100065385287243/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%vy.hung.7355079%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100065385287243%'
    OR facebook_url LIKE '%profile.php?id=100065385287243%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Minh Thu RV (ID: 100000525043145)
UPDATE customers SET 
    name = 'Minh Thu RV',
    facebook_name = 'Minh Thu RV',
    facebook_numeric_id = '100000525043145',
    profile_picture_url = 'https://graph.facebook.com/100000525043145/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%julia.ngochan%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000525043145%'
    OR facebook_url LIKE '%profile.php?id=100000525043145%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Manh Naoh (ID: 100000386120564)
UPDATE customers SET 
    name = 'Manh Naoh',
    facebook_name = 'Manh Naoh',
    facebook_numeric_id = '100000386120564',
    profile_picture_url = 'https://graph.facebook.com/100000386120564/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%Manhnoah%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000386120564%'
    OR facebook_url LIKE '%profile.php?id=100000386120564%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Son Nguyen (ID: 100000398798433)
UPDATE customers SET 
    name = 'Son Nguyen',
    facebook_name = 'Son Nguyen',
    facebook_numeric_id = '100000398798433',
    profile_picture_url = 'https://graph.facebook.com/100000398798433/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000398798433%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100000398798433%'
    OR facebook_url LIKE '%profile.php?id=100000398798433%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Phạm Ánh Hồng (ID: 100008208124798)
UPDATE customers SET 
    name = 'Phạm Ánh Hồng',
    facebook_name = 'Phạm Ánh Hồng',
    facebook_numeric_id = '100008208124798',
    profile_picture_url = 'https://graph.facebook.com/100008208124798/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008208124798%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008208124798%'
    OR facebook_url LIKE '%profile.php?id=100008208124798%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuyet Anh Quan (ID: 100007445375918)
UPDATE customers SET 
    name = 'Tuyet Anh Quan',
    facebook_name = 'Tuyet Anh Quan',
    facebook_numeric_id = '100007445375918',
    profile_picture_url = 'https://graph.facebook.com/100007445375918/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuyetanh.quan.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007445375918%'
    OR facebook_url LIKE '%profile.php?id=100007445375918%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ly Nguyễn (ID: 100005525888676)
UPDATE customers SET 
    name = 'Ly Nguyễn',
    facebook_name = 'Ly Nguyễn',
    facebook_numeric_id = '100005525888676',
    profile_picture_url = 'https://graph.facebook.com/100005525888676/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005525888676%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005525888676%'
    OR facebook_url LIKE '%profile.php?id=100005525888676%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lưu Tuấn (ID: 100001482260075)
UPDATE customers SET 
    name = 'Lưu Tuấn',
    facebook_name = 'Lưu Tuấn',
    facebook_numeric_id = '100001482260075',
    profile_picture_url = 'https://graph.facebook.com/100001482260075/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%luutuan.1990%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001482260075%'
    OR facebook_url LIKE '%profile.php?id=100001482260075%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Vi Ngọc Huyền (ID: 100009368792017)
UPDATE customers SET 
    name = 'Vi Ngọc Huyền',
    facebook_name = 'Vi Ngọc Huyền',
    facebook_numeric_id = '100009368792017',
    profile_picture_url = 'https://graph.facebook.com/100009368792017/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009368792017%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100009368792017%'
    OR facebook_url LIKE '%profile.php?id=100009368792017%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Xỵ Xa Xỉ (ID: 100004193941611)
UPDATE customers SET 
    name = 'Xỵ Xa Xỉ',
    facebook_name = 'Xỵ Xa Xỉ',
    facebook_numeric_id = '100004193941611',
    profile_picture_url = 'https://graph.facebook.com/100004193941611/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%xytotbuq.98%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100004193941611%'
    OR facebook_url LIKE '%profile.php?id=100004193941611%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lien Phan (ID: 100008240079407)
UPDATE customers SET 
    name = 'Lien Phan',
    facebook_name = 'Lien Phan',
    facebook_numeric_id = '100008240079407',
    profile_picture_url = 'https://graph.facebook.com/100008240079407/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008240079407%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008240079407%'
    OR facebook_url LIKE '%profile.php?id=100008240079407%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nguyễn Thị Luong (ID: 100013832498466)
UPDATE customers SET 
    name = 'Nguyễn Thị Luong',
    facebook_name = 'Nguyễn Thị Luong',
    facebook_numeric_id = '100013832498466',
    profile_picture_url = 'https://graph.facebook.com/100013832498466/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%thihienluong.nguyen.9%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013832498466%'
    OR facebook_url LIKE '%profile.php?id=100013832498466%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Emy Le (ID: 100003605895053)
UPDATE customers SET 
    name = 'Emy Le',
    facebook_name = 'Emy Le',
    facebook_numeric_id = '100003605895053',
    profile_picture_url = 'https://graph.facebook.com/100003605895053/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%emy.blue.3%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003605895053%'
    OR facebook_url LIKE '%profile.php?id=100003605895053%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ha Nhi Letran (ID: 100006596746867)
UPDATE customers SET 
    name = 'Ha Nhi Letran',
    facebook_name = 'Ha Nhi Letran',
    facebook_numeric_id = '100006596746867',
    profile_picture_url = 'https://graph.facebook.com/100006596746867/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006596746867%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006596746867%'
    OR facebook_url LIKE '%profile.php?id=100006596746867%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- La Miaoo (ID: 1040426248)
UPDATE customers SET 
    name = 'La Miaoo',
    facebook_name = 'La Miaoo',
    facebook_numeric_id = '1040426248',
    profile_picture_url = 'https://graph.facebook.com/1040426248/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%LaMiaoo%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%1040426248%'
    OR facebook_url LIKE '%profile.php?id=1040426248%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Hoa NailCenter (ID: 100005848263492)
UPDATE customers SET 
    name = 'Hoa NailCenter',
    facebook_name = 'Hoa NailCenter',
    facebook_numeric_id = '100005848263492',
    profile_picture_url = 'https://graph.facebook.com/100005848263492/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005848263492%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005848263492%'
    OR facebook_url LIKE '%profile.php?id=100005848263492%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Quynhnga Bui (ID: 100006623492957)
UPDATE customers SET 
    name = 'Quynhnga Bui',
    facebook_name = 'Quynhnga Bui',
    facebook_numeric_id = '100006623492957',
    profile_picture_url = 'https://graph.facebook.com/100006623492957/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006623492957%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006623492957%'
    OR facebook_url LIKE '%profile.php?id=100006623492957%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Canh Van (ID: 100006229368612)
UPDATE customers SET 
    name = 'Canh Van',
    facebook_name = 'Canh Van',
    facebook_numeric_id = '100006229368612',
    profile_picture_url = 'https://graph.facebook.com/100006229368612/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%canh.van.161214%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006229368612%'
    OR facebook_url LIKE '%profile.php?id=100006229368612%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Nhung Kim (ID: 100013560152061)
UPDATE customers SET 
    name = 'Nhung Kim',
    facebook_name = 'Nhung Kim',
    facebook_numeric_id = '100013560152061',
    profile_picture_url = 'https://graph.facebook.com/100013560152061/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013560152061%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100013560152061%'
    OR facebook_url LIKE '%profile.php?id=100013560152061%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Ngocthu Lenka (ID: 100001033144188)
UPDATE customers SET 
    name = 'Ngocthu Lenka',
    facebook_name = 'Ngocthu Lenka',
    facebook_numeric_id = '100001033144188',
    profile_picture_url = 'https://graph.facebook.com/100001033144188/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%ngocthu.lenka%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100001033144188%'
    OR facebook_url LIKE '%profile.php?id=100001033144188%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Giang Tran (ID: 100045663420459)
UPDATE customers SET 
    name = 'Giang Tran',
    facebook_name = 'Giang Tran',
    facebook_numeric_id = '100045663420459',
    profile_picture_url = 'https://graph.facebook.com/100045663420459/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100045663420459%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100045663420459%'
    OR facebook_url LIKE '%profile.php?id=100045663420459%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Đại Nam (ID: 100003266551718)
UPDATE customers SET 
    name = 'Đại Nam',
    facebook_name = 'Đại Nam',
    facebook_numeric_id = '100003266551718',
    profile_picture_url = 'https://graph.facebook.com/100003266551718/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%quach.tuannam%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003266551718%'
    OR facebook_url LIKE '%profile.php?id=100003266551718%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Van Anh Dinh (ID: 100005081370833)
UPDATE customers SET 
    name = 'Van Anh Dinh',
    facebook_name = 'Van Anh Dinh',
    facebook_numeric_id = '100005081370833',
    profile_picture_url = 'https://graph.facebook.com/100005081370833/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%luc.pham.7967%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005081370833%'
    OR facebook_url LIKE '%profile.php?id=100005081370833%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Tuấn Nguyễn (ID: 100003615133249)
UPDATE customers SET 
    name = 'Tuấn Nguyễn',
    facebook_name = 'Tuấn Nguyễn',
    facebook_numeric_id = '100003615133249',
    profile_picture_url = 'https://graph.facebook.com/100003615133249/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%tuan.nguyen.1048%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100003615133249%'
    OR facebook_url LIKE '%profile.php?id=100003615133249%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Lenka Le (ID: 100008268241050)
UPDATE customers SET 
    name = 'Lenka Le',
    facebook_name = 'Lenka Le',
    facebook_numeric_id = '100008268241050',
    profile_picture_url = 'https://graph.facebook.com/100008268241050/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008268241050%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100008268241050%'
    OR facebook_url LIKE '%profile.php?id=100008268241050%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Sương Cua (ID: 100005727826122)
UPDATE customers SET 
    name = 'Sương Cua',
    facebook_name = 'Sương Cua',
    facebook_numeric_id = '100005727826122',
    profile_picture_url = 'https://graph.facebook.com/100005727826122/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%anna.suong.96%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005727826122%'
    OR facebook_url LIKE '%profile.php?id=100005727826122%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Bảo Ngọc (ID: 100006594374610)
UPDATE customers SET 
    name = 'Bảo Ngọc',
    facebook_name = 'Bảo Ngọc',
    facebook_numeric_id = '100006594374610',
    profile_picture_url = 'https://graph.facebook.com/100006594374610/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%baongoc1404%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100006594374610%'
    OR facebook_url LIKE '%profile.php?id=100006594374610%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Anna Tran (ID: 100007656919049)
UPDATE customers SET 
    name = 'Anna Tran',
    facebook_name = 'Anna Tran',
    facebook_numeric_id = '100007656919049',
    profile_picture_url = 'https://graph.facebook.com/100007656919049/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007656919049%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100007656919049%'
    OR facebook_url LIKE '%profile.php?id=100007656919049%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

-- Thảo Nhi Nguyễn (ID: 100005875232712)
UPDATE customers SET 
    name = 'Thảo Nhi Nguyễn',
    facebook_name = 'Thảo Nhi Nguyễn',
    facebook_numeric_id = '100005875232712',
    profile_picture_url = 'https://graph.facebook.com/100005875232712/picture?type=large'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%VanNhi72%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%100005875232712%'
    OR facebook_url LIKE '%profile.php?id=100005875232712%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');


-- Summary: 902 UPDATE statements generated
-- Run this script on your production database to apply Facebook data

-- Verify results:
-- SELECT COUNT(*) as updated FROM customers WHERE facebook_numeric_id IS NOT NULL AND facebook_numeric_id != '';
