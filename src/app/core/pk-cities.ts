// Cities and district towns of Pakistan, grouped by province/territory. Sorted A–Z within each group.
// Used for donor search and donor profiles; free-text is never needed for a listed city.
const raw: Record<string, string[]> = {
  'Punjab': [
    'Lahore','Faisalabad','Rawalpindi','Gujranwala','Multan','Sialkot','Bahawalpur','Sargodha','Sheikhupura','Jhang','Rahim Yar Khan',
    'Gujrat','Kasur','Sahiwal','Okara','Wah Cantonment','Dera Ghazi Khan','Mandi Bahauddin','Chiniot','Kamoke','Hafizabad','Sadiqabad',
    'Burewala','Khanewal','Muzaffargarh','Khanpur','Jhelum','Attock','Chakwal','Mianwali','Bhakkar','Layyah','Vehari','Pakpattan',
    'Toba Tek Singh','Narowal','Nankana Sahib','Lodhran','Bahawalnagar','Rajanpur','Khushab','Taxila','Murree','Gojra','Kot Addu',
    'Daska','Muridke','Jaranwala','Arifwala','Chishtian','Ahmadpur East','Hasilpur','Kamalia','Wazirabad','Pattoki','Chichawatni',
    'Mian Channu','Kharian','Jalalpur Jattan','Shakargarh','Pindi Bhattian','Samundri','Haroonabad','Fort Abbas','Talagang',
    'Pind Dadan Khan','Kot Radha Kishan','Renala Khurd','Depalpur','Shorkot','Taunsa','Jampur','Liaquatpur','Yazman','Kabirwala',
    'Jauharabad','Bhalwal','Sambrial','Pasrur','Zafarwal','Chunian','Raiwind','Sangla Hill','Phalia','Malakwal','Sarai Alamgir',
    'Dina','Gujar Khan','Kahuta','Fateh Jang','Hazro','Pindigheb','Isa Khel',
  ],
  'Sindh': [
    'Karachi','Hyderabad','Sukkur','Larkana','Nawabshah','Mirpur Khas','Jacobabad','Shikarpur','Khairpur','Dadu','Thatta','Badin',
    'Sanghar','Tando Adam','Tando Allahyar','Tando Muhammad Khan','Umerkot','Mithi','Ghotki','Kandhkot','Kashmore','Matiari','Jamshoro',
    'Kotri','Sehwan','Moro','Naushahro Feroze','Qambar','Shahdadkot','Mirpur Mathelo','Daharki','Rohri','Hala','Sujawal','Digri',
    'Kunri','Pano Aqil','Ratodero','Mehar',
  ],
  'Khyber Pakhtunkhwa': [
    'Peshawar','Mardan','Abbottabad','Mingora','Kohat','Dera Ismail Khan','Bannu','Swabi','Nowshera','Charsadda','Mansehra','Haripur',
    'Chitral','Batkhela','Timergara','Dir','Karak','Lakki Marwat','Tank','Hangu','Alpuri','Daggar','Battagram','Dasu','Parachinar',
    'Landi Kotal','Khar','Miranshah','Wana','Jamrud','Risalpur','Topi','Havelian','Dargai','Sarai Naurang','Takht-e-Nasrati','Kulachi',
    'Paharpur','Saidu Sharif',
  ],
  'Balochistan': [
    'Quetta','Gwadar','Turbat','Khuzdar','Hub','Chaman','Sibi','Zhob','Loralai','Kalat','Mastung','Nushki','Dera Murad Jamali',
    'Dera Allah Yar','Usta Muhammad','Panjgur','Kharan','Pasni','Ormara','Jiwani','Pishin','Qila Saifullah','Qila Abdullah','Ziarat',
    'Bela','Uthal','Washuk','Dalbandin','Kohlu','Dera Bugti','Musakhel','Barkhan','Awaran',
  ],
  'Islamabad Capital Territory': ['Islamabad'],
  'Gilgit-Baltistan': ['Gilgit','Skardu','Aliabad','Karimabad','Chilas','Gahkuch','Khaplu','Astore','Shigar','Nagar'],
  'Azad Kashmir': ['Muzaffarabad','Mirpur','Kotli','Bhimber','Rawalakot','Bagh','Pallandri','Hattian Bala','Athmuqam','Dadyal','Forward Kahuta'],
};
export const PK_CITIES: Record<string, string[]> = Object.fromEntries(
  Object.entries(raw).map(([p, cs]) => [p, [...new Set(cs)].sort((a, b) => a.localeCompare(b))]));
/** city → province, for showing "Lahore, Punjab" and validating seeds. */
export const CITY_PROVINCE: Record<string, string> = Object.fromEntries(
  Object.entries(PK_CITIES).flatMap(([p, cs]) => cs.map(c => [c, p])));
/** Shown as quick picks before the user types. */
export const POPULAR_CITIES = ['Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Peshawar','Multan','Quetta','Hyderabad','Gujranwala'];
